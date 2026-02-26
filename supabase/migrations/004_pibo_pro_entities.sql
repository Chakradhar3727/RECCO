-- 004_pibo_pro_entities.sql
CREATE TABLE pibo_entities (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  gst_number TEXT UNIQUE,
  pibo_type TEXT NOT NULL, -- PRODUCER, IMPORTER, BRAND_OWNER
  annual_obligation_mt DECIMAL(12, 2) DEFAULT 0,
  current_compliance_mt DECIMAL(12, 2) DEFAULT 0,
  compliance_gap_mt DECIMAL(12, 2) DEFAULT 0
);

CREATE TABLE pro_organisations (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL,
  cpcb_reg_number TEXT UNIQUE,
  total_pool_mt DECIMAL(12, 2) DEFAULT 0,
  unallocated_mt DECIMAL(12, 2) DEFAULT 0
);

CREATE TABLE pro_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID REFERENCES pro_organisations(id),
  client_id UUID REFERENCES pibo_entities(id),
  consent_token TEXT,
  consent_token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pro_id, client_id)
);

ALTER TABLE pibo_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_clients ENABLE ROW LEVEL SECURITY;
