# TypeScript Handbook

Comprehensive TypeScript reference based on the official TypeScript Handbook. This document covers core concepts and patterns.

## Getting Started

TypeScript is a strongly typed programming language that builds on JavaScript. It adds optional static typing to JavaScript, enabling better tooling, error detection, and code quality.

### Key Benefits

- **Type Safety**: Catch errors at compile time instead of runtime
- **Better IDE Support**: Enhanced autocomplete, refactoring, and navigation
- **Code Documentation**: Types serve as inline documentation
- **Modern JavaScript Features**: Use latest ECMAScript features with backward compatibility
- **Gradual Adoption**: Add TypeScript incrementally to existing projects

## The Basics

### Static Type Checking

TypeScript analyzes your code to find errors before execution:

```typescript
// TypeScript catches this error at compile time
const message = "hello";
message(); // Error: This expression is not callable
```

### Non-Exception Failures

TypeScript catches common mistakes:

```typescript
const user = { name: "Alice", age: 30 };

// Typos
user.location; // Error: Property 'location' does not exist

// Uncalled functions
if (user.age.toFixed) // Error: Did you mean to call this?

// Logical errors
const value = Math.random() < 0.5 ? "a" : "b";
if (value !== "a") {
  // ...
} else if (value === "b") { // Error: This comparison is always false
```

## Everyday Types

### Primitives

```typescript
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;
```

### Arrays

```typescript
let numbers: number[] = [1, 2, 3];
let strings: Array<string> = ["a", "b", "c"];
```

### Functions

```typescript
// Parameter type annotations
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Optional parameters
function buildName(first: string, last?: string): string {
  return last ? `${first} ${last}` : first;
}

// Default parameters
function multiply(a: number, b: number = 1): number {
  return a * b;
}

// Rest parameters
function sum(...numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}
```

### Object Types

```typescript
// Anonymous object type
function printCoord(pt: { x: number; y: number }) {
  console.log(pt.x, pt.y);
}

// Optional properties
function printName(obj: { first: string; last?: string }) {
  // ...
}

// Readonly properties
interface ReadonlyPerson {
  readonly name: string;
  readonly age: number;
}
```

### Union Types

```typescript
function printId(id: number | string) {
  if (typeof id === "string") {
    console.log(id.toUpperCase());
  } else {
    console.log(id);
  }
}
```

### Type Aliases

```typescript
type Point = {
  x: number;
  y: number;
};

type ID = number | string;
```

### Interfaces

```typescript
interface Point {
  x: number;
  y: number;
}

// Extending interfaces
interface ColoredPoint extends Point {
  color: string;
}
```

## Narrowing

### typeof Guards

```typescript
function padLeft(padding: number | string, input: string) {
  if (typeof padding === "number") {
    return " ".repeat(padding) + input;
  }
  return padding + input;
}
```

### Truthiness Narrowing

```typescript
function printAll(strs: string | string[] | null) {
  if (strs && typeof strs === "object") {
    for (const s of strs) {
      console.log(s);
    }
  } else if (typeof strs === "string") {
    console.log(strs);
  }
}
```

### Equality Narrowing

```typescript
function example(x: string | number, y: string | boolean) {
  if (x === y) {
    x.toUpperCase(); // x is string
    y.toUpperCase(); // y is string
  }
}
```

### in Operator Narrowing

```typescript
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    return animal.swim();
  }
  return animal.fly();
}
```

### instanceof Narrowing

```typescript
function logValue(x: Date | string) {
  if (x instanceof Date) {
    console.log(x.toUTCString());
  } else {
    console.log(x.toUpperCase());
  }
}
```

### Discriminated Unions

```typescript
interface Circle {
  kind: "circle";
  radius: number;
}

interface Square {
  kind: "square";
  sideLength: number;
}

type Shape = Circle | Square;

function getArea(shape: Shape) {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
  }
}
```

## Functions

### Function Type Expressions

```typescript
type GreetFunction = (name: string) => void;

function greeter(fn: GreetFunction) {
  fn("World");
}
```

### Call Signatures

```typescript
type DescribableFunction = {
  description: string;
  (someArg: number): boolean;
};
```

### Generic Functions

```typescript
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

// Inference
const s = firstElement(["a", "b", "c"]); // string
const n = firstElement([1, 2, 3]); // number
```

### Constraints

```typescript
function longest<T extends { length: number }>(a: T, b: T) {
  if (a.length >= b.length) {
    return a;
  }
  return b;
}
```

### Function Overloads

```typescript
function makeDate(timestamp: number): Date;
function makeDate(m: number, d: number, y: number): Date;
function makeDate(mOrTimestamp: number, d?: number, y?: number): Date {
  if (d !== undefined && y !== undefined) {
    return new Date(y, mOrTimestamp, d);
  }
  return new Date(mOrTimestamp);
}
```

## Object Types

### Index Signatures

```typescript
interface StringArray {
  [index: number]: string;
}

interface NumberDictionary {
  [key: string]: number;
  length: number;
}
```

### Extending Types

```typescript
interface BasicAddress {
  name?: string;
  street: string;
  city: string;
}

interface AddressWithUnit extends BasicAddress {
  unit: string;
}
```

### Intersection Types

```typescript
interface Colorful {
  color: string;
}

interface Circle {
  radius: number;
}

type ColorfulCircle = Colorful & Circle;
```

## Generics

### Generic Types

```typescript
function identity<T>(arg: T): T {
  return arg;
}

let myIdentity: <T>(arg: T) => T = identity;
```

### Generic Classes

```typescript
class GenericNumber<T> {
  zeroValue: T;
  add: (x: T, y: T) => T;
}
```

### Generic Constraints

```typescript
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}
```

## Manipulation Types

### Mapped Types

```typescript
type OptionsFlags<T> = {
  [Property in keyof T]: boolean;
};
```

### Conditional Types

```typescript
type NameOrId<T extends number | string> = T extends number
  ? IdLabel
  : NameLabel;
```

### Template Literal Types

```typescript
type World = "world";
type Greeting = `hello ${World}`;
```

## Classes

### Class Members

```typescript
class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  scale(n: number): void {
    this.x *= n;
    this.y *= n;
  }
}
```

### Inheritance

```typescript
class Animal {
  move() {
    console.log("Moving along!");
  }
}

class Dog extends Animal {
  bark() {
    console.log("Woof!");
  }
}
```

### Member Visibility

```typescript
class Base {
  public x = 0;
  protected y = 0;
  private z = 0;
}
```

### Abstract Classes

```typescript
abstract class Base {
  abstract getName(): string;

  printName() {
    console.log("Hello, " + this.getName());
  }
}
```

## Modules

### Exporting

```typescript
// Named exports
export function add(x: number, y: number): number {
  return x + y;
}

export interface Point {
  x: number;
  y: number;
}

// Default export
export default class Calculator {
  add(x: number, y: number): number {
    return x + y;
  }
}
```

### Importing

```typescript
import { add, Point } from "./math";
import Calculator from "./Calculator";
import * as math from "./math";
```

---

> [!NOTE]
> This handbook covers the core concepts from the official TypeScript documentation. For the most up-to-date information, visit [typescriptlang.org/docs/handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
