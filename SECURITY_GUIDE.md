# Security Guide

## 🔒 Overview

This comprehensive security guide outlines best practices, implementation strategies, and security measures for the Panorama Viewer application to protect against common vulnerabilities and ensure data security.

## 🛡️ Security Architecture

### 1. Defense in Depth Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Client-Side Security                     │
├─────────────────────────────────────────────────────────────┤
│ • Input Validation     • XSS Prevention                     │
│ • CSRF Protection      • Content Security Policy            │
│ • Secure Storage       • Authentication State Management    │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                   Network Security                          │
├─────────────────────────────────────────────────────────────┤
│ • HTTPS Enforcement    • CORS Configuration                 │
│ • Rate Limiting        • Request Size Limits               │
│ • Security Headers     • API Gateway Protection            │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                  Application Security                       │
├─────────────────────────────────────────────────────────────┤
│ • Authentication       • Authorization                      │
│ • Session Management   • Input Sanitization                │
│ • Error Handling       • Logging & Monitoring              │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Security                            │
├─────────────────────────────────────────────────────────────┤
│ • Encryption at Rest   • Encryption in Transit             │
│ • Access Controls      • Data Classification               │
│ • Backup Security      • Data Retention Policies          │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication & Authorization

### JWT Implementation

```typescript
// src/lib/auth/jwt.ts
import jwt from 'jsonwebtoken';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import type { User } from '@/types/user';
import { environmentManager } from '@/lib/environment';
import { logger } from '@/lib/logger';

const scryptAsync = promisify(scrypt);

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  constructor() {
    const config = environmentManager.getConfig();
    this.accessTokenSecret = config.security.jwtAccessSecret;
    this.refreshTokenSecret = config.security.jwtRefreshSecret;
    
    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets not configured');
    }
  }

  async generateTokenPair(user: User, sessionId: string): Promise<TokenPair> {
    try {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId,
      };

      const accessToken = jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'panorama-viewer',
        audience: 'panorama-viewer-client',
      });

      const refreshToken = jwt.sign(
        { userId: user.id, sessionId },
        this.refreshTokenSecret,
        {
          expiresIn: this.refreshTokenExpiry,
          issuer: 'panorama-viewer',
          audience: 'panorama-viewer-client',
        }
      );

      logger.info('Token pair generated', { 
        userId: user.id, 
        sessionId,
        tokenType: 'access+refresh'
      });

      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Failed to generate token pair', { 
        userId: user.id, 
        error 
      });
      throw new Error('Token generation failed');
    }
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'panorama-viewer',
        audience: 'panorama-viewer-client',
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string; sessionId: string }> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'panorama-viewer',
        audience: 'panorama-viewer-client',
      }) as { userId: string; sessionId: string };

      return payload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      const salt = randomBytes(32).toString('hex');
      const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
      return `${salt}:${derivedKey.toString('hex')}`;
    } catch (error) {
      logger.error('Password hashing failed', { error });
      throw new Error('Password hashing failed');
    }
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [salt, key] = hashedPassword.split(':');
      const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
      return key === derivedKey.toString('hex');
    } catch (error) {
      logger.error('Password verification failed', { error });
      return false;
    }
  }
}

export const authService = new AuthService();
```

### Authentication Middleware

```typescript
// src/middleware/auth-middleware.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { authService } from '@/lib/auth/jwt';
import { logger } from '@/lib/logger';
import { errorHandler, UnauthorizedError } from '@/lib/error-handler';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
  };
}

export function requireAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid authorization header');
      }

      const token = authHeader.substring(7);
      const payload = await authService.verifyAccessToken(token);

      // Add user info to request
      (req as AuthenticatedRequest).user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId,
      };

      // Log successful authentication
      logger.info('User authenticated', {
        userId: payload.userId,
        endpoint: req.url,
        method: req.method,
      });

      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      logger.warn('Authentication failed', {
        endpoint: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      });

      const appError = errorHandler.handleError(error);
      const errorResponse = errorHandler.createErrorResponse(appError);
      
      return res.status(appError.statusCode).json(errorResponse);
    }
  };
}

export function requireRole(allowedRoles: string[]) {
  return function (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
    return requireAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Insufficient permissions', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          endpoint: req.url,
        });
        
        const error = new UnauthorizedError('Insufficient permissions');
        const errorResponse = errorHandler.createErrorResponse(error);
        return res.status(error.statusCode).json(errorResponse);
      }

      return handler(req, res);
    });
  };
}
```

## 🛡️ Input Validation & Sanitization

### Validation Schema

```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Custom sanitization transform
const sanitizeHtml = (value: string) => {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

// Base schemas
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must not exceed 254 characters')
  .transform(sanitizeHtml);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
  .transform(sanitizeHtml);

export const projectNameSchema = z
  .string()
  .min(1, 'Project name is required')
  .max(100, 'Project name must not exceed 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Project name contains invalid characters')
  .transform(sanitizeHtml);

export const descriptionSchema = z
  .string()
  .max(1000, 'Description must not exceed 1000 characters')
  .transform(sanitizeHtml)
  .optional();

// File validation
export const fileSchema = z.object({
  name: z.string().max(255, 'Filename too long'),
  size: z.number().max(50 * 1024 * 1024, 'File size must not exceed 50MB'),
  type: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
  ], {
    errorMap: () => ({ message: 'Invalid file type' }),
  }),
});

// API request schemas
export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: descriptionSchema,
  tags: z.array(z.string().max(50)).max(10).optional(),
  isPublic: z.boolean().default(false),
});

export const updateProjectSchema = createProjectSchema.partial();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  q: z.string().max(100).transform(sanitizeHtml).optional(),
  category: z.string().max(50).transform(sanitizeHtml).optional(),
  tags: z.string().transform((val) => 
    val.split(',').map(tag => sanitizeHtml(tag.trim())).filter(Boolean)
  ).optional(),
});
```

### Validation Middleware

```typescript
// src/middleware/validation-middleware.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

export function validateBody<T extends z.ZodSchema>(
  schema: T,
  handler: (req: NextApiRequest & { validatedBody: z.infer<T> }, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const validatedBody = schema.parse(req.body);
      
      (req as any).validatedBody = validatedBody;
      
      return handler(req as NextApiRequest & { validatedBody: z.infer<T> }, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Request validation failed', {
          endpoint: req.url,
          method: req.method,
          errors: error.errors,
          body: req.body,
        });
        
        const validationError = new ValidationError(
          'Invalid request data',
          { errors: error.errors }
        );
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Please check your input and try again.',
            code: 'VALIDATION_FAILED',
            type: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
      }
      
      throw error;
    }
  };
}

export function validateQuery<T extends z.ZodSchema>(
  schema: T,
  handler: (req: NextApiRequest & { validatedQuery: z.infer<T> }, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const validatedQuery = schema.parse(req.query);
      
      (req as any).validatedQuery = validatedQuery;
      
      return handler(req as NextApiRequest & { validatedQuery: z.infer<T> }, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Query validation failed', {
          endpoint: req.url,
          method: req.method,
          errors: error.errors,
          query: req.query,
        });
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid query parameters.',
            code: 'VALIDATION_FAILED',
            type: 'VALIDATION_ERROR',
            details: error.errors,
          },
        });
      }
      
      throw error;
    }
  };
}
```

## 🔒 Security Headers & CORS

### Security Headers Middleware

```typescript
// src/middleware/security-middleware.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { environmentManager } from '@/lib/environment';

export function securityHeaders(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const config = environmentManager.getConfig();
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Note: Adjust for production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');
    
    // Set security headers
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    if (config.environment === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    return handler(req, res);
  };
}

export function corsMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const config = environmentManager.getConfig();
    const allowedOrigins = config.security.allowedOrigins;
    
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return handler(req, res);
  };
}
```

## 🚫 Rate Limiting

```typescript
// src/lib/rate-limiter.ts
import { LRUCache } from 'lru-cache';
import type { NextApiRequest, NextApiResponse } from 'next';
import { TooManyRequestsError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextApiRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private cache: LRUCache<string, RateLimitInfo>;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (req) => this.getClientIP(req),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };

    this.cache = new LRUCache<string, RateLimitInfo>({
      max: 10000, // Maximum number of entries
      ttl: this.options.windowMs,
    });
  }

  private getClientIP(req: NextApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
      : req.socket.remoteAddress;
    
    return ip || 'unknown';
  }

  middleware() {
    return async (req: NextApiRequest, res: NextApiResponse, next: () => Promise<void>) => {
      const key = this.options.keyGenerator(req);
      const now = Date.now();
      const windowStart = now - this.options.windowMs;
      
      let rateLimitInfo = this.cache.get(key);
      
      // Reset if window has expired
      if (!rateLimitInfo || rateLimitInfo.resetTime <= now) {
        rateLimitInfo = {
          count: 0,
          resetTime: now + this.options.windowMs,
        };
      }
      
      // Check if limit exceeded
      if (rateLimitInfo.count >= this.options.maxRequests) {
        const resetInSeconds = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
        
        logger.warn('Rate limit exceeded', {
          key,
          count: rateLimitInfo.count,
          limit: this.options.maxRequests,
          resetInSeconds,
          endpoint: req.url,
          method: req.method,
        });
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000));
        res.setHeader('Retry-After', resetInSeconds);
        
        throw new TooManyRequestsError(
          `Too many requests. Try again in ${resetInSeconds} seconds.`
        );
      }
      
      // Increment counter
      rateLimitInfo.count++;
      this.cache.set(key, rateLimitInfo);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.options.maxRequests - rateLimitInfo.count);
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000));
      
      await next();
    };
  }
}

// Predefined rate limiters
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
});
```

## 🔐 Secure File Upload

```typescript
// src/lib/secure-upload.ts
import { createHash } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { logger } from '@/lib/logger';
import { ValidationError, S3Error } from '@/lib/error-handler';

interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  scanForMalware?: boolean;
}

interface ProcessedFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
  hash: string;
}

export class SecureFileUpload {
  private static readonly DEFAULT_OPTIONS: FileValidationOptions = {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'],
    scanForMalware: true,
  };

  static async validateAndProcessFile(
    file: File | Buffer,
    filename: string,
    options: Partial<FileValidationOptions> = {}
  ): Promise<ProcessedFile> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // Convert File to Buffer if needed
      const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
      
      // Validate file size
      if (buffer.length > opts.maxSize) {
        throw new ValidationError(
          `File size exceeds maximum allowed size of ${opts.maxSize / (1024 * 1024)}MB`
        );
      }
      
      // Validate file type using magic numbers
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType || !opts.allowedTypes.includes(fileType.mime)) {
        throw new ValidationError(
          `File type ${fileType?.mime || 'unknown'} is not allowed`
        );
      }
      
      // Validate file extension
      const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
      if (!opts.allowedExtensions.includes(extension)) {
        throw new ValidationError(`File extension ${extension} is not allowed`);
      }
      
      // Generate secure filename
      const hash = createHash('sha256').update(buffer).digest('hex');
      const secureFilename = `${hash.substring(0, 16)}_${Date.now()}${extension}`;
      
      // Process image files
      let processedBuffer = buffer;
      if (fileType.mime.startsWith('image/')) {
        processedBuffer = await this.processImage(buffer, fileType.mime);
      }
      
      // Basic malware scanning (check for suspicious patterns)
      if (opts.scanForMalware) {
        await this.basicMalwareScan(processedBuffer);
      }
      
      logger.info('File validated and processed', {
        originalFilename: filename,
        secureFilename,
        mimeType: fileType.mime,
        size: processedBuffer.length,
        hash: hash.substring(0, 16),
      });
      
      return {
        buffer: processedBuffer,
        filename: secureFilename,
        mimeType: fileType.mime,
        size: processedBuffer.length,
        hash,
      };
    } catch (error) {
      logger.error('File validation failed', {
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private static async processImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    try {
      // Remove EXIF data and optimize image
      const processed = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(2048, 2048, { // Max dimensions
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      
      return processed;
    } catch (error) {
      logger.warn('Image processing failed, using original', {
        mimeType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return buffer;
    }
  }

  private static async basicMalwareScan(buffer: Buffer): Promise<void> {
    // Basic checks for suspicious patterns
    const suspiciousPatterns = [
      /\x00\x00\x00\x20ftypM4A/, // Malicious MP4
      /<script[^>]*>/i, // Script tags in files
      /javascript:/i, // JavaScript URLs
      /vbscript:/i, // VBScript URLs
      /data:text\/html/i, // Data URLs with HTML
    ];
    
    const content = buffer.toString('binary');
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        logger.warn('Suspicious pattern detected in file', {
          pattern: pattern.source,
        });
        throw new ValidationError('File contains suspicious content');
      }
    }
  }

  static generateSecureUrl(key: string, expiresIn: number = 3600): string {
    // Generate signed URL with expiration
    const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
    const signature = createHash('sha256')
      .update(`${key}:${timestamp}:${process.env.S3_SECRET_ACCESS_KEY}`)
      .digest('hex');
    
    return `${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}/${key}?expires=${timestamp}&signature=${signature}`;
  }
}
```

## 🔍 Security Monitoring

```typescript
// src/lib/security-monitor.ts
import { logger } from '@/lib/logger';
import { environmentManager } from '@/lib/environment';

interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip: string;
  userAgent?: string;
  endpoint?: string;
  details: Record<string, any>;
  timestamp: Date;
}

interface SecurityAlert {
  id: string;
  event: SecurityEvent;
  threshold: number;
  count: number;
  timeWindow: number;
}

export class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private alerts: Map<string, SecurityAlert> = new Map();
  private readonly maxEvents = 10000;
  private readonly alertThresholds = {
    auth_failure: { count: 5, window: 15 * 60 * 1000 }, // 5 failures in 15 minutes
    rate_limit: { count: 10, window: 60 * 1000 }, // 10 rate limits in 1 minute
    suspicious_activity: { count: 3, window: 5 * 60 * 1000 }, // 3 suspicious activities in 5 minutes
    unauthorized_access: { count: 1, window: 60 * 1000 }, // 1 unauthorized access in 1 minute
    data_breach: { count: 1, window: 60 * 1000 }, // 1 data breach attempt in 1 minute
  };

  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to events list
    this.events.push(securityEvent);
    
    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log the event
    logger.warn('Security event detected', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      endpoint: event.endpoint,
      details: event.details,
    });

    // Check for alert conditions
    this.checkAlertThresholds(securityEvent);

    // Send to external monitoring if configured
    this.sendToExternalMonitoring(securityEvent);
  }

  private checkAlertThresholds(event: SecurityEvent): void {
    const threshold = this.alertThresholds[event.type];
    if (!threshold) return;

    const alertKey = `${event.type}:${event.ip}`;
    const now = Date.now();
    const windowStart = now - threshold.window;

    // Count recent events of this type from this IP
    const recentEvents = this.events.filter(
      e => e.type === event.type && 
           e.ip === event.ip && 
           e.timestamp.getTime() > windowStart
    );

    if (recentEvents.length >= threshold.count) {
      const alert: SecurityAlert = {
        id: `${alertKey}:${now}`,
        event,
        threshold: threshold.count,
        count: recentEvents.length,
        timeWindow: threshold.window,
      };

      this.alerts.set(alertKey, alert);
      this.triggerAlert(alert);
    }
  }

  private triggerAlert(alert: SecurityAlert): void {
    logger.error('Security alert triggered', {
      alertId: alert.id,
      eventType: alert.event.type,
      severity: alert.event.severity,
      count: alert.count,
      threshold: alert.threshold,
      timeWindow: alert.timeWindow,
      ip: alert.event.ip,
      userId: alert.event.userId,
    });

    // Send alert to external systems
    this.sendAlert(alert);

    // Auto-block if critical
    if (alert.event.severity === 'critical') {
      this.autoBlock(alert.event.ip, alert.event.type);
    }
  }

  private async sendAlert(alert: SecurityAlert): Promise<void> {
    const config = environmentManager.getConfig();
    
    if (config.security.alertWebhook) {
      try {
        await fetch(config.security.alertWebhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.security.alertWebhookToken}`,
          },
          body: JSON.stringify({
            alert,
            timestamp: new Date().toISOString(),
            environment: config.environment,
          }),
        });
      } catch (error) {
        logger.error('Failed to send security alert', { error });
      }
    }
  }

  private autoBlock(ip: string, eventType: string): void {
    logger.error('Auto-blocking IP due to critical security event', {
      ip,
      eventType,
      timestamp: new Date().toISOString(),
    });

    // Add to blocked IPs (implement your blocking mechanism)
    // This could be a database, Redis, or external service
  }

  private sendToExternalMonitoring(event: SecurityEvent): void {
    const config = environmentManager.getConfig();
    
    if (config.monitoring.securityEndpoint) {
      // Send to external monitoring service (async, don't wait)
      fetch(config.monitoring.securityEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.monitoring.apiKey}`,
        },
        body: JSON.stringify(event),
      }).catch(error => {
        logger.warn('Failed to send to external monitoring', { error });
      });
    }
  }

  getSecurityReport(timeRange: number = 24 * 60 * 60 * 1000): SecurityReport {
    const now = Date.now();
    const since = now - timeRange;
    
    const recentEvents = this.events.filter(
      event => event.timestamp.getTime() > since
    );

    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIPs = recentEvents.reduce((acc, event) => {
      acc[event.ip] = (acc[event.ip] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      timeRange,
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      topIPs: Object.entries(topIPs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [ip, count]) => ({ ...acc, [ip]: count }), {}),
      activeAlerts: Array.from(this.alerts.values()),
    };
  }
}

interface SecurityReport {
  timeRange: number;
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topIPs: Record<string, number>;
  activeAlerts: SecurityAlert[];
}

export const securityMonitor = new SecurityMonitor();
```

## 📋 Security Checklist

### ✅ Authentication & Authorization
- [ ] Strong password requirements implemented
- [ ] JWT tokens with proper expiration
- [ ] Refresh token rotation
- [ ] Session management
- [ ] Multi-factor authentication (optional)
- [ ] Account lockout after failed attempts
- [ ] Password reset security

### ✅ Input Validation & Sanitization
- [ ] All user inputs validated
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] File upload security
- [ ] Request size limits
- [ ] Input sanitization

### ✅ Data Protection
- [ ] Encryption at rest
- [ ] Encryption in transit (HTTPS)
- [ ] Sensitive data masking in logs
- [ ] Secure environment variable handling
- [ ] Database access controls
- [ ] Regular security updates

### ✅ Network Security
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Rate limiting in place
- [ ] API versioning
- [ ] Request/response logging
- [ ] IP whitelisting (if needed)

### ✅ Monitoring & Incident Response
- [ ] Security event logging
- [ ] Automated alerting
- [ ] Incident response plan
- [ ] Regular security audits
- [ ] Vulnerability scanning
- [ ] Penetration testing

---

**Last Updated**: December 2024  
**Version**: 1.0.0