'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useHasAnyRole } from '@/hooks/usePermissions'

interface User {
  id: string
  email: string
  role: string
  permissions: string[]
}

interface Stock {
  id: string
  symbol: string
  name: string
}

export default function ManageViewersPage() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const { hasAnyRole: canManage, loading: roleLoading } = useHasAnyRole(['trader', 'admin'])
  const [hasCheckedPermissions, setHasCheckedPermissions] = useState(false)

  const [users, setUsers] = useState<User[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    // Wait until role is fully loaded before making redirect decisions
    if (roleLoading) return

    // Mark that we've finished checking permissions (wait one render cycle)
    if (!hasCheckedPermissions) {
      setHasCheckedPermissions(true)
      return
    }

    // If no user, don't redirect (auth middleware will handle this)
    if (!currentUser) return

    // Only redirect if user is authenticated but doesn't have permission
    if (!canManage) {
      router.push('/dashboard')
    }
  }, [canManage, roleLoading, currentUser, router, hasCheckedPermissions])

  useEffect(() => {
    if (canManage) {
      fetchData()
    }
  }, [canManage])

  const fetchData = async () => {
    setLoading(true)

    try {
      // Fetch users
      const usersRes = await fetch('/api/users')
      const usersData = await usersRes.json()

      // Filter to only show viewers
      const viewers = (usersData.users || []).filter((u: User) => u.role === 'viewer')
      setUsers(viewers)

      // Initialize selected permissions
      const initialPermissions: Record<string, string[]> = {}
      viewers.forEach((user: User) => {
        initialPermissions[user.id] = user.permissions
      })
      setSelectedPermissions(initialPermissions)

      // Fetch stocks
      const stocksRes = await fetch('/api/stocks')
      const stocksData = await stocksRes.json()
      setStocks(stocksData.stocks || [])
    } catch (error) {
      console.error('[ManageViewers] Error fetching data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermission = (userId: string, symbol: string) => {
    setSelectedPermissions(prev => {
      const userPermissions = prev[userId] || []
      const hasPermission = userPermissions.includes(symbol)

      return {
        ...prev,
        [userId]: hasPermission
          ? userPermissions.filter(s => s !== symbol)
          : [...userPermissions, symbol]
      }
    })
  }

  const handleSave = async (userId: string) => {
    setSaving(userId)
    setMessage(null)

    try {
      const symbols = selectedPermissions[userId] || []

      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update permissions')
      }

      setMessage({ type: 'success', text: 'Permissions updated successfully' })

      // Refresh data
      await fetchData()
    } catch (error: any) {
      console.error('[ManageViewers] Error saving permissions:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save permissions' })
    } finally {
      setSaving(null)
    }
  }

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!canManage) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Viewer Permissions</h1>
              <p className="text-gray-600 mt-1">Grant or revoke stock access for viewer users</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Viewers List */}
        {users.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No viewer users found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="bg-white rounded-lg shadow-md">
                {/* User Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{user.email}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPermissions[user.id]?.length > 0 ? (
                          selectedPermissions[user.id].map(symbol => (
                            <span key={symbol} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              {symbol}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No permissions assigned</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                      className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {expandedUser === user.id ? 'Close' : 'Edit Permissions'}
                    </button>
                  </div>
                </div>

                {/* Expanded Permissions Editor */}
                {expandedUser === user.id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-4">Select stocks for {user.email}:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {stocks.map(stock => {
                        const isSelected = selectedPermissions[user.id]?.includes(stock.symbol) || false

                        return (
                          <label
                            key={stock.id}
                            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePermission(user.id, stock.symbol)}
                              className="mr-3 h-4 w-4"
                            />
                            <div>
                              <div className="font-medium text-gray-900">{stock.name}</div>
                              <div className="text-xs text-gray-500">{stock.symbol}</div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSave(user.id)}
                        disabled={saving === user.id}
                        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving === user.id ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setExpandedUser(null)}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
