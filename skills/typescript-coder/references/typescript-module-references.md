# TypeScript Modules Reference

Reference material for TypeScript module systems, theory, and configuration options.

## Introduction

- Reference material for [Introduction](https://www.typescriptlang.org/docs/handbook/modules/introduction.html)

A file is a **module** in TypeScript if it contains at least one top-level `import` or `export`. Files without these are treated as **scripts** whose declarations exist in the global scope.

```ts
// module.ts — IS a module (has export); isolated scope
export const name = "TypeScript";
export function greet(n: string) { return `Hello, ${n}`; }

// script.ts — NOT a module (no import/export); global scope
const name = "TypeScript";

// Force a file to be a module with no exports
export {};
```

TypeScript uses the same ES Module syntax as JavaScript for imports and exports:

```ts
// Named exports and imports
export function add(a: number, b: number): number { return a + b; }
import { add } from "./math";

// Default export and import
export default class User { constructor(public name: string) {} }
import User from "./user";

// Re-export
export { add as sum } from "./math";
export * from "./utils";

// Type-only imports — fully erased at runtime (no runtime cost)
import type { User } from "./types";
import { type Config, loadConfig } from "./config";
```

Key distinctions:

| Concept | Description |
|---|---|
| Module | File with `import`/`export`; isolated scope |
| Script | File without them; shares global scope |
| `moduleResolution` | Controls how TypeScript finds imported modules |
| `module` compiler option | Controls the output format of the emitted JS |

The `module` compiler option and `moduleResolution` option are distinct settings that work together:
- `module` determines the output format (CommonJS, ESNext, NodeNext, etc.)
- `moduleResolution` determines how import paths are resolved to files

## Theory

- Reference material for [Theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html)

### The Host

TypeScript code always runs in a **host environment** that determines what global APIs are available and what module system is in use. Common hosts: Node.js, browsers, Deno, bundlers (Webpack, esbuild, Vite, Rollup).

### Module Systems

| System | Syntax | Used By |
|---|---|---|
| ESM (ECMAScript Modules) | `import` / `export` | Browsers, modern Node.js |
| CommonJS | `require()` / `module.exports` | Node.js (default) |
| AMD | `define()` | RequireJS |
| UMD | CJS + AMD fallback | Libraries |
| SystemJS | `System.register` | Legacy bundlers |

### How TypeScript Determines Module Format

The `module` compiler option is the primary signal. For Node.js, the `package.json` `"type"` field and file extension also matter:

```json
// package.json
{ "type": "module" }    // .js files treated as ESM
{ "type": "commonjs" }  // .js files treated as CJS (default)
```

File extension overrides `"type"` field:
- `.mjs` / `.mts` — always ESM
- `.cjs` / `.cts` — always CJS
- `.js` / `.ts` — determined by `"type"` field

### Module Resolution

Controls how TypeScript resolves module specifiers to files:

```ts
// With moduleResolution: "nodenext" — extension required
import { foo } from "./foo.js";

// With moduleResolution: "bundler" — extension optional
import { foo } from "./foo";
```

### Module Output

TypeScript transpiles module syntax based on the `module` setting:

```ts
// Input (TypeScript)
import { x } from "./mod";
export const y = x + 1;
```

```js
// Output with module: "commonjs"
"use strict";
const mod_1 = require("./mod");
exports.y = mod_1.x + 1;
```

```js
// Output with module: "esnext"
import { x } from "./mod";
export const y = x + 1;
```

### Important Notes

```ts
// isolatedModules: true — each file must be independently transpilable (required by esbuild, Babel)
// verbatimModuleSyntax — TS 5.0+: import type is always erased; inline type imports allowed
import type { Foo } from "./foo";      // always erased
import { type Bar, baz } from "./bar"; // Bar erased, baz kept

// A file with no imports/exports is a script — pollutes global scope
const x = 1; // global

// Make it a module explicitly
export {};  // now isolated scope
```

### Structural Module Resolution

TypeScript uses a two-pass approach:
1. **Syntactic analysis** — determine if a file is a module or script
2. **Semantic analysis** — resolve imports and type-check

The module format affects how TypeScript handles:
- Top-level `await` (ESM only)
- `import.meta` (ESM only)
- `require()` calls (CJS only)
- Dynamic `import()` (available in both)

## Reference

- Reference material for [Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)

### `module`

Specifies the module code generation format for emitted JavaScript.

```json
{
  "compilerOptions": {
    "module": "NodeNext"
  }
}
```

| Value | Use Case |
|-------|----------|
| `CommonJS` | Traditional Node.js |
| `ESNext` / `ES2020` / `ES2022` | Modern bundlers |
| `Node16` / `NodeNext` | Modern Node.js with ESM support |
| `Preserve` | Pass-through (TS 5.4+); keeps input module syntax |
| `None` | No module system |
| `AMD` | AMD / RequireJS |
| `UMD` | Universal module (CJS + AMD) |
| `System` | SystemJS |

### `moduleResolution`

Controls how TypeScript resolves module imports.

```json
{ "compilerOptions": { "moduleResolution": "bundler" } }
```

| Value | Description |
|-------|-------------|
| `node` | Mimics Node.js CommonJS resolution (legacy) |
| `node16` / `nodenext` | Node.js ESM + CJS hybrid resolution |
| `bundler` | For bundler tools (Vite, esbuild); extensionless imports allowed |
| `classic` | Legacy TypeScript behavior (not recommended) |

### `baseUrl`

Sets the base directory for resolving non-relative module names.

```json
{ "compilerOptions": { "baseUrl": "./src" } }
```

```ts
// With baseUrl: "./src"
import { utils } from "utils/helpers"; // resolves to ./src/utils/helpers
```

### `paths`

Maps module names to file locations. Requires `baseUrl`.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

```ts
import { Component } from "@app/components"; // → src/app/components
import { debounce } from "@utils/debounce";   // → src/utils/debounce
```

Note: `paths` affects type resolution only. Bundlers need their own alias configuration.

### `rootDirs`

Treats multiple directories as a single virtual root for module resolution.

```json
{ "compilerOptions": { "rootDirs": ["src", "generated"] } }
```

```ts
// src/views/main.ts can import from generated/views/ as if same folder
import { template } from "./templates"; // resolves to generated/views/templates.ts
```

### `resolveJsonModule`

Allows importing `.json` files with full type inference.

```ts
import config from "./config.json";
console.log(config.apiUrl); // fully typed
```

### `allowSyntheticDefaultImports`

Allows `import x from 'y'` when the module has no `default` export (type checking only — no emitted helpers). Automatically enabled when `esModuleInterop` is `true`.

### `esModuleInterop`

Emits `__importDefault` and `__importStar` helpers for CommonJS/ESM interop. Enables `allowSyntheticDefaultImports`.

```ts
// Without esModuleInterop:
import * as fs from "fs";

// With esModuleInterop: true
import fs from "fs"; // cleaner default import for CJS modules
```

### `moduleDetection`

Controls how TypeScript determines if a file is a module or script.

| Value | Behavior |
|-------|----------|
| `auto` (default) | Files with `import`/`export` are modules |
| `force` | All files treated as modules |
| `legacy` | TypeScript 4.x behavior |

### `allowImportingTsExtensions`

Allows imports with `.ts`, `.tsx`, `.mts` extensions. Requires `noEmit` or `emitDeclarationOnly`.

```ts
import { foo } from "./foo.ts"; // for bundler environments like Vite
```

### `verbatimModuleSyntax` (TS 5.0+)

Enforces that `import type` is used for type-only imports. Simplifies interop by ensuring type imports are always erased.

```ts
import type { Foo } from "./foo";   // always erased — must use import type
import { type Bar, baz } from "./bar"; // Bar is erased, baz is kept
```

### `resolvePackageJsonExports` / `resolvePackageJsonImports`

Controls whether TypeScript respects `package.json` `exports` and `imports` fields during resolution. Enabled by default when `moduleResolution` is `node16`, `nodenext`, or `bundler`.

## Choosing Compiler Options

- Reference material for [Choosing Compiler Options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)

### Node.js (CommonJS)

For traditional Node.js applications using `require`:

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

### Node.js (ESM, Node 16+)

For Node.js applications using native ES modules:

```json
{
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

Important: `node16`/`nodenext` enforce strict ESM/CJS boundaries and require explicit file extensions in imports:

```ts
// Required with nodenext
import { foo } from "./foo.js"; // .js extension required even for .ts source files
```

### Bundlers (Vite, esbuild, Webpack, Parcel)

Recommended for most frontend or full-stack projects using a build tool:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

The `bundler` mode (TS 5.0+) mirrors how bundlers actually resolve modules:
- Extensionless imports are allowed
- `package.json` `exports` field is respected
- Does not require `.js` extensions

### Decision Guide

| Environment | `module` | `moduleResolution` |
|---|---|---|
| Node.js CJS | `CommonJS` | `node` |
| Node.js ESM | `Node16` or `NodeNext` | `node16` or `nodenext` |
| Bundler (Vite, etc.) | `ESNext` | `bundler` |
| Library (dual CJS/ESM) | `NodeNext` | `nodenext` |

Key notes:
- Avoid `"moduleResolution": "node"` with `"module": "ESNext"` — this is a common misconfiguration that does not reflect real runtime behavior
- Use `"verbatimModuleSyntax": true` in new projects to enforce correct type import syntax
- `"isolatedModules": true` is required when using esbuild, Babel, or SWC as the transpiler

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "isolatedModules": true
  }
}
```

## ESM/CJS Interoperability

- Reference material for [ESM/CJS Interoperability](https://www.typescriptlang.org/docs/handbook/modules/appendices/esm-cjs-interop.html)

ESM and CommonJS have fundamentally different execution and export models. Understanding interop is essential when mixing module formats.

### The Core Problem

CommonJS exports a single value (`module.exports`). ESM has named exports and a default export. When ESM imports a CJS module, the entire `module.exports` object becomes the "namespace" — but what is the `default`?

```ts
// CJS module (legacy.js)
module.exports = { foo: 1, bar: 2 };

// Importing from ESM — behavior differs by tool/flag
import legacy from "./legacy";     // legacy = { foo: 1, bar: 2 } (with esModuleInterop)
import * as legacy from "./legacy"; // namespace import
import { foo } from "./legacy";     // named import (may or may not work)
```

### `esModuleInterop`

When enabled, TypeScript emits helper functions that make CJS default imports work correctly:

```ts
// With esModuleInterop: true
import fs from "fs";         // OK — __importDefault helper wraps module.exports
import * as path from "path"; // OK — __importStar helper used

// Without esModuleInterop (legacy approach)
import * as fs from "fs";
const readFile = fs.readFile; // manual namespace import
```

The emitted helpers:
- `__importDefault(mod)` — wraps `module.exports` as `{ default: module.exports }` if not already ESM
- `__importStar(mod)` — creates a namespace object with `default` set to `module.exports`

### Dynamic `import()` and CJS

When using `"module": "NodeNext"`, dynamic import from a CJS file always returns a namespace object with a `default` property:

```ts
// In a CJS file
const mod = await import("./esm-module.js");
mod.default; // the default export
mod.namedExport; // a named export
```

### Named Exports from CJS

Node.js (via static analysis) and bundlers can sometimes expose CJS object properties as named imports, but TypeScript types this conservatively:

```ts
// someLib/index.js (CJS)
exports.foo = 1;
exports.bar = "hello";

// TypeScript with esModuleInterop
import { foo, bar } from "someLib"; // may work at runtime; TypeScript requires declaration
```

### `allowSyntheticDefaultImports` vs `esModuleInterop`

| Option | Effect |
|---|---|
| `allowSyntheticDefaultImports` | Type-level only: suppresses errors for default imports from CJS modules |
| `esModuleInterop` | Emits runtime helpers + enables `allowSyntheticDefaultImports` |

Use `esModuleInterop` for full correctness. Use `allowSyntheticDefaultImports` alone only when you know the runtime already handles interop (e.g., when using Babel or a bundler).

### Interop in Node.js `node16`/`nodenext`

With `"module": "NodeNext"`, TypeScript enforces strict boundaries:

```ts
// .mts file (always ESM) — cannot use require()
import { readFile } from "fs/promises"; // OK

// .cts file (always CJS) — cannot use top-level await
const { readFileSync } = require("fs"); // OK
```

```ts
// CJS importing ESM — NOT allowed in Node.js
// const mod = require("./esm-module.mjs"); // Error at runtime

// ESM importing CJS — allowed
import cjsMod from "./cjs-module.cjs"; // OK
```

### Key Considerations

- Always use `esModuleInterop: true` in new projects for correct CJS default import behavior
- When using `node16`/`nodenext`, be explicit with `.mts`/`.cts` extensions for files that must be ESM or CJS
- Bundlers (Vite, Webpack, esbuild) typically handle ESM/CJS interop transparently with `moduleResolution: "bundler"`
- Library authors targeting both CJS and ESM should use `"module": "NodeNext"` with dual package output
