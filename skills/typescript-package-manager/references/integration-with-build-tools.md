# Integration with Build Tools

Comprehensive guide to integrating TypeScript package managers with modern build tools and development workflows.

## Overview

Modern TypeScript projects rely on seamless integration between package managers and build tools. This reference covers best practices, configurations, and common patterns for connecting these essential development tools.

## TypeScript Build Tool Integration

### Official TypeScript Documentation

[TypeScript: Integrating with Build Tools](https://www.typescriptlang.org/docs/handbook/integrating-with-build-tools.html)

The official TypeScript documentation provides comprehensive guides for integrating with various build systems.

## Popular Build Tools

### Vite

**Modern Frontend Build Tool**

Fast, opinionated build tool with native TypeScript support.

**Installation:**
```bash
npm create vite@latest my-app -- --template vanilla-ts
# or with package manager of choice
pnpm create vite my-app --template vanilla-ts
bun create vite my-app --template vanilla-ts
```

**Configuration (vite.config.ts):**
```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

**Package Manager Integration:**
- Works seamlessly with npm, yarn, pnpm, bun
- Respects lock files automatically
- Fast dependency pre-bundling

### webpack

**Mature Module Bundler**

Highly configurable bundler with extensive plugin ecosystem.

**Installation:**
```bash
npm install --save-dev webpack webpack-cli ts-loader typescript
```

**Configuration (webpack.config.js):**
```javascript
module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
}
```

**Package Manager Scripts:**
```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch"
  }
}
```

### esbuild

**Extremely Fast Bundler**

JavaScript bundler written in Go, focused on speed.

**Installation:**
```bash
npm install --save-dev esbuild
```

**Build Script:**
```javascript
require('esbuild').build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  platform: 'node',
  target: 'node18'
})
```

**Package Manager Integration:**
- Native TypeScript/JSX support
- No configuration needed for basic usage
- Works with all major package managers

### Rollup

**Module Bundler for Libraries**

Optimized for bundling JavaScript libraries with tree-shaking.

**Installation:**
```bash
npm install --save-dev rollup @rollup/plugin-typescript
```

**Configuration (rollup.config.js):**
```javascript
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  plugins: [typescript()]
}
```

### Turbopack

**Next-Generation Bundler**

Successor to webpack, built in Rust for maximum performance.

**Integration:**
```bash
# Used automatically in Next.js 13+
npm install next@latest
```

**Next.js Config:**
```javascript
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    turbo: {} // Enable Turbopack
  }
}
```

## Package.json Scripts Integration

### Common Build Patterns

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write src/**/*.ts",
    "test": "vitest",
    "clean": "rimraf dist"
  }
}
```

### Cross-Package Manager Scripts

Use tools like `cross-env` for platform independence:

```json
{
  "scripts": {
    "build": "cross-env NODE_ENV=production webpack",
    "start": "cross-env NODE_ENV=development webpack serve"
  }
}
```

### Parallel and Sequential Scripts

```json
{
  "scripts": {
    "build:parallel": "npm-run-all --parallel build:*",
    "build:tsc": "tsc",
    "build:bundle": "vite build",
    "build:sequential": "npm-run-all clean build:tsc build:bundle"
  }
}
```

## Monorepo Build Tool Integration

### Turborepo

**High-Performance Build System**

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
```

**Installation with Different Package Managers:**
```bash
# With pnpm (recommended)
pnpm add -Dw turbo

# With npm
npm install --save-dev turbo --workspace-root

# With yarn
yarn add -DW turbo
```

### Nx

**Smart Build System**

```bash
# Create new Nx workspace
npx create-nx-workspace@latest my-workspace

# Generate TypeScript application
nx generate @nx/node:application my-app
```

**Build Caching:**
- Intelligent task scheduling
- Distributed computation
- Affected command optimization

### Lerna

**Original Monorepo Tool**

```bash
# Initialize Lerna
npx lerna init

# Build all packages
lerna run build
```

**Package Manager Integration:**
```json
{
  "npmClient": "pnpm",
  "useWorkspaces": true
}
```

## TypeScript Compiler Integration

### TSC (TypeScript Compiler)

**Direct Integration:**
```json
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "check": "tsc --noEmit"
  }
}
```

**tsconfig.json for Build:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Project References

**For Complex Builds:**
```json
{
  "compilerOptions": {
    "composite": true,
    "incremental": true
  },
  "references": [
    { "path": "../shared" },
    { "path": "../utils" }
  ]
}
```

## Task Runners

### npm/yarn/pnpm Scripts

**Built-in Task Running:**
- Pre/post hooks automatically
- No additional dependencies
- Cross-platform with care

### just

**Command Runner Alternative:**
```just
# justfile
build:
  tsc && vite build

dev:
  vite

test:
  vitest run
```

### make

**Traditional Build Automation:**
```makefile
# Makefile
.PHONY: build test clean

build:
	npm run build

test:
	npm test

clean:
	rm -rf dist node_modules
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Test
        run: npm test
```

### Package Manager Specific Caching

**npm:**
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

**pnpm:**
```yaml
- uses: pnpm/action-setup@v2
  with:
    version: 8
- uses: actions/setup-node@v3
  with:
    cache: 'pnpm'
```

**bun:**
```yaml
- uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest
```

## Development Server Integration

### Vite Dev Server

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
})
```

### webpack Dev Server

```javascript
// webpack.config.js
module.exports = {
  devServer: {
    static: './dist',
    hot: true,
    port: 3000
  }
}
```

### Custom Dev Servers

```json
{
  "scripts": {
    "dev": "concurrently \"npm:dev:*\"",
    "dev:tsc": "tsc --watch",
    "dev:server": "node --watch dist/server.js"
  }
}
```

## Testing Framework Integration

### Vitest

**Fast Unit Test Framework**

```bash
npm install --save-dev vitest
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
})
```

### Jest

**Popular Testing Framework**

```bash
npm install --save-dev jest ts-jest @types/jest
```

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts']
}
```

## Best Practices

### 1. Lock File Consistency

Always commit lock files and use `npm ci` (or equivalent) in CI:
```bash
# CI installation
npm ci          # npm
yarn install --frozen-lockfile  # yarn
pnpm install --frozen-lockfile  # pnpm
bun install --frozen-lockfile   # bun
```

### 2. Build Output Management

```json
{
  "files": ["dist"],
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

### 3. Script Organization

Group related scripts:
```json
{
  "scripts": {
    "build": "npm-run-all build:*",
    "build:clean": "rimraf dist",
    "build:tsc": "tsc",
    "build:bundle": "vite build"
  }
}
```

### 4. Environment Variables

Use dotenv for build-time configuration:
```bash
npm install --save-dev dotenv-cli
```

```json
{
  "scripts": {
    "build:prod": "dotenv -e .env.production -- vite build"
  }
}
```

### 5. TypeScript Path Mapping

Sync with build tool:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Match in Vite/webpack configuration.

## Troubleshooting

### Common Issues

**TypeScript Not Found:**
```bash
npm install --save-dev typescript
```

**Module Resolution Errors:**
- Check `moduleResolution` in tsconfig.json
- Verify `paths` configuration
- Ensure build tool alias matches TypeScript

**Build Performance:**
- Enable incremental builds
- Use `skipLibCheck: true`
- Leverage caching (Turbopack, Vite)
- Consider esbuild for transpilation

**Lock File Conflicts:**
- Regenerate: delete lock file and `node_modules`, reinstall
- Use same package manager across team
- Configure in `.npmrc` or `package.json`

## Further Reading

- [TypeScript Handbook: Integrating with Build Tools](https://www.typescriptlang.org/docs/handbook/integrating-with-build-tools.html)
- [Vite Guide](https://vitejs.dev/guide/)
- [webpack Documentation](https://webpack.js.org/concepts/)
- [esbuild Documentation](https://esbuild.github.io/)
- [Turborepo Handbook](https://turbo.build/repo/docs)
