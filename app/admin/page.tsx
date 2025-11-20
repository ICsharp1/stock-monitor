'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/usePermissions'

interface Stock {
  id: string
  symbol: string
  name: string
  created_at: string
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { role, loading: roleLoading } = useUserRole()

  const [activeTab, setActiveTab] = useState<'add-stock' | 'view-stocks' | 'manage-viewers'>('add-stock')
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Add Stock Form
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    // CRITICAL: Don't do anything while loading OR if role hasn't been determined yet
    if (roleLoading || !role) {
      console.log('[Admin Page] Waiting for role...', { roleLoading, role })
      return
    }

    // Don't redirect if no user (auth middleware handles)
    if (!user) {
      console.log('[Admin Page] No user, not redirecting')
      return
    }

    // Now we KNOW the role - only redirect if NOT admin
    if (role !== 'admin') {
      console.log('[Admin Page] User role is', role, '(not admin) - redirecting to dashboard')
      router.push('/dashboard')
    } else {
      console.log('[Admin Page] User is admin - staying on page')
    }
  }, [role, roleLoading, user, router])

  useEffect(() => {
    if (role === 'admin') {
      fetchStocks()
    }
  }, [role])

  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stocks')
      const data = await res.json()
      setStocks(data.stocks || [])
    } catch (error) {
      console.error('[Admin] Error fetching stocks:', error)
    }
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setMessage(null)

    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, name })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add stock')
      }

      setMessage({ type: 'success', text: `Stock ${data.stock.symbol} added successfully!` })
      setSymbol('')
      setName('')
      await fetchStocks()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setAdding(false)
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

  if (roleLoading || !role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-1">Manage stocks and user permissions</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('add-stock')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'add-stock'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Add New Stock
              </button>
              <button
                onClick={() => setActiveTab('view-stocks')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'view-stocks'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                View All Stocks
              </button>
              <button
                onClick={() => router.push('/manage-viewers')}
                className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Manage Viewers →
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Messages */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Add Stock Tab */}
            {activeTab === 'add-stock' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Stock to Master List</h2>
                <p className="text-gray-600 mb-6">
                  Enter the crypto symbol (e.g., "LINK") and it will be validated with Binance. All stocks are automatically paired with USDT.
                </p>

                <form onSubmit={handleAddStock} className="max-w-md space-y-4">
                  <div>
                    <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                      Crypto Symbol (without USDT)
                    </label>
                    <input
                      id="symbol"
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="LINK"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Example: LINK → Will become LINKUSDT</p>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Chainlink"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adding}
                    className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {adding ? 'Adding & Validating...' : 'Add Stock to List'}
                  </button>
                </form>
              </div>
            )}

            {/* View Stocks Tab */}
            {activeTab === 'view-stocks' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">All Stocks in Master List</h2>
                <p className="text-gray-600 mb-6">
                  Total: {stocks.length} stocks
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stocks.map(stock => (
                    <div key={stock.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="font-semibold text-gray-900">{stock.name}</div>
                      <div className="text-sm text-gray-600">{stock.symbol}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        Added: {new Date(stock.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
