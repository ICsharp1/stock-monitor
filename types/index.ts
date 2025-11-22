// Core application types

export interface User {
  id: string
  email: string
  role: 'admin' | 'trader' | 'viewer'
  created_at: string
}

export interface StockPermission {
  user_id: string
  symbol: string
  can_view: boolean
  created_at: string
}

export type UserRole = 'admin' | 'trader' | 'viewer'

// WebSocket types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface TickerData {
  symbol: string
  price: string
  priceChange: string
  priceChangePercent: string
  lastUpdate: number
}

// Auth types
export interface AuthState {
  user: User | null
  loading: boolean
}

// Export API types
export * from './api'
