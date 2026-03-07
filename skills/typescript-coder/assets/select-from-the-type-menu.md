<!-- 
  Based on TypeScript official documentation:
  - https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
  - https://www.typescriptlang.org/docs/handbook/2/generics.html
  - https://www.typescriptlang.org/docs/handbook/2/keyof-types.html
  - https://www.typescriptlang.org/docs/handbook/2/typeof-types.html
  - https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html
  - https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
  - https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
  - https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
  - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  - https://www.typescriptlang.org/docs/handbook/2/objects.html
  - https://www.typescriptlang.org/docs/handbook/variable-declarations.html
  - https://www.typescriptlang.org/docs/handbook/2/functions.html
  TypeScript documentation is copyright Microsoft Corporation.
  TypeScript is licensed under the Apache-2.0 License.
  Code examples in this template are adapted from the TypeScript handbook
  and extended with original examples for practical use.
 -->

# Select From the Type Menu

> A modular TypeScript type-system template. Pick and combine ingredients to build a custom
> TypeScript project starter tailored to your project's scope, purpose, and goals.
>
> Based on the official [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/).
> TypeScript is licensed under Apache-2.0 by Microsoft Corporation.

---

## How to Use This Template

This file is a **modular ingredient library**, not a single fixed template.

1. **Read the Base Setup** section — it is always required. Copy it into your project first.
2. **Browse the Menu Sections** below. Each section is independent.
3. **Select the sections that match your project's needs.** You can combine any number of them.
4. **Copy selected sections into a `src/types.ts` file** (or a `src/types/` directory for larger projects).
5. **Adapt the examples to your domain** — rename types, swap placeholder names, remove examples you don't need.
6. **Remove unselected sections entirely.**

With 15 independent menu sections, each of which can be included or excluded, this template
supports over **32,000** possible combinations of type features. The Combination Examples section
at the end shows 8 common project archetypes and which sections to select for each.

---

## Base Setup (Required for All Projects)

Every project starts here. Copy this and customize as needed.

### `package.json` shell

```json
{
  "name": "my-project",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

### `tsconfig.json` (strict baseline)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `src/index.ts` shell

```typescript
/**
 * Entry point. Import and re-export your types and logic here.
 */

// Replace this with your actual exports
export const VERSION = "0.1.0";
```

---

## Menu Sections

Each section below is an independent "ingredient." Select the ones that apply to your project.

---

### Primitive & Everyday Types

**Choose these for:** any project — the foundation of all TypeScript

**Reference:** [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)

```typescript
// ── Primitives ──────────────────────────────────────────────────────────────

const message: string = "Hello, TypeScript";
const count: number = 42;
const ratio: number = 3.14;
const isActive: boolean = true;
const nothing: null = null;
const notYet: undefined = undefined;

// BigInt (for integers beyond Number.MAX_SAFE_INTEGER)
const bigNum: bigint = 9_007_199_254_740_993n;

// Symbol (unique, non-enumerable identifier)
const sym: symbol = Symbol("description");

// ── Arrays ──────────────────────────────────────────────────────────────────

const names: string[] = ["Alice", "Bob", "Carol"];
const scores: Array<number> = [95, 87, 72]; // Equivalent generic form

// Readonly array — prevents mutation
const DAYS: ReadonlyArray<string> = ["Mon", "Tue", "Wed", "Thu", "Fri"];
// Or: const DAYS: readonly string[] = [...]

// ── Tuples ──────────────────────────────────────────────────────────────────

// Fixed-length, fixed-type array
type Coordinate = [x: number, y: number];
const origin: Coordinate = [0, 0];

// Tuple with optional element
type HttpResponse = [statusCode: number, body: string, headers?: Record<string, string>];

// Readonly tuple
type ImmutablePair = readonly [string, number];

// ── Special Types ───────────────────────────────────────────────────────────

// unknown — safer alternative to any; must narrow before use
function parseInput(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  throw new TypeError(`Cannot parse input of type ${typeof raw}`);
}

// never — a value that can never occur (exhaustive checks, throwing functions)
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

// void — function return type when there is no meaningful return value
function logMessage(msg: string): void {
  console.log(msg);
}

// any — escape hatch; avoid in production code, prefer unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyInterop(data: any): void {
  // Only use any when integrating with untyped third-party code
  console.log(data);
}
```

---

### Object Types & Interfaces

**Choose these for:** data models, API shapes, configuration objects, domain entities

**Reference:** [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)

```typescript
// ── Interface Declaration ────────────────────────────────────────────────────

interface User {
  readonly id: string;           // readonly — cannot be reassigned after creation
  name: string;
  email: string;
  age?: number;                  // optional — may be undefined
  readonly createdAt: Date;
}

// ── Type Alias for Object Shape ──────────────────────────────────────────────

// Use type for unions, intersections, and when you need a non-extensible shape
type Point = {
  x: number;
  y: number;
};

// ── Interface vs Type Alias ──────────────────────────────────────────────────
// Interface: can be extended (declaration merging), better error messages for objects
// Type: required for unions/intersections, cannot be re-declared

// Interfaces are extendable via extends:
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

// Type aliases extend via intersection:
type Cat = Animal & { indoor: boolean };

// ── Optional and Readonly Properties ────────────────────────────────────────

interface Config {
  readonly host: string;
  readonly port: number;
  timeout?: number;              // Optional
  retries?: number;              // Optional
  tls?: {                        // Nested optional object
    cert: string;
    key: string;
  };
}

// ── Index Signatures ─────────────────────────────────────────────────────────
// Use when the property names are not known ahead of time

interface StringMap {
  [key: string]: string;
}

interface NumberRecord {
  [id: string]: number;
}

// Mixed: known keys + index signature (index signature type must include known values)
interface UserRegistry {
  admin: User;
  [userId: string]: User;
}

// ── Excess Property Checking ─────────────────────────────────────────────────
// TypeScript checks for excess properties on object literals assigned to a typed variable

interface Options {
  color?: string;
  width?: number;
}

// This would error — 'colour' is not in Options
// const opts: Options = { colour: "red" }; // Error!

// Workaround for dynamic objects: use intermediate variable
const dynamicOpts = { colour: "red", width: 100 };
const opts: Options = dynamicOpts; // OK — structural compatibility

// ── Nested and Recursive Types ────────────────────────────────────────────────

interface TreeNode<T> {
  value: T;
  children?: TreeNode<T>[];
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
```

---

### Union & Intersection Types

**Choose these for:** flexible APIs, combining existing types, discriminated unions, multi-type parameters

**Reference:** [Everyday Types — Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)

```typescript
// ── Union Types ──────────────────────────────────────────────────────────────

// A value that can be one of several types
type StringOrNumber = string | number;
type NullableString = string | null;
type MaybeUser = User | null | undefined;

// Function accepting multiple types
function formatId(id: string | number): string {
  if (typeof id === "number") {
    return id.toString().padStart(8, "0");
  }
  return id;
}

// ── Intersection Types ───────────────────────────────────────────────────────

// Combine multiple types into one — the value must satisfy ALL constituent types
type Serializable = { serialize(): string };
type Identifiable = { id: string };
type SerializableEntity = Identifiable & Serializable;

// Common pattern: Mixin / trait composition
interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface SoftDeletable {
  deletedAt: Date | null;
}

type AuditedEntity = Timestamped & SoftDeletable;

// Intersection with an interface
interface BaseEntity {
  id: string;
}

type UserEntity = BaseEntity & {
  name: string;
  email: string;
};

// ── Combining Union + Intersection ────────────────────────────────────────────

type AdminUser = User & { role: "admin"; permissions: string[] };
type GuestUser = { role: "guest"; sessionId: string };
type AuthenticatedUser = AdminUser | GuestUser;

// ── Narrowing Union Types ─────────────────────────────────────────────────────

function processId(id: string | number): string {
  // typeof guard — narrows to the specific primitive type
  if (typeof id === "string") {
    return id.toUpperCase();   // TypeScript knows: id is string here
  }
  return id.toFixed(2);        // TypeScript knows: id is number here
}

// instanceof guard — for class instances
function formatDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();  // TypeScript knows: value is Date here
  }
  return value;                  // TypeScript knows: value is string here
}
```

---

### Literal Types & Const Assertions

**Choose these for:** state machines, option sets, fixed value sets, configuration enums, exhaustive handling

**Reference:** [Everyday Types — Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)

```typescript
// ── String Literal Types ──────────────────────────────────────────────────────

type Direction = "north" | "south" | "east" | "west";
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type LogLevel = "debug" | "info" | "warn" | "error";

function move(direction: Direction): void {
  console.log(`Moving ${direction}`);
}

move("north");  // OK
// move("up");  // Error: Argument of type '"up"' is not assignable to parameter of type 'Direction'

// ── Numeric Literal Types ─────────────────────────────────────────────────────

type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
type HttpStatusCode = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500;

// ── Boolean Literal Types ─────────────────────────────────────────────────────

type StrictTrue = true;
type StrictFalse = false;

// Useful in discriminated unions:
type Loading = { status: "loading"; data: null };
type Loaded<T> = { status: "loaded"; data: T };
type Failed = { status: "error"; error: Error; data: null };

// ── Const Assertions ─────────────────────────────────────────────────────────

// Without `as const` — TypeScript widens the type
const mutableConfig = {
  host: "localhost",   // inferred: string (wide)
  port: 3000,          // inferred: number (wide)
};

// With `as const` — TypeScript narrows to literal types
const CONFIG = {
  host: "localhost",   // literal: "localhost"
  port: 3000,          // literal: 3000
  features: ["auth", "logging"] as const,
} as const;

// CONFIG.port is now type 3000, not number
// CONFIG.features is now readonly ["auth", "logging"]

type Config = typeof CONFIG;
// { readonly host: "localhost"; readonly port: 3000; readonly features: readonly ["auth", "logging"]; }

// Deriving a union from an array literal using `as const`
const ALLOWED_ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof ALLOWED_ROLES)[number]; // "admin" | "editor" | "viewer"

// Deriving types from object values
const STATUS_CODES = {
  ok: 200,
  created: 201,
  notFound: 404,
  error: 500,
} as const;

type StatusCode = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];
// 200 | 201 | 404 | 500
```

---

### Generics

**Choose these for:** reusable utilities, collections, wrappers, repository patterns, data transformation

**Reference:** [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

```typescript
// ── Generic Functions ────────────────────────────────────────────────────────

// The simplest generic — identity function
function identity<T>(value: T): T {
  return value;
}

const strVal = identity("hello");   // T inferred as string
const numVal = identity(42);        // T inferred as number

// Multiple type parameters
function pair<A, B>(first: A, second: B): [A, B] {
  return [first, second];
}

const strNum = pair("hello", 42);   // [string, number]

// ── Generic Constraints ───────────────────────────────────────────────────────

// Constrain T to only types that have a `.length` property
function getLength<T extends { length: number }>(value: T): number {
  return value.length;
}

getLength("hello");        // OK — string has .length
getLength([1, 2, 3]);      // OK — array has .length
// getLength(42);           // Error — number has no .length

// Constrain K to only keys that actually exist on T
function getProperty<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Alice", age: 30, email: "alice@example.com" };
const name = getProperty(user, "name");   // Type: string
const age = getProperty(user, "age");     // Type: number
// getProperty(user, "phone");             // Error — 'phone' is not a key of user

// ── Generic Interfaces ────────────────────────────────────────────────────────

interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(item: Omit<T, "id">): Promise<T>;
  update(id: ID, item: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
}

// Implementation example
interface UserEntity {
  id: string;
  name: string;
  email: string;
}

class InMemoryUserRepository implements Repository<UserEntity> {
  private store = new Map<string, UserEntity>();

  async findById(id: string): Promise<UserEntity | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<UserEntity[]> {
    return Array.from(this.store.values());
  }

  async create(item: Omit<UserEntity, "id">): Promise<UserEntity> {
    const entity: UserEntity = { ...item, id: crypto.randomUUID() };
    this.store.set(entity.id, entity);
    return entity;
  }

  async update(id: string, item: Partial<UserEntity>): Promise<UserEntity> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Entity ${id} not found`);
    const updated = { ...existing, ...item };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

// ── Generic Classes ───────────────────────────────────────────────────────────

class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
console.log(numberStack.pop()); // 2

// ── Default Type Parameters ───────────────────────────────────────────────────

// T defaults to unknown if not provided
interface ApiResponse<T = unknown> {
  data: T;
  statusCode: number;
  message: string;
}

type UserResponse = ApiResponse<UserEntity>;  // Explicit
type GenericResponse = ApiResponse;           // Uses default: unknown

// ── Generic Utility Functions ─────────────────────────────────────────────────

/** Filters an array to only items that match the predicate. Type-safe. */
function filterDefined<T>(array: Array<T | null | undefined>): T[] {
  return array.filter((item): item is T => item !== null && item !== undefined);
}

const mixed = [1, null, 2, undefined, 3];
const onlyNumbers = filterDefined(mixed); // number[]

/** Groups items by a key derived from each item. */
function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  keySelector: (item: T) => K
): Partial<Record<K, T[]>> {
  return items.reduce(
    (acc, item) => {
      const key = keySelector(item);
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(item);
      return acc;
    },
    {} as Partial<Record<K, T[]>>
  );
}
```

---

### Keyof & Typeof Operators

**Choose these for:** safe property access, dynamic key patterns, runtime reflection, type-safe object manipulation

**Reference:** [keyof](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) | [typeof](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)

```typescript
// ── keyof ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

// keyof produces a union of all known keys as string/number/symbol literals
type ProductKeys = keyof Product;
// "id" | "name" | "price" | "inStock"

// Common pattern: safe property getter
function getField<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const p: Product = { id: "p1", name: "Widget", price: 9.99, inStock: true };
const productName = getField(p, "name");   // Type: string
// getField(p, "sku");                      // Error — 'sku' is not a key of Product

// Use keyof with mapped types (see Mapped Types section)
type ProductUpdate = Partial<Pick<Product, keyof Product>>;

// ── typeof ────────────────────────────────────────────────────────────────────

// In expression position: JavaScript typeof (returns string at runtime)
const x = "hello";
console.log(typeof x); // "string" — runtime JavaScript

// In type position: TypeScript typeof (captures the type of a variable)
const defaultConfig = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3,
  features: { auth: true, logging: false } as const,
};

type DefaultConfig = typeof defaultConfig;
// {
//   apiUrl: string;
//   timeout: number;
//   retries: number;
//   features: { readonly auth: true; readonly logging: false };
// }

// Use typeof to avoid repeating a type definition
function mergeConfig(base: typeof defaultConfig, overrides: Partial<typeof defaultConfig>) {
  return { ...base, ...overrides };
}

// Capture the type of a function
function createUser(name: string, email: string) {
  return { id: crypto.randomUUID(), name, email, createdAt: new Date() };
}

type CreatedUser = ReturnType<typeof createUser>;
// { id: string; name: string; email: string; createdAt: Date }

// Capture the parameters of a function
type CreateUserParams = Parameters<typeof createUser>;
// [name: string, email: string]

// ── keyof + typeof Together ────────────────────────────────────────────────────

const FEATURE_FLAGS = {
  darkMode: false,
  betaSignup: true,
  analyticsV2: false,
} as const;

type FeatureFlag = keyof typeof FEATURE_FLAGS;
// "darkMode" | "betaSignup" | "analyticsV2"

function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

isFeatureEnabled("darkMode");    // OK
// isFeatureEnabled("unknown");  // Error — not a valid flag
```

---

### Indexed Access Types

**Choose these for:** extracting nested types, working with array element types, deeply nested configuration, API response shape extraction

**Reference:** [Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)

```typescript
// ── Basic Indexed Access ──────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    country: string;
    zip: string;
  };
  tags: string[];
  roles: ("admin" | "editor" | "viewer")[];
}

// Extract a single property type
type UserId = UserProfile["id"];            // string
type UserAddress = UserProfile["address"];  // { street: string; city: string; ... }

// Extract a nested property type
type City = UserProfile["address"]["city"]; // string

// Extract union from string literals
type UserRole = UserProfile["roles"][number];
// "admin" | "editor" | "viewer"

// Extract array element type
type TagType = UserProfile["tags"][number]; // string

// ── Indexed Access with keyof ─────────────────────────────────────────────────

// Get the type of any value in UserProfile
type AnyProfileValue = UserProfile[keyof UserProfile];
// string | { street: string; ... } | string[] | ("admin" | "editor" | "viewer")[]

// ── Practical: Extracting API Response Types ──────────────────────────────────

interface ApiSchema {
  "/users": {
    GET: { response: UserProfile[] };
    POST: { body: Omit<UserProfile, "id">; response: UserProfile };
  };
  "/users/:id": {
    GET: { response: UserProfile };
    PUT: { body: Partial<UserProfile>; response: UserProfile };
    DELETE: { response: { success: boolean } };
  };
}

type GetUsersResponse = ApiSchema["/users"]["GET"]["response"];
// UserProfile[]

type CreateUserBody = ApiSchema["/users"]["POST"]["body"];
// Omit<UserProfile, "id">

// ── Indexed Access with Arrays ─────────────────────────────────────────────────

const SORTED_COLUMNS = ["name", "email", "createdAt", "role"] as const;
type SortColumn = (typeof SORTED_COLUMNS)[number];
// "name" | "email" | "createdAt" | "role"

// Extract tuple element types
type Tuple = [string, number, boolean];
type First = Tuple[0];    // string
type Second = Tuple[1];   // number
type TupleValues = Tuple[number]; // string | number | boolean
```

---

### Conditional Types

**Choose these for:** type-level logic, utility type implementation, discriminating types by shape, advanced generics

**Reference:** [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)

```typescript
// ── Basic Conditional Type ────────────────────────────────────────────────────

// Syntax: T extends U ? TrueType : FalseType
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false
type C = IsString<"hello">;  // true — string literal extends string

// ── Conditional Types with infer ──────────────────────────────────────────────

// `infer` captures a type within a conditional — used to "pull out" inner types

// Extract the return type of a function
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never;

function fetchUser(): Promise<UserProfile> {
  return Promise.resolve({} as UserProfile);
}

type FetchUserReturn = MyReturnType<typeof fetchUser>;
// Promise<UserProfile>

// Unwrap a Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type ResolvedUser = Awaited<Promise<Promise<UserProfile>>>;
// UserProfile

// Extract the first element type from a tuple
type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never;

type Head = First<[string, number, boolean]>; // string

// Extract the type of array/readonly array elements
type ElementType<T> = T extends readonly (infer U)[] ? U : never;

type StrElement = ElementType<string[]>;         // string
type NumElement = ElementType<ReadonlyArray<number>>; // number

// ── Distributive Conditional Types ────────────────────────────────────────────

// When T is a naked type parameter, conditional types distribute over union members
type ToArray<T> = T extends unknown ? T[] : never;

type StrOrNumArray = ToArray<string | number>;
// string[] | number[]   (distributes! not (string | number)[])

// Preventing distribution with a tuple wrapper
type ToArrayNonDistributive<T> = [T] extends [unknown] ? T[] : never;

type Combined = ToArrayNonDistributive<string | number>;
// (string | number)[]

// ── Practical Utility Types Built with Conditionals ────────────────────────────

// Exclude types from a union
type MyExclude<T, U> = T extends U ? never : T;

type Colors = "red" | "green" | "blue" | "yellow";
type WarmColors = MyExclude<Colors, "green" | "blue">;
// "red" | "yellow"

// Extract only types matching a shape
type MyExtract<T, U> = T extends U ? T : never;

type StringColors = MyExtract<Colors | number | boolean, string>;
// "red" | "green" | "blue" | "yellow"

// Non-nullable
type MyNonNullable<T> = T extends null | undefined ? never : T;

type SafeString = MyNonNullable<string | null | undefined>;
// string

// ── Conditional Types for Object Discrimination ────────────────────────────────

// Pick only the keys whose values are of a given type
type KeysOfType<T, ValueType> = {
  [K in keyof T]: T[K] extends ValueType ? K : never;
}[keyof T];

interface MixedShape {
  id: string;
  name: string;
  count: number;
  isActive: boolean;
  score: number;
}

type StringKeys = KeysOfType<MixedShape, string>;   // "id" | "name"
type NumberKeys = KeysOfType<MixedShape, number>;   // "count" | "score"
```

---

### Mapped Types

**Choose these for:** transforming existing types, making all-optional versions, readonly variants, API transformation layers

**Reference:** [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)

```typescript
// ── Basic Mapped Types ────────────────────────────────────────────────────────

// Mapped types iterate over keys of an existing type and transform each property

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
}

// Make all properties optional (mirrors built-in Partial<T>)
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

type OptionalTask = MyPartial<Task>;
// { id?: string; title?: string; completed?: boolean; priority?: number; }

// Make all properties readonly (mirrors built-in Readonly<T>)
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

type ImmutableTask = MyReadonly<Task>;

// Make all properties required (removes optionality)
type MyRequired<T> = {
  [K in keyof T]-?: T[K];  // -? removes optional modifier
};

// ── Modifiers: +/- readonly and +/- optional ──────────────────────────────────

// Add readonly (+readonly or just readonly)
type AddReadonly<T> = { +readonly [K in keyof T]: T[K] };

// Remove readonly
type RemoveReadonly<T> = { -readonly [K in keyof T]: T[K] };

// Add optional
type AddOptional<T> = { [K in keyof T]+?: T[K] };

// Remove optional (make required)
type RemoveOptional<T> = { [K in keyof T]-?: T[K] };

// ── Remapping Keys ────────────────────────────────────────────────────────────

// Use `as` to remap property names
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type TaskGetters = Getters<Task>;
// {
//   getId: () => string;
//   getTitle: () => string;
//   getCompleted: () => boolean;
//   getPriority: () => number;
// }

// Filter out keys using conditional type + never
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type StringTaskFields = OnlyStrings<Task>;
// { id: string; title: string; }

// ── Mapped Type with Value Transformation ─────────────────────────────────────

// Wrap each value in a Promise
type Promisified<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};

// Nullable version of a type
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

// ── Record Shorthand ──────────────────────────────────────────────────────────

// Record<K, V> is a common mapped type shorthand
type StatusMap = Record<"pending" | "active" | "archived", number>;

const taskCounts: StatusMap = { pending: 5, active: 3, archived: 12 };

// More explicit equivalent:
type ExplicitStatusMap = {
  [K in "pending" | "active" | "archived"]: number;
};
```

---

### Template Literal Types

**Choose these for:** string-based APIs, event naming, CSS-in-TS, route typing, property accessor naming

**Reference:** [Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)

```typescript
// ── Basic Template Literal Types ──────────────────────────────────────────────

type World = "world";
type Greeting = `hello ${World}`;
// "hello world"

// Combines with union types — produces the Cartesian product
type Color = "red" | "green" | "blue";
type Shade = "light" | "dark";
type ColorShade = `${Shade}-${Color}`;
// "light-red" | "light-green" | "light-blue" | "dark-red" | "dark-green" | "dark-blue"

// ── Event Name Patterns ────────────────────────────────────────────────────────

type EventName = "click" | "focus" | "blur" | "change" | "submit";
type HandlerName = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur" | "onChange" | "onSubmit"

// Full event handler map
type EventHandlers = {
  [K in EventName as `on${Capitalize<K>}`]?: (event: Event) => void;
};

// ── CRUD Route Typing ──────────────────────────────────────────────────────────

type Resource = "user" | "post" | "comment";
type CrudAction = "create" | "read" | "update" | "delete" | "list";
type PermissionString = `${Resource}:${CrudAction}`;
// "user:create" | "user:read" | "user:update" | "user:delete" | "user:list" | ...

function hasPermission(
  userPermissions: PermissionString[],
  required: PermissionString
): boolean {
  return userPermissions.includes(required);
}

// ── Intrinsic String Manipulation Types ───────────────────────────────────────

// Built-in TypeScript string manipulation types
type U = Uppercase<"hello">;      // "HELLO"
type L = Lowercase<"WORLD">;      // "world"
type C = Capitalize<"hello">;     // "Hello"
type UC = Uncapitalize<"Hello">;  // "hello"

// Practical: convert snake_case keys to camelCase at type level
type SnakeToCamel<S extends string> =
  S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
    : S;

type CamelKey = SnakeToCamel<"created_at_utc">;  // "createdAtUtc"

// ── CSS-in-TS Property Typing ─────────────────────────────────────────────────

type CSSUnit = "px" | "rem" | "em" | "%" | "vh" | "vw";
type CSSValue = `${number}${CSSUnit}`;
// Partial — TypeScript can't enforce number in template literals, but documents intent

type Side = "top" | "right" | "bottom" | "left";
type MarginProp = `margin-${Side}` | "margin";
type PaddingProp = `padding-${Side}` | "padding";
type SpacingProp = MarginProp | PaddingProp;

// ── Deeply Typed Object Keys ──────────────────────────────────────────────────

// Typed getter/setter pair generation
type WithAccessors<T extends object> = T & {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
} & {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};
```

---

### Utility Types Toolkit

**Choose these for:** any project — these are TypeScript's built-in transformation utilities

```typescript
// This section documents and demonstrates the full suite of TypeScript built-in
// utility types. Use them freely — no import required.

// ──────────────────────────────────────────────────────────────────────────────
// Object transformation utilities
// ──────────────────────────────────────────────────────────────────────────────

interface FullUser {
  id: string;
  name: string;
  email: string;
  password: string;
  age: number;
  role: "admin" | "user";
  createdAt: Date;
  deletedAt: Date | null;
}

// Partial<T> — makes all properties optional
type UserUpdate = Partial<FullUser>;
// { id?: string; name?: string; ... }

// Required<T> — makes all properties required (removes optional modifiers)
interface DraftPost {
  title?: string;
  body?: string;
  tags?: string[];
}
type PublishedPost = Required<DraftPost>;
// { title: string; body: string; tags: string[]; }

// Readonly<T> — makes all properties readonly
type ImmutableUser = Readonly<FullUser>;
// { readonly id: string; readonly name: string; ... }

// Pick<T, K> — creates a type with only the specified keys
type UserPublicProfile = Pick<FullUser, "id" | "name" | "role">;
// { id: string; name: string; role: "admin" | "user" }

// Omit<T, K> — creates a type without the specified keys
type UserWithoutSensitive = Omit<FullUser, "password" | "deletedAt">;
// { id: string; name: string; email: string; age: number; role: ...; createdAt: Date; }

// Record<K, V> — creates a map type from keys K to values V
type RolePermissions = Record<"admin" | "user" | "guest", string[]>;
const permissions: RolePermissions = {
  admin: ["read", "write", "delete"],
  user: ["read", "write"],
  guest: ["read"],
};

// ──────────────────────────────────────────────────────────────────────────────
// Union manipulation utilities
// ──────────────────────────────────────────────────────────────────────────────

type AllColors = "red" | "green" | "blue" | "yellow" | "cyan" | "magenta";

// Exclude<T, U> — removes types from T that are assignable to U
type PrimaryColors = Exclude<AllColors, "yellow" | "cyan" | "magenta">;
// "red" | "green" | "blue"

// Extract<T, U> — keeps only types from T that are assignable to U
type WarmColors = Extract<AllColors, "red" | "yellow" | "orange">;
// "red" | "yellow"  (orange isn't in AllColors)

// NonNullable<T> — removes null and undefined from T
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;
// string

// ──────────────────────────────────────────────────────────────────────────────
// Function-related utilities
// ──────────────────────────────────────────────────────────────────────────────

async function fetchUsers(page: number, limit: number): Promise<FullUser[]> {
  return [];
}

// ReturnType<T> — extracts the return type of a function type
type FetchUsersReturn = ReturnType<typeof fetchUsers>;
// Promise<FullUser[]>

// Parameters<T> — extracts the parameter types as a tuple
type FetchUsersParams = Parameters<typeof fetchUsers>;
// [page: number, limit: number]

// ConstructorParameters<T> — extracts constructor parameter types
class UserService {
  constructor(
    private readonly apiUrl: string,
    private readonly timeout: number
  ) {}
}
type ServiceCtorParams = ConstructorParameters<typeof UserService>;
// [apiUrl: string, timeout: number]

// InstanceType<T> — gets the instance type of a constructor function/class
type ServiceInstance = InstanceType<typeof UserService>;
// UserService

// ──────────────────────────────────────────────────────────────────────────────
// Promise utility
// ──────────────────────────────────────────────────────────────────────────────

// Awaited<T> — recursively unwraps Promise types
type DeepPromise = Promise<Promise<Promise<string>>>;
type Resolved = Awaited<DeepPromise>;
// string

type AwaitedUsers = Awaited<ReturnType<typeof fetchUsers>>;
// FullUser[]

// ──────────────────────────────────────────────────────────────────────────────
// Quick Reference Table
// ──────────────────────────────────────────────────────────────────────────────

// | Utility             | What it does                                          |
// |---------------------|-------------------------------------------------------|
// | Partial<T>          | All properties optional                               |
// | Required<T>         | All properties required                               |
// | Readonly<T>         | All properties readonly                               |
// | Pick<T, K>          | Keep only keys K from T                               |
// | Omit<T, K>          | Remove keys K from T                                  |
// | Record<K, V>        | Map from keys K to values V                           |
// | Exclude<T, U>       | Remove from union T anything assignable to U          |
// | Extract<T, U>       | Keep from union T only types assignable to U          |
// | NonNullable<T>      | Remove null and undefined from T                      |
// | ReturnType<F>       | Return type of function F                             |
// | Parameters<F>       | Parameter types of function F as a tuple              |
// | ConstructorParameters<C> | Constructor parameter types as a tuple         |
// | InstanceType<C>     | Instance type of constructor C                        |
// | Awaited<T>          | Recursively unwrap Promise<...> to inner type         |
```

---

### Function Signatures & Overloads

**Choose these for:** libraries, complex APIs, callback-heavy code, multiple calling conventions

**Reference:** [More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)

```typescript
// ── Basic Typed Function Signatures ──────────────────────────────────────────

// Named function with explicit types
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function
const multiply = (a: number, b: number): number => a * b;

// Function type expression
type Transformer<T, U> = (value: T) => U;
const stringify: Transformer<number, string> = (n) => n.toString();

// ── Optional and Default Parameters ──────────────────────────────────────────

function greet(name: string, greeting?: string): string {
  return `${greeting ?? "Hello"}, ${name}!`;
}

function createTimeout(ms: number, label = "timeout"): NodeJS.Timeout {
  return setTimeout(() => console.warn(`${label} expired`), ms);
}

// ── Rest Parameters ───────────────────────────────────────────────────────────

function logAll(level: "info" | "warn" | "error", ...messages: string[]): void {
  messages.forEach((msg) => console[level](msg));
}

logAll("info", "Starting", "Connecting", "Ready");

// ── Destructuring Parameters ──────────────────────────────────────────────────

interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

function paginate({
  page = 1,
  pageSize = 20,
  sortBy = "createdAt",
  sortOrder = "desc",
}: PaginationOptions = {}): string {
  return `page=${page}&limit=${pageSize}&sort=${sortBy}:${sortOrder}`;
}

// ── Function Overloads ────────────────────────────────────────────────────────

// Overloads allow the same function to accept different argument combinations
// with different return types, while keeping a single implementation.

// Overload signatures (declarations only — no body)
function formatDate(date: Date): string;
function formatDate(timestamp: number): string;
function formatDate(iso: string): string;
function formatDate(parts: { year: number; month: number; day: number }): string;

// Implementation signature (must be compatible with all overloads)
function formatDate(
  value: Date | number | string | { year: number; month: number; day: number }
): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return new Date(value).toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return new Date(value).toISOString().slice(0, 10);
  }
  const { year, month, day } = value;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// All these are type-safe:
formatDate(new Date());
formatDate(Date.now());
formatDate("2025-01-15");
formatDate({ year: 2025, month: 1, day: 15 });

// ── Generic Functions with Constraints ────────────────────────────────────────

// Merge two objects, with right taking precedence
function merge<T extends object, U extends object>(base: T, overrides: U): T & U {
  return { ...base, ...overrides };
}

// Type-safe array first/last
function first<T>(arr: readonly [T, ...T[]]): T;      // Non-empty — always returns T
function first<T>(arr: readonly T[]): T | undefined;  // May be empty — may return undefined
function first<T>(arr: readonly T[]): T | undefined {
  return arr[0];
}

// ── Callable & Constructable Interfaces ──────────────────────────────────────

// Callable interface (function with properties)
interface Formatter {
  (value: string): string;
  locale: string;
  precision?: number;
}

// Constructor signature
interface Constructable<T> {
  new (...args: unknown[]): T;
}

// ── ThisParameterType ─────────────────────────────────────────────────────────

// Type `this` explicitly in method functions (useful for mixin patterns)
function validate(this: { value: number; min: number; max: number }): boolean {
  return this.value >= this.min && this.value <= this.max;
}
```

---

### Variable Declarations & Scoping

**Choose these for:** any project — best practices for variable declarations

**Reference:** [Variable Declarations](https://www.typescriptlang.org/docs/handbook/variable-declarations.html)

```typescript
// ── let vs const ──────────────────────────────────────────────────────────────

// const — preferred for values that won't be reassigned
const MAX_RETRIES = 3;          // number
const API_URL = "https://api.example.com"; // string

// let — for variables that will be reassigned
let currentPage = 1;
currentPage += 1;               // OK

// TypeScript infers types from initialization
const greeting = "hello";      // inferred: string
const count = 0;                // inferred: number

// Explicit annotations when the inference would be too wide
let status: "active" | "inactive" | "suspended" = "active";

// ── Destructuring Assignment ──────────────────────────────────────────────────

// Object destructuring with type annotation
const { name, age, email }: { name: string; age: number; email: string } = getUser();

// Object destructuring with renaming
const { id: userId, name: userName } = getUser();

// Object destructuring with defaults
const { timeout = 5000, retries = 3 } = getConfig();

// Nested destructuring
const {
  address: { city, country },
  preferences: { theme = "light" },
} = getUserProfile();

// Array destructuring
const [first, second, ...rest] = getItems();
const [, secondItem] = getTuple();  // skip first element with ","

// Tuple destructuring with renaming
function getCoordinates(): [number, number] {
  return [40.7128, -74.0060];
}
const [latitude, longitude] = getCoordinates();

// ── Spread Operator ───────────────────────────────────────────────────────────

// Spread in array literals
const base = [1, 2, 3];
const extended = [...base, 4, 5];              // [1, 2, 3, 4, 5]

// Spread in object literals (shallow copy + merge)
const defaults = { timeout: 5000, retries: 3, debug: false };
const overrides = { timeout: 10000, debug: true };
const config = { ...defaults, ...overrides };  // overrides wins on conflict

// Spread with type-safe defaults
function withDefaults<T extends object>(
  partial: Partial<T>,
  defaults: T
): T {
  return { ...defaults, ...partial };
}

// ── Type-Safe Destructuring from Function Returns ─────────────────────────────

function useToggle(initialState: boolean) {
  let state = initialState;
  const toggle = () => { state = !state; };
  const reset = () => { state = initialState; };
  return [state, toggle, reset] as const;
  //                            ^^^^^^^^^ const assertion preserves tuple types
}

// Without `as const`, TypeScript would infer Array<boolean | (() => void)>
// With `as const`, TypeScript infers readonly [boolean, () => void, () => void]
const [isOpen, toggleOpen, resetOpen] = useToggle(false);
// isOpen: boolean
// toggleOpen: () => void
// resetOpen: () => void

// ── Type Narrowing with Declarations ──────────────────────────────────────────

// Declare a variable with a union type, then narrow it
declare function getApiResponse(): string | null | { error: string };

const response = getApiResponse();

if (response === null) {
  console.log("No response");
} else if (typeof response === "string") {
  console.log("Success:", response.toUpperCase());
} else {
  console.error("Error:", response.error);
}
```

---

### Discriminated Unions & Type Narrowing

**Choose these for:** state management, event systems, result types, request/response handling, FSMs

**Reference:** [Everyday Types — Narrowing](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)

```typescript
// ── Discriminated Unions ──────────────────────────────────────────────────────
// Every member has a common "discriminant" property (usually `kind` or `type`)
// that TypeScript uses to narrow the type in switch/if statements.

// Async operation state machine
type IdleState = { status: "idle" };
type LoadingState = { status: "loading"; startedAt: Date };
type SuccessState<T> = { status: "success"; data: T; loadedAt: Date };
type ErrorState = { status: "error"; error: Error; retryCount: number };

type AsyncState<T> =
  | IdleState
  | LoadingState
  | SuccessState<T>
  | ErrorState;

// Type-safe state handler with exhaustive switch
function handleState<T>(state: AsyncState<T>): string {
  switch (state.status) {
    case "idle":
      return "Waiting to start";
    case "loading":
      return `Loading since ${state.startedAt.toISOString()}`;
    case "success":
      return `Loaded at ${state.loadedAt.toISOString()}`;
    case "error":
      return `Error: ${state.error.message} (retry ${state.retryCount})`;
    default:
      // Exhaustive check — TypeScript errors if a case is unhandled
      return assertNever(state);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union case: ${JSON.stringify(value)}`);
}

// ── DOM/Input Event Discriminated Union ───────────────────────────────────────

type AppEvent =
  | { type: "USER_LOGIN"; payload: { userId: string; sessionId: string } }
  | { type: "USER_LOGOUT"; payload: { userId: string } }
  | { type: "ITEM_ADDED"; payload: { itemId: string; quantity: number } }
  | { type: "ITEM_REMOVED"; payload: { itemId: string } }
  | { type: "ERROR"; payload: { code: string; message: string } };

function dispatch(event: AppEvent): void {
  switch (event.type) {
    case "USER_LOGIN":
      console.log(`User ${event.payload.userId} logged in`);
      break;
    case "USER_LOGOUT":
      console.log(`User ${event.payload.userId} logged out`);
      break;
    case "ITEM_ADDED":
      console.log(`Added ${event.payload.quantity} of item ${event.payload.itemId}`);
      break;
    case "ITEM_REMOVED":
      console.log(`Removed item ${event.payload.itemId}`);
      break;
    case "ERROR":
      console.error(`[${event.payload.code}] ${event.payload.message}`);
      break;
    default:
      assertNever(event);
  }
}

// ── Type Predicates (User-Defined Type Guards) ────────────────────────────────

// A type predicate narrows the type in the scope where it returns true
function isErrorState<T>(state: AsyncState<T>): state is ErrorState {
  return state.status === "error";
}

function isSuccessState<T>(state: AsyncState<T>): state is SuccessState<T> {
  return state.status === "success";
}

// Using type predicates in filter
const states: AsyncState<string>[] = [];
const errors = states.filter(isErrorState);     // ErrorState[]
const successes = states.filter(isSuccessState); // SuccessState<string>[]

// ── in Operator Narrowing ─────────────────────────────────────────────────────

interface Circle {
  kind: "circle";
  radius: number;
}

interface Rectangle {
  kind: "rectangle";
  width: number;
  height: number;
}

interface Triangle {
  kind: "triangle";
  base: number;
  height: number;
}

type Shape = Circle | Rectangle | Triangle;

function getArea(shape: Shape): number {
  // Discriminant-based narrowing (preferred)
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default:
      return assertNever(shape);
  }
}

// `in` operator narrowing (when no discriminant is available)
type Bird = { fly(): void; layEggs(): void };
type Fish = { swim(): void; layEggs(): void };

function move(animal: Bird | Fish): void {
  if ("fly" in animal) {
    animal.fly(); // TypeScript knows: animal is Bird
  } else {
    animal.swim(); // TypeScript knows: animal is Fish
  }
}
```

---

### Declaration Merging & Module Augmentation

**Choose these for:** extending third-party types, adding custom properties to Express `Request`, global type extensions

```typescript
// ── Interface Declaration Merging ─────────────────────────────────────────────
// TypeScript merges multiple declarations of the same interface name.

// Original interface (e.g., from a library)
interface Window {
  title: string;
}

// Your augmentation — adds to the existing Window interface
interface Window {
  analytics?: {
    track(event: string, properties?: Record<string, unknown>): void;
  };
  featureFlags: Record<string, boolean>;
}

// Now Window has all three properties.

// ── Module Augmentation ───────────────────────────────────────────────────────
// Extend types from external modules without modifying their source.

// Augmenting Express Request (example: adding authenticated user)
// File: src/types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "admin" | "user";
      };
      requestId?: string;
    }
  }
}

// Now in your Express route handlers:
// req.user?.id and req.requestId are fully typed.

// ── Global Augmentation ────────────────────────────────────────────────────────

// Add global variables that are injected at runtime (e.g., by webpack DefinePlugin)
declare global {
  const __APP_VERSION__: string;
  const __DEV__: boolean;
  const __BUILD_TIMESTAMP__: number;
}

// ── Extending Existing Module Types ───────────────────────────────────────────

// Augment a specific module's types
// File: src/types/some-library.d.ts
declare module "some-library" {
  interface SomeLibraryConfig {
    // Add a property that the library doesn't declare but your code needs
    customTimeout?: number;
    onError?: (error: Error) => void;
  }
}

// ── Declaration Files (.d.ts) for Plain JS Modules ────────────────────────────

// When a library has no types at all, write a minimal declaration:
// File: src/types/untyped-module.d.ts

declare module "untyped-module" {
  export interface Options {
    apiKey: string;
    timeout?: number;
  }

  export function initialize(options: Options): void;
  export function query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  const untyped: {
    initialize: typeof initialize;
    query: typeof query;
  };

  export default untyped;
}

// ── Namespace Merging ──────────────────────────────────────────────────────────

// Add static methods to a class via namespace merging
class Validator {
  constructor(public readonly value: unknown) {}

  isString(): this is Validator & { value: string } {
    return typeof this.value === "string";
  }
}

namespace Validator {
  // Merge a factory method into the Validator namespace
  export function fromEnv(key: string): Validator {
    return new Validator(process.env[key]);
  }
}

const v = Validator.fromEnv("NODE_ENV");
```

---

## Combination Examples

Use this section to identify which menu sections to include for your project type.

### 1. Simple CLI Tool

A command-line script with argument parsing and file I/O.

**Select:**
- Base Setup (required)
- Primitive & Everyday Types
- Variable Declarations & Scoping
- Function Signatures & Overloads
- Utility Types Toolkit (Partial, Required, Record)
- Discriminated Unions & Type Narrowing (for exit codes / result types)

**Skip:** Template Literal Types, Mapped Types, Declaration Merging

**Example shape:**
```typescript
// src/types.ts for a CLI tool
type ExitCode = 0 | 1 | 2;
type LogLevel = "silent" | "info" | "verbose" | "debug";

interface CliOptions {
  input: string;
  output?: string;
  logLevel?: LogLevel;
  dryRun?: boolean;
}

type CliResult =
  | { success: true; outputPath: string }
  | { success: false; error: Error; exitCode: ExitCode };
```

---

### 2. REST API (Node.js / Express / Fastify)

A backend API with request/response typing, middleware, and database models.

**Select:**
- Base Setup (required)
- Object Types & Interfaces (request/response bodies, DB entities)
- Union & Intersection Types (combining base entity with timestamps)
- Generics (generic Repository, ApiResponse wrapper)
- Utility Types Toolkit (Partial for PATCH bodies, Omit for create payloads)
- Discriminated Unions & Type Narrowing (result types, error handling)
- Template Literal Types (route strings, permission strings)
- Declaration Merging & Module Augmentation (Express Request augmentation)

**Example shape:**
```typescript
// src/types.ts for a REST API
interface ApiResponse<T = unknown> {
  data: T;
  meta?: { page: number; total: number };
}

type ApiError = {
  status: "error";
  code: string;
  message: string;
  details?: Record<string, string[]>;
};

type Resource = "user" | "post" | "comment";
type CrudPermission = `${Resource}:${"create" | "read" | "update" | "delete"}`;
```

---

### 3. React Component Library

A set of reusable UI components with typed props.

**Select:**
- Base Setup (required)
- Primitive & Everyday Types
- Object Types & Interfaces (component props interfaces)
- Union & Intersection Types (variant props, composed prop types)
- Literal Types & Const Assertions (variant/size/color options)
- Generics (generic List, Select, Table components)
- Utility Types Toolkit (Partial for optional props, Omit to exclude HTML attrs)
- Template Literal Types (className generation, CSS custom property names)
- Function Signatures & Overloads (event handler types, render props)

**Example shape:**
```typescript
// src/types.ts for a component library
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

type CSSCustomProperty = `--${string}`;
```

---

### 4. State Machine / Domain Model

A business logic layer with complex state transitions and domain entities.

**Select:**
- Base Setup (required)
- Object Types & Interfaces (entity definitions)
- Literal Types & Const Assertions (state/event names)
- Discriminated Unions & Type Narrowing (states, transitions, events)
- Generics (generic state machine, generic event bus)
- Conditional Types (state guards, transition validators)
- Mapped Types (state-to-handler mapping, transition table)
- Keyof & Typeof Operators (dynamic state lookup)

**Example shape:**
```typescript
// src/types.ts for a state machine
type OrderStatus = "draft" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

type OrderEvent =
  | { type: "SUBMIT"; payload: { customerId: string } }
  | { type: "CONFIRM"; payload: { confirmedBy: string } }
  | { type: "SHIP"; payload: { trackingNumber: string } }
  | { type: "DELIVER"; payload: { deliveredAt: Date } }
  | { type: "CANCEL"; payload: { reason: string } };

type OrderTransitions = {
  [S in OrderStatus]: Partial<Record<OrderEvent["type"], OrderStatus>>;
};
```

---

### 5. npm Utility Package

A published library with a public API surface, no runtime, type-only exports.

**Select:**
- Base Setup (required)
- Object Types & Interfaces (public API types)
- Generics (generic utilities)
- Conditional Types (utility type helpers)
- Mapped Types (type transformations)
- Indexed Access Types (extracting sub-types from API shapes)
- Template Literal Types (if string-based APIs)
- Utility Types Toolkit (building on built-ins)
- Function Signatures & Overloads (multiple calling conventions)

**Example shape:**
```typescript
// src/types.ts for a utility library
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
```

---

### 6. Full-Stack App Shared Types

A `packages/shared` or `src/shared/types` package shared between frontend and backend.

**Select:**
- Base Setup (required)
- Object Types & Interfaces (shared domain entities, DTO shapes)
- Union & Intersection Types (combining entity variants)
- Literal Types & Const Assertions (status codes, enum-like constants)
- Generics (generic API wrappers, paginated responses)
- Utility Types Toolkit (Partial for updates, Pick/Omit for view models)
- Template Literal Types (route definitions, event names)
- Indexed Access Types (extracting API types from a central schema)

**Example shape:**
```typescript
// packages/shared/src/types.ts
export interface Paginated<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export type ApiRoutes = {
  "GET /users": { response: Paginated<User> };
  "POST /users": { body: CreateUserDto; response: User };
  "GET /users/:id": { params: { id: string }; response: User };
};

export type CreateUserDto = Omit<User, "id" | "createdAt" | "updatedAt">;
```

---

### 7. Configuration-Heavy Project

A project with complex, nested, validated configuration (e.g., CI system, build tool).

**Select:**
- Base Setup (required)
- Object Types & Interfaces (config object shapes)
- Literal Types & Const Assertions (fixed option sets)
- Generics (generic config defaults merger)
- Keyof & Typeof Operators (deriving types from config objects)
- Indexed Access Types (extracting sub-config types)
- Mapped Types (config override/merge utilities)
- Discriminated Unions & Type Narrowing (different config modes)
- Variable Declarations & Scoping (const assertions for config)

**Example shape:**
```typescript
// src/config/types.ts
const BASE_CONFIG = {
  server: { host: "0.0.0.0", port: 8080, cors: true },
  database: { driver: "postgres", poolSize: 10, ssl: false },
  cache: { driver: "redis", ttl: 300 },
} as const;

type BaseConfig = typeof BASE_CONFIG;
type ServerConfig = BaseConfig["server"];
type DatabaseDriver = BaseConfig["database"]["driver"];
// "postgres"

type EnvOverrides = DeepPartial<{
  [K in keyof BaseConfig]: {
    [P in keyof BaseConfig[K]]: unknown;
  };
}>;
```

---

### 8. Type-Safe Event System

A custom event emitter or pub/sub system with fully typed event maps.

**Select:**
- Base Setup (required)
- Object Types & Interfaces (event payload shapes)
- Generics (generic emitter class)
- Keyof & Typeof Operators (deriving event name unions)
- Mapped Types (event handler map)
- Template Literal Types (namespaced event names like `user:created`)
- Discriminated Unions & Type Narrowing (event dispatcher)
- Conditional Types (extracting payload type from event name)

**Example shape:**
```typescript
// src/events/types.ts
export interface EventMap {
  "user:created": { id: string; email: string };
  "user:deleted": { id: string };
  "order:placed": { orderId: string; total: number };
  "order:shipped": { orderId: string; trackingNumber: string };
}

export type EventName = keyof EventMap;
// "user:created" | "user:deleted" | "order:placed" | "order:shipped"

export type PayloadOf<E extends EventName> = EventMap[E];
// PayloadOf<"user:created"> → { id: string; email: string }

export type EventHandler<E extends EventName> = (payload: PayloadOf<E>) => void | Promise<void>;

export type EventHandlerMap = {
  [E in EventName]?: EventHandler<E>[];
};
```

---

## Applying Your Selection

1. **Create your types file.** For smaller projects, use a single `src/types.ts`. For larger projects, use a `src/types/` directory with one file per domain area (e.g., `src/types/user.ts`, `src/types/api.ts`, `src/types/events.ts`).

2. **Copy your selected sections** from this template into your types file(s).

3. **Adapt all placeholder names** to your domain:
   - Replace `User`, `Task`, `Product`, `Order` with your actual entity names
   - Replace `"admin" | "user"` role literals with your actual roles
   - Replace `"GET" | "POST"` etc. with your actual HTTP methods or command types

4. **Remove the explanatory comments** and alternative examples you didn't select — keep the types clean.

5. **Export types** that need to be shared across modules:
   ```typescript
   // src/types.ts
   export type { User, UserUpdate, UserId } from "./types/user.js";
   export type { ApiResponse, ApiError, Paginated } from "./types/api.js";
   export type { AppEvent, EventMap } from "./types/events.js";
   ```

6. **Use `noEmit` + `tsc` to validate** your types in CI:
   ```bash
   npx tsc --noEmit
   ```

7. **Revisit this menu** as your project evolves — add sections when a new concern is introduced (e.g., add Template Literal Types when you introduce a typed event bus).
