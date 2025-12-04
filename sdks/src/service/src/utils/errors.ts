/**
 * Custom error classes for the service
 */

/**
 * Base error class for service errors
 */
export class ServiceError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for invalid or missing session
 */
export class SessionError extends ServiceError {
  constructor(sessionId: string) {
    super(`Invalid or expired session: ${sessionId}`, 404, 'SESSION_NOT_FOUND');
    this.name = 'SessionError';
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends ServiceError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Error for SDK operations
 */
export class SDKError extends ServiceError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message, 500, 'SDK_ERROR');
    this.name = 'SDKError';
    this.originalError = originalError;
  }
}

/**
 * Error for unknown methods
 */
export class MethodNotFoundError extends ServiceError {
  constructor(method: string) {
    super(`Unknown method: ${method}`, 400, 'METHOD_NOT_FOUND');
    this.name = 'MethodNotFoundError';
  }
}
