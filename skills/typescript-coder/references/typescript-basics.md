# TypeScript Basics

## TypeScript Tutorial

- Reference [Tutorial](https://www.w3schools.com/typescript/index.php)

## Getting Started

### Most Basic Syntax

```ts
console.log('Hello World!');
```

- Reference [Getting Started](https://www.w3schools.com/typescript/typescript_getstarted.php)

### Installing Compiler:

```bash
npm install typescript --save-dev
```

```bash
added 1 package, and audited 2 packages in 2s
found 0 vulnerabilities
```

```bash
npx tsc
```

```bash
Version 4.5.5
tsc: The TypeScript Compiler - Version 4.5.5
```

### Configuring compiler:

```bash
npx tsc --init
```

```ts
Created a new tsconfig.json with:
  target: es2016
  module: commonjs
  strict: true
  esModuleInterop: true
  skipLibCheck: true
  forceConsistentCasingInFileNames: true
```

### Configuration example:

```json
{
  "include": ["src"],
  "compilerOptions": {
    "outDir": "./build"
  }
}
```

### Your First Program:

```ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

const message: string = greet("World");
console.log(message);
```

### Compile and run:

```bash
npx tsc hello.ts
```

### Compiled JavaScript output:

```js
function greet(name) {
  return "Hello, ".concat(name, "!");
}

const message = greet("World");
console.log(message);
```

```bash
node hello.js
```

```
Hello, World!
```

## TypeScript Simple Types

- Reference [Simple Types](https://www.w3schools.com/typescript/typescript_simple_types.php)

### Boolean:

```ts
let isActive: boolean = true;
let hasPermission = false; // TypeScript infers 'boolean' type
```

### Number:

```ts
let decimal: number = 6;
let hex: number = 0xf00d;       // Hexadecimal
let binary: number = 0b1010;     // Binary
let octal: number = 0o744;      // Octal
let float: number = 3.14;      // Floating point
```

### String:

```ts
let color: string = "blue";
let fullName: string = 'John Doe';
let age: number = 30;
let sentence: string = `Hello, my name is ${fullName} and I'll be ${age + 1} next year.`;
```

### BigInt (ES2020+):

```ts
const bigNumber: bigint = 9007199254740991n;
const hugeNumber = BigInt(9007199254740991); // Alternative syntax
```

### Symbol:

```ts
const uniqueKey: symbol = Symbol('description');
const obj = {
  [uniqueKey]: 'This is a unique property'
};
console.log(obj[uniqueKey]); // "This is a unique property"
```

## TypeScript Explicit Types and Inference

- Reference [Explicit Types and Inference](https://www.w3schools.com/typescript/typescript_explicit_inference.php)

### Explicit Type Annotations:

```ts
// String
let greeting: string = "Hello, TypeScript!";

// Number
let userCount: number = 42;

// Boolean
let isLoading: boolean = true;

// Array of numbers
let scores: number[] = [100, 95, 98];
```

```ts
// Function with explicit parameter and return types
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// TypeScript will ensure you pass the correct argument type
greet("Alice"); // OK
greet(42);
// Error: Argument of type '42' is not assignable to parameter of type 'string'
```


### Type Inference:

```ts
// TypeScript infers 'string'
let username = "alice";

// TypeScript infers 'number'
let score = 100;

// TypeScript infers 'boolean[]'
let flags = [true, false, true];

// TypeScript infers return type as 'number'
function add(a: number, b: number) {
  return a + b;
}
```

```ts
// TypeScript infers the shape of the object
const user = {
name: "Alice",
age: 30,
isAdmin: true
};

// TypeScript knows these properties exist
console.log(user.name);  // OK
console.log(user.email);
  // Error: Property 'email' does not exist
```

### Type Safety in Action:

```ts
let username: string = "alice";
username = 42;
// Error: Type 'number' is not assignable to type 'string'
```

```ts
let score = 100;  // TypeScript infers 'number'
score = "high";
// Error: Type 'string' is not assignable to type 'number'
```

```ts
// This is valid JavaScript but can lead to bugs
function add(a, b) {
return a + b;
}

console.log(add("5", 3)); // Returns "53" (string concatenation)
```

```ts
function add(a: number, b: number): number {
return a + b;
}

console.log(add("5", 3));
// Error: Argument of type 'string' is not assignable to parameter of type 'number'
```

```ts
// 1. JSON.parse returns 'any' because the structure isn't known at compile time
const data = JSON.parse('{ "name": "Alice", "age": 30 }');

// 2. Variables declared without initialization
let something;  // Type is 'any'
something = 'hello';
something = 42;  // No error
```

## TypeScript Special Types

- Reference [Special Types](https://www.w3schools.com/typescript/typescript_special_types.php)

### Type: any:

```ts
let u = true;
u = "string";
// Error: Type 'string' is not assignable to type 'boolean'.
Math.round(u);
// Error: Argument of type 'boolean' is not assignable to parameter of type 'number'.
```

```ts
let v: any = true;
v = "string"; // no error as it can be "any" type
Math.round(v); // no error as it can be "any" type
```

### Type: unknown:

```ts
let w: unknown = 1;
w = "string"; // no error
w = {
  runANonExistentMethod: () => {
    console.log("I think therefore I am");
  }
} as { runANonExistentMethod: () => void}
// How can we avoid the error for the code commented out below when
// we don't know the type?
// w.runANonExistentMethod(); // Error: Object is of type 'unknown'.
if(typeof w === 'object' && w !== null) {
  (w as { runANonExistentMethod: Function }).runANonExistentMethod();
}
// Although we have to cast multiple times we can do a check in the
// if to secure our type and have a safer casting
```
### Type: never:

```ts
function throwError(message: string): never {
  throw new Error(message);
}
```

```ts
type Shape = Circle | Square | Triangle;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.sideLength ** 2;
    default:
      // TypeScript knows this should never happen
      const _exhaustiveCheck: never = shape;
      return _exhaustiveCheck;
  }
}
```

```ts
let x: never = true;
// Error: Type 'boolean' is not assignable to type 'never'.
```

### Type: undefined & null:

```ts
let y: undefined = undefined;
let z: null = null;
```

```ts
// Optional parameter (implicitly `string | undefined`)
function greet(name?: string) {
  return `Hello, ${name || 'stranger'}`;
}

// Optional property in an interface
interface User {
  name: string;
  age?: number;  // Same as `number | undefined`
}
```

```ts
// Nullish coalescing (??) - only uses default
// if value is null or undefined
const value = input ?? 'default';

// Optional chaining (?.) - safely access nested properties
const street = user?.address?.street;
```
