# TypeScript Tools

Reference material for TypeScript developer tools — the TypeScript Playground, TSConfig reference, and related tooling.

---

## TypeScript Playground

- Reference material for [TypeScript Playground](https://www.typescriptlang.org/play/)

The TypeScript Playground is an interactive, browser-based coding environment. It allows developers to write, run, and experiment with TypeScript code directly in the browser — no installation required. It serves as a sandbox for learning TypeScript, testing code snippets, reproducing bugs, and sharing code examples with others.

### Key Features

- **Code Editor** — A Monaco-based editor with full syntax highlighting and IntelliSense, supporting multiple open files/tabs and real-time error highlighting.
- **Compiler Configuration Panel** — Toggle compiler options (e.g., `strict`, `noImplicitAny`) via a TS Config panel. Supports boolean flags, dropdown selectors, and TypeScript version switching (release, beta, nightly).
- **Sidebar Panels** — Includes tabs for Errors (compiler diagnostics), Logs/Console (runtime output), AST Explorer (Abstract Syntax Tree visualization), and community Plugins.
- **Shareable URLs** — Code is encoded into the URL, making it easy to share examples or bug reports.
- **Examples Library** — A built-in collection of code samples organized by topic.

### How to Use It

1. Navigate to `typescriptlang.org/play`
2. Type or paste TypeScript code in the left editor pane
3. View output (compiled JavaScript, errors, AST) in the right sidebar
4. Adjust compiler options via the *TS Config* dropdown in the toolbar
5. Share your code by copying the URL

### Example Use Case

```typescript
// Test strict null checks in the Playground
function greet(name: string | null) {
  console.log("Hello, " + name.toUpperCase()); // Error if strictNullChecks is on
}
```

With `strictNullChecks` enabled in the Config panel, the Playground immediately highlights the potential null dereference — useful for learning and debugging TypeScript's type system interactively.

---

## TSConfig Reference

- Reference material for [TSConfig Reference](https://www.typescriptlang.org/tsconfig/)

The `tsconfig.json` file controls how TypeScript compiles your project. Below are the compiler options grouped by category.

### Type Checking

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strict` | boolean | `false` | Enables all strict type-checking options |
| `strictNullChecks` | boolean | `false` | `null` and `undefined` are distinct types |
| `strictFunctionTypes` | boolean | `false` | Stricter checking of function parameter types (contravariance) |
| `strictBindCallApply` | boolean | `false` | Strict checking for `bind`, `call`, `apply` |
| `strictPropertyInitialization` | boolean | `false` | Class properties must be initialized in the constructor |
| `noImplicitAny` | boolean | `false` | Error on expressions with an implicit `any` type |
| `noImplicitThis` | boolean | `false` | Error on `this` with an implicit `any` type |
| `useUnknownInCatchVariables` | boolean | `false` | Catch clause variables typed as `unknown` instead of `any` |
| `alwaysStrict` | boolean | `false` | Parse in strict mode and emit `"use strict"` |
| `noUnusedLocals` | boolean | `false` | Error on unused local variables |
| `noUnusedParameters` | boolean | `false` | Error on unused function parameters |
| `exactOptionalPropertyTypes` | boolean | `false` | Disallows assigning `undefined` to optional properties |
| `noImplicitReturns` | boolean | `false` | Error when not all code paths return a value |
| `noFallthroughCasesInSwitch` | boolean | `false` | Error on fallthrough switch cases |
| `noUncheckedIndexedAccess` | boolean | `false` | Index access types include `undefined` |
| `noImplicitOverride` | boolean | `false` | Require `override` keyword on overridden methods |
| `noPropertyAccessFromIndexSignature` | boolean | `false` | Require bracket notation for index-signature properties |
| `allowUnusedLabels` | boolean | — | Allow unused labels |
| `allowUnreachableCode` | boolean | — | Allow unreachable code |

### Modules

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `module` | string | varies | Module system: `commonjs`, `es2015`, `esnext`, `node16`, `nodenext`, etc. |
| `moduleResolution` | string | varies | Resolution strategy: `node`, `bundler`, `node16`, `nodenext` |
| `baseUrl` | string | — | Base directory for non-relative module names |
| `paths` | object | — | Path mapping entries for module aliases |
| `rootDirs` | string[] | — | Multiple root directories merged at runtime |
| `typeRoots` | string[] | — | Directories to include type definitions from |
| `types` | string[] | — | Only include listed `@types` packages globally |
| `allowSyntheticDefaultImports` | boolean | varies | Allow default imports from modules without a default export |
| `esModuleInterop` | boolean | `false` | Emit `__esModule` helpers for CommonJS/ES module interop |
| `allowUmdGlobalAccess` | boolean | `false` | Allow accessing UMD globals from modules |
| `resolveJsonModule` | boolean | `false` | Enable importing `.json` files |
| `noResolve` | boolean | `false` | Disable resolving imports/triple-slash references |
| `allowImportingTsExtensions` | boolean | `false` | Allow imports with `.ts`/`.tsx` extensions |
| `resolvePackageJsonExports` | boolean | varies | Use `exports` field in `package.json` for resolution |
| `resolvePackageJsonImports` | boolean | varies | Use `imports` field in `package.json` for resolution |
| `verbatimModuleSyntax` | boolean | `false` | Enforce that import/export style matches the emitted output |

### Emit

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | string | `ES3` | Compilation target: `ES5`, `ES6`/`ES2015` ... `ESNext` |
| `lib` | string[] | varies | Built-in API declaration sets to include (e.g. `DOM`, `ES2020`) |
| `outDir` | string | — | Output directory for compiled files |
| `outFile` | string | — | Bundle all output into a single file |
| `rootDir` | string | — | Root of the input source files |
| `declaration` | boolean | `false` | Generate `.d.ts` declaration files |
| `declarationDir` | string | — | Output directory for `.d.ts` files |
| `declarationMap` | boolean | `false` | Generate source maps for `.d.ts` files |
| `emitDeclarationOnly` | boolean | `false` | Only emit `.d.ts` files; no JavaScript output |
| `sourceMap` | boolean | `false` | Generate `.js.map` source map files |
| `inlineSourceMap` | boolean | `false` | Include source maps inline in the JS output |
| `inlineSources` | boolean | `false` | Include TypeScript source in source maps |
| `removeComments` | boolean | `false` | Strip all comments from output |
| `noEmit` | boolean | `false` | Do not emit any output files (type-check only) |
| `noEmitOnError` | boolean | `false` | Skip emit if there are type errors |
| `importHelpers` | boolean | `false` | Import helper functions from `tslib` |
| `downlevelIteration` | boolean | `false` | Correct (but verbose) iteration for older compilation targets |
| `preserveConstEnums` | boolean | `false` | Keep `const enum` declarations in emitted output |
| `stripInternal` | boolean | — | Remove declarations marked `@internal` |

### JavaScript Support

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowJs` | boolean | `false` | Allow `.js` files to be included in the project |
| `checkJs` | boolean | `false` | Enable type checking in `.js` files |
| `maxNodeModuleJsDepth` | number | `0` | Max depth for type-checking JS inside `node_modules` |

### Interop Constraints

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isolatedModules` | boolean | `false` | Ensure each file can be safely transpiled in isolation |
| `forceConsistentCasingInFileNames` | boolean | `false` | Disallow inconsistently-cased imports |
| `isolatedDeclarations` | boolean | `false` | Require explicit types for public API surface |
| `esModuleInterop` | boolean | `false` | See Modules section |

### Language and Environment

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `experimentalDecorators` | boolean | `false` | Enable legacy TC39 Stage 2 decorator support |
| `emitDecoratorMetadata` | boolean | `false` | Emit design-time type metadata for decorated declarations |
| `jsx` | string | — | JSX mode: `preserve`, `react`, `react-jsx`, `react-jsxdev`, `react-native` |
| `jsxFactory` | string | `React.createElement` | JSX factory function name |
| `jsxFragmentFactory` | string | `React.Fragment` | JSX fragment factory name |
| `jsxImportSource` | string | `react` | Module specifier to import JSX factory from |
| `moduleDetection` | string | `auto` | How TypeScript determines whether a file is a module |
| `noLib` | boolean | `false` | Exclude the default `lib.d.ts` |
| `useDefineForClassFields` | boolean | varies | Use ECMAScript-standard class field semantics |

### Projects

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `incremental` | boolean | varies | Save build info to disk for faster incremental rebuilds |
| `composite` | boolean | `false` | Enable project references |
| `tsBuildInfoFile` | string | `.tsbuildinfo` | Path to the incremental build info file |
| `disableSourceOfProjectReferenceRedirect` | boolean | `false` | Use `.d.ts` instead of source files for project references |
| `disableSolutionSearching` | boolean | `false` | Opt out of multi-project reference discovery |
| `disableReferencedProjectLoad` | boolean | `false` | Reduce the number of loaded projects in editor |

### Output Formatting

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `noErrorTruncation` | boolean | `false` | Show complete (non-truncated) error messages |
| `preserveWatchOutput` | boolean | `false` | Keep previous output on screen in watch mode |
| `pretty` | boolean | `true` | Colorize and format diagnostic output |

### Completeness

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `skipDefaultLibCheck` | boolean | `false` | Skip type checking of default `.d.ts` library files |
| `skipLibCheck` | boolean | `false` | Skip type checking of all `.d.ts` declaration files |

### Common tsconfig.json Example

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### tsconfig.json for a React + Vite project

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### tsconfig.json for a Node.js library

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "moduleResolution": "node16",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```
