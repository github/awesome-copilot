<!-- 
  Based on: https://github.com/bscotch/typescript-template
  Original license: MIT
  Copyright (c) Butterscotch Shenanigans (bscotch)
  This is a MODERNIZED VARIATION of the original template, updated for
  ESM, Node.js 20+, TypeScript 5.x strict mode, and Vitest.
  The original project may be outdated; this file reflects current best practices (2025).
  See https://opensource.org/licenses/MIT
 -->

# TypeScript Template — Modernized (bscotch variation)

> Based on [bscotch/typescript-template](https://github.com/bscotch/typescript-template)
> License: **MIT**
> This is a **modernized variation** — the original may be outdated. This version applies
> current best practices: ESM, Node.js 20+, TypeScript 5.x strict mode, and Vitest.

## What Changed from the Original

| Area | Original (bscotch) | This Modernized Variation |
|---|---|---|
| Module system | CommonJS or mixed | Pure ESM (`"type": "module"`) |
| Node.js target | Node 14/16 | Node.js 20+ |
| TypeScript | 4.x | 5.x strict mode |
| Test runner | Mocha or Jest | **Vitest** (ESM-native, fast) |
| tsconfig base | Permissive | `@tsconfig/node20` + strict overrides |
| Module resolution | `node` | `NodeNext` |

## Project Structure

```
my-project/
├── src/
│   ├── index.ts            # Main entry / public API
│   ├── lib/
│   │   └── utils.ts        # Internal utilities
│   └── types.ts            # Shared type definitions
├── tests/
│   ├── index.test.ts
│   └── utils.test.ts
├── dist/                   # Compiled output (git-ignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.build.json     # Excludes test files for production build
├── vitest.config.ts
└── README.md
```

## `package.json`

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A TypeScript project",
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:watch": "tsc -p tsconfig.build.json --watch",
    "clean": "rimraf dist coverage",
    "prebuild": "npm run clean",
    "dev": "node --watch --loader ts-node/esm src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src tests",
    "lint:fix": "eslint src tests --fix",
    "prepublishOnly": "npm run build && npm run type-check"
  },
  "devDependencies": {
    "@tsconfig/node20": "^20.1.4",
    "@types/node": "^22.0.0",
    "@vitest/coverage-v8": "^2.1.0",
    "rimraf": "^6.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

## `tsconfig.json`

Used for editor support and type-checking (includes test files):

```json
{
  "extends": "@tsconfig/node20/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## `tsconfig.build.json`

Used only for the production build — excludes test files:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false,
    "inlineSources": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests/**/*", "**/*.test.ts", "**/*.spec.ts"]
}
```

## `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests in Node.js environment
    environment: "node",

    // Glob patterns for test files
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/types.ts",
        "node_modules/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },

    // Timeout per test in milliseconds
    testTimeout: 10_000,

    // Reporter
    reporter: "verbose",
  },
});
```

## `src/types.ts`

```typescript
/**
 * Shared type definitions for the project.
 * Export all public-facing types from here.
 */

/** Generic result type — avoids throwing for expected error cases. */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/** Creates a successful Result. */
export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/** Creates a failed Result. */
export function err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/** A value that may be null or undefined. */
export type Maybe<T> = T | null | undefined;

/** Deep readonly utility — makes all nested properties readonly. */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** Unwrap a Promise type. */
export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
```

## `src/lib/utils.ts`

```typescript
/**
 * Internal utility functions.
 */

import type { Maybe } from "../types.js";

/**
 * Asserts that a value is non-null and non-undefined.
 * Throws at runtime with a descriptive message if the assertion fails.
 */
export function assertDefined<T>(
  value: Maybe<T>,
  label = "value"
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${label} to be defined, but got ${String(value)}`);
  }
}

/**
 * Narrows an unknown value to string.
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Narrows an unknown value to number.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Returns the first defined value from a list of candidates.
 */
export function coalesce<T>(...values: Array<Maybe<T>>): T | undefined {
  return values.find((v) => v !== null && v !== undefined) as T | undefined;
}

/**
 * Groups an array of items by a key selector.
 */
export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  keySelector: (item: T) => K
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keySelector(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}
```

## `src/index.ts`

```typescript
/**
 * Public API entry point.
 * Re-export anything that should be part of the public interface.
 */

export type { Result, Maybe, DeepReadonly } from "./types.js";
export { ok, err } from "./types.js";
export { assertDefined, isString, isNumber, coalesce, groupBy } from "./lib/utils.js";

// Example: application-specific logic
export interface AppOptions {
  readonly name: string;
  readonly version: string;
  readonly logLevel?: "debug" | "info" | "warn" | "error";
}

export class App {
  readonly #name: string;
  readonly #version: string;
  readonly #logLevel: NonNullable<AppOptions["logLevel"]>;

  constructor(options: AppOptions) {
    this.#name = options.name;
    this.#version = options.version;
    this.#logLevel = options.logLevel ?? "info";
  }

  get name(): string {
    return this.#name;
  }

  get version(): string {
    return this.#version;
  }

  info(message: string): void {
    if (this.#logLevel !== "error" && this.#logLevel !== "warn") {
      console.log(`[${this.#name}] ${message}`);
    }
  }

  toString(): string {
    return `${this.#name}@${this.#version}`;
  }
}
```

## `tests/index.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { App, ok, err } from "../src/index.js";

describe("App", () => {
  it("creates an app with the provided name and version", () => {
    const app = new App({ name: "test-app", version: "1.0.0" });
    expect(app.name).toBe("test-app");
    expect(app.version).toBe("1.0.0");
  });

  it("has a meaningful toString representation", () => {
    const app = new App({ name: "my-lib", version: "2.0.0" });
    expect(app.toString()).toBe("my-lib@2.0.0");
  });
});

describe("Result helpers", () => {
  it("ok() creates a successful result", () => {
    const result = ok(42);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(42);
    }
  });

  it("err() creates a failed result", () => {
    const result = err(new Error("something went wrong"));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("something went wrong");
    }
  });
});
```

## `tests/utils.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { assertDefined, coalesce, groupBy, isString, isNumber } from "../src/lib/utils.js";

describe("assertDefined", () => {
  it("does not throw for a defined value", () => {
    expect(() => assertDefined("hello", "greeting")).not.toThrow();
  });

  it("throws for null", () => {
    expect(() => assertDefined(null, "myVar")).toThrow(
      "Expected myVar to be defined"
    );
  });

  it("throws for undefined", () => {
    expect(() => assertDefined(undefined, "myVar")).toThrow(
      "Expected myVar to be defined"
    );
  });
});

describe("coalesce", () => {
  it("returns the first non-null/undefined value", () => {
    expect(coalesce(null, undefined, 0, 1)).toBe(0);
  });

  it("returns undefined when all values are nullish", () => {
    expect(coalesce(null, undefined)).toBeUndefined();
  });
});

describe("groupBy", () => {
  it("groups items by the key selector", () => {
    const items = [
      { type: "fruit", name: "apple" },
      { type: "veggie", name: "carrot" },
      { type: "fruit", name: "banana" },
    ];
    const grouped = groupBy(items, (item) => item.type);
    expect(grouped["fruit"]).toHaveLength(2);
    expect(grouped["veggie"]).toHaveLength(1);
  });
});

describe("type guards", () => {
  it("isString returns true for strings", () => {
    expect(isString("hello")).toBe(true);
    expect(isString(123)).toBe(false);
  });

  it("isNumber returns false for NaN", () => {
    expect(isNumber(NaN)).toBe(false);
    expect(isNumber(42)).toBe(true);
  });
});
```

## Notable Modern TypeScript 5.x Features Used

| Feature | Where | Notes |
|---|---|---|
| `exactOptionalPropertyTypes` | `tsconfig.json` | Prevents `undefined` being assigned to optional props accidentally |
| `noUncheckedIndexedAccess` | `tsconfig.json` | Index operations return `T \| undefined` for safety |
| `noImplicitOverride` | `tsconfig.json` | Subclass methods must use `override` keyword |
| Private class fields (`#`) | `src/index.ts` | True JS private, not just TypeScript-enforced |
| `satisfies` operator | Can be used in types.ts | Validates without widening the inferred type |
| `const` type parameters | Generic helpers | `function id&lt;const T&gt;(v: T): T` for narrower inference |

## Vitest vs Jest — Why Vitest Here

- **Native ESM support** — no `transform` config needed for ESM
- **Faster** — uses Vite's transform pipeline under the hood
- **`vitest.config.ts`** — single config file, TypeScript-first
- **Compatible API** — `describe/it/expect` are identical to Jest
- **Built-in coverage** — via `@vitest/coverage-v8`, no extra setup
