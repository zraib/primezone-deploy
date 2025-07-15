/**
 * Comprehensive Error Handling System
 * Provides centralized error management, logging, and user-friendly error responses
 */

import React from 'react';
import { logger } from './logger';
import { config } from './environment';

// TypeScript declaration for Node.js Error.captureStackTrace
declare global {
  interface ErrorConstructor {
    captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
  }
}

// Error Types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
  S3_ERROR = 'S3_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
}

// Error Severity Levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Base Error Interface
export interface AppError {
  type: ErrorType;
  message: string;
  code: string;
  statusCode: number;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  stack?: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
}

// Custom Error Classes
export class BaseAppError extends Error implements AppError {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly userId?: string;

  constructor(
    type: ErrorType,
    message: string,
    code: string,
    statusCode: number,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    this.userId = userId;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toJSON(): AppError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      context: this.context,
      stack: config.isDevelopment ? this.stack : undefined,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
    };
  }
}

// Specific Error Classes
export class ValidationError extends BaseAppError {
  constructor(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.VALIDATION,
      message,
      'VALIDATION_FAILED',
      400,
      ErrorSeverity.LOW,
      context,
      requestId,
      userId
    );
  }
}

export class AuthenticationError extends BaseAppError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.AUTHENTICATION,
      message,
      'AUTH_REQUIRED',
      401,
      ErrorSeverity.MEDIUM,
      context,
      requestId,
      userId
    );
  }
}

export class AuthorizationError extends BaseAppError {
  constructor(
    message: string = 'Insufficient permissions',
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.AUTHORIZATION,
      message,
      'INSUFFICIENT_PERMISSIONS',
      403,
      ErrorSeverity.MEDIUM,
      context,
      requestId,
      userId
    );
  }
}

export class NotFoundError extends BaseAppError {
  constructor(
    resource: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.NOT_FOUND,
      `${resource} not found`,
      'RESOURCE_NOT_FOUND',
      404,
      ErrorSeverity.LOW,
      context,
      requestId,
      userId
    );
  }
}

export class ConflictError extends BaseAppError {
  constructor(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.CONFLICT,
      message,
      'RESOURCE_CONFLICT',
      409,
      ErrorSeverity.MEDIUM,
      context,
      requestId,
      userId
    );
  }
}

export class RateLimitError extends BaseAppError {
  constructor(
    message: string = 'Rate limit exceeded',
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.RATE_LIMIT,
      message,
      'RATE_LIMIT_EXCEEDED',
      429,
      ErrorSeverity.MEDIUM,
      context,
      requestId,
      userId
    );
  }
}

export class FileUploadError extends BaseAppError {
  constructor(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.FILE_UPLOAD,
      message,
      'FILE_UPLOAD_FAILED',
      400,
      ErrorSeverity.MEDIUM,
      context,
      requestId,
      userId
    );
  }
}

export class S3Error extends BaseAppError {
  constructor(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.S3_ERROR,
      message,
      'S3_OPERATION_FAILED',
      500,
      ErrorSeverity.HIGH,
      context,
      requestId,
      userId
    );
  }
}

export class DatabaseError extends BaseAppError {
  constructor(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.DATABASE,
      message,
      'DATABASE_ERROR',
      500,
      ErrorSeverity.HIGH,
      context,
      requestId,
      userId
    );
  }
}

export class ExternalApiError extends BaseAppError {
  constructor(
    service: string,
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.EXTERNAL_API,
      `${service}: ${message}`,
      'EXTERNAL_API_ERROR',
      502,
      ErrorSeverity.HIGH,
      context,
      requestId,
      userId
    );
  }
}

export class InternalError extends BaseAppError {
  constructor(
    message: string = 'Internal server error',
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.INTERNAL,
      message,
      'INTERNAL_ERROR',
      500,
      ErrorSeverity.CRITICAL,
      context,
      requestId,
      userId
    );
  }
}

export class NetworkError extends BaseAppError {
  constructor(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.NETWORK,
      message,
      'NETWORK_ERROR',
      503,
      ErrorSeverity.HIGH,
      context,
      requestId,
      userId
    );
  }
}

export class TimeoutError extends BaseAppError {
  constructor(
    operation: string,
    timeout: number,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ) {
    super(
      ErrorType.TIMEOUT,
      `Operation '${operation}' timed out after ${timeout}ms`,
      'OPERATION_TIMEOUT',
      408,
      ErrorSeverity.MEDIUM,
      context,
      requestId,
      userId
    );
  }
}

// Error Handler Class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log errors
   */
  public handleError(error: Error | BaseAppError, requestId?: string, userId?: string): AppError {
    let appError: AppError;

    if (error instanceof BaseAppError) {
      appError = error.toJSON();
    } else {
      // Convert generic errors to AppError
      appError = {
        type: ErrorType.INTERNAL,
        message: error.message || 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
        severity: ErrorSeverity.CRITICAL,
        context: { originalError: error.name },
        stack: config.isDevelopment ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        requestId,
        userId,
      };
    }

    // Log the error
    this.logError(appError);

    // Track error frequency
    this.trackError(appError);

    // Send alerts for critical errors
    if (appError.severity === ErrorSeverity.CRITICAL) {
      this.sendAlert(appError);
    }

    return appError;
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError): void {
    const logContext = {
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      severity: error.severity,
      context: error.context,
      requestId: error.requestId,
      userId: error.userId,
      stack: error.stack,
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.info(error.message, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(error.message, logContext);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        logger.error(error.message, logContext);
        break;
    }
  }

  /**
   * Track error frequency for monitoring
   */
  private trackError(error: AppError): void {
    const errorKey = `${error.type}:${error.code}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    this.lastErrorTime.set(errorKey, Date.now());

    // Clean up old entries (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, time] of this.lastErrorTime.entries()) {
      if (time < oneHourAgo) {
        this.errorCounts.delete(key);
        this.lastErrorTime.delete(key);
      }
    }
  }

  /**
   * Send alerts for critical errors
   */
  private sendAlert(error: AppError): void {
    if (config.isProduction) {
      // In production, integrate with alerting services
      // Example: Sentry, PagerDuty, Slack, etc.
      logger.error('CRITICAL ERROR ALERT', {
        error: error,
        alert: true,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Create user-friendly error response
   */
  public createErrorResponse(error: AppError): {
    error: {
      message: string;
      code: string;
      type: string;
      timestamp: string;
      requestId?: string;
    };
  } {
    return {
      error: {
        message: this.getUserFriendlyMessage(error),
        code: error.code,
        type: error.type,
        timestamp: error.timestamp,
        requestId: error.requestId,
      },
    };
  }

  /**
   * Convert technical error messages to user-friendly ones
   */
  private getUserFriendlyMessage(error: AppError): string {
    const userFriendlyMessages: Record<ErrorType, string> = {
      [ErrorType.VALIDATION]: 'Please check your input and try again.',
      [ErrorType.AUTHENTICATION]: 'Please log in to continue.',
      [ErrorType.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorType.CONFLICT]: 'This action conflicts with existing data.',
      [ErrorType.RATE_LIMIT]: 'Too many requests. Please try again later.',
      [ErrorType.FILE_UPLOAD]: 'File upload failed. Please try again.',
      [ErrorType.S3_ERROR]: 'Storage service is temporarily unavailable.',
      [ErrorType.DATABASE]: 'Database service is temporarily unavailable.',
      [ErrorType.EXTERNAL_API]: 'External service is temporarily unavailable.',
      [ErrorType.INTERNAL]: 'An unexpected error occurred. Please try again.',
      [ErrorType.NETWORK]: 'Network connection failed. Please check your connection.',
      [ErrorType.TIMEOUT]: 'The operation timed out. Please try again.',
    };

    if (config.isDevelopment) {
      return error.message; // Show detailed messages in development
    }

    return userFriendlyMessages[error.type] || 'An unexpected error occurred.';
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions
export function createError(
  type: ErrorType,
  message: string,
  code: string,
  statusCode: number,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: Record<string, any>,
  requestId?: string,
  userId?: string
): BaseAppError {
  return new BaseAppError(type, message, code, statusCode, severity, context, requestId, userId);
}

export function isAppError(error: any): error is BaseAppError {
  return error instanceof BaseAppError;
}

export function handleAsyncError<T>(
  promise: Promise<T>,
  errorType: ErrorType = ErrorType.INTERNAL,
  context?: Record<string, any>
): Promise<[T | null, BaseAppError | null]> {
  return promise
    .then<[T, null]>((data: T) => [data, null])
    .catch<[null, BaseAppError]>((error: Error) => {
      const appError = error instanceof BaseAppError 
        ? error 
        : new InternalError(error.message, { ...context, originalError: error.name });
      return [null, appError];
    });
}

// Error boundary for React components
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>
): React.ComponentType<T> {
  return function ErrorBoundaryWrapper(props: T) {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        setHasError(true);
        setError(new Error(event.message));
        errorHandler.handleError(new Error(event.message));
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        setHasError(true);
        setError(new Error(event.reason));
        errorHandler.handleError(new Error(event.reason));
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, []);

    if (hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          {config.isDevelopment && error && (
            <details>
              <summary>Error details (development only)</summary>
              <pre>{error.stack}</pre>
            </details>
          )}
          <button onClick={() => { setHasError(false); setError(null); }}>
            Try again
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };
}