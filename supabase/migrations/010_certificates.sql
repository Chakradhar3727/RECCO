-- 010_certificates.sql
CREATE TYPE lab_status AS ENUM ('NONE', 'UPLOADED', 'NABL_VERIFIED', 'SELF_DECLARED');

CREATE TABLE epr_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) UNIQUE,
  nft_token_id TEXT UNIQUE,
  material_type TEXT NOT NULL,
  weight_mt DECIMAL(12, 4) NOT NULL,
  trust_score INT DEFAULT 0,
  lab_status lab_status DEFAULT 'NONE',
  blockchain_tx_hash TEXT,
  issuer_id UUID REFERENCES recycler_facilities(id),
  current_owner_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE epr_certificates ENABLE ROW LEVEL SECURITY;
