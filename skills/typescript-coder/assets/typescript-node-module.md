# TypeScript Node.js Module / Library Template

> A TypeScript Node.js module starter based on patterns from `generator-node-module-typescript`. Produces an npm-publishable library with CJS and ESM dual output via Rollup, Jest testing, and full TypeScript type declarations.

## License

MIT License — See source repository for full license terms.

## Source

- [codejamninja/generator-node-module-typescript](https://github.com/codejamninja/generator-node-module-typescript)

## Project Structure

```
my-ts-module/
├── src/
│   ├── index.ts
│   ├── greet.ts
│   └── types.ts
├── tests/
│   ├── greet.test.ts
│   └── index.test.ts
├── dist/
│   ├── cjs/           ← CommonJS output
│   │   ├── index.js
│   │   └── index.d.ts
│   └── esm/           ← ES Module output
│       ├── index.js
│       └── index.d.ts
├── .eslintrc.json
├── .gitignore
├── .npmignore
├── babel.config.js
├── jest.config.ts
├── package.json
├── rollup.config.ts
├── tsconfig.json
└── tsconfig.cjs.json
```

## Key Files

### `package.json`

```json
{
  "name": "my-ts-module",
  "version": "1.0.0",
  "description": "A TypeScript Node.js module",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/cjs/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/cjs/index.d.ts",
        "default": "./dist/cjs/index.js"
      }
    }
  },
  "files": [
    "dist",
    "src"
  ],
  "sideEffects": false,
  "scripts": {
    "build": "rollup -c rollup.config.ts --configPlugin @rollup/plugin-typescript",
    "build:watch": "rollup -c rollup.config.ts --configPlugin @rollup/plugin-typescript --watch",
    "clean": "rimraf dist",
    "prebuild": "npm run clean",
    "test": "jest",
    "test:watch": "jest --watchAll",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test"
  },
  "keywords": ["typescript", "node", "module"],
  "engines": {
    "node": ">=18.0.0"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^25.0.7",
    "@rollup/plugin-node-resolve": "^15.2.3",
    "@rollup/plugin-typescript": "^11.1.5",
    "@types/jest": "^29.5.7",
    "@types/node": "^20.8.10",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "eslint": "^8.52.0",
    "jest": "^29.7.0",
    "rimraf": "^5.0.5",
    "rollup": "^4.3.0",
    "rollup-plugin-dts": "^6.1.0",
    "ts-jest": "^29.1.1",
    "tslib": "^2.6.2",
    "typescript": "^5.2.2"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "importHelpers": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `tsconfig.cjs.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist/cjs"
  }
}
```

### `rollup.config.ts`

```typescript
import { defineConfig } from "rollup";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const external = (id: string) =>
  !id.startsWith(".") && !id.startsWith("/") && id !== "tslib";

export default defineConfig([
  // ESM build
  {
    input: "src/index.ts",
    output: {
      dir: "dist/esm",
      format: "es",
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: "src",
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declarationDir: "dist/esm",
        declaration: true,
        declarationMap: true,
      }),
    ],
  },
  // CJS build
  {
    input: "src/index.ts",
    output: {
      dir: "dist/cjs",
      format: "cjs",
      sourcemap: true,
      exports: "named",
      preserveModules: true,
      preserveModulesRoot: "src",
    },
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.cjs.json",
        declarationDir: "dist/cjs",
        declaration: true,
        declarationMap: true,
      }),
    ],
  },
  // Type declarations bundle (optional — for single-file .d.ts)
  {
    input: "src/index.ts",
    output: { file: "dist/index.d.ts", format: "es" },
    external,
    plugins: [dts()],
  },
]);
```

### `jest.config.ts`

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "./tsconfig.json" }],
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/types.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};

export default config;
```

### `src/types.ts`

```typescript
export interface GreetOptions {
  /** The name to greet. */
  name: string;
  /** Optional greeting prefix. Defaults to "Hello". */
  prefix?: string;
  /** Whether to use formal capitalisation. */
  formal?: boolean;
}

export type GreetResult = {
  message: string;
  timestamp: Date;
};
```

### `src/greet.ts`

```typescript
import { GreetOptions, GreetResult } from "./types";

/**
 * Produce a greeting message.
 *
 * @example
 * ```ts
 * const result = greet({ name: "World" });
 * console.log(result.message); // "Hello, World!"
 * ```
 */
export function greet(options: GreetOptions): GreetResult {
  const { name, prefix = "Hello", formal = false } = options;

  const displayName = formal
    ? name.charAt(0).toUpperCase() + name.slice(1)
    : name;

  return {
    message: `${prefix}, ${displayName}!`,
    timestamp: new Date(),
  };
}
```

### `src/index.ts`

```typescript
export { greet } from "./greet";
export type { GreetOptions, GreetResult } from "./types";
```

### `tests/greet.test.ts`

```typescript
import { greet } from "../src/greet";

describe("greet()", () => {
  it("returns a message with the default prefix", () => {
    const result = greet({ name: "World" });
    expect(result.message).toBe("Hello, World!");
  });

  it("respects a custom prefix", () => {
    const result = greet({ name: "Alice", prefix: "Hi" });
    expect(result.message).toBe("Hi, Alice!");
  });

  it("capitalises the name when formal is true", () => {
    const result = greet({ name: "alice", formal: true });
    expect(result.message).toBe("Hello, Alice!");
  });

  it("includes a timestamp", () => {
    const before = Date.now();
    const result = greet({ name: "Test" });
    const after = Date.now();
    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.timestamp.getTime()).toBeLessThanOrEqual(after);
  });
});
```

### `.npmignore`

```
src/
tests/
*.config.ts
*.config.js
tsconfig*.json
.eslintrc.json
coverage/
.github/
```

## Getting Started

1. Copy the template into your new module directory.
2. Update `name`, `description`, and `keywords` in `package.json`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to verify setup:
   ```bash
   npm test
   ```
5. Build dual CJS + ESM output:
   ```bash
   npm run build
   ```
6. Publish to npm:
   ```bash
   npm publish --access public
   ```

## Features

- TypeScript 5.x with strict mode and `importHelpers` (tslib)
- Dual CJS + ESM output via Rollup 4 with `preserveModules` for tree-shaking
- Separate `tsconfig.cjs.json` for the CommonJS build
- `exports` map in `package.json` with type-safe `import`/`require` conditions
- `rollup-plugin-dts` for bundling a single `.d.ts` entry-point declaration file
- Jest + ts-jest for native TypeScript test execution without pre-compilation
- `sideEffects: false` declared for optimal tree-shaking by bundlers
- `prepublishOnly` script enforces a passing build and test suite before publish
- `.npmignore` to keep the published package lean (only `dist/` and `src/`)
