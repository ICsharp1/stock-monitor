import { NextResponse } from 'next/server'

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string
  details?: unknown
}

/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

/**
 * Helper to create consistent error responses
 */
export class ApiError {
  /**
   * 400 Bad Request - Invalid input from client
   */
  static badRequest(message: string, details?: unknown) {
    return NextResponse.json<ApiErrorResponse>(
      { error: message, details },
      { status: 400 }
    )
  }

  /**
   * 401 Unauthorized - Not authenticated
   */
  static unauthorized(message = 'Unauthorized') {
    return NextResponse.json<ApiErrorResponse>(
      { error: message },
      { status: 401 }
    )
  }

  /**
   * 403 Forbidden - Authenticated but not authorized
   */
  static forbidden(message = 'Forbidden') {
    return NextResponse.json<ApiErrorResponse>(
      { error: message },
      { status: 403 }
    )
  }

  /**
   * 404 Not Found - Resource doesn't exist
   */
  static notFound(message = 'Not found') {
    return NextResponse.json<ApiErrorResponse>(
      { error: message },
      { status: 404 }
    )
  }

  /**
   * 409 Conflict - Resource already exists or conflict
   */
  static conflict(message: string) {
    return NextResponse.json<ApiErrorResponse>(
      { error: message },
      { status: 409 }
    )
  }

  /**
   * 500 Internal Server Error
   */
  static internal(message = 'Internal server error', details?: unknown) {
    // Log details server-side but don't expose to client
    if (details) {
      console.error('[API Error]', message, details)
    }
    return NextResponse.json<ApiErrorResponse>(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * Helper to create success responses
 */
export class ApiSuccess {
  /**
   * 200 OK - Success with data
   */
  static ok<T>(data: T, message?: string) {
    return NextResponse.json<ApiSuccessResponse<T>>(
      { success: true, data, message }
    )
  }

  /**
   * 201 Created - Resource created successfully
   */
  static created<T>(data: T, message?: string) {
    return NextResponse.json<ApiSuccessResponse<T>>(
      { success: true, data, message },
      { status: 201 }
    )
  }

  /**
   * 204 No Content - Success with no response body
   */
  static noContent() {
    return new NextResponse(null, { status: 204 })
  }
}

/**
 * Validate required fields in request body
 * @throws Error if validation fails
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  body: unknown,
  requiredFields: (keyof T)[]
): asserts body is T {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object')
  }

  for (const field of requiredFields) {
    if (!(field in body) || (body as Record<string, unknown>)[field as string] === undefined) {
      throw new Error(`Missing required field: ${String(field)}`)
    }
  }
}

/**
 * Validate field types in request body
 */
export function validateFieldType(
  value: unknown,
  fieldName: string,
  expectedType: 'string' | 'number' | 'boolean' | 'object' | 'array'
): void {
  if (expectedType === 'array') {
    if (!Array.isArray(value)) {
      throw new Error(`Field '${fieldName}' must be an array`)
    }
  } else if (typeof value !== expectedType) {
    throw new Error(`Field '${fieldName}' must be a ${expectedType}`)
  }
}
