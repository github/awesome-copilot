# TypeScript Quick Start

Quick start guides for TypeScript based on your background and experience.

## JS to TS

- Reference material for [JS to TS](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

TypeScript begins with the JavaScript you already know. If you write JavaScript, you already write TypeScript — TypeScript is a superset of JavaScript.

### Step 1: Types by Inference

TypeScript infers types automatically from your existing JavaScript patterns. No annotations needed to get started:

```ts
// TypeScript infers: let helloWorld: string
let helloWorld = "Hello World";

// TypeScript infers: let count: number
let count = 42;

// TypeScript infers: let flags: boolean[]
let flags = [true, false, true];
```

### Step 2: Annotate Where Needed

When TypeScript cannot infer a type — or when you want to be explicit about a contract — use type annotations:

```ts
// Annotate function parameters and return types
function add(a: number, b: number): number {
  return a + b;
}

// Annotate variables explicitly
let userName: string = "Alice";

// Annotate objects with interfaces
interface User {
  name: string;
  id: number;
}

const user: User = {
  name: "Hayes",
  id: 0,
};
```

### Step 3: Composing Types with Unions and Generics

**Union types** allow a value to be one of several types:

```ts
type StringOrNumber = string | number;

function formatId(id: string | number): string {
  return `ID: ${id}`;
}

// TypeScript narrows the type after a check
function printId(id: string | number) {
  if (typeof id === "string") {
    console.log(id.toUpperCase()); // TypeScript knows id is string
  } else {
    console.log(id.toFixed(0)); // TypeScript knows id is number
  }
}
```

**Generics** make components reusable across types:

```ts
// Generic function — works with any type T
function firstItem<T>(arr: T[]): T | undefined {
  return arr[0];
}

const first = firstItem([1, 2, 3]);     // Type: number | undefined
const name  = firstItem(["a", "b"]);    // Type: string | undefined

// Generic interface
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}
```

### Step 4: Structural Typing (Duck Typing)

TypeScript checks **shapes**, not type names. If an object has all the required properties, it satisfies the type — no explicit declaration needed:

```ts
interface Point {
  x: number;
  y: number;
}

function logPoint(p: Point) {
  console.log(`x=${p.x}, y=${p.y}`);
}

// This plain object satisfies Point — no "implements" needed
const pt = { x: 12, y: 26 };
logPoint(pt); // OK

// Extra properties are fine
const pt3d = { x: 1, y: 2, z: 3 };
logPoint(pt3d); // OK — only x and y are checked

// Classes satisfy interfaces structurally too
class Coordinate {
  constructor(public x: number, public y: number) {}
}
logPoint(new Coordinate(5, 10)); // OK
```

### Migrating from JavaScript

When migrating an existing JavaScript project:

1. Rename `.js` files to `.ts` one at a time
2. Add `tsconfig.json` with `"allowJs": true` to allow gradual migration
3. Fix type errors as you encounter them — or use `// @ts-ignore` temporarily
4. Remove `any` types progressively as you add proper type definitions

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,
    "strict": false,
    "noImplicitAny": false
  }
}
```

Then tighten settings over time as the codebase is migrated.

---

## New to Programming

- Reference material for [New to Programming](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)

TypeScript is a great first language for programming because it catches mistakes before you run your code.

### What TypeScript Does

TypeScript is a **static type checker** for JavaScript. It reads your code and identifies errors _before_ you run it, similar to how a spell checker finds mistakes in text.

```ts
// TypeScript catches this mistake before the program runs
const user = {
  firstName: "Angela",
  lastName: "Davis",
  role: "Professor",
};

// Typo: "lastNme" instead of "lastName"
console.log(user.lastNme);
// Error: Property 'lastNme' does not exist on type '{ firstName: string; lastName: string; role: string; }'
// Did you mean 'lastName'?
```

Without TypeScript, this error only shows up at runtime. With TypeScript, it is caught immediately.

### TypeScript is JavaScript with Types

All JavaScript code is valid TypeScript. TypeScript adds an optional layer of type annotations on top:

```ts
// Plain JavaScript — also valid TypeScript
function greet(name) {
  return "Hello, " + name + "!";
}

// TypeScript — with a type annotation
function greet(name: string): string {
  return "Hello, " + name + "!";
}
```

The `: string` annotations tell TypeScript what type a variable or parameter should be.

### Types Are Removed at Runtime

TypeScript's types only exist during development. When TypeScript compiles to JavaScript, all type information is erased. The JavaScript that runs in the browser or Node.js has no type information:

```ts
// TypeScript source
function add(a: number, b: number): number {
  return a + b;
}
```

```js
// Compiled JavaScript output (types erased)
function add(a, b) {
  return a + b;
}
```

### The TypeScript Compiler

Install TypeScript and use the `tsc` compiler:

```bash
# Install TypeScript
npm install -g typescript

# Compile a TypeScript file to JavaScript
tsc myfile.ts

# Watch for changes and recompile automatically
tsc --watch myfile.ts

# Initialize a project configuration
tsc --init
```

### Core Type Concepts for Beginners

**Primitive types:**

```ts
let age: number = 25;
let name: string = "Alice";
let isActive: boolean = true;
```

**Arrays:**

```ts
let scores: number[] = [100, 95, 87];
let names: string[] = ["Alice", "Bob", "Charlie"];
```

**Functions:**

```ts
function multiply(x: number, y: number): number {
  return x * y;
}

// Arrow function
const square = (n: number): number => n * n;
```

**Objects:**

```ts
// Inline object type
let person: { name: string; age: number } = {
  name: "Alice",
  age: 30,
};

// Reusable interface
interface Product {
  id: number;
  name: string;
  price: number;
  inStock?: boolean; // optional property
}
```

### Why Use TypeScript?

- **Catch errors early** — find bugs before shipping code
- **Better editor support** — autocompletion, rename, go-to-definition
- **Self-documenting code** — types communicate intent to other developers
- **Safer refactoring** — TypeScript tells you what breaks when you change code

---

## OOP to JS

- Reference material for [OOP to JS](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html)

If you are coming from Java, C#, or another class-oriented language, TypeScript's type system works differently than you might expect.

### Types are Structural, Not Nominal

In Java and C#, two classes with the same methods are still different types. In TypeScript, two objects with the same shape are the same type — regardless of their name or class.

```ts
class Cat {
  meow() {
    console.log("Meow!");
  }
}

class Dog {
  meow() {
    console.log("...Meow?");
  }
}

// No error — both classes have the same shape
let animal: Cat = new Dog();
```

This is called **structural typing** (or duck typing): "if it walks like a duck and quacks like a duck, it's a duck."

### Types as Sets

TypeScript types are best understood as **sets of values**. A type is not a class or a unique identity — it is a description of what values are allowed.

```ts
// This interface describes a set of objects that have x and y
interface Pointlike {
  x: number;
  y: number;
}

// Any object with x: number and y: number belongs to this "set"
const p1: Pointlike = { x: 1, y: 2 };           // OK
const p2: Pointlike = { x: 5, y: 10, z: 0 };    // OK — extra properties allowed
```

### No Runtime Type Information for Interfaces

TypeScript interfaces and type aliases are **compile-time only**. They are completely erased when compiled to JavaScript. You cannot use `instanceof` with interfaces:

```ts
interface Serializable {
  serialize(): string;
}

// This does NOT work — interfaces are erased at runtime
function save(obj: unknown) {
  if (obj instanceof Serializable) { // Error: 'Serializable' only refers to a type
    obj.serialize();
  }
}

// Instead, use discriminated unions or type guards
function isSerializable(obj: unknown): obj is Serializable {
  return typeof obj === "object" && obj !== null && typeof (obj as any).serialize === "function";
}
```

### Classes Still Work as Expected

TypeScript classes do work with `instanceof` because they exist at runtime as JavaScript constructor functions:

```ts
class Animal {
  constructor(public name: string) {}
  speak() { return `${this.name} makes a sound`; }
}

class Dog extends Animal {
  speak() { return `${this.name} barks`; }
}

const d = new Dog("Rex");
console.log(d instanceof Dog);    // true
console.log(d instanceof Animal); // true
```

### Key Differences from Java/C#

| Java/C# | TypeScript |
|---------|------------|
| Nominal typing (names matter) | Structural typing (shapes matter) |
| Types exist at runtime | Types erased at compile time |
| All types are classes or primitives | Functions and object literals are common |
| Checked exceptions | No checked exceptions |
| Enums are full types | Enums exist but union types are often preferred |
| Generics are reified at runtime | Generics are erased at compile time |
| `implements` required | `implements` optional — compatibility is structural |

### Recommended TypeScript Patterns for OOP Developers

```ts
// Prefer interfaces for data shapes
interface UserDto {
  id: string;
  name: string;
  email: string;
}

// Use union types instead of Java-style enums
type Status = "pending" | "active" | "inactive";

// Use discriminated unions instead of inheritance hierarchies
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function getUser(id: string): Result<UserDto> {
  if (id === "") {
    return { success: false, error: "ID cannot be empty" };
  }
  return { success: true, data: { id, name: "Alice", email: "alice@example.com" } };
}

const result = getUser("123");
if (result.success) {
  console.log(result.data.name); // TypeScript knows data exists
} else {
  console.log(result.error);     // TypeScript knows error exists
}
```

---

## Functional to JS

- Reference material for [Functional to JS](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html)

If you are coming from Haskell, Elm, PureScript, or other functional languages, TypeScript has many familiar concepts but with key differences.

### TypeScript's Type System is Structural

Like Haskell's structural approach, TypeScript uses **structural subtyping**. If a type has all the required properties, it is assignable to the expected type — no explicit declaration needed:

```ts
type Named = { name: string };

function greet(x: Named) {
  return "Hello, " + x.name;
}

// Any object with name: string satisfies Named
greet({ name: "Alice" });                      // OK
greet({ name: "Bob", age: 30 });               // OK — extra field is fine
```

### Discriminated Unions (Algebraic Data Types)

TypeScript's discriminated unions are the equivalent of algebraic data types in functional languages:

```ts
// Similar to a Haskell ADT:
// data Shape = Circle Double | Square Double | Triangle Double Double

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; x: number }
  | { kind: "triangle"; x: number; y: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":   return Math.PI * s.radius ** 2;
    case "square":   return s.x ** 2;
    case "triangle": return (s.x * s.y) / 2;
  }
  // TypeScript ensures exhaustiveness
}
```

### Unit Types (Literal Types)

Like Haskell's unit types, TypeScript supports literal types as specific value types:

```ts
type Bit = 0 | 1;
type Direction = "north" | "south" | "east" | "west";
type Bool = true | false; // same as boolean

// Narrowing refines the type
function move(dir: Direction, steps: number) {
  if (dir === "north" || dir === "south") {
    // dir is: "north" | "south"
    console.log(`Moving vertically ${steps} steps`);
  }
}
```

### `never` and `unknown` — Bottom and Top Types

TypeScript has the full lattice of types:

```ts
// unknown = top type — any value is assignable to unknown
let anything: unknown = 42;
anything = "hello";
anything = { x: 1 };

// You must narrow before using unknown
function process(val: unknown) {
  if (typeof val === "string") {
    console.log(val.toUpperCase()); // OK after narrowing
  }
}

// never = bottom type — a value of this type never exists
function fail(msg: string): never {
  throw new Error(msg);
}

// Exhaustiveness checking with never
function assertNever(x: never): never {
  throw new Error("Unexpected value: " + x);
}
```

### Immutability with `readonly` and `as const`

TypeScript supports immutability at the type level:

```ts
// readonly properties
interface Config {
  readonly host: string;
  readonly port: number;
}

// readonly arrays
function sum(nums: readonly number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

// as const — deeply immutable, all values become literal types
const DIRECTIONS = ["north", "south", "east", "west"] as const;
type Direction = typeof DIRECTIONS[number]; // "north" | "south" | "east" | "west"
```

### Higher-Order Functions and Generic Types

TypeScript supports higher-order functions with precise generic types:

```ts
// Map with generic types
function map<T, U>(arr: T[], fn: (item: T) => U): U[] {
  return arr.map(fn);
}

const lengths = map(["hello", "world"], (s) => s.length); // number[]

// Compose functions with types
type Fn<A, B> = (a: A) => B;

function compose<A, B, C>(f: Fn<B, C>, g: Fn<A, B>): Fn<A, C> {
  return (a) => f(g(a));
}

const toUpperLength = compose(
  (s: string) => s.length,
  (s: string) => s.toUpperCase()
);
console.log(toUpperLength("hello")); // 5
```

### Mapped and Conditional Types

TypeScript has type-level programming features similar to type classes and type families:

```ts
// Mapped types (similar to functor over record fields)
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// Conditional types (type-level if-then-else)
type IsArray<T> = T extends any[] ? true : false;
type A = IsArray<string[]>; // true
type B = IsArray<string>;   // false

// infer — type-level pattern matching
type ElementType<T> = T extends (infer E)[] ? E : never;
type E = ElementType<string[]>; // string
type N = ElementType<number>;   // never
```

---

## Installation

- Reference material for [Installation](https://www.typescriptlang.org/download/)

### Installing TypeScript via npm

The recommended way to install TypeScript is as a local dev dependency in your project:

```bash
# Install TypeScript as a project dev dependency (recommended)
npm install --save-dev typescript

# Run the TypeScript compiler via npx
npx tsc
```

### Global Installation

You can also install TypeScript globally for use across all projects:

```bash
# Install globally
npm install -g typescript

# Verify the installation
tsc --version
```

> Note: Global installation is convenient but local installation is preferred so each project can pin its own TypeScript version.

### Using TypeScript in a Project

**Initialize a new TypeScript project:**

```bash
# Create a tsconfig.json with default settings
npx tsc --init
```

**Add TypeScript scripts to `package.json`:**

```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "typecheck": "tsc --noEmit"
  }
}
```

**Compile your project:**

```bash
# Compile using tsconfig.json
npx tsc

# Compile a single file (bypasses tsconfig.json)
npx tsc index.ts

# Type-check without emitting output
npx tsc --noEmit
```

### Installing Type Definitions

Many JavaScript libraries ship without TypeScript types. Install type definitions from the `@types` namespace:

```bash
# Types for Node.js
npm install --save-dev @types/node

# Types for common libraries
npm install --save-dev @types/express
npm install --save-dev @types/lodash
npm install --save-dev @types/jest

# Search for available type definitions
npm search @types/[library-name]
```

### Minimal `tsconfig.json`

A minimal configuration to get started:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### TypeScript with Popular Frameworks

**React (with Vite):**

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app && npm install
```

**Next.js:**

```bash
npx create-next-app@latest my-app --typescript
```

**Node.js (Express):**

```bash
mkdir my-api && cd my-api
npm init -y
npm install express
npm install --save-dev typescript @types/node @types/express ts-node
npx tsc --init
```

**Angular:**

```bash
npm install -g @angular/cli
ng new my-app  # TypeScript is the default
```

### TypeScript Versions

TypeScript follows semver. To pin a specific version:

```bash
# Install a specific version
npm install --save-dev typescript@5.3.3

# Install the latest stable
npm install --save-dev typescript@latest

# Install the next/beta version
npm install --save-dev typescript@next
```

Check the currently installed version:

```bash
npx tsc --version
# Output: Version 5.x.x
```
