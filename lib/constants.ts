// Application constants

// Crypto symbols to monitor (Binance format: BTCUSDT)
export const AVAILABLE_SYMBOLS = [
  'BTCUSDT',  // Bitcoin
  'ETHUSDT',  // Ethereum
  'BNBUSDT',  // Binance Coin
  'SOLUSDT',  // Solana
  'ADAUSDT',  // Cardano
  'XRPUSDT',  // Ripple
  'DOGEUSDT', // Dogecoin
] as const

export type SymbolType = typeof AVAILABLE_SYMBOLS[number]

// Binance WebSocket endpoint
export const BINANCE_WS_URL = 'wss://stream.binance.com:9443/stream'

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  TRADER: 'trader',
  VIEWER: 'viewer',
} as const

// Default permissions by role
export const DEFAULT_PERMISSIONS = {
  admin: AVAILABLE_SYMBOLS, // All symbols
  trader: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'], // 4 symbols
  viewer: ['BTCUSDT', 'ETHUSDT'], // 2 symbols
} as const

// WebSocket reconnection settings
export const WS_RECONNECT = {
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 30000, // 30 seconds
  BACKOFF_MULTIPLIER: 2,
} as const
