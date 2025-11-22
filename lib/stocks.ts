import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'

export interface Stock {
  id: string
  symbol: string
  name: string
  created_at: string
}

/**
 * Normalize crypto symbol (uppercase and trim)
 * Supports any trading pair (USDT, BTC, EUR, etc.)
 * Examples:
 *   "btcusdt" -> "BTCUSDT"
 *   "ETHBTC" -> "ETHBTC"
 *   "  bnbeur  " -> "BNBEUR"
 */
export function normalizeSymbol(input: string): string {
  return input.toUpperCase().trim()
}

/**
 * Validate if a symbol exists on Binance
 * Uses Binance REST API to check if the trading pair exists
 */
export async function validateBinanceSymbol(symbol: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo')

    if (!response.ok) {
      console.error('[Stocks] Failed to fetch Binance exchange info:', response.status)
      return false
    }

    const data = await response.json()

    // Check if symbol exists in the symbols array
    const symbolExists = data.symbols?.some(
      (s: any) => s.symbol === symbol && s.status === 'TRADING'
    )

    return symbolExists
  } catch (error) {
    console.error('[Stocks] Error validating Binance symbol:', error)
    return false
  }
}

/**
 * Get all stocks from the master list
 */
export async function getAllStocks(): Promise<Stock[]> {
  try {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[Stocks] Error fetching stocks:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[Stocks] Exception in getAllStocks:', error)
    return []
  }
}

/**
 * Get stock symbols only (for use with WebSocket)
 */
export async function getAllStockSymbols(): Promise<string[]> {
  const stocks = await getAllStocks()
  return stocks.map(stock => stock.symbol)
}

/**
 * Check if a stock symbol already exists in the master list
 * Server-side only function - uses server Supabase client
 */
export async function stockExists(symbol: string): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('stocks')
      .select('symbol')
      .eq('symbol', symbol)
      .maybeSingle()

    if (error) {
      console.error('[Stocks] Error checking stock existence:', error)
      return false
    }

    return data !== null
  } catch (error) {
    console.error('[Stocks] Exception in stockExists:', error)
    return false
  }
}
