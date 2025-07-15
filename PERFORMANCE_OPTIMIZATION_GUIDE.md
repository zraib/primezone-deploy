# Performance Optimization Guide

## 🚀 Overview

This comprehensive guide outlines performance optimization strategies, implementation techniques, and monitoring practices for the Panorama Viewer application to ensure optimal user experience and system efficiency.

## 📊 Performance Metrics & Targets

### Core Web Vitals

```typescript
// Performance targets
const PERFORMANCE_TARGETS = {
  // Core Web Vitals
  LCP: 2.5, // Largest Contentful Paint (seconds)
  FID: 100, // First Input Delay (milliseconds)
  CLS: 0.1, // Cumulative Layout Shift
  
  // Additional metrics
  FCP: 1.8, // First Contentful Paint (seconds)
  TTI: 3.8, // Time to Interactive (seconds)
  TBT: 200, // Total Blocking Time (milliseconds)
  SI: 3.4, // Speed Index (seconds)
  
  // Custom metrics
  API_RESPONSE: 500, // API response time (milliseconds)
  IMAGE_LOAD: 2000, // Image load time (milliseconds)
  BUNDLE_SIZE: 500, // JavaScript bundle size (KB)
};
```

### Performance Budget

```json
{
  "budgets": [
    {
      "type": "bundle",
      "name": "main",
      "baseline": "500kb",
      "maximum": "600kb",
      "warning": "550kb"
    },
    {
      "type": "initial",
      "maximum": "300kb",
      "warning": "250kb"
    },
    {
      "type": "anyComponentStyle",
      "maximum": "50kb"
    },
    {
      "type": "any",
      "maximum": "2mb"
    }
  ]
}
```

## 🎯 Frontend Optimization

### 1. Code Splitting & Lazy Loading

```typescript
// src/components/LazyComponents.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Lazy load heavy components
const PanoramaViewer = lazy(() => import('@/components/PanoramaViewer'));
const ProjectEditor = lazy(() => import('@/components/ProjectEditor'));
const FileUploader = lazy(() => import('@/components/FileUploader'));
const AnalyticsDashboard = lazy(() => import('@/components/AnalyticsDashboard'));

// HOC for lazy loading with error boundary
export function withLazyLoading<T extends object>(
  Component: React.LazyExoticComponent<React.ComponentType<T>>,
  fallback?: React.ReactNode
) {
  return function LazyComponent(props: T) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Usage examples
export const LazyPanoramaViewer = withLazyLoading(PanoramaViewer);
export const LazyProjectEditor = withLazyLoading(ProjectEditor);
export const LazyFileUploader = withLazyLoading(FileUploader);
export const LazyAnalyticsDashboard = withLazyLoading(AnalyticsDashboard);
```

### 2. Image Optimization

```typescript
// src/components/OptimizedImage.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 85,
  className,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate blur placeholder if not provided
  const defaultBlurDataURL = 
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

  return (
    <div className={`relative ${className || ''}`}>
      {hasError ? (
        <div className="flex items-center justify-center bg-gray-200 text-gray-500">
          Failed to load image
        </div>
      ) : (
        <>
          <Image
            ref={imgRef}
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            placeholder={placeholder}
            blurDataURL={blurDataURL || defaultBlurDataURL}
            sizes={sizes}
            quality={quality}
            onLoad={handleLoad}
            onError={handleError}
            className={`transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-pulse bg-gray-300 rounded w-full h-full" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Image optimization utility
export class ImageOptimizer {
  static generateBlurDataURL(width: number = 10, height: number = 10): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Create gradient blur effect
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6');
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  }

  static getOptimalSizes(breakpoints: Record<string, number>): string {
    return Object.entries(breakpoints)
      .map(([size, width]) => `(max-width: ${width}px) ${size}`)
      .join(', ');
  }

  static calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}/${height / divisor}`;
  }
}
```

### 3. Virtual Scrolling for Large Lists

```typescript
// src/components/VirtualList.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className={`overflow-auto ${className || ''}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Usage example
export const ProjectList: React.FC<{ projects: Project[] }> = ({ projects }) => {
  return (
    <VirtualList
      items={projects}
      itemHeight={80}
      containerHeight={400}
      renderItem={(project, index) => (
        <ProjectCard key={project.id} project={project} />
      )}
      className="border rounded-lg"
    />
  );
};
```

### 4. Memoization & Performance Hooks

```typescript
// src/hooks/usePerformance.ts
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash-es';

// Debounced callback hook
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback as T;
}

// Throttled callback hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledCallback = useMemo(
    () => throttle(callback, delay),
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      throttledCallback.cancel();
    };
  }, [throttledCallback]);

  return throttledCallback as T;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return { elementRef, isIntersecting, entry };
}

// Performance measurement hook
export function usePerformanceMeasure(name: string) {
  const startTime = useRef<number>(0);

  const start = useCallback(() => {
    startTime.current = performance.now();
    performance.mark(`${name}-start`);
  }, [name]);

  const end = useCallback(() => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    return duration;
  }, [name]);

  return { start, end };
}

// Memory usage monitoring hook
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo((performance as any).memory);
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}
```

## ⚡ Backend Optimization

### 1. API Response Optimization

```typescript
// src/lib/api-optimization.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

// Response compression middleware
export function withCompression(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.json to add compression
    res.json = function (data: any) {
      return compressResponse.call(this, data, 'application/json');
    };

    // Override res.send to add compression
    res.send = function (data: any) {
      return compressResponse.call(this, data, 'text/html');
    };

    async function compressResponse(data: any, contentType: string) {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      
      if (acceptEncoding.includes('gzip')) {
        try {
          const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
          const compressed = await gzipAsync(Buffer.from(jsonString));
          
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', compressed.length);
          
          return res.end(compressed);
        } catch (error) {
          // Fallback to uncompressed
          return originalJson.call(res, data);
        }
      }
      
      return originalJson.call(res, data);
    }

    return handler(req, res);
  };
}

// Response caching middleware
export function withCaching(
  ttl: number = 300, // 5 minutes default
  cacheKey?: (req: NextApiRequest) => string
) {
  const cache = new Map<string, { data: any; expires: number }>();

  return function (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return handler(req, res);
      }

      const key = cacheKey ? cacheKey(req) : `${req.url}?${JSON.stringify(req.query)}`;
      const now = Date.now();
      const cached = cache.get(key);

      // Return cached response if valid
      if (cached && cached.expires > now) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${Math.floor((cached.expires - now) / 1000)}`);
        return res.json(cached.data);
      }

      // Override res.json to cache response
      const originalJson = res.json;
      res.json = function (data: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(key, {
            data,
            expires: now + (ttl * 1000),
          });
        }
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        return originalJson.call(res, data);
      };

      return handler(req, res);
    };
  };
}

// Pagination helper
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / options.limit);
  
  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasNext: options.page < totalPages,
      hasPrev: options.page > 1,
    },
  };
}
```

### 2. Database Query Optimization

```typescript
// src/lib/database-optimization.ts
import { Pool } from 'pg';
import { logger } from '@/lib/logger';
import { performanceMonitor } from '@/lib/performance-monitor';

export class OptimizedDatabase {
  private pool: Pool;
  private queryCache = new Map<string, { result: any; expires: number }>();

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query<T = any>(
    text: string,
    params?: any[],
    options: { cache?: boolean; cacheTTL?: number } = {}
  ): Promise<T[]> {
    const startTime = performance.now();
    const cacheKey = options.cache ? `${text}:${JSON.stringify(params)}` : null;
    
    // Check cache first
    if (cacheKey && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      if (cached.expires > Date.now()) {
        performanceMonitor.recordMetric('db.query.cache_hit', performance.now() - startTime, 'ms');
        return cached.result;
      }
      this.queryCache.delete(cacheKey);
    }

    try {
      const result = await this.pool.query(text, params);
      const duration = performance.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow database query detected', {
          query: text,
          params,
          duration,
        });
      }
      
      // Cache result if requested
      if (cacheKey) {
        this.queryCache.set(cacheKey, {
          result: result.rows,
          expires: Date.now() + (options.cacheTTL || 300000), // 5 minutes default
        });
      }
      
      performanceMonitor.recordMetric('db.query.duration', duration, 'ms');
      performanceMonitor.recordMetric('db.query.rows', result.rows.length, 'count');
      
      return result.rows;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error('Database query failed', {
        query: text,
        params,
        duration,
        error,
      });
      
      performanceMonitor.recordMetric('db.query.error', duration, 'ms');
      throw error;
    }
  }

  // Optimized pagination query
  async paginatedQuery<T = any>(
    baseQuery: string,
    countQuery: string,
    params: any[],
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<T>> {
    const offset = (pagination.page - 1) * pagination.limit;
    
    // Build ORDER BY clause
    const orderBy = pagination.sortBy 
      ? `ORDER BY ${pagination.sortBy} ${pagination.sortOrder || 'ASC'}`
      : '';
    
    const paginatedQuery = `
      ${baseQuery}
      ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const [data, countResult] = await Promise.all([
      this.query<T>(paginatedQuery, [...params, pagination.limit, offset]),
      this.query<{ count: string }>(countQuery, params, { cache: true, cacheTTL: 60000 })
    ]);
    
    const total = parseInt(countResult[0]?.count || '0', 10);
    
    return createPaginatedResponse(data, total, pagination);
  }

  // Batch operations
  async batchInsert<T>(
    table: string,
    columns: string[],
    data: T[][],
    batchSize: number = 1000
  ): Promise<void> {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const placeholders = batch
        .map((_, rowIndex) => 
          `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
        )
        .join(', ');
      
      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
      const params = batch.flat();
      
      await this.query(query, params);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

## 📦 Bundle Optimization

### 1. Webpack Configuration

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Enable SWC minification
  swcMinify: true,
  
  // Experimental features
  experimental: {
    // Enable modern JavaScript features
    esmExternals: true,
    // Enable React 18 features
    reactRoot: true,
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Split chunks optimization
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
      
      // Module concatenation
      config.optimization.concatenateModules = true;
    }
    
    // Resolve optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use ES modules for better tree shaking
      'lodash': 'lodash-es',
    };
    
    return config;
  },
  
  // Image optimization
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Compression
  compress: true,
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
});
```

### 2. Dynamic Imports

```typescript
// src/utils/dynamic-imports.ts

// Lazy load heavy libraries
export const loadChartLibrary = () => import('chart.js');
export const loadPDFLibrary = () => import('jspdf');
export const loadImageEditor = () => import('fabric');

// Dynamic component loading with error handling
export async function loadComponent<T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
): Promise<T> {
  try {
    const module = await importFn();
    return module.default;
  } catch (error) {
    console.error('Failed to load component:', error);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

// Usage example
export const DynamicChart: React.FC<ChartProps> = (props) => {
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<ChartProps> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComponent(
      () => import('@/components/Chart'),
      null
    )
      .then(setChartComponent)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading chart...</div>;
  if (error) return <div>Error loading chart: {error}</div>;
  if (!ChartComponent) return null;

  return <ChartComponent {...props} />;
};
```

## 🔍 Performance Monitoring

### 1. Real User Monitoring (RUM)

```typescript
// src/lib/performance-monitoring.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export class PerformanceMonitoring {
  private metrics: PerformanceMetric[] = [];
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.initializeWebVitals();
  }

  private initializeWebVitals(): void {
    // Collect Core Web Vitals
    getCLS(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));
  }

  private handleMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Send to analytics
    this.sendMetric(metric);
    
    // Log poor performance
    if (metric.rating === 'poor') {
      console.warn(`Poor ${metric.name} performance:`, metric.value);
    }
  }

  private async sendMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metric,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to send performance metric:', error);
    }
  }

  // Custom performance measurements
  measureCustomMetric(name: string, startTime: number, endTime: number): void {
    const value = endTime - startTime;
    const metric: PerformanceMetric = {
      name,
      value,
      rating: this.getRating(name, value),
      delta: value,
      id: `${name}-${Date.now()}`,
      navigationType: 'navigate',
    };
    
    this.handleMetric(metric);
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: [2500, 4000],
      FID: [100, 300],
      CLS: [0.1, 0.25],
      FCP: [1800, 3000],
      TTFB: [800, 1800],
    };
    
    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';
    
    if (value <= threshold[0]) return 'good';
    if (value <= threshold[1]) return 'needs-improvement';
    return 'poor';
  }

  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  getAverageMetric(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return 0;
    
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }
}

// Initialize performance monitoring
export const performanceMonitoring = new PerformanceMonitoring('/api/analytics/performance');
```

### 2. Performance Dashboard Component

```typescript
// src/components/PerformanceDashboard.tsx
import { useState, useEffect } from 'react';
import { performanceMonitoring } from '@/lib/performance-monitoring';
import { performanceMonitor } from '@/lib/performance-monitor';

interface PerformanceStats {
  coreWebVitals: Record<string, number>;
  customMetrics: Record<string, number>;
  resourceTiming: PerformanceResourceTiming[];
  memoryUsage?: any;
}

export const PerformanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get Core Web Vitals
        const coreWebVitals = {
          LCP: performanceMonitoring.getAverageMetric('LCP'),
          FID: performanceMonitoring.getAverageMetric('FID'),
          CLS: performanceMonitoring.getAverageMetric('CLS'),
          FCP: performanceMonitoring.getAverageMetric('FCP'),
          TTFB: performanceMonitoring.getAverageMetric('TTFB'),
        };

        // Get custom metrics
        const customMetrics = {
          'API Response Time': performanceMonitor.getStats('api.response_time')?.avg || 0,
          'Image Load Time': performanceMonitor.getStats('image.load_time')?.avg || 0,
          'Component Render Time': performanceMonitor.getStats('component.render_time')?.avg || 0,
        };

        // Get resource timing
        const resourceTiming = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

        // Get memory usage (if available)
        const memoryUsage = (performance as any).memory;

        setStats({
          coreWebVitals,
          customMetrics,
          resourceTiming: resourceTiming.slice(0, 10), // Top 10 resources
          memoryUsage,
        });
      } catch (error) {
        console.error('Failed to load performance stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4">Loading performance data...</div>;
  }

  if (!stats) {
    return <div className="p-4">Failed to load performance data</div>;
  }

  const getScoreColor = (score: number, thresholds: [number, number]) => {
    if (score <= thresholds[0]) return 'text-green-600';
    if (score <= thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Performance Dashboard</h2>
      
      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">LCP</h3>
          <p className={`text-2xl font-bold ${getScoreColor(stats.coreWebVitals.LCP, [2500, 4000])}`}>
            {stats.coreWebVitals.LCP.toFixed(0)}ms
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">FID</h3>
          <p className={`text-2xl font-bold ${getScoreColor(stats.coreWebVitals.FID, [100, 300])}`}>
            {stats.coreWebVitals.FID.toFixed(0)}ms
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">CLS</h3>
          <p className={`text-2xl font-bold ${getScoreColor(stats.coreWebVitals.CLS * 1000, [100, 250])}`}>
            {stats.coreWebVitals.CLS.toFixed(3)}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">FCP</h3>
          <p className={`text-2xl font-bold ${getScoreColor(stats.coreWebVitals.FCP, [1800, 3000])}`}>
            {stats.coreWebVitals.FCP.toFixed(0)}ms
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">TTFB</h3>
          <p className={`text-2xl font-bold ${getScoreColor(stats.coreWebVitals.TTFB, [800, 1800])}`}>
            {stats.coreWebVitals.TTFB.toFixed(0)}ms
          </p>
        </div>
      </div>

      {/* Custom Metrics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Custom Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats.customMetrics).map(([name, value]) => (
            <div key={name} className="text-center">
              <p className="text-sm text-gray-500">{name}</p>
              <p className="text-xl font-bold">{value.toFixed(0)}ms</p>
            </div>
          ))}
        </div>
      </div>

      {/* Memory Usage */}
      {stats.memoryUsage && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Memory Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Used JS Heap</p>
              <p className="text-xl font-bold">
                {(stats.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total JS Heap</p>
              <p className="text-xl font-bold">
                {(stats.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Heap Limit</p>
              <p className="text-xl font-bold">
                {(stats.memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resource Timing */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Slowest Resources</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.resourceTiming
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 5)
                .map((resource, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {resource.name.split('/').pop()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {resource.duration.toFixed(0)}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {resource.transferSize ? `${(resource.transferSize / 1024).toFixed(1)}KB` : 'N/A'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
```

## 📋 Performance Optimization Checklist

### ✅ Frontend Optimization
- [ ] Code splitting implemented
- [ ] Lazy loading for components and routes
- [ ] Image optimization with Next.js Image
- [ ] Virtual scrolling for large lists
- [ ] Memoization for expensive calculations
- [ ] Debouncing for user inputs
- [ ] Service worker for caching
- [ ] Bundle size optimization

### ✅ Backend Optimization
- [ ] Database query optimization
- [ ] API response caching
- [ ] Response compression
- [ ] Connection pooling
- [ ] Batch operations
- [ ] Pagination implementation
- [ ] Rate limiting
- [ ] CDN integration

### ✅ Monitoring & Analytics
- [ ] Core Web Vitals tracking
- [ ] Custom performance metrics
- [ ] Real User Monitoring (RUM)
- [ ] Error tracking
- [ ] Performance budgets
- [ ] Automated alerts
- [ ] Regular performance audits

### ✅ Infrastructure
- [ ] CDN configuration
- [ ] Caching strategies
- [ ] Load balancing
- [ ] Auto-scaling
- [ ] Database optimization
- [ ] Asset optimization
- [ ] Network optimization

---

**Last Updated**: December 2024  
**Version**: 1.0.0