/**
 * Example usage of useWebSocket hook
 *
 * This file demonstrates how to use the WebSocket hook in a React component.
 * You can copy this code into your actual components.
 */

'use client'

import React from 'react'
import { useWebSocket } from './useWebSocket'

export default function PriceDisplay() {
  const { prices, status, error, reconnect } = useWebSocket([
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'ADAUSDT',
    'DOGEUSDT',
    'XRPUSDT'
  ])

  // Handle connecting state
  if (status === 'connecting') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse">Connecting to Binance WebSocket...</div>
      </div>
    )
  }

  // Handle error state
  if (status === 'error') {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="text-red-800 font-semibold mb-2">Connection Error</h3>
          <p className="text-red-600 text-sm mb-4">{error?.message}</p>
          <button
            onClick={reconnect}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  // Display connection status and prices
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Status Indicator */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm font-medium capitalize">{status}</span>
        </div>

        {status === 'disconnected' && (
          <button
            onClick={reconnect}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Price Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(prices.values()).map(ticker => {
          const isPositive = !ticker.priceChange.startsWith('-')
          const priceChangeNum = parseFloat(ticker.priceChange)
          const priceChangePercentNum = parseFloat(ticker.priceChangePercent)

          return (
            <div
              key={ticker.symbol}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition"
            >
              {/* Symbol */}
              <div className="text-lg font-bold text-gray-800 mb-2">
                {ticker.symbol.replace('USDT', '')}/USDT
              </div>

              {/* Current Price */}
              <div className="text-2xl font-semibold text-gray-900 mb-2">
                ${parseFloat(ticker.price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>

              {/* Price Change */}
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`font-semibold ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {priceChangeNum.toFixed(2)}
                </span>

                <span
                  className={`px-2 py-1 rounded ${
                    isPositive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {priceChangePercentNum.toFixed(2)}%
                </span>
              </div>

              {/* Last Update */}
              <div className="text-xs text-gray-500 mt-2">
                Updated: {new Date(ticker.lastUpdate).toLocaleTimeString()}
              </div>
            </div>
          )
        })}
      </div>

      {/* No Data Message */}
      {prices.size === 0 && status === 'connected' && (
        <div className="text-center text-gray-500 py-8">
          Waiting for price data...
        </div>
      )}
    </div>
  )
}

/**
 * Advanced Example: Custom Symbol Selection
 */
export function CustomSymbolPriceDisplay() {
  const [selectedSymbols, setSelectedSymbols] = React.useState<string[]>([
    'BTCUSDT',
    'ETHUSDT'
  ])

  const { prices, status, error, reconnect } = useWebSocket(selectedSymbols)

  const addSymbol = (symbol: string) => {
    if (!selectedSymbols.includes(symbol)) {
      setSelectedSymbols([...selectedSymbols, symbol])
    }
  }

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol))
  }

  return (
    <div>
      {/* Symbol Selector */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Add symbol (e.g., SOLUSDT)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addSymbol(e.currentTarget.value.toUpperCase())
              e.currentTarget.value = ''
            }
          }}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* Price Display */}
      <div className="space-y-2">
        {Array.from(prices.values()).map(ticker => (
          <div key={ticker.symbol} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-bold">{ticker.symbol}</div>
              <div className="text-2xl">${ticker.price}</div>
            </div>
            <button
              onClick={() => removeSymbol(ticker.symbol)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="mt-4 text-sm text-gray-600">
        Status: {status}
        {error && <div className="text-red-600">{error.message}</div>}
      </div>
    </div>
  )
}
