/**
 * Structured Logging System
 * Provides centralized logging with different levels and structured output
 */

import { config } from './environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  environment: string;
  version?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  format: 'json' | 'pretty';
  includeStackTrace: boolean;
  maxLogSize: number;
  rotateDaily: boolean;
}

class Logger {
  private logLevel: LogLevel;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 1000;

  constructor() {
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
    this.config = this.loadConfig();
  }

  private loadConfig(): LoggerConfig {
    return {
      level: this.logLevel,
      enableConsole: true,
      enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
      enableRemote: process.env.ENABLE_REMOTE_LOGGING === 'true',
      format: config.isDevelopment ? 'pretty' : 'json',
      includeStackTrace: config.isDevelopment,
      maxLogSize: parseInt(process.env.MAX_LOG_SIZE || '10485760'), // 10MB
      rotateDaily: true,
    };
  }

  private parseLogLevel(level: string): LogLevel {
    const normalizedLevel = level.toUpperCase();
    return LogLevel[normalizedLevel as keyof typeof LogLevel] || LogLevel.INFO;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      environment: config.env,
      version: process.env.APP_VERSION || '1.0.0',
    };

    if (context) {
      entry.context = this.sanitizeContext(context);
    }

    if (requestId) {
      entry.requestId = requestId;
    }

    if (userId) {
      entry.userId = userId;
    }

    // Add correlation ID if available
    if (context?.correlationId) {
      entry.correlationId = context.correlationId;
    }

    // Add session ID if available
    if (context?.sessionId) {
      entry.sessionId = context.sessionId;
    }

    return entry;
  }

  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };
    
    // Remove sensitive information
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'credentials',
    ];

    const sanitizeObject = (obj: any, depth = 0): any => {
      if (depth > 5) return '[Max Depth Reached]'; // Prevent infinite recursion
      
      if (obj === null || obj === undefined) return obj;
      
      if (typeof obj === 'string') {
        // Check if string contains sensitive information
        const lowerStr = obj.toLowerCase();
        if (sensitiveKeys.some(key => lowerStr.includes(key))) {
          return '[REDACTED]';
        }
        return obj;
      }
      
      if (typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, depth + 1));
      }
      
      const sanitizedObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
          sanitizedObj[key] = '[REDACTED]';
        } else {
          sanitizedObj[key] = sanitizeObject(value, depth + 1);
        }
      }
      
      return sanitizedObj;
    };

    return sanitizeObject(sanitized);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.config.format === 'pretty' && config.isDevelopment) {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const level = entry.level.padEnd(5);
      const context = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
      const requestId = entry.requestId ? ` [${entry.requestId}]` : '';
      
      return `${timestamp} ${level} ${entry.message}${requestId}${context}`;
    }
    
    return JSON.stringify(entry);
  }

  private output(entry: LogEntry): void {
    const formattedEntry = this.formatLogEntry(entry);
    
    // Console output
    if (this.config.enableConsole) {
      switch (LogLevel[entry.level as keyof typeof LogLevel]) {
        case LogLevel.DEBUG:
          console.debug(formattedEntry);
          break;
        case LogLevel.INFO:
          console.info(formattedEntry);
          break;
        case LogLevel.WARN:
          console.warn(formattedEntry);
          break;
        case LogLevel.ERROR:
          console.error(formattedEntry);
          break;
      }
    }
    
    // Buffer for potential file/remote logging
    this.addToBuffer(entry);
    
    // File logging (if enabled)
    if (this.config.enableFile) {
      this.writeToFile(entry);
    }
    
    // Remote logging (if enabled)
    if (this.config.enableRemote) {
      this.sendToRemote(entry);
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private writeToFile(entry: LogEntry): void {
    // File logging implementation would go here
    // This is a placeholder for future file logging functionality
    if (config.isDevelopment) {
      console.debug('File logging not implemented yet:', entry);
    }
  }

  private sendToRemote(entry: LogEntry): void {
    // Remote logging implementation would go here
    // This could integrate with services like Loggly, Papertrail, etc.
    if (config.isDevelopment) {
      console.debug('Remote logging not implemented yet:', entry);
    }
  }

  // Public logging methods
  public debug(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context, requestId, userId);
      this.output(entry);
    }
  }

  public info(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context, requestId, userId);
      this.output(entry);
    }
  }

  public warn(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, message, context, requestId, userId);
      this.output(entry);
    }
  }

  public error(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
    userId?: string
  ): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, context, requestId, userId);
      this.output(entry);
    }
  }

  // Utility methods
  public setLevel(level: LogLevel): void {
    this.logLevel = level;
    this.config.level = level;
  }

  public getLevel(): LogLevel {
    return this.logLevel;
  }

  public getBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  public clearBuffer(): void {
    this.logBuffer = [];
  }

  public getStats(): {
    bufferSize: number;
    currentLevel: string;
    config: LoggerConfig;
  } {
    return {
      bufferSize: this.logBuffer.length,
      currentLevel: LogLevel[this.logLevel],
      config: { ...this.config },
    };
  }

  // Performance logging
  public time(label: string, context?: Record<string, any>): () => void {
    const startTime = Date.now();
    const startEntry = this.createLogEntry(
      LogLevel.DEBUG,
      `Timer started: ${label}`,
      { ...context, timerLabel: label }
    );
    
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(startEntry);
    }

    return () => {
      const duration = Date.now() - startTime;
      const endEntry = this.createLogEntry(
        LogLevel.DEBUG,
        `Timer ended: ${label}`,
        {
          ...context,
          timerLabel: label,
          duration: `${duration}ms`,
          durationMs: duration,
        }
      );
      
      if (this.shouldLog(LogLevel.DEBUG)) {
        this.output(endEntry);
      }
    };
  }

  // HTTP request logging
  public httpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${url} ${statusCode} - ${duration}ms`;
    
    const entry = this.createLogEntry(level, message, {
      ...context,
      http: {
        method,
        url,
        statusCode,
        duration,
      },
    });
    
    if (this.shouldLog(level)) {
      this.output(entry);
    }
  }

  // Database query logging
  public dbQuery(
    query: string,
    duration: number,
    rowCount?: number,
    context?: Record<string, any>
  ): void {
    const message = `DB Query executed in ${duration}ms`;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, {
      ...context,
      database: {
        query: query.substring(0, 200), // Truncate long queries
        duration,
        rowCount,
      },
    });
    
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(entry);
    }
  }

  // Security event logging
  public security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, any>
  ): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    const message = `Security Event: ${event}`;
    
    const entry = this.createLogEntry(level, message, {
      ...context,
      security: {
        event,
        severity,
        timestamp: new Date().toISOString(),
      },
    });
    
    this.output(entry);
  }
}

// Create and export logger instance
export const logger = new Logger();

// Utility functions
export function createRequestLogger(requestId: string, userId?: string) {
  return {
    debug: (message: string, context?: Record<string, any>) => 
      logger.debug(message, context, requestId, userId),
    info: (message: string, context?: Record<string, any>) => 
      logger.info(message, context, requestId, userId),
    warn: (message: string, context?: Record<string, any>) => 
      logger.warn(message, context, requestId, userId),
    error: (message: string, context?: Record<string, any>) => 
      logger.error(message, context, requestId, userId),
  };
}

export function withLogging<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  return ((...args: any[]) => {
    const functionName = name || fn.name || 'anonymous';
    const endTimer = logger.time(`Function: ${functionName}`);
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result
          .then((value) => {
            endTimer();
            return value;
          })
          .catch((error) => {
            logger.error(`Function ${functionName} failed`, {
              error: error.message,
              stack: error.stack,
            });
            endTimer();
            throw error;
          });
      }
      
      endTimer();
      return result;
    } catch (error) {
      logger.error(`Function ${functionName} failed`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      endTimer();
      throw error;
    }
  }) as T;
}

// Express middleware for request logging
export function requestLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || 
                     req.headers['x-correlation-id'] || 
                     Math.random().toString(36).substring(7);
    
    // Add request ID to request object
    req.requestId = requestId;
    
    // Log request start
    logger.info('Request started', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      requestId,
    });
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      
      logger.httpRequest(
        req.method,
        req.url,
        res.statusCode,
        duration,
        {
          requestId,
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection.remoteAddress,
        }
      );
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
}