# TypeScript npm Package Template

> A TypeScript npm package starter based on patterns from `generator-typescript-package` by EricCrosson. Produces a modern, publishable npm package with a full `exports` map, npm provenance, semantic release, strict TypeScript, and GitHub Actions CI/CD.

## License

MIT License — See source repository for full license terms.

## Source

- [EricCrosson/generator-typescript-package](https://github.com/EricCrosson/generator-typescript-package)

## Project Structure

```
my-ts-package/
├── .github/
│   └── workflows/
│       ├── ci.yml              ← Test and typecheck on every PR/push
│       └── release.yml         ← Semantic release on merge to main
├── src/
│   ├── index.ts                ← Public API barrel
│   ├── core.ts                 ← Core implementation
│   └── types.ts                ← Exported types
├── tests/
│   └── core.test.ts
├── dist/                       ← Build output (gitignored)
│   ├── cjs/
│   └── esm/
├── .eslintrc.json
├── .gitignore
├── .npmignore
├── .releaserc.json             ← Semantic release config
├── package.json
├── tsconfig.json
├── tsconfig.cjs.json
└── tsup.config.ts              ← tsup bundler config (replaces manual Rollup)
```

## Key Files

### `package.json`

```json
{
  "name": "@yourscope/my-ts-package",
  "version": "0.0.0",
  "description": "A modern TypeScript npm package",
  "license": "MIT",
  "author": "Your Name <you@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/my-ts-package.git"
  },
  "keywords": ["typescript"],
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/cjs/index.d.cts",
        "default": "./dist/cjs/index.cjs"
      }
    }
  },
  "files": [
    "dist",
    "src"
  ],
  "sideEffects": false,
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsup",
    "clean": "rimraf dist",
    "prebuild": "npm run clean",
    "test": "jest",
    "test:watch": "jest --watchAll",
    "test:coverage": "jest --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "prepublishOnly": "npm run build && npm run test && npm run typecheck"
  },
  "devDependencies": {
    "@semantic-release/changelog": "^6.0.3",
    "@semantic-release/git": "^10.0.1",
    "@types/jest": "^29.5.7",
    "@types/node": "^20.8.10",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "eslint": "^8.52.0",
    "jest": "^29.7.0",
    "rimraf": "^5.0.5",
    "semantic-release": "^22.0.8",
    "ts-jest": "^29.1.1",
    "tsup": "^8.0.0",
    "typescript": "^5.2.2"
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
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `tsup.config.ts`

```typescript
import { defineConfig } from "tsup";

export default defineConfig([
  // ESM build
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist/esm",
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
  },
  // CJS build
  {
    entry: ["src/index.ts"],
    format: ["cjs"],
    outDir: "dist/cjs",
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
  },
]);
```

### `src/types.ts`

```typescript
export interface ParseOptions {
  /** Trim whitespace from string values. Default: true. */
  trim?: boolean;
  /** Throw on invalid input instead of returning undefined. Default: false. */
  strict?: boolean;
}

export type ParseResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };
```

### `src/core.ts`

```typescript
import { ParseOptions, ParseResult } from "./types.js";

/**
 * Parse a raw string value into a number.
 *
 * @example
 * ```ts
 * parseNumber("  42  ") // => { success: true, value: 42 }
 * parseNumber("abc")    // => { success: false, error: "Not a number: abc" }
 * ```
 */
export function parseNumber(
  raw: string,
  options: ParseOptions = {}
): ParseResult<number> {
  const { trim = true, strict = false } = options;
  const input = trim ? raw.trim() : raw;
  const parsed = Number(input);

  if (Number.isNaN(parsed) || input === "") {
    const error = `Not a number: ${raw}`;
    if (strict) throw new TypeError(error);
    return { success: false, error };
  }

  return { success: true, value: parsed };
}

/**
 * Parse a raw string value into a boolean.
 * Accepts "true"/"false" (case-insensitive) and "1"/"0".
 */
export function parseBoolean(
  raw: string,
  options: ParseOptions = {}
): ParseResult<boolean> {
  const { trim = true, strict = false } = options;
  const input = (trim ? raw.trim() : raw).toLowerCase();

  if (input === "true" || input === "1") return { success: true, value: true };
  if (input === "false" || input === "0") return { success: true, value: false };

  const error = `Not a boolean: ${raw}`;
  if (strict) throw new TypeError(error);
  return { success: false, error };
}
```

### `src/index.ts`

```typescript
export { parseNumber, parseBoolean } from "./core.js";
export type { ParseOptions, ParseResult } from "./types.js";
```

### `tests/core.test.ts`

```typescript
import { parseNumber, parseBoolean } from "../src/index.js";

describe("parseNumber()", () => {
  it("parses a valid integer string", () => {
    const result = parseNumber("42");
    expect(result).toEqual({ success: true, value: 42 });
  });

  it("parses a float string", () => {
    const result = parseNumber("3.14");
    expect(result).toEqual({ success: true, value: 3.14 });
  });

  it("trims whitespace by default", () => {
    const result = parseNumber("  7  ");
    expect(result).toEqual({ success: true, value: 7 });
  });

  it("returns failure for non-numeric input", () => {
    const result = parseNumber("abc");
    expect(result.success).toBe(false);
  });

  it("throws in strict mode for non-numeric input", () => {
    expect(() => parseNumber("abc", { strict: true })).toThrow(TypeError);
  });
});

describe("parseBoolean()", () => {
  it.each([["true", true], ["1", true], ["false", false], ["0", false]])(
    'parses "%s" as %s',
    (input, expected) => {
      const result = parseBoolean(input);
      expect(result).toEqual({ success: true, value: expected });
    }
  );

  it("is case-insensitive", () => {
    expect(parseBoolean("TRUE")).toEqual({ success: true, value: true });
  });

  it("returns failure for unknown values", () => {
    expect(parseBoolean("yes").success).toBe(false);
  });
});
```

### `.releaserc.json`

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      { "changelogFile": "CHANGELOG.md" }
    ],
    [
      "@semantic-release/npm",
      { "npmPublish": true }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: matrix.node-version == '20.x'
```

### `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write        # Required for npm provenance

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: https://registry.npmjs.org
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: true   # Enables npm provenance attestation
        run: npx semantic-release
```

### `.npmignore`

```
src/
tests/
*.config.ts
tsconfig*.json
.eslintrc.json
.releaserc.json
.github/
coverage/
CHANGELOG.md
```

## Getting Started

1. Copy the template and update `name`, `description`, `author`, and `repository` in `package.json`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Implement your library in `src/core.ts` and update `src/index.ts` to export the public API.
4. Run tests:
   ```bash
   npm test
   ```
5. Typecheck:
   ```bash
   npm run typecheck
   ```
6. Build both CJS and ESM outputs:
   ```bash
   npm run build
   ```
7. To publish, add `NPM_TOKEN` as a GitHub Actions secret and push to `main`. Semantic release will version, tag, and publish automatically.

## Features

- TypeScript 5.x with the strictest practical settings: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- `"type": "module"` in `package.json` with `NodeNext` module resolution for correct ESM/CJS interop
- Dual CJS + ESM output via `tsup` with declaration files (`.d.ts` / `.d.cts`) per format
- Full `exports` map with `import`/`require` conditions and `types` subpaths
- `sideEffects: false` for optimal tree-shaking
- `npm provenance` attestation via `NPM_CONFIG_PROVENANCE: true` in the release workflow
- Semantic release with conventional commits for automatic versioning and changelog generation
- GitHub Actions CI matrix across Node.js 18/20/22
- Codecov integration for coverage reporting
- `prepublishOnly` guard to prevent publishing a broken build
- `.npmignore` to keep the published tarball lean
