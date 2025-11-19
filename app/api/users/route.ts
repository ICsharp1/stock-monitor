import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { canManageUsers } from '@/lib/permissions-server'

/**
 * GET /api/users
 * Get all users with their roles and permissions
 * Only accessible by traders and admins
 */
export async function GET() {
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
        { error: 'Forbidden: Only traders and admins can view users' },
        { status: 403 }
      )
    }

    // Fetch all users with their roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        created_at
      `)
      .order('created_at', { ascending: true })

    if (rolesError) {
      console.error('[API /users GET] Error fetching user roles:', rolesError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Fetch auth.users data for emails using admin client
    const adminClient = createAdminClient()
    const { data: { users: authUsers }, error: authUsersError } = await adminClient.auth.admin.listUsers()

    if (authUsersError) {
      console.error('[API /users GET] Error fetching auth users:', authUsersError)
    }

    // Combine data
    const usersWithDetails = await Promise.all(
      (userRoles || []).map(async (userRole) => {
        const authUser = authUsers?.find(au => au.id === userRole.user_id)

        // Fetch user's stock permissions
        const { data: permissions } = await supabase
          .from('stock_permissions')
          .select('symbol, can_view')
          .eq('user_id', userRole.user_id)
          .eq('can_view', true)

        return {
          id: userRole.user_id,
          email: authUser?.email || 'Unknown',
          role: userRole.role,
          created_at: userRole.created_at,
          permissions: permissions?.map(p => p.symbol) || []
        }
      })
    )

    return NextResponse.json({ users: usersWithDetails })
  } catch (error) {
    console.error('[API /users GET] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
