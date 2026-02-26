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
