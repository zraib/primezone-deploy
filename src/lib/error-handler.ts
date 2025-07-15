/**
 * Error Handler Module
 * Provides centralized error handling, custom error types, and error response formatting
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

// Custom Error Types
export class ValidationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.statusCode = 400;
    this.details = details;
  }
}

export class RateLimitError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.code = 'RATE_LIMIT_EXCEEDED';
    this.statusCode = 429;
    this.retryAfter = retryAfter;
  }
}

export class AuthenticationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = 'AUTHENTICATION_ERROR';
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    this.code = 'AUTHORIZATION_ERROR';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.code = 'CONFLICT_ERROR';
    this.statusCode = 409;
  }
}

export class InternalServerError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
    this.code = 'INTERNAL_SERVER_ERROR';
    this.statusCode = 500;
  }
}

// Error Response Interface
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    type: string;
    timestamp: string;
    requestId?: string;
    details?: any;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
    version: string;
  };
}

// Error Handler Function
export function errorHandler(
  error: Error,
  requestId?: string,
  includeStack: boolean = false
): NextResponse {
  const timestamp = new Date().toISOString();
  
  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    requestId,
    timestamp,
  });

  // Determine status code and error details
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorType = 'InternalServerError';
  let details: any = undefined;

  if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    errorType = error.name;
    details = error.details;
  } else if (error instanceof RateLimitError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    errorType = error.name;
  } else if (error instanceof AuthenticationError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    errorType = error.name;
  } else if (error instanceof AuthorizationError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    errorType = error.name;
  } else if (error instanceof NotFoundError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    errorType = error.name;
  } else if (error instanceof ConflictError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    errorType = error.name;
  } else if (error instanceof InternalServerError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    errorType = error.name;
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: error.message,
      code: errorCode,
      type: errorType,
      timestamp,
      requestId,
      ...(details && { details }),
      ...(includeStack && process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
    meta: {
      requestId,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
    },
  };

  // Set additional headers for specific error types
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (error instanceof RateLimitError && error.retryAfter) {
    headers['Retry-After'] = error.retryAfter.toString();
  }

  return NextResponse.json(errorResponse, {
    status: statusCode,
    headers,
  });
}

// Async error handler wrapper
export function asyncErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new InternalServerError('An unexpected error occurred');
    }
  };
}

// Validation helper
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

export function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new ValidationError('Invalid URL format');
  }
}

// Error boundary for React components (if needed)
export class ErrorBoundary {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  static componentDidCatch(error: Error, errorInfo: any) {
    logger.error('React Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
    });
  }
}

export default errorHandler;