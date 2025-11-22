import { createClient } from '@/lib/supabase/server'
import { ApiError, ApiSuccess } from '@/lib/api-response'
import { getServerUserRole } from '@/lib/permissions-server'

/**
 * DELETE /api/stocks/[stockId]
 * Delete a stock from the master list
 * Only accessible by admins
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    const supabase = await createClient()
    const { stockId } = await params

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return ApiError.unauthorized()
    }

    // Check if user is admin (only admins can delete stocks)
    const role = await getServerUserRole(user.id)

    if (role !== 'admin') {
      return ApiError.forbidden('Only admins can delete stocks')
    }

    // Get stock info before deleting (for confirmation message)
    const { data: stock, error: fetchError } = await supabase
      .from('stocks')
      .select('symbol, name')
      .eq('id', stockId)
      .single()

    if (fetchError || !stock) {
      return ApiError.notFound('Stock not found')
    }

    // Delete the stock (cascade will remove related permissions)
    const { error: deleteError } = await supabase
      .from('stocks')
      .delete()
      .eq('id', stockId)

    if (deleteError) {
      console.error('[API /stocks/[stockId] DELETE] Error:', deleteError)
      return ApiError.internal('Failed to delete stock', deleteError)
    }

    return ApiSuccess.ok(
      { deletedStock: stock },
      `Stock ${stock.symbol} deleted successfully`
    )
  } catch (error) {
    console.error('[API /stocks/[stockId] DELETE] Exception:', error)
    return ApiError.internal('Internal server error', error)
  }
}
