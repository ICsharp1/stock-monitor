-- Add UPDATE policy for user_roles table
-- Allows admins to update any role, traders to update viewer roles only

-- First grant UPDATE permission
GRANT UPDATE ON user_roles TO authenticated;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can update any role" ON user_roles;
DROP POLICY IF EXISTS "Traders can update viewer roles" ON user_roles;

-- Policy 1: Admins can update any role
CREATE POLICY "Admins can update any role"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 2: Traders can update viewer roles (not admin or other traders)
CREATE POLICY "Traders can update viewer roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    -- Current user must be a trader
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'trader'
    )
    -- Target row must be a viewer
    AND role = 'viewer'
  )
  WITH CHECK (
    -- After update, can only be viewer or trader (not admin)
    role IN ('viewer', 'trader')
  );
