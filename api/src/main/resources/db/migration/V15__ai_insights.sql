CREATE TABLE ai_insights (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  feature_type VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  details_json TEXT NOT NULL,
  source_from DATE NOT NULL,
  source_to DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  generated_by VARCHAR(80) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ai_insights_feature_type CHECK (feature_type IN (
    'DAILY_BRIEF',
    'ANOMALY_ALERT',
    'MONTHLY_ADVISOR',
    'ANALYST_CHAT',
    'AGENT_INVESTIGATION'
  )),
  CONSTRAINT chk_ai_insights_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  CONSTRAINT chk_ai_insights_status CHECK (status IN ('NEW', 'ACKNOWLEDGED', 'DISMISSED')),
  CONSTRAINT chk_ai_insights_source_range CHECK (source_to >= source_from)
);

CREATE INDEX idx_ai_insights_status_generated
  ON ai_insights (tenant_id, status, generated_at DESC);

CREATE INDEX idx_ai_insights_feature_range
  ON ai_insights (tenant_id, feature_type, source_from, source_to);
