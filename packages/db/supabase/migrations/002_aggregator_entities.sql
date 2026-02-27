-- 002_aggregator_entities.sql
CREATE TABLE aggregator_profiles (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  aggregator_id_code TEXT UNIQUE NOT NULL, -- AGG-EMAIL-######
  total_collections INT DEFAULT 0,
  total_weight_kg DECIMAL(12, 2) DEFAULT 0,
  current_rating DECIMAL(3, 2) DEFAULT 5.00,
  bank_details JSONB,
  pin_hash TEXT -- 4-digit PIN for quick login
);

CREATE TABLE aggregator_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id UUID REFERENCES aggregator_profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  verification_rate DECIMAL(5,2),
  compliance_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aggregator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregator_scorecards ENABLE ROW LEVEL SECURITY;
