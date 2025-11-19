import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { normalizeSymbol, validateBinanceSymbol, stockExists } from '@/lib/stocks'
import { canAddStocks } from '@/lib/permissions-server'

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all stocks
    const { data: stocks, error } = await supabase
      .from('stocks')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[API /stocks GET] Error fetching stocks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stocks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ stocks: stocks || [] })
  } catch (error) {
    console.error('[API /stocks GET] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is an admin
    const isAdminUser = await canAddStocks(user.id)

    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can add stocks' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { symbol: rawSymbol, name } = body

    // Validate input
    if (!rawSymbol || typeof rawSymbol !== 'string') {
      return NextResponse.json(
        { error: 'Invalid symbol' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid name' },
        { status: 400 }
      )
    }

    // Normalize symbol (e.g., "LINK" -> "LINKUSDT")
    const symbol = normalizeSymbol(rawSymbol)

    // Check if stock already exists
    const exists = await stockExists(symbol)
    if (exists) {
      return NextResponse.json(
        { error: `Stock ${symbol} already exists in the master list` },
        { status: 409 }
      )
    }

    // Validate with Binance API
    const isValid = await validateBinanceSymbol(symbol)

    if (!isValid) {
      return NextResponse.json(
        { error: `Symbol ${symbol} not found on Binance or not actively trading` },
        { status: 400 }
      )
    }

    // Add stock to database (using service role to bypass RLS)
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
      return NextResponse.json(
        { error: 'Failed to add stock' },
        { status: 500 }
      )
    }

    console.log(`[API /stocks POST] Stock added successfully: ${symbol}`)

    return NextResponse.json(
      {
        success: true,
        stock: data,
        message: `Stock ${symbol} added successfully`
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API /stocks POST] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
