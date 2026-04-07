#!/usr/bin/env python3
"""
Nightly Donor Churn Scoring Script — Safira Nonprofit
======================================================
Runs the complete inference pipeline and writes predictions to PostgreSQL.

Usage (from project root or ml-pipelines/):
    python ml-pipelines/score_donor_churn.py

Schedule options:
  - Windows Task Scheduler: run nightly at 2:00 AM
  - Railway Cron Job (production): add to railway.toml
  - Linux cron: 0 2 * * * /usr/bin/python /app/ml-pipelines/score_donor_churn.py

Environment:
  DATABASE_URL must be set as an environment variable, or available in
  ../backend/Intex2/Intex2/.env relative to this script.
"""

import os
import json
import logging
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

import numpy as np
import pandas as pd
import psycopg2
import joblib

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("donor_churn_scorer")

SCRIPT_DIR = Path(__file__).resolve().parent


# ── Load DATABASE_URL ─────────────────────────────────────────────────────────
def load_database_url() -> str:
    env_path = SCRIPT_DIR.parent / "backend" / "Intex2" / "Intex2" / ".env"
    if env_path.exists():
        env_vars = {}
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    env_vars[k.strip()] = v.strip()
        if "DATABASE_URL" in env_vars:
            return env_vars["DATABASE_URL"]
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise EnvironmentError(
            "DATABASE_URL not found. Set it in ../backend/Intex2/Intex2/.env "
            "or as an environment variable."
        )
    return url


# ── Feature Engineering ───────────────────────────────────────────────────────
# NOTE: These functions are intentionally identical to those in the training
# notebook (donor-churn-classifier.ipynb).  Any change here must be mirrored
# there to prevent train/serve skew.

def monetary_trend_slope(grp: pd.DataFrame) -> float:
    """Slope of donation amounts over time (positive = growing donations)."""
    grp = grp.sort_values("donation_date").reset_index(drop=True)
    vals = grp["estimated_value"].dropna().astype(float)
    if len(vals) < 2:
        return 0.0
    return float(np.polyfit(np.arange(len(vals)), vals, 1)[0])


def temporal_features(grp: pd.DataFrame) -> pd.Series:
    """Inter-donation gap statistics for one supporter."""
    dates = sorted(pd.to_datetime(grp["donation_date"]).tolist())
    if len(dates) < 2:
        return pd.Series(
            {
                "avg_days_between_donations": float("nan"),
                "std_days_between_donations": 0.0,
                "donation_span_days": 0,
            }
        )
    gaps = [(b - a).days for a, b in zip(dates[:-1], dates[1:])]
    return pd.Series(
        {
            "avg_days_between_donations": float(np.mean(gaps)),
            "std_days_between_donations": float(np.std(gaps)),
            "donation_span_days": int((dates[-1] - dates[0]).days),
        }
    )


def build_feature_matrix(
    supporters: pd.DataFrame,
    donations: pd.DataFrame,
    allocations: pd.DataFrame,
    analysis_date: pd.Timestamp,
) -> pd.DataFrame:
    """
    Reproduce the same feature engineering pipeline as in the training notebook.
    Returns a DataFrame indexed by supporter_id with all model features.
    """
    # RFM
    rfm = (
        donations.groupby("supporter_id")
        .agg(
            recency_days=("donation_date", lambda x: (analysis_date - x.max()).days),
            frequency=("donation_id", "count"),
            monetary_total=("estimated_value", "sum"),
            monetary_avg=("estimated_value", "mean"),
        )
        .reset_index()
    )
    trend = (
        donations.groupby("supporter_id")
        .apply(monetary_trend_slope, include_groups=False)
        .reset_index(name="monetary_trend")
    )
    rfm = rfm.merge(trend, on="supporter_id", how="left")

    # Temporal
    temp = (
        donations.groupby("supporter_id")
        .apply(temporal_features, include_groups=False)
        .reset_index()
    )
    months_active = (
        donations.assign(month=donations["donation_date"].dt.to_period("M"))
        .groupby("supporter_id")["month"]
        .nunique()
        .reset_index(name="months_active")
    )
    temp = temp.merge(months_active, on="supporter_id", how="left")

    # Behavioral
    behavioral = (
        donations.groupby("supporter_id")
        .agg(
            pct_recurring=("is_recurring", "mean"),
            num_campaigns=("campaign_name", lambda x: x.dropna().nunique()),
            pct_monetary=("donation_type", lambda x: (x == "Monetary").mean()),
            donation_type_diversity=("donation_type", "nunique"),
            channel_diversity=("channel_source", "nunique"),
            has_social_referral=(
                "referral_post_id",
                lambda x: int(x.notna().any()),
            ),
        )
        .reset_index()
    )

    # Allocation
    alloc_enriched = allocations.merge(
        donations[["donation_id", "supporter_id"]], on="donation_id", how="left"
    )
    alloc_feats = (
        alloc_enriched.groupby("supporter_id")
        .agg(
            num_safehouses_supported=("safehouse_id", "nunique"),
            num_program_areas=("program_area", "nunique"),
        )
        .reset_index()
    )

    # Combine
    feat = supporters[
        [
            "supporter_id",
            "supporter_type",
            "relationship_type",
            "region",
            "acquisition_channel",
            "created_at",
        ]
    ].copy()
    feat = feat.assign(
        tenure_days=(analysis_date - pd.to_datetime(feat["created_at"])).dt.days
    )

    for df, label in [
        (rfm, "RFM"),
        (temp, "temporal"),
        (behavioral, "behavioral"),
        (alloc_feats, "allocation"),
    ]:
        feat = feat.merge(df, on="supporter_id", how="left")
        log.debug("Merged %s features → shape %s", label, feat.shape)

    fill_zero = [
        "frequency", "monetary_total", "monetary_avg", "monetary_trend",
        "pct_recurring", "num_campaigns", "pct_monetary",
        "donation_type_diversity", "channel_diversity", "has_social_referral",
        "num_safehouses_supported", "num_program_areas",
        "months_active", "donation_span_days",
    ]
    feat[fill_zero] = feat[fill_zero].fillna(0)
    feat.drop(columns=["created_at"], inplace=True)
    return feat


def get_risk_level(prob: float) -> str:
    if prob >= 0.70:
        return "High"
    if prob >= 0.40:
        return "Medium"
    return "Low"


# ── Create predictions table ──────────────────────────────────────────────────
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS donor_churn_predictions (
    prediction_id     SERIAL PRIMARY KEY,
    supporter_id      INTEGER NOT NULL,
    churn_probability NUMERIC(5,4) NOT NULL,
    risk_level        VARCHAR(10) NOT NULL,
    model_version     VARCHAR(20),
    scored_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    start = datetime.now()
    log.info("=== Donor Churn Scoring Run: %s ===", start.isoformat())

    # 1. Connect
    database_url = load_database_url()
    parsed = urlparse(database_url)
    conn_params = dict(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        sslmode="require",
    )
    conn = psycopg2.connect(**conn_params)
    log.info("Connected to %s:%s/%s", parsed.hostname, parsed.port, parsed.path.lstrip("/"))

    # 2. Load data
    supporters   = pd.read_sql("SELECT * FROM supporters",             conn)
    donations    = pd.read_sql("SELECT * FROM donations",              conn)
    allocations  = pd.read_sql("SELECT * FROM donation_allocations",   conn)

    supporters = supporters.assign(
        created_at=pd.to_datetime(supporters["created_at"]),
        first_donation_date=pd.to_datetime(supporters["first_donation_date"]),
    )
    donations = donations.assign(
        donation_date=pd.to_datetime(donations["donation_date"]),
    )

    log.info(
        "Loaded: %d supporters, %d donations, %d allocations",
        len(supporters), len(donations), len(allocations),
    )

    # 3. Feature engineering
    analysis_date = donations["donation_date"].max() + pd.Timedelta(days=1)
    log.info("Analysis date: %s", analysis_date.date())

    feature_df = build_feature_matrix(supporters, donations, allocations, analysis_date)
    log.info("Feature matrix: %s", feature_df.shape)

    # 4. Load model
    model_path = SCRIPT_DIR / "models" / "donor_churn_model.joblib"
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found at {model_path}. "
            "Run donor-churn-classifier.ipynb first to train and save the model."
        )
    model = joblib.load(model_path)
    log.info("Model loaded: %s", model_path)

    # Load metadata for version tag
    meta_path = SCRIPT_DIR / "models" / "model_metadata.json"
    model_version = "v1.0"
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
        model_version = meta.get("version", "v1.0")

    # 5. Score
    numeric_features = [
        "recency_days", "frequency", "monetary_total", "monetary_avg", "monetary_trend",
        "avg_days_between_donations", "std_days_between_donations", "donation_span_days",
        "months_active", "pct_recurring", "num_campaigns", "pct_monetary",
        "donation_type_diversity", "channel_diversity", "has_social_referral",
        "num_safehouses_supported", "num_program_areas", "tenure_days",
    ]
    categorical_features = [
        "supporter_type", "acquisition_channel", "relationship_type", "region"
    ]
    X = feature_df[numeric_features + categorical_features].copy()

    probas = model.predict_proba(X)[:, 1]
    sup_ids = feature_df["supporter_id"].tolist()

    risk_counts = {"High": 0, "Medium": 0, "Low": 0}
    rows = []
    for sid, prob in zip(sup_ids, probas):
        rl = get_risk_level(float(prob))
        risk_counts[rl] += 1
        rows.append((int(sid), float(prob), rl, model_version))

    log.info(
        "Scored %d supporters: High=%d  Medium=%d  Low=%d",
        len(rows), risk_counts["High"], risk_counts["Medium"], risk_counts["Low"],
    )

    # 6. Write to database
    with psycopg2.connect(**conn_params) as wconn:
        with wconn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
            wconn.commit()

            # Idempotent: overwrite previous predictions for these supporters
            cur.execute(
                "DELETE FROM donor_churn_predictions WHERE supporter_id = ANY(%s)",
                (sup_ids,),
            )
            cur.executemany(
                "INSERT INTO donor_churn_predictions "
                "(supporter_id, churn_probability, risk_level, model_version) "
                "VALUES (%s, %s, %s, %s)",
                rows,
            )
            wconn.commit()
            log.info("Wrote %d predictions to donor_churn_predictions.", len(rows))

    conn.close()
    elapsed = (datetime.now() - start).total_seconds()
    log.info("=== Scoring complete in %.1fs ===", elapsed)


if __name__ == "__main__":
    main()
