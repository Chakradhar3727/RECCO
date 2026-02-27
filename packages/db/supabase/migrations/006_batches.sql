-- 006_batches.sql
CREATE TYPE batch_status AS ENUM (
  'CREATED', 'AWAITING_ACKNOWLEDGMENT', 'RESCHEDULED', 'ACKNOWLEDGED', 
  'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'IN_PROCESSING', 'COMPLETE', 'ISSUED'
);

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id UUID REFERENCES aggregator_profiles(id),
  recycler_id UUID REFERENCES recycler_facilities(id),
  status batch_status DEFAULT 'CREATED',
  pickup_window_start TIMESTAMPTZ,
  pickup_window_end TIMESTAMPTZ,
  batch_qr_payload TEXT UNIQUE,
  chase_count INT DEFAULT 0,
  chase_last_at TIMESTAMPTZ,
  reschedule_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for collections in a batch
CREATE TABLE batch_collections (
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, collection_id)
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_collections ENABLE ROW LEVEL SECURITY;
