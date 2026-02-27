-- 003_recycler_entities.sql
CREATE TABLE recycler_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES user_profiles(id),
  facility_name TEXT NOT NULL,
  geo_location GEOGRAPHY(POINT),
  address_text TEXT,
  capacity_mt_per_month DECIMAL(10, 2),
  current_processing_load DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  facility_qr_payload TEXT UNIQUE
);

CREATE TABLE recycler_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES recycler_facilities(id),
  doc_type TEXT NOT NULL, -- CPCB_REG, SPCB_CONSENT, etc.
  doc_url TEXT NOT NULL,
  expiry_date DATE,
  ocr_raw_data JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ
);

ALTER TABLE recycler_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycler_documents ENABLE ROW LEVEL SECURITY;
