/**
 * Next.js Instrumentation
 * This file runs once when the server starts
 * Used here to validate environment variables at startup
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run validation on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateServerEnv } = await import('./lib/env')

    try {
      validateServerEnv()
      console.log('[Startup] Environment variables validated successfully')
    } catch (error) {
      console.error('[Startup] Environment validation failed!')
      // In production, you may want to prevent the server from starting
      // For now, just log the error and continue (allows development with partial env)
      if (process.env.NODE_ENV === 'production') {
        throw error
      }
    }
  }
}
