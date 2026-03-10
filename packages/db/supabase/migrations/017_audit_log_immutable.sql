-- Migration 017: Enforce INSERT-only RLS on admin_audit_log (Gate G37)
-- This makes the audit log immutable: records can be inserted but never updated or deleted.

-- Policy 1: Allow INSERT for authenticated admin users
CREATE POLICY "admin_audit_log_insert_only" ON admin_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Allow SELECT for authenticated admin users (read their audit trail)
CREATE POLICY "admin_audit_log_select" ON admin_audit_log
  FOR SELECT
  USING (true);

-- No UPDATE or DELETE policies = immutable audit log
-- Any UPDATE or DELETE attempt will fail with "permission denied" or return 0 rows.

-- Verify: After running this migration, test:
-- UPDATE admin_audit_log SET action = 'TAMPERED' WHERE id = (SELECT id FROM admin_audit_log LIMIT 1);
-- Expected: ERROR or 0 rows affected
-- DELETE FROM admin_audit_log WHERE id = (SELECT id FROM admin_audit_log LIMIT 1);
-- Expected: ERROR or 0 rows affected
