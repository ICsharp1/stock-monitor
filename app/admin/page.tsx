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
  const [deleting, setDeleting] = useState<string | null>(null)

  // Stock Search
  const [stockSearchTerm, setStockSearchTerm] = useState('')

  // Filter stocks by search term (symbol or name)
  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(stockSearchTerm.toLowerCase())
  )

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

  // Clear message when switching tabs
  useEffect(() => {
    setMessage(null)
  }, [activeTab])

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stocks')
      const data = await res.json()
      setStocks(data.data?.stocks || [])
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

      const stockSymbol = data.data?.stock?.symbol || symbol
      setMessage({ type: 'success', text: `Stock ${stockSymbol} added successfully!` })
      setSymbol('')
      setName('')
      await fetchStocks()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteStock = async (stockId: string, stockSymbol: string) => {
    if (!confirm(`Are you sure you want to delete ${stockSymbol}? This will remove it from all users' permissions.`)) {
      return
    }

    setDeleting(stockId)
    setMessage(null)

    try {
      const res = await fetch(`/api/stocks/${stockId}`, {
        method: 'DELETE'
      })

      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response')
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete stock')
      }

      setMessage({ type: 'success', text: `Stock ${stockSymbol} deleted successfully!` })
      await fetchStocks()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setDeleting(null)
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

          <div className="p-6">

            {/* Add Stock Tab */}
            {activeTab === 'add-stock' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Stock to Master List</h2>
                <p className="text-gray-600 mb-6">
                  Enter the complete trading pair symbol and it will be validated with Binance. Supports any pair (USDT, BTC, EUR, etc.).
                </p>

                <form onSubmit={handleAddStock} className="max-w-md space-y-4">
                  <div>
                    <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                      Trading Pair Symbol
                    </label>
                    <input
                      id="symbol"
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="BTCUSDT"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Examples: BTCUSDT, ETHBTC, BNBEUR</p>
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

                {/* Stock Search */}
                <div className="mb-6">
                  <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by symbol or name..."
                      value={stockSearchTerm}
                      onChange={(e) => setStockSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                    {stockSearchTerm && (
                      <button
                        onClick={() => setStockSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 mt-2 text-sm">
                    {stockSearchTerm
                      ? `Showing ${filteredStocks.length} of ${stocks.length} stocks`
                      : `Total: ${stocks.length} stocks`}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStocks.map(stock => (
                    <div key={stock.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900">{stock.name}</div>
                          <div className="text-sm text-gray-600">{stock.symbol}</div>
                          <div className="text-xs text-gray-400 mt-2">
                            Added: {new Date(stock.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteStock(stock.id, stock.symbol)}
                          disabled={deleting === stock.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete stock"
                        >
                          {deleting === stock.id ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
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
