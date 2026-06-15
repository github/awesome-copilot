# js-to-ts-ts

## purpose

Converting JavaScript source files to idiomatic TypeScript — adding type annotations, modernizing module syntax, configuring strict compilation, and handling untyped dependencies.

## rules

1. Rename `.js` files to `.ts` (or `.tsx` for JSX). This is the first mechanical step — TypeScript compiles `.ts` files and ignores `.js` by default unless `allowJs` is set.
2. Convert `require()`/`module.exports` to ESM `import`/`export`. `const x = require('y')` becomes `import x from 'y'` (default) or `import { x } from 'y'` (named). `module.exports = { a, b }` becomes `export { a, b }`.
3. Enable `"strict": true` in `tsconfig.json` from the start. Fixing strict errors during conversion is far easier than enabling strict later and facing hundreds of errors at once.
4. Prefer `interface` over `type` for object shapes — interfaces are extensible and produce better error messages. Use `type` for unions, intersections, and mapped types.
5. Replace `/** @type {X} */` JSDoc annotations with inline TypeScript annotations. JSDoc types are redundant once the file is `.ts`.
6. Add explicit return types to exported functions. Internal/private functions can rely on inference, but public API boundaries should have declared types for documentation and refactor safety.
7. Replace `any` with specific types. When the real type is unknown, prefer `unknown` and narrow with type guards. Use `any` only as a temporary escape hatch, marked with `// TODO: type this`.
8. For untyped npm dependencies, install `@types/{package}` from DefinitelyTyped. If no `@types` package exists, create a minimal `declarations.d.ts` with `declare module '{package}'`.
9. Convert dynamic property access patterns (`obj[key]`) to use `Record<string, T>` or an index signature. Slack bots frequently use `payload[field]` patterns that need explicit typing.
10. Replace `arguments` object usage with rest parameters (`...args: T[]`). Replace `Function.prototype.apply/call` patterns with direct invocation or spread syntax.
11. Convert `var` to `const`/`let`. Prefer `const` unless reassignment is needed.
12. Add `as const` assertions to literal objects and arrays that should not be widened (e.g., configuration objects, route tables).

## patterns

### require/module.exports → ESM import/export

```javascript
// --- Before (JS) ---
const express = require('express');
const { WebClient } = require('@slack/web-api');
const config = require('./config');

function createApp(port) {
  const app = express();
  app.listen(port);
  return app;
}

module.exports = { createApp };
```

```typescript
// --- After (TS) ---
import express from 'express';
import { WebClient } from '@slack/web-api';
import config from './config.js';

function createApp(port: number): express.Application {
  const app = express();
  app.listen(port);
  return app;
}

export { createApp };
```

### Typing callback-heavy patterns

```javascript
// --- Before (JS) ---
function fetchData(url, callback) {
  fetch(url)
    .then(res => res.json())
    .then(data => callback(null, data))
    .catch(err => callback(err, null));
}
```

```typescript
// --- After (TS) ---
interface FetchResult<T> {
  data: T;
  status: number;
}

async function fetchData<T>(url: string): Promise<FetchResult<T>> {
  const res = await fetch(url);
  const data: T = await res.json();
  return { data, status: res.status };
}
```

### Starter tsconfig.json for conversion projects

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## pitfalls

- **`esModuleInterop` required for CJS default imports**: Without it, `import express from 'express'` fails for CommonJS packages. Always enable `esModuleInterop: true`.
- **JSON imports need `resolveJsonModule`**: JS code that does `require('./data.json')` won't work in TS without `resolveJsonModule: true` in tsconfig.
- **Implicit `any` in callbacks**: Event handler callbacks like `app.on('data', (msg) => ...)` often infer `any` for parameters. Add explicit types: `(msg: IncomingMessage) => ...`.
- **`this` context in class methods**: JS classes using `this` in callbacks lose context. Use arrow functions or add explicit `this` parameter types.
- **Optional chaining vs truthy checks**: JS code like `if (obj && obj.prop)` can become `obj?.prop` in TS, but be careful with falsy values (`0`, `""`, `false`) — optional chaining only checks `null`/`undefined`.
- **Enum vs union**: Don't reflexively convert string constants to `enum`. Prefer string literal unions (`type Status = 'active' | 'inactive'`) unless you need reverse mapping.
- **Missing `@types` packages**: Not all npm packages have types. Check with `npm info @types/{package}` before creating manual declarations.
- **`export default` vs `export =`**: Some CJS modules use `export = X` in their type definitions. Import these with `import X from 'module'` (with `esModuleInterop`) not `import { X }`.

## references

- https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html
- https://www.typescriptlang.org/tsconfig -- tsconfig reference
- https://github.com/DefinitelyTyped/DefinitelyTyped -- @types packages
- https://www.typescriptlang.org/docs/handbook/2/types-from-types.html -- utility types

## instructions

Use this expert when converting JavaScript source files to TypeScript. Start by renaming files and converting module syntax, then progressively add types starting from the public API surface inward. Pair with `type-mapping-ts.md` for cross-language type reference and `dependency-mapping-ts.md` if the JS project uses packages that need TS-typed alternatives.

## research

Deep Research prompt:

"Write a micro expert on converting JavaScript to TypeScript. Cover: require/module.exports to ESM imports, tsconfig strict mode setup, typing callback patterns, handling untyped dependencies with @types and declaration files, common JS idioms that need TS adaptation (var, arguments, dynamic property access), and a starter tsconfig.json for conversion projects."
