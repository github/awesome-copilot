# TypeScript Essentials

TypeScript reference material covering essential language features and concepts from the official TypeScript documentation.

## Utility Types

- Reference material for [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

Built-in generic types that transform existing types into new ones.

```ts
// Partial<T> — makes all properties optional
interface User { name: string; age: number; }
const update: Partial<User> = { name: "Alice" };

// Required<T> — makes all properties required
interface Config { timeout?: number; retries?: number; }
const config: Required<Config> = { timeout: 3000, retries: 3 };

// Readonly<T> — makes all properties read-only
const p: Readonly<{ x: number; y: number }> = { x: 1, y: 2 };
// p.x = 5; // Error

// Record<K, V> — key-value map type
type Roles = "admin" | "user" | "guest";
const permissions: Record<Roles, boolean> = { admin: true, user: false, guest: false };

// Pick<T, K> — select a subset of keys
type UserPreview = Pick<User, "name">;

// Omit<T, K> — remove a subset of keys
type PublicUser = Omit<{ id: number; name: string; password: string }, "password">;

// Exclude<T, U> — remove union members assignable to U
type ActiveStatus = Exclude<"active" | "inactive" | "pending", "inactive" | "pending">;
// "active"

// Extract<T, U> — keep only union members assignable to U
type StringOrNumber = Extract<string | number | boolean, string | number>;

// NonNullable<T> — remove null and undefined
type DefiniteString = NonNullable<string | null | undefined>; // string

// ReturnType<T> — extract function return type
function getUser() { return { id: 1, name: "Alice" }; }
type UserType = ReturnType<typeof getUser>;

// Parameters<T> — extract function parameter types as a tuple
type Params = Parameters<(name: string, age: number) => void>;
// [name: string, age: number]

// InstanceType<T> — extract class instance type
class MyClass { x = 10; }
type Instance = InstanceType<typeof MyClass>;

// ConstructorParameters<T> — extract constructor parameters
class Point { constructor(public x: number, public y: number) {} }
type PointArgs = ConstructorParameters<typeof Point>; // [number, number]

// Awaited<T> — recursively unwrap Promise
type A = Awaited<Promise<Promise<number>>>; // number

// String manipulation
type Upper = Uppercase<"hello">;       // "HELLO"
type Lower = Lowercase<"WORLD">;       // "world"
type Cap   = Capitalize<"typescript">; // "Typescript"
type Uncap = Uncapitalize<"TypeScript">; // "typeScript"
```

Key utility types reference:

| Utility Type | Purpose |
|---|---|
| `Partial<T>` | All props optional |
| `Required<T>` | All props required |
| `Readonly<T>` | All props read-only |
| `Record<K,V>` | Key-value map type |
| `Pick<T,K>` | Select subset of keys |
| `Omit<T,K>` | Remove subset of keys |
| `Exclude<T,U>` | Remove union members |
| `Extract<T,U>` | Keep union members |
| `NonNullable<T>` | Remove null/undefined |
| `ReturnType<T>` | Function return type |
| `Parameters<T>` | Function param types |
| `InstanceType<T>` | Class instance type |
| `Awaited<T>` | Unwrap Promise type |

## Cheat Sheets

- Reference material for [Cheat Sheets](https://www.typescriptlang.org/cheatsheets/)

Four downloadable cheat sheets covering core TypeScript topics:

**Control Flow Analysis** — narrowing, type guards, `typeof`, `instanceof`, `in`, assignments, exhaustiveness checks.

**Types** — primitive types, unions, intersections, generics, utility types, mapped types, conditional types.

**Interfaces** — object shapes, optional/readonly properties, index signatures, extending, declaration merging.

**Classes** — constructors, fields, access modifiers (`public`, `private`, `protected`), `abstract`, generics, decorators.

```ts
// Control flow narrowing example
function padLeft(value: string, padding: string | number) {
  if (typeof padding === "number") {
    return " ".repeat(padding) + value; // padding: number
  }
  return padding + value; // padding: string
}

// Mapped type (from Types sheet)
type Optional<T> = { [K in keyof T]?: T[K] };

// Interface extending (from Interfaces sheet)
interface Animal { name: string; }
interface Dog extends Animal { breed: string; }

// Abstract class (from Classes sheet)
abstract class Shape {
  abstract getArea(): number;
  toString() { return `Area: ${this.getArea()}`; }
}
```

## Decorators

- Reference material for [Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)

Decorators are special declarations that attach to classes, methods, accessors, properties, or parameters. Require `"experimentalDecorators": true` in `tsconfig.json` for legacy decorators. TypeScript 5.0+ supports Stage 3 decorators without a flag.

```ts
// tsconfig.json (legacy decorators)
// { "compilerOptions": { "experimentalDecorators": true, "emitDecoratorMetadata": true } }

// Decorator factory — customizes the decorator
function color(value: string) {
  return function (target: any) {
    target.prototype.color = value;
  };
}

// Class decorator
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
@color("blue")
class BugReport {
  type = "report";
  title: string;
  constructor(t: string) { this.title = t; }
}

// Method decorator
function enumerable(value: boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = value;
  };
}

class Greeter {
  @enumerable(false)
  greet() { return "Hello!"; }
}

// Property decorator (using reflect-metadata)
// import "reflect-metadata";
// const formatMetadataKey = Symbol("format");
// function format(formatString: string) {
//   return Reflect.metadata(formatMetadataKey, formatString);
// }

// Parameter decorator
function required(target: Object, propertyKey: string | symbol, parameterIndex: number) {
  // mark parameter as required via metadata
}

// TypeScript 5.0 Stage 3 decorator (no flag needed)
function loggedMethod(originalMethod: any, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name);
  return function (this: any, ...args: any[]) {
    console.log(`Entering '${methodName}'`);
    const result = originalMethod.call(this, ...args);
    console.log(`Exiting '${methodName}'`);
    return result;
  };
}

class Person {
  name: string;
  constructor(name: string) { this.name = name; }

  @loggedMethod
  greet() { console.log(`Hello, my name is ${this.name}.`); }
}
```

Decorator evaluation order: multiple decorators on one declaration are evaluated top-down but applied bottom-up. Across a class: instance members first (parameter → method/accessor/property), then static members, then constructor parameters, then class decorators.

## Declaration Merging

- Reference material for [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)

TypeScript merges two or more separate declarations with the same name into a single definition.

```ts
// Interface merging — merged into one interface
interface Box { height: number; width: number; }
interface Box { scale: number; }
const box: Box = { height: 5, width: 6, scale: 10 };

// Function member overloads — later interface members have higher priority
interface Cloner { clone(animal: Animal): Animal; }
interface Cloner { clone(animal: Sheep): Sheep; }
// Merged: Sheep overload first, then Animal

// Namespace merging
namespace Animals { export class Zebra {} }
namespace Animals { export class Dog {} }
// Both Zebra and Dog are available on Animals

// Namespace + class
class Album { label: Album.AlbumLabel; }
namespace Album { export class AlbumLabel {} }

// Namespace + function (adds properties to a function)
function buildLabel(name: string): string {
  return buildLabel.prefix + name + buildLabel.suffix;
}
namespace buildLabel {
  export let suffix = "";
  export let prefix = "Hello, ";
}

// Namespace + enum (adds methods to an enum)
enum Color { red = 1, green = 2, blue = 4 }
namespace Color {
  export function mixColor(colorName: string) {
    if (colorName === "yellow") return Color.red + Color.green;
  }
}

// Module augmentation — add to an existing module
// In map.ts:
// import { Observable } from "./observable";
// declare module "./observable" {
//   interface Observable<T> {
//     map<U>(f: (x: T) => U): Observable<U>;
//   }
// }

// Global augmentation from a module file
declare global {
  interface Array<T> {
    toObservable(): Observable<T>;
  }
}
```

Key limitations: cannot create new top-level declarations in module augmentation; classes cannot merge with other classes (use mixins instead).

## Enums

- Reference material for [Enums](https://www.typescriptlang.org/docs/handbook/enums.html)

Enums define a set of named constants. TypeScript supports numeric, string, and heterogeneous enums.

```ts
// Numeric enums — auto-incremented from 0 (or a custom start)
enum Direction { Up, Down, Left, Right }     // 0, 1, 2, 3
enum Direction { Up = 1, Down, Left, Right } // 1, 2, 3, 4

// Numeric enums support reverse mapping
enum Color { Red = 1 }
Color[1];   // "Red"
Color.Red;  // 1

// String enums — no reverse mapping, more debuggable
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

// Heterogeneous enums (not recommended)
enum BooleanLike { No = 0, Yes = "YES" }

// Computed and constant members
enum FileAccess {
  None,
  Read    = 1 << 1,
  Write   = 1 << 2,
  ReadWrite = Read | Write,
  G = "123".length, // computed
}

// const enums — fully inlined at compile time, no runtime object
const enum Direction2 { Up, Down, Left, Right }
let dir = Direction2.Up; // compiles to: let dir = 0;

// Ambient enums — describe existing enum shapes
declare enum Enum { A = 1, B, C = 2 }

// Alternative: as const objects (recommended for new code)
const Dir = { Up: "UP", Down: "DOWN" } as const;
type Dir = typeof Dir[keyof typeof Dir]; // "UP" | "DOWN"
```

| Feature | Numeric | String | `const` | Ambient |
|---|---|---|---|---|
| Reverse mapping | Yes | No | No | No |
| Runtime object | Yes | Yes | No | No |
| Computed members | Yes | No | No | Yes |
| Inlined at compile | No | No | Yes | N/A |

## Iterators and Generators

- Reference material for [Iterators and Generators](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html)

```ts
// Core interfaces
interface Iterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
  return?(value?: TReturn): IteratorResult<T, TReturn>;
  throw?(e?: any): IteratorResult<T, TReturn>;
}

interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}

// IterableIterator combines both — most useful in practice
interface IterableIterator<T> extends Iterator<T> {
  [Symbol.iterator](): IterableIterator<T>;
}

// for...of vs for...in
let list = [4, 5, 6];
for (let i in list)  { console.log(i); } // "0", "1", "2" (keys)
for (let i of list)  { console.log(i); } // 4, 5, 6     (values)

// Generator function — yield pauses execution
function* infiniteSequence(): IterableIterator<number> {
  let i = 0;
  while (true) { yield i++; }
}

function* range(start: number, end: number): IterableIterator<number> {
  for (let i = start; i < end; i++) { yield i; }
}

for (const num of range(1, 5)) { console.log(num); } // 1, 2, 3, 4

// Custom iterable class
class Range implements Iterable<number> {
  constructor(private start: number, private end: number) {}

  [Symbol.iterator](): Iterator<number> {
    let current = this.start;
    const end = this.end;
    return {
      next(): IteratorResult<number> {
        if (current <= end) return { value: current++, done: false };
        return { value: undefined as any, done: true };
      }
    };
  }
}
```

For older compile targets, enable full iterator support:
```ts
// tsconfig.json
// { "compilerOptions": { "target": "ES5", "downlevelIteration": true } }
```

## JSX

- Reference material for [JSX](https://www.typescriptlang.org/docs/handbook/jsx.html)

TypeScript supports JSX syntax for projects that use JSX-based libraries. To use JSX: name files `.tsx` and set the `jsx` compiler option.

```ts
// tsconfig.json
// { "compilerOptions": { "jsx": "preserve" } }  // or "react-jsx", etc.
```

JSX emission modes:

| Mode | Input | Output | File Extension |
|------|-------|--------|----------------|
| `preserve` | `<div />` | `<div />` | `.jsx` |
| `react` | `<div />` | `React.createElement("div")` | `.js` |
| `react-jsx` | `<div />` | `_jsx("div", {})` | `.js` |

```tsx
// Intrinsic elements — lowercase, mapped via JSX.IntrinsicElements
const element = <div className="box" />;

// Value-based elements — capitalized components
function MyButton(props: { label: string }) {
  return <button>{props.label}</button>;
}
const btn = <MyButton label="Click me" />;

// Props type checking
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}
function Button({ label, onClick, disabled }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// Generic components
function Identity<T>(props: { value: T; render: (val: T) => JSX.Element }) {
  return props.render(props.value);
}
```

Key compiler options: `jsx`, `jsxFactory`, `jsxFragmentFactory`, `jsxImportSource`.

## Mixins

- Reference material for [Mixins](https://www.typescriptlang.org/docs/handbook/mixins.html)

Mixins compose classes from reusable parts since TypeScript does not support multiple inheritance directly. A mixin is a function that takes a base class and returns a new extended class.

```ts
// Base constructor type
type Constructor<T = {}> = new (...args: any[]) => T;

// Timestamped mixin
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = Date.now();
  };
}

// Activatable mixin
function Activatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    isActive = false;
    activate()   { this.isActive = true; }
    deactivate() { this.isActive = false; }
  };
}

class User { name = ""; }

// Compose multiple mixins
const TimestampedUser = Timestamped(User);
const TimestampedActivatableUser = Timestamped(Activatable(User));

const u = new TimestampedActivatableUser();
u.activate();
console.log(u.isActive, u.timestamp);

// Constrained mixin — requires base to have specific shape
type Spritable = Constructor<{ speed: number }>;

function Jumpable<TBase extends Spritable>(Base: TBase) {
  return class extends Base {
    jump() { console.log(`Jumping at speed ${this.speed}`); }
  };
}
```

| Rule | Detail |
|------|--------|
| Mixin is a function | Takes a class, returns a new class |
| Type constraint | Use `Constructor<T>` to require specific base shape |
| Composition order | Applied right-to-left: `A(B(C))` |
| Constructors | Must call `super(...args)` in mixin constructors |

## Namespaces

- Reference material for [Namespaces](https://www.typescriptlang.org/docs/handbook/namespaces.html)

Namespaces (formerly "internal modules") organize code into named scopes to prevent global naming collisions. Only items marked `export` are accessible outside the namespace.

```ts
// Basic namespace
namespace Validation {
  export interface StringValidator {
    isAcceptable(s: string): boolean;
  }

  const lettersRegexp = /^[A-Za-z]+$/; // private

  export class LettersOnlyValidator implements StringValidator {
    isAcceptable(s: string) { return lettersRegexp.test(s); }
  }
}

const validator = new Validation.LettersOnlyValidator();

// Multi-file namespaces — use reference tags
// /// <reference path="Validation.ts" />
// namespace Validation { ... }

// Compile with: tsc --outFile sample.js Validation.ts LettersValidator.ts

// Namespace alias — shorthand for deep nesting
namespace Shapes {
  export namespace Polygons {
    export class Triangle {}
    export class Square {}
  }
}
import polygons = Shapes.Polygons;
let sq = new polygons.Square();

// Ambient namespace — for external JS libraries without types
declare namespace D3 {
  export interface Selectors {
    select(selector: string): Selection;
  }
  export interface Selection {
    attr(name: string, value: string): Selection;
  }
}
```

Note: for new projects, prefer ES modules (`import`/`export`) over namespaces.

## Namespaces and Modules

- Reference material for [Namespaces and Modules](https://www.typescriptlang.org/docs/handbook/namespaces-and-modules.html)

Modules (ES modules) are the modern, standard approach for organizing TypeScript code. Namespaces are a legacy mechanism primarily useful for ambient declarations and declaration files.

```ts
// Modules — file-based, isolated scope
// math.ts
export function add(a: number, b: number): number { return a + b; }

// app.ts
import { add } from "./math";
console.log(add(1, 2));

// Namespace — global scope by default
namespace Validation {
  export class LettersOnlyValidator { /* ... */ }
}

// Anti-pattern: wrapping module exports in a namespace
export namespace Utils {
  export function helper() {} // callers need Utils.helper() — unnecessary nesting
}

// Better: export directly
export function helper() {}
```

Pitfalls of using namespaces in module files:

| Pitfall | Description |
|---|---|
| Namespace over modules | Redundant and confusing in a module system |
| Global pollution | Namespaces live on the global scope by default |
| No tree-shaking | Bundlers cannot eliminate unused namespace code |
| `/// <reference>` complexity | Multi-file namespaces require manual dependency ordering |
| Deep nesting | `App.Utils.Strings.trim` becomes unwieldy |

When to use modules vs namespaces:
- **Modules**: all new applications and libraries, any code using a bundler or Node.js
- **Namespaces**: `.d.ts` declaration files for global scripts, legacy non-module scripts, UMD global library typings

## Symbols

- Reference material for [Symbols](https://www.typescriptlang.org/docs/handbook/symbols.html)

`symbol` is a primitive type (ES2015+). Each `Symbol()` produces a unique, immutable value.

```ts
// Symbol creation — always unique
const sym1 = Symbol();
const sym2 = Symbol("description");
const sym3 = Symbol("description");
sym2 === sym3; // false

// unique symbol — compile-time unique identity, must be const
const KEY: unique symbol = Symbol("key");

// Symbols as object keys — not enumerable in for...in or Object.keys()
const id = Symbol("id");
const user = { name: "Alice", [id]: 42 };
console.log(user[id]); // 42

// Global symbol registry — shared across realms
const s1 = Symbol.for("shared");
const s2 = Symbol.for("shared");
s1 === s2;           // true
Symbol.keyFor(s1);   // "shared"

// Well-known symbols customize language behavior
class Range {
  constructor(public start: number, public end: number) {}

  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next(): IteratorResult<number> {
        return current <= end
          ? { value: current++, done: false }
          : { value: undefined as any, done: true };
      }
    };
  }
}

// Symbol.toPrimitive — custom type coercion
class Temperature {
  constructor(private celsius: number) {}
  [Symbol.toPrimitive](hint: string) {
    if (hint === "number") return this.celsius;
    if (hint === "string") return `${this.celsius}°C`;
    return this.celsius;
  }
}

// Symbol.hasInstance — custom instanceof behavior
class EvenNumber {
  static [Symbol.hasInstance](value: unknown): boolean {
    return typeof value === "number" && value % 2 === 0;
  }
}
4 instanceof EvenNumber; // true
5 instanceof EvenNumber; // false
```

Well-known symbols:

| Symbol | Purpose |
|---|---|
| `Symbol.iterator` | Custom iteration (`for...of`) |
| `Symbol.asyncIterator` | Async iteration |
| `Symbol.hasInstance` | `instanceof` behavior |
| `Symbol.toPrimitive` | Type coercion |
| `Symbol.toStringTag` | `Object.prototype.toString` tag |
| `Symbol.species` | Constructor for derived objects |

## Triple-Slash Directives

- Reference material for [Triple-Slash Directives](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html)

Triple-slash directives are single-line XML-tag comments that must appear at the top of a file before any code. They serve as compiler instructions. Directives are ignored inside module files (files that contain `import`/`export`).

```ts
// /// <reference path="..." /> — declares dependency on another file
/// <reference path="./utils.ts" />
/// <reference path="../typings/jquery.d.ts" />

// /// <reference types="..." /> — declares dependency on a @types package
/// <reference types="node" />
/// <reference types="jest" />

// /// <reference lib="..." /> — includes a specific built-in lib
/// <reference lib="es2017.string" />
/// <reference lib="dom" />
/// <reference lib="es2015.iterable" />

function toArray<T>(iter: Iterable<T>): T[] { return [...iter]; }

// /// <reference no-default-lib="true" /> — marks file as a library,
// prevents compiler from including default lib.d.ts files
// Found in TypeScript's own built-in lib files; rarely used in user code.

// /// <amd-module name="..." /> — assigns a name to an AMD module
/// <amd-module name="NamedModule" />
export class C {}
// Compiled AMD output: define("NamedModule", ["require", "exports"], ...)

// /// <amd-dependency path="..." /> — deprecated; use import instead
```

Key rules:

| Rule | Detail |
|------|--------|
| Placement | Must appear before any code, imports, or non-directive comments |
| Modules | Directives are ignored inside ES module files |
| `noResolve` | With `--noResolve` flag, `reference path` directives are ignored |

Common use in published `.d.ts` files:
```ts
// mylib.d.ts
/// <reference types="node" />
export declare function readConfig(path: string): NodeJS.ProcessEnv;
```

## Type Compatibility

- Reference material for [Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)

TypeScript uses structural typing (duck typing) — types are compatible if their shapes match, regardless of how they were declared.

```ts
// Structural typing — shape matters, not declaration
interface Named { name: string; }
class Person { name: string = ""; }

let p: Named = new Person(); // OK — Person has the required shape

// Object compatibility — target needs at least the source's properties
interface Pet { name: string; }
interface Dog { name: string; breed: string; }
let pet: Pet;
let dog: Dog = { name: "Rex", breed: "Lab" };
pet = dog;  // OK — Dog has everything Pet needs
// dog = pet; // Error — Pet lacks `breed`

// Function compatibility — fewer parameters is OK
let handler: (a: number, b: number) => void;
handler = (a: number) => {}; // OK — extra params are ignored

// Return types — source return type must be a subtype of target
class Animal { feet: number = 4; }
class DogAnimal extends Animal { name: string = ""; }
let getAnimal: () => Animal;
let getDog: () => DogAnimal = () => new DogAnimal();
getAnimal = getDog; // OK — DogAnimal is a subtype of Animal

// Generics — compared after substitution
interface Empty<T> {}
let x: Empty<number>;
let y: Empty<string>;
x = y; // OK — identical structure regardless of T

interface NotEmpty<T> { data: T; }
let a: NotEmpty<number>;
let b: NotEmpty<string>;
// a = b; // Error — number !== string

// Enum compatibility — different enums are incompatible with each other
enum Status { Active, Inactive }
enum Color  { Red, Green }
// let s: Status = Color.Red; // Error

let n: number = Status.Active; // OK — numeric enums are compatible with number

// Class compatibility — only instance members compared (statics ignored)
class A { feet = 4; }
class B { feet = 4; name = ""; }
let ca: A = new B(); // OK

// Private members must come from the same declaration
class X { private secret = 1; }
class Z { private secret = 1; }
// let cx: X = new Z(); // Error — different private declarations
```

Assignment compatibility extends subtype compatibility: `any` is assignable to/from anything; `void` is interchangeable with `undefined` in assignments.

## Type Inference

- Reference material for [Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)

TypeScript infers types automatically when no explicit annotation is given.

```ts
// Basic inference from initializers
let x = 3;           // number
let name = "Alice";  // string
let flag = true;     // boolean

// Best common type — union of candidate types
let arr = [0, 1, null];
// inferred as: (number | null)[]

class Animal {}
class Dog extends Animal {}
class Cat extends Animal {}

let animals = [new Dog(), new Cat()];
// inferred as: (Dog | Cat)[]
// NOT Animal[] — Animal must be explicitly included:
let animals2: Animal[] = [new Dog(), new Cat()];

// Contextual typing — type flows in from context
window.onmousedown = function(mouseEvent) {
  console.log(mouseEvent.button);   // OK — inferred as MouseEvent
  // console.log(mouseEvent.kangaroo); // Error
};

const names = ["Alice", "Bob"];
names.forEach(function(name) {
  console.log(name.toUpperCase()); // name inferred as string
});

// Return type inference
function add(x: number, y: number) {
  return x + y; // return type: number
}

function getValue(flag: boolean) {
  if (flag) return 42;
  return "default";
  // return type: number | string
}
```

| Concept | Behavior |
|---|---|
| Basic inference | Type flows from initializer/value |
| Best common type | Union of candidate types |
| Contextual typing | Type flows from usage context |
| Return type inference | Derived from all `return` paths |

## Variable Declaration

- Reference material for [Variable Declaration](https://www.typescriptlang.org/docs/handbook/variable-declarations.html)

```ts
// var — function-scoped, hoisted, allows re-declaration (avoid)
var x = 10;
for (var i = 0; i < 10; i++) {
  setTimeout(() => console.log(i), 100); // prints 10, ten times (closure over same i)
}

// let — block-scoped, temporal dead zone, no re-declaration
let y = 10;
if (true) {
  let y = 20; // different y — block-scoped
}
for (let i = 0; i < 10; i++) {
  setTimeout(() => console.log(i), 100); // prints 0–9 correctly
}

// const — block-scoped, immutable binding (object content still mutable)
const PI = 3.14;
// PI = 3; // Error
const obj = { name: "Alice" };
obj.name = "Bob"; // OK — content is mutable
// obj = {};     // Error — binding is immutable

// Array destructuring
let [first, second] = [1, 2];
let [, , third] = [1, 2, 3];             // skip elements
let [head, ...tail] = [1, 2, 3, 4];      // rest: tail = [2, 3, 4]
let [a = 0, b = 1] = [5];               // defaults: a=5, b=1
[first, second] = [second, first];       // swap

// Object destructuring
let { name, age } = { name: "Alice", age: 30 };
let { name: userName } = { name: "Alice" }; // rename
let { p = 5, q = 10 } = { p: 3 };          // defaults
let { x, ...rest } = { x: 1, y: 2, z: 3 }; // rest properties

// Function parameter destructuring
function greet({ name, age = 0 }: { name: string; age?: number }) {
  console.log(`${name} is ${age}`);
}

// Spread operator
let arr1 = [1, 2];
let arr2 = [3, 4];
let combined = [...arr1, ...arr2]; // [1, 2, 3, 4]

let obj1 = { a: 1, b: 2 };
let obj2 = { b: 3, c: 4 };
let merged = { ...obj1, ...obj2 }; // { a: 1, b: 3, c: 4 } — later props overwrite
```

Scoping rules:

| Feature | Scope | Hoisted | Re-declarable | Re-assignable |
|---|---|---|---|---|
| `var` | Function/Global | Yes | Yes | Yes |
| `let` | Block | No (TDZ) | No | Yes |
| `const` | Block | No (TDZ) | No | No |

Best practice: prefer `const` by default, use `let` when reassignment is needed, avoid `var`.
