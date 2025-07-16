/**
 * Comprehensive API Middleware System
 * Provides centralized request handling, validation, security, and error management
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, createRequestLogger } from '../lib/logger';
import { errorHandler, ValidationError, RateLimitError, AuthenticationError } from '../lib/error-handler';
import { config, environmentManager } from '../lib/environment';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface ApiRequest extends NextRequest {
  requestId: string;
  startTime: number;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code: string;
    type: string;
    timestamp: string;
    requestId: string;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    duration: number;
    version: string;
  };
}

export interface MiddlewareConfig {
  enableCors: boolean;
  enableRateLimit: boolean;
  enableAuth: boolean;
  enableValidation: boolean;
  enableLogging: boolean;
  enableMetrics: boolean;
  corsOptions?: {
    origins: string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
  };
  rateLimitOptions?: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
}

// Rate limiting store
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  public get(key: string): { count: number; resetTime: number } | undefined {
    return this.store.get(key);
  }

  public set(key: string, value: { count: number; resetTime: number }): void {
    this.store.set(key, value);
  }

  public increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      const newEntry = { count: 1, resetTime: now + windowMs };
      this.store.set(key, newEntry);
      return newEntry;
    }

    existing.count++;
    this.store.set(key, existing);
    return existing;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

const rateLimitStore = new RateLimitStore();

// Middleware functions
export class ApiMiddleware {
  private config: MiddlewareConfig;

  constructor(config: Partial<MiddlewareConfig> = {}) {
    this.config = {
      enableCors: true,
      enableRateLimit: true,
      enableAuth: false,
      enableValidation: true,
      enableLogging: true,
      enableMetrics: true,
      corsOptions: {
        origins: environmentManager.getSecurityConfig().corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
        credentials: true,
      },
      rateLimitOptions: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false,
      },
      ...config,
    };
  }

  /**
   * Main middleware handler
   */
  public async handle(
    request: NextRequest,
    handler: (req: ApiRequest) => Promise<NextResponse | ApiResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId(request);
    const requestLogger = createRequestLogger(requestId);

    // Enhance request object
    const apiRequest = request as ApiRequest;
    apiRequest.requestId = requestId;
    apiRequest.startTime = startTime;

    try {
      // Configuration validation
      if (this.config.enableValidation) {
        await this.validateConfiguration();
      }

      // CORS handling
      if (this.config.enableCors) {
        const corsResponse = this.handleCors(request);
        if (corsResponse) return corsResponse;
      }

      // Request logging
      if (this.config.enableLogging) {
        this.logRequest(apiRequest, requestLogger);
      }

      // Rate limiting
      if (this.config.enableRateLimit) {
        await this.handleRateLimit(apiRequest);
      }

      // Authentication
      if (this.config.enableAuth) {
        await this.handleAuthentication(apiRequest);
      }

      // Execute handler
      const result = await handler(apiRequest);

      // Handle response
      const response = this.handleResponse(result, apiRequest);

      // Response logging
      if (this.config.enableLogging) {
        this.logResponse(response, apiRequest, requestLogger);
      }

      // Metrics collection
      if (this.config.enableMetrics) {
        this.collectMetrics(apiRequest, response);
      }

      return response;
    } catch (error) {
      return this.handleError(error, apiRequest, requestLogger);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(request: NextRequest): string {
    return (
      request.headers.get('x-request-id') ||
      request.headers.get('x-correlation-id') ||
      uuidv4()
    );
  }

  /**
   * Validate configuration
   */
  private async validateConfiguration(): Promise<void> {
    try {
      // Basic configuration validation
      if (!config.env) {
        throw new ValidationError('Environment not configured');
      }
    } catch (error) {
      throw new ValidationError(
        'Invalid configuration',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Handle CORS
   */
  private handleCors(request: NextRequest): NextResponse | null {
    const origin = request.headers.get('origin');
    const { corsOptions } = this.config;

    if (!corsOptions) return null;

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      this.setCorsHeaders(response, origin, corsOptions);
      return response;
    }

    // Validate origin
    if (origin && !corsOptions.origins.includes(origin) && !corsOptions.origins.includes('*')) {
      return new NextResponse('CORS: Origin not allowed', { status: 403 });
    }

    return null;
  }

  /**
   * Set CORS headers
   */
  private setCorsHeaders(
    response: NextResponse,
    origin: string | null,
    corsOptions: NonNullable<MiddlewareConfig['corsOptions']>
  ): void {
    if (origin && (corsOptions.origins.includes(origin) || corsOptions.origins.includes('*'))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', corsOptions.headers.join(', '));
    
    if (corsOptions.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  /**
   * Handle rate limiting
   */
  private async handleRateLimit(request: ApiRequest): Promise<void> {
    const { rateLimitOptions } = this.config;
    if (!rateLimitOptions) return;

    const clientId = this.getClientId(request);
    const { count, resetTime } = rateLimitStore.increment(
      clientId,
      rateLimitOptions.windowMs
    );

    request.rateLimit = {
      remaining: Math.max(0, rateLimitOptions.maxRequests - count),
      resetTime,
    };

    if (count > rateLimitOptions.maxRequests) {
      throw new RateLimitError(
        'Rate limit exceeded',
        {
          limit: rateLimitOptions.maxRequests,
          current: count,
          resetTime,
          clientId,
        },
        request.requestId
      );
    }
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientId(request: ApiRequest): string {
    // Use user ID if authenticated, otherwise use IP
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Handle authentication
   */
  private async handleAuthentication(request: ApiRequest): Promise<void> {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      throw new AuthenticationError(
        'Authorization header required',
        undefined,
        request.requestId
      );
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new AuthenticationError(
        'Invalid authorization format',
        undefined,
        request.requestId
      );
    }

    // Validate token (implement your token validation logic)
    const user = await this.validateToken(token);
    if (!user) {
      throw new AuthenticationError(
        'Invalid or expired token',
        undefined,
        request.requestId
      );
    }

    request.user = user;
  }

  /**
   * Validate authentication token
   */
  private async validateToken(token: string): Promise<{ id: string; email?: string; role?: string } | null> {
    // Implement your token validation logic here
    // This is a placeholder implementation
    try {
      // Example: JWT validation, database lookup, etc.
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // return { id: decoded.sub, email: decoded.email, role: decoded.role };
      
      // For now, return null to indicate no authentication
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Log incoming request
   */
  private logRequest(request: ApiRequest, requestLogger: ReturnType<typeof createRequestLogger>): void {
    requestLogger.info('API request received', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length'),
      ip: request.ip,
      userId: request.user?.id,
    });
  }

  /**
   * Handle response formatting
   */
  private handleResponse(result: NextResponse | ApiResponse, request: ApiRequest): NextResponse {
    if (result instanceof NextResponse) {
      // Add standard headers
      this.addStandardHeaders(result, request);
      return result;
    }

    // Format API response
    const apiResponse: ApiResponse = {
      ...result,
      meta: {
        requestId: request.requestId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - request.startTime,
        version: process.env.APP_VERSION || '1.0.0',
        ...result.meta,
      },
    };

    const response = NextResponse.json(apiResponse, {
      status: result.error ? this.getStatusFromError(result.error.code) : 200,
    });

    this.addStandardHeaders(response, request);
    return response;
  }

  /**
   * Add standard headers to response
   */
  private addStandardHeaders(response: NextResponse, request: ApiRequest): void {
    response.headers.set('X-Request-ID', request.requestId);
    response.headers.set('X-Response-Time', `${Date.now() - request.startTime}ms`);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    if (config.isProduction) {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Add rate limit headers
    if (request.rateLimit) {
      response.headers.set('X-RateLimit-Remaining', request.rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(request.rateLimit.resetTime).toISOString());
    }

    // Add CORS headers if enabled
    if (this.config.enableCors && this.config.corsOptions) {
      const origin = request.headers.get('origin');
      this.setCorsHeaders(response, origin, this.config.corsOptions);
    }
  }

  /**
   * Get HTTP status code from error code
   */
  private getStatusFromError(errorCode: string): number {
    const statusMap: Record<string, number> = {
      'VALIDATION_FAILED': 400,
      'AUTH_REQUIRED': 401,
      'INSUFFICIENT_PERMISSIONS': 403,
      'RESOURCE_NOT_FOUND': 404,
      'RESOURCE_CONFLICT': 409,
      'RATE_LIMIT_EXCEEDED': 429,
      'INTERNAL_ERROR': 500,
      'S3_OPERATION_FAILED': 500,
      'DATABASE_ERROR': 500,
      'EXTERNAL_API_ERROR': 502,
      'NETWORK_ERROR': 503,
      'OPERATION_TIMEOUT': 408,
    };

    return statusMap[errorCode] || 500;
  }

  /**
   * Log response
   */
  private logResponse(
    response: NextResponse,
    request: ApiRequest,
    requestLogger: ReturnType<typeof createRequestLogger>
  ): void {
    const duration = Date.now() - request.startTime;
    const statusCode = response.status;
    
    requestLogger.info('API response sent', {
      statusCode,
      duration,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      userId: request.user?.id,
    });
  }

  /**
   * Collect metrics
   */
  private collectMetrics(request: ApiRequest, response: NextResponse): void {
    const duration = Date.now() - request.startTime;
    const statusCode = response.status;
    
    // Log performance metrics
    logger.info('API metrics', {
      metrics: {
        method: request.method,
        endpoint: new URL(request.url).pathname,
        statusCode,
        duration,
        userId: request.user?.id,
        userAgent: request.headers.get('user-agent'),
      },
    });
  }

  /**
   * Handle errors
   */
  private handleError(
    error: any,
    request: ApiRequest,
    requestLogger: ReturnType<typeof createRequestLogger>
  ): NextResponse {
    requestLogger.error('API request failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - request.startTime,
    });

    const response = errorHandler(error, request.requestId, true);
    this.addStandardHeaders(response, request);
    return response;
  }
}

// Utility functions
export function createApiMiddleware(config?: Partial<MiddlewareConfig>): ApiMiddleware {
  return new ApiMiddleware(config);
}

export function withApiMiddleware(
  handler: (req: ApiRequest) => Promise<NextResponse | ApiResponse>,
  config?: Partial<MiddlewareConfig>
) {
  const middleware = createApiMiddleware(config);
  
  return async (request: NextRequest): Promise<NextResponse> => {
    return middleware.handle(request, handler);
  };
}

// Pre-configured middleware instances
export const defaultApiMiddleware = createApiMiddleware();

export const publicApiMiddleware = createApiMiddleware({
  enableAuth: false,
  enableRateLimit: true,
});

export const protectedApiMiddleware = createApiMiddleware({
  enableAuth: true,
  enableRateLimit: true,
});

export const adminApiMiddleware = createApiMiddleware({
  enableAuth: true,
  enableRateLimit: false, // Admins might need higher limits
});

// Helper for API route handlers
export function apiHandler(
  handler: (req: ApiRequest) => Promise<ApiResponse>,
  config?: Partial<MiddlewareConfig>
) {
  return withApiMiddleware(handler, config);
}

// Response helpers
export function successResponse(data: any, meta?: any): ApiResponse {
  return {
    success: true,
    data,
    meta,
  };
}

export function errorResponse(
  message: string,
  code: string,
  type: string = 'API_ERROR'
): ApiResponse {
  return {
    success: false,
    error: {
      message,
      code,
      type,
      timestamp: new Date().toISOString(),
      requestId: '', // Will be filled by middleware
    },
  };
}