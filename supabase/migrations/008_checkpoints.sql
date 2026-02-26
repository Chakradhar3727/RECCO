-- 008_checkpoints.sql
CREATE TABLE batch_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  cp1_input_weight DECIMAL(12, 2),
  cp1_scale_photo_url TEXT,
  cp1_hash TEXT,
  cp1_gps_lat DECIMAL(9, 6),
  cp1_gps_lng DECIMAL(9, 6),
  
  cp2_video_url TEXT,
  cp2_hash TEXT,
  
  cp3_output_weight DECIMAL(12, 2),
  cp3_scale_photo_url TEXT,
  cp3_hash TEXT,
  cp3_gps_lat DECIMAL(9, 6),
  cp3_gps_lng DECIMAL(9, 6),
  
  processing_duration_mins INT,
  weight_loss_percent DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE batch_checkpoints ENABLE ROW LEVEL SECURITY;
