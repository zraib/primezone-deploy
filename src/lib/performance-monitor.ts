/**
 * Performance Monitoring System
 * Provides comprehensive performance tracking, metrics collection, and optimization insights
 */

import { logger } from './logger';
import { config } from './environment';

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  context?: Record<string, any>;
}

export interface TimingMetric extends PerformanceMetric {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface MemoryMetric {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

export interface NetworkMetric {
  url: string;
  method: string;
  statusCode: number;
  duration: number;
  size: number;
  timestamp: number;
}

export interface DatabaseMetric {
  query: string;
  duration: number;
  rowCount?: number;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  timestamp: number;
}

export interface FileOperationMetric {
  operation: 'upload' | 'download' | 'delete' | 'read' | 'write';
  fileName: string;
  fileSize: number;
  duration: number;
  success: boolean;
  timestamp: number;
}

// Performance thresholds
export interface PerformanceThresholds {
  apiResponse: number; // ms
  databaseQuery: number; // ms
  fileUpload: number; // ms
  memoryUsage: number; // percentage
  errorRate: number; // percentage
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private timers: Map<string, { startTime: number; context?: Record<string, any> }> = new Map();
  private thresholds: PerformanceThresholds;
  private maxMetricsPerType = 1000;
  private cleanupInterval: NodeJS.Timeout | undefined;

  private constructor() {
    this.thresholds = this.loadThresholds();
    this.startCleanupInterval();
    this.initializePerformanceObserver();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private loadThresholds(): PerformanceThresholds {
    return {
      apiResponse: parseInt(process.env.PERF_THRESHOLD_API_RESPONSE || '1000'),
      databaseQuery: parseInt(process.env.PERF_THRESHOLD_DB_QUERY || '500'),
      fileUpload: parseInt(process.env.PERF_THRESHOLD_FILE_UPLOAD || '5000'),
      memoryUsage: parseInt(process.env.PERF_THRESHOLD_MEMORY_USAGE || '80'),
      errorRate: parseInt(process.env.PERF_THRESHOLD_ERROR_RATE || '5'),
    };
  }

  private startCleanupInterval(): void {
    // Clean up old metrics every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 10 * 60 * 1000);
  }

  private initializePerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Observe navigation timing
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordNavigationMetrics(entry as PerformanceNavigationTiming);
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });

        // Observe resource timing
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              this.recordResourceMetrics(entry as PerformanceResourceTiming);
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });

        // Observe paint timing
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              this.recordPaintMetrics(entry);
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        logger.warn('Failed to initialize PerformanceObserver', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  }

  private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
    const metrics = [
      { name: 'navigation.domContentLoaded', value: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart },
      { name: 'navigation.loadComplete', value: entry.loadEventEnd - entry.loadEventStart },
      { name: 'navigation.domInteractive', value: entry.domInteractive },
      { name: 'navigation.firstByte', value: entry.responseStart - entry.requestStart },
    ];

    metrics.forEach(metric => {
      this.recordMetric(metric.name, metric.value, 'ms', {
        type: 'navigation',
        url: window.location.href,
      });
    });
  }

  private recordResourceMetrics(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize || 0;

    this.recordMetric('resource.loadTime', duration, 'ms', {
      type: 'resource',
      url: entry.name,
      resourceType: this.getResourceType(entry.name),
      size: size.toString(),
    });
  }

  private recordPaintMetrics(entry: PerformanceEntry): void {
    this.recordMetric(`paint.${entry.name}`, entry.startTime, 'ms', {
      type: 'paint',
    });
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(js|jsx|ts|tsx)$/)) return 'script';
    if (url.match(/\.(css|scss|sass)$/)) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Record a performance metric
   */
  public recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    tags?: Record<string, string>,
    context?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
      context,
    };

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);

    // Maintain size limit
    if (metricArray.length > this.maxMetricsPerType) {
      metricArray.shift();
    }

    // Check thresholds and log warnings
    this.checkThresholds(metric);

    // Log metric if performance monitoring is enabled
    if (config.features.performanceMonitoring) {
      logger.debug('Performance metric recorded', {
        metric: {
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          tags: metric.tags,
        },
      });
    }
  }

  /**
   * Start a timer for measuring duration
   */
  public startTimer(name: string, context?: Record<string, any>): () => void {
    const startTime = Date.now();
    this.timers.set(name, { startTime, context });

    return () => {
      this.endTimer(name);
    };
  }

  /**
   * End a timer and record the duration
   */
  public endTimer(name: string, tags?: Record<string, string>): number {
    const timer = this.timers.get(name);
    if (!timer) {
      logger.warn('Timer not found', { timerName: name });
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - timer.startTime;

    this.recordMetric(name, duration, 'ms', tags, timer.context);
    this.timers.delete(name);

    return duration;
  }

  /**
   * Measure function execution time
   */
  public measureFunction<T>(
    fn: () => T,
    name: string,
    tags?: Record<string, string>
  ): T {
    const endTimer = this.startTimer(name);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result
          .then((value) => {
            endTimer();
            return value;
          })
          .catch((error) => {
            endTimer();
            throw error;
          }) as T;
      }
      
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Measure async function execution time
   */
  public async measureAsync<T>(
    fn: () => Promise<T>,
    name: string,
    tags?: Record<string, string>
  ): Promise<T> {
    const endTimer = this.startTimer(name);
    
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Record API request metrics
   */
  public recordApiMetric(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    size?: number
  ): void {
    this.recordMetric('api.request', duration, 'ms', {
      method,
      endpoint,
      statusCode: statusCode.toString(),
      success: (statusCode < 400).toString(),
    }, {
      size,
    });
  }

  /**
   * Record database query metrics
   */
  public recordDatabaseMetric(
    query: string,
    duration: number,
    rowCount?: number,
    operation: DatabaseMetric['operation'] = 'OTHER'
  ): void {
    this.recordMetric('database.query', duration, 'ms', {
      operation,
      hasResults: (rowCount !== undefined && rowCount > 0).toString(),
    }, {
      query: query.substring(0, 100), // Truncate long queries
      rowCount,
    });
  }

  /**
   * Record file operation metrics
   */
  public recordFileOperationMetric(
    operation: FileOperationMetric['operation'],
    fileName: string,
    fileSize: number,
    duration: number,
    success: boolean
  ): void {
    this.recordMetric('file.operation', duration, 'ms', {
      operation,
      success: success.toString(),
      sizeCategory: this.getFileSizeCategory(fileSize),
    }, {
      fileName,
      fileSize,
    });
  }

  /**
   * Record memory usage
   */
  public recordMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal;
      const usedMem = memUsage.heapUsed;
      const percentage = (usedMem / totalMem) * 100;

      this.recordMetric('memory.usage', percentage, '%', {
        type: 'heap',
      }, {
        used: usedMem,
        total: totalMem,
        external: memUsage.external,
        rss: memUsage.rss,
      });
    }
  }

  /**
   * Get performance statistics
   */
  public getStats(metricName?: string): Record<string, any> {
    if (metricName) {
      const metrics = this.metrics.get(metricName) || [];
      return this.calculateStats(metrics);
    }

    const stats: Record<string, any> = {};
    for (const [name, metrics] of this.metrics.entries()) {
      stats[name] = this.calculateStats(metrics);
    }

    return stats;
  }

  /**
   * Calculate statistics for a set of metrics
   */
  private calculateStats(metrics: PerformanceMetric[]): Record<string, any> {
    if (metrics.length === 0) {
      return { count: 0 };
    }

    const values = metrics.map(m => m.value);
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    return {
      count: metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(avg * 100) / 100,
      median: this.getPercentile(sorted, 50),
      p95: this.getPercentile(sorted, 95),
      p99: this.getPercentile(sorted, 99),
      sum,
      latest: metrics[metrics.length - 1],
    };
  }

  /**
   * Get percentile value
   */
  private getPercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const { name, value, tags } = metric;

    let threshold: number | undefined;
    let thresholdType: string | undefined;

    if (name.includes('api.request')) {
      threshold = this.thresholds.apiResponse;
      thresholdType = 'API Response Time';
    } else if (name.includes('database.query')) {
      threshold = this.thresholds.databaseQuery;
      thresholdType = 'Database Query Time';
    } else if (name.includes('file.operation')) {
      threshold = this.thresholds.fileUpload;
      thresholdType = 'File Operation Time';
    } else if (name.includes('memory.usage')) {
      threshold = this.thresholds.memoryUsage;
      thresholdType = 'Memory Usage';
    }

    if (threshold && thresholdType && value > threshold) {
      logger.warn(`Performance threshold exceeded: ${thresholdType}`, {
        metric: {
          name,
          value,
          threshold,
          tags,
        },
        performance: {
          exceedsThreshold: true,
          thresholdType,
        },
      });
    }
  }

  /**
   * Get file size category for grouping
   */
  private getFileSizeCategory(size: number): string {
    if (size < 1024) return 'tiny'; // < 1KB
    if (size < 1024 * 1024) return 'small'; // < 1MB
    if (size < 10 * 1024 * 1024) return 'medium'; // < 10MB
    if (size < 100 * 1024 * 1024) return 'large'; // < 100MB
    return 'huge'; // >= 100MB
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [name, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(name, filteredMetrics);
    }

    logger.debug('Performance metrics cleanup completed', {
      totalMetricTypes: this.metrics.size,
      cutoffTime: new Date(cutoffTime).toISOString(),
    });
  }

  /**
   * Generate performance report
   */
  public generateReport(): {
    summary: Record<string, any>;
    details: Record<string, any>;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const recommendations: string[] = [];

    // Analyze API performance
    const apiStats = stats['api.request'];
    if (apiStats && apiStats.avg > this.thresholds.apiResponse) {
      recommendations.push(`API response time is high (${apiStats.avg}ms avg). Consider optimizing slow endpoints.`);
    }

    // Analyze database performance
    const dbStats = stats['database.query'];
    if (dbStats && dbStats.avg > this.thresholds.databaseQuery) {
      recommendations.push(`Database queries are slow (${dbStats.avg}ms avg). Consider adding indexes or optimizing queries.`);
    }

    // Analyze memory usage
    const memStats = stats['memory.usage'];
    if (memStats && memStats.latest && memStats.latest.value > this.thresholds.memoryUsage) {
      recommendations.push(`Memory usage is high (${memStats.latest.value}%). Consider optimizing memory usage.`);
    }

    return {
      summary: {
        totalMetrics: Object.keys(stats).length,
        reportGeneratedAt: new Date().toISOString(),
        environment: config.env,
        thresholds: this.thresholds,
      },
      details: stats,
      recommendations,
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  public exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusFormat();
    }

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: config.env,
      metrics: this.getStats(),
    }, null, 2);
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheusFormat(): string {
    const lines: string[] = [];
    
    for (const [name, metrics] of this.metrics.entries()) {
      const stats = this.calculateStats(metrics);
      const metricName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      
      lines.push(`# HELP ${metricName}_avg Average value`);
      lines.push(`# TYPE ${metricName}_avg gauge`);
      lines.push(`${metricName}_avg ${stats.avg || 0}`);
      
      lines.push(`# HELP ${metricName}_count Total count`);
      lines.push(`# TYPE ${metricName}_count counter`);
      lines.push(`${metricName}_count ${stats.count || 0}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Destroy the performance monitor
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.metrics.clear();
    this.timers.clear();
  }
}

// Create and export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility functions
export function measureTime<T>(fn: () => T, name: string): T {
  return performanceMonitor.measureFunction(fn, name);
}

export function measureTimeAsync<T>(fn: () => Promise<T>, name: string): Promise<T> {
  return performanceMonitor.measureAsync(fn, name);
}

export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  return ((...args: any[]) => {
    const functionName = name || fn.name || 'anonymous';
    return performanceMonitor.measureFunction(() => fn(...args), `function.${functionName}`);
  }) as T;
}

export function withAsyncPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name?: string
): T {
  return (async (...args: any[]) => {
    const functionName = name || fn.name || 'anonymous';
    return performanceMonitor.measureAsync(() => fn(...args), `function.${functionName}`);
  }) as T;
}

// React hook for performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  if (typeof window === 'undefined') {
    return {
      startTimer: () => () => {},
      recordMetric: () => {},
    };
  }

  const startTimer = (operation: string) => {
    return performanceMonitor.startTimer(`component.${componentName}.${operation}`);
  };

  const recordMetric = (name: string, value: number, unit: string = 'ms') => {
    performanceMonitor.recordMetric(`component.${componentName}.${name}`, value, unit);
  };

  return {
    startTimer,
    recordMetric,
  };
}

// Automatic memory monitoring
if (typeof process !== 'undefined') {
  setInterval(() => {
    performanceMonitor.recordMemoryUsage();
  }, 30000); // Every 30 seconds
}