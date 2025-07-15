# Code Quality Guide

## 🎯 Overview

This guide establishes comprehensive code quality standards, tools, and practices for the Panorama Viewer application to ensure maintainable, readable, and robust code.

## 🛠️ Development Tools Setup

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "react-hooks",
    "import",
    "jsx-a11y",
    "security"
  ],
  "rules": {
    // TypeScript specific rules
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-const": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/consistent-type-imports": "error",
    
    // React specific rules
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    
    // Import rules
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],
    "import/no-duplicates": "error",
    "import/no-unused-modules": "warn",
    
    // General code quality
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "no-alert": "error",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": "error",
    "curly": "error",
    
    // Security rules
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error",
    
    // Accessibility rules
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error"
  },
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
      "env": {
        "jest": true
      },
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off"
      }
    }
  ]
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "jsxSingleQuote": true,
  "proseWrap": "preserve"
}
```

```
# .prettierignore
node_modules
.next
build
dist
coverage
*.min.js
*.min.css
public
.env*
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/styles/*": ["./src/styles/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    },
    // Strict type checking options
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    
    // Additional checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "build",
    "dist"
  ]
}
```

### Husky Git Hooks

```json
// package.json (scripts section)
{
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "quality:check": "npm run lint && npm run format:check && npm run type-check",
    "quality:fix": "npm run lint:fix && npm run format"
  }
}
```

```bash
#!/usr/bin/env sh
# .husky/pre-commit
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```bash
#!/usr/bin/env sh
# .husky/commit-msg
. "$(dirname -- "$0")/_/husky.sh"

npx commitlint --edit "$1"
```

### Lint-staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting, missing semi colons, etc
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding missing tests
        'chore',    // Maintain
        'revert',   // Revert to a commit
        'build',    // Build system or external dependencies
        'ci',       // CI configuration files and scripts
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
```

## 📋 Code Style Guidelines

### 1. File and Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Input, etc.)
│   ├── forms/          # Form components
│   ├── layout/         # Layout components
│   └── features/       # Feature-specific components
├── pages/              # Next.js pages
│   ├── api/           # API routes
│   └── [...]/         # Page components
├── lib/                # Utility libraries
│   ├── utils/         # General utilities
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API services
│   └── config/        # Configuration files
├── types/              # TypeScript type definitions
├── styles/             # Global styles and themes
├── constants/          # Application constants
└── __tests__/          # Test files
```

### 2. Naming Conventions

#### Files and Directories
- **Components**: PascalCase (`UserProfile.tsx`)
- **Pages**: kebab-case (`user-profile.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)
- **Types**: PascalCase (`UserTypes.ts`)

#### Variables and Functions
```typescript
// ✅ Good
const userName = 'john_doe';
const isUserActive = true;
const userList = [];

function getUserById(id: string): User | null {
  // Implementation
}

const handleUserClick = (user: User): void => {
  // Implementation
};

// ❌ Bad
const user_name = 'john_doe';
const UserName = 'john_doe';
const isactive = true;

function GetUserById(id: string) {
  // Implementation
}
```

#### Components
```typescript
// ✅ Good
interface UserProfileProps {
  user: User;
  onEdit: (user: User) => void;
  isLoading?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ 
  user, 
  onEdit, 
  isLoading = false 
}) => {
  return (
    <div className="user-profile">
      {/* Component content */}
    </div>
  );
};

export default UserProfile;

// ❌ Bad
const userProfile = ({ user, onEdit }) => {
  return <div>{/* content */}</div>;
};
```

### 3. TypeScript Best Practices

#### Type Definitions
```typescript
// ✅ Good - Explicit and descriptive types
interface User {
  readonly id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}

type UserStatus = 'active' | 'inactive' | 'pending';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

// ❌ Bad - Using any or loose types
interface User {
  id: any;
  data: object;
  info: any[];
}
```

#### Function Signatures
```typescript
// ✅ Good
function processUserData(
  users: User[],
  filter: (user: User) => boolean,
  transform: (user: User) => UserSummary
): UserSummary[] {
  return users.filter(filter).map(transform);
}

// Async functions with proper error handling
async function fetchUserById(id: string): Promise<User | null> {
  try {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    return null;
  }
}

// ❌ Bad
function processData(data: any): any {
  return data.map((item: any) => item.value);
}
```

### 4. React Component Patterns

#### Component Structure
```typescript
// ✅ Good - Well-structured component
import React, { useState, useEffect, useCallback } from 'react';
import type { User, UserPreferences } from '@/types/user';
import { Button } from '@/components/ui/Button';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { logger } from '@/lib/logger';

interface UserSettingsProps {
  user: User;
  onSave: (preferences: UserPreferences) => Promise<void>;
  onCancel: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ 
  user, 
  onSave, 
  onCancel 
}) => {
  const [preferences, setPreferences] = useState<UserPreferences>(
    user.preferences || {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { validatePreferences } = useUserPreferences();

  const handleSave = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const validation = validatePreferences(preferences);
      if (!validation.isValid) {
        setError(validation.error);
        return;
      }
      
      await onSave(preferences);
      logger.info('User preferences saved', { userId: user.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to save preferences', { userId: user.id, error: err });
    } finally {
      setIsLoading(false);
    }
  }, [preferences, onSave, user.id, validatePreferences]);

  useEffect(() => {
    setPreferences(user.preferences || {});
  }, [user.preferences]);

  return (
    <div className="user-settings">
      {/* Component JSX */}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      
      <div className="actions">
        <Button 
          onClick={onCancel} 
          variant="secondary"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="primary"
          loading={isLoading}
          disabled={isLoading}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default UserSettings;
```

#### Custom Hooks
```typescript
// ✅ Good - Reusable custom hook
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types/user';
import { userService } from '@/lib/services/userService';
import { logger } from '@/lib/logger';

interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

export function useUser(userId: string): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userData = await userService.getById(userId);
      setUser(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(errorMessage);
      logger.error('useUser: Failed to fetch user', { userId, error: err });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const updatedUser = await userService.update(user.id, updates);
      setUser(updatedUser);
      logger.info('useUser: User updated', { userId: user.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      logger.error('useUser: Failed to update user', { userId: user.id, error: err });
      throw err; // Re-throw to allow component to handle
    }
  }, [user]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
    updateUser,
  };
}
```

### 5. Error Handling Patterns

```typescript
// ✅ Good - Comprehensive error handling
import { BaseAppError, ErrorType } from '@/lib/error-handler';

class UserService {
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // Validate input
      const validation = this.validateUserData(userData);
      if (!validation.isValid) {
        throw new ValidationError(
          'Invalid user data',
          { errors: validation.errors }
        );
      }

      // Make API call
      const response = await this.apiClient.post<ApiResponse<User>>(
        '/users',
        userData
      );

      if (!response.data.success) {
        throw new ApiError(
          response.data.error || 'Failed to create user',
          { statusCode: response.status }
        );
      }

      logger.info('User created successfully', { userId: response.data.data.id });
      return response.data.data;
      
    } catch (error) {
      // Handle different error types
      if (error instanceof BaseAppError) {
        throw error; // Re-throw app errors
      }
      
      if (error.response?.status === 409) {
        throw new ConflictError('User already exists');
      }
      
      if (error.response?.status === 422) {
        throw new ValidationError('Invalid user data', {
          details: error.response.data.errors
        });
      }
      
      // Log unexpected errors
      logger.error('Unexpected error creating user', {
        error,
        userData: { ...userData, password: '[REDACTED]' }
      });
      
      throw new InternalError('Failed to create user');
    }
  }
}
```

### 6. Performance Best Practices

```typescript
// ✅ Good - Optimized component
import React, { memo, useMemo, useCallback } from 'react';
import type { Project } from '@/types/project';

interface ProjectListProps {
  projects: Project[];
  searchTerm: string;
  onProjectSelect: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = memo(({ 
  projects, 
  searchTerm, 
  onProjectSelect 
}) => {
  // Memoize expensive calculations
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  // Memoize event handlers
  const handleProjectClick = useCallback((project: Project) => {
    onProjectSelect(project);
  }, [onProjectSelect]);

  return (
    <div className="project-list">
      {filteredProjects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={handleProjectClick}
        />
      ))}
    </div>
  );
});

ProjectList.displayName = 'ProjectList';

export default ProjectList;
```

## 🔍 Code Review Checklist

### ✅ General Code Quality
- [ ] Code follows established naming conventions
- [ ] Functions are small and focused (< 50 lines)
- [ ] No code duplication
- [ ] Proper error handling implemented
- [ ] Logging added for important operations
- [ ] No hardcoded values (use constants/config)
- [ ] Comments explain "why", not "what"

### ✅ TypeScript
- [ ] No `any` types used
- [ ] All function parameters and return types defined
- [ ] Interfaces used for object shapes
- [ ] Union types used appropriately
- [ ] Optional properties marked correctly

### ✅ React Components
- [ ] Props interface defined
- [ ] Default props specified when needed
- [ ] Event handlers memoized with `useCallback`
- [ ] Expensive calculations memoized with `useMemo`
- [ ] Components memoized with `memo` when appropriate
- [ ] Proper dependency arrays in hooks

### ✅ Performance
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized if needed
- [ ] Images optimized and lazy-loaded
- [ ] Bundle size impact considered
- [ ] API calls optimized (caching, debouncing)

### ✅ Security
- [ ] User input sanitized
- [ ] No sensitive data in logs
- [ ] Proper authentication checks
- [ ] CORS configured correctly
- [ ] Environment variables used for secrets

### ✅ Accessibility
- [ ] Semantic HTML used
- [ ] ARIA labels added where needed
- [ ] Keyboard navigation supported
- [ ] Color contrast meets standards
- [ ] Screen reader friendly

### ✅ Testing
- [ ] Unit tests written for new functions
- [ ] Component tests cover user interactions
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Test coverage maintained

## 📊 Quality Metrics

### Code Coverage Targets
- **Overall**: 85%+
- **Critical paths**: 95%+
- **Utility functions**: 90%+
- **Components**: 80%+

### Performance Metrics
- **Bundle size**: < 500KB gzipped
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Code Quality Metrics
- **Cyclomatic complexity**: < 10 per function
- **Function length**: < 50 lines
- **File length**: < 500 lines
- **Dependency depth**: < 5 levels

## 🚀 Automation Scripts

```json
// package.json scripts for quality checks
{
  "scripts": {
    "quality:check": "npm run lint && npm run format:check && npm run type-check && npm run test:coverage",
    "quality:fix": "npm run lint:fix && npm run format",
    "quality:report": "npm run quality:check && npm run bundle:analyze",
    "pre-commit": "lint-staged",
    "pre-push": "npm run quality:check"
  }
}
```

## 📚 Resources

### Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn)
- [Next.js Documentation](https://nextjs.org/docs)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)

### Tools
- [VS Code Extensions](https://marketplace.visualstudio.com/)
  - ESLint
  - Prettier
  - TypeScript Importer
  - Auto Rename Tag
  - Bracket Pair Colorizer

---

**Last Updated**: December 2024  
**Version**: 1.0.0