# TypeScript Tutorials

Step-by-step tutorials for using TypeScript in various frameworks and build tools.

---

## ASP.NET Core

- Reference: [TypeScript with ASP.NET Core](https://www.typescriptlang.org/docs/handbook/asp-net-core.html)

### Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download)
- [Node.js and npm](https://nodejs.org/)

### 1. Create a New ASP.NET Core Project

```bash
dotnet new web -o MyTypescriptApp
cd MyTypescriptApp
```

### 2. Add TypeScript

```bash
npm init -y
npm install --save-dev typescript
```

### 3. Configure TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES5",
    "module": "commonjs",
    "sourceMap": true,
    "outDir": "./wwwroot/js"
  },
  "include": [
    "./src/**/*"
  ]
}
```

### 4. Create TypeScript Source File

```bash
mkdir src
```

`src/app.ts`:

```typescript
function sayHello(name: string): string {
  return `Hello, ${name}!`;
}

const message = sayHello("ASP.NET Core");
console.log(message);
```

### 5. Compile TypeScript

```bash
npx tsc
```

This outputs compiled JavaScript to `wwwroot/js/app.js`.

### 6. Reference in a Razor Page (`Pages/Index.cshtml`)

```html
@page
@model IndexModel

<h1>TypeScript + ASP.NET Core</h1>

@section Scripts {
  <script src="~/js/app.js"></script>
}
```

### 7. Watch Mode for Development

```bash
npx tsc --watch
```

### 8. Integrate with MSBuild

Add a build target to your `.csproj` file to compile TypeScript automatically before each .NET build:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>

  <Target Name="CompileTypeScript" BeforeTargets="Build">
    <Exec Command="npx tsc" />
  </Target>
</Project>
```

| Step | Tool |
|------|------|
| Project scaffold | `dotnet new web` |
| TypeScript install | `npm install typescript` |
| Config | `tsconfig.json` |
| Compile | `npx tsc` |
| Output | `wwwroot/js/` |

---

## Migrating from JavaScript

- Reference: [Migrating from JavaScript](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)

### 1. Initial Setup

```bash
npm install --save-dev typescript
npx tsc --init
```

### 2. Base `tsconfig.json` for Gradual Migration

Start permissive and tighten over time:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "strict": false,
    "noImplicitAny": false
  },
  "include": ["src/**/*"]
}
```

### 3. Gradual Migration Strategy

**Phase 1 — Rename files one at a time:**

```
myFile.js  →  myFile.ts
```

**Phase 2 — Enable JS type checking:**

```json
{ "checkJs": true }
```

**Phase 3 — Add type annotations incrementally:**

```typescript
// Before (JavaScript)
function greet(name) {
  return "Hello, " + name;
}

// After (TypeScript)
function greet(name: string): string {
  return "Hello, " + name;
}
```

### 4. Common Issues and Fixes

**Implicit `any` errors:**

```typescript
// Error: Parameter 'x' implicitly has an 'any' type
function add(x, y) { return x + y; }

// Fix
function add(x: number, y: number): number { return x + y; }
```

**Missing type definitions for npm packages:**

```bash
npm install --save-dev @types/lodash
npm install --save-dev @types/node
```

**Object shape errors:**

```typescript
// Error: Property 'age' does not exist on type '{}'
const user = {};
user.age = 25;

// Fix: Define an interface
interface User { age: number; name: string; }
const user: User = { age: 25, name: "Alice" };
```

**Module import issues:**

```json
// tsconfig.json — add:
{ "esModuleInterop": true, "moduleResolution": "node" }
```

```typescript
// Then use default imports:
import express from 'express';
```

### 5. Tightening `tsconfig.json` Over Time

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 6. Best Practices

| Practice | Description |
|---|---|
| Use `unknown` over `any` | Forces a type check before use |
| Avoid type assertions (`as`) | Prefer type guards instead |
| Leverage type inference | Don't annotate what TypeScript can infer |
| Use `interface` for object shapes | Extensible and readable |
| Migrate leaf files first | Files with no local dependencies are easiest to start with |

**Type guard example:**

```typescript
// Avoid:
const val = someValue as string;

// Prefer:
function isString(val: unknown): val is string {
  return typeof val === "string";
}

if (isString(someValue)) {
  someValue.toUpperCase(); // safely narrowed
}
```

---

## Working with the DOM

- Reference: [TypeScript DOM Manipulation](https://www.typescriptlang.org/docs/handbook/dom-manipulation.html)

### Enable DOM Type Definitions

DOM types come from `lib.dom.d.ts`. Enable them in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

### `getElementById`

Returns `HTMLElement | null` — the `null` case must be handled:

```typescript
// Type: HTMLElement | null
const el = document.getElementById("myDiv");

// Null check required
if (el) {
  el.textContent = "Hello";
}

// Non-null assertion — use only when certain the element exists
const el2 = document.getElementById("root")!;
```

### `querySelector` and `querySelectorAll`

```typescript
// Returns Element | null
const div = document.querySelector("div");

// Generic overload for specific element types
const input = document.querySelector<HTMLInputElement>("#username");
if (input) {
  console.log(input.value); // .value available on HTMLInputElement
}

// querySelectorAll returns NodeListOf<T>
const items = document.querySelectorAll<HTMLLIElement>("li");
items.forEach(item => {
  console.log(item.textContent);
});
```

### HTMLElement Subtypes

| Interface | Corresponding Element | Notable Properties |
|---|---|---|
| `HTMLInputElement` | `<input>` | `.value`, `.checked`, `.type` |
| `HTMLAnchorElement` | `<a>` | `.href`, `.target` |
| `HTMLImageElement` | `<img>` | `.src`, `.alt`, `.width` |
| `HTMLFormElement` | `<form>` | `.submit()`, `.reset()` |
| `HTMLButtonElement` | `<button>` | `.disabled`, `.type` |
| `HTMLSelectElement` | `<select>` | `.selectedIndex`, `.value` |
| `HTMLCanvasElement` | `<canvas>` | `.getContext()` |
| `HTMLVideoElement` | `<video>` | `.play()`, `.pause()`, `.src` |

### Event Handling

```typescript
const btn = document.querySelector<HTMLButtonElement>("#submit");

btn?.addEventListener("click", (event: MouseEvent) => {
  console.log(event.clientX, event.clientY);
});

// Input events — use event.target with a cast
const input = document.querySelector<HTMLInputElement>("#search");
input?.addEventListener("input", (event: Event) => {
  const target = event.target as HTMLInputElement;
  console.log(target.value);
});

// Form submission
const form = document.querySelector<HTMLFormElement>("form");
form?.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault();
  const data = new FormData(form);
});
```

### Creating Elements

`document.createElement` returns a typed element based on the tag name:

```typescript
const div = document.createElement("div");       // HTMLDivElement
const a   = document.createElement("a");         // HTMLAnchorElement
const inp = document.createElement("input");     // HTMLInputElement

inp.type = "text";
inp.placeholder = "Enter name...";
document.body.appendChild(inp);
```

### Type Guards for DOM Elements

```typescript
function isInputElement(el: Element): el is HTMLInputElement {
  return el instanceof HTMLInputElement;
}

const el = document.querySelector("#field");
if (el && isInputElement(el)) {
  console.log(el.value); // narrowed to HTMLInputElement
}
```

---

## React and Webpack

- Reference: [TypeScript with webpack](https://webpack.js.org/guides/typescript/)

### Installation

```bash
npm install --save-dev typescript ts-loader
npm install --save-dev ts-node @types/node @types/react @types/react-dom
npm install react react-dom
```

### Project Structure

```
my-app/
├── package.json
├── tsconfig.json
├── webpack.config.ts
├── dist/
│   ├── bundle.js
│   └── index.html
└── src/
    └── index.tsx
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "outDir": "./dist/",
    "noImplicitAny": true,
    "module": "es6",
    "target": "es5",
    "jsx": "react",
    "allowJs": true,
    "moduleResolution": "node"
  }
}
```

### `webpack.config.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "url";
import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: webpack.Configuration = {
  entry: "./src/index.tsx",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
};

export default config;
```

### `src/index.tsx`

```typescript
import * as React from "react";
import * as ReactDOM from "react-dom/client";

interface AppProps {
  name: string;
}

const App: React.FC<AppProps> = ({ name }) => (
  <div>Hello, {name}!</div>
);

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App name="TypeScript" />);
```

### Source Maps

Add `sourceMap` to `tsconfig.json` and `devtool` to `webpack.config.ts`:

```json
// tsconfig.json
{ "compilerOptions": { "sourceMap": true } }
```

```typescript
// webpack.config.ts
const config: webpack.Configuration = {
  devtool: "inline-source-map",
  // ...rest of config
};
```

### Third-Party Library Types

```bash
npm install --save-dev @types/lodash
```

If a package already bundles its own type declarations, the `@types/` package is not needed.

### Importing Non-Code Assets (e.g., SVG, CSS)

Create a `custom.d.ts` file:

```typescript
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const styles: Record<string, string>;
  export default styles;
}
```

### Key Notes

- `ts-loader` uses `tsc` under the hood and respects `tsconfig.json`.
- Avoid `"module": "CommonJS"` in `tsconfig.json` — it disables webpack tree shaking. Use `"module": "ES6"` or later and let webpack handle module bundling.
- As an alternative to `ts-loader`, use `@babel/preset-typescript` with `babel-loader` for faster builds (no type checking during build — run `tsc --noEmit` separately).

---

## Gulp

- Reference: [TypeScript with Gulp](https://www.typescriptlang.org/docs/handbook/gulp.html)

### Setup

```bash
npm init -y
npm install --save-dev typescript gulp@4 gulp-typescript
```

### Project Structure

```
proj/
├── src/
│   └── main.ts
├── dist/
├── gulpfile.js
└── tsconfig.json
```

### `tsconfig.json`

```json
{
  "files": ["src/main.ts"],
  "compilerOptions": {
    "noImplicitAny": true,
    "target": "es5"
  }
}
```

### `gulpfile.js` (Basic)

```javascript
const gulp = require("gulp");
const ts   = require("gulp-typescript");

const tsProject = ts.createProject("tsconfig.json");

gulp.task("default", function () {
  return tsProject
    .src()
    .pipe(tsProject())
    .js
    .pipe(gulp.dest("dist"));
});
```

### Adding Browserify and Uglify

Install additional dependencies:

```bash
npm install --save-dev browserify tsify vinyl-source-stream gulp-uglify vinyl-buffer gulp-sourcemaps
```

`gulpfile.js` with bundling, minification, and source maps:

```javascript
const gulp       = require("gulp");
const browserify = require("browserify");
const source     = require("vinyl-source-stream");
const tsify      = require("tsify");
const uglify     = require("gulp-uglify");
const sourcemaps = require("gulp-sourcemaps");
const buffer     = require("vinyl-buffer");

gulp.task("default", function () {
  return browserify({
    basedir: ".",
    debug: true,
    entries: ["src/main.ts"],
    cache: {},
    packageCache: {},
  })
    .plugin(tsify)
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("dist"));
});
```

### File Watcher

```javascript
gulp.task("watch", function () {
  gulp.watch("src/**/*.ts", gulp.series("default"));
});
```

### Pipeline Summary

| Step | Tool | Purpose |
|------|------|---------|
| Compile | `gulp-typescript` / `tsify` | TypeScript to JavaScript |
| Bundle | `browserify` | Combine modules into one file |
| Minify | `gulp-uglify` | Reduce output file size |
| Debug | `gulp-sourcemaps` | Map runtime errors back to TypeScript source |

---

## Using Babel with TypeScript

- Reference: [Babel with TypeScript](https://www.typescriptlang.org/docs/handbook/babel-with-typescript.html)

### Overview

You can use **Babel** to compile TypeScript (stripping types) and use **`tsc`** only for type checking. This is common in toolchains like Create React App, Vite, and Jest.

### Setup

```bash
npm install --save-dev @babel/core @babel/cli @babel/preset-env @babel/preset-typescript
```

**`babel.config.json`:**

```json
{
  "presets": [
    "@babel/preset-env",
    "@babel/preset-typescript"
  ]
}
```

**`tsconfig.json`** (for type checking only — no emit):

```json
{
  "compilerOptions": {
    "noEmit": true,
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "moduleResolution": "node"
  }
}
```

**Run type checking separately from the build:**

```bash
npx tsc --noEmit
```

### How Babel Handles TypeScript

Babel **strips type annotations** without checking them. It treats `.ts` and `.tsx` files as JavaScript with types removed. This means:

- Builds are very fast (no type analysis performed)
- Type errors do not fail the Babel build — you must run `tsc` separately

### Key Differences: Babel vs `tsc`

| Feature | Babel | tsc |
|---|---|---|
| Type checking | No | Yes |
| Emit speed | Very fast | Slower on large projects |
| Plugin ecosystem | Rich (decorators, transforms, etc.) | Limited |
| `const enum` support | No (files processed in isolation) | Yes |
| `namespace` / module merging | Partial | Yes |
| `isolatedModules` required | Yes | Optional |

### Babel Limitations (per TypeScript docs)

1. **`const enum`** — Babel cannot inline `const enum` values because it processes files one at a time. Use a regular `enum` or the `babel-plugin-const-enum` plugin.

2. **Namespaces** — Babel does not support TypeScript `namespace` merging across files.

3. **`isolatedModules: true` is required** — Since Babel compiles each file independently, you must enable this flag. It will catch patterns that break per-file compilation:

```typescript
// Error under isolatedModules — re-exporting a type without 'export type'
export { MyType } from "./types";

// Correct
export type { MyType } from "./types";
```

### Recommended `package.json` Scripts

```json
{
  "scripts": {
    "build": "babel src --out-dir dist --extensions '.ts,.tsx'",
    "type-check": "tsc --noEmit",
    "build:check": "npm run type-check && npm run build"
  }
}
```

### When to Use Babel vs `tsc`

| Use Babel + tsc when... | Use tsc only when... |
|---|---|
| You need fast iteration builds | You want a single-tool pipeline |
| You already use Babel (e.g., React) | You use `const enum` heavily |
| Build speed is critical (CI, HMR) | You need namespace merging |
| You use Babel-specific plugins | Simpler project setup is preferred |
