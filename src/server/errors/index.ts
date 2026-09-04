// Base application error
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// Path traversal / security errors
export class SecurityError extends AppError {
  constructor(message: string, code: string = 'SECURITY_ERROR') {
    super(message, 403, code);
    this.name = 'SecurityError';
    Object.setPrototypeOf(this, SecurityError.prototype);
  }
}

// Authorization errors
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', code: string = 'AUTHORIZATION_ERROR') {
    super(message, 403, code);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

// Resource not found
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// Quota exceeded
export class QuotaExceededError extends AppError {
  constructor(message: string = 'Storage quota exceeded', code: string = 'STORAGE_QUOTA_EXCEEDED') {
    super(message, 429, code);
    this.name = 'QuotaExceededError';
    Object.setPrototypeOf(this, QuotaExceededError.prototype);
  }
}

// Conflict (e.g., optimistic concurrency failure)
export class ConflictError extends AppError {
  constructor(message: string = 'Resource has been modified', code: string = 'CONFLICT') {
    super(message, 409, code);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

// Helper to convert error to API response
export function errorToResponse(error: unknown): { statusCode: number; message: string; code: string } {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
    };
  }

  if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as { issues: unknown }).issues)) {
    // A Zod validation error (duck-typed to avoid an import dependency here).
    const issues = (error as { issues: Array<{ message: string }> }).issues;
    return {
      statusCode: 400,
      message: issues[0]?.message || 'Invalid request',
      code: 'VALIDATION_ERROR',
    };
  }

  return {
    statusCode: 500,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
}
