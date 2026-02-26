-- 007_transport_chain.sql
CREATE TABLE batch_transport_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- PICKUP, DELIVERY
  gps_lat DECIMAL(9, 6),
  gps_lng DECIMAL(9, 6),
  event_hash TEXT, -- Blockchain hash
  device_fingerprint TEXT,
  idempotency_key TEXT, -- batch_id + event_type
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, event_type)
);

ALTER TABLE batch_transport_events ENABLE ROW LEVEL SECURITY;
