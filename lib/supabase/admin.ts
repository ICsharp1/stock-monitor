import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service role key for admin operations
 * This client bypasses RLS and can access auth.users
 * ONLY use this on the server-side in API routes
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('[Admin Client] Missing NEXT_PUBLIC_SUPABASE_URL')
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseServiceKey) {
    console.error('[Admin Client] Missing SUPABASE_SERVICE_ROLE_KEY')
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - check .env.local')
  }

  console.log('[Admin Client] Creating admin client with service role')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
