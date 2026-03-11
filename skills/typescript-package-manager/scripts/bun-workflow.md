# Bun TypeScript Workflow

A guide for using Bun as your TypeScript runtime, package manager, bundler, and test runner — no compilation step required.

**Reference:** https://bun.sh/docs

---

## Installing Bun

### macOS / Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

### Windows (via PowerShell)

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Via npm (cross-platform)

```bash
npm install -g bun
```

### Verify Installation

```bash
bun --version
```

---

## Creating a Bun TypeScript Project

### Interactive Init

```bash
mkdir my-bun-project && cd my-bun-project
bun init
```

The `bun init` prompt creates:

```
package.json
tsconfig.json
index.ts
.gitignore
README.md
```

### Non-interactive Init

```bash
bun init -y
```

### Starting from Scratch

```bash
# Create entry point
echo 'console.log("Hello from Bun + TypeScript!");' > index.ts
```

---

## Using Bun as Runtime (No tsc Required)

Bun executes TypeScript files directly using its built-in transpiler — no `tsc`, `ts-node`, or `tsx` needed:

```bash
# Run TypeScript directly
bun run index.ts

# Or simply
bun index.ts
```

### What Bun Handles Natively

- TypeScript syntax stripping
- JSX/TSX
- Top-level await
- ES modules and CommonJS
- Path aliases from `tsconfig.json`
- `.env` file loading

### What Bun Does NOT Do

- Type checking (still use `tsc --noEmit` for that)
- Declaration file generation (use `tsc` for publishing)

---

## `bun run` for TypeScript Files

### Running Scripts

```bash
# Run a TypeScript file
bun run src/server.ts

# Run a package.json script
bun run build
bun run dev
bun run test

# Short aliases for common scripts
bun start     # runs "start" script
bun test      # runs Bun's test runner (not the "test" script)
```

### Watch Mode

```bash
# Run with file watching (restarts on change)
bun --watch run src/index.ts

# Hot reload (preserves state where possible)
bun --hot run src/server.ts
```

### Running with Environment Variables

```bash
NODE_ENV=production bun run src/index.ts
```

Bun automatically loads `.env`, `.env.local`, `.env.production`, etc.

---

## `bun test` with TypeScript

Bun has a built-in test runner compatible with Jest's API — no configuration needed.

### Writing Tests

```typescript
// src/__tests__/math.test.ts
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

function add(a: number, b: number): number {
  return a + b;
}

describe('math utilities', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific file
bun test src/__tests__/math.test.ts

# Watch mode
bun test --watch

# Coverage report
bun test --coverage

# Bail on first failure
bun test --bail

# Timeout per test (ms)
bun test --timeout 5000
```

### Jest-Compatible APIs Available

```typescript
import {
  describe, it, test, expect,
  beforeAll, afterAll, beforeEach, afterEach,
  mock, spyOn, jest  // 'jest' is aliased to 'bun:test' APIs
} from 'bun:test';
```

### Snapshot Testing

```typescript
import { expect, test } from 'bun:test';

test('snapshot', () => {
  const result = { name: 'Alice', age: 30 };
  expect(result).toMatchSnapshot();
});
```

---

## `bun build` for Bundling TypeScript

Bun includes a fast bundler that handles TypeScript natively.

### Basic Build

```bash
# Bundle for browser
bun build ./src/index.ts --outdir ./dist

# Bundle for Node.js
bun build ./src/index.ts --outdir ./dist --target node

# Bundle for Bun
bun build ./src/index.ts --outdir ./dist --target bun
```

### Build Options

```bash
# Single file output
bun build ./src/index.ts --outfile ./dist/bundle.js

# Minify
bun build ./src/index.ts --outdir ./dist --minify

# Source maps
bun build ./src/index.ts --outdir ./dist --sourcemap=external

# Watch mode
bun build ./src/index.ts --outdir ./dist --watch

# Define constants (like process.env)
bun build ./src/index.ts --outdir ./dist --define "process.env.NODE_ENV='production'"

# External packages (don't bundle)
bun build ./src/index.ts --outdir ./dist --external react --external react-dom
```

### Programmatic Build API

```typescript
// build.ts
import { build } from 'bun';

const result = await build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  minify: true,
  sourcemap: 'external',
  splitting: true,
  external: ['react', 'react-dom'],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

if (!result.success) {
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`Built ${result.outputs.length} files`);
```

```bash
bun run build.ts
```

---

## `bun install` vs npm

### Installing Packages

```bash
# Install all dependencies (reads package.json)
bun install

# Add a dependency
bun add express
bun add zod

# Add dev dependency
bun add --dev typescript @types/node

# Add global package
bun add --global typescript

# Remove a dependency
bun remove express

# Update packages
bun update
bun update express  # specific package
```

### Speed Comparison

Bun uses a binary lockfile (`bun.lockb`) and installs packages ~10-25x faster than npm.

### Lockfile

```bash
# bun.lockb is binary — add to .gitignore or commit it
# To read the lockfile as text:
bun pm ls

# Verify lockfile integrity
bun install --frozen-lockfile  # fails if lockfile would change (CI use)
```

### Trust and Security

```bash
# Bun runs lifecycle scripts by default; trust specific packages
bun install --trust-scripts

# Or in bunfig.toml:
# [install.scopes]
# "@myorg" = { token = "..." }
```

---

## `bunfig.toml` Configuration

`bunfig.toml` is Bun's configuration file (similar to `.npmrc` or `.yarnrc`):

```toml
# bunfig.toml

# Test runner configuration
[test]
preload = ["./src/test-setup.ts"]
timeout = 10000
coverage = true
coverageReporter = ["text", "lcov"]
coverageDir = "./coverage"
coverageThreshold = 0.80

# Install configuration
[install]
# Default registry
registry = "https://registry.npmjs.org/"
# Exact versions
saveExact = true

# Scoped registry for private packages
[install.scopes]
"@mycompany" = { url = "https://npm.mycompany.com/", token = "$NPM_TOKEN" }

# Build configuration (programmatic defaults)
[build]
target = "browser"
minify = true

# Run configuration
[run]
# Shell for bun run
shell = "bun"
```

---

## Bun + TypeScript `tsconfig` Recommendations

Bun has specific recommendations for `tsconfig.json`:

```json
{
  "compilerOptions": {
    // Bun's runtime supports modern JavaScript
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "lib": ["ESNext", "DOM"],

    // Type checking strictness
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    // JSX (if using React or other JSX)
    "jsx": "react-jsx",
    "jsxImportSource": "react",

    // Path resolution
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    // Output (only needed if using tsc for publishing)
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Bun compatibility
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,

    // Type checking only (no emit, since Bun handles running)
    "noEmit": true
  },
  "include": ["src/**/*", "**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Bun's Built-In Types

Add Bun-specific type definitions:

```bash
bun add --dev @types/bun
```

```typescript
// Now you have Bun globals typed:
const file = Bun.file('./data.json');
const content = await file.json();

const server = Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response('Hello from Bun!');
  }
});
```

---

## Complete `package.json` + `bunfig.toml` Template

### `package.json`

```json
{
  "name": "my-bun-project",
  "version": "1.0.0",
  "description": "A TypeScript project powered by Bun",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist/"],
  "scripts": {
    "dev": "bun --hot run src/index.ts",
    "dev:watch": "bun --watch run src/index.ts",
    "start": "bun run src/index.ts",
    "start:prod": "NODE_ENV=production bun run src/index.ts",
    "build": "bun run scripts/build.ts",
    "build:types": "tsc --emitDeclarationOnly --declaration --outDir dist",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:ci": "bun test --ci --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    "clean": "rm -rf dist coverage",
    "validate": "bun run typecheck && bun run lint && bun run format:check && bun run test",
    "ci": "bun run validate && bun run build"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "prettier": "^3.0.0"
  },
  "engines": {
    "bun": ">=1.0.0"
  }
}
```

### `bunfig.toml`

```toml
[test]
preload = ["./src/test-setup.ts"]
timeout = 15000
coverage = true
coverageReporter = ["text", "lcov"]
coverageDir = "./coverage"
coverageThreshold = 0.80

[install]
saveExact = false
production = false
dryRun = false

[run]
bun = true
```

---

## Migrating from Node.js/npm to Bun

### Step 1: Install Bun and Reinstall Dependencies

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Remove node_modules and reinstall with Bun
rm -rf node_modules
bun install
```

### Step 2: Replace npm Scripts with Bun

| Before (npm) | After (Bun) |
|---|---|
| `npm install` | `bun install` |
| `npm run dev` | `bun dev` or `bun run dev` |
| `npm test` | `bun test` |
| `npm run build` | `bun run build` |
| `npx ts-node src/index.ts` | `bun src/index.ts` |
| `npx tsx src/index.ts` | `bun src/index.ts` |
| `node -e "..."` | `bun -e "..."` |

### Step 3: Update `tsconfig.json`

Switch to Bun-optimized settings:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "Bundler"
  }
}
```

### Step 4: Add Bun Types

```bash
bun add --dev @types/bun
```

### Step 5: Update Node.js-Specific APIs (if any)

Replace Node.js built-ins with Bun equivalents where beneficial:

```typescript
// Before (Node.js)
import { readFileSync } from 'fs';
const content = readFileSync('./data.json', 'utf-8');
const data = JSON.parse(content);

// After (Bun native API — faster)
const file = Bun.file('./data.json');
const data = await file.json();
```

```typescript
// Before (Node.js HTTP)
import http from 'http';
const server = http.createServer((req, res) => {
  res.end('Hello');
});
server.listen(3000);

// After (Bun native — much faster)
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response('Hello');
  }
});
```

### Step 6: Update CI/CD

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun test --coverage
      - run: bun run build
```

### Step 7: Migrate Tests from Jest to `bun:test`

Most Jest tests work without changes. Update imports:

```typescript
// Before (Jest)
import { describe, it, expect } from '@jest/globals';
// or relying on Jest globals (no import needed)

// After (Bun) — explicit import recommended
import { describe, it, expect } from 'bun:test';
```

Remove Jest configuration and dependencies:

```bash
bun remove jest ts-jest @types/jest babel-jest jest-environment-node
```

Remove from `package.json`:

```json
// Remove these:
"jest": { ... },
"babel": { ... }
```

---

## Bun vs npm vs Node: Key Differences

| Feature | Node.js + npm | Bun |
|---------|--------------|-----|
| TypeScript execution | Requires ts-node/tsx | Native, no extra tools |
| Install speed | Baseline | ~10-25x faster |
| Test runner | Requires Jest | Built-in (`bun:test`) |
| Bundler | Requires webpack/esbuild | Built-in (`bun build`) |
| Lockfile | `package-lock.json` (text) | `bun.lockb` (binary) |
| `.env` loading | Requires dotenv | Built-in |
| Type checking | `tsc --noEmit` | Still `tsc --noEmit` |
| npm compatibility | Full | Full (reads `package.json`) |
| Node.js API compatibility | Full | Mostly full (99%+) |

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun init` | Create new project |
| `bun run file.ts` | Execute TypeScript file |
| `bun --watch run file.ts` | Run with file watching |
| `bun --hot run file.ts` | Run with hot reload |
| `bun test` | Run tests |
| `bun test --watch` | Run tests in watch mode |
| `bun test --coverage` | Run tests with coverage |
| `bun build ./src/index.ts --outdir dist` | Bundle TypeScript |
| `bun install` | Install dependencies |
| `bun add package-name` | Add dependency |
| `bun add --dev package-name` | Add dev dependency |
| `bun remove package-name` | Remove dependency |
| `bun update` | Update all dependencies |
| `bun pm ls` | List installed packages |
| `bun x package-name` | Run package (like npx) |
