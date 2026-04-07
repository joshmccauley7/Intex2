#!/usr/bin/env python3
"""
Social Media Donation Conversion Predictor — FastAPI Inference Service
=======================================================================
Loads the trained model and serves real-time predictions plus ranked
improvement recommendations for the Safira admin post-planning tool.

Usage (from ml-pipelines/):
    uvicorn social_media_api:app --host 0.0.0.0 --port 8001 --reload

Railway deployment:
    Set start command: uvicorn social_media_api:app --host 0.0.0.0 --port $PORT
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("social_media_api")

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_PATH  = SCRIPT_DIR / "models" / "social_media_model.joblib"
META_PATH   = SCRIPT_DIR / "models" / "social_media_model_metadata.json"

# ── Load model and metadata at startup ────────────────────────────────────────
model    = None
metadata = None


def load_artifacts():
    global model, metadata
    if not MODEL_PATH.exists():
        log.warning(
            "Model not found at %s. "
            "Run social-media-conversion-predictor.ipynb first to train and save the model. "
            "/predict will return 503 until the model is loaded.",
            MODEL_PATH,
        )
        return  # Allow the server to start; /predict will return 503
    model = joblib.load(MODEL_PATH)
    log.info("Model loaded: %s", MODEL_PATH)

    if not META_PATH.exists():
        log.warning("Metadata not found at %s. Some features may not work.", META_PATH)
        return
    with open(META_PATH) as f:
        metadata = json.load(f)
    log.info("Metadata loaded: v%s  AUC=%.3f", metadata.get("version"), metadata.get("test_auc_roc", 0))


# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Social Media Conversion Predictor",
    description="Predicts donation conversion probability for planned Safira social media posts.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    load_artifacts()


# ── Request / Response Schemas ────────────────────────────────────────────────
class PostFeatures(BaseModel):
    platform:               str   = Field(...,  example="Instagram")
    post_type:              str   = Field(...,  example="ImpactStory")
    media_type:             str   = Field(...,  example="Video")
    content_topic:          str   = Field(...,  example="DonorImpact")
    sentiment_tone:         str   = Field(...,  example="Hopeful")
    day_of_week:            str   = Field(...,  example="Tuesday")
    call_to_action_type:    str   = Field("None", example="DonateNow")
    has_call_to_action:     bool  = Field(True)
    features_resident_story: bool = Field(False)
    is_boosted:             bool  = Field(False)
    post_hour:              int   = Field(19,   ge=0, le=23)
    num_hashtags:           int   = Field(5,    ge=0, le=50)
    caption_length:         int   = Field(280,  ge=0, le=2200)


class Recommendation(BaseModel):
    feature:           str
    feature_label:     str
    current_value:     str
    recommended_value: str
    improvement_pct:   float
    new_probability:   float
    reason:            str


class PredictionResponse(BaseModel):
    donation_probability: float
    risk_label:           str
    predicted_referrals:  float
    recommendations:      list[Recommendation]
    model_version:        str
    avg_conversion_rate:  float


# ── Helper: friendly label names ──────────────────────────────────────────────
FEATURE_LABELS = {
    "platform":               "Platform",
    "post_type":              "Post Type",
    "media_type":             "Media Type",
    "content_topic":          "Content Topic",
    "sentiment_tone":         "Sentiment / Tone",
    "day_of_week":            "Day of Week",
    "call_to_action_type":    "Call to Action Type",
    "has_call_to_action":     "Has Call to Action",
    "features_resident_story": "Features Resident Story",
    "is_boosted":             "Boosted Post",
    "post_hour":              "Hour of Day",
    "num_hashtags":           "Number of Hashtags",
    "caption_length":         "Caption Length",
}

NUMERIC_SUGGESTIONS = {
    "post_hour":       [6, 9, 12, 15, 18, 19, 20, 21],
    "num_hashtags":    [0, 3, 5, 8, 10, 15],
    "caption_length":  [100, 200, 280, 500, 800],
}

# Conversion rate reasons pre-computed from training data
def _make_reason(feature: str, current: str, recommended: str, rates: dict) -> str:
    rec_rate = rates.get(feature, {}).get(recommended)
    cur_rate = rates.get(feature, {}).get(current)
    if rec_rate is not None and cur_rate is not None and cur_rate > 0:
        pct = int(round((rec_rate - cur_rate) / cur_rate * 100))
        if feature == "post_hour":
            return (
                f"Posts published at hour {recommended} historically convert "
                f"{abs(pct)}% {'more' if pct > 0 else 'less'} than at hour {current}"
            )
        if feature == "num_hashtags":
            return f"Using {recommended} hashtags is associated with higher donation conversion rates"
        if feature == "caption_length":
            return f"A caption length of {recommended} characters is associated with better conversion"
        return (
            f"{FEATURE_LABELS.get(feature, feature)} '{recommended}' converts {abs(pct)}% "
            f"{'more' if pct > 0 else 'less'} than '{current}' on average"
        )
    return f"Changing {FEATURE_LABELS.get(feature, feature)} from '{current}' to '{recommended}' is predicted to improve conversion"


def _features_to_df(features: PostFeatures) -> pd.DataFrame:
    return pd.DataFrame([{
        "platform":               features.platform,
        "post_type":              features.post_type,
        "media_type":             features.media_type,
        "content_topic":          features.content_topic,
        "sentiment_tone":         features.sentiment_tone,
        "day_of_week":            features.day_of_week,
        "call_to_action_type":    features.call_to_action_type if features.has_call_to_action else "None",
        "has_call_to_action":     int(features.has_call_to_action),
        "features_resident_story": int(features.features_resident_story),
        "is_boosted":             int(features.is_boosted),
        "post_hour":              features.post_hour,
        "num_hashtags":           features.num_hashtags,
        "caption_length":         features.caption_length,
    }])


def _score(df: pd.DataFrame) -> float:
    return float(model.predict_proba(df)[:, 1][0])


def _get_risk_label(prob: float) -> str:
    thresholds = metadata.get("risk_thresholds", {"high": 0.60, "medium": 0.30})
    if prob >= thresholds["high"]:
        return "High Potential"
    if prob >= thresholds["medium"]:
        return "Medium Potential"
    return "Low Potential"


def _build_recommendations(
    features: PostFeatures,
    baseline_prob: float,
) -> list[Recommendation]:
    if not metadata:
        return []

    cat_values    = metadata.get("categorical_values", {})
    conv_rates    = metadata.get("feature_conversion_rates", {})
    cat_features  = metadata.get("categorical_features", [])
    num_features  = metadata.get("numeric_features", [])
    bool_features = metadata.get("boolean_features", [])

    improvements: list[tuple[float, Recommendation]] = []
    base_dict = _features_to_df(features).iloc[0].to_dict()

    # Explore alternatives for categorical features
    for feat in cat_features:
        current_val = str(base_dict.get(feat, ""))
        candidates = cat_values.get(feat, [])
        for alt_val in candidates:
            if str(alt_val) == current_val:
                continue
            alt_dict = dict(base_dict)
            alt_dict[feat] = alt_val
            # Sync call_to_action_type with has_call_to_action
            if feat == "call_to_action_type" and alt_val == "None":
                alt_dict["has_call_to_action"] = 0
            alt_df   = pd.DataFrame([alt_dict])
            alt_prob = _score(alt_df)
            improvement = (alt_prob - baseline_prob) / max(baseline_prob, 0.01)
            if improvement > 0.02:  # Only show meaningful improvements (>2%)
                improvements.append((
                    improvement,
                    Recommendation(
                        feature=feat,
                        feature_label=FEATURE_LABELS.get(feat, feat),
                        current_value=current_val,
                        recommended_value=str(alt_val),
                        improvement_pct=round(improvement * 100, 1),
                        new_probability=round(alt_prob, 3),
                        reason=_make_reason(feat, current_val, str(alt_val), conv_rates),
                    ),
                ))

    # Explore alternatives for numeric features
    for feat in num_features:
        current_val = base_dict.get(feat, 0)
        for alt_val in NUMERIC_SUGGESTIONS.get(feat, []):
            if alt_val == current_val:
                continue
            alt_dict = dict(base_dict)
            alt_dict[feat] = alt_val
            alt_df   = pd.DataFrame([alt_dict])
            alt_prob = _score(alt_df)
            improvement = (alt_prob - baseline_prob) / max(baseline_prob, 0.01)
            if improvement > 0.02:
                improvements.append((
                    improvement,
                    Recommendation(
                        feature=feat,
                        feature_label=FEATURE_LABELS.get(feat, feat),
                        current_value=str(current_val),
                        recommended_value=str(alt_val),
                        improvement_pct=round(improvement * 100, 1),
                        new_probability=round(alt_prob, 3),
                        reason=_make_reason(feat, str(current_val), str(alt_val), conv_rates),
                    ),
                ))

    # Explore boolean flips
    for feat in bool_features:
        current_val = base_dict.get(feat, 0)
        alt_val = 1 - int(current_val)
        alt_dict = dict(base_dict)
        alt_dict[feat] = alt_val
        # Sync CTA type when toggling has_call_to_action
        if feat == "has_call_to_action" and alt_val == 0:
            alt_dict["call_to_action_type"] = "None"
        alt_df   = pd.DataFrame([alt_dict])
        alt_prob = _score(alt_df)
        improvement = (alt_prob - baseline_prob) / max(baseline_prob, 0.01)
        if improvement > 0.02:
            improvements.append((
                improvement,
                Recommendation(
                    feature=feat,
                    feature_label=FEATURE_LABELS.get(feat, feat),
                    current_value="Yes" if current_val else "No",
                    recommended_value="Yes" if alt_val else "No",
                    improvement_pct=round(improvement * 100, 1),
                    new_probability=round(alt_prob, 3),
                    reason=_make_reason(feat, str(current_val), str(alt_val), conv_rates),
                ),
            ))

    # Sort by improvement, return top 5, deduplicate by feature
    improvements.sort(key=lambda x: x[0], reverse=True)
    seen_features: set[str] = set()
    top_recs: list[Recommendation] = []
    for _, rec in improvements:
        if rec.feature not in seen_features:
            seen_features.add(rec.feature)
            top_recs.append(rec)
        if len(top_recs) >= 5:
            break

    return top_recs


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_version": metadata.get("version") if metadata else None,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(features: PostFeatures):
    if model is None or metadata is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        input_df = _features_to_df(features)
        prob     = _score(input_df)
        threshold = metadata.get("prediction_threshold", 0.40)
        risk      = _get_risk_label(prob)
        avg_conv  = metadata.get("conversion_rate", 0.0)

        # Only compute recommendations if score is not already High Potential
        high_threshold = metadata.get("risk_thresholds", {}).get("high", 0.60)
        recs = _build_recommendations(features, prob) if prob < high_threshold else []

        # Estimate referrals: scale prob relative to dataset average
        avg_referrals_per_converting_post = 2.5  # approximate from training data
        predicted_referrals = round(prob * avg_referrals_per_converting_post, 1)

        log.info(
            "Predict: prob=%.3f risk=%s recs=%d  [%s %s %s]",
            prob, risk, len(recs),
            features.platform, features.post_type, features.media_type,
        )

        return PredictionResponse(
            donation_probability=round(prob, 3),
            risk_label=risk,
            predicted_referrals=predicted_referrals,
            recommendations=recs,
            model_version=metadata.get("version", "v1.0"),
            avg_conversion_rate=round(avg_conv, 3),
        )

    except Exception as e:
        log.error("Prediction error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/feature-options")
def feature_options():
    """Return valid values for each feature (for populating dropdowns)."""
    if metadata is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    return {
        "categorical_values": metadata.get("categorical_values", {}),
        "boolean_features":   metadata.get("boolean_features", []),
        "numeric_features":   metadata.get("numeric_features", []),
        "feature_best_values": metadata.get("feature_best_values", {}),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("social_media_api:app", host="0.0.0.0", port=port, reload=False)
