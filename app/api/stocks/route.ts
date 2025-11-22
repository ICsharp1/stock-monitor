import { createClient } from '@/lib/supabase/server'
import { normalizeSymbol, validateBinanceSymbol, stockExists } from '@/lib/stocks'
import { canAddStocks } from '@/lib/permissions-server'
import { ApiError, ApiSuccess, validateRequiredFields, validateFieldType } from '@/lib/api-response'

/**
 * GET /api/stocks
 * Get all stocks from the master list
 * Accessible by all authenticated users
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return ApiError.unauthorized()
    }

    // Fetch all stocks
    const { data: stocks, error } = await supabase
      .from('stocks')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[API /stocks GET] Error fetching stocks:', error)
      return ApiError.internal('Failed to fetch stocks', error)
    }

    return ApiSuccess.ok({ stocks: stocks || [] })
  } catch (error) {
    console.error('[API /stocks GET] Exception:', error)
    return ApiError.internal('Internal server error', error)
  }
}

/**
 * POST /api/stocks
 * Add a new stock to the master list
 * Only accessible by admins
 *
 * Body: { symbol: string, name: string }
 * Example: { symbol: "LINK", name: "Chainlink" }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return ApiError.unauthorized()
    }

    // Check if user is an admin
    const isAdminUser = await canAddStocks(user.id)

    if (!isAdminUser) {
      return ApiError.forbidden('Only admins can add stocks')
    }

    // Parse and validate request body
    const body = await request.json()

    try {
      validateRequiredFields<{ symbol: string; name: string }>(body, ['symbol', 'name'])
      validateFieldType(body.symbol, 'symbol', 'string')
      validateFieldType(body.name, 'name', 'string')
    } catch (validationError) {
      return ApiError.badRequest(
        validationError instanceof Error ? validationError.message : 'Invalid request body'
      )
    }

    const { symbol: rawSymbol, name } = body

    // Normalize symbol (e.g., "LINK" -> "LINKUSDT")
    const symbol = normalizeSymbol(rawSymbol)

    // Check if stock already exists
    const exists = await stockExists(symbol)
    if (exists) {
      return ApiError.conflict(`Stock ${symbol} already exists in the master list`)
    }

    // Validate with Binance API
    const isValid = await validateBinanceSymbol(symbol)

    if (!isValid) {
      return ApiError.badRequest(`Symbol ${symbol} not found on Binance or not actively trading`)
    }

    // Add stock to database
    const serviceClient = await createClient()
    const { data, error } = await serviceClient
      .from('stocks')
      .insert({
        symbol,
        name: name.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('[API /stocks POST] Error inserting stock:', error)
      return ApiError.internal('Failed to add stock', error)
    }

    console.log(`[API /stocks POST] Stock added successfully: ${symbol}`)

    return ApiSuccess.created(
      { stock: data },
      `Stock ${symbol} added successfully`
    )
  } catch (error) {
    console.error('[API /stocks POST] Exception:', error)
    return ApiError.internal('Internal server error', error)
  }
}
