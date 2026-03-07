# TypeScript with JavaScript

Reference material for using TypeScript in JavaScript projects, type checking JS files, and working with JSDoc from the official TypeScript documentation.

## JS Projects Utilizing TypeScript

- Reference material for [JS Projects Utilizing TypeScript](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html)

TypeScript offers varying levels of type checking for JavaScript files. The type system can infer types from JS code, and JSDoc annotations can provide explicit type information.

**Levels of type checking in JS files:**

| Level | How to enable | What it does |
|---|---|---|
| Per-file loose check | `// @ts-check` at top of file | Basic type inference and error reporting |
| Per-file disable | `// @ts-nocheck` at top of file | Disables all checking for that file |
| Project-wide | `"checkJs": true` in tsconfig | Checks all `.js` files in the project |
| JS in TS project | `"allowJs": true` in tsconfig | Allows `.js` files alongside `.ts` files |

**Per-file check with `// @ts-check`:**

```js
// @ts-check
let itsAString = "hello!";
itsAString = 123;
// Error: Type 'number' is not assignable to type 'string'.
```

**Suppressing specific errors with `// @ts-ignore`:**

```js
// @ts-check
let myValue = "hello";
// @ts-ignore
myValue = 42; // No error on this line
```

**Suppressing with `// @ts-expect-error`** (preferred — fails if no error exists):

```js
// @ts-check
// @ts-expect-error
let x = "hello";
x = 42;
```

**Using JSDoc for explicit typing in JS:**

```js
// @ts-check
/** @type {string} */
let myString;

/** @param {string} name */
function greet(name) {
  console.log("Hello " + name);
}
```

**Project-level configuration with `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "outDir": "./dist",
    "target": "ES2020"
  },
  "include": ["src/**/*"]
}
```

**`jsconfig.json`** is a tsconfig with `allowJs` implicitly true and is treated by editors as the configuration for a JavaScript project. Most tsconfig options are also valid in jsconfig.json.

```json
{
  "compilerOptions": {
    "checkJs": true,
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node"
  },
  "exclude": ["node_modules", "**/node_modules/*"]
}
```

## Type Checking JavaScript Files

- Reference material for [Type Checking JavaScript Files](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html)

TypeScript's type checker applies different inference rules to JavaScript files compared to TypeScript files.

**Key differences between JS and TS type checking:**

1. Types are optional — missing types are inferred rather than required
2. Types for classes are inferred from usage across the file
3. Objects can gain properties after creation
4. Function parameters are not checked against each other unless JSDoc is used

**Inferring class properties from constructor assignments:**

```js
// @ts-check
class Animal {
  constructor(name) {
    /** @type {string} */
    this.name = name;
    this.numLegs = 4; // TypeScript infers: number
  }
}
```

**Object property inference — properties can be added after the fact:**

```js
// @ts-check
let obj = {};
obj.name = "hello";  // OK in JS checking; would be an error in TS
obj.value = 42;      // OK
```

**CommonJS module imports are supported:**

```js
// @ts-check
const fs = require("fs");
module.exports.fn = function() { return 1; };
```

**Differences in function type checking:**

```js
// @ts-check
/** @param {string | number} value */
function padLeft(value, padding) {
  // padding is implicitly any; no error without JSDoc
  return " ".repeat(padding) + value;
}
```

**Special JSDoc forms that affect type checking:**

```js
// @ts-check
/** @type {{ x: number, y: number }} */
let point = { x: 0, y: 0 };

/**
 * @param {string} name
 * @returns {string}
 */
function greet(name) {
  return "Hello, " + name;
}
```

**Casting with JSDoc `@type` in parentheses:**

```js
// @ts-check
const value = /** @type {string} */ (someValue);
```

**`noImplicitAny` in JS files** — can be enabled to require explicit types on parameters:

```json
{
  "compilerOptions": {
    "checkJs": true,
    "noImplicitAny": true
  }
}
```

**Key behaviors unique to JS checking:**

- `arguments` object is always available in functions
- Module detection may differ from TS files
- `undefined` vs undeclared variables handled more loosely
- Prototype property assignments are tracked for class-like patterns:

```js
// @ts-check
function MyClass(name) {
  this.name = name;
}
MyClass.prototype.greet = function() {
  return "Hello, " + this.name; // `this` is typed as MyClass
};
```

## JSDoc Reference

- Reference material for [JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)

TypeScript supports a subset of JSDoc tags for type annotation in JavaScript files. These tags allow JavaScript code to benefit from TypeScript's type system without converting to `.ts` files.

**`@type`** — declares the type of a variable, parameter, or property:

```js
/** @type {string} */
let myStr;

/** @type {number | string} */
let numOrStr;

/** @type {Array<string>} */
let strArray;

/** @type {string[]} */
let strArray2;

/** @type {{ id: number, name: string }} */
let user;

/** @type {Object.<string, number>} */
let mapOfNumbers;

/** @type {function(string, boolean): number} */
let fn;

/** @type {(s: string, b: boolean) => number} */
let fn2;
```

**`@param` and `@returns`** — types for function parameters and return values:

```js
/**
 * @param {string}  p1 - A string param
 * @param {string=} p2 - An optional param (Closure syntax)
 * @param {string} [p3] - Another optional param (JSDoc syntax)
 * @param {string} [p4="test"] - An optional param with a default
 * @returns {string} This is the result
 */
function stringsStringStrings(p1, p2, p3, p4) {
  // TODO
}
```

**`@typedef`** — defines a custom type that can be reused:

```js
/**
 * @typedef {Object} SpecialType - creates a new type named 'SpecialType'
 * @property {string} prop1 - a string property of SpecialType
 * @property {number} prop2 - a number property of SpecialType
 * @property {number=} prop3 - an optional number property of SpecialType
 */

/** @type {SpecialType} */
let specialTypeObject;
```

**Shorthand `@typedef`:**

```js
/** @typedef {(data: string, index?: number) => boolean} Predicate */
```

**`@callback`** — like `@typedef` but for function types:

```js
/**
 * @callback Predicate
 * @param {string} data
 * @param {number} [index]
 * @returns {boolean}
 */

/** @type {Predicate} */
const ok = (s) => !(s.length % 2);
```

**`@template`** — declares generic type parameters:

```js
/**
 * @template T
 * @param {T} x
 * @returns {T}
 */
function identity(x) {
  return x;
}

// With constraints:
/**
 * @template {string} K - K must be a string or string literal
 * @template {{ serious(): string }} Seriousalizable
 * @param {K} key
 * @param {Seriousalizable} object
 */
function seriousalize(key, object) {
  // ....
}
```

**`@satisfies`** — validates that a value conforms to a type without changing the inferred type:

```js
// @ts-check
/**
 * @satisfies {Record<string, string>}
 */
const palette = {
  red: [255, 0, 0],    // Error: number[] is not string
  green: "#00ff00",
  blue: [0, 0, 255],   // Error: number[] is not string
};
```

**`@class` / `@constructor`** — marks a function as a constructor:

```js
/**
 * @constructor
 * @param {string} name
 */
function Person(name) {
  this.name = name;
}
const p = new Person("Alice");
```

**`@this`** — specifies the type of `this` inside a function:

```js
/**
 * @this {HTMLElement}
 * @param {*} e
 */
function callbackForLater(e) {
  this.clientHeight = parseInt(e);
}
```

**`@extends` / `@augments`** — specifies the superclass type for JS class inheritance:

```js
/**
 * @extends {Base<string>}
 */
class SpecializedDerived extends Base {
  // ...
}
```

**`@enum`** — marks an object as an enum where all properties have a consistent type:

```js
/** @enum {number} */
const JSDocState = {
  BeginningOfLine: 0,
  SawAsterisk: 1,
  SavingComments: 2,
};
```

**`@override`** — marks a method as overriding a base class method:

```js
class Animal {
  greet() { return "Hello!"; }
}
class Dog extends Animal {
  /** @override */
  greet() { return "Woof!"; }
}
```

**`@readonly`** — marks a property as read-only:

```js
class Foo {
  constructor() {
    /** @readonly */
    this.id = Math.random();
  }
}
const foo = new Foo();
foo.id = 5; // Error: Cannot assign to 'id' because it is a read-only property.
```

**`@deprecated`** — marks a symbol as deprecated with an optional message:

```js
/** @deprecated Use newFunction instead */
function oldFunction() {}
```

**`@overload`** — declares multiple call signatures for a function (TypeScript 5.0+):

```js
// @ts-check
/**
 * @overload
 * @param {string} value
 * @returns {void}
 */
/**
 * @overload
 * @param {number} value
 * @returns {void}
 */
/**
 * @param {string | number} value
 * @returns {void}
 */
function printValue(value) {
  console.log(value);
}
```

**`@import`** — imports types from other files (TypeScript 5.5+):

```js
// @ts-check
/** @import { SomeType } from "./module" */

/** @type {SomeType} */
let x;
```

**Importing types with `@type` using `import()`:**

```js
/** @type {import("./some-module").SomeType} */
let myVar;
```

**Cast syntax** — force a type with a `@type` comment wrapping a parenthesized expression:

```js
// @ts-check
const value = /** @type {string} */ (someUnknownValue);
```

## Creating .d.ts Files from .js files

- Reference material for [Creating .d.ts Files from .js files](https://www.typescriptlang.org/docs/handbook/declaration-files/dts-from-js.html)

TypeScript can automatically generate `.d.ts` declaration files from JavaScript source files, making it possible to add type definitions to existing JavaScript packages without rewriting them in TypeScript.

**Requirements to generate `.d.ts` from `.js`:**

- TypeScript 3.7 or later
- `allowJs: true` — allow JavaScript input files
- `declaration: true` — emit `.d.ts` files
- `emitDeclarationOnly: true` — emit only `.d.ts`, no `.js` output (optional but common)

**Minimal `tsconfig.json` to generate declarations:**

```json
{
  "compilerOptions": {
    "allowJs": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "types"
  },
  "include": ["src/**/*"]
}
```

**Emit declarations alongside compiled output:**

```json
{
  "compilerOptions": {
    "allowJs": true,
    "declaration": true,
    "outDir": "dist"
  }
}
```

**Example — JS source with JSDoc:**

```js
// src/index.js
/**
 * @param {string} name
 * @returns {string}
 */
export function greet(name) {
  return "Hello, " + name;
}

/** @type {number} */
export const version = 1;
```

**Generated `.d.ts` output:**

```ts
// types/index.d.ts
export function greet(name: string): string;
export const version: number;
```

**Classes with JSDoc produce full `.d.ts`:**

```js
// src/dog.js
export class Dog {
  /** @param {string} name */
  constructor(name) {
    this.name = name;
  }

  /** @returns {string} */
  bark() {
    return "Woof!";
  }
}
```

**Generated output:**

```ts
export class Dog {
  constructor(name: string);
  name: string;
  bark(): string;
}
```

**`@typedef` generates type aliases in `.d.ts`:**

```js
/**
 * @typedef {Object} Config
 * @property {string} host
 * @property {number} port
 */

/**
 * @param {Config} config
 */
export function connect(config) { }
```

**Generated output:**

```ts
export type Config = {
  host: string;
  port: number;
};
export function connect(config: Config): void;
```

**Using `declarationDir` to separate declaration output:**

```json
{
  "compilerOptions": {
    "allowJs": true,
    "declaration": true,
    "declarationDir": "./types",
    "outDir": "./dist"
  }
}
```

**Referencing generated declarations from `package.json`:**

```json
{
  "name": "my-js-package",
  "main": "dist/index.js",
  "types": "types/index.d.ts"
}
```

**Limitations of auto-generated `.d.ts` from JS:**

- Without JSDoc annotations, types will often be inferred as `any`
- Complex runtime patterns (mixins, dynamic property assignment) may not generate accurate types
- The generated declarations reflect TypeScript's best inference — manual adjustments may be needed
- Some JSDoc patterns (like `@typedef` in one file used across files) require `declaration: true` with careful file structuring
