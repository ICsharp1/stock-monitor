import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/permissions'

/**
 * Get the role of a user
 * @param userId - The user's ID
 * @returns The user's role or null if not found
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    // maybeSingle() returns null for no rows instead of throwing an error
    if (error) {
      console.error('Error fetching user role:', error)
      return null
    }

    if (!data) return null
    return data.role as UserRole
  } catch (error) {
    console.error('Exception in getUserRole:', error)
    return null
  }
}

/**
 * Get all stock symbols a user is allowed to view
 * @param userId - The user's ID
 * @returns Array of stock symbols the user can view
 */
export async function getUserAllowedSymbols(userId: string): Promise<string[]> {
  try {
    const supabase = createClient()

    console.log('[Permissions] Fetching symbols for user:', userId)

    // Check user role
    const role = await getUserRole(userId)
    console.log('[Permissions] User role:', role)

    // Admins and traders can see ALL stocks from the master list
    if (role === 'admin' || role === 'trader') {
      try {
        // Fetch stocks via API route to ensure proper authentication
        const response = await fetch('/api/stocks')
        if (!response.ok) {
          console.error('[Permissions] Error fetching stocks from API:', response.status)
          return []
        }

        const { stocks } = await response.json()
        const symbols = stocks ? stocks.map((s: any) => s.symbol) : []
        console.log(`[Permissions] ${role} user - returning all symbols from stocks table:`, symbols)
        return symbols
      } catch (err) {
        console.error('[Permissions] Exception fetching stocks:', err)
        return []
      }
    }

    // Viewers get explicit permissions only
    const { data, error } = await supabase
      .from('stock_permissions')
      .select('symbol')
      .eq('user_id', userId)
      .eq('can_view', true)

    if (error) {
      console.error('Error fetching user permissions:', error)
      return []
    }

    const symbols = data && data.length > 0 ? data.map(row => row.symbol) : []
    console.log('[Permissions] Viewer symbols:', symbols)
    return symbols
  } catch (error) {
    console.error('Exception in getUserAllowedSymbols:', error)
    return []
  }
}

/**
 * Check if a user can view a specific stock symbol
 * Uses the database function can_view_stock for consistent permission checking
 * @param userId - The user's ID
 * @param symbol - The stock symbol to check
 * @returns true if the user can view the symbol, false otherwise
 */
export async function canViewSymbol(userId: string, symbol: string): Promise<boolean> {
  try {
    const supabase = createClient()

    // Use the Supabase database function for permission checking
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
    console.error('Exception in canViewSymbol:', error)
    return false
  }
}

/**
 * Check if a user has a specific role
 * @param userId - The user's ID
 * @param requiredRole - The role to check for
 * @returns true if the user has the required role, false otherwise
 */
export async function hasRole(userId: string, requiredRole: UserRole): Promise<boolean> {
  try {
    const role = await getUserRole(userId)
    return role === requiredRole
  } catch (error) {
    console.error('Exception in hasRole:', error)
    return false
  }
}

/**
 * Check if a user is an admin
 * @param userId - The user's ID
 * @returns true if the user is an admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, 'admin')
}

/**
 * Batch check permissions for multiple symbols
 * @param userId - The user's ID
 * @param symbols - Array of stock symbols to check
 * @returns Object mapping symbols to their permission status
 */
export async function checkMultipleSymbols(
  userId: string,
  symbols: string[]
): Promise<Record<string, boolean>> {
  try {
    const allowedSymbols = await getUserAllowedSymbols(userId)
    const result: Record<string, boolean> = {}

    for (const symbol of symbols) {
      result[symbol] = allowedSymbols.includes(symbol)
    }

    return result
  } catch (error) {
    console.error('Exception in checkMultipleSymbols:', error)
    return {}
  }
}

/**
 * Check if a user can manage other users (traders and admins)
 * @param userId - The user's ID
 * @returns true if the user is a trader or admin
 */
export async function canManageUsers(userId: string): Promise<boolean> {
  try {
    const role = await getUserRole(userId)
    return role === 'trader' || role === 'admin'
  } catch (error) {
    console.error('Exception in canManageUsers:', error)
    return false
  }
}

/**
 * Check if a user can add new stocks to the master list (admins only)
 * @param userId - The user's ID
 * @returns true if the user is an admin
 */
export async function canAddStocks(userId: string): Promise<boolean> {
  try {
    const role = await getUserRole(userId)
    return role === 'admin'
  } catch (error) {
    console.error('Exception in canAddStocks:', error)
    return false
  }
}
