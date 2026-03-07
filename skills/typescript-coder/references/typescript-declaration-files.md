# TypeScript Declaration Files

Reference material for writing and consuming TypeScript declaration files (.d.ts) from the official TypeScript documentation.

## Introduction

- Reference material for [Introduction](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

Declaration files (`.d.ts`) describe the shape of JavaScript code to TypeScript. They allow the TypeScript compiler to type-check usage of JavaScript libraries that were not written in TypeScript.

There are two primary sources of declaration files:

- **Bundled with a package** — the library author includes `.d.ts` files in the npm package alongside the JavaScript output.
- **DefinitelyTyped (`@types`)** — a community-maintained repository of declaration files for libraries that don't ship their own. Install via `npm install --save-dev @types/<library-name>`.

TypeScript resolves declaration files automatically when using `import` or `require`, looking first at the package's `types` or `typings` field in `package.json`, then for an `index.d.ts` at the package root.

The declaration file guide covers:

1. Writing declarations by example (common patterns)
2. Identifying the correct library structure (global, module, UMD)
3. Do's and Don'ts for avoiding common mistakes
4. A deep dive into how declarations work internally
5. How to publish and consume declaration files

## Declaration Reference

- Reference material for [Declaration Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/by-example.html)

Common patterns for writing declaration files, organized by the kind of thing being declared.

### Global Variables

```ts
/** The number of widgets present */
declare var foo: number;
```

### Global Functions

```ts
declare function greet(greeting: string): void;
```

Functions can have overloads:

```ts
declare function getWidget(n: number): Widget;
declare function getWidget(s: string): Widget[];
```

### Objects with Properties

Use `declare namespace` to describe objects accessed via dotted notation:

```ts
declare namespace myLib {
  function makeGreeting(s: string): string;
  let numberOfGreetings: number;
}
```

Usage: `myLib.makeGreeting("hello")` and `myLib.numberOfGreetings`.

### Reusable Types — Interfaces

```ts
interface GreetingSettings {
  greeting: string;
  duration?: number;
  color?: string;
}

declare function greet(setting: GreetingSettings): void;
```

### Reusable Types — Type Aliases

```ts
type GreetingLike = string | (() => string) | MyGreeter;

declare function greet(g: GreetingLike): void;
```

### Organizing Types with Nested Namespaces

```ts
declare namespace GreetingLib {
  interface LogOptions {
    verbose?: boolean;
  }
  interface AlertOptions {
    modal: boolean;
    title?: string;
    color?: string;
  }
}
```

These are referenced as `GreetingLib.LogOptions` and `GreetingLib.AlertOptions`.

Namespaces can be nested:

```ts
declare namespace GreetingLib.Options {
  interface Log {
    verbose?: boolean;
  }
  interface Alert {
    modal: boolean;
    title?: string;
    color?: string;
  }
}
```

### Classes

```ts
declare class Greeter {
  constructor(greeting: string);
  greeting: string;
  showGreeting(): void;
}
```

### Enums

```ts
declare enum Shading {
  None,
  Streamline,
  Matte,
  Glossy,
}
```

### Modules (CommonJS / ESM exports)

Use `export =` for CommonJS-style modules (when the library uses `module.exports = ...`):

```ts
export = MyModule;

declare function MyModule(): void;
declare namespace MyModule {
  let version: string;
}
```

Use named exports for ESM-style:

```ts
export function myFunction(a: string): string;
export const myField: number;
export interface SomeType {
  name: string;
  length: number;
}
```

### UMD Modules

Libraries usable both as globals and as modules use `export as namespace`:

```ts
export as namespace myLib;
export function makeGreeting(s: string): string;
export let numberOfGreetings: number;
```

## Library Structures

- Reference material for [Library Structures](https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html)

Choosing the correct declaration file structure depends on how the library is consumed.

### Global Libraries

A global library is accessible from the global scope — no `import` or `require` needed. Examples: older jQuery (`$()`), Underscore.js (old style).

Identifying characteristics in JavaScript source:

- Top-level `var` statements or `function` declarations
- `window.myLib = ...` assignments
- References to `document` or `window`

Use the `global.d.ts` template.

```ts
declare function myLib(a: string): string;
declare namespace myLib {
  let timeout: number;
}
```

### Module Libraries

Libraries consumed via `require()` or `import`. Most modern npm packages are module libraries.

Identifying characteristics:

- `const x = require("foo")` or `import x from "foo"` in usage examples
- `exports.myFn = ...` or `module.exports = ...` in the source
- `define(...)` (AMD) in the source

Use the `module.d.ts` template.

### UMD Libraries

Libraries that can be used as a global (via a `<script>` tag) or as a module (via `require`/`import`). Most modern utility libraries (e.g. Moment.js) are UMD.

Identifying pattern in library source:

```js
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["libName"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("libName"));
  } else {
    root.returnExports = factory(root.libName);
  }
}(this, function (b) { ... }));
```

Use `export as namespace` in the declaration file to expose the global.

### Module Plugins

A module plugin imports another module and extends it. The declaration file imports the original module and uses `declare module` to augment it.

Use the `module-plugin.d.ts` template.

### Global Plugins

A script that adds properties to a global (e.g. adds methods to `Array.prototype`). The declaration file uses `interface` merging on the global type.

### Global-Modifying Modules

A module that, when `require`d/`import`ed, modifies the global scope as a side effect. The declaration file uses `declare global { }` inside a module file.

Use the `global-modifying-module.d.ts` template.

## Do's and Don'ts

- Reference material for [Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### General Types

**Don't** use the object wrapper types `Number`, `String`, `Boolean`, `Symbol`, or `Object`. These refer to boxed object types and are almost never what you want.

```ts
/* WRONG */
function reverse(s: String): String;

/* OK */
function reverse(s: string): string;
```

**Do** use `object` (lowercase) for non-primitive types when needed, or better yet, use a specific interface or type.

### Callback Return Types

**Don't** use `any` as the return type for a callback whose return value will be ignored:

```ts
/* WRONG */
function fn(x: () => any) {
  x();
}
```

**Do** use `void` — it prevents accidentally using the return value in an unsafe way:

```ts
/* OK */
function fn(x: () => void) {
  x();
}
```

### Optional Parameters in Callbacks

**Don't** use optional parameters in callbacks unless you actually intend to call the callback with fewer arguments:

```ts
/* WRONG */
interface Fetcher {
  getObject(done: (data: unknown, elapsedTime?: number) => void): void;
}
```

**Do** write callback parameters as required:

```ts
/* OK */
interface Fetcher {
  getObject(done: (data: unknown, elapsedTime: number) => void): void;
}
```

### Overloads and Callbacks

**Don't** write separate overloads differing only by callback arity:

```ts
/* WRONG */
declare function beforeAll(action: () => void, timeout?: number): void;
declare function beforeAll(
  action: (done: DoneFn) => void,
  timeout?: number
): void;
```

**Do** write a single overload using the maximum arity:

```ts
/* OK */
declare function beforeAll(
  action: (done: DoneFn) => void,
  timeout?: number
): void;
```

### Ordering Overloads

**Don't** put more general overloads before more specific ones:

```ts
/* WRONG */
declare function fn(x: any): any;
declare function fn(x: HTMLElement): number;
declare function fn(x: HTMLDivElement): string;

var myElem: HTMLDivElement;
var x = fn(myElem); // x: any — wrong!
```

**Do** put more specific overloads before more general ones:

```ts
/* OK */
declare function fn(x: HTMLDivElement): string;
declare function fn(x: HTMLElement): number;
declare function fn(x: any): any;

var myElem: HTMLDivElement;
var x = fn(myElem); // x: string — correct!
```

### Use Optional Parameters Instead of Overloads

**Don't** write overloads that differ only in trailing optional parameters:

```ts
/* WRONG */
interface Example {
  diff(one: string): number;
  diff(one: string, two: string): number;
  diff(one: string, two: string, three: boolean): number;
}
```

**Do** use optional parameters:

```ts
/* OK */
interface Example {
  diff(one: string, two?: string, three?: boolean): number;
}
```

### Use Union Types Instead of Overloads

**Don't** write overloads that differ only by the type of one parameter when a union type would express the same thing:

```ts
/* WRONG */
interface Moment {
  utcOffset(): number;
  utcOffset(b: number): Moment;
  utcOffset(b: string): Moment;
}
```

**Do** use a union type:

```ts
/* OK */
interface Moment {
  utcOffset(): number;
  utcOffset(b: number | string): Moment;
}
```

## Deep Dive

- Reference material for [Deep Dive](https://www.typescriptlang.org/docs/handbook/declaration-files/deep-dive.html)

### Declaration Types: Namespace, Type, Value

In TypeScript, a declaration can create one or more of three things: a **namespace**, a **type**, or a **value**.

| Declaration Type  | Namespace | Type | Value |
|-------------------|-----------|------|-------|
| Namespace         | X         |      | X     |
| Class             |           | X    | X     |
| Enum              |           | X    | X     |
| Interface         |           | X    |       |
| Type Alias        |           | X    |       |
| Function          |           |      | X     |
| Variable          |           |      | X     |

Understanding which of these a declaration creates determines how it can be used and combined.

### Simple Combinations

When a name is used both as a type and as a value, TypeScript merges the declarations:

```ts
// This creates both a type and a value named 'Foo'
class Foo {
  static bar: string;
}
```

### Namespace + Interface Merging

Interfaces and namespaces with the same name are merged:

```ts
interface Point {
  x: number;
  y: number;
}

namespace Point {
  export function distance(p1: Point, p2: Point): number;
}
```

Now `Point` is both a type (describing the object shape) and a namespace (containing the `distance` function).

### Namespace + Class Merging

A namespace merged with a class adds static members:

```ts
class Album {
  label: Album.AlbumLabel;
}

namespace Album {
  export class AlbumLabel {}
}
```

### Namespace + Function Merging

A namespace merged with a function adds properties to the function:

```ts
function buildLabel(name: string): string {
  return buildLabel.prefix + name + buildLabel.suffix;
}

namespace buildLabel {
  export let suffix = "";
  export let prefix = "Hello, ";
}
```

### The `declare` Keyword

The `declare` keyword is used in `.d.ts` files to tell TypeScript about the existence of a value without providing an implementation. It can be applied to variables, functions, classes, modules, namespaces, and enums.

```ts
declare var myGlobal: string;
declare function doSomething(x: number): void;
declare class MyClass {
  constructor();
  method(): string;
}
declare namespace myNamespace {
  var value: number;
}
```

### Ambient Modules

Use `declare module` to describe modules that TypeScript can't find automatically:

```ts
declare module "path" {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
}
```

Wildcard module declarations match any module name pattern:

```ts
declare module "*.svg" {
  const content: string;
  export default content;
}
```

### Declaration File Resolution

TypeScript resolves `.d.ts` files in this order:

1. The `types` / `typings` field in `package.json`
2. `index.d.ts` in the package root
3. `@types/<name>` in `node_modules`
4. Files listed in `typeRoots` in `tsconfig.json`
5. Specific packages listed in `types` in `tsconfig.json`

### Triple-Slash Directives

Triple-slash directives are single-line comments at the top of a file that reference other declaration files:

```ts
/// <reference path="./other-declarations.d.ts" />
/// <reference types="node" />
/// <reference lib="es2015.promise" />
```

- `path` — references a local `.d.ts` file by relative path
- `types` — references an `@types` package
- `lib` — includes a built-in TypeScript lib file

## Publishing

- Reference material for [Publishing](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)

### Option 1 — Bundle Declarations with Your Package

Include `.d.ts` files in your npm package alongside the compiled JavaScript.

**Configure `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "declaration": true,
    "outDir": "./lib"
  }
}
```

**Point to declarations in `package.json`:**

```json
{
  "name": "awesome",
  "author": "Vandelay Industries",
  "version": "1.0.0",
  "main": "./lib/main.js",
  "types": "./lib/main.d.ts"
}
```

Both `"types"` and `"typings"` are accepted field names. If the main declaration file is named `index.d.ts` and lives in the package root, the `"types"` field is optional.

### Option 2 — Publish to DefinitelyTyped

If you don't own the library, submit declaration files to the [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) repository. Published packages appear as `@types/<name>` on npm.

### Supporting Multiple TypeScript Versions

Use `typesVersions` in `package.json` to ship different declarations for different TypeScript compiler versions:

```json
{
  "name": "awesome",
  "version": "1.0.0",
  "typesVersions": {
    ">=4.0": {
      "*": ["ts4.0/*"]
    },
    ">=3.1": {
      "*": ["ts3.1/*"]
    }
  }
}
```

TypeScript picks the first matching range when resolving types.

### Dependencies on Other Type Packages

If your declaration file uses types from another `@types` package, declare that dependency in `package.json`. Use `"dependencies"` (not `"devDependencies"`) so that consumers get the required types automatically:

```json
{
  "dependencies": {
    "@types/node": "*"
  }
}
```

## Consumption

- Reference material for [Consumption](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html)

### Installing Type Declarations

For libraries that don't bundle their own declarations, install the community-maintained types from DefinitelyTyped:

```sh
npm install --save-dev @types/lodash
```

Once installed, you can use the library with full type safety:

```ts
import * as _ from "lodash";
_.padStart("Hello TypeScript!", 20, " ");
```

TypeScript automatically finds `@types` packages in `node_modules/@types` without any additional configuration.

### Controlling Which Types Are Included

By default, TypeScript includes all packages found under `node_modules/@types`. You can restrict this with `tsconfig.json` options.

**`typeRoots`** — specifies directories to search for type packages (replaces the default `@types` lookup):

```json
{
  "compilerOptions": {
    "typeRoots": ["./typings", "./vendor/types"]
  }
}
```

**`types`** — specifies an explicit list of `@types` packages to include:

```json
{
  "compilerOptions": {
    "types": ["node", "lodash", "express"]
  }
}
```

With `"types"` set, only the listed packages are included. Other `@types` packages in `node_modules` will not be automatically included.

These options affect only globally-scoped declarations. Explicitly imported packages (via `import`) are always included regardless of these settings.
