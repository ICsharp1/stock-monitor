'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { ConnectionStatus, TickerData } from '@/types'

/**
 * Binance WebSocket message format
 * Docs: https://binance-docs.github.io/apidocs/spot/en/#individual-symbol-ticker-streams
 */
interface BinanceTickerMessage {
  stream: string
  data: {
    s: string   // symbol (e.g., "BTCUSDT")
    c: string   // current price
    p: string   // 24h price change
    P: string   // 24h price change percent
    E: number   // event time (timestamp)
  }
}

/**
 * Production-ready WebSocket hook for Binance real-time crypto prices
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Proper cleanup on unmount
 * - Multi-symbol support
 * - Type-safe with full TypeScript support
 * - Connection state management
 * - Error handling for malformed messages
 *
 * @param symbols - Array of crypto symbols to track (e.g., ['BTCUSDT', 'ETHUSDT'])
 * @returns Object with prices Map, connection status, errors, and manual reconnect function
 *
 * @example
 * ```tsx
 * const { prices, status, error, reconnect } = useWebSocket(['BTCUSDT', 'ETHUSDT'])
 *
 * if (status === 'connected') {
 *   const btcPrice = prices.get('BTCUSDT')
 *   console.log(`BTC Price: $${btcPrice?.price}`)
 * }
 * ```
 */
export function useWebSocket(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, TickerData>>(new Map())
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const mountedRef = useRef(true)

  // Configuration constants
  const MAX_RECONNECT_DELAY = 30000 // 30 seconds
  const BASE_DELAY = 1000 // 1 second

  /**
   * Calculate exponential backoff delay for reconnection attempts
   * Formula: min(baseDelay * 2^attempts, maxDelay)
   * Sequence: 1s, 2s, 4s, 8s, 16s, 30s (capped)
   */
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY
    )
    return delay
  }, [])

  /**
   * Build Binance WebSocket URL for multiple ticker streams
   * Format: wss://stream.binance.com:9443/stream?streams=symbol1@ticker/symbol2@ticker
   */
  const buildWebSocketUrl = useCallback((symbolList: string[]) => {
    const streams = symbolList
      .map(symbol => `${symbol.toLowerCase()}@ticker`)
      .join('/')
    return `wss://stream.binance.com:9443/stream?streams=${streams}`
  }, [])

  /**
   * Establish WebSocket connection to Binance
   * Handles connection lifecycle, message parsing, and error recovery
   */
  const connect = useCallback(() => {
    // Prevent connection if already open or component unmounted
    if (wsRef.current?.readyState === WebSocket.OPEN || !mountedRef.current) {
      return
    }

    // Don't connect if no symbols provided
    if (symbols.length === 0) {
      console.warn('useWebSocket: No symbols provided, skipping connection')
      return
    }

    setStatus('connecting')
    setError(null)

    const url = buildWebSocketUrl(symbols)
    console.log(`[WebSocket] Connecting to: ${url}`)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      // Connection successfully opened
      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close()
          return
        }

        console.log('[WebSocket] Connected successfully')
        setStatus('connected')
        reconnectAttemptsRef.current = 0 // Reset backoff counter on success
      }

      // Received message from Binance
      ws.onmessage = (event) => {
        if (!mountedRef.current) return

        try {
          const message: BinanceTickerMessage = JSON.parse(event.data)

          // Validate message structure
          if (!message.data || typeof message.data !== 'object') {
            console.warn('[WebSocket] Invalid message format:', message)
            return
          }

          const { s, c, p, P, E } = message.data

          // Validate required fields
          if (!s || !c || !p || !P || !E) {
            console.warn('[WebSocket] Missing required fields in message:', message.data)
            return
          }

          const ticker: TickerData = {
            symbol: s,
            price: c,
            priceChange: p,
            priceChangePercent: P,
            lastUpdate: E
          }

          // Update prices map immutably
          setPrices(prev => {
            const next = new Map(prev)
            next.set(ticker.symbol, ticker)
            return next
          })
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err)
          // Don't set error state for parse errors - continue receiving messages
        }
      }

      // WebSocket error occurred
      ws.onerror = (event) => {
        if (!mountedRef.current) return

        console.error('[WebSocket] Connection error:', event)
        const wsError = new Error('WebSocket connection error')
        setError(wsError)
        setStatus('error')
      }

      // Connection closed (intentional or due to error)
      ws.onclose = (event) => {
        if (!mountedRef.current) return

        console.log(`[WebSocket] Connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`)
        setStatus('disconnected')

        // Attempt automatic reconnection with exponential backoff
        const delay = getReconnectDelay()
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})...`)

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return

          reconnectAttemptsRef.current++
          connect()
        }, delay)
      }
    } catch (err) {
      console.error('[WebSocket] Failed to create WebSocket instance:', err)
      const wsError = err instanceof Error ? err : new Error('Unknown WebSocket error')
      setError(wsError)
      setStatus('error')
    }
  }, [symbols, buildWebSocketUrl, getReconnectDelay])

  /**
   * Manually trigger reconnection
   * Closes existing connection and starts fresh with reset backoff
   */
  const reconnect = useCallback(() => {
    console.log('[WebSocket] Manual reconnect triggered')

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close existing connection if open
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Reset backoff and reconnect
    reconnectAttemptsRef.current = 0
    setError(null)
    connect()
  }, [connect])

  /**
   * Effect: Establish initial connection and handle cleanup
   * Reconnects when symbol list changes
   */
  useEffect(() => {
    mountedRef.current = true

    // Skip if no symbols
    if (symbols.length === 0) {
      console.warn('[WebSocket] No symbols provided, skipping connection')
      return
    }

    console.log('[WebSocket] Initializing connection for symbols:', symbols)
    connect()

    // Cleanup function
    return () => {
      console.log('[WebSocket] Cleaning up connection')
      mountedRef.current = false

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [symbols, connect])

  return {
    prices,
    status,
    error,
    reconnect
  }
}
