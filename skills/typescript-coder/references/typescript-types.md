# TypeScript Types

## TypeScript Advanced Types

- Reference [Advanced Types](https://www.w3schools.com/typescript/typescript_advanced_types.php)

### Mapped Types:

```ts
// Convert all properties to boolean
type Flags<T> = {
  [K in keyof T]: boolean;
};

interface User {
  id: number;
  name: string;
  email: string;
}

type UserFlags = Flags<User>;
// Equivalent to:
// {
//   id: boolean;
//   name: boolean;
//   email: boolean;
// }
```

```ts
// Make all properties optional
interface Todo {
  title: string;
  description: string;
  completed: boolean;
}

type OptionalTodo = {
  [K in keyof Todo]?: Todo[K];
};

// Remove 'readonly' and '?' modifiers
type Concrete<T> = {
  -readonly [K in keyof T]-?: T[K];
};

// Add 'readonly' and 'required' to all properties
type ReadonlyRequired<T> = {
  +readonly [K in keyof T]-?: T[K];
};
```

```ts
// Add prefix to all property names
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// {
//   getId: () => number;
//   getName: () => string;
//   getEmail: () => string;
// }

// Filter out properties
type MethodsOnly<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
```

## TypeScript Conditional Types

### Conditional Types:

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;    // true
type B = IsString<number>;    // false
type C = IsString<'hello'>;    // true
type D = IsString<string | number>; // boolean

// Extract array element type
type ArrayElement<T> = T extends (infer U)[] ? U : never;
type Numbers = ArrayElement<number[]>; // number
```

```ts
// Get return type of a function
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

// Get parameter types as a tuple
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Get constructor parameter types
type ConstructorParameters<T extends new (...args: any) => any> =
  T extends new (...args: infer P) => any ? P : never;

// Get instance type from a constructor
type InstanceType<T extends new (...args: any) => any> =
  T extends new (...args: any) => infer R ? R : any;
```

```ts
// Without distribution
type ToArrayNonDist<T> = T extends any ? T[] : never;
type StrOrNumArr = ToArrayNonDist<string | number>; // (string | number)[]

// With distribution
type ToArray<T> = [T] extends [any] ? T[] : never;
type StrOrNumArr2 = ToArray<string | number>; // string[] | number[]

// Filter out non-string types
type FilterStrings<T> = T extends string ? T : never;
type Letters = FilterStrings<'a' | 'b' | 1 | 2 | 'c'>; // 'a' | 'b' | 'c'
```

### Template Literal Types:

```ts
type Greeting = `Hello, ${string}`;

const validGreeting: Greeting = 'Hello, World!';
const invalidGreeting: Greeting = 'Hi there!'; // Error

// With unions
type Color = 'red' | 'green' | 'blue';
type Size = 'small' | 'medium' | 'large';

type Style = `${Color}-${Size}`;
// 'red-small' | 'red-medium' | 'red-large' |
// 'green-small' | 'green-medium' | 'green-large' |
// 'blue-small' | 'blue-medium' | 'blue-large'
```

```ts
// Built-in string manipulation types
type T1 = Uppercase<'hello'>;  // 'HELLO'
type T2 = Lowercase<'WORLD'>;  // 'world'
type T3 = Capitalize<'typescript'>;  // 'Typescript'
type T4 = Uncapitalize<'TypeScript'>;  // 'typeScript'

// Create an event handler type
type EventType = 'click' | 'change' | 'keydown';
type EventHandler = `on${Capitalize<EventType>}`;
// 'onClick' | 'onChange' | 'onKeydown'
```

```ts
// Extract route parameters
type ExtractRouteParams<T> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractRouteParams<`${Rest}`>]: string }
    : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};

type Params = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// { userId: string; postId: string; }

// Create a type-safe event emitter
type EventMap = {
  click: { x: number; y: number };
  change: string;
  keydown: { key: string; code: number };
};

type EventHandlers = {
  [K in keyof EventMap as `on${Capitalize<K>}`]: (event: EventMap[K]) => void;
};
```

### Utility Types:

```ts
// Basic types
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

// Make all properties optional
type PartialUser = Partial<User>;

// make all properties required
type RequiredUser = Required<PartialUser>;

// make all properties read-only
type ReadonlyUser = Readonly<User>;

// pick specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// omit specific properties
type UserWithoutEmail = Omit<User, 'email'>;

// extract property types
type UserId = User['id']; // number
type UserKeys = keyof User; // 'id' | 'name' | 'email' | 'createdAt'
```

```ts
// Create a type that excludes null and undefined
type NonNullable<T> = T extends null | undefined ? never : T;

// Exclude types from a union
type Numbers = 1 | 2 | 3 | 'a' | 'b';
type JustNumbers = Exclude<Numbers, string>; // 1 | 2 | 3

// Extract types from a union
type JustStrings = Extract<Numbers, string>; // 'a' | 'b'

// Get the type that is not in the second type
type A = { a: string; b: number; c: boolean };
type B = { a: string; b: number };
type C = Omit<A, keyof B>; // { c: boolean }

// Create a type with all properties as mutable
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
```

### Recursive Types:

```ts
// Simple binary tree
type BinaryTree<T> = {
  value: T;
  left?: BinaryTree<T>;
  right?: BinaryTree<T>;
};

// JSON-like data structure
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Nested comments
type Comment = {
  id: number;
  content: string;
  replies: Comment[];
  createdAt: Date;
};
```

```ts
// Type for a linked list
type LinkedList<T> = {
  value: T;
  next: LinkedList<T> | null;
};

// Type for a directory structure
type File = {
  type: 'file';
  name: string;
  size: number;
};

type Directory = {
  type: 'directory';
  name: string;
  children: (File | Directory)[];
};

// Type for a state machine
type State = {
  value: string;
  transitions: {
    [event: string]: State;
  };
};

// Type for a recursive function
type RecursiveFunction<T> = (x: T | RecursiveFunction<T>) => void;
```

## TypeScript Type Guards

- Reference [Type Guards](https://www.w3schools.com/typescript/typescript_type_guards.php)

### typeof Type Guards:

```ts
// Simple type guard with typeof
function formatValue(value: string | number): string {
  if (typeof value === 'string') {
    // TypeScript knows value is string here
    return value.trim().toUpperCase();
  } else {
    // TypeScript knows value is number here
    return value.toFixed(2);
  }
}

// Example usage
const result1 = formatValue('  hello  ');  // "HELLO"
const result2 = formatValue(42.1234);      // "42.12"
```

### instanceof Type Guards:

```ts
class Bird {
  fly() {
    console.log("Flying...");
   }
}

class Fish {
  swim() {
    console.log("Swimming...");
   }
}

function move(animal: Bird | Fish) {
  if (animal instanceof Bird) {
    // TypeScript knows animal is Bird here
    animal.fly();
  } else {
    // TypeScript knows animal is Fish here
    animal.swim();
  }
}
```

### User-Defined Type Guards:

```ts
interface Car {
  make: string;
  model: string;
  year: number;
}

interface Motorcycle {
  make: string;
  model: string;
  year: number;
  type: "sport" | "cruiser";
}

// Type predicate function
function isCar(vehicle: Car | Motorcycle): vehicle is Car {
  return (vehicle as Motorcycle).type === undefined;
}

function displayVehicleInfo(vehicle: Car | Motorcycle) {
  console.log(`Make: ${vehicle.make}, Model: ${vehicle.model}, Year: ${vehicle.year}`);

  if (isCar(vehicle)) {
    // TypeScript knows vehicle is Car here
    console.log("This is a car");
  } else {
    // TypeScript knows vehicle is Motorcycle here
    console.log(`This is a ${vehicle.type} motorcycle`);
  }
}
```

### Discriminated Unions:

```ts
interface Circle {
  kind: "circle";
  radius: number;
}

interface Square {
  kind: "square";
  sideLength: number;
}

type Shape = Circle | Square;

function calculateArea(shape: Shape) {
  switch (shape.kind) {
    case "circle":
      // TypeScript knows shape is Circle here
      return Math.PI * shape.radius ** 2;
    case "square":
      // TypeScript knows shape is Square here
      return shape.sideLength ** 2;
  }
}
```

### 'in' Operator Type Guards:

```ts
interface Dog {
  bark(): void;
}

interface Cat {
  meow(): void;
}

function makeSound(animal: Dog | Cat) {
  if ("bark" in animal) {
    // TypeScript knows animal is Dog here
    animal.bark();
  } else {
    // TypeScript knows animal is Cat here
    animal.meow();
  }
}
```

### Assertion Functions:

```ts
// Type assertion function
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Value is not a string');
  }
}

// Type assertion function with custom error
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

// Usage
function processInput(input: unknown) {
  assertIsString(input);
  // input is now typed as string
  console.log(input.toUpperCase());
}

// With custom error
function processNumber(value: unknown): number {
  assert(typeof value === 'number', 'Value must be a number');
  // value is now typed as number
  return value * 2;
}
```

## TypeScript Conditional Types

- Reference [Conditional Types](https://www.w3schools.com/typescript/typescript_conditional_types.php)

### Basic Conditional Type Syntax:

```ts
type IsString<T> = T extends string ? true : false;

// Usage examples
type Result1 = IsString<string>;  // true
type Result2 = IsString<number>;  // false
type Result3 = IsString<"hello">; // true (literal types extend their base types)

// We can use this with variables too
let a: IsString<string>; // a has type 'true'
let b: IsString<number>; // b has type 'false'
```

### Conditional Types with Unions:

```ts
type ToArray<T> = T extends any ? T[] : never;

// When used with a union type, it applies to each member of the union
type StringOrNumberArray = ToArray<string | number>;
// This becomes ToArray<string> | ToArray<number>
// Which becomes string[] | number[]

// We can also extract specific types from a union
type ExtractString<T> = T extends string ? T : never;
type StringsOnly = ExtractString<string | number | boolean | "hello">;
// Result: string | "hello"
```

### Infer keyword with conditional types:

```ts
// Extract the return type of a function type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Examples
function greet() { return "Hello, world!"; }
function getNumber() { return 42; }

type GreetReturnType = ReturnType<typeof greet>;   // string
type NumberReturnType = ReturnType<typeof getNumber>; // number

// Extract element type from array
type ElementType<T> = T extends (infer U)[] ? U : never;
type NumberArrayElement = ElementType<number[]>; // number
type StringArrayElement = ElementType<string[]>; // string
```

### Built-in Conditional Types:

```ts
// Extract<T, U> - Extracts types from T that are assignable to U
type OnlyStrings = Extract<string | number | boolean, string>; // string

// Exclude<T, U> - Excludes types from T that are assignable to U
type NoStrings = Exclude<string | number | boolean, string>; // number | boolean

// NonNullable<T> - Removes null and undefined from T
type NotNull = NonNullable<string | null | undefined>; // string

// Parameters<T> - Extracts parameter types from a function type
type Params = Parameters<(a: string, b: number) => void>; // [string, number]

// ReturnType<T> - Extracts the return type from a function type
type Return = ReturnType<() => string>; // string
```

### Advanced Patterns and Techniques:

```ts
// Deeply unwrap Promise types
type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;

// Examples
type A = UnwrapPromise<Promise<string>>;           // string
type B = UnwrapPromise<Promise<Promise<number>>>;   // number
type C = UnwrapPromise<boolean>;                   // boolean
```

### Type name mapping:

```ts
type TypeName<T> =
  T extends string  ? "string" :
  T extends number  ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends Function ? "function" :
  "object";

// Usage
type T0 = TypeName<string>;      // "string"
type T1 = TypeName<42>;         // "number"
type T2 = TypeName<true>;       // "boolean"
type T3 = TypeName<() => void>; // "function"
type T4 = TypeName<Date[]>;     // "object"
```

### Conditional return types:

```ts
// A function that returns different types based on input type
function processValue<T>(value: T): T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : never {

  if (typeof value === "string") {
    return value.toUpperCase() as any; // Type assertion needed due to limitations
  } else if (typeof value === "number") {
    return (value * 2) as any;
  } else if (typeof value === "boolean") {
    return (!value) as any;
  } else {
    throw new Error("Unsupported type");
  }
}

// Usage
const stringResult = processValue("hello"); // Returns "HELLO" (type is string)
const numberResult = processValue(10);      // Returns 20 (type is number)
const boolResult = processValue(true);      // Returns false (type is boolean)
```

## TypeScript Mapped Types

- Reference [Mapped Types](https://www.w3schools.com/typescript/typescript_mapped_types.php)

### Type Syntax Example:

```ts
// Small example
type Person = { name: string; age: number };
type PartialPerson = { [P in keyof Person]?: Person[P] };
type ReadonlyPerson = { readonly [P in keyof Person]: Person[P] };
```

### Basic Mapped Type Syntax:

```ts
// Define an object type
interface Person {
  name: string;
  age: number;
  email: string;
}

// Create a mapped type that makes all properties optional
type PartialPerson = {
  [P in keyof Person]?: Person[P];
};

// Usage
const partialPerson: PartialPerson = {
  name: "John"
  // age and email are optional
};

// Create a mapped type that makes all properties readonly
type ReadonlyPerson = {
  readonly [P in keyof Person]: Person[P];
};

// Usage
const readonlyPerson: ReadonlyPerson = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
};

// readonlyPerson.age = 31;
// Error: Cannot assign to 'age' because it is a read-only property
```

### Built-in Mapped Types:

```ts
interface User {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
}

// Partial<T> - Makes all properties optional
type PartialUser = Partial<User>;
// Equivalent to: { id?: number; name?: string; email?: string; isAdmin?: boolean; }

// Required<T> - Makes all properties required
type RequiredUser = Required<Partial<User>>;
// Equivalent to: { id: number; name: string; email: string; isAdmin: boolean; }

// Readonly<T> - Makes all properties readonly
type ReadonlyUser = Readonly<User>;
// Equivalent to: { readonly id: number; readonly name: string; ... }

// Pick<T, K> - Creates a type with a subset of properties from T
type UserCredentials = Pick<User, "email" | "id">;
// Equivalent to: { email: string; id: number; }

// Omit<T, K> - Creates a type by removing specified properties from T
type PublicUser = Omit<User, "id" | "isAdmin">;
// Equivalent to: { name: string; email: string; }

// Record<K, T> - Creates a type with specified keys and value types
type UserRoles = Record<"admin" | "user" | "guest", string>;
// Equivalent to: { admin: string; user: string; guest: string; }
```

### Creating Custom Mapped Types:

```ts
// Base interface
interface Product {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}

// Create a mapped type to convert all properties to string type
type StringifyProperties<T> = {
  [P in keyof T]: string;
};

// Usage
type StringProduct = StringifyProperties<Product>;
// Equivalent to: { id: string; name: string; price: string; inStock: string; }

// Create a mapped type that adds validation functions for each property
type Validator<T> = {
  [P in keyof T]: (value: T[P]) => boolean;
};

// Usage
const productValidator: Validator<Product> = {
  id: (id) => id > 0,
  name: (name) => name.length > 0,
  price: (price) => price >= 0,
  inStock: (inStock) => typeof inStock === "boolean"
};
```

### Modifying Property Modifiers:

```ts
// Base interface with some readonly and optional properties
interface Configuration {
  readonly apiKey: string;
  readonly apiUrl: string;
  timeout?: number;
  retries?: number;
}

// Remove readonly modifier from all properties
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Usage
type MutableConfig = Mutable<Configuration>;
// Equivalent to:
/* {
  apiKey: string;
  apiUrl: string;
  timeout?: number;
  retries?: number;
 }
 */

// Make all optional properties required
type RequiredProps<T> = {
  [P in keyof T]-?: T[P];
};

// Usage
type RequiredConfig = RequiredProps<Configuration>;
// Equivalent to:
 /* {
   readonly apiKey: string;
   readonly apiUrl: string;
   timeout: number;
   retries: number;
 }
*/
```

### Conditional Mapped Types:

```ts
// Base interface
interface ApiResponse {
  data: unknown;
  status: number;
  message: string;
  timestamp: number;
}

// Conditional mapped type: Convert each numeric property to a formatted string
type FormattedResponse<T> = {
  [P in keyof T]: T[P] extends number ? string : T[P];
};

// Usage
type FormattedApiResponse = FormattedResponse<ApiResponse>;
// Equivalent to:
/* {
  data: unknown;
  status: string;
  message: string;
  timestamp: string;
 }
*/

// Another example: Filter for only string properties
type StringPropsOnly<T> = {
  [P in keyof T as T[P] extends string ? P : never]: T[P];
};

// Usage
type ApiResponseStringProps = StringPropsOnly<ApiResponse>;
// Equivalent to: { message: string; }
```

## TypeScript Type Inference

- Reference [Type Inference](https://www.w3schools.com/typescript/typescript_type_inference.php)

### Understanding Type Inference in TypeScript

```ts
// TypeScript infers these variable types
let name = "Alice";           // inferred as string
let age = 30;                 // inferred as number
let isActive = true;          // inferred as boolean
let numbers = [1, 2, 3];      // inferred as number[]
let mixed = [1, "two", true]; // inferred as (string | number | boolean)[]

// Using the inferred types
name.toUpperCase();  // Works because name is inferred as string
age.toFixed(2);      // Works because age is inferred as number
// name.toFixed(2);
  // Error: Property 'toFixed' does not exist on type 'string'
```

### Function Return Type Inference

```ts
// Return type is inferred as string
function greet(name: string) {
  return `Hello, ${name}!`;
}

// Return type is inferred as number
function add(a: number, b: number) {
  return a + b;
}

// Return type is inferred as string | number
function getValue(key: string) {
   if (key === "name") {
    return "Alice";
   } else {
    return 42;
   }
}
// Using the inferred return types
let greeting = greet("Bob");     // inferred as string
let sum = add(5, 3);             // inferred as number
let value = getValue("age");     // inferred as string | number
```

### Contextual Typing

```ts
// The type of the callback parameter is inferred from the array method context
const names = ["Alice", "Bob", "Charlie"];

// Parameter 'name' is inferred as string
names.forEach(name => {
  console.log(name.toUpperCase());
});

// Parameter 'name' is inferred as string, and the return type is inferred as number
const nameLengths = names.map(name => {
  return name.length;
});

// nameLengths is inferred as number[]

// Parameter types in event handlers are also inferred
document.addEventListener("click", event => {
  // 'event' is inferred as MouseEvent
  console.log(event.clientX, event.clientY);
});
```

### Type Inference in Object Literals

```ts
// TypeScript infers the type of this object
const user = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  active: true,
  details: {
    age: 30,
    address: {
      city: "New York",
      country: "USA"
    }
  }
};

// Accessing inferred properties
console.log(user.name.toUpperCase());
console.log(user.details.age.toFixed(0));
console.log(user.details.address.city.toLowerCase());

// Type errors would be caught
// console.log(user.age);
  // Error: Property 'age' does not exist on type '...'
// console.log(user.details.name);
  // Error: Property 'name' does not exist on type '...'
// console.log(user.details.address.zip);
  // Error: Property 'zip' does not exist on type '...'
```

### Advanced Patterns - Const Assertions

```ts
// Regular type inference (widens to string)
let name = "Alice";  // type: string

// Const assertion (narrows to literal type)
const nameConst = "Alice" as const;  // type: "Alice"

// With objects
const user = {
  id: 1,
  name: "Alice",
  roles: ["admin", "user"] as const  // readonly tuple
} as const;

// user.name = "Bob";  // Error: Cannot assign to 'name' because it is a read-only property
```

### Advanced Patterns - Type Narrowing

```ts
function processValue(value: string | number) {
  // Type is narrowed to string in this block
  if (typeof value === "string") {
    console.log(value.toUpperCase());
  }
  // Type is narrowed to number here
  else {
    console.log(value.toFixed(2));
  }
}

// Discriminated unions
interface Circle { kind: "circle"; radius: number; }
interface Square { kind: "square"; size: number; }
type Shape = Circle | Square;

function area(shape: Shape) {
  // Type is narrowed based on 'kind' property
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.size ** 2;
  }
}
```

### Best Practices

```ts
// 1. Let TypeScript infer simple types
let message = "Hello";  // Good: no need for explicit type here

// 2. Provide explicit types for function parameters
function formatName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

// 3. Consider adding return type annotations for complex functions
function processData(input: string[]): { count: number; items: string[] } {
  return {
    count: input.length,
    items: input.map(item => item.trim())
  };
}

// 4. Use explicit type annotations for empty arrays or objects
const emptyArray: string[] = [];  // Without annotation, inferred as any[]
const configOptions: Record<string, unknown> = {};  // Without annotation, inferred as {}

// 5. Use type assertions when TypeScript cannot infer correctly
const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
```

```ts
// Good: Explicit type for complex return values
function processData(input: string[]): { results: string[]; count: number } {
  return {
    results: input.map(processItem),
    count: input.length
  };
}

// Good: Explicit type for empty arrays
const items: Array<{ id: number; name: string }> = [];

// Good: Explicit type for configuration objects
const config: {
  apiUrl: string;
  retries: number;
  timeout: number;
} = {
  apiUrl: "https://api.example.com",
  retries: 3,
  timeout: 5000
};
```

## TypeScript Literal Types

- Reference [Literal Types](https://www.w3schools.com/typescript/typescript_literal_types.php)

### String Literal Types

```ts
// A variable with a string literal type
let direction: "north" | "south" | "east" | "west";

// Valid assignments
direction = "north";
direction = "south";

// Invalid assignments would cause errors
// direction = "northeast";
// Error: Type '"northeast"' is not assignable to
   // type '"north" | "south" | "east" | "west"'
// direction = "up";
// Error: Type '"up"' is not assignable to
   //  type '"north" | "south" | "east" | "west"'

// Using string literal types in functions
function move(direction: "north" | "south" | "east" | "west") {
  console.log(`Moving ${direction}`);
}

move("east");  // Valid
// move("up");
// Error: Argument of type '"up"' is not assignable to parameter of type...
```

### Numeric Literal Types

```ts
// A variable with a numeric literal type
let diceRoll: 1 | 2 | 3 | 4 | 5 | 6;

// Valid assignments
diceRoll = 1;
diceRoll = 6;

// Invalid assignments would cause errors
// diceRoll = 0;
// Error: Type '0' is not assignable to type '1 | 2 | 3 | 4 | 5 | 6'
// diceRoll = 7;
// Error: Type '7' is not assignable to type '1 | 2 | 3 | 4 | 5 | 6'
// diceRoll = 2.5;
// Error: Type '2.5' is not assignable to type '1 | 2 | 3 | 4 | 5 | 6'

// Using numeric literal types in functions
function rollDice(): 1 | 2 | 3 | 4 | 5 | 6 {
  return Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6;
}

const result = rollDice();
console.log(`You rolled a ${result}`);
```

### Boolean Literal Types

```ts
// A type that can only be the literal value 'true'
type YesOnly = true;

// A function that must return true
function alwaysSucceed(): true {
  // Always returns the literal value 'true'
  return true;
}

// Boolean literal combined with other types
type SuccessFlag = true | "success" | 1;
type FailureFlag = false | "failure" | 0;

function processResult(result: SuccessFlag | FailureFlag) {
  if (result === true || result === "success" || result === 1) {
    console.log("Operation succeeded");
  } else {
    console.log("Operation failed");
  }
}

processResult(true);      // "Operation succeeded"
processResult("success"); // "Operation succeeded"
processResult(1);         // "Operation succeeded"
processResult(false);     // "Operation failed"
```

### Literal Types with Objects

```ts
// Object with literal property values
type HTTPSuccess = {
  status: 200 | 201 | 204;
  statusText: "OK" | "Created" | "No Content";
  data: any;
};

type HTTPError = {
  status: 400 | 401 | 403 | 404 | 500;
  statusText: "Bad Request" |
   "Unauthorized" |
   "Forbidden" |
   "Not Found" |
   "Internal Server Error";
  error: string;
};

type HTTPResponse = HTTPSuccess | HTTPError;

function handleResponse(response: HTTPResponse) {
  if (response.status >= 200 && response.status < 300) {
    console.log(`Success: ${response.statusText}`);
    console.log(response.data);
  } else {
    console.log(`Error ${response.status}: ${response.statusText}`);
    console.log(`Message: ${response.error}`);
  }
}

// Example usage
const successResponse: HTTPSuccess = {
  status: 200,
  statusText: "OK",
  data: { username: "john_doe", email: "john@example.com" }
};

const errorResponse: HTTPError = {
  status: 404,
  statusText: "Not Found",
  error: "User not found in database"
};

handleResponse(successResponse);
handleResponse(errorResponse);
```

### Template Literal Types

```ts
// Basic template literals
type Direction = "north" | "south" | "east" | "west";
type Distance = "1km" | "5km" | "10km";

// Using template literals to combine them
type DirectionAndDistance = `${Direction}-${Distance}`;
// "north-1km" | "north-5km" | "north-10km" | "south-1km" | ...

let route: DirectionAndDistance;
route = "north-5km";   // Valid
route = "west-10km";   // Valid
// route = "north-2km";   // Error
// route = "5km-north";   // Error

// Advanced string manipulation
type EventType = "click" | "hover" | "scroll";
type EventTarget = "button" | "link" | "div";
type EventName = `on${Capitalize<EventType>}${Capitalize<EventTarget>}`;
// "onClickButton" | "onClickLink" | "onClickDiv" | ...

// Dynamic property access
type User = {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
};

type GetterName<T> = `get${Capitalize<string & keyof T>}`;
type UserGetters = {
  [K in keyof User as GetterName<User>]: () => User[K];
};
// { getId: () => number; getName: () => string; ... }

// String pattern matching
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
    : never;

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"

// CSS units and values
type CssUnit = 'px' | 'em' | 'rem' | '%' | 'vh' | 'vw';
type CssValue = `${number}${CssUnit}`;

let width: CssValue = '100px';    // Valid
let height: CssValue = '50%';     // Valid
// let margin: CssValue = '10';   // Error
// let padding: CssValue = '2ex'; // Error

// API versioning
type ApiVersion = 'v1' | 'v2' | 'v3';
type Endpoint = 'users' | 'products' | 'orders';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type ApiUrl = `https://api.example.com/${ApiVersion}/${Endpoint}`;

// Complex example: Dynamic SQL query builder
type Table = 'users' | 'products' | 'orders';
type Column<T extends Table> =
  T extends 'users' ? 'id' | 'name' | 'email' | 'created_at' :
  T extends 'products' ? 'id' | 'name' | 'price' | 'in_stock' :
  T extends 'orders' ? 'id' | 'user_id' | 'total' | 'status' : never;

type WhereCondition<T extends Table> = {
  [K in Column<T>]?: {
    equals?: any;
    notEquals?: any;
    in?: any[];
  };
};

function query<T extends Table>(
  table: T,
  where?: WhereCondition<T>
): `SELECT * FROM ${T}${string}` {
  // Implementation would build the query
  return `SELECT * FROM ${table}` as const;
}

// Usage
const userQuery = query('users', {
  name: { equals: 'John' },
  created_at: { in: ['2023-01-01', '2023-12-31'] }
});
// Type: "SELECT * FROM users WHERE ..."
```

## TypeScript Namespaces

- Reference [Namespaces](https://www.w3schools.com/typescript/typescript_namespaces.php)

### Basic Namespace Syntax

```ts
namespace Validation {
  // Everything inside this block belongs to the Validation namespace

  // Export things you want to make available outside the namespace
  export interface StringValidator {
    isValid(s: string): boolean;
  }

  // This is private to the namespace (not exported)
  const lettersRegexp = /^[A-Za-z]+$/;

  // Exported class - available outside the namespace
  export class LettersValidator implements StringValidator {
    isValid(s: string): boolean {
      return lettersRegexp.test(s);
    }
  }

  // Another exported class
  export class ZipCodeValidator implements StringValidator {
    isValid(s: string): boolean {
      return /^[0-9]+$/.test(s) && s.length === 5;
    }
  }
}

// Using the namespace members
let letterValidator = new Validation.LettersValidator();
let zipCodeValidator = new Validation.ZipCodeValidator();

console.log(letterValidator.isValid("Hello")); // true
console.log(letterValidator.isValid("Hello123")); // false

console.log(zipCodeValidator.isValid("12345")); // true
console.log(zipCodeValidator.isValid("1234")); // false - wrong length
```

### Nested Namespaces

```ts
namespace App {
  export namespace Utils {
    export function log(msg: string): void {
      console.log(`[LOG]: ${msg}`);
    }

    export function error(msg: string): void {
      console.error(`[ERROR]: ${msg}`);
    }
  }

  export namespace Models {
    export interface User {
      id: number;
      name: string;
      email: string;
    }

    export class UserService {
      getUser(id: number): User {
        return { id, name: "John Doe", email: "john@example.com" };
      }
    }
  }
}

// Using nested namespaces
App.Utils.log("Application starting");

const userService = new App.Models.UserService();
const user = userService.getUser(1);

App.Utils.log(`User loaded: ${user.name}`);

// This would be a type error in TypeScript
// App.log("directly accessing log"); // Error - log is not a direct member of App
```

### Namespace Aliases

```ts
namespace VeryLongNamespace {
  export namespace DeeplyNested {
    export namespace Components {
      export class Button {
        display(): void {
          console.log("Button displayed");
        }
      }
      export class TextField {
        display(): void {
          console.log("TextField displayed");
        }
      }
    }
  }
}

// Without alias - very verbose
const button1 = new VeryLongNamespace.DeeplyNested.Components.Button();
button1.display();

// With namespace alias
import Components = VeryLongNamespace.DeeplyNested.Components;
const button2 = new Components.Button();
button2.display();

// With specific member alias
import Button = VeryLongNamespace.DeeplyNested.Components.Button;
const button3 = new Button();
button3.display();
```

### Multi-file Namespaces

**validators.ts:**
```ts
namespace Validation {
  export interface StringValidator {
    isValid(s: string): boolean;
  }
}
```

**letters-validator.ts:**
```ts
/// <reference path="validators.ts" />
namespace Validation {
  const lettersRegexp = /^[A-Za-z]+$/;

  export class LettersValidator implements StringValidator {
    isValid(s: string): boolean {
      return lettersRegexp.test(s);
    }
  }
}
```

**zipcode-validator.ts:**
```ts
/// <reference path="validators.ts" />
namespace Validation {
  const zipCodeRegexp = /^[0-9]+$/;

  export class ZipCodeValidator implements StringValidator {
    isValid(s: string): boolean {
      return zipCodeRegexp.test(s) && s.length === 5;
    }
  }
}
```

**main.ts:**
```ts
/// <reference path="validators.ts" />
/// <reference path="letters-validator.ts" />
/// <reference path="zipcode-validator.ts" />

// Now you can use the validators from multiple files
let validators: { [s: string]: Validation.StringValidator } = {};
validators["letters"] = new Validation.LettersValidator();
validators["zipcode"] = new Validation.ZipCodeValidator();

// Some samples to validate
let strings = ["Hello", "98052", "101"];

// Validate each
strings.forEach(s => {
  for (let name in validators) {
    console.log(`
        "${s}" - ${validators[name].isValid(s) ?
         "matches" : "does not match"} ${name}`);
  }
});
```

**Compile:**
```bash
tsc --outFile sample.js main.ts
```

### Namespace Augmentation

```ts
// Original namespace
declare namespace Express {
  interface Request {
    user?: { id: number; name: string };
  }
  interface Response {
    json(data: any): void;
  }
}

// Later in your application (e.g., in a .d.ts file)
declare namespace Express {
  // Augment the Request interface
  interface Request {
    // Add custom properties
    requestTime?: number;
    // Add methods
    log(message: string): void;
  }

  // Add new types
  interface UserSession {
    userId: number;
    expires: Date;
  }
}

// Usage in your application
const app = express();

app.use((req: Express.Request, res: Express.Response, next) => {
  // Augmented properties and methods are available
  req.requestTime = Date.now();
  req.log('Request started');
  next();
});
```

### Generic Namespaces

```ts
// Generic namespace example
namespace DataStorage {
  export interface Repository<T> {
    getAll(): T[];
    getById(id: number): T | undefined;
    add(item: T): void;
    update(id: number, item: T): boolean;
    delete(id: number): boolean;
  }

  // Concrete implementation
  export class InMemoryRepository<T> implements Repository<T> {
    private items: T[] = [];

    getAll(): T[] {
      return [...this.items];
    }

    getById(id: number): T | undefined {
      return this.items[id];
    }

    add(item: T): void {
      this.items.push(item);
    }

    update(id: number, item: T): boolean {
      if (id >= 0 && id < this.items.length) {
        this.items[id] = item;
        return true;
      }
      return false;
    }

    delete(id: number): boolean {
      if (id >= 0 && id < this.items.length) {
        this.items.splice(id, 1);
        return true;
      }
      return false;
    }
  }
}

// Usage
interface User {
  id: number;
  name: string;
  email: string;
}

const userRepo = new DataStorage.InMemoryRepository<User>();
userRepo.add({ id: 1, name: 'John Doe', email: 'john@example.com' });
const allUsers = userRepo.getAll();
```

### Namespaces vs Modules

```ts
// Before: Using namespaces
namespace MyApp {
  export namespace Services {
    export class UserService {
      getUser(id: number) { /* ... */ }
    }
  }
}

// After: Using ES modules
// services/UserService.ts
export class UserService {
  getUser(id: number) { /* ... */ }
}

// app.ts
import { UserService } from './services/UserService';
const userService = new UserService();
```

## TypeScript Index Signatures

- Reference [Index Signatures](https://www.w3schools.com/typescript/typescript_index_signatures.php)

### Basic String Index Signatures

```ts
// This interface represents an object with string keys and string values
interface StringDictionary {
  [key: string]: string;
}

// Creating a compliant object
const names: StringDictionary = {
  firstName: "Alice",
  lastName: "Smith",
  "100": "One Hundred"
};

// Accessing properties
console.log(names["firstName"]); // "Alice"
console.log(names["lastName"]); // "Smith"
console.log(names["100"]); // "One Hundred"

// Adding new properties dynamically
names["age"] = "30";

// This would cause an error
// names["age"] = 30; // Error: Type 'number' is not assignable to type 'string'
```

### Basic Number Index Signatures

```ts
// Object with number indexes
interface NumberDictionary {
  [index: number]: any;
}

const scores: NumberDictionary = {
  0: "Zero",
  1: 100,
  2: true
};

console.log(scores[0]); // "Zero"
console.log(scores[1]); // 100
console.log(scores[2]); // true

// Adding a complex object
scores[3] = { passed: true };
```

### Combining Index Signatures with Named Properties

```ts
interface UserInfo {
  name: string; // Required property with specific name
  age: number;  // Required property with specific name
  [key: string]: string | number; // All other properties must be string or number
}

const user: UserInfo = {
  name: "Alice", // Required
  age: 30,      // Required
  address: "123 Main St", // Optional
  zipCode: 12345 // Optional
};

// This would cause an error
// const invalidUser: UserInfo = {
//  name: "Bob",
//  age: "thirty", // Error: Type 'string' is not assignable to type 'number'
//  isAdmin: true  // Error: Type 'boolean' is not assignable to type 'string | number'
// };
```

### Readonly Index Signatures

```ts
interface ReadOnlyStringArray {
  readonly [index: number]: string;
}

const names: ReadOnlyStringArray = ["Alice", "Bob", "Charlie"];

console.log(names[0]); // "Alice"

// This would cause an error
// names[0] = "Andrew";
// Error: Index signature in type 'ReadOnlyStringArray' only permits reading
```

### Real-World API Response Example

```ts
// Type for API responses with dynamic keys
interface ApiResponse<T> {
  data: {
    [resourceType: string]: T[];  // e.g., { "users": User[], "posts": Post[] }
  };
  meta: {
    page: number;
    total: number;
    [key: string]: any;  // Allow additional metadata
  };
}

// Example usage with a users API
interface User {
  id: number;
  name: string;
  email: string;
}

// Mock API response
const apiResponse: ApiResponse<User> = {
  data: {
    users: [
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" }
    ]
  },
  meta: {
    page: 1,
    total: 2,
    timestamp: "2023-01-01T00:00:00Z"
  }
};

// Accessing the data
const users = apiResponse.data.users;
console.log(users[0].name);  // "Alice"
```

### Index Signature Type Compatibility

```ts
interface ConflictingTypes {
  [key: string]: number;
  name: string; // Error: not assignable to string index type 'number'
}

interface FixedTypes {
  [key: string]: number | string;
  name: string;  // OK
  age: number;   // OK
}
```

## TypeScript Declaration Merging

- Reference [Declaration Merging](https://www.w3schools.com/typescript/typescript_declaration_merging.php)

### Interface Merging

```ts
// First declaration
interface Person {
  name: string;
  age: number;
}

// Second declaration with the same name
interface Person {
  address: string;
  email: string;
}

// TypeScript merges them into:
// interface Person {
//   name: string;
//   age: number;
//   address: string;
//   email: string;
// }

const person: Person = {
  name: "John",
  age: 30,
  address: "123 Main St",
  email: "john@example.com"
};

console.log(person);
```

### Function Overloads

```ts
// Function overloads
function processValue(value: string): string;
function processValue(value: number): number;
function processValue(value: boolean): boolean;

// Implementation that handles all overloads
function processValue(value: string | number | boolean): string | number | boolean {
  if (typeof value === "string") {
    return value.toUpperCase();
  } else if (typeof value === "number") {
    return value * 2;
  } else {
    return !value;
  }
}

// Using the function with different types
console.log(processValue("hello"));  // "HELLO"
console.log(processValue(10));       // 20
console.log(processValue(true));     // false
```

### Namespace Merging

```ts
namespace Validation {
  export interface StringValidator {
    isValid(s: string): boolean;
  }
}

namespace Validation {
  export interface NumberValidator {
    isValid(n: number): boolean;
  }

  export class ZipCodeValidator implements StringValidator {
    isValid(s: string): boolean {
      return s.length === 5 && /^\d+$/.test(s);
    }
  }
}

// After merging:
// namespace Validation {
//   export interface StringValidator { isValid(s: string): boolean; }
//   export interface NumberValidator { isValid(n: number): boolean; }
//   export class ZipCodeValidator implements StringValidator { ... }
// }

// Using the merged namespace
const zipValidator = new Validation.ZipCodeValidator();

console.log(zipValidator.isValid("12345"));  // true
console.log(zipValidator.isValid("1234"));   // false
console.log(zipValidator.isValid("abcde"));  // false
```

### Class and Interface Merging

```ts
// Interface declaration
interface Cart {
  calculateTotal(): number;
}

// Class declaration with same name
class Cart {
  items: { name: string; price: number }[] = [];

  addItem(name: string, price: number): void {
    this.items.push({ name, price });
  }

  // Must implement the interface method
  calculateTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}

// Using the merged class and interface
const cart = new Cart();
cart.addItem("Book", 15.99);
cart.addItem("Coffee Mug", 8.99);

console.log(`Total: $${cart.calculateTotal().toFixed(2)}`);
```

### Enum Merging

```ts
// First part of the enum
enum Direction {
  North,
  South
}

// Second part of the enum
enum Direction {
  East = 2,
  West = 3
}

// After merging:
// enum Direction {
//   North = 0,
//   South = 1,
//   East = 2,
//   West = 3
// }

console.log(Direction.North);  // 0
console.log(Direction.South);  // 1
console.log(Direction.East);   // 2
console.log(Direction.West);   // 3

// Can also access by value
console.log(Direction[0]);     // "North"
console.log(Direction[2]);     // "East"
```

### Module Augmentation

```ts
// Original library definition
// Imagine this comes from a third-party library
declare namespace LibraryModule {
  export interface User {
    id: number;
    name: string;
  }
  export function getUser(id: number): User;
}

// Augmenting with additional functionality (your code)
declare namespace LibraryModule {
  // Add new interface
  export interface UserPreferences {
    theme: string;
    notifications: boolean;
  }

  // Add new property to existing interface
  export interface User {
    preferences?: UserPreferences;
  }

  // Add new function
  export function getUserPreferences(userId: number): UserPreferences;
}

// Using the augmented module
const user = LibraryModule.getUser(123);
console.log(user.preferences?.theme);

const prefs = LibraryModule.getUserPreferences(123);
console.log(prefs.notifications);
```

