# TypeScript - Get Started

Reference material from the official TypeScript documentation for getting started with TypeScript.

## TS for the New Programmer

- Reference material for [TS for the New Programmer](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)

### What is JavaScript? A Brief History

JavaScript (also known as ECMAScript) started as a simple scripting language for web browsers. When it was created, it was designed to be embedded directly in web pages as short snippets of code. Over time, JavaScript grew to become a full-featured language used on both the client and server sides.

JavaScript has quirks from its origins: it lacks a formal type system, it coerces values unexpectedly, and errors are only discovered at runtime. These characteristics make large JavaScript codebases difficult to maintain.

### TypeScript: A Static Type Checker

A static type checker finds errors in code _before_ the program is ever run. TypeScript is exactly this — a **static type checker** for JavaScript.

- TypeScript adds a type system on top of JavaScript
- TypeScript catches type errors at compile time, not runtime
- TypeScript = JavaScript + static type checking

```ts
const obj = { width: 10, height: 15 };
// TypeScript catches this typo before runtime:
const area = obj.width * obj.hieght;
// Error: Property 'hieght' does not exist on type '{ width: number; height: number }'
// Did you mean 'height'?
```

### A Typed Superset of JavaScript

TypeScript is a **superset** of JavaScript — any valid JavaScript code is also valid TypeScript code. This means:

- You can rename any `.js` file to `.ts` and it will work
- TypeScript adds optional syntax for types
- TypeScript compiles down to plain JavaScript
- TypeScript types are erased at runtime — no type information exists when the code runs

### The TypeScript Compiler (`tsc`)

TypeScript code is transformed into JavaScript through the TypeScript compiler:

```bash
# Install TypeScript
npm install -g typescript

# Compile a TypeScript file
tsc hello.ts

# Output: hello.js (plain JavaScript)
```

TypeScript errors do **not** prevent compilation by default. Even if TypeScript reports type errors, it will still produce JavaScript output. Use `noEmitOnError: true` in `tsconfig.json` to change this behavior.

### Key Design Goals

- TypeScript does **not** change JavaScript's runtime behavior
- TypeScript's type system is erased at runtime — there is no runtime type information
- TypeScript is a development tool, not a new language runtime
- TypeScript enables better tooling: autocompletion, refactoring, documentation

---

## TypeScript for JS Programmers

- Reference material for [TypeScript for JS Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

### Types by Inference

TypeScript knows JavaScript well and can infer types from existing code without any annotations:

```ts
// TypeScript infers helloWorld as type: string
let helloWorld = "Hello World";
```

### Defining Types

For cases where TypeScript cannot infer a type, or where you want to be explicit, you can define types using **interfaces** and **type annotations**:

```ts
interface User {
  name: string;
  id: number;
}

// Object literal must match the interface shape
const user: User = {
  name: "Hayes",
  id: 0,
};

// TypeScript will error if the shape doesn't match
const badUser: User = {
  username: "Hayes", // Error: 'username' does not exist in type 'User'
  id: 0,
};
```

You can also use interfaces to describe classes:

```ts
interface User {
  name: string;
  id: number;
}

class UserAccount {
  name: string;
  id: number;

  constructor(name: string, id: number) {
    this.name = name;
    this.id = id;
  }
}

const user: User = new UserAccount("Murphy", 1);
```

Use interfaces to annotate parameters and return values in functions:

```ts
function getAdminUser(): User {
  // ...
}

function deleteUser(user: User) {
  // ...
}
```

### Composing Types

TypeScript allows you to build complex types by combining simple types.

**Union Types** — a value can be one of several types:

```ts
type WindowStates = "open" | "closed" | "minimized";
type LockStates = "locked" | "unlocked";
type PositiveOddNumbersUnderTen = 1 | 3 | 5 | 7 | 9;

// Union with different types
type StringOrNumber = string | number;

function wrapInArray(obj: string | string[]) {
  if (typeof obj === "string") {
    return [obj]; // TypeScript knows obj is string here
  }
  return obj; // TypeScript knows obj is string[] here
}
```

**Generics** — provide variables to types:

```ts
type StringArray = Array<string>;
type NumberArray = Array<number>;
type ObjectWithNameArray = Array<{ name: string }>;

// Generic interface
interface Backpack<Type> {
  add: (obj: Type) => void;
  get: () => Type;
}

declare const backpack: Backpack<string>;
// backpack.add and backpack.get are type-safe for string
backpack.add("hello");
const item = backpack.get(); // Type: string
```

### Structural Type System (Duck Typing)

TypeScript uses a **structural type system**: type compatibility is based on shape, not explicit declarations. If two objects have the same structure, TypeScript considers them compatible — this is sometimes called "duck typing."

```ts
interface Point {
  x: number;
  y: number;
}

function logPoint(p: Point) {
  console.log(`${p.x}, ${p.y}`);
}

// point is never declared as a Point — TypeScript checks the shape
const point = { x: 12, y: 26 };
logPoint(point); // OK: point has x and y

// Extra properties are allowed
const point3 = { x: 12, y: 26, z: 89 };
logPoint(point3); // OK: has x and y (z is ignored)

// Classes work the same way
class VirtualPoint {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
const newVPoint = new VirtualPoint(13, 56);
logPoint(newVPoint); // OK: class has x and y
```

---

## TS for Java/C# Programmers

- Reference material for [TS for Java/C# Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html)

### Rethinking the Class

In Java and C#, every value and object is an instance of some class or primitive type. This OOP model is optional in TypeScript and JavaScript. Functions at the top level, plain data objects, and free functions are the norm in JavaScript.

TypeScript supports classes, but you are not required to use them. Many TypeScript patterns use plain objects and functions instead.

### Rethinking Types: Nominal vs Structural

In Java/C#, types are **nominal** — type compatibility is determined by the declared type name. In TypeScript, types are **structural** — compatibility is determined by the shape of the type (its properties and methods).

```ts
// In Java/C#: Car and Golfer are incompatible because they have different names
// In TypeScript: they are compatible because they have the same structure

class Car {
  drive() {
    console.log("vroom");
  }
}

class Golfer {
  drive() {
    console.log("whack");
  }
}

// No error! TypeScript only checks the shape.
let w: Car = new Golfer();
```

### Types as Sets of Values

TypeScript types are best understood as **sets of values** that share certain properties. A type is not a class or a label — it is a constraint on what values are allowed.

```ts
// This interface does not create a class — it describes a shape
interface Pointlike {
  x: number;
  y: number;
}

// Any object with x and y satisfies this type
function printPoint(p: Pointlike) {
  console.log(p.x, p.y);
}

printPoint({ x: 1, y: 2 }); // OK
printPoint({ x: 1, y: 2, z: 3 }); // OK — extra properties are allowed
```

### No Runtime Type Information

TypeScript types are **erased at compile time**. There is no type information available at runtime. This is different from Java/C# where reflection and `instanceof` work with declared class types.

```ts
// This works with classes (JavaScript has runtime class info)
class User {
  name: string;
  constructor(name: string) { this.name = name; }
}
const u = new User("Alice");
console.log(u instanceof User); // true at runtime

// But interfaces are completely erased — no runtime check possible
interface Admin {
  name: string;
  privileges: string[];
}
// There is no way to check "is this an Admin?" at runtime using the interface
```

Use **discriminated unions** to check types at runtime:

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  if (s.kind === "circle") {
    return Math.PI * s.radius ** 2;
  } else {
    return s.side ** 2;
  }
}
```

### Co-learning JavaScript and TypeScript

When coming from Java or C#, it is important to learn JavaScript patterns alongside TypeScript. Some TypeScript-specific advice for OOP programmers:

- Prefer **interfaces** for describing data shapes
- Prefer **type aliases** for union types and complex type expressions
- Do not feel compelled to use classes for everything — functions and objects are idiomatic
- TypeScript generics behave similarly to Java/C# generics but are **erased at runtime**
- There are no checked exceptions in TypeScript/JavaScript
- TypeScript enums are different from Java/C# enums — consider using `as const` objects or union types instead

---

## TS for Functional Programmers

- Reference material for [TS for Functional Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html)

### Built-in Types

TypeScript shares JavaScript's primitive types and adds additional type-level constructs:

| Type | Description |
|------|-------------|
| `number` | All numeric values (integer and floating point) |
| `string` | Unicode string values |
| `bigint` | Integers in the arbitrary precision range |
| `boolean` | `true` and `false` |
| `symbol` | Unique values via `Symbol()` |
| `null` | Intentional absence of value |
| `undefined` | Uninitialized value |
| `object` | Non-primitive types |
| `unknown` | Top type — a type-safe alternative to `any` |
| `never` | Bottom type — a value that never occurs |
| `any` | Opt out of type checking |
| `void` | Functions that return `undefined` |

### Unit Types (Literal Types)

TypeScript supports literal types — types that represent a single specific value:

```ts
type Bit = 0 | 1;
type Direction = "north" | "south" | "east" | "west";
type YesOrNo = "yes" | "no";
```

### Discriminated Unions

Discriminated unions are TypeScript's primary pattern for algebraic data types:

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; x: number }
  | { kind: "triangle"; x: number; y: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius * s.radius;
    case "square":
      return s.x * s.x;
    case "triangle":
      return (s.x * s.y) / 2;
    // TypeScript ensures all cases are covered (with `noImplicitReturns`)
  }
}
```

### Intersection Types

Intersection types combine multiple types into one:

```ts
type Combined = { a: number } & { b: string };
// Combined has both a: number and b: string

type Conflicting = { a: number } & { a: string };
// The type of 'a' is: number & string = never
```

### `readonly` and `as const`

TypeScript supports `readonly` for immutable properties and `as const` for deeply immutable values:

```ts
// readonly array — cannot be mutated
function sortBy<T, K extends keyof T>(arr: readonly T[], key: K): T[] {
  return [...arr].sort((a, b) =>
    a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
  );
}

// as const — all properties become readonly literal types
const config = {
  endpoint: "https://example.com",
  port: 8080,
} as const;
// config.endpoint is type: "https://example.com" (not string)
```

### Type Aliases

Type aliases create named references to types and support recursive definitions:

```ts
// Simple alias
type Point = { x: number; y: number };

// Recursive type alias
type Tree<T> = {
  value: T;
  left?: Tree<T>;
  right?: Tree<T>;
};

// Alias for a function type
type Predicate<T> = (value: T) => boolean;
```

### `unknown` vs `any`

- `any` disables all type checking — avoid using it
- `unknown` is the type-safe alternative: a value of type `unknown` cannot be used until it is narrowed

```ts
function processInput(input: unknown) {
  // input.toUpperCase(); // Error: cannot call methods on unknown

  if (typeof input === "string") {
    console.log(input.toUpperCase()); // OK after narrowing
  }
}
```

### TypeScript's Type System Features for Functional Programming

TypeScript supports many features relevant to functional programming:

- **Higher-kinded types** are not directly supported, but many patterns are possible with generics
- **Mapped types** transform every property of a type
- **Conditional types** express type-level conditionals (`T extends U ? X : Y`)
- **Template literal types** create string-based type transformations
- **Infer keyword** for type-level pattern matching in conditional types

```ts
// Mapped type example
type Optional<T> = { [K in keyof T]?: T[K] };

// Conditional type example
type Flatten<T> = T extends Array<infer Item> ? Item : T;
type Str = Flatten<string[]>; // string
type Num = Flatten<number>;   // number
```

---

## TypeScript Tooling in 5 Minutes

- Reference material for [TypeScript Tooling in 5 minutes](https://www.typescriptlang.org/docs/handbook/typescript-tooling-in-5-minutes.html)

### Installing TypeScript

TypeScript can be installed globally via npm or used locally per project:

```bash
# Install globally
npm install -g typescript

# Verify installation
tsc --version
```

### Creating Your First TypeScript File

Create a file named `greeter.ts`:

```ts
function greeter(person: string) {
  return "Hello, " + person;
}

let user = "Jane User";
document.body.textContent = greeter(user);
```

Compile it:

```bash
tsc greeter.ts
# Output: greeter.js
```

TypeScript will catch type errors. For example, passing the wrong type:

```ts
function greeter(person: string) {
  return "Hello, " + person;
}

let user = [0, 1, 2]; // Array, not string

document.body.textContent = greeter(user);
// Error: Argument of type 'number[]' is not assignable to parameter of type 'string'
```

Even though there is an error, `greeter.js` is still produced. Use `noEmitOnError: true` to prevent output when there are errors.

### Type Annotations

Type annotations in TypeScript are lightweight ways to record the intended contract of the function or variable:

```ts
// Parameter annotation: person must be a string
function greeter(person: string) {
  return "Hello, " + person;
}

// Variable annotation
let isDone: boolean = false;
let decimal: number = 6;
let color: string = "blue";
```

### Interfaces

Define object shapes using interfaces:

```ts
interface Person {
  firstName: string;
  lastName: string;
}

function greeter(person: Person) {
  return "Hello, " + person.firstName + " " + person.lastName;
}

let user = { firstName: "Jane", lastName: "User" };

document.body.textContent = greeter(user);
// The object literal satisfies the Person interface structurally
```

### Classes

TypeScript supports ES6+ classes with full type checking. Constructor parameter shorthand (`public`) automatically creates and initializes class members:

```ts
class Student {
  fullName: string;

  constructor(
    public firstName: string,
    public middleInitial: string,
    public lastName: string
  ) {
    this.fullName = firstName + " " + middleInitial + " " + lastName;
  }
}

interface Person {
  firstName: string;
  lastName: string;
}

function greeter(person: Person) {
  return "Hello, " + person.firstName + " " + person.lastName;
}

let user = new Student("Jane", "M.", "User");

document.body.textContent = greeter(user);
// Student satisfies Person because it has firstName and lastName
```

### Running in the Browser

Use the compiled `.js` file in an HTML page:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>TypeScript Greeter</title>
  </head>
  <body>
    <script src="greeter.js"></script>
  </body>
</html>
```

### TypeScript-aware Editors

TypeScript's language service powers rich editor tooling in:

- **Visual Studio Code** — built-in TypeScript support
- **WebStorm / IntelliJ IDEA** — built-in TypeScript support
- **Vim / Neovim** — via tsserver language server
- **Emacs** — via tide or lsp-mode

All major editors support:
- Inline error reporting
- Autocompletion (IntelliSense)
- Go-to-definition and find-all-references
- Rename refactoring
- Hover documentation
