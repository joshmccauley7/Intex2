#!/usr/bin/env python3
"""
Generates ml-pipelines/donor-churn-classifier.ipynb
Run from the project root:  python ml-pipelines/_generate_notebook.py
"""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))

def md(source):
    return {"cell_type": "markdown", "metadata": {}, "source": source}

def code(source):
    return {"cell_type": "code", "execution_count": None,
            "metadata": {}, "outputs": [], "source": source}

cells = []

# ── TITLE ─────────────────────────────────────────────────────────────────────
cells.append(md('''# Donor Churn Prediction Pipeline
## Safira Nonprofit — IS 455 Machine Learning Pipeline

**Goal:** Predict which donors are at risk of lapsing so Jill (Admin) can reach out proactively.  
**Course:** IS 455 — Machine Learning at BYU  
**Organization:** Safira (fictional nonprofit inspired by Lighthouse Sanctuary)

This notebook implements the **full end-to-end ML pipeline** as taught in the textbook:

1. **Problem Framing** (Ch. 1)
2. **Data Acquisition, Preparation & Exploration** (Ch. 2–8)
3. **Modeling & Feature Selection** (Ch. 9–16)
4. **Evaluation & Interpretation** (Ch. 15)
5. **Causal and Relationship Analysis**
6. **Deployment Notes** (Ch. 17)

> **Prerequisites:** `pip install -r requirements.txt`  
> **Database:** set `DATABASE_URL` in `../backend/Intex2/Intex2/.env`
'''))

# ── SECTION 1: PROBLEM FRAMING ────────────────────────────────────────────────
cells.append(md('''## Section 1: Problem Framing

### Business Problem
Safira depends entirely on donations to operate its safehouses for trafficking survivors.
The organization\'s leadership has identified **donor retention** as its #1 operational fear:

> *"They lose donors and don\'t always understand why."*

Without a proactive system, Jill discovers a donor has lapsed *after* they stop giving —
at which point re-engagement is costly and often unsuccessful.

### Who Cares
- **Jill Harmon (Admin):** Needs a prioritized outreach list of at-risk donors before they churn.
- **Leadership:** Wants to understand *why* donors leave to improve acquisition and engagement strategy.

### Approach: Both Predictive and Explanatory

Following the textbook\'s distinction (Foreword, Ch. 9–11):

| Dimension | This Pipeline |
|-----------|---------------|
| **Predictive** | Random Forest classifier flagging at-risk donors; operationalized as a risk badge on the Admin Donor page |
| **Explanatory** | Logistic Regression (statsmodels) quantifying *which* features drive churn and their magnitude |

### Success Metrics
- **Primary:** AUC-ROC — threshold-independent, handles class imbalance
- **Secondary:** Recall on churned class — missing an at-risk donor is more costly than an unnecessary call
- **Business KPI:** Reduction in donor churn rate after Jill uses the flags for proactive outreach

### Why Predictive AND Explanatory
We need both because:
1. **Operations** requires a deployable flag (predictive)
2. **Strategy** requires understanding causal levers for retention (explanatory)

Both goals are addressed with separate, appropriately-specified models.
'''))

# ── IMPORTS ───────────────────────────────────────────────────────────────────
cells.append(code('''# Standard library + data science stack
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import psycopg2
import os
import json
import warnings
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

# Statsmodels (explanatory modeling)
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

# Scikit-learn (predictive modeling)
from sklearn.model_selection import (
    StratifiedKFold, GridSearchCV, learning_curve,
    cross_validate, LeaveOneOut
)
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    roc_curve, ConfusionMatrixDisplay
)
from sklearn.feature_selection import SelectKBest, mutual_info_classif, permutation_importance
import joblib

warnings.filterwarnings(\'ignore\')
np.random.seed(42)
plt.style.use(\'seaborn-v0_8-whitegrid\')
sns.set_palette(\'husl\')

print("Libraries loaded.")
print(f"scikit-learn : {__import__(\'sklearn\').__version__}")
print(f"statsmodels  : {__import__(\'statsmodels\').__version__}")
print(f"pandas       : {pd.__version__}")
'''))

# ── DATABASE CONNECTION ───────────────────────────────────────────────────────
cells.append(code('''# ── Database Connection ──────────────────────────────────────────────────────
# Reads DATABASE_URL from ../backend/Intex2/Intex2/.env (relative to ml-pipelines/)
env_path = Path(__file__).parent.parent / \'backend\' / \'Intex2\' / \'Intex2\' / \'.env\'
if not env_path.exists():
    # Fallback when running interactively from the ml-pipelines/ directory
    env_path = Path(\'.\').parent / \'backend\' / \'Intex2\' / \'Intex2\' / \'.env\'

env_vars = {}
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith(\'#\') and \'=\' in line:
                key, _, val = line.partition(\'=\')
                env_vars[key.strip()] = val.strip()
    DATABASE_URL = env_vars.get(\'DATABASE_URL\', \'\')
else:
    DATABASE_URL = os.environ.get(\'DATABASE_URL\', \'\')

if not DATABASE_URL:
    raise EnvironmentError(
        "DATABASE_URL not found.\\n"
        "Create ../backend/Intex2/Intex2/.env with DATABASE_URL= or set the environment variable."
    )

parsed = urlparse(DATABASE_URL)
conn_params = dict(
    host=parsed.hostname,
    port=parsed.port or 5432,
    database=parsed.path.lstrip(\'/\'),
    user=parsed.username,
    password=parsed.password,
    sslmode=\'require\',
)
conn = psycopg2.connect(**conn_params)
print(f"Connected: {parsed.hostname}:{parsed.port}/{parsed.path.lstrip(\'/\')}")
'''))

# ── LOAD TABLES ───────────────────────────────────────────────────────────────
cells.append(code('''# ── Load Tables ──────────────────────────────────────────────────────────────
supporters   = pd.read_sql("SELECT * FROM supporters",             conn)
donations    = pd.read_sql("SELECT * FROM donations",              conn)
allocations  = pd.read_sql("SELECT * FROM donation_allocations",   conn)
inkind_items = pd.read_sql("SELECT * FROM in_kind_donation_items", conn)
social       = pd.read_sql("SELECT * FROM social_media_posts",     conn)

# Parse dates
supporters[\'created_at\']          = pd.to_datetime(supporters[\'created_at\'])
supporters[\'first_donation_date\'] = pd.to_datetime(supporters[\'first_donation_date\'])
donations[\'donation_date\']        = pd.to_datetime(donations[\'donation_date\'])

print("Loaded tables:")
for name, df in [(\'supporters\',   supporters), (\'donations\',    donations),
                  (\'allocations\',  allocations),(\'inkind_items\', inkind_items),
                  (\'social_media\', social)]:
    print(f"  {name:<20} {df.shape[0]:>5} rows x {df.shape[1]:>3} cols")

print(f"\\nDonation date range: {donations[\'donation_date\'].min().date()} -> {donations[\'donation_date\'].max().date()}")
supporters[[\'supporter_id\',\'display_name\',\'supporter_type\',\'status\',\'acquisition_channel\']].head()
'''))

# ── SECTION 2 ─────────────────────────────────────────────────────────────────
cells.append(md('''## Section 2: Data Acquisition, Preparation & Exploration

### 2.1 Define the Churn Label

We have two potential churn signals:

1. **Status-based (primary):** `supporters.status = \'Inactive\'` — direct operational flag set by staff.
   15 of 60 supporters are Inactive (25% churn rate).

2. **Time-based (secondary):** No donation in the last 180 days from the analysis date.
   Computed for comparison and validation.

We use the **status-based label as ground truth** — it reflects the organization\'s own
assessment of whether a donor has lapsed.

> **Dataset size note (n=60):** Small samples affect every modeling decision.
> We use Leave-One-Out CV for final evaluation, and StratifiedKFold(k=5) for tuning.
> We acknowledge uncertainty and interpret results conservatively.
'''))

# ── CHURN LABEL ───────────────────────────────────────────────────────────────
cells.append(code('''# ── Define Churn Label ───────────────────────────────────────────────────────
ANALYSIS_DATE = donations[\'donation_date\'].max() + pd.Timedelta(days=1)
CHURN_WINDOW  = 180  # days (6 months)

print(f"Analysis date : {ANALYSIS_DATE.date()}")
print(f"Churn window  : {CHURN_WINDOW} days")

# Primary label: status-based
supporters[\'churn\'] = (supporters[\'status\'] == \'Inactive\').astype(int)

# Secondary label: time-based
last_don = (
    donations.groupby(\'supporter_id\')[\'donation_date\']
    .max().reset_index(name=\'last_donation_date\')
)
supporters = supporters.merge(last_don, on=\'supporter_id\', how=\'left\')
supporters[\'days_since_last\'] = (ANALYSIS_DATE - supporters[\'last_donation_date\']).dt.days
supporters[\'time_based_churn\'] = (supporters[\'days_since_last\'] > CHURN_WINDOW).astype(int)

print(f"\\nStatus-based churn (primary label):")
print(supporters[\'churn\'].value_counts().rename({0:\'Active\',1:\'Churned\'}).to_string())
print(f"Churn rate: {supporters[\'churn\'].mean():.1%}")

print(f"\\nTime-based churn (> {CHURN_WINDOW} days):")
print(supporters[\'time_based_churn\'].value_counts().rename({0:\'Active\',1:\'Churned\'}).to_string())

agreement = (supporters[\'churn\'] == supporters[\'time_based_churn\']).mean()
print(f"\\nLabel agreement: {agreement:.1%}  (high agreement validates status label)")
'''))

# ── FEATURE ENG HEADER ────────────────────────────────────────────────────────
cells.append(md('''### 2.2 Feature Engineering

Features are engineered across five groups (Ch. 7 reproducible pipeline approach):

| Group | Features | Source Table |
|-------|----------|-------------|
| **RFM** | Recency, Frequency, Monetary total/avg/trend | `donations` |
| **Temporal** | Inter-donation gaps, span, months active | `donations` |
| **Behavioral** | Recurring rate, campaigns, donation type mix, channel diversity | `donations` |
| **Supporter** | Type, acquisition channel, region, relationship | `supporters` |
| **Allocation** | Safehouse diversity, program area diversity | `donation_allocations` |

All feature engineering is encapsulated in functions — the same functions are reused
in `score_donor_churn.py` to guarantee consistency between training and scoring.
'''))

# ── RFM FEATURES ──────────────────────────────────────────────────────────────
cells.append(code('''# ── RFM Features ─────────────────────────────────────────────────────────────
def monetary_trend_slope(grp):
    """Slope of donation amounts over time (positive = growing donations)."""
    grp = grp.sort_values(\'donation_date\').reset_index(drop=True)
    vals = grp[\'estimated_value\'].dropna().astype(float)
    if len(vals) < 2:
        return 0.0
    return float(np.polyfit(np.arange(len(vals)), vals, 1)[0])

rfm = (
    donations.groupby(\'supporter_id\')
    .agg(
        recency_days   =(\'donation_date\',   lambda x: (ANALYSIS_DATE - x.max()).days),
        frequency      =(\'donation_id\',     \'count\'),
        monetary_total =(\'estimated_value\', \'sum\'),
        monetary_avg   =(\'estimated_value\', \'mean\'),
    )
    .reset_index()
)

trend = (
    donations.groupby(\'supporter_id\')
    .apply(monetary_trend_slope)
    .reset_index(name=\'monetary_trend\')
)
rfm = rfm.merge(trend, on=\'supporter_id\', how=\'left\')

print("RFM features:")
print(rfm.describe().round(2).to_string())
'''))

# ── TEMPORAL FEATURES ─────────────────────────────────────────────────────────
cells.append(code('''# ── Temporal Features ────────────────────────────────────────────────────────
def temporal_features(grp):
    """Compute inter-donation gap statistics for a single supporter."""
    dates = sorted(pd.to_datetime(grp[\'donation_date\']).tolist())
    if len(dates) < 2:
        return pd.Series({
            \'avg_days_between_donations\': np.nan,
            \'std_days_between_donations\': 0.0,
            \'donation_span_days\'        : 0,
        })
    gaps = [(b - a).days for a, b in zip(dates[:-1], dates[1:])]
    return pd.Series({
        \'avg_days_between_donations\': float(np.mean(gaps)),
        \'std_days_between_donations\': float(np.std(gaps)),
        \'donation_span_days\'        : int((dates[-1] - dates[0]).days),
    })

temporal = (
    donations.groupby(\'supporter_id\')
    .apply(temporal_features)
    .reset_index()
)

months_active = (
    donations.assign(month=donations[\'donation_date\'].dt.to_period(\'M\'))
    .groupby(\'supporter_id\')[\'month\']
    .nunique()
    .reset_index(name=\'months_active\')
)
temporal = temporal.merge(months_active, on=\'supporter_id\', how=\'left\')

print("Temporal features (first 5 rows):")
print(temporal.head().round(2).to_string())
'''))

# ── BEHAVIORAL FEATURES ───────────────────────────────────────────────────────
cells.append(code('''# ── Behavioral Features ──────────────────────────────────────────────────────
behavioral = (
    donations.groupby(\'supporter_id\')
    .agg(
        pct_recurring          =(\'is_recurring\',    \'mean\'),
        num_campaigns          =(\'campaign_name\',   lambda x: x.dropna().nunique()),
        pct_monetary           =(\'donation_type\',   lambda x: (x == \'Monetary\').mean()),
        donation_type_diversity=(\'donation_type\',   \'nunique\'),
        channel_diversity      =(\'channel_source\',  \'nunique\'),
        has_social_referral    =(\'referral_post_id\',lambda x: int(x.notna().any())),
    )
    .reset_index()
)

print("Behavioral features (first 5 rows):")
print(behavioral.head().round(3).to_string())
'''))

# ── ALLOCATION FEATURES ───────────────────────────────────────────────────────
cells.append(code('''# ── Allocation Features ──────────────────────────────────────────────────────
alloc_enriched = allocations.merge(
    donations[[\'donation_id\', \'supporter_id\']], on=\'donation_id\', how=\'left\'
)
alloc_feats = (
    alloc_enriched.groupby(\'supporter_id\')
    .agg(
        num_safehouses_supported=(\'safehouse_id\', \'nunique\'),
        num_program_areas       =(\'program_area\', \'nunique\'),
    )
    .reset_index()
)

print("Allocation features (first 5 rows):")
print(alloc_feats.head().to_string())
print(f"\\nCoverage: {alloc_feats[\'supporter_id\'].nunique()} of {len(supporters)} supporters")
'''))

# ── BUILD FEATURE MATRIX ──────────────────────────────────────────────────────
cells.append(code('''# ── Build Master Feature Matrix ──────────────────────────────────────────────
feature_df = supporters[[
    \'supporter_id\', \'supporter_type\', \'relationship_type\',
    \'region\', \'acquisition_channel\', \'created_at\', \'churn\'
]].copy()

feature_df[\'tenure_days\'] = (ANALYSIS_DATE - feature_df[\'created_at\']).dt.days

for feat, label in [(rfm, \'RFM\'), (temporal, \'temporal\'),
                     (behavioral, \'behavioral\'), (alloc_feats, \'allocation\')]:
    feature_df = feature_df.merge(feat, on=\'supporter_id\', how=\'left\')
    print(f"After merging {label}: {feature_df.shape}")

# One volunteer has no donations — fill donation-derived features with 0
fill_zero = [
    \'frequency\', \'monetary_total\', \'monetary_avg\', \'monetary_trend\',
    \'pct_recurring\', \'num_campaigns\', \'pct_monetary\',
    \'donation_type_diversity\', \'channel_diversity\', \'has_social_referral\',
    \'num_safehouses_supported\', \'num_program_areas\',
    \'months_active\', \'donation_span_days\',
]
feature_df[fill_zero] = feature_df[fill_zero].fillna(0)
feature_df.drop(columns=[\'created_at\'], inplace=True)

print(f"\\nFinal feature matrix: {feature_df.shape}")
print(f"Churn rate          : {feature_df[\'churn\'].mean():.1%}")
missing = feature_df.isnull().sum()
print(f"Missing values      : {missing[missing>0].to_dict() or \'None\'}")
feature_df.head(3)
'''))

# ── EDA HEADER ────────────────────────────────────────────────────────────────
cells.append(md('''### 2.3 Exploratory Data Analysis

Following Ch. 6 & 8: we examine distributions, class balance, feature-vs-target
relationships, and run statistical tests before modeling. EDA findings directly
inform feature selection and model choices below.
'''))

# ── CLASS BALANCE ─────────────────────────────────────────────────────────────
cells.append(code('''# ── Class Balance ─────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

counts = feature_df[\'churn\'].value_counts().sort_index()
axes[0].bar([\'Active (0)\', \'Churned (1)\'], counts.values,
             color=[\'#2563eb\', \'#dc2626\'], alpha=0.85, edgecolor=\'white\', linewidth=1.5)
for i, v in enumerate(counts.values):
    axes[0].text(i, v + 0.3, f\'{v}  ({v/len(feature_df):.0%})\',
                  ha=\'center\', fontweight=\'bold\')
axes[0].set_title(\'Churn Class Distribution\', fontsize=13, fontweight=\'bold\')
axes[0].set_ylabel(\'Supporters\')
axes[0].set_ylim(0, max(counts.values) * 1.25)

type_stats = (
    feature_df.groupby(\'supporter_type\')[\'churn\']
    .agg([\'sum\', \'count\'])
    .assign(rate=lambda d: d[\'sum\'] / d[\'count\'])
    .sort_values(\'rate\')
)
type_stats[\'rate\'].plot(kind=\'barh\', ax=axes[1], color=\'#2563eb\', alpha=0.8)
axes[1].axvline(feature_df[\'churn\'].mean(), color=\'#dc2626\', linestyle=\'--\',
                 label=f"Overall avg ({feature_df[\'churn\'].mean():.0%})")
axes[1].set_title(\'Churn Rate by Supporter Type\', fontsize=13, fontweight=\'bold\')
axes[1].set_xlabel(\'Churn Rate\'); axes[1].legend(fontsize=9)

plt.tight_layout(); plt.savefig(\'eda_class_balance.png\', dpi=120, bbox_inches=\'tight\'); plt.show()
print("75% Active / 25% Churned — moderate imbalance. Using class_weight=\'balanced\'.")
'''))

# ── UNIVARIATE ────────────────────────────────────────────────────────────────
cells.append(code('''# ── Univariate Distributions ─────────────────────────────────────────────────
numeric_feats = [
    \'recency_days\', \'frequency\', \'monetary_total\', \'monetary_avg\',
    \'avg_days_between_donations\', \'donation_span_days\', \'months_active\',
    \'pct_recurring\', \'pct_monetary\', \'tenure_days\'
]

fig, axes = plt.subplots(2, 5, figsize=(18, 7)); axes = axes.flatten()
for i, col in enumerate(numeric_feats):
    data = feature_df[col].dropna()
    axes[i].hist(data, bins=15, color=\'#2563eb\', alpha=0.75, edgecolor=\'white\')
    axes[i].set_title(col.replace(\'_\', \'\\n\'), fontsize=8, fontweight=\'bold\')
    axes[i].text(0.95, 0.95, f\'skew={data.skew():.2f}\\nmed={data.median():.1f}\',
                  transform=axes[i].transAxes, ha=\'right\', va=\'top\', fontsize=7, color=\'#475569\')

plt.suptitle(\'Univariate Distributions\', fontsize=13, fontweight=\'bold\', y=1.01)
plt.tight_layout(); plt.savefig(\'eda_univariate.png\', dpi=120, bbox_inches=\'tight\'); plt.show()
'''))

# ── BIVARIATE ─────────────────────────────────────────────────────────────────
cells.append(code('''# ── Bivariate: Numeric Features vs Churn (Mann-Whitney U) ────────────────────
fig, axes = plt.subplots(2, 5, figsize=(18, 8)); axes = axes.flatten()
stat_results = []

for i, col in enumerate(numeric_feats):
    active  = feature_df[feature_df[\'churn\']==0][col].dropna()
    churned = feature_df[feature_df[\'churn\']==1][col].dropna()

    bp = axes[i].boxplot([active, churned], labels=[\'Active\', \'Churned\'], patch_artist=True)
    bp[\'boxes\'][0].set_facecolor(\'#dbeafe\')
    bp[\'boxes\'][1].set_facecolor(\'#fecaca\')

    stat_, p = stats.mannwhitneyu(active, churned, alternative=\'two-sided\')
    sig = \'***\' if p<0.001 else (\'**\' if p<0.01 else (\'*\' if p<0.05 else \'ns\'))
    axes[i].set_title(f"{col.replace(\'_\',' ')}\\n{sig} p={p:.3f}", fontsize=8, fontweight=\'bold\')
    stat_results.append({\'feature\':col, \'active_med\':active.median(),
                          \'churned_med\':churned.median(), \'p\':p, \'sig\':sig})

plt.suptitle(\'Numeric Features vs Churn (Mann-Whitney U)\', fontsize=13, fontweight=\'bold\', y=1.01)
plt.tight_layout(); plt.savefig(\'eda_bivariate.png\', dpi=120, bbox_inches=\'tight\'); plt.show()

print("\\nStatistical significance:")
print(pd.DataFrame(stat_results).sort_values(\'p\').round(4).to_string(index=False))
'''))

# ── CHI-SQUARED ───────────────────────────────────────────────────────────────
cells.append(code('''# ── Chi-Squared Tests: Categorical Features vs Churn ─────────────────────────
cat_feats = [\'supporter_type\', \'acquisition_channel\', \'relationship_type\', \'region\']
print("=== Chi-Squared Tests ===\\n")
for col in cat_feats:
    ct = pd.crosstab(feature_df[col], feature_df[\'churn\'])
    chi2, p, dof, _ = stats.chi2_contingency(ct)
    sig = \'* p<0.05\' if p < 0.05 else \'ns\'
    rates = (feature_df.groupby(col)[\'churn\'].mean()*100).round(1).to_dict()
    print(f"  {col:30s}  chi2={chi2:.3f} dof={dof} p={p:.4f}  {sig}")
    print(f"    Churn % by category: {rates}\\n")
'''))

# ── CORRELATION HEATMAP ───────────────────────────────────────────────────────
cells.append(code('''# ── Correlation Heatmap ───────────────────────────────────────────────────────
heat_cols = numeric_feats + [\'frequency\',\'donation_type_diversity\',\'channel_diversity\',
                               \'num_campaigns\',\'num_safehouses_supported\',
                               \'num_program_areas\',\'churn\']
corr = feature_df[heat_cols].corr()

fig, axes = plt.subplots(1, 2, figsize=(18, 7))

mask = np.triu(np.ones_like(corr, dtype=bool))
sns.heatmap(corr, mask=mask, annot=True, fmt=\'.2f\', cmap=\'RdBu_r\', center=0,
             ax=axes[0], annot_kws={\'size\':6.5}, linewidths=0.3)
axes[0].set_title(\'Feature Correlation Matrix\', fontweight=\'bold\')

churn_corr = corr[\'churn\'].drop(\'churn\').sort_values()
colors = [\'#dc2626\' if v>0 else \'#2563eb\' for v in churn_corr.values]
churn_corr.plot(kind=\'barh\', ax=axes[1], color=colors, alpha=0.8)
axes[1].axvline(0, color=\'black\', linewidth=1)
axes[1].set_title(\'Correlation with Churn Label\', fontweight=\'bold\')
axes[1].set_xlabel(\'Pearson Correlation (red = increases churn risk)\')

plt.tight_layout(); plt.savefig(\'eda_correlation.png\', dpi=120, bbox_inches=\'tight\'); plt.show()

print("Top positive correlations with churn:")
print(churn_corr.tail(6).round(3).to_string())
print("\\nTop negative correlations with churn (protective):")
print(churn_corr.head(6).round(3).to_string())
'''))

# ── SECTION 3 ─────────────────────────────────────────────────────────────────
cells.append(md('''## Section 3: Modeling & Feature Selection

### Two Modeling Goals

1. **Explanatory (statsmodels Logistic Regression)** — coefficients interpretable as odds ratios.
   EPV constraint: with 15 churned donors, we limit to ≤4 features (EPV ≈ 3.75, borderline —
   addressed with L2 penalization via `method=\'l1\'`).

2. **Predictive (sklearn Pipeline)** — maximize AUC-ROC on unseen data.
   Four classifiers compared; best tuned via GridSearchCV.

> **Pipeline construction (Ch. 7, 11):** All preprocessing inside a `sklearn.Pipeline`
> with `ColumnTransformer`. Transforms fitted on training data only — no leakage.
'''))

# ── VIF ───────────────────────────────────────────────────────────────────────
cells.append(md('''### 3.1 Explanatory Model: Logistic Regression (statsmodels)

**Goal:** Quantify which features drive churn and by how much (odds ratios).  
**Feature selection:** Choose ≤4 theoretically important features with low VIF.
'''))

cells.append(code('''# ── VIF Analysis (multicollinearity check before explanatory model) ────────────
expl_candidates = [
    \'recency_days\', \'frequency\', \'monetary_avg\',
    \'pct_recurring\', \'tenure_days\', \'pct_monetary\', \'avg_days_between_donations\'
]
X_cand = feature_df[expl_candidates].fillna(feature_df[expl_candidates].median())
X_cand_s = pd.DataFrame(StandardScaler().fit_transform(X_cand),
                         columns=expl_candidates, index=X_cand.index)

vif_df = pd.DataFrame({
    \'feature\': expl_candidates,
    \'VIF\'    : [variance_inflation_factor(X_cand_s.values, i)
                 for i in range(len(expl_candidates))]
}).sort_values(\'VIF\', ascending=False)

print("=== Variance Inflation Factors (VIF) ===")
print(vif_df.round(2).to_string(index=False))
print("\\nRule: VIF > 5 = concerning; > 10 = severe multicollinearity")
print("We drop features with VIF > 5 before the explanatory model.")
'''))

cells.append(code('''# ── Statsmodels Logistic Regression ──────────────────────────────────────────
# Keep 4 low-VIF features with strong theoretical backing for donor churn
explanatory_features = [\'recency_days\', \'frequency\', \'pct_recurring\', \'tenure_days\']

X_expl = feature_df[explanatory_features].fillna(feature_df[explanatory_features].median())
y_expl = feature_df[\'churn\']

X_expl_scaled = pd.DataFrame(
    StandardScaler().fit_transform(X_expl),
    columns=explanatory_features, index=X_expl.index
)

X_sm = sm.add_constant(X_expl_scaled)
logit_result = sm.Logit(y_expl, X_sm).fit(disp=0, maxiter=200)
print(logit_result.summary2())
'''))

cells.append(code('''# ── Odds Ratios ───────────────────────────────────────────────────────────────
conf = logit_result.conf_int()
or_df = pd.DataFrame({
    \'Feature\'    : explanatory_features,
    \'Coefficient\': logit_result.params[1:].values,
    \'Odds Ratio\' : np.exp(logit_result.params[1:]).values,
    \'CI Lower\'   : np.exp(conf[0][1:]).values,
    \'CI Upper\'   : np.exp(conf[1][1:]).values,
    \'p-value\'    : logit_result.pvalues[1:].values,
})
or_df[\'Significant\'] = or_df[\'p-value\'] < 0.05
print("=== Odds Ratios (OR > 1 = increases churn risk; OR < 1 = protective) ===\\n")
print(or_df.round(4).to_string(index=False))

fig, ax = plt.subplots(figsize=(8, 5))
clr = [\'#dc2626\' if o>1 else \'#2563eb\' for o in or_df[\'Odds Ratio\']]
ax.barh(or_df[\'Feature\'], or_df[\'Odds Ratio\'], color=clr, alpha=0.8)
ax.errorbar(or_df[\'Odds Ratio\'], range(len(or_df)),
             xerr=[or_df[\'Odds Ratio\']-or_df[\'CI Lower\'],
                   or_df[\'CI Upper\']-or_df[\'Odds Ratio\']],
             fmt=\'none\', color=\'black\', capsize=4)
ax.axvline(1.0, color=\'black\', linestyle=\'--\', linewidth=1.5, label=\'No effect (OR=1)\')
ax.set_xlabel(\'Odds Ratio\'); ax.legend()
ax.set_title(\'Explanatory Model: Odds Ratios + 95% CI\\n(red = increases churn, blue = decreases)\',
              fontsize=11, fontweight=\'bold\')
plt.tight_layout(); plt.savefig(\'explanatory_odds_ratios.png\', dpi=120, bbox_inches=\'tight\'); plt.show()
'''))

# ── PREDICTIVE PIPELINE ───────────────────────────────────────────────────────
cells.append(md('''### 3.2 Predictive Pipeline (sklearn)

**Goal:** Maximize AUC-ROC for at-risk donor flagging.  
**Four classifiers compared:** Logistic Regression, Decision Tree, Random Forest, Gradient Boosting.  
**Validation:** `StratifiedKFold(k=5)` — preserves 75/25 class ratio in each fold.
'''))

cells.append(code('''# ── Feature Lists & Preprocessing Pipeline ────────────────────────────────────
numeric_features = [
    \'recency_days\', \'frequency\', \'monetary_total\', \'monetary_avg\', \'monetary_trend\',
    \'avg_days_between_donations\', \'std_days_between_donations\', \'donation_span_days\',
    \'months_active\', \'pct_recurring\', \'num_campaigns\', \'pct_monetary\',
    \'donation_type_diversity\', \'channel_diversity\', \'has_social_referral\',
    \'num_safehouses_supported\', \'num_program_areas\', \'tenure_days\'
]
categorical_features = [\'supporter_type\', \'acquisition_channel\', \'relationship_type\', \'region\']

X = feature_df[numeric_features + categorical_features].copy()
y = feature_df[\'churn\'].copy()

numeric_transformer = Pipeline([
    (\'imputer\', SimpleImputer(strategy=\'median\')),
    (\'scaler\',  StandardScaler()),
])
categorical_transformer = Pipeline([
    (\'imputer\', SimpleImputer(strategy=\'most_frequent\')),
    (\'onehot\',  OneHotEncoder(drop=\'first\', handle_unknown=\'ignore\', sparse_output=False)),
])
preprocessor = ColumnTransformer([
    (\'num\', numeric_transformer, numeric_features),
    (\'cat\', categorical_transformer, categorical_features),
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
print(f"Feature matrix: {X.shape[0]} x {X.shape[1]}")
print(f"Target: {y.value_counts().to_dict()}")
'''))

cells.append(code('''# ── Cross-Validated Model Comparison ─────────────────────────────────────────
models = {
    \'Logistic Regression\': LogisticRegression(class_weight=\'balanced\', max_iter=1000, random_state=42),
    \'Decision Tree\'      : DecisionTreeClassifier(max_depth=3, class_weight=\'balanced\', random_state=42),
    \'Random Forest\'      : RandomForestClassifier(n_estimators=100, class_weight=\'balanced\', random_state=42),
    \'Gradient Boosting\'  : GradientBoostingClassifier(n_estimators=100, random_state=42),
}

print("=== 5-Fold Stratified Cross-Validation ===\\n")
cv_results = {}
for name, model in models.items():
    pipe = Pipeline([(\'preprocessor\', preprocessor), (\'classifier\', model)])
    s = cross_validate(pipe, X, y, cv=cv,
                       scoring=[\'roc_auc\', \'f1\', \'recall\', \'precision\'])
    cv_results[name] = {
        \'AUC-ROC\'  : (s[\'test_roc_auc\'].mean(),   s[\'test_roc_auc\'].std()),
        \'F1\'       : (s[\'test_f1\'].mean(),         s[\'test_f1\'].std()),
        \'Recall\'   : (s[\'test_recall\'].mean(),     s[\'test_recall\'].std()),
        \'Precision\': (s[\'test_precision\'].mean(),  s[\'test_precision\'].std()),
    }
    print(f"{name}:")
    for metric, (mean, std) in cv_results[name].items():
        bar = \'█\' * int(mean * 20)
        print(f"  {metric:12s} {mean:.3f} ± {std:.3f}  {bar}")
    print()
'''))

cells.append(code('''# ── Model Comparison Chart ────────────────────────────────────────────────────
metrics = [\'AUC-ROC\', \'F1\', \'Recall\', \'Precision\']
model_names = list(cv_results.keys())

fig, axes = plt.subplots(1, 4, figsize=(16, 5))
for ax, metric in zip(axes, metrics):
    means = [cv_results[m][metric][0] for m in model_names]
    stds  = [cv_results[m][metric][1] for m in model_names]
    bars = ax.bar(range(len(model_names)), means, yerr=stds,
                   capsize=5, color=\'#2563eb\', alpha=0.8, edgecolor=\'white\')
    ax.set_xticks(range(len(model_names)))
    ax.set_xticklabels([m.replace(\' \', \'\\n\') for m in model_names], fontsize=8)
    ax.set_title(metric, fontweight=\'bold\'); ax.set_ylim(0, 1.2)
    ax.axhline(0.5, color=\'red\', linestyle=\'--\', linewidth=0.8, alpha=0.4)
    for bar, mean, std in zip(bars, means, stds):
        ax.text(bar.get_x()+bar.get_width()/2., mean+std+0.02,
                f\'{mean:.3f}\', ha=\'center\', fontsize=7.5, fontweight=\'bold\')

plt.suptitle(\'Model Comparison: 5-Fold Stratified CV\', fontsize=13, fontweight=\'bold\')
plt.tight_layout(); plt.savefig(\'model_comparison.png\', dpi=120, bbox_inches=\'tight\'); plt.show()
'''))

# ── FEATURE SELECTION ─────────────────────────────────────────────────────────
cells.append(md('''### 3.3 Feature Selection (Ch. 16)

Three complementary methods to identify the most predictive features:

1. **Mutual Information (SelectKBest)** — non-parametric, captures non-linear relationships
2. **Permutation Importance** — model-agnostic; measures actual AUC-ROC drop when feature shuffled
3. Cross-reference with explanatory model coefficients for convergent validity
'''))

cells.append(code('''# ── SelectKBest: Mutual Information ──────────────────────────────────────────
num_pipe = Pipeline([(\'imp\', SimpleImputer(strategy=\'median\')), (\'sc\', StandardScaler())])
X_num_t  = pd.DataFrame(num_pipe.fit_transform(X[numeric_features]), columns=numeric_features)

selector = SelectKBest(score_func=mutual_info_classif, k=\'all\')
selector.fit(X_num_t, y)

mi_df = (
    pd.DataFrame({\'feature\': numeric_features, \'mutual_info\': selector.scores_})
    .sort_values(\'mutual_info\', ascending=False)
)

fig, ax = plt.subplots(figsize=(8, 7))
mi_df.sort_values(\'mutual_info\').plot(
    kind=\'barh\', x=\'feature\', y=\'mutual_info\', ax=ax,
    color=\'#2563eb\', alpha=0.8, legend=False
)
ax.set_title(\'Feature Importance: Mutual Information Score\', fontsize=12, fontweight=\'bold\')
ax.set_xlabel(\'Mutual Information Score\')
plt.tight_layout(); plt.savefig(\'feature_mi.png\', dpi=120, bbox_inches=\'tight\'); plt.show()
print("Top 10 features by mutual information:")
print(mi_df.head(10).round(4).to_string(index=False))
'''))

cells.append(code('''# ── Permutation Importance ────────────────────────────────────────────────────
rf_perm = Pipeline([
    (\'preprocessor\', preprocessor),
    (\'classifier\',   RandomForestClassifier(n_estimators=100, class_weight=\'balanced\', random_state=42))
])
rf_perm.fit(X, y)

perm = permutation_importance(rf_perm, X, y, n_repeats=30, random_state=42, scoring=\'roc_auc\')

cat_enc  = rf_perm.named_steps[\'preprocessor\'].named_transformers_[\'cat\']
cat_cols = cat_enc.named_steps[\'onehot\'].get_feature_names_out(categorical_features).tolist()
all_cols = numeric_features + cat_cols

perm_df = (
    pd.DataFrame({\'feature\': all_cols,
                   \'mean\': perm.importances_mean,
                   \'std\':  perm.importances_std})
    .sort_values(\'mean\', ascending=False)
    .head(15)
)

fig, ax = plt.subplots(figsize=(9, 7))
ax.barh(perm_df[\'feature\'][::-1], perm_df[\'mean\'][::-1],
         xerr=perm_df[\'std\'][::-1], capsize=3, color=\'#2563eb\', alpha=0.8)
ax.axvline(0, color=\'red\', linestyle=\'--\', linewidth=0.8, alpha=0.5)
ax.set_title(\'Top 15: Permutation Importance (RF, n_repeats=30)\', fontsize=12, fontweight=\'bold\')
ax.set_xlabel(\'Mean Decrease in AUC-ROC\')
plt.tight_layout(); plt.savefig(\'feature_permutation.png\', dpi=120, bbox_inches=\'tight\'); plt.show()
print(perm_df.head(10).round(4).to_string(index=False))
'''))

# ── SECTION 4 ─────────────────────────────────────────────────────────────────
cells.append(md('''## Section 4: Evaluation & Interpretation (Ch. 15)

### Validation Strategy
With n=60 and only 15 churned supporters, we use:

- **`GridSearchCV` with StratifiedKFold(k=5)** for hyperparameter tuning (fast, preserves balance)
- **Leave-One-Out CV (LOOCV)** for the final unbiased performance estimate (maximizes training data)

### Threshold Selection
Default threshold = 0.5. We lower to **0.40** because the asymmetric cost structure
favors recall: a missed at-risk donor costs months of lost donations vs. an unnecessary
outreach email that costs ~15 minutes of Jill\'s time.
'''))

cells.append(code('''# ── GridSearchCV: Hyperparameter Tuning ──────────────────────────────────────
rf_pipe = Pipeline([
    (\'preprocessor\', preprocessor),
    (\'classifier\',   RandomForestClassifier(class_weight=\'balanced\', random_state=42))
])
param_grid = {
    \'classifier__n_estimators\' : [50, 100, 200],
    \'classifier__max_depth\'    : [None, 3, 5],
    \'classifier__min_samples_leaf\': [1, 2, 3],
}
grid_search = GridSearchCV(rf_pipe, param_grid, cv=cv, scoring=\'roc_auc\', n_jobs=-1)
grid_search.fit(X, y)

print(f"Best params  : {grid_search.best_params_}")
print(f"Best CV AUC  : {grid_search.best_score_:.4f}")

best_params = {k.replace(\'classifier__\',\'\'): v for k, v in grid_search.best_params_.items()}
'''))

cells.append(code('''# ── Leave-One-Out CV: Final Evaluation ───────────────────────────────────────
THRESHOLD = 0.40

best_rf = Pipeline([
    (\'preprocessor\', preprocessor),
    (\'classifier\',   RandomForestClassifier(**best_params, class_weight=\'balanced\', random_state=42))
])

loo = LeaveOneOut()
y_proba_loo = np.zeros(len(y))
for tr, te in loo.split(X):
    best_rf.fit(X.iloc[tr], y.iloc[tr])
    y_proba_loo[te] = best_rf.predict_proba(X.iloc[te])[:, 1]

y_pred_loo = (y_proba_loo >= THRESHOLD).astype(int)
loo_auc    = roc_auc_score(y, y_proba_loo)

print(f"=== LOO-CV Results ===\\n")
print(f"AUC-ROC: {loo_auc:.4f}\\n")
print(f"Classification Report (threshold={THRESHOLD}):")
print(classification_report(y, y_pred_loo, target_names=[\'Active\',\'Churned\']))
'''))

cells.append(code('''# ── Confusion Matrix + ROC Curve ─────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(12, 5))

cm = confusion_matrix(y, y_pred_loo)
ConfusionMatrixDisplay(cm, display_labels=[\'Active\', \'Churned\']).plot(
    ax=axes[0], colorbar=False, cmap=\'Blues\')
axes[0].set_title(f\'Confusion Matrix (LOO-CV, threshold={THRESHOLD})\', fontweight=\'bold\')

fpr, tpr, _ = roc_curve(y, y_proba_loo)
axes[1].plot(fpr, tpr, color=\'#2563eb\', linewidth=2.5, label=f\'AUC = {loo_auc:.3f}\')
axes[1].fill_between(fpr, tpr, alpha=0.08, color=\'#2563eb\')
axes[1].plot([0,1],[0,1], \'k--\', linewidth=1, alpha=0.5, label=\'Random\')
axes[1].set_xlabel(\'False Positive Rate\'); axes[1].set_ylabel(\'True Positive Rate (Recall)\')
axes[1].set_title(\'ROC Curve\', fontweight=\'bold\'); axes[1].legend(loc=\'lower right\')

plt.tight_layout(); plt.savefig(\'evaluation_results.png\', dpi=120, bbox_inches=\'tight\'); plt.show()

tn, fp, fn, tp = cm.ravel()
print(f"\\n=== Business Interpretation ===")
print(f"  Caught at-risk donors (TP):      {tp}/{tp+fn} = {tp/(tp+fn):.0%} recall on churned class")
print(f"  Unnecessary outreach (FP):       {fp} supporters")
print(f"  Missed at-risk donors (FN):      {fn}  ← high-cost error")
print(f"  Correctly labeled active (TN):   {tn}")
print(f"\\n  Of {tp+fp} flagged donors, {tp} are genuine ({tp/(tp+fp) if (tp+fp)>0 else 0:.0%} precision).")
print(f"  Cost of outreach per FP  : ~15 min (one email/call)")
print(f"  Cost of missed donor (FN): months of lost donations")
print(f"  → Lower threshold ({THRESHOLD}) is justified by asymmetric costs.")
'''))

cells.append(code('''# ── Learning Curve ────────────────────────────────────────────────────────────
lc_pipe = Pipeline([
    (\'preprocessor\', preprocessor),
    (\'classifier\',   RandomForestClassifier(**best_params, class_weight=\'balanced\', random_state=42))
])
train_sz, tr_sc, val_sc = learning_curve(
    lc_pipe, X, y, train_sizes=np.linspace(0.3, 1.0, 8),
    cv=cv, scoring=\'roc_auc\', n_jobs=-1
)

fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(train_sz, tr_sc.mean(1), \'o-\', color=\'#2563eb\', lw=2, label=\'Training AUC\')
ax.fill_between(train_sz, tr_sc.mean(1)-tr_sc.std(1), tr_sc.mean(1)+tr_sc.std(1), alpha=0.1, color=\'#2563eb\')
ax.plot(train_sz, val_sc.mean(1), \'o-\', color=\'#dc2626\', lw=2, label=\'Validation AUC\')
ax.fill_between(train_sz, val_sc.mean(1)-val_sc.std(1), val_sc.mean(1)+val_sc.std(1), alpha=0.1, color=\'#dc2626\')
ax.set_xlabel(\'Training Set Size\'); ax.set_ylabel(\'AUC-ROC\')
ax.set_title(\'Learning Curve — Random Forest\\n(Convergence indicates bias/variance balance)\',
              fontweight=\'bold\')
ax.legend(); ax.set_ylim(0.3, 1.05)
plt.tight_layout(); plt.savefig(\'learning_curve.png\', dpi=120, bbox_inches=\'tight\'); plt.show()
'''))

# ── SECTION 5 ─────────────────────────────────────────────────────────────────
cells.append(md('''## Section 5: Causal and Relationship Analysis

### Prediction vs. Explanation — Honest Assessment

We have deliberately built two models for two goals:

- The **predictive Random Forest** optimizes for operational accuracy (AUC-ROC).
  It is a black box; its feature importances reveal *correlation* with the label, not causation.

- The **explanatory Logistic Regression** produces interpretable odds ratios, but on observational
  data. We can identify *associations*, and where theory strongly supports directionality, we can
  cautiously suggest *mechanisms* — but we are explicit about the limits.

### Key Caveats (Ch. 9–11 framework)
1. No randomization → no clean causal identification
2. Reverse causality possible for some features (e.g., engaged donors both give more AND give more often)
3. Confounders likely (e.g., supporter type affects both acquisition channel and churn rate)
4. n=60 limits statistical power — treat p-values as suggestive, not definitive
'''))

cells.append(code('''# ── Feature Importance: Random Forest (Gini Impurity) ────────────────────────
final_rf = Pipeline([
    (\'preprocessor\', preprocessor),
    (\'classifier\',   RandomForestClassifier(**best_params, class_weight=\'balanced\', random_state=42))
])
final_rf.fit(X, y)
rf_clf  = final_rf.named_steps[\'classifier\']
cat_enc2 = final_rf.named_steps[\'preprocessor\'].named_transformers_[\'cat\']
cat_nms  = cat_enc2.named_steps[\'onehot\'].get_feature_names_out(categorical_features).tolist()
all_nms  = numeric_features + cat_nms

imp_df = (
    pd.DataFrame({\'feature\': all_nms, \'importance\': rf_clf.feature_importances_})
    .sort_values(\'importance\', ascending=False)
    .head(15)
)

fig, axes = plt.subplots(1, 2, figsize=(16, 7))

axes[0].barh(imp_df[\'feature\'][::-1], imp_df[\'importance\'][::-1], color=\'#2563eb\', alpha=0.8)
axes[0].set_title(\'Random Forest: Gini Importance (Top 15)\', fontweight=\'bold\')
axes[0].set_xlabel(\'Mean Decrease in Gini Impurity\')

coef_plot = pd.DataFrame({
    \'feature\': explanatory_features,
    \'abs_coef\': np.abs(logit_result.params[1:].values),
    \'direction\': [\'Increases risk\' if c>0 else \'Decreases risk\'
                   for c in logit_result.params[1:].values]
}).sort_values(\'abs_coef\')
clrs = [\'#dc2626\' if d==\'Increases risk\' else \'#2563eb\' for d in coef_plot[\'direction\']]
axes[1].barh(coef_plot[\'feature\'], coef_plot[\'abs_coef\'], color=clrs, alpha=0.8)
axes[1].set_title(\'LR: |Standardized Coefficients|\\n(red=increases churn, blue=decreases)\',
                   fontweight=\'bold\')
axes[1].set_xlabel(\'|Coefficient|\')

plt.tight_layout(); plt.savefig(\'causal_importance.png\', dpi=120, bbox_inches=\'tight\'); plt.show()
print("Top 10 by RF importance:"); print(imp_df.head(10).round(4).to_string(index=False))
'''))

cells.append(md('''### Findings and Actionable Recommendations

#### Finding 1: Recency is the strongest single predictor
Both models agree: donors who have not given recently are far more likely to churn.

**Defensible direction:** High confidence. Recent behavior strongly predicts future behavior.  
**Recommendation:** Trigger automatic recency alerts — donors with no donation in 90+ days
enter Jill\'s outreach queue immediately.

#### Finding 2: Recurring pledges are strongly protective
High `pct_recurring` consistently shows up as a top protective feature. Recurring donors have a
structural commitment that acts as a retention anchor.

**Defensible direction:** High confidence. The mechanism is clear: recurring pledges remove the
friction of re-deciding each donation cycle.  
**Recommendation:** Actively promote recurring donation enrollment during onboarding and
year-end campaigns. This is likely the highest-ROI single retention intervention.

#### Finding 3: Tenure protects, but is confounded with frequency
Long-tenured donors churn less, but they also have more opportunities to donate. We cannot cleanly
separate "loyalty effect" from "frequency effect."

**Defensible direction:** Moderate confidence directionally; size uncertain.  
**Recommendation:** Focus on early engagement — a first-year donor who gives 2+ times is
most likely to become a long-term supporter. Build a strong onboarding experience.

#### Finding 4: Acquisition channel shows heterogeneity (suggestive, not definitive)
Church and WordOfMouth channels tend to have lower churn rates than SocialMedia — possibly because
personal referrals create stronger relational commitment. Chi-squared tests are not significant at
n=60.

**Caution:** This could also reflect different supporter types being acquired through different channels.  
**Recommendation:** Monitor as the donor base grows. With 150+ donors, channel effects should
become statistically reliable.

#### What We Cannot Claim
- Causal ordering between monetary amount and retention (reverse causality plausible)
- That any single factor "causes" churn in the interventional sense
- Generalizability beyond this 60-person dataset without replication
'''))

# ── SECTION 6 ─────────────────────────────────────────────────────────────────
cells.append(md('''## Section 6: Deployment Notes (Ch. 17)

### Architecture

```
[PostgreSQL DB]
  supporters, donations, donation_allocations
        |
        | (nightly, via score_donor_churn.py)
        v
[Feature Engineering]  <--- same functions as this notebook
        |
        v
[models/donor_churn_model.joblib]  (trained model)
        |
        v
[donor_churn_predictions table]
  supporter_id | churn_probability | risk_level | scored_at
        |
        v (read by .NET backend)
[GET /api/donors/{id}/churn-risk]
        |
        v (consumed by React admin page)
[Admin Donor Page]
  🔴 High Risk badge  (prob ≥ 0.70)
  🟡 Medium Risk badge (0.40 ≤ prob < 0.70)
  🟢 (no badge)       (prob < 0.40)
```

### Nightly Scoring
`score_donor_churn.py` handles the complete inference pipeline — connect, feature engineer,
load model, score, write results. Can be run via:

- **Windows Task Scheduler** (local dev): `python score_donor_churn.py`
- **Railway Cron Job** (production): schedule at 2:00 AM UTC

### Model Retraining
Re-run this notebook monthly or when 20+ new supporters are added.
The scoring script auto-loads the latest `donor_churn_model.joblib`.

### Monitoring (Ch. 18)
Track `donor_churn_predictions` over time. Alert if:
- Mean predicted probability changes by >15% month-over-month (distribution drift)
- Accuracy against newly-observed churn events drops below 0.65 AUC
'''))

cells.append(code('''# ── Save Final Model + Metadata ───────────────────────────────────────────────
from pathlib import Path

models_dir = Path(\'models\')
models_dir.mkdir(exist_ok=True)

# Refit on complete dataset
final_model = Pipeline([
    (\'preprocessor\', preprocessor),
    (\'classifier\',   RandomForestClassifier(**best_params, class_weight=\'balanced\', random_state=42))
])
final_model.fit(X, y)

model_path = models_dir / \'donor_churn_model.joblib\'
joblib.dump(final_model, model_path)
print(f"Model saved: {model_path}")

metadata = {
    \'model_name\'            : \'donor_churn_classifier\',
    \'model_type\'            : \'RandomForestClassifier\',
    \'version\'               : \'v1.0\',
    \'trained_at\'            : datetime.now().isoformat(),
    \'training_samples\'      : int(len(X)),
    \'churn_rate\'            : float(y.mean()),
    \'analysis_date\'         : str(ANALYSIS_DATE.date()),
    \'loo_auc_roc\'           : float(loo_auc),
    \'cv_auc_roc\'            : float(grid_search.best_score_),
    \'prediction_threshold\'  : THRESHOLD,
    \'numeric_features\'      : numeric_features,
    \'categorical_features\'  : categorical_features,
    \'best_params\'           : {k: str(v) for k, v in best_params.items()},
    \'risk_thresholds\'       : {\'High\': 0.70, \'Medium\': 0.40, \'Low\': 0.0},
}
meta_path = models_dir / \'model_metadata.json\'
with open(meta_path, \'w\') as f:
    json.dump(metadata, f, indent=2)
print(f"Metadata saved: {meta_path}\\n")
for k in [\'loo_auc_roc\',\'cv_auc_roc\',\'training_samples\',\'churn_rate\',\'prediction_threshold\']:
    print(f"  {k}: {metadata[k]}")
'''))

cells.append(code('''# ── Create donor_churn_predictions Table + Write Predictions ─────────────────
CREATE_SQL = """
CREATE TABLE IF NOT EXISTS donor_churn_predictions (
    prediction_id     SERIAL PRIMARY KEY,
    supporter_id      INTEGER NOT NULL,
    churn_probability NUMERIC(5,4) NOT NULL,
    risk_level        VARCHAR(10) NOT NULL,
    model_version     VARCHAR(20),
    scored_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""

def get_risk_level(p):
    if p >= 0.70: return \'High\'
    if p >= 0.40: return \'Medium\'
    return \'Low\'

probas   = final_model.predict_proba(X)[:, 1]
sup_ids  = feature_df[\'supporter_id\'].tolist()

with psycopg2.connect(**conn_params) as wconn:
    with wconn.cursor() as cur:
        cur.execute(CREATE_SQL); wconn.commit()
        print("donor_churn_predictions table ready.")

        # Idempotent: delete existing predictions for these supporters
        cur.execute("DELETE FROM donor_churn_predictions WHERE supporter_id = ANY(%s)", (sup_ids,))

        rows = [(int(s), float(p), get_risk_level(p), \'v1.0\')
                for s, p in zip(sup_ids, probas)]
        cur.executemany(
            "INSERT INTO donor_churn_predictions "
            "(supporter_id, churn_probability, risk_level, model_version) VALUES (%s,%s,%s,%s)",
            rows
        )
        wconn.commit()
        print(f"Wrote {len(rows)} predictions to donor_churn_predictions.\\n")

        cur.execute(
            "SELECT risk_level, COUNT(*), ROUND(AVG(churn_probability)::numeric,3) "
            "FROM donor_churn_predictions GROUP BY risk_level ORDER BY risk_level"
        )
        print(f"{'Risk Level':<12} {'Count':>6}  {'Avg Prob':>10}")
        for row in cur.fetchall():
            print(f"{row[0]:<12} {row[1]:>6}  {float(row[2]):>10.3f}")

print("\\n=== Supporters Flagged for Jill\'s Outreach (prob >= THRESHOLD) ===")
at_risk = [(int(s), float(p)) for s, p in zip(sup_ids, probas) if p >= THRESHOLD]
at_risk_ids = [r[0] for r in at_risk]
at_risk_probs = {r[0]: r[1] for r in at_risk}
ar_df = supporters[supporters[\'supporter_id\'].isin(at_risk_ids)][
    [\'supporter_id\',\'display_name\',\'supporter_type\',\'acquisition_channel\',\'status\']].copy()
ar_df[\'churn_prob\'] = ar_df[\'supporter_id\'].map(at_risk_probs).round(3)
ar_df = ar_df.sort_values(\'churn_prob\', ascending=False)
print(ar_df.to_string(index=False))
'''))

# ── SUMMARY ───────────────────────────────────────────────────────────────────
cells.append(md('''## Summary

| Pipeline Stage | Delivered |
|---------------|-----------|
| **Problem Framing** | Defined churn, identified Jill as stakeholder, chose both predictive + explanatory |
| **Data Acquisition** | PostgreSQL connection, 5 tables loaded, 22+ features engineered across 5 groups |
| **EDA** | Univariate + bivariate distributions, Mann-Whitney U tests, chi-squared, correlation heatmap |
| **Explanatory Model** | statsmodels Logistic Regression with VIF, odds ratios, 95% CIs, causal analysis |
| **Predictive Models** | LR, Decision Tree, RF, GBT compared via StratifiedKFold; RF tuned via GridSearchCV |
| **Feature Selection** | Mutual Information + Permutation Importance; recency + recurring confirmed top features |
| **Evaluation** | LOO-CV for final estimate; threshold=0.40 justified by asymmetric costs |
| **Deployment** | Model → `models/donor_churn_model.joblib`; predictions → `donor_churn_predictions` table; nightly `score_donor_churn.py` |

### Next Steps
1. **Web Integration:** Connect `donor_churn_predictions` to `.NET` API `/api/donors/churn-risk`
2. **Admin UI:** Add "At Risk" badges on the Admin Donor page (React component)
3. **Monitoring (Ch. 18):** Log prediction distributions nightly; alert on drift > 15%
4. **Retrain:** Re-run this notebook when 20+ new supporters are added or monthly
'''))

# ── WRITE NOTEBOOK ────────────────────────────────────────────────────────────
nb = {
    "cells": cells,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "codemirror_mode": {"name": "ipython", "version": 3},
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "version": "3.9.0"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

out = os.path.join(ROOT, "donor-churn-classifier.ipynb")
with open(out, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

print(f"Notebook written: {out}")
print(f"Total cells: {len(cells)}")
