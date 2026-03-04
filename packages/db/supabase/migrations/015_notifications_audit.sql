-- 015_notifications_audit.sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT, -- INFO, ALERT, SUCCESS
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  retry_count INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL, -- UPDATE_USER, RESOLVE_DISPUTE, etc.
  entity_type TEXT,
  entity_id UUID,
  previous_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Notifications policy: users see their own
CREATE POLICY "Users can see own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION trigger_facility_qr_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when approval_status changes TO 'APPROVED'
  IF NEW.approval_status = 'APPROVED' AND OLD.approval_status != 'APPROVED' THEN
    -- Call Edge Function asynchronously via pg_net
    PERFORM net.http_post(
      url := current_setting('app.supabase_functions_url') || '/record-gps-hash',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'action', 'generate_facility_qr',
        'recycler_facility_id', NEW.id::TEXT
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_recycler_approval
  AFTER UPDATE ON recycler_facilities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_facility_qr_generation();
