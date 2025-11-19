'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAllowedSymbols } from '@/hooks/usePermissions'

export default function DashboardPage() {
  const { symbols: allowedSymbols, loading: permLoading } = useAllowedSymbols()
  const { prices, status, error, reconnect } = useWebSocket(allowedSymbols)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Stock Monitor Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time cryptocurrency price tracking</p>
          </div>

          {/* WebSocket Status */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  status === 'connected' ? 'bg-green-500 animate-pulse' :
                  status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  status === 'error' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
                <span className="text-sm font-medium text-gray-700">
                  {status === 'connected' ? 'Connected to Binance WebSocket' :
                   status === 'connecting' ? 'Connecting to Binance...' :
                   status === 'error' ? `Connection Error: ${error?.message || 'Unknown error'}` :
                   'Disconnected'}
                </span>
              </div>
              {status === 'error' && (
                <button
                  onClick={reconnect}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Retry Connection
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {permLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading permissions...</p>
              </div>
            </div>
          ) : allowedSymbols.length === 0 ? (
            /* No Permissions */
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Stock Access</h2>
              <p className="text-gray-600">You don't have permission to view any stocks. Please contact an administrator.</p>
            </div>
          ) : (
            /* Stock Price Cards */
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {allowedSymbols.length} symbol{allowedSymbols.length !== 1 ? 's' : ''}
                {status === 'connected' && prices.size > 0 && ` • ${prices.size} live`}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allowedSymbols.map(symbol => {
                  const ticker = prices.get(symbol)
                  const isPositive = ticker ? parseFloat(ticker.priceChange) >= 0 : null

                  return (
                    <div
                      key={symbol}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                      {/* Symbol Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-lg font-bold text-gray-900">
                          {symbol}
                        </div>
                        {ticker && (
                          <div className={`flex items-center px-2 py-1 rounded text-xs font-semibold ${
                            isPositive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isPositive ? '▲' : '▼'} {ticker.priceChangePercent}%
                          </div>
                        )}
                      </div>

                      {/* Price Display */}
                      {ticker ? (
                        <>
                          <div className="mb-4">
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                              ${parseFloat(ticker.price).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 8
                              })}
                            </div>
                            <div className={`text-sm font-medium ${
                              isPositive ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isPositive ? '+' : ''}{ticker.priceChange} (24h)
                            </div>
                          </div>

                          {/* Timestamp */}
                          <div className="text-xs text-gray-400 border-t pt-2">
                            Last update: {new Date(ticker.lastUpdate).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        /* Loading State for Individual Card */
                        <div className="animate-pulse">
                          <div className="h-10 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
