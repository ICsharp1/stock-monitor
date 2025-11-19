'use client'

import { useCanView } from '@/hooks/usePermissions'

interface SymbolGuardProps {
  symbol: string
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
  showSymbol?: boolean
}

/**
 * Component to check if user has permission to view a specific stock symbol
 * Hides content if user doesn't have permission
 */
export function SymbolGuard({
  symbol,
  children,
  fallback,
  loadingComponent,
  showSymbol = true
}: SymbolGuardProps) {
  const { canView, loading } = useCanView(symbol)

  if (loading) {
    return loadingComponent || (
      <div className="animate-pulse p-4 bg-gray-100 rounded-lg">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      </div>
    )
  }

  if (!canView) {
    return fallback || (
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 mr-2 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="font-semibold">Restricted Content</h3>
            <p className="text-sm mt-1">
              You don't have permission to view{' '}
              {showSymbol ? (
                <>
                  <strong>{symbol}</strong>
                </>
              ) : (
                'this stock symbol'
              )}
              . Contact your administrator to request access.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
