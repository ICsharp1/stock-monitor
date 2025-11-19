'use client'

import { useHasAnyRole } from '@/hooks/usePermissions'
import type { UserRole } from '@/types/permissions'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
}

/**
 * Component to restrict content based on user role
 * Shows fallback UI if user doesn't have one of the allowed roles
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback,
  loadingComponent
}: RoleGuardProps) {
  const { hasAnyRole, loading } = useHasAnyRole(allowedRoles)

  if (loading) {
    return loadingComponent || (
      <div className="animate-pulse p-4 bg-gray-100 rounded-lg">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      </div>
    )
  }

  if (!hasAnyRole) {
    return fallback || (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 mr-2 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="font-semibold">Access Denied</h3>
            <p className="text-sm mt-1">
              You don't have the required permissions to view this content.
              {allowedRoles.length === 1 ? (
                <> Required role: <strong>{allowedRoles[0]}</strong></>
              ) : (
                <> Required roles: <strong>{allowedRoles.join(', ')}</strong></>
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
