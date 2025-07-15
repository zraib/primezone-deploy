# Environment Configuration Guide

## 🎯 Overview

This guide provides comprehensive environment configuration strategies to ensure robust, maintainable, and secure deployments across different environments.

## 📋 Environment Types

### 1. Development Environment
- **Purpose**: Local development and testing
- **Storage**: Local file system or development S3 bucket
- **Security**: Relaxed for development convenience
- **Monitoring**: Basic logging

### 2. Staging Environment
- **Purpose**: Pre-production testing and QA
- **Storage**: Dedicated staging S3 bucket
- **Security**: Production-like security settings
- **Monitoring**: Enhanced logging and monitoring

### 3. Production Environment
- **Purpose**: Live application serving users
- **Storage**: Production S3 bucket with backup
- **Security**: Maximum security settings
- **Monitoring**: Full monitoring, alerting, and analytics

## 🔧 Environment Variable Strategy

### Core Configuration Variables

```env
# Environment Identification
NODE_ENV=development|staging|production
APP_ENV=dev|staging|prod
APP_VERSION=1.0.0

# AWS Configuration (Amplify-compliant naming)
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=panorama-viewer-storage-{env}

# Public Configuration
NEXT_PUBLIC_S3_REGION=us-east-1
NEXT_PUBLIC_S3_BUCKET_NAME=panorama-viewer-storage-{env}
NEXT_PUBLIC_APP_ENV=dev|staging|prod
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true|false
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true|false
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true|false

# Security Configuration
NEXT_PUBLIC_CORS_ORIGINS=https://your-domain.com,https://staging.your-domain.com
SESSION_SECRET=your-session-secret
API_RATE_LIMIT=100

# Monitoring & Logging
LOG_LEVEL=debug|info|warn|error
SENTRY_DSN=your-sentry-dsn
GOOGLE_ANALYTICS_ID=your-ga-id

# Performance Configuration
MAX_FILE_SIZE=10485760
MAX_CONCURRENT_UPLOADS=5
CACHE_TTL=3600
```

### Environment-Specific Templates

#### Development (.env.development)
```env
# Development Environment
NODE_ENV=development
APP_ENV=dev

# AWS Configuration
S3_REGION=us-east-1
S3_BUCKET_NAME=panorama-viewer-storage-dev

# Public Configuration
NEXT_PUBLIC_S3_REGION=us-east-1
NEXT_PUBLIC_S3_BUCKET_NAME=panorama-viewer-storage-dev
NEXT_PUBLIC_APP_ENV=dev
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false

# Development Settings
LOG_LEVEL=debug
MAX_FILE_SIZE=52428800  # 50MB for development
API_RATE_LIMIT=1000     # Higher limit for development
```

#### Staging (.env.staging)
```env
# Staging Environment
NODE_ENV=production
APP_ENV=staging

# AWS Configuration
S3_REGION=us-east-1
S3_BUCKET_NAME=panorama-viewer-storage-staging

# Public Configuration
NEXT_PUBLIC_S3_REGION=us-east-1
NEXT_PUBLIC_S3_BUCKET_NAME=panorama-viewer-storage-staging
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_API_BASE_URL=https://staging.your-domain.com

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Staging Settings
LOG_LEVEL=info
MAX_FILE_SIZE=10485760  # 10MB
API_RATE_LIMIT=200
```

#### Production (.env.production)
```env
# Production Environment
NODE_ENV=production
APP_ENV=prod

# AWS Configuration
S3_REGION=us-east-1
S3_BUCKET_NAME=panorama-viewer-storage-prod

# Public Configuration
NEXT_PUBLIC_S3_REGION=us-east-1
NEXT_PUBLIC_S3_BUCKET_NAME=panorama-viewer-storage-prod
NEXT_PUBLIC_APP_ENV=prod
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Production Settings
LOG_LEVEL=warn
MAX_FILE_SIZE=10485760  # 10MB
API_RATE_LIMIT=100
```

## 🏗️ Configuration Management

### 1. Environment Detection Utility

Create `src/lib/environment.ts`:

```typescript
export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  env: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  apiBaseUrl: string;
  s3Config: {
    region: string;
    bucket: string;
  };
  features: {
    analytics: boolean;
    debugMode: boolean;
    performanceMonitoring: boolean;
  };
  limits: {
    maxFileSize: number;
    maxConcurrentUploads: number;
    apiRateLimit: number;
  };
}

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private loadConfiguration(): EnvironmentConfig {
    const env = (process.env.APP_ENV || process.env.NODE_ENV || 'development') as Environment;
    
    return {
      env,
      isProduction: env === 'production',
      isDevelopment: env === 'development',
      isStaging: env === 'staging',
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
      s3Config: {
        region: process.env.NEXT_PUBLIC_S3_REGION || 'us-east-1',
        bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'panorama-viewer-storage-dev',
      },
      features: {
        analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
        debugMode: process.env.NEXT_PUBLIC_ENABLE_DEBUG_MODE === 'true',
        performanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      },
      limits: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
        maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS || '5'),
        apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100'),
      },
    };
  }

  public getConfig(): EnvironmentConfig {
    return this.config;
  }

  public isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
    return this.config.features[feature];
  }

  public getLimit(limit: keyof EnvironmentConfig['limits']): number {
    return this.config.limits[limit];
  }

  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required environment variables
    const required = [
      'NEXT_PUBLIC_S3_REGION',
      'NEXT_PUBLIC_S3_BUCKET_NAME',
    ];

    required.forEach(key => {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable: ${key}`);
      }
    });

    // Validate S3 bucket naming
    const bucketName = this.config.s3Config.bucket;
    if (!/^[a-z0-9.-]+$/.test(bucketName)) {
      errors.push('S3 bucket name contains invalid characters');
    }

    // Validate file size limits
    if (this.config.limits.maxFileSize > 100 * 1024 * 1024) {
      errors.push('Max file size exceeds 100MB limit');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const environmentManager = EnvironmentManager.getInstance();
export const config = environmentManager.getConfig();
```

### 2. Configuration Validation Middleware

Create `src/middleware/config-validation.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { environmentManager } from '../lib/environment';

export function configValidationMiddleware(request: NextRequest) {
  const validation = environmentManager.validateConfiguration();
  
  if (!validation.isValid) {
    console.error('Configuration validation failed:', validation.errors);
    
    if (environmentManager.getConfig().isDevelopment) {
      return NextResponse.json(
        { 
          error: 'Configuration Error', 
          details: validation.errors 
        },
        { status: 500 }
      );
    }
    
    // In production, log errors but don't expose details
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
  
  return NextResponse.next();
}
```

## 🔒 Security Configuration

### 1. Environment-Specific Security Settings

```typescript
// src/lib/security-config.ts
import { config } from './environment';

export const securityConfig = {
  cors: {
    origin: config.isProduction 
      ? ['https://your-domain.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.limits.apiRateLimit,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  fileUpload: {
    maxFileSize: config.limits.maxFileSize,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/csv',
      'application/pdf',
      'video/mp4',
      'application/zip',
    ],
    maxConcurrentUploads: config.limits.maxConcurrentUploads,
  },
  
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...(config.isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    }),
  },
};
```

### 2. Secrets Management

```typescript
// src/lib/secrets.ts
import { config } from './environment';

class SecretsManager {
  private secrets: Map<string, string> = new Map();
  
  constructor() {
    this.loadSecrets();
  }
  
  private loadSecrets(): void {
    // Load from environment variables
    const secretKeys = [
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'SESSION_SECRET',
      'SENTRY_DSN',
    ];
    
    secretKeys.forEach(key => {
      const value = process.env[key];
      if (value) {
        this.secrets.set(key, value);
      } else if (config.isProduction) {
        console.warn(`Missing secret: ${key}`);
      }
    });
  }
  
  public getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }
  
  public hasSecret(key: string): boolean {
    return this.secrets.has(key);
  }
  
  public validateSecrets(): { isValid: boolean; missing: string[] } {
    const required = config.isProduction 
      ? ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'SESSION_SECRET']
      : ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
    
    const missing = required.filter(key => !this.hasSecret(key));
    
    return {
      isValid: missing.length === 0,
      missing,
    };
  }
}

export const secretsManager = new SecretsManager();
```

## 📊 Monitoring & Logging Configuration

### 1. Structured Logging

```typescript
// src/lib/logger.ts
import { config } from './environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  environment: string;
  version?: string;
}

class Logger {
  private logLevel: LogLevel;
  
  constructor() {
    const level = process.env.LOG_LEVEL || 'info';
    this.logLevel = LogLevel[level.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO;
  }
  
  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context,
      environment: config.env,
      version: process.env.APP_VERSION,
    };
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }
  
  private output(entry: LogEntry): void {
    if (config.isDevelopment) {
      console.log(JSON.stringify(entry, null, 2));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
  
  public debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.createLogEntry(LogLevel.DEBUG, message, context));
    }
  }
  
  public info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.createLogEntry(LogLevel.INFO, message, context));
    }
  }
  
  public warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.createLogEntry(LogLevel.WARN, message, context));
    }
  }
  
  public error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.createLogEntry(LogLevel.ERROR, message, context));
    }
  }
}

export const logger = new Logger();
```

### 2. Performance Monitoring

```typescript
// src/lib/performance.ts
import { config } from './environment';
import { logger } from './logger';

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  
  public startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration);
      
      if (config.features.performanceMonitoring) {
        logger.info('Performance metric recorded', {
          operation,
          duration,
          unit: 'ms',
        });
      }
    };
  }
  
  private recordMetric(operation: string, duration: number): void {
    this.metrics.set(`${operation}_${Date.now()}`, duration);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.size > 100) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }
  
  public getAverageTime(operation: string): number {
    const operationMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith(operation))
      .map(([, value]) => value);
    
    if (operationMetrics.length === 0) return 0;
    
    return operationMetrics.reduce((sum, time) => sum + time, 0) / operationMetrics.length;
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

## 🚀 Deployment Configuration

### 1. Amplify Environment Variables Setup

```bash
#!/bin/bash
# scripts/setup-amplify-env.sh

ENVIRONMENT=${1:-dev}

echo "Setting up Amplify environment variables for: $ENVIRONMENT"

# Load environment-specific variables
if [ -f ".env.$ENVIRONMENT" ]; then
  source ".env.$ENVIRONMENT"
else
  echo "Environment file .env.$ENVIRONMENT not found!"
  exit 1
fi

# Set Amplify environment variables
aws amplify put-app \
  --app-id $AMPLIFY_APP_ID \
  --environment-variables \
  S3_REGION=$S3_REGION,\
  S3_BUCKET_NAME=$S3_BUCKET_NAME,\
  NEXT_PUBLIC_S3_REGION=$NEXT_PUBLIC_S3_REGION,\
  NEXT_PUBLIC_S3_BUCKET_NAME=$NEXT_PUBLIC_S3_BUCKET_NAME,\
  NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV,\
  NODE_ENV=$NODE_ENV,\
  LOG_LEVEL=$LOG_LEVEL

echo "Environment variables set successfully!"
```

### 2. Environment Validation Script

```bash
#!/bin/bash
# scripts/validate-environment.sh

ENVIRONMENT=${1:-dev}

echo "Validating environment configuration for: $ENVIRONMENT"

# Check if environment file exists
if [ ! -f ".env.$ENVIRONMENT" ]; then
  echo "❌ Environment file .env.$ENVIRONMENT not found!"
  exit 1
fi

# Load environment variables
source ".env.$ENVIRONMENT"

# Validate required variables
REQUIRED_VARS=(
  "S3_REGION"
  "S3_BUCKET_NAME"
  "NEXT_PUBLIC_S3_REGION"
  "NEXT_PUBLIC_S3_BUCKET_NAME"
  "NODE_ENV"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo "❌ Missing required environment variables:"
  printf '   - %s\n' "${MISSING_VARS[@]}"
  exit 1
fi

# Validate S3 bucket name format
if [[ ! $S3_BUCKET_NAME =~ ^[a-z0-9.-]+$ ]]; then
  echo "❌ Invalid S3 bucket name format: $S3_BUCKET_NAME"
  exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "❌ AWS credentials not configured or invalid"
  exit 1
fi

echo "✅ Environment configuration is valid!"
```

## 📋 Best Practices Checklist

### ✅ Configuration Management
- [ ] Environment-specific configuration files
- [ ] Centralized configuration management
- [ ] Configuration validation on startup
- [ ] Secrets separated from configuration
- [ ] Environment detection utility

### ✅ Security
- [ ] No secrets in version control
- [ ] Environment-specific security settings
- [ ] Input validation and sanitization
- [ ] Rate limiting configuration
- [ ] CORS configuration per environment

### ✅ Monitoring
- [ ] Structured logging implementation
- [ ] Performance monitoring setup
- [ ] Error tracking configuration
- [ ] Health check endpoints
- [ ] Metrics collection

### ✅ Deployment
- [ ] Automated environment setup
- [ ] Configuration validation scripts
- [ ] Environment-specific build processes
- [ ] Rollback procedures
- [ ] Blue-green deployment support

### ✅ Maintenance
- [ ] Configuration documentation
- [ ] Environment comparison tools
- [ ] Automated configuration updates
- [ ] Regular security audits
- [ ] Performance baseline monitoring

---

**Last Updated**: December 2024  
**Version**: 1.0.0