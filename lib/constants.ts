/**
 * Application-wide constants
 */

/**
 * API Limits
 */
export const API_LIMITS = {
  /**
   * Maximum number of stocks that can be assigned to a single viewer.
   * This prevents accidental bulk assignments and potential performance issues.
   */
  MAX_STOCKS_PER_VIEWER: 500,
} as const
