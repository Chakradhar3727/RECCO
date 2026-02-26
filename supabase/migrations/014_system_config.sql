-- 014_system_config.sql
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);

-- Seed critical data
INSERT INTO system_config (key, value, description) VALUES
('epr_annual_deadline', '2026-06-30', 'Final date for current FY EPR filing'),
('platform_fee_percent', '2.0', 'Platform transaction fee percentage'),
('weight_variance_threshold_amber', '10.0', 'Variance % that triggers amber warning'),
('weight_variance_threshold_red', '15.0', 'Variance % that triggers red flag/dispute'),
('gps_threshold_pickup_meters', '500', 'Max allow distance from batch origin for pickup'),
('gps_threshold_delivery_meters', '200', 'Max allowed distance from facility for delivery');

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
-- Admin only view/edit
CREATE POLICY "Admins can manage config" ON system_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND portal_role = 'ADMIN'));
