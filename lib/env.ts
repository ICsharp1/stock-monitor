import { z } from 'zod'

/**
 * Server-side environment variables schema
 * These are validated at server startup
 */
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
})

/**
 * Client-side environment variables schema
 * Only variables prefixed with NEXT_PUBLIC_ are available in the browser
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_BINANCE_WS_URL: z.string().url().optional(),
})

/**
 * Validate server environment variables
 * Call this at server startup (e.g., in instrumentation.ts)
 */
export function validateServerEnv() {
  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Invalid server environment variables:')
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    })
    throw new Error('Missing or invalid environment variables. Check the console output above.')
  }

  return result.data
}

/**
 * Validate client environment variables
 * These are available in the browser via process.env.NEXT_PUBLIC_*
 */
export function validateClientEnv() {
  const clientEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BINANCE_WS_URL: process.env.NEXT_PUBLIC_BINANCE_WS_URL,
  }

  const result = clientEnvSchema.safeParse(clientEnv)

  if (!result.success) {
    console.error('Invalid client environment variables:')
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    })
    throw new Error('Missing or invalid client environment variables.')
  }

  return result.data
}

/**
 * Type-safe access to validated environment variables
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>
