/**
 * API Response Type Definitions
 * Provides type-safe interfaces for all API endpoints
 */

import type { UserRole } from './permissions'

/**
 * Stock entity
 */
export interface Stock {
  id: string
  symbol: string
  name: string
  created_at?: string
}

/**
 * User with role and permissions
 */
export interface UserWithPermissions {
  id: string
  email: string
  role: UserRole
  created_at: string
  permissions: string[] // Array of stock symbols
}

/**
 * Permission update payload
 */
export interface PermissionUpdate {
  symbols: string[]
}

/**
 * Stock creation payload
 */
export interface CreateStockPayload {
  symbol: string
  name: string
}

/**
 * GET /api/stocks response
 */
export interface GetStocksResponse {
  success: true
  data: {
    stocks: Stock[]
  }
}

/**
 * POST /api/stocks response
 */
export interface CreateStockResponse {
  success: true
  data: {
    stock: Stock
  }
  message: string
}

/**
 * GET /api/users response
 */
export interface GetUsersResponse {
  success: true
  data: {
    users: UserWithPermissions[]
  }
}

/**
 * PUT /api/users/[userId]/permissions response
 */
export interface UpdatePermissionsResponse {
  success: true
  data: {
    message: string
  }
}

/**
 * Generic error response
 */
export interface ApiErrorResponse {
  error: string
  details?: unknown
}

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'string'
  )
}

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T extends { success: true }>(
  response: unknown
): response is T {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: boolean }).success === true
  )
}
