/**
 * Environment Configuration Management
 * Provides centralized environment detection and configuration management
 */

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
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  features: {
    analytics: boolean;
    debugMode: boolean;
    performanceMonitoring: boolean;
    fileLogging: boolean;
    remoteLogging: boolean;
  };
  limits: {
    maxFileSize: number;
    maxConcurrentUploads: number;
    apiRateLimit: number;
    cacheTtl: number;
  };
  security: {
    corsOrigins: string[];
    sessionSecret?: string;
    enableHttps: boolean;
    enableCsrf: boolean;
  };
  monitoring: {
    logLevel: string;
    sentryDsn?: string;
    googleAnalyticsId?: string;
    enableMetrics: boolean;
  };
}

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;
  private validationErrors: string[] = [];

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private loadConfiguration(): EnvironmentConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const appEnv = process.env.APP_ENV || nodeEnv;
    const env = this.normalizeEnvironment(appEnv);

    return {
      env,
      isProduction: env === 'production',
      isDevelopment: env === 'development',
      isStaging: env === 'staging',
      
      apiBaseUrl: this.getApiBaseUrl(env),
      
      s3Config: {
        region: process.env.NEXT_PUBLIC_S3_REGION || process.env.S3_REGION || 'us-east-1',
        bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || `panorama-viewer-storage-${env}`,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
      
      features: {
        analytics: this.parseBoolean(process.env.NEXT_PUBLIC_ENABLE_ANALYTICS, env !== 'development'),
        debugMode: this.parseBoolean(process.env.NEXT_PUBLIC_ENABLE_DEBUG_MODE, env === 'development'),
        performanceMonitoring: this.parseBoolean(process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING, env !== 'development'),
        fileLogging: this.parseBoolean(process.env.ENABLE_FILE_LOGGING, false),
        remoteLogging: this.parseBoolean(process.env.ENABLE_REMOTE_LOGGING, env === 'production'),
      },
      
      limits: {
        maxFileSize: this.parseNumber(process.env.MAX_FILE_SIZE, this.getDefaultMaxFileSize(env)),
        maxConcurrentUploads: this.parseNumber(process.env.MAX_CONCURRENT_UPLOADS, 5),
        apiRateLimit: this.parseNumber(process.env.API_RATE_LIMIT, this.getDefaultRateLimit(env)),
        cacheTtl: this.parseNumber(process.env.CACHE_TTL, 3600),
      },
      
      security: {
        corsOrigins: this.parseCorsOrigins(env),
        sessionSecret: process.env.SESSION_SECRET,
        enableHttps: this.parseBoolean(process.env.ENABLE_HTTPS, env === 'production'),
        enableCsrf: this.parseBoolean(process.env.ENABLE_CSRF, env === 'production'),
      },
      
      monitoring: {
        logLevel: process.env.LOG_LEVEL || this.getDefaultLogLevel(env),
        sentryDsn: process.env.SENTRY_DSN,
        googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
        enableMetrics: this.parseBoolean(process.env.ENABLE_METRICS, env !== 'development'),
      },
    };
  }

  private normalizeEnvironment(env: string): Environment {
    const normalized = env.toLowerCase();
    
    switch (normalized) {
      case 'dev':
      case 'development':
        return 'development';
      case 'stage':
      case 'staging':
        return 'staging';
      case 'prod':
      case 'production':
        return 'production';
      default:
        console.warn(`Unknown environment '${env}', defaulting to 'development'`);
        return 'development';
    }
  }

  private getApiBaseUrl(env: Environment): string {
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }

    switch (env) {
      case 'development':
        return 'http://localhost:3000';
      case 'staging':
        return 'https://staging.your-domain.com';
      case 'production':
        return 'https://your-domain.com';
      default:
        return 'http://localhost:3000';
    }
  }

  private getDefaultMaxFileSize(env: Environment): number {
    switch (env) {
      case 'development':
        return 52428800; // 50MB
      case 'staging':
      case 'production':
        return 10485760; // 10MB
      default:
        return 10485760;
    }
  }

  private getDefaultRateLimit(env: Environment): number {
    switch (env) {
      case 'development':
        return 1000;
      case 'staging':
        return 200;
      case 'production':
        return 100;
      default:
        return 100;
    }
  }

  private getDefaultLogLevel(env: Environment): string {
    switch (env) {
      case 'development':
        return 'debug';
      case 'staging':
        return 'info';
      case 'production':
        return 'warn';
      default:
        return 'info';
    }
  }

  private parseCorsOrigins(env: Environment): string[] {
    const corsOriginsEnv = process.env.NEXT_PUBLIC_CORS_ORIGINS;
    
    if (corsOriginsEnv) {
      return corsOriginsEnv.split(',').map(origin => origin.trim());
    }

    switch (env) {
      case 'development':
        return ['http://localhost:3000', 'http://127.0.0.1:3000'];
      case 'staging':
        return ['https://staging.your-domain.com'];
      case 'production':
        return ['https://your-domain.com'];
      default:
        return ['http://localhost:3000'];
    }
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    this.validationErrors = [];

    // Required environment variables
    const requiredVars = [
      'NEXT_PUBLIC_S3_REGION',
      'NEXT_PUBLIC_S3_BUCKET_NAME',
    ];

    // Additional required vars for production
    if (this.config.isProduction) {
      requiredVars.push(
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'SESSION_SECRET'
      );
    }

    requiredVars.forEach(key => {
      if (!process.env[key]) {
        this.validationErrors.push(`Missing required environment variable: ${key}`);
      }
    });

    // Validate S3 bucket naming
    const bucketName = this.config.s3Config.bucket;
    if (!/^[a-z0-9.-]+$/.test(bucketName)) {
      this.validationErrors.push('S3 bucket name contains invalid characters');
    }

    if (bucketName.length < 3 || bucketName.length > 63) {
      this.validationErrors.push('S3 bucket name must be between 3 and 63 characters');
    }

    // Validate file size limits
    if (this.config.limits.maxFileSize > 100 * 1024 * 1024) {
      this.validationErrors.push('Max file size exceeds 100MB limit');
    }

    if (this.config.limits.maxFileSize < 1024) {
      this.validationErrors.push('Max file size is too small (minimum 1KB)');
    }

    // Validate API base URL
    try {
      new URL(this.config.apiBaseUrl);
    } catch {
      this.validationErrors.push('Invalid API base URL format');
    }

    // Validate CORS origins
    this.config.security.corsOrigins.forEach(origin => {
      try {
        new URL(origin);
      } catch {
        this.validationErrors.push(`Invalid CORS origin: ${origin}`);
      }
    });

    // Validate rate limits
    if (this.config.limits.apiRateLimit < 1) {
      this.validationErrors.push('API rate limit must be at least 1');
    }

    if (this.config.limits.maxConcurrentUploads < 1) {
      this.validationErrors.push('Max concurrent uploads must be at least 1');
    }

    // Production-specific validations
    if (this.config.isProduction) {
      if (!this.config.security.sessionSecret) {
        this.validationErrors.push('Session secret is required in production');
      }

      if (this.config.security.sessionSecret && this.config.security.sessionSecret.length < 32) {
        this.validationErrors.push('Session secret must be at least 32 characters in production');
      }

      if (!this.config.security.enableHttps) {
        this.validationErrors.push('HTTPS should be enabled in production');
      }
    }

    return {
      isValid: this.validationErrors.length === 0,
      errors: [...this.validationErrors],
    };
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config }; // Return a copy to prevent mutations
  }

  public isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
    return this.config.features[feature];
  }

  public getLimit(limit: keyof EnvironmentConfig['limits']): number {
    return this.config.limits[limit];
  }

  public getSecurityConfig(): EnvironmentConfig['security'] {
    return { ...this.config.security };
  }

  public getMonitoringConfig(): EnvironmentConfig['monitoring'] {
    return { ...this.config.monitoring };
  }

  public getS3Config(): EnvironmentConfig['s3Config'] {
    return { ...this.config.s3Config };
  }

  public getValidationResult(): { isValid: boolean; errors: string[] } {
    return {
      isValid: this.validationErrors.length === 0,
      errors: [...this.validationErrors],
    };
  }

  public getEnvironmentInfo(): {
    environment: Environment;
    version: string;
    nodeVersion: string;
    platform: string;
    uptime: number;
  } {
    return {
      environment: this.config.env,
      version: process.env.APP_VERSION || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
    };
  }

  public isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  public isStaging(): boolean {
    return this.config.isStaging;
  }

  public isProduction(): boolean {
    return this.config.isProduction;
  }

  public refreshConfiguration(): void {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public setEnvironmentVariable(key: string, value: string): void {
    process.env[key] = value;
    this.refreshConfiguration();
  }

  public getConfigSummary(): Record<string, any> {
    return {
      environment: this.config.env,
      features: this.config.features,
      limits: this.config.limits,
      security: {
        corsOrigins: this.config.security.corsOrigins,
        enableHttps: this.config.security.enableHttps,
        enableCsrf: this.config.security.enableCsrf,
      },
      monitoring: {
        logLevel: this.config.monitoring.logLevel,
        enableMetrics: this.config.monitoring.enableMetrics,
      },
      s3: {
        region: this.config.s3Config.region,
        bucket: this.config.s3Config.bucket,
      },
    };
  }
}

// Create and export singleton instance
export const environmentManager = EnvironmentManager.getInstance();
export const config = environmentManager.getConfig();

// Utility functions
export function isProduction(): boolean {
  return environmentManager.isProduction();
}

export function isDevelopment(): boolean {
  return environmentManager.isDevelopment();
}

export function isStaging(): boolean {
  return environmentManager.isStaging();
}

export function getEnvironment(): Environment {
  return config.env;
}

export function isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
  return environmentManager.isFeatureEnabled(feature);
}

export function getLimit(limit: keyof EnvironmentConfig['limits']): number {
  return environmentManager.getLimit(limit);
}

export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  return environmentManager.validateConfiguration();
}

export function getEnvironmentInfo() {
  return environmentManager.getEnvironmentInfo();
}

// Environment-specific utilities
export function requireProduction(message?: string): void {
  if (!isProduction()) {
    throw new Error(message || 'This operation is only allowed in production environment');
  }
}

export function requireDevelopment(message?: string): void {
  if (!isDevelopment()) {
    throw new Error(message || 'This operation is only allowed in development environment');
  }
}

export function requireNonProduction(message?: string): void {
  if (isProduction()) {
    throw new Error(message || 'This operation is not allowed in production environment');
  }
}

// Configuration helpers
export function getApiUrl(path: string = ''): string {
  const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
}

export function getS3Url(key: string): string {
  const { region, bucket } = config.s3Config;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function isFileSizeAllowed(bytes: number): boolean {
  return bytes <= config.limits.maxFileSize;
}

export function getRemainingFileSize(currentSize: number): number {
  return Math.max(0, config.limits.maxFileSize - currentSize);
}