<!--
  Based on: https://github.com/NivaldoFarias/typescript-project-template
  Original license: MIT
  Copyright (c) Nivaldo Farias
  This is a MODERNIZED VARIATION of the original template, updated for
  TypeScript 5.x, Bun runtime option, modern ESLint flat config (eslint.config.ts),
  Prettier 3.x, Husky v9 + lint-staged, and Conventional Commits.
  The original project may be outdated; this file reflects current best practices (2025).
  See https://opensource.org/licenses/MIT
 -->

# TypeScript Project Template — Modernized (NivaldoFarias variation)

> Based on [NivaldoFarias/typescript-project-template](https://github.com/NivaldoFarias/typescript-project-template)
> License: **MIT**
> This is a **modernized variation** applying current best practices:
> TypeScript 5.x, optional Bun runtime, modern ESLint flat config, Prettier 3.x,
> Husky v9 + lint-staged, and Conventional Commits enforcement.

## What Changed from the Original

| Area | Original (NivaldoFarias) | This Modernized Variation |
|---|---|---|
| TypeScript | 4.x | **5.x** with all strict flags |
| ESLint config | `.eslintrc.json` / `.eslintrc.js` | **ESLint 9 flat config** (`eslint.config.ts`) |
| Husky | v4/v8 | **Husky v9** (`.husky/` scripts) |
| Runtime option | Node.js only | Node.js 20+ **or Bun 1.x** |
| Commit enforcement | Not present | **commitlint** + Conventional Commits |
| Formatting | Prettier 2.x | **Prettier 3.x** |
| Module system | CommonJS | **ESM** (`"type": "module"`) |

## Project Structure

```
my-project/
├── src/
│   ├── index.ts              # Application entry point
│   ├── config/
│   │   └── index.ts          # Environment configuration
│   ├── types/
│   │   └── index.ts          # Shared type definitions
│   └── utils/
│       └── index.ts          # Utility functions
├── tests/
│   ├── unit/
│   │   └── utils.test.ts
│   └── integration/
│       └── app.test.ts
├── dist/                     # Compiled output (git-ignored)
├── .husky/
│   ├── pre-commit            # Runs lint-staged
│   └── commit-msg            # Runs commitlint
├── .gitignore
├── .nvmrc                    # Node version pin
├── .prettierrc               # Prettier configuration
├── .prettierignore
├── commitlint.config.ts
├── eslint.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## `package.json`

```json
{
  "name": "my-project",
  "version": "0.1.0",
  "description": "A TypeScript project",
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "build:watch": "tsc -p tsconfig.json --watch",
    "clean": "rimraf dist coverage",
    "prebuild": "npm run clean",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "prepare": "husky",
    "validate": "npm run type-check && npm run lint && npm run format:check && npm run test"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.5.0",
    "@commitlint/config-conventional": "^19.5.0",
    "@eslint/js": "^9.15.0",
    "@types/node": "^22.9.0",
    "@vitest/coverage-v8": "^2.1.0",
    "eslint": "^9.15.0",
    "eslint-config-prettier": "^9.1.0",
    "globals": "^15.12.0",
    "husky": "^9.1.7",
    "lint-staged": "^15.2.10",
    "prettier": "^3.3.3",
    "rimraf": "^6.0.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.15.0",
    "vitest": "^2.1.0"
  },
  "lint-staged": {
    "*.{ts,tsx,mts,cts}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yaml,yml}": [
      "prettier --write"
    ]
  }
}
```

## `tsconfig.json`

```json
{
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
    "noFallthroughCasesInSwitch": true,

    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests/**/*"]
}
```

## `eslint.config.ts`

Modern ESLint 9 flat config in TypeScript:

```typescript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "*.config.js"],
  },

  // Base JS rules
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Type-aware linting requires parserOptions.project
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Custom rule overrides
  {
    rules: {
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Prefer const assertions over explicit type annotations where possible
      "@typescript-eslint/prefer-as-const": "error",
      // Require explicit return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "warn",
      // Disallow floating promises
      "@typescript-eslint/no-floating-promises": "error",
      // Require await in async functions
      "@typescript-eslint/require-await": "error",
      // No console in production code (warn, not error)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Disable formatting rules that conflict with Prettier (must be last)
  eslintConfigPrettier,
);
```

## `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": false,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "overrides": [
    {
      "files": "*.md",
      "options": {
        "printWidth": 80,
        "proseWrap": "always"
      }
    }
  ]
}
```

## `.prettierignore`

```
dist/
coverage/
node_modules/
.tsbuildinfo
*.lock
```

## `commitlint.config.ts`

```typescript
import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of these
    "type-enum": [
      2,
      "always",
      [
        "build",   // Changes that affect the build system or external dependencies
        "chore",   // Other changes that don't modify src or test files
        "ci",      // Changes to CI configuration files and scripts
        "docs",    // Documentation only changes
        "feat",    // A new feature
        "fix",     // A bug fix
        "perf",    // A code change that improves performance
        "refactor",// A code change that neither fixes a bug nor adds a feature
        "revert",  // Reverts a previous commit
        "style",   // Changes that don't affect the meaning of the code
        "test",    // Adding missing tests or correcting existing tests
      ],
    ],
    // Scope is optional but must be lowercase if provided
    "scope-case": [2, "always", "lower-case"],
    // Subject must not end with a period
    "subject-full-stop": [2, "never", "."],
    // Subject must start with lowercase
    "subject-case": [2, "always", "lower-case"],
    // Body must start after a blank line
    "body-leading-blank": [2, "always"],
    // Footer must start after a blank line
    "footer-leading-blank": [2, "always"],
    // Max header length
    "header-max-length": [2, "always", 100],
  },
};

export default config;
```

## `.husky/pre-commit`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

## `.husky/commit-msg`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

## `src/config/index.ts`

```typescript
/**
 * Environment configuration — validated at startup.
 * All environment variables are accessed through this module, never directly.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Check your .env file or deployment configuration.`
    );
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  app: {
    name: optionalEnv("APP_NAME", "my-project"),
    version: optionalEnv("APP_VERSION", "0.1.0"),
    port: Number(optionalEnv("PORT", "3000")),
    nodeEnv: optionalEnv("NODE_ENV", "development") as
      | "development"
      | "production"
      | "test",
  },
  log: {
    level: optionalEnv("LOG_LEVEL", "info") as
      | "debug"
      | "info"
      | "warn"
      | "error",
  },
} as const;

export type AppConfig = typeof config;
```

## `src/types/index.ts`

```typescript
/**
 * Shared type definitions. Export all public types from here.
 */

/** Discriminated union result type for error handling without exceptions. */
export type Result<T, E extends Error = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  err<E extends Error>(error: E): Result<never, E> {
    return { ok: false, error };
  },
  isOk<T, E extends Error>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok;
  },
} as const;

/** Represents a value that may not yet exist. */
export type Option<T> = { readonly some: true; readonly value: T } | { readonly some: false };

export const Option = {
  some<T>(value: T): Option<T> {
    return { some: true, value };
  },
  none<T = never>(): Option<T> {
    return { some: false };
  },
  isSome<T>(opt: Option<T>): opt is { some: true; value: T } {
    return opt.some;
  },
} as const;

/** Pagination metadata for list responses. */
export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

/** A paginated response wrapping a list of items. */
export interface Paginated<T> {
  readonly items: readonly T[];
  readonly meta: PaginationMeta;
}
```

## `src/utils/index.ts`

```typescript
/**
 * General-purpose utility functions.
 */

/**
 * Sleeps for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chunks an array into sub-arrays of the specified size.
 */
export function chunk<T>(array: readonly T[], size: number): T[][] {
  if (size <= 0) throw new RangeError("Chunk size must be greater than 0");
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size) as T[]);
  }
  return result;
}

/**
 * Returns a new object with only the specified keys from the source.
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> {
  return keys.reduce(
    (acc, key) => {
      acc[key] = obj[key];
      return acc;
    },
    {} as Pick<T, K>
  );
}

/**
 * Returns a new object without the specified keys.
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> {
  const keysSet = new Set<PropertyKey>(keys);
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keysSet.has(k))
  ) as Omit<T, K>;
}
```

## `src/index.ts`

```typescript
/**
 * Application entry point.
 */

import { config } from "./config/index.js";
import { Result } from "./types/index.js";

async function main(): Promise<void> {
  const { app, log } = config;

  if (log.level === "debug") {
    console.warn(
      `[DEBUG] Starting ${app.name} v${app.version} in ${app.nodeEnv} mode`
    );
  }

  const result = await runApp();

  if (!Result.isOk(result)) {
    console.error("Fatal error:", result.error.message);
    process.exit(1);
  }

  console.warn(`${app.name} started successfully on port ${app.port}`);
}

async function runApp(): Promise<Result<void>> {
  try {
    // Replace with your application logic
    await Promise.resolve();
    return Result.ok(undefined);
  } catch (error) {
    return Result.err(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

main().catch((error: unknown) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
```

## Bun Runtime Option

To use **Bun** instead of Node.js:

1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Replace the `dev` script in `package.json`:
   ```json
   "dev": "bun --watch src/index.ts"
   ```
3. Replace `tsx` with `bun` in the dev workflow — Bun runs TypeScript natively.
4. For testing, replace Vitest with Bun's built-in test runner:
   ```json
   "test": "bun test"
   ```
   And rename test files to `*.test.ts` (Bun picks them up automatically).
5. The `tsconfig.json` target can be adjusted: `"target": "ESNext"` for Bun.

> Note: Bun is not 100% compatible with all npm packages. Validate your dependencies before switching.

## Conventional Commits Reference

Valid commit message format:

```
<type>(<optional scope>): <subject>

[optional body]

[optional footer(s)]
```

Examples:
```
feat(auth): add JWT refresh token rotation

fix(api): resolve race condition in user lookup

chore: upgrade typescript to 5.7.2

docs(readme): add bun runtime setup instructions

refactor(utils): extract pagination helper into separate module

BREAKING CHANGE: rename Config interface to AppConfig
```

## Quick Setup Script

```bash
# 1. Clone / scaffold
git init my-project && cd my-project

# 2. Install dependencies
npm install

# 3. Initialize Husky
npm run prepare

# 4. Make Husky hooks executable (Linux/macOS)
chmod +x .husky/pre-commit .husky/commit-msg

# 5. Verify everything works
npm run validate
```
