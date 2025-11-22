import { createClient } from '@/lib/supabase/server'
import { ApiError, ApiSuccess } from '@/lib/api-response'
import { canManageUsers } from '@/lib/permissions-server'
import { getServerUserRole } from '@/lib/permissions-server'
import { API_LIMITS } from '@/lib/constants'

/**
 * PUT /api/users/[userId]/permissions
 * Update stock permissions for a user
 * Only accessible by traders and admins
 * Target user must be a viewer
 *
 * Body: { symbols: string[] }
 * Example: { symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"] }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return ApiError.unauthorized()
    }

    // Check if user can manage others (trader or admin)
    const canManage = await canManageUsers(user.id)

    if (!canManage) {
      return ApiError.forbidden('Only traders and admins can manage permissions')
    }

    // Await params (Next.js 15+ requirement)
    const { userId } = await params
    const targetUserId = userId
    console.log('[API permissions PUT] Target user ID:', targetUserId)

    // Check that target user is a viewer
    const targetRole = await getServerUserRole(targetUserId)
    console.log('[API permissions PUT] Target user role:', targetRole)

    if (!targetRole) {
      return ApiError.notFound('Target user not found')
    }

    if (targetRole !== 'viewer') {
      return ApiError.forbidden('Can only manage permissions for viewer users')
    }

    // Parse request body
    const body = await request.json()
    const { symbols } = body

    // Validate input
    if (!Array.isArray(symbols)) {
      return ApiError.badRequest('Symbols must be an array')
    }

    // Validate symbols array length
    if (symbols.length > API_LIMITS.MAX_STOCKS_PER_VIEWER) {
      return ApiError.badRequest(`Maximum ${API_LIMITS.MAX_STOCKS_PER_VIEWER} stocks per viewer`)
    }

    // Delete all existing permissions for this user
    const { error: deleteError } = await supabase
      .from('stock_permissions')
      .delete()
      .eq('user_id', targetUserId)

    if (deleteError) {
      console.error('[API permissions PUT] Error deleting permissions:', deleteError)
      return ApiError.internal('Failed to update permissions', deleteError)
    }

    // Insert new permissions
    if (symbols.length > 0) {
      const permissionsToInsert = symbols.map(symbol => ({
        user_id: targetUserId,
        symbol: symbol,
        can_view: true
      }))

      const { error: insertError } = await supabase
        .from('stock_permissions')
        .insert(permissionsToInsert)

      if (insertError) {
        console.error('[API permissions PUT] Error inserting permissions:', insertError)
        return ApiError.internal('Failed to update permissions', insertError)
      }
    }

    console.log(`[API permissions PUT] Updated permissions for user ${targetUserId}: ${symbols.join(', ')}`)

    return ApiSuccess.ok({ symbols }, 'Permissions updated successfully')
  } catch (error) {
    console.error('[API permissions PUT] Exception:', error)
    return ApiError.internal('Internal server error', error)
  }
}
