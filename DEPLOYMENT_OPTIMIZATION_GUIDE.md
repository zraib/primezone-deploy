# Deployment Optimization Guide

## 🚀 Overview

This guide provides comprehensive deployment optimization strategies for the Panorama Viewer application, covering build optimization, infrastructure setup, monitoring, and best practices for production deployments.

## 📦 Build Optimization

### 1. Next.js Build Configuration

```javascript
// next.config.js - Production Optimized
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(withBundleAnalyzer({
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Experimental features for optimization
  experimental: {
    // Modern JavaScript output
    esmExternals: true,
    // Server components (if using React 18)
    serverComponents: true,
    // Concurrent features
    concurrentFeatures: true,
    // Runtime optimization
    runtime: 'nodejs',
  },
  
  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
    // React optimization
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  
  // Output configuration
  output: 'standalone', // For Docker deployments
  
  // Webpack optimization
  webpack: (config, { dev, isServer, webpack }) => {
    if (!dev) {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        // Enable tree shaking
        usedExports: true,
        sideEffects: false,
        // Module concatenation
        concatenateModules: true,
        // Split chunks optimization
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
            styles: {
              name: 'styles',
              test: /\.(css|scss)$/,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      };
      
      // Compression plugins
      config.plugins.push(
        new webpack.optimize.AggressiveMergingPlugin(),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production'),
        })
      );
    }
    
    // Resolve optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use ES modules for better tree shaking
      'lodash': 'lodash-es',
      // Optimize React imports
      'react': 'react/index.js',
      'react-dom': 'react-dom/index.js',
    };
    
    return config;
  },
  
  // Image optimization
  images: {
    domains: [
      'your-s3-bucket.s3.amazonaws.com',
      'your-cdn-domain.com',
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Compression
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
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
  
  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Public runtime config
  publicRuntimeConfig: {
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  },
}));
```

### 2. Package.json Scripts Optimization

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "build:analyze": "ANALYZE=true npm run build",
    "build:production": "NODE_ENV=production npm run build",
    "build:docker": "docker build -t panorama-viewer .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "e2e": "playwright test",
    "e2e:headed": "playwright test --headed",
    "lighthouse": "lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html",
    "bundle-analyzer": "npm run build:analyze && npx serve .next/static",
    "security-audit": "npm audit && npm audit fix",
    "performance-test": "npm run build && npm run start & sleep 10 && npm run lighthouse",
    "deploy:staging": "npm run build && npm run test && git push origin develop",
    "deploy:production": "npm run build && npm run test && npm run e2e && git push origin main",
    "health-check": "curl -f http://localhost:3000/api/health || exit 1",
    "precommit": "lint-staged",
    "prepare": "husky install"
  }
}
```

## 🐳 Docker Optimization

### 1. Multi-stage Dockerfile

```dockerfile
# Dockerfile - Optimized for production
# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "server.js"]
```

### 2. Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - S3_REGION=${S3_REGION}
      - S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
      - S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
      - S3_BUCKET_NAME=${S3_BUCKET_NAME}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis_data:

networks:
  default:
    driver: bridge
```

### 3. Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Brotli compression (if module available)
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    server {
        listen 80;
        server_name your-domain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; child-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';";
        
        # Static file caching
        location /_next/static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://app;
        }
        
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://app;
        }
        
        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Login rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Main application
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

## ☁️ AWS Amplify Optimization

### 1. Amplify Build Specification

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo "Installing dependencies..."
        - npm ci --cache .npm --prefer-offline --no-audit
        - echo "Running security audit..."
        - npm audit --audit-level moderate
    build:
      commands:
        - echo "Building application..."
        - npm run build
        - echo "Running tests..."
        - npm run test -- --coverage --watchAll=false
        - echo "Type checking..."
        - npm run type-check
    postBuild:
      commands:
        - echo "Build completed successfully"
        - echo "Generating sitemap..."
        - npm run generate-sitemap
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .npm/**/*
      - .next/cache/**/*
      - node_modules/**/*
  customHeaders:
    - pattern: '**/*'
      headers:
        - key: 'X-Frame-Options'
          value: 'DENY'
        - key: 'X-Content-Type-Options'
          value: 'nosniff'
        - key: 'Referrer-Policy'
          value: 'strict-origin-when-cross-origin'
    - pattern: '/_next/static/**/*'
      headers:
        - key: 'Cache-Control'
          value: 'public, max-age=31536000, immutable'
    - pattern: '/static/**/*'
      headers:
        - key: 'Cache-Control'
          value: 'public, max-age=31536000, immutable'
```

### 2. Environment Configuration Script

```bash
#!/bin/bash
# scripts/setup-amplify-env.sh

set -e

echo "Setting up Amplify environment variables..."

# Required environment variables
required_vars=(
    "S3_REGION"
    "S3_ACCESS_KEY_ID"
    "S3_SECRET_ACCESS_KEY"
    "S3_BUCKET_NAME"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
)

# Check if all required variables are set
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set"
        exit 1
    fi
done

echo "All required environment variables are set"

# Validate S3 configuration
echo "Validating S3 configuration..."
aws s3 ls s3://$S3_BUCKET_NAME --region $S3_REGION > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "S3 bucket access validated successfully"
else
    echo "Error: Cannot access S3 bucket"
    exit 1
fi

echo "Environment setup completed successfully"
```

### 3. Performance Monitoring Setup

```typescript
// src/lib/amplify-monitoring.ts
import { Amplify } from 'aws-amplify';

// Configure Amplify Analytics
export function configureAmplifyMonitoring() {
  if (typeof window !== 'undefined') {
    // Client-side monitoring
    Amplify.configure({
      Analytics: {
        AWSPinpoint: {
          appId: process.env.NEXT_PUBLIC_PINPOINT_APP_ID,
          region: process.env.NEXT_PUBLIC_AWS_REGION,
        },
      },
    });
    
    // Track page views
    const trackPageView = (url: string) => {
      if (window.gtag) {
        window.gtag('config', process.env.NEXT_PUBLIC_GA_TRACKING_ID, {
          page_location: url,
        });
      }
    };
    
    // Track performance metrics
    const trackPerformance = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        // Track Core Web Vitals
        import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          getCLS(console.log);
          getFID(console.log);
          getFCP(console.log);
          getLCP(console.log);
          getTTFB(console.log);
        });
        
        // Track custom metrics
        const metrics = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstByte: navigation.responseStart - navigation.requestStart,
        };
        
        console.log('Performance metrics:', metrics);
      }
    };
    
    // Initialize tracking
    trackPageView(window.location.href);
    trackPerformance();
  }
}
```

## 🔍 Monitoring & Alerting

### 1. Health Check API

```typescript
// src/pages/api/health.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { performance } from 'perf_hooks';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database?: boolean;
    s3?: boolean;
    memory?: boolean;
    disk?: boolean;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    responseTime: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheck>
) {
  const startTime = performance.now();
  
  try {
    // Perform health checks
    const checks = {
      database: await checkDatabase(),
      s3: await checkS3(),
      memory: checkMemory(),
      disk: await checkDisk(),
    };
    
    const allHealthy = Object.values(checks).every(check => check === true);
    const responseTime = performance.now() - startTime;
    
    const healthCheck: HealthCheck = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: {
        memoryUsage: process.memoryUsage(),
        responseTime,
      },
    };
    
    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(healthCheck);
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {},
      metrics: {
        memoryUsage: process.memoryUsage(),
        responseTime,
      },
    });
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    // Add your database health check logic here
    return true;
  } catch {
    return false;
  }
}

async function checkS3(): Promise<boolean> {
  try {
    // Add S3 health check logic here
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    });
    
    await s3.headBucket({ Bucket: process.env.S3_BUCKET_NAME }).promise();
    return true;
  } catch {
    return false;
  }
}

function checkMemory(): boolean {
  const usage = process.memoryUsage();
  const maxMemory = 512 * 1024 * 1024; // 512MB limit
  return usage.heapUsed < maxMemory;
}

async function checkDisk(): Promise<boolean> {
  try {
    const fs = require('fs').promises;
    const stats = await fs.stat('.');
    return true;
  } catch {
    return false;
  }
}
```

### 2. Deployment Monitoring Script

```bash
#!/bin/bash
# scripts/monitor-deployment.sh

set -e

APP_URL="${1:-http://localhost:3000}"
MAX_RETRIES=30
RETRY_INTERVAL=10

echo "Monitoring deployment at $APP_URL"

# Function to check health
check_health() {
    local url="$1/api/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    echo "$response"
}

# Function to check performance
check_performance() {
    local url="$1"
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "$url" || echo "999")
    echo "$response_time"
}

# Wait for deployment to be ready
echo "Waiting for application to be ready..."
for i in $(seq 1 $MAX_RETRIES); do
    health_status=$(check_health "$APP_URL")
    
    if [ "$health_status" = "200" ]; then
        echo "✅ Application is healthy (attempt $i/$MAX_RETRIES)"
        break
    else
        echo "⏳ Application not ready yet (attempt $i/$MAX_RETRIES, status: $health_status)"
        
        if [ $i -eq $MAX_RETRIES ]; then
            echo "❌ Deployment failed - application not healthy after $MAX_RETRIES attempts"
            exit 1
        fi
        
        sleep $RETRY_INTERVAL
    fi
done

# Performance check
echo "Checking performance..."
response_time=$(check_performance "$APP_URL")
max_response_time=3.0

if (( $(echo "$response_time > $max_response_time" | bc -l) )); then
    echo "⚠️  Warning: Response time ($response_time s) exceeds threshold ($max_response_time s)"
else
    echo "✅ Performance check passed (response time: $response_time s)"
fi

# Run smoke tests
echo "Running smoke tests..."
npm run test:smoke || {
    echo "❌ Smoke tests failed"
    exit 1
}

echo "✅ Deployment monitoring completed successfully"
```

### 3. Automated Performance Testing

```javascript
// scripts/performance-test.js
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

async function runPerformanceTest(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };
  
  const runnerResult = await lighthouse(url, options);
  
  // Extract scores
  const scores = {
    performance: runnerResult.lhr.categories.performance.score * 100,
    accessibility: runnerResult.lhr.categories.accessibility.score * 100,
    bestPractices: runnerResult.lhr.categories['best-practices'].score * 100,
    seo: runnerResult.lhr.categories.seo.score * 100,
  };
  
  // Save report
  const reportHtml = runnerResult.report;
  fs.writeFileSync('lighthouse-report.html', reportHtml);
  
  // Check thresholds
  const thresholds = {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 95,
  };
  
  let passed = true;
  for (const [category, score] of Object.entries(scores)) {
    const threshold = thresholds[category];
    const status = score >= threshold ? '✅' : '❌';
    console.log(`${status} ${category}: ${score.toFixed(1)} (threshold: ${threshold})`);
    
    if (score < threshold) {
      passed = false;
    }
  }
  
  await chrome.kill();
  
  if (!passed) {
    console.error('❌ Performance test failed');
    process.exit(1);
  }
  
  console.log('✅ Performance test passed');
  return scores;
}

// Run test
const url = process.argv[2] || 'http://localhost:3000';
runPerformanceTest(url).catch(console.error);
```

## 📊 Deployment Pipeline

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  AWS_REGION: 'us-east-1'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm run test -- --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
  
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          S3_REGION: ${{ secrets.S3_REGION }}
          S3_BUCKET_NAME: ${{ secrets.S3_BUCKET_NAME }}
      
      - name: Run bundle analyzer
        run: npm run build:analyze
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: .next/
  
  security:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security audit
        run: npm audit --audit-level moderate
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  
  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: .next/
      
      - name: Start application
        run: npm start &
        env:
          S3_REGION: ${{ secrets.S3_REGION }}
          S3_ACCESS_KEY_ID: ${{ secrets.S3_ACCESS_KEY_ID }}
          S3_SECRET_ACCESS_KEY: ${{ secrets.S3_SECRET_ACCESS_KEY }}
          S3_BUCKET_NAME: ${{ secrets.S3_BUCKET_NAME }}
      
      - name: Wait for application
        run: npx wait-on http://localhost:3000
      
      - name: Run E2E tests
        run: npm run e2e
      
      - name: Upload E2E results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-results
          path: test-results/
  
  performance:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: .next/
      
      - name: Start application
        run: npm start &
        env:
          S3_REGION: ${{ secrets.S3_REGION }}
          S3_ACCESS_KEY_ID: ${{ secrets.S3_ACCESS_KEY_ID }}
          S3_SECRET_ACCESS_KEY: ${{ secrets.S3_SECRET_ACCESS_KEY }}
          S3_BUCKET_NAME: ${{ secrets.S3_BUCKET_NAME }}
      
      - name: Wait for application
        run: npx wait-on http://localhost:3000
      
      - name: Run Lighthouse
        run: node scripts/performance-test.js http://localhost:3000
      
      - name: Upload Lighthouse report
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-report
          path: lighthouse-report.html
  
  deploy:
    runs-on: ubuntu-latest
    needs: [test, build, security, e2e, performance]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Deploy to Amplify
        run: |
          aws amplify start-job \
            --app-id ${{ secrets.AMPLIFY_APP_ID }} \
            --branch-name main \
            --job-type RELEASE
      
      - name: Wait for deployment
        run: |
          chmod +x scripts/monitor-deployment.sh
          ./scripts/monitor-deployment.sh https://your-app.amplifyapp.com
      
      - name: Notify deployment success
        if: success()
        run: |
          echo "✅ Deployment completed successfully"
          # Add notification logic (Slack, email, etc.)
      
      - name: Notify deployment failure
        if: failure()
        run: |
          echo "❌ Deployment failed"
          # Add notification logic (Slack, email, etc.)
```

## 📋 Deployment Checklist

### ✅ Pre-deployment
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Database migrations applied
- [ ] CDN configuration updated
- [ ] Monitoring alerts configured

### ✅ Deployment
- [ ] Build optimization enabled
- [ ] Compression configured
- [ ] Caching strategies implemented
- [ ] Health checks configured
- [ ] Rollback plan prepared
- [ ] Load balancing configured
- [ ] Auto-scaling enabled
- [ ] Backup procedures verified

### ✅ Post-deployment
- [ ] Health check validation
- [ ] Performance monitoring active
- [ ] Error tracking enabled
- [ ] User analytics configured
- [ ] Security monitoring active
- [ ] Documentation updated
- [ ] Team notifications sent
- [ ] Rollback tested

### ✅ Monitoring
- [ ] Application metrics
- [ ] Infrastructure metrics
- [ ] User experience metrics
- [ ] Security metrics
- [ ] Business metrics
- [ ] Alert thresholds configured
- [ ] Dashboard access verified
- [ ] Incident response plan ready

---

**Last Updated**: December 2024  
**Version**: 1.0.0