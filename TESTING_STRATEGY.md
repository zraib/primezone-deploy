# Testing Strategy Guide

## 🎯 Overview

This document outlines a comprehensive testing strategy for the Panorama Viewer application, covering unit tests, integration tests, end-to-end tests, and performance testing.

## 📋 Testing Pyramid

### 1. Unit Tests (70%)
- **Purpose**: Test individual functions and components in isolation
- **Tools**: Jest, React Testing Library
- **Coverage**: Utilities, hooks, components, API functions
- **Target**: 90%+ code coverage

### 2. Integration Tests (20%)
- **Purpose**: Test interactions between components and services
- **Tools**: Jest, Supertest, MSW (Mock Service Worker)
- **Coverage**: API routes, database operations, S3 integration
- **Target**: Critical user flows

### 3. End-to-End Tests (10%)
- **Purpose**: Test complete user journeys
- **Tools**: Playwright, Cypress
- **Coverage**: Core user workflows
- **Target**: Happy paths and critical error scenarios

## 🛠️ Testing Setup

### Dependencies

```json
{
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "jest": "^29.3.1",
    "jest-environment-jsdom": "^29.3.1",
    "supertest": "^6.3.3",
    "msw": "^0.49.2",
    "playwright": "^1.28.1",
    "@playwright/test": "^1.28.1",
    "ts-jest": "^29.0.3",
    "@types/jest": "^29.2.4",
    "@types/supertest": "^2.0.12"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

module.exports = createJestConfig(customJestConfig);
```

### Jest Setup

```javascript
// jest.setup.js
import '@testing-library/jest-dom';
import { server } from './src/mocks/server';

// Mock environment variables
process.env.NEXT_PUBLIC_S3_REGION = 'us-east-1';
process.env.NEXT_PUBLIC_S3_BUCKET_NAME = 'test-bucket';
process.env.S3_ACCESS_KEY_ID = 'test-key';
process.env.S3_SECRET_ACCESS_KEY = 'test-secret';
process.env.NODE_ENV = 'test';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## 🧪 Test Categories

### Unit Tests

#### 1. Utility Functions

```typescript
// src/lib/__tests__/environment.test.ts
import { 
  environmentManager, 
  isProduction, 
  isDevelopment, 
  getApiUrl,
  formatFileSize,
  isFileSizeAllowed 
} from '../environment';

describe('Environment Manager', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.APP_ENV;
  });

  describe('environment detection', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('configuration validation', () => {
    it('should validate required environment variables', () => {
      const validation = environmentManager.validateConfiguration();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required variables', () => {
      delete process.env.NEXT_PUBLIC_S3_REGION;
      const validation = environmentManager.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing required environment variable: NEXT_PUBLIC_S3_REGION');
    });
  });

  describe('utility functions', () => {
    it('should format API URLs correctly', () => {
      expect(getApiUrl('/test')).toBe('http://localhost:3000/test');
      expect(getApiUrl('test')).toBe('http://localhost:3000/test');
      expect(getApiUrl('')).toBe('http://localhost:3000');
    });

    it('should format file sizes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });

    it('should validate file sizes', () => {
      expect(isFileSizeAllowed(1024)).toBe(true);
      expect(isFileSizeAllowed(100 * 1024 * 1024)).toBe(false); // 100MB
    });
  });
});
```

#### 2. Error Handling

```typescript
// src/lib/__tests__/error-handler.test.ts
import {
  errorHandler,
  ValidationError,
  NotFoundError,
  S3Error,
  BaseAppError,
  ErrorType,
  ErrorSeverity
} from '../error-handler';

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('error creation', () => {
    it('should create validation error correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.context).toEqual({ field: 'email' });
    });

    it('should create not found error correctly', () => {
      const error = new NotFoundError('User');
      
      expect(error.type).toBe(ErrorType.NOT_FOUND);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create S3 error correctly', () => {
      const error = new S3Error('Upload failed', { bucket: 'test-bucket' });
      
      expect(error.type).toBe(ErrorType.S3_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('error handling', () => {
    it('should handle BaseAppError correctly', () => {
      const originalError = new ValidationError('Test error');
      const handledError = errorHandler.handleError(originalError);
      
      expect(handledError.type).toBe(ErrorType.VALIDATION);
      expect(handledError.message).toBe('Test error');
    });

    it('should convert generic errors to AppError', () => {
      const originalError = new Error('Generic error');
      const handledError = errorHandler.handleError(originalError);
      
      expect(handledError.type).toBe(ErrorType.INTERNAL);
      expect(handledError.message).toBe('Generic error');
      expect(handledError.statusCode).toBe(500);
    });
  });

  describe('error response creation', () => {
    it('should create user-friendly error response', () => {
      const error = new ValidationError('Field is required');
      const appError = errorHandler.handleError(error);
      const response = errorHandler.createErrorResponse(appError);
      
      expect(response.error.message).toBe('Please check your input and try again.');
      expect(response.error.code).toBe('VALIDATION_FAILED');
      expect(response.error.type).toBe(ErrorType.VALIDATION);
    });
  });
});
```

#### 3. Performance Monitor

```typescript
// src/lib/__tests__/performance-monitor.test.ts
import { performanceMonitor } from '../performance-monitor';

describe('Performance Monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metric recording', () => {
    it('should record metrics correctly', () => {
      performanceMonitor.recordMetric('test.metric', 100, 'ms');
      
      const stats = performanceMonitor.getStats('test.metric');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBe(100);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(100);
    });

    it('should calculate statistics correctly', () => {
      const values = [10, 20, 30, 40, 50];
      values.forEach(value => {
        performanceMonitor.recordMetric('test.stats', value, 'ms');
      });
      
      const stats = performanceMonitor.getStats('test.stats');
      expect(stats.count).toBe(5);
      expect(stats.avg).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.median).toBe(30);
    });
  });

  describe('timer functionality', () => {
    it('should measure execution time', async () => {
      const endTimer = performanceMonitor.startTimer('test.timer');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = endTimer();
      expect(duration).toBeGreaterThanOrEqual(100);
      
      const stats = performanceMonitor.getStats('test.timer');
      expect(stats.count).toBe(1);
    });

    it('should measure function execution', () => {
      const testFunction = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };
      
      const result = performanceMonitor.measureFunction(testFunction, 'test.function');
      expect(result).toBe(499500);
      
      const stats = performanceMonitor.getStats('test.function');
      expect(stats.count).toBe(1);
    });
  });
});
```

### Integration Tests

#### 1. API Routes

```typescript
// src/pages/api/__tests__/projects.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../projects';
import { ApiRequest } from '../../../middleware/api-middleware';

describe('/api/projects', () => {
  it('should return projects list', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        'content-type': 'application/json',
      },
    });

    // Add required properties for ApiRequest
    (req as ApiRequest).requestId = 'test-request-id';
    (req as ApiRequest).startTime = Date.now();

    await handler(req as ApiRequest, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should handle POST request to create project', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: {
        name: 'Test Project',
        description: 'Test Description',
      },
    });

    (req as ApiRequest).requestId = 'test-request-id';
    (req as ApiRequest).startTime = Date.now();

    await handler(req as ApiRequest, res);

    expect(res._getStatusCode()).toBe(201);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Project');
  });

  it('should handle validation errors', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: {
        // Missing required fields
      },
    });

    (req as ApiRequest).requestId = 'test-request-id';
    (req as ApiRequest).startTime = Date.now();

    await handler(req as ApiRequest, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.type).toBe('VALIDATION_ERROR');
  });
});
```

#### 2. S3 Integration

```typescript
// src/lib/__tests__/aws-s3.integration.test.ts
import { S3Service } from '../aws-s3';
import { mockS3Client } from '../../mocks/aws-s3-mock';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');

describe('S3 Service Integration', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    s3Service = new S3Service();
    jest.clearAllMocks();
  });

  describe('file upload', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockBuffer = Buffer.from('test content');
      
      mockS3Client.upload.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test.txt',
        Key: 'test.txt',
      });

      const result = await s3Service.uploadFile(mockBuffer, 'test.txt', 'text/plain');
      
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://test-bucket.s3.amazonaws.com/test.txt');
      expect(mockS3Client.upload).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test.txt',
        Body: mockBuffer,
        ContentType: 'text/plain',
      });
    });

    it('should handle upload errors', async () => {
      const mockBuffer = Buffer.from('test content');
      
      mockS3Client.upload.mockRejectedValue(new Error('Upload failed'));

      const result = await s3Service.uploadFile(mockBuffer, 'test.txt', 'text/plain');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('file deletion', () => {
    it('should delete file successfully', async () => {
      mockS3Client.deleteObject.mockResolvedValue({});

      const result = await s3Service.deleteFile('test.txt');
      
      expect(result.success).toBe(true);
      expect(mockS3Client.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test.txt',
      });
    });
  });

  describe('signed URL generation', () => {
    it('should generate signed URL', async () => {
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/test.txt?signature=abc123';
      mockS3Client.getSignedUrl.mockResolvedValue(mockUrl);

      const result = await s3Service.getSignedUrl('test.txt', 3600);
      
      expect(result).toBe(mockUrl);
    });
  });
});
```

### Component Tests

```typescript
// src/components/__tests__/ProjectCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectCard from '../ProjectCard';
import { Project } from '../../types/project';

const mockProject: Project = {
  id: '1',
  name: 'Test Project',
  description: 'Test Description',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  imageUrl: 'https://example.com/image.jpg',
  status: 'active',
};

describe('ProjectCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render project information correctly', () => {
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onView={mockOnView}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should call onView when card is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onView={mockOnView}
      />
    );

    await user.click(screen.getByTestId('project-card'));
    expect(mockOnView).toHaveBeenCalledWith(mockProject);
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onView={mockOnView}
      />
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
  });

  it('should show confirmation dialog before deletion', async () => {
    const user = userEvent.setup();
    
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onView={mockOnView}
      />
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));
    
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(mockOnDelete).toHaveBeenCalledWith(mockProject.id);
  });

  it('should handle loading state', () => {
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onView={mockOnView}
        loading={true}
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onView={mockOnView}
        error="Failed to load project"
      />
    );

    expect(screen.getByText('Failed to load project')).toBeInTheDocument();
  });
});
```

### End-to-End Tests

```typescript
// tests/e2e/project-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await page.goto('/projects');
  });

  test('should create a new project', async ({ page }) => {
    // Click create project button
    await page.click('[data-testid="create-project-btn"]');
    
    // Fill project form
    await page.fill('[data-testid="project-name"]', 'E2E Test Project');
    await page.fill('[data-testid="project-description"]', 'Created by E2E test');
    
    // Upload project image
    const fileInput = page.locator('[data-testid="project-image"]');
    await fileInput.setInputFiles('tests/fixtures/test-image.jpg');
    
    // Submit form
    await page.click('[data-testid="submit-project"]');
    
    // Verify project was created
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=E2E Test Project')).toBeVisible();
  });

  test('should edit existing project', async ({ page }) => {
    // Find and click edit button for first project
    await page.click('[data-testid="project-card"]:first-child [data-testid="edit-btn"]');
    
    // Update project name
    await page.fill('[data-testid="project-name"]', 'Updated Project Name');
    
    // Save changes
    await page.click('[data-testid="save-project"]');
    
    // Verify changes were saved
    await expect(page.locator('text=Updated Project Name')).toBeVisible();
  });

  test('should delete project with confirmation', async ({ page }) => {
    // Click delete button
    await page.click('[data-testid="project-card"]:first-child [data-testid="delete-btn"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    
    // Verify project was deleted
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should handle file upload errors gracefully', async ({ page }) => {
    await page.click('[data-testid="create-project-btn"]');
    
    // Try to upload invalid file
    const fileInput = page.locator('[data-testid="project-image"]');
    await fileInput.setInputFiles('tests/fixtures/invalid-file.txt');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid file type');
  });

  test('should display loading states during operations', async ({ page }) => {
    // Intercept API calls to add delay
    await page.route('/api/projects', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.click('[data-testid="create-project-btn"]');
    await page.fill('[data-testid="project-name"]', 'Loading Test');
    await page.click('[data-testid="submit-project"]');
    
    // Verify loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });
});
```

## 🚀 Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:ci && npm run test:e2e"
  }
}
```

## 📊 Coverage Reports

### Coverage Configuration

```javascript
// jest.config.js (coverage section)
coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
coverageDirectory: 'coverage',
collectCoverageFrom: [
  'src/**/*.{js,jsx,ts,tsx}',
  '!src/**/*.d.ts',
  '!src/pages/_app.tsx',
  '!src/pages/_document.tsx',
  '!src/**/*.stories.{js,jsx,ts,tsx}',
  '!src/mocks/**',
],
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/lib/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
},
```

## 🔧 Mock Setup

### MSW Setup

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Projects API
  rest.get('/api/projects', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: '1',
            name: 'Mock Project 1',
            description: 'Mock Description 1',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
      })
    );
  }),

  rest.post('/api/projects', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: '2',
          name: 'New Mock Project',
          description: 'New Mock Description',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
    );
  }),

  // S3 Upload API
  rest.post('/api/projects/:id/upload-s3', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          url: 'https://mock-bucket.s3.amazonaws.com/mock-file.jpg',
          key: 'mock-file.jpg',
        },
      })
    );
  }),
];
```

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## 📋 Testing Checklist

### ✅ Unit Tests
- [ ] All utility functions tested
- [ ] Error handling scenarios covered
- [ ] Edge cases identified and tested
- [ ] Mock dependencies properly
- [ ] Achieve 90%+ code coverage

### ✅ Integration Tests
- [ ] API routes tested with various inputs
- [ ] Database operations tested
- [ ] S3 integration tested
- [ ] Authentication flows tested
- [ ] Error scenarios covered

### ✅ Component Tests
- [ ] All components render correctly
- [ ] User interactions work as expected
- [ ] Props are handled correctly
- [ ] Loading and error states tested
- [ ] Accessibility requirements met

### ✅ End-to-End Tests
- [ ] Critical user journeys covered
- [ ] Cross-browser compatibility tested
- [ ] Mobile responsiveness verified
- [ ] Performance benchmarks met
- [ ] Error handling in real scenarios

### ✅ Performance Tests
- [ ] API response times measured
- [ ] File upload performance tested
- [ ] Memory usage monitored
- [ ] Database query performance verified
- [ ] Frontend rendering performance checked

---

**Last Updated**: December 2024  
**Version**: 1.0.0