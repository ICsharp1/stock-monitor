import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/permissions'

/**
 * Server-side permission check to verify if a user can view a stock symbol
 * Throws an error if permission is denied
 * @param userId - The user's ID
 * @param symbol - The stock symbol to check
 * @throws Error if the user doesn't have permission
 */
export async function assertCanView(userId: string, symbol: string): Promise<void> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('can_view_stock', {
      check_user_id: userId,
      stock_symbol: symbol
    })

    if (error) {
      console.error('Database error in assertCanView:', error)
      throw new Error('Failed to verify permissions')
    }

    if (!data) {
      throw new Error(`Forbidden: You do not have permission to view ${symbol}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Forbidden: Permission check failed')
  }
}

/**
 * Server-side role check - throws error if user doesn't have required role
 * @param userId - The user's ID
 * @param requiredRole - The required role
 * @throws Error if the user doesn't have the required role
 */
export async function assertRole(userId: string, requiredRole: UserRole): Promise<void> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Database error in assertRole:', error)
      throw new Error('Failed to verify role')
    }

    if (!data || data.role !== requiredRole) {
      throw new Error(`Forbidden: ${requiredRole} role required`)
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Forbidden: Role check failed')
  }
}

/**
 * Server-side check to verify if user is an admin
 * @param userId - The user's ID
 * @throws Error if the user is not an admin
 */
export async function assertAdmin(userId: string): Promise<void> {
  await assertRole(userId, 'admin')
}

/**
 * Get user's role on the server side
 * @param userId - The user's ID
 * @returns The user's role or null if not found
 */
export async function getServerUserRole(userId: string): Promise<UserRole | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[Server Permissions] Error fetching user role:', error)
      return null
    }

    if (!data) {
      console.log('[Server Permissions] No role found for user:', userId)
      return null
    }

    console.log('[Server Permissions] User role found:', data.role)
    return data.role as UserRole
  } catch (error) {
    console.error('[Server Permissions] Exception in getServerUserRole:', error)
    return null
  }
}

/**
 * Get all symbols a user can view (server-side)
 * @param userId - The user's ID
 * @returns Array of stock symbols the user can view
 */
export async function getServerAllowedSymbols(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    // Check if admin first - admins have access to all symbols
    const role = await getServerUserRole(userId)
    if (role === 'admin') {
      return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'SOLUSDT', 'XRPUSDT']
    }

    // Get explicit permissions for non-admin users
    const { data, error } = await supabase
      .from('stock_permissions')
      .select('symbol')
      .eq('user_id', userId)
      .eq('can_view', true)

    if (error) {
      console.error('Error fetching user permissions:', error)
      return []
    }

    if (!data || data.length === 0) return []
    return data.map(row => row.symbol)
  } catch (error) {
    console.error('Exception in getServerAllowedSymbols:', error)
    return []
  }
}

/**
 * Server-side check if user can view a symbol (returns boolean instead of throwing)
 * @param userId - The user's ID
 * @param symbol - The stock symbol to check
 * @returns true if the user can view the symbol, false otherwise
 */
export async function canViewSymbolServer(userId: string, symbol: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('can_view_stock', {
      check_user_id: userId,
      stock_symbol: symbol
    })

    if (error) {
      console.error('Error checking symbol permission:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Exception in canViewSymbolServer:', error)
    return false
  }
}

/**
 * Verify user has at least one of the required roles
 * @param userId - The user's ID
 * @param allowedRoles - Array of allowed roles
 * @returns true if user has one of the allowed roles, false otherwise
 */
export async function hasAnyRole(userId: string, allowedRoles: UserRole[]): Promise<boolean> {
  try {
    const role = await getServerUserRole(userId)
    if (!role) return false
    return allowedRoles.includes(role)
  } catch (error) {
    console.error('Exception in hasAnyRole:', error)
    return false
  }
}

/**
 * Assert user has at least one of the required roles
 * @param userId - The user's ID
 * @param allowedRoles - Array of allowed roles
 * @throws Error if user doesn't have any of the allowed roles
 */
export async function assertAnyRole(userId: string, allowedRoles: UserRole[]): Promise<void> {
  const hasPermission = await hasAnyRole(userId, allowedRoles)
  if (!hasPermission) {
    throw new Error(`Forbidden: One of these roles required: ${allowedRoles.join(', ')}`)
  }
}

/**
 * Check if a user can manage other users (traders and admins) - server-side
 * @param userId - The user's ID
 * @returns true if the user is a trader or admin
 */
export async function canManageUsers(userId: string): Promise<boolean> {
  try {
    const role = await getServerUserRole(userId)
    return role === 'trader' || role === 'admin'
  } catch (error) {
    console.error('[Server Permissions] Exception in canManageUsers:', error)
    return false
  }
}

/**
 * Check if a user can add new stocks to the master list (admins only) - server-side
 * @param userId - The user's ID
 * @returns true if the user is an admin
 */
export async function canAddStocks(userId: string): Promise<boolean> {
  try {
    const role = await getServerUserRole(userId)
    console.log('[Server Permissions] canAddStocks - user role:', role)
    return role === 'admin'
  } catch (error) {
    console.error('[Server Permissions] Exception in canAddStocks:', error)
    return false
  }
}
