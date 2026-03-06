# TypeScript Cheat Sheets

Quick reference guides for TypeScript features. These cheat sheets are based on the official TypeScript documentation.

## Control Flow Analysis

TypeScript's control flow analysis helps narrow types based on code structure.

### Type Guards

```typescript
// typeof type guards
function process(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase(); // value is string
  }
  return value.toFixed(2); // value is number
}

// instanceof type guards
class Animal { name: string; }
class Dog extends Animal { bark(): void {} }

function handleAnimal(animal: Animal) {
  if (animal instanceof Dog) {
    animal.bark(); // animal is Dog
  }
}

// in operator
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim(); // animal is Fish
  } else {
    animal.fly(); // animal is Bird
  }
}
```

### Truthiness Narrowing

```typescript
function printLength(str: string | null) {
  if (str) {
    console.log(str.length); // str is string
  }
}

// Falsy values: false, 0, -0, 0n, "", null, undefined, NaN
```

### Equality Narrowing

```typescript
function example(x: string | number, y: string | boolean) {
  if (x === y) {
    // x and y are both string
    x.toUpperCase();
    y.toUpperCase();
  }
}
```

### Discriminated Unions

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; sideLength: number }
  | { kind: "triangle"; base: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
    case "triangle":
      return (shape.base * shape.height) / 2;
  }
}
```

### Assertion Functions

```typescript
function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new AssertionError(msg);
  }
}

function yell(str: string | undefined) {
  assert(str !== undefined, "str should be defined");
  // str is now string
  return str.toUpperCase();
}
```

## Classes

TypeScript class syntax and features.

### Basic Class

```typescript
class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  distance(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
}

const p = new Point(3, 4);
console.log(p.distance()); // 5
```

### Parameter Properties

```typescript
class Point {
  // Shorthand for declaring and initializing
  constructor(
    public x: number,
    public y: number
  ) {}
}
```

### Visibility Modifiers

```typescript
class BankAccount {
  private balance: number = 0;
  protected accountNumber: string;
  public owner: string;

  constructor(owner: string, accountNumber: string) {
    this.owner = owner;
    this.accountNumber = accountNumber;
  }

  public deposit(amount: number): void {
    this.balance += amount;
  }

  public getBalance(): number {
    return this.balance;
  }
}
```

### Readonly Properties

```typescript
class Person {
  readonly birthDate: Date;

  constructor(birthDate: Date) {
    this.birthDate = birthDate;
  }
}

const person = new Person(new Date(1990, 0, 1));
// person.birthDate = new Date(); // Error: readonly
```

### Inheritance

```typescript
class Animal {
  constructor(public name: string) {}

  move(distance: number): void {
    console.log(`${this.name} moved ${distance}m`);
  }
}

class Dog extends Animal {
  constructor(name: string, public breed: string) {
    super(name);
  }

  bark(): void {
    console.log("Woof!");
  }

  override move(distance: number): void {
    console.log("Running...");
    super.move(distance);
  }
}
```

### Abstract Classes

```typescript
abstract class Shape {
  abstract getArea(): number;

  describe(): string {
    return `Area: ${this.getArea()}`;
  }
}

class Circle extends Shape {
  constructor(public radius: number) {
    super();
  }

  getArea(): number {
    return Math.PI * this.radius ** 2;
  }
}
```

### Static Members

```typescript
class MathUtils {
  static PI: number = 3.14159;

  static circleArea(radius: number): number {
    return this.PI * radius ** 2;
  }
}

console.log(MathUtils.PI);
console.log(MathUtils.circleArea(5));
```

## Interfaces

Defining contracts for object shapes.

### Basic Interface

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // optional
  readonly createdAt: Date; // readonly
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date()
};
```

### Function Types

```typescript
interface SearchFunc {
  (source: string, substring: string): boolean;
}

const search: SearchFunc = (src, sub) => {
  return src.includes(sub);
};
```

### Indexable Types

```typescript
interface StringArray {
  [index: number]: string;
}

const myArray: StringArray = ["Alice", "Bob"];

interface StringMap {
  [key: string]: number;
}

const ages: StringMap = {
  alice: 30,
  bob: 25
};
```

### Extending Interfaces

```typescript
interface Shape {
  color: string;
}

interface Square extends Shape {
  sideLength: number;
}

const square: Square = {
  color: "blue",
  sideLength: 10
};

// Multiple inheritance
interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface Document extends Shape, Timestamped {
  title: string;
}
```

### Implementing Interfaces

```typescript
interface ClockInterface {
  currentTime: Date;
  setTime(d: Date): void;
}

class Clock implements ClockInterface {
  currentTime: Date = new Date();

  setTime(d: Date): void {
    this.currentTime = d;
  }
}
```

### Hybrid Types

```typescript
interface Counter {
  (start: number): string;
  interval: number;
  reset(): void;
}

function getCounter(): Counter {
  const counter = function(start: number) {
    return `Count: ${start}`;
  } as Counter;

  counter.interval = 123;
  counter.reset = function() {};

  return counter;
}
```

## Types

TypeScript's type system features.

### Primitive Types

```typescript
let isDone: boolean = false;
let decimal: number = 6;
let color: string = "blue";
let big: bigint = 100n;
let sym: symbol = Symbol("key");
let notDefined: undefined = undefined;
let empty: null = null;
```

### Array Types

```typescript
let list: number[] = [1, 2, 3];
let list2: Array<number> = [1, 2, 3];
let readonly: readonly number[] = [1, 2, 3];
```

### Tuple Types

```typescript
let tuple: [string, number] = ["hello", 10];
let labeled: [name: string, age: number] = ["Alice", 30];
let rest: [string, ...number[]] = ["items", 1, 2, 3];
```

### Union Types

```typescript
let value: string | number;
value = "hello";
value = 42;

type Status = "success" | "error" | "pending";
```

### Intersection Types

```typescript
type Person = { name: string };
type Employee = { employeeId: number };

type Staff = Person & Employee;

const staff: Staff = {
  name: "Alice",
  employeeId: 123
};
```

### Type Aliases

```typescript
type ID = string | number;
type Point = { x: number; y: number };
type Callback = (result: string) => void;
```

### Literal Types

```typescript
let direction: "north" | "south" | "east" | "west";
direction = "north"; // OK
// direction = "up"; // Error

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
```

### Generic Types

```typescript
function identity<T>(arg: T): T {
  return arg;
}

interface Box<T> {
  value: T;
}

type Pair<T, U> = [T, U];

class DataStore<T> {
  private data: T[] = [];

  add(item: T): void {
    this.data.push(item);
  }
}
```

### Utility Types

```typescript
// Partial - make all properties optional
type PartialUser = Partial<User>;

// Required - make all properties required
type RequiredUser = Required<PartialUser>;

// Readonly - make all properties readonly
type ReadonlyUser = Readonly<User>;

// Pick - select specific properties
type UserPreview = Pick<User, "id" | "name">;

// Omit - exclude specific properties
type UserWithoutEmail = Omit<User, "email">;

// Record - create object type with specific keys
type Roles = Record<string, boolean>;

// ReturnType - extract function return type
type Result = ReturnType<typeof someFunction>;

// Parameters - extract function parameters
type Params = Parameters<typeof someFunction>;
```

### Mapped Types

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Optional<T> = {
  [P in keyof T]?: T[P];
};

type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
```

### Conditional Types

```typescript
type IsString<T> = T extends string ? true : false;

type ExtractArray<T> = T extends (infer U)[] ? U : never;

type NonNullable<T> = T extends null | undefined ? never : T;
```

### Template Literal Types

```typescript
type Greeting = `Hello, ${string}`;
type EventName<T extends string> = `on${Capitalize<T>}`;

type Color = "red" | "blue" | "green";
type Size = "small" | "large";
type Style = `${Color}-${Size}`;
// "red-small" | "red-large" | "blue-small" | ...
```

---

**Reference Links:**

- [Control Flow Analysis](https://www.typescriptlang.org/static/TypeScript%20Control%20Flow%20Analysis-8a549253ad8470850b77c4c5c351d457.png)
- [Classes](https://www.typescriptlang.org/static/TypeScript%20Classes-83cc6f8e42ba2002d5e2c04221fa78f9.png)
- [Interfaces](https://www.typescriptlang.org/static/TypeScript%20Interfaces-34f1ad12132fb463bd1dfe5b85c5b2e6.png)
- [Types](https://www.typescriptlang.org/static/TypeScript%20Types-ae199d69aeecf7d4a2704a528d0fd3f9.png)
