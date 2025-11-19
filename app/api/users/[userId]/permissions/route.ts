import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canManageUsers } from '@/lib/permissions-server'
import { getServerUserRole } from '@/lib/permissions-server'

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user can manage others (trader or admin)
    const canManage = await canManageUsers(user.id)

    if (!canManage) {
      return NextResponse.json(
        { error: 'Forbidden: Only traders and admins can manage permissions' },
        { status: 403 }
      )
    }

    // Await params (Next.js 15+ requirement)
    const { userId } = await params
    const targetUserId = userId
    console.log('[API permissions PUT] Target user ID:', targetUserId)

    // Check that target user is a viewer
    const targetRole = await getServerUserRole(targetUserId)
    console.log('[API permissions PUT] Target user role:', targetRole)

    if (!targetRole) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    if (targetRole !== 'viewer') {
      return NextResponse.json(
        { error: 'Can only manage permissions for viewer users' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { symbols } = body

    // Validate input
    if (!Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Symbols must be an array' },
        { status: 400 }
      )
    }

    // Delete all existing permissions for this user
    const { error: deleteError } = await supabase
      .from('stock_permissions')
      .delete()
      .eq('user_id', targetUserId)

    if (deleteError) {
      console.error('[API permissions PUT] Error deleting permissions:', deleteError)
      return NextResponse.json(
        { error: 'Failed to update permissions' },
        { status: 500 }
      )
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
        return NextResponse.json(
          { error: 'Failed to update permissions' },
          { status: 500 }
        )
      }
    }

    console.log(`[API permissions PUT] Updated permissions for user ${targetUserId}: ${symbols.join(', ')}`)

    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully',
      symbols
    })
  } catch (error) {
    console.error('[API permissions PUT] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
