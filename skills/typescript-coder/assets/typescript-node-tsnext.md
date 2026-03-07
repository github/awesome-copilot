# TypeScript Node.js Module (tsnext)

> A modern TypeScript Node.js module starter with ESM-first output, strict compiler settings targeting the latest Node.js LTS, and Vitest for testing. Designed to produce dual-publishable packages (ESM + type declarations) using `NodeNext` module resolution.

## License

MIT — See [source repository](https://github.com/motss/generator-node-tsnext) for full license text.

## Source

- [motss/generator-node-tsnext](https://github.com/motss/generator-node-tsnext)

## Project Structure

```
my-module/
├── src/
│   ├── index.ts
│   ├── lib/
│   │   └── my-feature.ts
│   └── test/
│       ├── index.test.ts
│       └── my-feature.test.ts
├── dist/                   (generated — do not edit)
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── .eslintrc.cjs
├── .gitignore
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "my-module",
  "version": "0.1.0",
  "description": "My TypeScript Node.js module",
  "license": "MIT",
  "author": "Your Name <you@example.com>",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    }
  },
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:watch": "tsc -p tsconfig.build.json --watch",
    "clean": "rimraf dist",
    "lint": "eslint src --ext .ts",
    "prebuild": "npm run clean",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepublishOnly": "npm run build"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.0.0",
    "rimraf": "^5.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "src/test"]
}
```

### `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "src/test", "**/*.test.ts", "**/*.spec.ts"]
}
```

### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/test/**'],
    },
  },
});
```

### `src/index.ts`

```typescript
export { greet } from './lib/my-feature.js';
export type { GreetOptions } from './lib/my-feature.js';
```

### `src/lib/my-feature.ts`

```typescript
export interface GreetOptions {
  name: string;
  greeting?: string;
}

export function greet(options: GreetOptions): string {
  const { name, greeting = 'Hello' } = options;

  if (!name.trim()) {
    throw new TypeError('name must not be empty');
  }

  return `${greeting}, ${name}!`;
}
```

### `src/test/my-feature.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { greet } from '../lib/my-feature.js';

describe('greet()', () => {
  it('returns a greeting with the default prefix', () => {
    expect(greet({ name: 'World' })).toBe('Hello, World!');
  });

  it('returns a greeting with a custom prefix', () => {
    expect(greet({ name: 'Alice', greeting: 'Hi' })).toBe('Hi, Alice!');
  });

  it('throws when name is empty', () => {
    expect(() => greet({ name: '  ' })).toThrow(TypeError);
  });
});
```

### `.gitignore`

```
node_modules/
dist/
coverage/
*.tsbuildinfo
.env
```

## Getting Started

```bash
# 1. Initialise a new directory
mkdir my-module && cd my-module

# 2. Copy / scaffold project files (see structure above)

# 3. Install dependencies
npm install

# 4. Run tests
npm test

# 5. Build for publishing
npm run build

# 6. Inspect the dist output
ls dist/
```

## Features

- ESM-first output with `"type": "module"` and `exports` map
- `NodeNext` module resolution for accurate Node.js ESM behaviour
- Strict TypeScript with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- Declaration files and source maps emitted alongside JS
- Vitest for fast, native-ESM unit testing with V8 coverage
- Separate `tsconfig.build.json` to exclude test files from the published build
- `engines` field enforces Node.js 20 LTS or later
