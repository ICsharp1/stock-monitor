'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { getUserRole, getUserAllowedSymbols, canViewSymbol } from '@/lib/permissions'
import type { UserRole, RoleCheck, AllowedSymbols, PermissionCheck } from '@/types/permissions'

/**
 * Hook to get the current user's role
 * @returns Object with role and loading state
 */
export function useUserRole(): RoleCheck {
  const { user } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    let mounted = true

    const fetchRole = async () => {
      try {
        const userRole = await getUserRole(user.id)
        if (mounted) {
          setRole(userRole)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        if (mounted) {
          setRole(null)
          setLoading(false)
        }
      }
    }

    fetchRole()

    return () => {
      mounted = false
    }
  }, [user])

  return { role, loading }
}

/**
 * Hook to get all stock symbols the current user can view
 * @returns Object with symbols array and loading state
 */
export function useAllowedSymbols(): AllowedSymbols {
  const { user } = useAuth()
  const [symbols, setSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSymbols([])
      setLoading(false)
      return
    }

    let mounted = true

    const fetchSymbols = async () => {
      try {
        const allowedSymbols = await getUserAllowedSymbols(user.id)
        if (mounted) {
          setSymbols(allowedSymbols)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching allowed symbols:', error)
        if (mounted) {
          setSymbols([])
          setLoading(false)
        }
      }
    }

    fetchSymbols()

    return () => {
      mounted = false
    }
  }, [user])

  return { symbols, loading }
}

/**
 * Hook to check if the current user can view a specific stock symbol
 * @param symbol - The stock symbol to check
 * @returns Object with canView boolean and loading state
 */
export function useCanViewSymbol(symbol: string): PermissionCheck {
  const { user } = useAuth()
  const [canView, setCanView] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setCanView(false)
      setLoading(false)
      return
    }

    let mounted = true

    const checkPermission = async () => {
      try {
        const hasPermission = await canViewSymbol(user.id, symbol)
        if (mounted) {
          setCanView(hasPermission)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error checking symbol permission:', error)
        if (mounted) {
          setCanView(false)
          setLoading(false)
        }
      }
    }

    checkPermission()

    return () => {
      mounted = false
    }
  }, [user, symbol])

  return { canView, loading }
}

/**
 * Alternative hook that uses the allowed symbols list for better performance
 * Use this when checking multiple symbols or when the allowed symbols are already loaded
 * @param symbol - The stock symbol to check
 * @returns Object with canView boolean and loading state
 */
export function useCanView(symbol: string): PermissionCheck {
  const { symbols, loading } = useAllowedSymbols()

  return {
    canView: symbols.includes(symbol),
    loading
  }
}

/**
 * Hook to check if the current user has a specific role
 * @param requiredRole - The role to check for
 * @returns Object with hasRole boolean and loading state
 */
export function useHasRole(requiredRole: UserRole): { hasRole: boolean; loading: boolean } {
  const { role, loading } = useUserRole()

  return {
    hasRole: role === requiredRole,
    loading
  }
}

/**
 * Hook to check if the current user is an admin
 * @returns Object with isAdmin boolean and loading state
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { role, loading } = useUserRole()

  return {
    isAdmin: role === 'admin',
    loading
  }
}

/**
 * Hook to check if the current user has any of the specified roles
 * @param allowedRoles - Array of allowed roles
 * @returns Object with hasAnyRole boolean and loading state
 */
export function useHasAnyRole(allowedRoles: UserRole[]): { hasAnyRole: boolean; loading: boolean } {
  const { role, loading } = useUserRole()

  return {
    hasAnyRole: role ? allowedRoles.includes(role) : false,
    loading
  }
}
