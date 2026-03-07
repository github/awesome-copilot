# TypeScript Release Notes

Reference material for TypeScript release notes and new features by version.

---

## TypeScript 6.0

- Reference: [Announcing TypeScript 6.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-beta/)

TypeScript 6.0 represents a major version milestone. Key areas of focus include stricter module semantics, improved interoperability, and performance improvements in the compiler and language service. See the announcement blog post for the full list of features and breaking changes.

---

## TypeScript 5.x Release Notes

> [!IMPORTANT]
> Always check for newer versions, fetching [latest TypeScript](https://github.com/microsoft/TypeScript/releases/latest).

The following are reference links to the official release notes for each TypeScript version:

- [TypeScript 5.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)
- [TypeScript 5.1](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-1.html)
- [TypeScript 5.2](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html)
- [TypeScript 5.3](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html)
- [TypeScript 5.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html)
- [TypeScript 5.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html)
- [TypeScript 5.6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html)
- [TypeScript 5.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html)
- [TypeScript 5.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)
- [TypeScript 5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)

---

## TypeScript 5.8 Highlights

- Reference: [Announcing TypeScript 5.8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)

### `require()` of ECMAScript Modules

TypeScript 5.8 adds support for `require()`-ing ES modules when targeting Node.js environments that support it (Node.js 22+). Controlled via `--module nodenext` and `--moduleResolution nodenext`.

### Granular Checks for Branches in Return Expressions

TypeScript now performs finer-grained analysis on expressions inside `return` statements. Previously, TypeScript treated the entire `return` expression as a single unit; now it can drill into individual branches of ternary expressions and short-circuit operators.

```typescript
// TypeScript 5.8 can now narrow within the returned expression
function getLabel(value: string | number): string {
  return typeof value === "string" ? value.toUpperCase() : value.toFixed(2);
}
```

### `--erasableSyntaxOnly` Flag

A new compiler flag that errors if the TypeScript file contains any syntax that cannot be erased to produce valid JavaScript. This is useful for tools (like Node.js's built-in TypeScript support) that strip types without transforming syntax.

Syntax that is NOT erasable (and would error under this flag):
- `enum` declarations (non-`const`)
- `namespace` / `module` declarations
- Parameter properties in constructors (`constructor(private x: number)`)
- Legacy decorators with `emitDecoratorMetadata`

```typescript
// Error under --erasableSyntaxOnly: enums require a transform
enum Direction {
  Up,
  Down,
}
```

### `--libReplacement` Flag

Allows replacing standard library files (like `lib.dom.d.ts`) with custom equivalents, useful for projects that target non-browser environments or want to swap in a third-party DOM type library.

---

## TypeScript 5.7 Highlights

- Reference: [Announcing TypeScript 5.7](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/)

### Checks for Never-Initialized Variables

TypeScript 5.7 detects variables that are declared but provably never assigned before use, even across complex control flow paths.

```typescript
let value: string;
console.log(value); // Error: Variable 'value' is used before being assigned.
```

### Path Rewriting for Relative Imports in Emit

When using `--rewriteRelativeImportExtensions`, TypeScript rewrites relative `.ts` import extensions to `.js` in emitted output. This is especially useful for Node.js ESM workflows where file extensions must be explicit.

```typescript
// Source
import { helper } from "./utils.ts";

// Emitted (with rewriting enabled)
import { helper } from "./utils.js";
```

### `--target ES2024` and `--lib ES2024`

TypeScript 5.7 adds ES2024 as a valid `target` and `lib` value, covering new built-in APIs such as `Promise.withResolvers()`, `Object.groupBy()`, and `Map.groupBy()`.

### Support for `V8 Compile Caching`

When running under Node.js, TypeScript 5.7 can take advantage of V8's compile cache API to speed up repeated executions of the TypeScript compiler.

---

## TypeScript 5.5 Highlights

- Reference: [Announcing TypeScript 5.5](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/)

### Inferred Type Predicates

TypeScript 5.5 can now infer type predicate return types from function bodies, without requiring an explicit `is` annotation. This means `Array.prototype.filter` and similar patterns now narrow types correctly.

```typescript
// Before 5.5 — required explicit annotation:
function isString(x: unknown): x is string {
  return typeof x === "string";
}

// With 5.5 — inferred automatically:
function isString(x: unknown) {
  return typeof x === "string"; // inferred return type: x is string
}

const mixed: (string | number)[] = ["hello", 42, "world", 1];
const strings = mixed.filter(isString); // string[] — correctly narrowed
```

### Control Flow Narrowing for Constant Indexed Accesses

TypeScript 5.5 narrows the type of indexed accesses when the index is a constant value.

```typescript
function process(obj: Record<string, unknown>, key: string) {
  if (typeof obj[key] === "string") {
    obj[key].toUpperCase(); // Now correctly narrowed to string
  }
}
```

### JSDoc `@import` Tag

Allows importing types in `.js` files using JSDoc without requiring `import type` statements.

```js
/** @import { SomeType } from "some-module" */

/** @param {SomeType} value */
function doSomething(value) {}
```

### Regular Expression Syntax Checking

TypeScript 5.5 validates regex literal syntax at compile time, catching invalid patterns early.

```typescript
const pattern = /(?<namedGroup>\w+)/; // OK
const bad = /(?P<name>\w+)/;          // Error: invalid named capture group syntax
```

### `isolatedDeclarations` Compiler Option

A new option that requires all exported declarations to have explicit type annotations, making it possible for other tools to generate `.d.ts` files without running the TypeScript compiler.

```typescript
// Error under isolatedDeclarations — return type must be explicit
export function add(a: number, b: number) {
  return a + b;
}

// OK
export function add(a: number, b: number): number {
  return a + b;
}
```

---

## TypeScript 5.0 Highlights

- Reference: [Announcing TypeScript 5.0](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/)

### Decorators (Standard)

TypeScript 5.0 implements the TC39 Stage 3 decorators proposal. The new decorator syntax is incompatible with the legacy `experimentalDecorators` option.

```typescript
function logged(fn: Function, ctx: ClassMethodDecoratorContext) {
  return function (this: unknown, ...args: unknown[]) {
    console.log(`Calling ${String(ctx.name)}`);
    return fn.call(this, ...args);
  };
}

class Greeter {
  @logged
  greet() {
    return "Hello!";
  }
}
```

### `const` Type Parameters

The `const` modifier on type parameters infers literal (narrowed) types rather than widened types.

```typescript
function identity<const T>(value: T): T {
  return value;
}

const result = identity({ x: 10, y: 20 });
// result: { x: 10, y: 20 }  (not { x: number, y: number })
```

### Multiple Config File `extends`

`tsconfig.json` can now extend multiple base configurations.

```json
{
  "extends": ["@tsconfig/strictest", "./base.json"],
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

### `--moduleResolution bundler`

A new `moduleResolution` strategy optimized for modern bundlers (Vite, esbuild, Parcel). It allows importing TypeScript files with `.ts` extensions and resolves `package.json` `exports` fields.

### `--verbatimModuleSyntax`

Replaces `importsNotUsedAsValues` and `preserveValueImports`. Forces explicit `import type` for type-only imports, ensuring the emitted output matches the source exactly.

```typescript
// Error — must use 'import type' for type-only imports
import { SomeType } from "./types";

// OK
import type { SomeType } from "./types";
```

### `export type *` Syntax

```typescript
export type * from "./types";
export type * as Types from "./types";
```

### All `enum`s Are Union Enums

Enum members now participate in union type narrowing more reliably.

---

## Additional Release Notes

For a full index of TypeScript release notes across all versions, see the [TypeScript Handbook Release Notes overview](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html).

Blog announcements for all releases are published at [devblogs.microsoft.com/typescript](https://devblogs.microsoft.com/typescript/).
