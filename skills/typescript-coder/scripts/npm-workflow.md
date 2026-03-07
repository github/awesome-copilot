# npm TypeScript Workflow

A comprehensive guide for managing TypeScript projects with npm — from initialization to publishing, monorepos, and security.

**Reference:** https://docs.npmjs.com/

---

## Initializing a TypeScript Project

### 1. Create the Project

```bash
mkdir my-ts-project && cd my-ts-project
npm init -y
```

### 2. Install TypeScript

```bash
# Install TypeScript as a dev dependency
npm install --save-dev typescript

# Install Node.js type definitions
npm install --save-dev @types/node

# Optional: ts-node for running TypeScript directly
npm install --save-dev ts-node

# Optional: tsx (faster ts-node alternative)
npm install --save-dev tsx
```

### 3. Initialize TypeScript Configuration

```bash
npx tsc --init
```

---

## Essential `package.json` Scripts

### Complete `package.json` Template

```json
{
  "name": "my-ts-project",
  "version": "1.0.0",
  "description": "A TypeScript project",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist/",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:watch": "tsc -p tsconfig.build.json --watch",
    "build:clean": "npm run clean && npm run build",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --runInBand",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    "clean": "rimraf dist",
    "prepare": "npm run build",
    "prepublishOnly": "npm run typecheck && npm run lint && npm run test && npm run build",
    "version": "npm run format && git add -A src",
    "postversion": "git push && git push --tags"
  },
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "jest": "^29.0.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "ts-jest": "^29.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Script Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `tsc -p tsconfig.build.json` | Compile TypeScript to JavaScript |
| `build:watch` | `tsc --watch` | Compile in watch mode |
| `build:clean` | `rimraf dist && tsc` | Clean then compile |
| `dev` | `tsx watch src/index.ts` | Run with live reload (no compile) |
| `start` | `node dist/index.js` | Run compiled output |
| `typecheck` | `tsc --noEmit` | Type-check without emitting files |
| `test` | `jest` | Run test suite |
| `test:coverage` | `jest --coverage` | Run tests with coverage report |
| `lint` | `eslint src --ext .ts` | Lint TypeScript files |
| `lint:fix` | `eslint src --ext .ts --fix` | Auto-fix lint issues |
| `format` | `prettier --write` | Format source files |
| `format:check` | `prettier --check` | Check formatting without changing files |
| `clean` | `rimraf dist` | Delete build output |
| `prepublishOnly` | full check pipeline | Run before `npm publish` |

---

## Managing `@types/*` Packages

### Installing Type Definitions

```bash
# Node.js built-ins
npm install --save-dev @types/node

# Popular libraries
npm install --save-dev @types/express
npm install --save-dev @types/lodash
npm install --save-dev @types/jest
npm install --save-dev @types/react @types/react-dom

# Check if a package has built-in types first
# (look for "types" field in the package's package.json)
```

### Finding the Right `@types` Package

```bash
# Search for type packages
npm search @types/library-name

# Check if types are bundled
npm info library-name | grep types
```

### When Types Are Missing

If no `@types/*` package exists, create a local declaration:

```typescript
// src/types/missing-library.d.ts
declare module 'missing-library' {
  export function doSomething(value: string): void;
  export const version: string;
}
```

Reference it in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  }
}
```

### Type Resolution Strategies

```json
{
  "compilerOptions": {
    "types": ["node", "jest"],
    "typeRoots": [
      "./node_modules/@types",
      "./types"
    ]
  }
}
```

- `types`: Limit which `@types` packages are automatically included
- `typeRoots`: Directories to search for type packages

---

## Publishing TypeScript Packages

### 1. Separate Build `tsconfig`

Keep a `tsconfig.build.json` that excludes tests:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "stripInternal": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**"
  ]
}
```

### 2. Exports Map (`package.json`)

Support both CommonJS and ESM consumers:

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/cjs/index.js"
      }
    },
    "./utils": {
      "import": "./dist/esm/utils.js",
      "require": "./dist/cjs/utils.js",
      "types": "./dist/types/utils.d.ts"
    }
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ]
}
```

### 3. Dual Build Script

```json
{
  "scripts": {
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build": "npm run build:cjs && npm run build:esm"
  }
}
```

`tsconfig.cjs.json`:

```json
{
  "extends": "./tsconfig.build.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "./dist/cjs"
  }
}
```

`tsconfig.esm.json`:

```json
{
  "extends": "./tsconfig.build.json",
  "compilerOptions": {
    "module": "esnext",
    "outDir": "./dist/esm"
  }
}
```

### 4. Verify Package Contents Before Publishing

```bash
# Dry run to see what will be published
npm pack --dry-run

# Pack to a tarball for local testing
npm pack
```

### 5. Publish

```bash
# Login
npm login

# Publish publicly
npm publish --access public

# Publish beta version
npm version prerelease --preid=beta
npm publish --tag beta
```

---

## npm Workspaces for TypeScript Monorepos

### Monorepo Structure

```
my-monorepo/
├── package.json          # Root workspace config
├── tsconfig.base.json    # Shared TypeScript config
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   ├── utils/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
└── apps/
    └── web/
        ├── package.json
        ├── tsconfig.json
        └── src/
```

### Root `package.json`

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "clean": "npm run clean --workspaces --if-present && rimraf node_modules"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "rimraf": "^5.0.0"
  }
}
```

### Shared `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

### Package `tsconfig.json` (extends base)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../utils" }
  ],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Cross-Package Dependencies

```json
{
  "name": "@my-monorepo/api",
  "dependencies": {
    "@my-monorepo/core": "*",
    "@my-monorepo/utils": "*"
  }
}
```

Install all workspace dependencies from root:

```bash
npm install
```

Run commands in a specific workspace:

```bash
npm run build --workspace=packages/core
npm run test --workspace=apps/web
```

### TypeScript Project References

Use `tsc --build` for correct build ordering:

```bash
# Build all packages in dependency order
npx tsc --build packages/core packages/utils packages/api
```

Root `tsconfig.json` for project references:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" },
    { "path": "./packages/api" },
    { "path": "./apps/web" }
  ]
}
```

---

## Security: Audit and Lock Files

### Running Security Audits

```bash
# Check for vulnerabilities
npm audit

# Auto-fix low/moderate issues
npm audit fix

# Fix including breaking changes (review first)
npm audit fix --force

# JSON output for CI
npm audit --json > audit-report.json
```

### Lock File Best Practices

```bash
# Always commit package-lock.json
git add package-lock.json

# Install exactly as specified in lock file (CI)
npm ci

# Update lock file without upgrading major versions
npm update

# Update a specific package
npm update typescript
```

### `.npmrc` for Security

```ini
# Require exact versions in lock file
save-exact=true

# Prevent installing packages with known vulnerabilities
audit=true

# Use npm's official registry
registry=https://registry.npmjs.org/
```

### Checking Outdated Packages

```bash
# List outdated packages
npm outdated

# Interactive update with npx
npx npm-check-updates

# Update all to latest
npx npm-check-updates -u && npm install
```

---

## Common TypeScript-Specific npm Scripts

### Complete Dev Toolchain Setup

```bash
# ESLint + TypeScript
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Prettier
npm install --save-dev prettier eslint-config-prettier

# Jest + TypeScript
npm install --save-dev jest ts-jest @types/jest

# Husky + lint-staged (pre-commit hooks)
npm install --save-dev husky lint-staged
npx husky init
```

### `package.json` Scripts for Quality Gates

```json
{
  "scripts": {
    "validate": "npm run typecheck && npm run lint && npm run format:check && npm run test",
    "ci": "npm run validate && npm run build"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Jest Configuration for TypeScript

`jest.config.ts`:

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

export default config;
```

### ESLint Configuration for TypeScript

`eslint.config.js` (flat config):

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
);
```

### Prettier Configuration

`.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

---

## npm Version Management

### Semantic Versioning Workflow

```bash
# Bump patch version (1.0.0 -> 1.0.1)
npm version patch

# Bump minor version (1.0.0 -> 1.1.0)
npm version minor

# Bump major version (1.0.0 -> 2.0.0)
npm version major

# Pre-release versions
npm version prerelease --preid=alpha  # 1.0.0-alpha.0
npm version prerelease --preid=beta   # 1.0.0-beta.0
npm version prerelease --preid=rc     # 1.0.0-rc.0
```

### Version Lifecycle Scripts

```json
{
  "scripts": {
    "preversion": "npm run validate",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags && npm publish"
  }
}
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install TypeScript | `npm install --save-dev typescript` |
| Install types | `npm install --save-dev @types/package-name` |
| Initialize tsconfig | `npx tsc --init` |
| Type-check only | `npx tsc --noEmit` |
| Build | `npx tsc` |
| Run TS directly | `npx tsx src/index.ts` |
| Clean install (CI) | `npm ci` |
| Audit vulnerabilities | `npm audit` |
| Check outdated | `npm outdated` |
| Pack for review | `npm pack --dry-run` |
| Publish | `npm publish` |
| Workspace run | `npm run build --workspace=packages/core` |
