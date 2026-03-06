---
name: typescript-coder
description: 'Expert 10x engineer with extensive knowledge of TypeScript fundamentals, migration strategies, and best practices. Use when asked to "add TypeScript", "migrate to TypeScript", "add type checking", "create TypeScript config", "fix TypeScript errors", or work with .ts/.tsx files. Supports JavaScript to TypeScript migration, JSDoc type annotations, tsconfig.json configuration, and type-safe code patterns.'
---

# TypeScript Coder Skill

Master TypeScript development with expert-level knowledge of type systems, migration strategies, and modern JavaScript/TypeScript patterns. This skill transforms you into a 10x engineer capable of writing type-safe, maintainable code and migrating existing JavaScript projects to TypeScript with confidence.

## When to Use This Skill

- User asks to "add TypeScript", "migrate to TypeScript", or "convert to TypeScript"
- Need to "add type checking" or "fix TypeScript errors" in a project
- Creating or configuring `tsconfig.json` for a project
- Working with `.ts`, `.tsx`, `.mts`, or `.d.ts` files
- Adding JSDoc type annotations to JavaScript files
- Debugging type errors or improving type safety
- Setting up TypeScript in a Node.js, React, or other JavaScript project
- Creating type definitions or ambient declarations
- Implementing advanced TypeScript patterns (generics, conditional types, mapped types)

## Prerequisites

- Basic understanding of JavaScript (ES6+)
- Node.js and npm/yarn installed (for TypeScript compilation)
- Familiarity with the project structure and build tools
- Access to the `typescript` package (can be installed if needed)

## Shorthand Keywords

Keywords to trigger this skill as if using a command-line tool:

```javascript
openPrompt = ["typescript-coder", "ts-coder"]
```

Use these shorthand commands to quickly invoke TypeScript expertise without lengthy explanations. For example: 

- `typescript-coder --check "this code"`
- `typescript-coder check this type guard`
- `ts-coder migrate this file`
- `ts-coder --migrate project-to-typescript`

## Role and Expertise

As a TypeScript expert, you operate with:

- **Deep Type System Knowledge**: Understanding of TypeScript's structural type system, generics, and advanced types
- **Migration Expertise**: Proven strategies for incremental JavaScript to TypeScript migration
- **Best Practices**: Knowledge of TypeScript patterns, conventions, and anti-patterns
- **Tooling Mastery**: Configuration of TypeScript compiler, build tools, and IDE integration
- **Problem Solving**: Ability to resolve complex type errors and design type-safe architectures

## Core TypeScript Concepts

### The TypeScript Type System

TypeScript uses **structural typing** (duck typing) rather than nominal typing:

```typescript
interface Point {
  x: number;
  y: number;
}

// This works because the object has the right structure
const point: Point = { x: 10, y: 20 };

// This also works - structural compatibility
const point3D = { x: 1, y: 2, z: 3 };
const point2D: Point = point3D;  // OK - has x and y
```

### Type Inference

TypeScript infers types when possible, reducing boilerplate:

```typescript
// Type inferred as string
const message = "Hello, TypeScript!";

// Type inferred as number
const count = 42;

// Type inferred as string[]
const names = ["Alice", "Bob", "Charlie"];

// Return type inferred as number
function add(a: number, b: number) {
  return a + b;  // Returns number
}
```

### Key TypeScript Features

| Feature | Purpose | When to Use |
|---------|---------|-------------|
| **Interfaces** | Define object shapes | Defining data structures, API contracts |
| **Type Aliases** | Create custom types | Union types, complex types, type utilities |
| **Generics** | Type-safe reusable components | Functions/classes that work with multiple types |
| **Enums** | Named constants | Fixed set of related values |
| **Type Guards** | Runtime type checking | Narrowing union types safely |
| **Utility Types** | Transform types | `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, etc. |

## Step-by-Step Workflows

### Task 1: Install and Configure TypeScript

For a new or existing JavaScript project:

1. **Install TypeScript as a dev dependency**:
   ```bash
   npm install --save-dev typescript
   ```

2. **Install type definitions for Node.js** (if using Node.js):
   ```bash
   npm install --save-dev @types/node
   ```

3. **Initialize TypeScript configuration**:
   ```bash
   npx tsc --init
   ```

4. **Configure `tsconfig.json`** for your project:
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
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

5. **Add build script to `package.json`**:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch",
       "check": "tsc --noEmit"
     }
   }
   ```

### Task 2: Migrate JavaScript to TypeScript (Incremental Approach)

Safe, incremental migration strategy:

1. **Enable TypeScript to process JavaScript files**:
   ```json
   {
     "compilerOptions": {
       "allowJs": true,
       "checkJs": false,
       "noEmit": true
     }
   }
   ```

2. **Add JSDoc type annotations to JavaScript files** (optional intermediate step):
   ```javascript
   // @ts-check

   /**
    * Calculates the sum of two numbers
    * @param {number} a - First number
    * @param {number} b - Second number
    * @returns {number} The sum
    */
   function add(a, b) {
     return a + b;
   }

   /** @type {string[]} */
   const names = ["Alice", "Bob"];

   /** @typedef {{ id: number, name: string, email?: string }} User */

   /** @type {User} */
   const user = {
     id: 1,
     name: "Alice"
   };
   ```

3. **Rename files incrementally** from `.js` to `.ts`:
   ```bash
   # Start with utility files and leaf modules
   mv src/utils/helpers.js src/utils/helpers.ts
   ```

4. **Fix TypeScript errors in converted files**:
   - Add explicit type annotations where inference fails
   - Define interfaces for complex objects
   - Handle `any` types appropriately
   - Add type guards for runtime checks

5. **Gradually convert remaining files**:
   - Start with utilities and shared modules
   - Move to leaf components (no dependencies)
   - Finally convert orchestration/entry files

6. **Enable strict mode progressively**:
   ```json
   {
     "compilerOptions": {
       "strict": false,
       "noImplicitAny": true,
       "strictNullChecks": true
       // Enable other strict flags one at a time
     }
   }
   ```

### Task 3: Define Types and Interfaces

Creating robust type definitions:

1. **Define interfaces for data structures**:
   ```typescript
   // User data model
   interface User {
     id: number;
     name: string;
     email: string;
     age?: number;  // Optional property
     readonly createdAt: Date;  // Read-only property
   }

   // API response structure
   interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
     };
   }
   ```

2. **Use type aliases for complex types**:
   ```typescript
   // Union type
   type Status = 'pending' | 'active' | 'completed' | 'failed';

   // Intersection type
   type Employee = User & {
     employeeId: string;
     department: string;
     salary: number;
   };

   // Function type
   type TransformFn<T, U> = (input: T) => U;

   // Conditional type
   type NonNullable<T> = T extends null | undefined ? never : T;
   ```

3. **Create type definitions in `.d.ts` files** for external modules:
   ```typescript
   // types/custom-module.d.ts
   declare module 'custom-module' {
     export interface Config {
       apiKey: string;
       timeout?: number;
     }

     export function initialize(config: Config): Promise<void>;
     export function fetchData<T>(endpoint: string): Promise<T>;
   }
   ```

### Task 4: Work with Generics

Type-safe reusable components:

1. **Generic functions**:
   ```typescript
   // Basic generic function
   function identity<T>(value: T): T {
     return value;
   }

   const num = identity(42);        // Type: number
   const str = identity("hello");   // Type: string

   // Generic with constraints
   function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
     return obj[key];
   }

   const user = { name: "Alice", age: 30 };
   const name = getProperty(user, "name");  // Type: string
   const age = getProperty(user, "age");    // Type: number
   ```

2. **Generic classes**:
   ```typescript
   class DataStore<T> {
     private items: T[] = [];

     add(item: T): void {
       this.items.push(item);
     }

     get(index: number): T | undefined {
       return this.items[index];
     }

     filter(predicate: (item: T) => boolean): T[] {
       return this.items.filter(predicate);
     }
   }

   const numberStore = new DataStore<number>();
   numberStore.add(42);

   const userStore = new DataStore<User>();
   userStore.add({ id: 1, name: "Alice", email: "alice@example.com" });
   ```

3. **Generic interfaces**:
   ```typescript
   interface Repository<T> {
     findById(id: string): Promise<T | null>;
     findAll(): Promise<T[]>;
     create(item: Omit<T, 'id'>): Promise<T>;
     update(id: string, item: Partial<T>): Promise<T>;
     delete(id: string): Promise<boolean>;
   }

   class UserRepository implements Repository<User> {
     async findById(id: string): Promise<User | null> {
       // Implementation
       return null;
     }
     // ... other methods
   }
   ```

### Task 5: Handle Type Errors

Common type errors and solutions:

1. **"Property does not exist" errors**:
   ```typescript
   // ❌ Error: Property 'name' does not exist on type '{}'
   const user = {};
   user.name = "Alice";

   // ✅ Solution 1: Define interface
   interface User {
     name: string;
   }
   const user: User = { name: "Alice" };

   // ✅ Solution 2: Type assertion (use cautiously)
   const user = {} as User;
   user.name = "Alice";

   // ✅ Solution 3: Index signature
   interface DynamicObject {
     [key: string]: any;
   }
   const user: DynamicObject = {};
   user.name = "Alice";
   ```

2. **"Cannot find name" errors**:
   ```typescript
   // ❌ Error: Cannot find name 'process'
   const env = process.env.NODE_ENV;

   // ✅ Solution: Install type definitions
   // npm install --save-dev @types/node
   const env = process.env.NODE_ENV;  // Now works
   ```

3. **`any` type issues**:
   ```typescript
   // ❌ Implicit any (with noImplicitAny: true)
   function process(data) {
     return data.value;
   }

   // ✅ Solution: Add explicit types
   function process(data: { value: number }): number {
     return data.value;
   }

   // ✅ Or use generic
   function process<T>(data: T): T {
     return data;
   }
   ```

4. **Union type narrowing**:
   ```typescript
   function processValue(value: string | number) {
     // ❌ Error: Property 'toUpperCase' does not exist on type 'string | number'
     return value.toUpperCase();

     // ✅ Solution: Type guard
     if (typeof value === "string") {
       return value.toUpperCase();  // TypeScript knows it's string here
     }
     return value.toString();
   }
   ```

### Task 6: Configure for Specific Environments

Environment-specific configurations:

#### Node.js Project

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "types": ["node"],
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

#### React Project

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "esnext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

#### Library/Package

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "esnext",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## TypeScript Best Practices

### Do's

- ✅ **Enable strict mode** (`"strict": true`) for maximum type safety
- ✅ **Use type inference** - let TypeScript infer types when it's obvious
- ✅ **Prefer interfaces over type aliases** for object shapes (better error messages)
- ✅ **Use `unknown` instead of `any`** - forces type checking before use
- ✅ **Create utility types** for common transformations
- ✅ **Use const assertions** (`as const`) for literal types
- ✅ **Leverage type guards** for runtime type checking
- ✅ **Document complex types** with JSDoc comments
- ✅ **Use discriminated unions** for type-safe state management
- ✅ **Keep types DRY** - extract and reuse type definitions

### Don'ts

- ❌ **Don't use `any` everywhere** - defeats the purpose of TypeScript
- ❌ **Don't ignore TypeScript errors** with `@ts-ignore` without good reason
- ❌ **Don't over-complicate types** - balance safety with readability
- ❌ **Don't use type assertions excessively** - indicates design issues
- ❌ **Don't duplicate type definitions** - use shared types
- ❌ **Don't forget null/undefined checks** - enable `strictNullChecks`
- ❌ **Don't use enums for everything** - consider union types instead
- ❌ **Don't skip type definitions for external libraries** - install `@types/*`
- ❌ **Don't disable strict flags without justification**
- ❌ **Don't mix JavaScript and TypeScript in production** - complete the migration

## Common Patterns

### Pattern 1: Discriminated Unions

Type-safe state management:

```typescript
type LoadingState = { status: 'loading' };
type SuccessState<T> = { status: 'success'; data: T };
type ErrorState = { status: 'error'; error: Error };

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

function handleState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'loading':
      console.log('Loading...');
      break;
    case 'success':
      console.log('Data:', state.data);  // TypeScript knows state.data exists
      break;
    case 'error':
      console.log('Error:', state.error.message);  // TypeScript knows state.error exists
      break;
  }
}
```

### Pattern 2: Builder Pattern

Type-safe fluent API:

```typescript
class QueryBuilder<T> {
  private filters: Array<(item: T) => boolean> = [];
  private sortFn?: (a: T, b: T) => number;
  private limitCount?: number;

  where(predicate: (item: T) => boolean): this {
    this.filters.push(predicate);
    return this;
  }

  sortBy(compareFn: (a: T, b: T) => number): this {
    this.sortFn = compareFn;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  execute(data: T[]): T[] {
    let result = data.filter(item =>
      this.filters.every(filter => filter(item))
    );

    if (this.sortFn) {
      result = result.sort(this.sortFn);
    }

    if (this.limitCount) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }
}

// Usage
const users = [/* ... */];
const result = new QueryBuilder<User>()
  .where(u => u.age > 18)
  .where(u => u.email.includes('@example.com'))
  .sortBy((a, b) => a.name.localeCompare(b.name))
  .limit(10)
  .execute(users);
```

### Pattern 3: Type-Safe Event Emitter

```typescript
type EventMap = {
  'user:created': { id: string; name: string };
  'user:updated': { id: string; changes: Partial<User> };
  'user:deleted': { id: string };
};

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Array<(data: T[K]) => void> } = {};

  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }
}

// Usage with type safety
const emitter = new TypedEventEmitter<EventMap>();

emitter.on('user:created', (data) => {
  console.log(data.id, data.name);  // TypeScript knows the shape
});

emitter.emit('user:created', { id: '123', name: 'Alice' });  // Type-checked
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **Module not found** | Missing type definitions | Install `@types/[package-name]` or add `declare module` |
| **Implicit any errors** | `noImplicitAny` enabled | Add explicit type annotations |
| **Cannot find global types** | Missing lib in `compilerOptions` | Add to `lib`: `["ES2020", "DOM"]` |
| **Type errors in node_modules** | Third-party library types | Add `skipLibCheck: true` to `tsconfig.json` |
| **Import errors with .ts extension** | Import resolving issues | Use imports without extensions |
| **Build takes too long** | Compiling too many files | Use `incremental: true` and `tsBuildInfoFile` |
| **Type inference not working** | Complex inferred types | Add explicit type annotations |
| **Circular dependency errors** | Import cycles | Refactor to break cycles, use interfaces |

## Advanced TypeScript Features

### Mapped Types

Transform existing types:

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Usage
interface User {
  id: number;
  name: string;
  email: string;
}

type ReadonlyUser = Readonly<User>;  // All properties readonly
type PartialUser = Partial<User>;    // All properties optional
type UserNameEmail = Pick<User, 'name' | 'email'>;  // Only name and email
```

### Conditional Types

Types that depend on conditions:

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false

// Practical example: Extract function return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: 1, name: "Alice" };
}

type User = ReturnType<typeof getUser>;  // { id: number; name: string }
```

### Template Literal Types

String manipulation at type level:

```typescript
type Greeting<T extends string> = `Hello, ${T}!`;

type WelcomeMessage = Greeting<"World">;  // "Hello, World!"

// Practical: Create event names
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<"click">;  // "onClick"
type HoverEvent = EventName<"hover">;  // "onHover"
```

## TypeScript Configuration Reference

### Key `tsconfig.json` Options

| Option | Purpose | Recommended |
|--------|---------|-------------|
| `strict` | Enable all strict type checking | `true` |
| `target` | ECMAScript target version | `ES2020` or higher |
| `module` | Module system | `commonjs` (Node) or `esnext` (bundlers) |
| `lib` | Include type definitions | `["ES2020"]` + `DOM` if browser |
| `outDir` | Output directory | `./dist` |
| `rootDir` | Root source directory | `./src` |
| `sourceMap` | Generate source maps | `true` for debugging |
| `declaration` | Generate .d.ts files | `true` for libraries |
| `esModuleInterop` | Enable interop between CommonJS and ES modules | `true` |
| `skipLibCheck` | Skip type checking of .d.ts files | `true` for performance |
| `forceConsistentCasingInFileNames` | Enforce consistent file casing | `true` |
| `resolveJsonModule` | Allow importing JSON files | `true` if needed |
| `allowJs` | Allow JavaScript files | `true` during migration |
| `checkJs` | Type check JavaScript files | `false` during migration |
| `noEmit` | Don't emit files (use external bundler) | `true` with bundlers |
| `incremental` | Enable incremental compilation | `true` for faster builds |

## Migration Checklist

When migrating a JavaScript project to TypeScript:

### Phase 1: Setup

- [ ] Install TypeScript and @types packages
- [ ] Create `tsconfig.json` with permissive settings
- [ ] Configure build scripts
- [ ] Set up IDE/editor TypeScript support

### Phase 2: Incremental Migration

- [ ] Enable `allowJs: true` and `checkJs: false`
- [ ] Rename utility files to `.ts`
- [ ] Add type annotations to function signatures
- [ ] Create interfaces for data structures
- [ ] Fix TypeScript errors in converted files

### Phase 3: Strengthen Types

- [ ] Enable `noImplicitAny: true`
- [ ] Enable `strictNullChecks: true`
- [ ] Remove `any` types where possible
- [ ] Add type guards for union types
- [ ] Create type definitions for external modules

### Phase 4: Full Strict Mode

- [ ] Enable `strict: true`
- [ ] Fix all remaining type errors
- [ ] Remove JSDoc annotations (now redundant)
- [ ] Optimize type definitions
- [ ] Document complex types

### Phase 5: Maintenance

- [ ] Set up pre-commit type checking
- [ ] Configure CI/CD type checking
- [ ] Establish code review standards for types
- [ ] Keep TypeScript and @types packages updated

## References

This skill includes bundled reference documentation in the `references/` directory:

- **[typescript-basics.md](references/typescript-basics.md)** - TypeScript fundamentals, simple types, type inference, and special types
- **[typescript-cheatsheet.md](references/typescript-cheatsheet.md)** - Quick reference for control flow, classes, interfaces, types, and common patterns
- **[typescript-classes.md](references/typescript-classes.md)** - Class syntax, inheritance, generics, and utility types
- **[typescript-elements.md](references/typescript-elements.md)** - Arrays, tuples, objects, enums, functions, and casting
- **[typescript-handbook.md](references/typescript-handbook.md)** - Comprehensive handbook covering core concepts from official TypeScript documentation
- **[typescript-keywords.md](references/typescript-keywords.md)** - keyof, null handling, optional chaining, and template literal types
- **[typescript-miscellaneous.md](references/typescript-miscellaneous.md)** - Async programming, promises, decorators, and JSDoc integration
- **[typescript-projects.md](references/typescript-projects.md)** - Project configuration, Node.js setup, Express integration, React TypeScript
- **[typescript-types.md](references/typescript-types.md)** - Advanced types, conditional types, mapped types, type guards, and recursive types

### External Resources

- [TypeScript Official Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [TypeScript Playground](https://www.typescriptlang.org/play) - Test TypeScript code online

## Summary

The TypeScript Coder skill empowers you to write type-safe, maintainable code with expert-level TypeScript knowledge. Whether migrating existing JavaScript projects or starting new TypeScript projects, apply these proven patterns, workflows, and best practices to deliver production-quality code with confidence.

**Remember**: TypeScript is a tool for developer productivity and code quality. Use it to catch errors early, improve code documentation, and enable better tooling—but don't let perfect types prevent shipping working code.
