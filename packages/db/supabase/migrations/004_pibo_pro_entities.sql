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

-- PIBO User ID Sequences (atomic, race-condition-proof)
CREATE SEQUENCE IF NOT EXISTS pibo_prod_seq START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS pibo_imp_seq START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS pibo_bo_seq START 1 INCREMENT 1;

-- PostgreSQL function to generate PIBO User ID atomically
CREATE OR REPLACE FUNCTION generate_pibo_user_id(pibo_type TEXT, pibo_year INT)
RETURNS TEXT AS $$
DECLARE
  seq_val INT;
  type_prefix TEXT;
BEGIN
  CASE UPPER(pibo_type)
    WHEN 'PRODUCER'    THEN type_prefix := 'PROD'; seq_val := nextval('pibo_prod_seq');
    WHEN 'IMPORTER'    THEN type_prefix := 'IMP';  seq_val := nextval('pibo_imp_seq');
    WHEN 'BRAND_OWNER' THEN type_prefix := 'BO';   seq_val := nextval('pibo_bo_seq');
    ELSE RAISE EXCEPTION 'Invalid PIBO type: %', pibo_type;
  END CASE;
  RETURN 'PIBO-' || type_prefix || '-' || RIGHT(pibo_year::TEXT, 2) || '-' || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- PRO User ID Sequence (atomic)
CREATE SEQUENCE IF NOT EXISTS pro_org_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION generate_pro_user_id(cpcb_reg TEXT, state_code TEXT)
RETURNS TEXT AS $$
DECLARE
  seq_val INT;
  cpcb_last6 TEXT;
BEGIN
  -- Extract last 6 alphanumeric chars from CPCB reg number
  cpcb_last6 := RIGHT(REGEXP_REPLACE(cpcb_reg, '[^A-Z0-9]', '', 'g'), 6);
  seq_val := nextval('pro_org_seq');
  RETURN 'PRO-' || cpcb_last6 || '-' || UPPER(state_code) || '-' || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
