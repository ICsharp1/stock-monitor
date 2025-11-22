import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, ApiSuccess, validateRequiredFields, validateFieldType } from '@/lib/api-response'
import { canManageUsers } from '@/lib/permissions-server'
import type { UserRole } from '@/types/permissions'

/**
 * PUT /api/users/[userId]/role
 * Update a user's role
 * Only accessible by admins and traders (traders can only change viewer ↔ trader)
 *
 * Body: { role: 'viewer' | 'trader' }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { userId } = await params

    // Check if user is authenticated
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return ApiError.unauthorized()
    }

    // Check if user can manage others (trader or admin)
    const canManage = await canManageUsers(currentUser.id)

    if (!canManage) {
      return ApiError.forbidden('Only traders and admins can update user roles')
    }

    // Get current user's role to determine permissions
    const { data: currentUserRoleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    const currentUserRole = currentUserRoleData?.role as UserRole

    // Parse and validate request body
    const body = await request.json()

    try {
      validateRequiredFields<{ role: string }>(body, ['role'])
      validateFieldType(body.role, 'role', 'string')
    } catch (validationError) {
      return ApiError.badRequest(
        validationError instanceof Error ? validationError.message : 'Invalid request body'
      )
    }

    const { role: newRole } = body

    // Validate role value
    if (!['viewer', 'trader'].includes(newRole)) {
      return ApiError.badRequest('Role must be either "viewer" or "trader"')
    }

    // Get target user's current role (needed for both permission check and audit log)
    const { data: targetUserRoleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    const oldRole = targetUserRoleData?.role || 'viewer'

    // Traders can only manage viewers, not admins or other traders
    if (currentUserRole === 'trader') {
      if (targetUserRoleData?.role === 'admin') {
        return ApiError.forbidden('Traders cannot modify admin users')
      }

      if (targetUserRoleData?.role === 'trader') {
        return ApiError.forbidden('Traders cannot modify other traders')
      }

      // Traders cannot promote users to admin
      if (newRole === 'admin') {
        return ApiError.forbidden('Traders cannot promote users to admin')
      }
    }

    // Skip if role is not actually changing
    if (oldRole === newRole) {
      return ApiSuccess.ok(
        { role: newRole },
        `User role is already ${newRole}`
      )
    }

    // Use admin client for role update (bypasses RLS)
    const adminClient = createAdminClient()

    // Update user role
    const { error: updateError } = await adminClient
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId)

    if (updateError) {
      console.error('[API /users/[userId]/role PUT] Error updating role:', updateError)
      return ApiError.internal('Failed to update user role', updateError)
    }

    // Log the role change in audit log
    const { error: auditError } = await adminClient
      .from('role_change_log')
      .insert({
        target_user_id: userId,
        changed_by_user_id: currentUser.id,
        old_role: oldRole,
        new_role: newRole
      })

    if (auditError) {
      // Log error but don't fail the request - role was already updated
      console.error('[API /users/[userId]/role PUT] Error logging role change:', auditError)
    }

    // Don't delete permissions - they're ignored for traders/admins anyway
    // This preserves permissions if user is demoted back to viewer

    return ApiSuccess.ok(
      { role: newRole },
      `User role updated to ${newRole} successfully`
    )
  } catch (error) {
    console.error('[API /users/[userId]/role PUT] Exception:', error)
    return ApiError.internal('Internal server error', error)
  }
}
