-- ============================================================
-- schema.sql
-- Database schema for Lighthouse Sanctuary project
-- ============================================================

CREATE TABLE IF NOT EXISTS safehouses (
    safehouse_id      SERIAL PRIMARY KEY,
    safehouse_code    VARCHAR(10) NOT NULL,
    name              VARCHAR(100) NOT NULL,
    region            VARCHAR(50),
    city              VARCHAR(50),
    province          VARCHAR(50),
    country           VARCHAR(50),
    open_date         DATE,
    status            VARCHAR(20),
    capacity_girls    INT,
    capacity_staff    INT,
    current_occupancy INT,
    notes             TEXT
);

CREATE TABLE IF NOT EXISTS public_impact_snapshots (
    snapshot_id          SERIAL PRIMARY KEY,
    snapshot_date        DATE NOT NULL,
    headline             VARCHAR(200),
    summary_text         TEXT,
    metric_payload_json  TEXT,
    is_published         BOOLEAN DEFAULT TRUE,
    published_at         DATE
);
