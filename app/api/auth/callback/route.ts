import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user has a role assigned
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle()

      // If no role exists, assign viewer role and default permissions
      if (!roleData) {
        console.log('[Auth] New user detected, assigning viewer role:', data.user.id)

        // Assign viewer role
        await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'viewer'
          })

        // Assign default viewer permissions (BTCUSDT and ETHUSDT)
        await supabase
          .from('stock_permissions')
          .insert([
            { user_id: data.user.id, symbol: 'BTCUSDT', can_view: true },
            { user_id: data.user.id, symbol: 'ETHUSDT', can_view: true }
          ])

        console.log('[Auth] Viewer role and permissions assigned successfully')
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
