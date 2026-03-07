<!--
  Based on: https://github.com/jsynowiec/node-typescript-boilerplate
  Original license: Apache-2.0
  Copyright 2016-present Jakub Synowiec
  This template is derived from node-typescript-boilerplate and is provided
  under the same Apache-2.0 terms. See https://www.apache.org/licenses/LICENSE-2.0
 -->

# TypeScript Node.js Boilerplate

> Based on [jsynowiec/node-typescript-boilerplate](https://github.com/jsynowiec/node-typescript-boilerplate)
> License: **Apache-2.0**
> A minimalistic, actively-maintained Node.js + TypeScript project template using ESM, Jest, and modern ESLint flat config.

## Project Structure

```
node-typescript-boilerplate/
├── src/
│   ├── index.ts
│   └── __tests__/
│       └── index.test.ts
├── dist/                       # Compiled output (git-ignored)
├── .editorconfig
├── .gitignore
├── .nvmrc
├── eslint.config.mjs
├── jest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## `package.json`

```json
{
  "name": "node-typescript-boilerplate",
  "version": "1.0.0",
  "description": "Minimalistic project template to build a Node.js back-end application with TypeScript",
  "author": "Your Name <you@example.com>",
  "license": "Apache-2.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "typings": "./dist/index.d.ts",
  "engines": {
    "node": ">= 20"
  },
  "scripts": {
    "start": "node ./dist/index.js",
    "build": "tsc -p tsconfig.json",
    "clean": "rimraf ./dist ./coverage",
    "prebuild": "npm run clean",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@eslint/js": "^9.15.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.9.0",
    "eslint": "^9.15.0",
    "globals": "^15.12.0",
    "jest": "^29.7.0",
    "rimraf": "^6.0.1",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.15.0"
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
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage", "**/*.test.ts"]
}
```

## `jest.config.ts`

```typescript
import type { Config } from "jest";

const config: Config = {
  displayName: "node-typescript-boilerplate",
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  testMatch: ["**/src/__tests__/**/*.test.ts"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/__tests__/**"],
};

export default config;
```

## `eslint.config.mjs`

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": "warn",
    },
  },
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  }
);
```

## `src/index.ts`

```typescript
/**
 * Main entry point for the application.
 * Replace this with your actual application logic.
 */

export interface AppConfig {
  name: string;
  version: string;
  debug?: boolean;
}

export function createApp(config: AppConfig): string {
  const { name, version, debug = false } = config;

  if (debug) {
    console.debug(`[DEBUG] Initializing ${name} v${version}`);
  }

  return `${name} v${version} is running`;
}

// Entry point — only runs when executed directly, not when imported
const config: AppConfig = {
  name: "my-app",
  version: "1.0.0",
  debug: process.env.NODE_ENV === "development",
};

console.log(createApp(config));
```

## `src/__tests__/index.test.ts`

```typescript
import { describe, expect, it } from "@jest/globals";
import { createApp } from "../index.js";

describe("createApp", () => {
  it("returns a startup message with the app name and version", () => {
    const result = createApp({ name: "test-app", version: "0.1.0" });
    expect(result).toBe("test-app v0.1.0 is running");
  });

  it("includes the name and version in the returned string", () => {
    const result = createApp({ name: "my-service", version: "2.3.1" });
    expect(result).toContain("my-service");
    expect(result).toContain("2.3.1");
  });

  it("uses debug=false by default", () => {
    // Should not throw even when debug is omitted
    expect(() =>
      createApp({ name: "silent-app", version: "1.0.0" })
    ).not.toThrow();
  });
});
```

## `.editorconfig`

```ini
root = true

[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

## `.nvmrc`

```
20
```

## `.gitignore`

```
# Compiled output
/dist
/coverage

# Dependencies
/node_modules

# Build artifacts
*.tsbuildinfo
.tsbuildinfo

# Environment
.env
.env.*
!.env.example

# OS artifacts
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.code-workspace
```

## Key Scripts Reference

| Script | Command | Purpose |
|---|---|---|
| `build` | `tsc -p tsconfig.json` | Compile TypeScript to `dist/` |
| `clean` | `rimraf ./dist ./coverage` | Remove build artifacts |
| `start` | `node ./dist/index.js` | Run compiled output |
| `test` | `jest` | Run all tests |
| `test:coverage` | `jest --coverage` | Run tests with coverage report |
| `lint` | `eslint src` | Lint all TypeScript sources |
| `lint:fix` | `eslint src --fix` | Auto-fix lint issues |
| `type-check` | `tsc --noEmit` | Type-check without emitting files |

## Quick Start

```bash
# Clone or copy this template
git clone https://github.com/jsynowiec/node-typescript-boilerplate my-project
cd my-project

# Install dependencies
npm install

# Run type-checking
npm run type-check

# Run tests
npm test

# Build for production
npm run build

# Start the app
npm start
```

## Notes on ESM + NodeNext

This boilerplate uses `"module": "NodeNext"` and `"type": "module"` in `package.json`.

- **Imports must use `.js` extensions** in TypeScript source, even though the files are `.ts`:
  ```typescript
  // Correct — TypeScript resolves this to index.ts at compile time
  import { helper } from "./helper.js";

  // Wrong — will fail at runtime
  import { helper } from "./helper";
  ```
- Jest is configured with `extensionsToTreatAsEsm` and a `moduleNameMapper` to handle `.js` → source file resolution during tests.
- If you prefer CommonJS, change `"module"` to `"CommonJS"` and remove `"type": "module"` from `package.json`.
