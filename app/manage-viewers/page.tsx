'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/usePermissions'

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
  const { role, loading: roleLoading } = useUserRole()

  const [users, setUsers] = useState<User[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({})
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter users by email search term
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    // Wait until role is fully loaded
    if (roleLoading || !role) return

    // Don't redirect if no user (auth middleware handles)
    if (!currentUser) return

    // Only admins and traders can access this page
    if (role !== 'admin' && role !== 'trader') {
      router.push('/dashboard')
    }
  }, [role, roleLoading, currentUser, router])

  useEffect(() => {
    if (role === 'admin' || role === 'trader') {
      fetchData()
    }
  }, [role])

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchData = async () => {
    setLoading(true)

    try {
      // Fetch users
      const usersRes = await fetch('/api/users')

      // Check if response is JSON
      const usersContentType = usersRes.headers.get('content-type')
      if (!usersContentType || !usersContentType.includes('application/json')) {
        const text = await usersRes.text()
        console.error('[ManageViewers] Non-JSON response from /api/users:', text.substring(0, 200))
        throw new Error('Failed to fetch users - server error')
      }

      const usersData = await usersRes.json()

      // Filter to show viewers and traders (not admins)
      const nonAdminUsers = (usersData.data?.users || []).filter((u: User) => u.role !== 'admin')
      setUsers(nonAdminUsers)

      // Initialize selected permissions and roles
      const initialPermissions: Record<string, string[]> = {}
      const initialRoles: Record<string, string> = {}
      nonAdminUsers.forEach((user: User) => {
        initialPermissions[user.id] = user.permissions
        initialRoles[user.id] = user.role
      })
      setSelectedPermissions(initialPermissions)
      setSelectedRoles(initialRoles)

      // Fetch stocks
      const stocksRes = await fetch('/api/stocks')

      // Check if response is JSON
      const stocksContentType = stocksRes.headers.get('content-type')
      if (!stocksContentType || !stocksContentType.includes('application/json')) {
        const text = await stocksRes.text()
        console.error('[ManageViewers] Non-JSON response from /api/stocks:', text.substring(0, 200))
        throw new Error('Failed to fetch stocks - server error')
      }

      const stocksData = await stocksRes.json()
      setStocks(stocksData.data?.stocks || [])
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

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId)
    setMessage(null)

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text()
        console.error('[ManageViewers] Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an invalid response. Please check the console for details.')
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update role')
      }

      setMessage({ type: 'success', text: data.message || 'Role updated successfully' })

      // Update local state
      setSelectedRoles(prev => ({
        ...prev,
        [userId]: newRole
      }))

      // Refresh data to get updated permissions
      await fetchData()
    } catch (error: any) {
      console.error('[ManageViewers] Error changing role:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to change role' })
    } finally {
      setChangingRole(null)
    }
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

      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text()
        console.error('[ManageViewers] Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an invalid response. Please check the console for details.')
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update permissions')
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

  if (role !== 'admin' && role !== 'trader') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
              <p className="text-gray-600 mt-1">Manage user roles and stock permissions</p>
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

        {/* Messages - Fixed at top */}
        {message && (
          <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4 p-4 rounded-lg shadow-lg flex items-center justify-between ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-4 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Dismiss message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">{searchTerm ? 'No users match your search' : 'No users found'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map(user => (
              <div key={user.id} className="bg-white rounded-lg shadow-md">
                {/* User Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{user.email}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            (selectedRoles[user.id] || user.role) === 'trader'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {(selectedRoles[user.id] || user.role).toUpperCase()}
                          </span>
                          <div className="relative">
                            <select
                              value={selectedRoles[user.id] || user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={
                                changingRole === user.id ||
                                (role === 'trader' && (selectedRoles[user.id] || user.role) === 'trader')
                              }
                              className="appearance-none bg-white text-gray-900 font-medium px-3 py-1.5 pr-8 text-sm border-2 border-gray-300 rounded-md shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 transition-colors cursor-pointer"
                              title={role === 'trader' && (selectedRoles[user.id] || user.role) === 'trader' ? 'Traders cannot modify other traders' : ''}
                            >
                              <option value="viewer" className="bg-white text-gray-900">Viewer</option>
                              <option value="trader" className="bg-white text-gray-900">Trader</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {changingRole === user.id && (
                              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                                <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(selectedRoles[user.id] || user.role) === 'viewer' ? (
                          selectedPermissions[user.id]?.length > 0 ? (
                            selectedPermissions[user.id].map(symbol => (
                              <span key={symbol} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {symbol}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No stock permissions assigned</span>
                          )
                        ) : (
                          <span className="text-sm text-gray-600">Has access to all stocks</span>
                        )}
                      </div>
                    </div>
                    {(selectedRoles[user.id] || user.role) === 'viewer' && (
                      <button
                        onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        {expandedUser === user.id ? 'Close' : 'Edit Permissions'}
                      </button>
                    )}
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
