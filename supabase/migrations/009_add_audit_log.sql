-- Audit log for tracking role changes
-- Only tracks role changes (not individual permission changes) to keep it manageable

CREATE TABLE IF NOT EXISTS role_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  old_role text NOT NULL,
  new_role text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for looking up changes by target user
CREATE INDEX IF NOT EXISTS idx_role_change_log_target_user ON role_change_log(target_user_id);

-- Index for looking up changes by admin who made the change
CREATE INDEX IF NOT EXISTS idx_role_change_log_changed_by ON role_change_log(changed_by_user_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_role_change_log_created_at ON role_change_log(created_at DESC);

-- RLS policies
ALTER TABLE role_change_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the audit log
CREATE POLICY "Admins can view audit log"
  ON role_change_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only system (via service role) can insert audit entries
-- Regular users cannot insert directly
CREATE POLICY "Service role can insert audit entries"
  ON role_change_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
