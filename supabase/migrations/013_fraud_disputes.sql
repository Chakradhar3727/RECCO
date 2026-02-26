-- 013_fraud_disputes.sql
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES user_profiles(id),
  flag_type TEXT NOT NULL, -- WEIGHT_VARIANCE, GPS_MISMATCH, etc.
  severity TEXT DEFAULT 'MEDIUM',
  evidence_data JSONB,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weight_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) UNIQUE,
  aggregator_id UUID REFERENCES aggregator_profiles(id),
  recycler_id UUID REFERENCES recycler_facilities(id),
  agg_weight DECIMAL(12, 2),
  rec_weight DECIMAL(12, 2),
  variance_percent DECIMAL(5, 2),
  admin_decision TEXT,
  resolution_notes TEXT,
  sla_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_disputes ENABLE ROW LEVEL SECURITY;
