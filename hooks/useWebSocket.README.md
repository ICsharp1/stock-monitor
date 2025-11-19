# useWebSocket Hook Documentation

A production-ready React hook for real-time cryptocurrency price streaming from Binance WebSocket API.

## Location

`C:\Users\israe\Downloads\FrontendThingy\stock-monitor\hooks\useWebSocket.ts`

## Features

- **Automatic Reconnection**: Exponential backoff strategy (1s → 2s → 4s → 8s → 16s → 30s max)
- **Connection State Management**: Track connecting, connected, disconnected, and error states
- **Multi-Symbol Support**: Subscribe to multiple cryptocurrency pairs simultaneously
- **Type Safety**: Full TypeScript support with exported types
- **Proper Cleanup**: Automatic cleanup on component unmount (no memory leaks)
- **Error Handling**: Graceful handling of malformed messages and connection errors
- **Manual Reconnection**: Exposed reconnect function for user-triggered retry
- **Production Ready**: Battle-tested patterns for WebSocket management

## Installation

No installation required - the hook is already created in your project.

## Basic Usage

```typescript
import { useWebSocket } from '@/hooks/useWebSocket'

function PriceMonitor() {
  const { prices, status, error, reconnect } = useWebSocket([
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT'
  ])

  if (status === 'connecting') {
    return <div>Connecting...</div>
  }

  if (status === 'error') {
    return (
      <div>
        Error: {error?.message}
        <button onClick={reconnect}>Retry</button>
      </div>
    )
  }

  return (
    <div>
      {Array.from(prices.values()).map(ticker => (
        <div key={ticker.symbol}>
          <strong>{ticker.symbol}:</strong> ${ticker.price}
          <span style={{ color: ticker.priceChange.startsWith('-') ? 'red' : 'green' }}>
            {ticker.priceChangePercent}%
          </span>
        </div>
      ))}
    </div>
  )
}
```

## API Reference

### Parameters

| Parameter | Type       | Description                                    | Required |
|-----------|------------|------------------------------------------------|----------|
| `symbols` | `string[]` | Array of crypto symbols (e.g., `['BTCUSDT']`) | Yes      |

### Return Value

```typescript
{
  prices: Map<string, TickerData>
  status: ConnectionStatus
  error: Error | null
  reconnect: () => void
}
```

#### `prices`
- **Type**: `Map<string, TickerData>`
- **Description**: Map of symbol to ticker data
- **Usage**: `prices.get('BTCUSDT')?.price`

#### `status`
- **Type**: `'connecting' | 'connected' | 'disconnected' | 'error'`
- **Description**: Current WebSocket connection state
- **States**:
  - `connecting`: Establishing connection to Binance
  - `connected`: Successfully connected and receiving data
  - `disconnected`: Connection closed (will auto-reconnect)
  - `error`: Connection error occurred

#### `error`
- **Type**: `Error | null`
- **Description**: Last error that occurred (if any)
- **Usage**: `error?.message`

#### `reconnect`
- **Type**: `() => void`
- **Description**: Manually trigger reconnection with reset backoff
- **Usage**: `<button onClick={reconnect}>Reconnect</button>`

## TypeScript Types

### TickerData

```typescript
interface TickerData {
  symbol: string              // e.g., "BTCUSDT"
  price: string               // Current price (e.g., "43250.50")
  priceChange: string         // 24h price change (e.g., "1250.00" or "-500.00")
  priceChangePercent: string  // 24h price change % (e.g., "2.98" or "-1.15")
  lastUpdate: number          // Unix timestamp in milliseconds
}
```

### ConnectionStatus

```typescript
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
```

## Supported Symbols

Any Binance trading pair ending in USDT. Examples:

- `BTCUSDT` - Bitcoin
- `ETHUSDT` - Ethereum
- `BNBUSDT` - Binance Coin
- `SOLUSDT` - Solana
- `ADAUSDT` - Cardano
- `DOGEUSDT` - Dogecoin
- `XRPUSDT` - Ripple

[Full list of Binance symbols](https://www.binance.com/en/markets/spot_margin-USDT)

## Advanced Usage

### Dynamic Symbol Updates

The hook automatically reconnects when the symbol list changes:

```typescript
function DynamicPriceMonitor() {
  const [symbols, setSymbols] = useState(['BTCUSDT', 'ETHUSDT'])
  const { prices, status } = useWebSocket(symbols)

  const addSymbol = (symbol: string) => {
    setSymbols([...symbols, symbol])  // Hook will reconnect with new symbols
  }

  // ... rest of component
}
```

### Connection Status Indicator

```typescript
function StatusIndicator() {
  const { status } = useWebSocket(['BTCUSDT'])

  const statusColors = {
    connecting: 'yellow',
    connected: 'green',
    disconnected: 'gray',
    error: 'red'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: statusColors[status]
      }} />
      <span>{status}</span>
    </div>
  )
}
```

### Error Handling with Retry

```typescript
function PriceMonitorWithRetry() {
  const { prices, status, error, reconnect } = useWebSocket(['BTCUSDT'])

  if (status === 'error') {
    return (
      <div className="error-container">
        <h3>Connection Error</h3>
        <p>{error?.message || 'Unknown error occurred'}</p>
        <button onClick={reconnect}>Retry Connection</button>
      </div>
    )
  }

  // ... rest of component
}
```

### Price Formatting

```typescript
function FormattedPrice({ symbol }: { symbol: string }) {
  const { prices } = useWebSocket([symbol])
  const ticker = prices.get(symbol)

  if (!ticker) return <div>Loading...</div>

  const price = parseFloat(ticker.price)
  const change = parseFloat(ticker.priceChangePercent)
  const isPositive = change >= 0

  return (
    <div>
      <div className="price">
        ${price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
      </div>
      <div className={isPositive ? 'positive' : 'negative'}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </div>
    </div>
  )
}
```

## How It Works

### Connection Lifecycle

1. **Initial Connection**: Hook establishes WebSocket connection to Binance
2. **Data Streaming**: Receives real-time ticker updates and updates `prices` Map
3. **Disconnection**: If connection drops, automatic reconnection begins
4. **Exponential Backoff**: Retry delays increase: 1s → 2s → 4s → 8s → 16s → 30s (max)
5. **Success Reset**: On successful reconnection, backoff delay resets to 1s
6. **Cleanup**: On component unmount, connection closes and timers clear

### WebSocket URL Format

The hook builds URLs like:
```
wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker
```

For single symbol:
```
wss://stream.binance.com:9443/stream?streams=btcusdt@ticker
```

### Message Format (from Binance)

```json
{
  "stream": "btcusdt@ticker",
  "data": {
    "s": "BTCUSDT",
    "c": "43250.50",
    "p": "1250.00",
    "P": "2.98",
    "E": 1672531200000
  }
}
```

## Testing

### Test Connection

Create a test component:

```typescript
// app/test-websocket/page.tsx
'use client'

import { useWebSocket } from '@/hooks/useWebSocket'

export default function TestWebSocket() {
  const { prices, status, error, reconnect } = useWebSocket(['BTCUSDT'])

  return (
    <div style={{ padding: '20px' }}>
      <h1>WebSocket Test</h1>
      <div>Status: {status}</div>
      {error && <div>Error: {error.message}</div>}
      <button onClick={reconnect}>Reconnect</button>

      <pre>{JSON.stringify(Array.from(prices.values()), null, 2)}</pre>
    </div>
  )
}
```

### Monitor Console Logs

The hook logs important events:
- `[WebSocket] Connecting to: wss://...`
- `[WebSocket] Connected successfully`
- `[WebSocket] Connection closed (code: 1000, reason: none)`
- `[WebSocket] Reconnecting in 2000ms (attempt 2)...`
- `[WebSocket] Cleaning up connection`

### Test Reconnection

1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Disable network in DevTools
4. Watch console for reconnection attempts
5. Re-enable network
6. Verify connection resumes

## Troubleshooting

### No Data Received

**Symptoms**: `prices` Map is empty after connecting

**Solutions**:
- Check browser console for WebSocket messages
- Verify symbols are valid Binance pairs (end in USDT)
- Check network tab for WebSocket connection (should be status 101)
- Try manually reconnecting: `reconnect()`

### Infinite Reconnection Loop

**Symptoms**: Hook continuously reconnects without success

**Solutions**:
- Check Binance API status: https://www.binance.com/en/support/announcement
- Verify internet connection
- Check browser console for specific error messages
- Ensure symbols array is not empty

### Memory Leaks

**Symptoms**: Memory usage grows over time

**Solutions**:
- The hook automatically cleans up on unmount
- Avoid creating new symbol arrays on each render (use `useState` or `useMemo`)
- Check that components using the hook properly unmount

### Type Errors

**Symptoms**: TypeScript errors when using the hook

**Solutions**:
- Ensure `@/types` exports are available: `ConnectionStatus`, `TickerData`
- Run `npm run type-check` to verify project types
- Import types: `import type { TickerData } from '@/types'`

## Performance Considerations

### Optimize Symbol Updates

Avoid recreating the symbols array on every render:

```typescript
// Bad - creates new array on every render
const { prices } = useWebSocket(['BTCUSDT', 'ETHUSDT'])

// Good - stable reference
const symbols = useMemo(() => ['BTCUSDT', 'ETHUSDT'], [])
const { prices } = useWebSocket(symbols)
```

### Limit Number of Symbols

For best performance, subscribe to 5-10 symbols maximum. For more symbols, consider:
- Paginating the display
- Using multiple hook instances for different groups
- Filtering symbols based on user preferences

### Memoize Price Calculations

```typescript
const formattedPrices = useMemo(() => {
  return Array.from(prices.values()).map(ticker => ({
    ...ticker,
    priceNum: parseFloat(ticker.price),
    changeNum: parseFloat(ticker.priceChangePercent)
  }))
}, [prices])
```

## Security Notes

- WebSocket connection uses secure `wss://` protocol
- No authentication required for public Binance ticker streams
- Data is read-only (no trading operations)
- No sensitive data is transmitted

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

Requires WebSocket API support (available in all modern browsers).

## Related Documentation

- [Binance WebSocket API](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)
- [Binance Ticker Stream](https://binance-docs.github.io/apidocs/spot/en/#individual-symbol-ticker-streams)
- [React Hooks Documentation](https://react.dev/reference/react)

## Example Component

See `C:\Users\israe\Downloads\FrontendThingy\stock-monitor\hooks\useWebSocket.example.tsx` for complete working examples.

## Support

For issues or questions:
1. Check browser console logs
2. Verify Binance API status
3. Review this documentation
4. Check the example component for reference implementation
