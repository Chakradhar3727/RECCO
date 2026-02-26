-- 005_collections.sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id UUID REFERENCES aggregator_profiles(id),
  photo_url_1 TEXT, -- Weight photo 1
  photo_url_2 TEXT, -- Weight photo 2
  photo_url_3 TEXT, -- Weight photo 3
  ocr_weight_1 DECIMAL(10, 2),
  ocr_weight_2 DECIMAL(10, 2),
  ocr_weight_3 DECIMAL(10, 2),
  median_weight DECIMAL(10, 2),
  gps_lat DECIMAL(9, 6),
  gps_lng DECIMAL(9, 6),
  material_type TEXT,
  material_grade TEXT,
  collection_hash TEXT UNIQUE, -- Keccak256
  status TEXT DEFAULT 'AVAILABLE_FOR_BATCHING',
  fraud_flags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
