# TypeScript Miscellaneous

## TypeScript Async Programming

- Reference [Async Programming](https://www.w3schools.com/typescript/typescript_async.php)

### Promises in TypeScript

```ts
// Create a typed Promise that resolves to a string
const fetchGreeting = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = Math.random() > 0.5;
      if (success) {
        resolve("Hello, TypeScript!");
      } else {
        reject(new Error("Failed to fetch greeting"));
      }
    }, 1000);
  });
};

// Using the Promise with proper type inference
fetchGreeting()
  .then((greeting) => {
    // TypeScript knows 'greeting' is a string
    console.log(greeting.toUpperCase());
  })
  .catch((error: Error) => {
    console.error("Error:", error.message);
  });
```

### Async/Await with TypeScript

```ts
// Define types for our API response
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

// Function that returns a Promise of User array
async function fetchUsers(): Promise<User[]> {
  console.log('Fetching users...');
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  return [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' }
  ];
}

// Async function to process users
async function processUsers() {
  try {
    // TypeScript knows users is User[]
    const users = await fetchUsers();
    console.log(`Fetched ${users.length} users`);

    // Type-safe property access
    const adminEmails = users
      .filter(user => user.role === 'admin')
      .map(user => user.email);

    console.log('Admin emails:', adminEmails);
    return users;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to process users:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    throw error; // Re-throw to let caller handle
  }
}

// Execute the async function
processUsers()
  .then(users => console.log('Processing complete'))
  .catch(err => console.error('Processing failed:', err));
```

### Run multiple async operations in parallel

```ts
interface Product {
  id: number;
  name: string;
  price: number;
}

async function fetchProduct(id: number): Promise<Product> {
  console.log(`Fetching product ${id}...`);
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  return { id, name: `Product ${id}`, price: Math.floor(Math.random() * 100) };
}

async function fetchMultipleProducts() {
  try {
    // Start all fetches in parallel
    const [product1, product2, product3] = await Promise.all([
      fetchProduct(1),
      fetchProduct(2),
      fetchProduct(3)
    ]);

    const total = [product1, product2, product3]
      .reduce((sum, product) => sum + product.price, 0);
    console.log(`Total price: $${total.toFixed(2)}`);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

fetchMultipleProducts();
```

### Typing Callbacks for Async Operations

```ts
// Define a type for the callback
type FetchCallback = (error: Error | null, data?: string) => void;

// Function that takes a typed callback
function fetchDataWithCallback(url: string, callback: FetchCallback): void {
  // Simulate async operation
  setTimeout(() => {
    try {
      // Simulate successful response
      callback(null, "Response data");
    } catch (error) {
      callback(error instanceof Error ? error : new Error('Unknown error'));
    }
  }, 1000);
}

// Using the callback function
fetchDataWithCallback('https://api.example.com', (error, data) => {
  if (error) {
    console.error('Error:', error.message);
    return;
  }

  // TypeScript knows data is a string (or undefined)
  if (data) {
    console.log(data.toUpperCase());
  }
});
```

### Promise.all - Run multiple promises in parallel

```ts
// Different types of promises
const fetchUser = (id: number): Promise<{ id: number; name: string }> =>
  Promise.resolve({ id, name: `User ${id}` });

const fetchPosts = (userId: number): Promise<Array<{ id: number; title: string }>> =>
  Promise.resolve([
    { id: 1, title: 'Post 1' },
    { id: 2, title: 'Post 2' }
  ]);

const fetchStats = (userId: number): Promise<{ views: number; likes: number }> =>
  Promise.resolve({ views: 100, likes: 25 });

// Run all in parallel
async function loadUserDashboard(userId: number) {
  try {
    const [user, posts, stats] = await Promise.all([
      fetchUser(userId),
      fetchPosts(userId),
      fetchStats(userId)
    ]);

    // TypeScript knows the types of user, posts, and stats
    console.log(`User: ${user.name}`);
    console.log(`Posts: ${posts.length}`);
    console.log(`Likes: ${stats.likes}`);

    return { user, posts, stats };
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    throw error;
  }
}

// Execute with a user ID
loadUserDashboard(1);
```

### Promise.race - Useful for timeouts

```ts
// Helper function for timeout
const timeout = (ms: number): Promise<never> =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );

// Simulate API call with timeout
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  return Promise.race([
    promise,
    timeout(timeoutMs).then(() => {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }),
  ]);
}

// Usage example
async function fetchUserData() {
  try {
    const response = await fetchWithTimeout(
      fetch('https://api.example.com/user/1'),
      3000 // 3 second timeout
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', (error as Error).message);
    throw error;
  }
}
```

### Promise.allSettled - Wait for all promises regardless of outcome

```ts
// Simulate multiple API calls with different outcomes
const fetchData = async (id: number) => {
  // Randomly fail some requests
  if (Math.random() > 0.7) {
    throw new Error(`Failed to fetch data for ID ${id}`);
  }
  return { id, data: `Data for ${id}` };
};

// Process multiple items with individual error handling
async function processBatch(ids: number[]) {
  const promises = ids.map(id =>
    fetchData(id)
      .then(value => ({ status: 'fulfilled' as const, value }))
      .catch(reason => ({ status: 'rejected' as const, reason }))
  );

  // Wait for all to complete
  const results = await Promise.allSettled(promises);

  // Process results
  const successful = results
    .filter((result): result is PromiseFulfilledResult<{
     status: 'fulfilled', value: any }> =>
      result.status === 'fulfilled' &&
      result.value.status === 'fulfilled'
    )
    .map(r => r.value.value);

  const failed = results
    .filter((result): result is PromiseRejectedResult |
      PromiseFulfilledResult<{ status: 'rejected', reason: any }> => {
      if (result.status === 'rejected') return true;
      return result.value.status === 'rejected';
    });

  console.log(`Successfully processed: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  return { successful, failed };
}

// Process a batch of IDs
processBatch([1, 2, 3, 4, 5]);
```

### Custom Error Classes for Async Operations

```ts
// Base error class for our application
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Specific error types
class NetworkError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', details);
  }
}

class ValidationError extends AppError {
  constructor(
    public readonly field: string,
    message: string
  ) {
    super(message, 'VALIDATION_ERROR', { field });
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super(
      `${resource} with ID ${id} not found`,
      'NOT_FOUND',
      { resource, id }
    );
  }
}

// Usage example
async function fetchUserData(userId: string):
Promise<{ id: string; name: string }> {
  try {
    // Simulate API call
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError('User', userId);
       } else if (response.status >= 500) {
        throw new NetworkError('Server error', { status: response.status });
       } else {
        throw new Error(`HTTP error! status: ${response.status}`);
       }
    }

    const data = await response.json();

    // Validate response data
    if (!data.name) {
      throw new ValidationError('name', 'Name is required');
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) {
      // Already one of our custom errors
      throw error;
    }
    // Wrap unexpected errors
    throw new AppError(
      'Failed to fetch user data',
      'UNEXPECTED_ERROR',
      { cause: error }
    );
  }
}

// Error handling in the application
async function displayUserProfile(userId: string) {
  try {
    const user = await fetchUserData(userId);
    console.log('User profile:', user);
  } catch (error) {
    if (error instanceof NetworkError) {
      console.error('Network issue:', error.message);
      // Show retry UI
    } else if (error instanceof ValidationError) {
      console.error('Validation failed:', error.message);
      // Highlight the invalid field
    } else if (error instanceof NotFoundError) {
      console.error('Not found:', error.message);
      // Show 404 page
    } else {
      console.error('Unexpected error:', error);
      // Show generic error message
    }
  }
}

// Execute with example data
displayUserProfile('123');
```

### Async Generators

```ts
// Async generator function
async function* generateNumbers(): AsyncGenerator<number, void, unknown> {
  let i = 0;
  while (i < 5) {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    yield i++;
  }
}

// Using the async generator
async function consumeNumbers() {
  for await (const num of generateNumbers()) {
    // TypeScript knows num is a number
    console.log(num * 2);
  }
}
```

## TypeScript Decorators

- Reference [Decorators](https://www.w3schools.com/typescript/typescript_decorators.php)

### Enabling Decorators

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*.ts"]
}
```

### Class Decorators

```ts
// A simple class decorator that logs class definition
function logClass(constructor: Function) {
  console.log(`Class ${constructor.name} was defined at ${new Date().toISOString()}`);
}

// Applying the decorator
@logClass
class UserService {
  getUsers() {
    return ['Alice', 'Bob', 'Charlie'];
  }
}

// Output when the file is loaded: "Class UserService was defined at [timestamp]"
```

### Class Decorators - Adding Properties and Methods

```ts
// A decorator that adds a version property and logs instantiation
function versioned(version: string) {
  return function (constructor: Function) {
    // Add a static property
    constructor.prototype.version = version;

    // Store the original constructor
    const original = constructor;
    // Create a new constructor that wraps the original
    const newConstructor: any = function (...args: any[]) {
      console.log(`Creating instance of ${original.name} v${version}`);
      return new original(...args);
    };

    // Copy prototype so instanceof works
    newConstructor.prototype = original.prototype;
    return newConstructor;
  };
}

// Applying the decorator with a version
@versioned('1.0.0')
class ApiClient {
  fetchData() {
    console.log('Fetching data...');
  }
}

const client = new ApiClient();
console.log((client as any).version); // Outputs: 1.0.0
client.fetchData();
```

### Class Decorators - Sealed Classes

```ts
function sealed(constructor: Function) {
  console.log(`Sealing ${constructor.name}...`);
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class Greeter {
  greeting: string;
  constructor(message: string) {
    this.greeting = message;
  }
  greet() {
    return `Hello, ${this.greeting}`;
  }
}

// This will throw an error in strict mode
// Greeter.prototype.newMethod = function() {};
// Error: Cannot add property newMethod
```

### Method Decorators - Measure Execution Time

```ts
// Method decorator to measure execution time
function measureTime(
 target: any,
 propertyKey: string,
 descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = originalMethod.apply(this, args);
    const end = performance.now();
    console.log(`${propertyKey} executed in ${(end - start).toFixed(2)}ms`);
    return result;
  };
  return descriptor;
}

// Using the decorator
class DataProcessor {
  @measureTime
  processData(data: number[]): number[] {
    // Simulate processing time
    for (let i = 0; i < 100000000; i++) {
      /* processing */
    }
    return data.map(x => x * 2);
  }
}

// When called, it will log the execution time
const processor = new DataProcessor();
processor.processData([1, 2, 3, 4, 5]);
```

### Method Decorators - Role-Based Access Control

```ts
// User roles
type UserRole = 'admin' | 'editor' | 'viewer';

// Current user context (simplified)
const currentUser = {
  id: 1,
  name: 'John Doe',
  roles: ['viewer'] as UserRole[]
};

// Decorator factory for role-based access control
function AllowedRoles(...allowedRoles: UserRole[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const hasPermission = allowedRoles.some(role =>
        currentUser.roles.includes(role)
      );
      if (!hasPermission) {
        throw new Error(
          `User ${currentUser.name} is not authorized to call ${propertyKey}`
        );
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}

// Using the decorator
class DocumentService {
  @AllowedRoles('admin', 'editor')
  deleteDocument(id: string) {
    console.log(`Document ${id} deleted`);
  }

  @AllowedRoles('admin', 'editor', 'viewer')
  viewDocument(id: string) {
    console.log(`Viewing document ${id}`);
  }
}

// Usage
const docService = new DocumentService();
try {
  docService.viewDocument('doc123'); // Works - viewer role is allowed
  docService.deleteDocument('doc123'); // Throws error - viewer cannot delete
} catch (error) {
  console.error(error.message);
}

// Change user role to admin
currentUser.roles = ['admin'];
docService.deleteDocument('doc123'); // Now works - admin can delete
```

### Method Decorators - Deprecation Warning

```ts
function deprecated(message: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      console.warn(`Warning: ${propertyKey} is deprecated. ${message}`);
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}

class PaymentService {
  @deprecated('Use processPaymentV2 instead')
  processPayment(amount: number, currency: string) {
    console.log(`Processing payment of ${amount} ${currency}`);
  }

  processPaymentV2(amount: number, currency: string) {
    console.log(`Processing payment v2 of ${amount} ${currency}`);
  }
}

const payment = new PaymentService();
payment.processPayment(100, 'USD'); // Shows deprecation warning
payment.processPaymentV2(100, 'USD'); // No warning
```

### Property Decorators - Format Properties

```ts
// Property decorator to format a string property
function format(formatString: string) {
  return function (target: any, propertyKey: string) {
    let value: string;
    const getter = () => value;
    const setter = (newVal: string) => {
      value = formatString.replace('{}', newVal);
    };
    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  };
}

class Greeter {
  @format('Hello, {}!')
  greeting: string;
}

const greeter = new Greeter();
greeter.greeting = 'World';
console.log(greeter.greeting); // Outputs: Hello, World!
```

### Property Decorators - Log Property Access

```ts
function logProperty(target: any, propertyKey: string) {
  let value: any;
  const getter = function() {
    console.log(`Getting ${propertyKey}: ${value}`);
    return value;
  };

  const setter = function(newVal: any) {
    console.log(`Setting ${propertyKey} from ${value} to ${newVal}`);
    value = newVal;
  };

  Object.defineProperty(target, propertyKey, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true
  });
}

class Product {
  @logProperty
  name: string;

  @logProperty
  price: number;

  constructor(name: string, price: number) {
    this.name = name;
    this.price = price;
  }
}

const product = new Product('Laptop', 999.99);
product.price = 899.99; // Logs: Setting price from 999.99 to 899.99
console.log(product.name); // Logs: Getting name: Laptop
```

### Property Decorators - Required Properties

```ts
function required(target: any, propertyKey: string) {
  let value: any;

  const getter = function() {
    if (value === undefined) {
      throw new Error(`Property ${propertyKey} is required`);
    }
    return value;
  };

  const setter = function(newVal: any) {
    value = newVal;
  };

  Object.defineProperty(target, propertyKey, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true
  });
}

class User {
  @required
  username: string;

  @required
  email: string;

  age?: number;

  constructor(username: string, email: string) {
    this.username = username;
    this.email = email;
  }
}

const user1 = new User('johndoe', 'john@example.com'); // Works
// const user2 = new User(undefined, 'test@example.com');
// Throws error: Property username is required
```

### Parameter Decorators - Validation

```ts
function validateParam(type: 'string' | 'number' | 'boolean') {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    const existingValidations: any[] =
      Reflect.getOwnMetadata('validations', target, propertyKey) || [];

    existingValidations.push({ index: parameterIndex, type });
    Reflect.defineMetadata(
      'validations', existingValidations, target, propertyKey
    );
  };
}

function validate(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const validations: Array<{index: number, type: string}> =
      Reflect.getOwnMetadata('validations', target, propertyKey) || [];

    for (const validation of validations) {
      const { index, type } = validation;
      const param = args[index];
      let isValid = false;

      switch (type) {
        case 'string':
          isValid = typeof param === 'string' && param.length > 0;
          break;
        case 'number':
          isValid = typeof param === 'number' && !isNaN(param);
          break;
        case 'boolean':
          isValid = typeof param === 'boolean';
      }

      if (!isValid) {
        throw new Error(`Parameter at index ${index} failed ${type} validation`);
      }
    }

    return originalMethod.apply(this, args);
  };
  return descriptor;
}

class UserService {
  @validate
  createUser(
    @validateParam('string') name: string,
    @validateParam('number') age: number,
    @validateParam('boolean') isActive: boolean
  ) {
    console.log(`Creating user: ${name}, ${age}, ${isActive}`);
  }
}

const service = new UserService();
service.createUser('John', 30, true); // Works
// service.createUser('', 30, true);
// Throws error: Parameter at index 0 failed string validation
```

### Decorator Factories - Configurable Logging

```ts
// Decorator factory that accepts configuration
function logWithConfig(config: {
  level: 'log' | 'warn' | 'error',
  message?: string
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const { level = 'log', message = 'Executing method' } = config;

      console[level](`${message}: ${propertyKey}`, { arguments: args });
      const result = originalMethod.apply(this, args);
      console[level](`${propertyKey} completed`);
      return result;
    };
    return descriptor;
  };
}

class PaymentService {
  @logWithConfig({ level: 'log', message: 'Processing payment' })
  processPayment(amount: number) {
    console.log(`Processing payment of $${amount}`);
  }
}
```

### Decorator Evaluation Order

```ts
function first() {
  console.log('first(): factory evaluated');
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log('first(): called');
  };
}

function second() {
  console.log('second(): factory evaluated');
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log('second(): called');
  };
}

class ExampleClass {
  @first()
  @second()
  method() {}
}

// Output:
// second(): factory evaluated
// first(): factory evaluated
// first(): called
// second(): called
```

### Real-World Example - API Controller

```ts
// Simple decorator implementations (simplified for example)
const ROUTES: any[] = [];

function Controller(prefix: string = '') {
  return function (constructor: Function) {
    constructor.prototype.prefix = prefix;
  };
}

function Get(path: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    ROUTES.push({
      method: 'get',
      path,
      handler: descriptor.value,
      target: target.constructor
    });
  };
}

// Using the decorators
@Controller('/users')
class UserController {
  @Get('/')
  getAllUsers() {
    return { users: [{ id: 1, name: 'John' }] };
  }

  @Get('/:id')
  getUserById(id: string) {
    return { id, name: 'John' };
  }
}

// Simulate route registration
function registerRoutes() {
  ROUTES.forEach(route => {
    const prefix = route.target.prototype.prefix || '';
    console.log(`Registered ${route.method.toUpperCase()} ${prefix}${route.path}`);
  });
}

registerRoutes();
// Output:
// Registered GET /users
// Registered GET /users/:id
```

### Common Pitfalls

```ts
function readonly(target: any, propertyKey: string) {
  Object.defineProperty(target, propertyKey, {
    writable: false
  });
}

class Person {
  @readonly
  name = "John";
}
```

```ts
function logParameter(target: any, propertyKey: string, parameterIndex: number) {
  console.log(`Parameter in ${propertyKey} at index ${parameterIndex}`);
}

class Demo {
  greet(@logParameter message: string) {
    return message;
  }
}
```

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## TypeScript in JavaScript Projects (*JSDoc*)

- Reference [JavaScript Projects (*JSDoc*)](https://www.w3schools.com/typescript/typescript_jsdoc.php)

### Getting Started

```ts
// @ts-check

/**
 * Adds two numbers.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function add(a, b) {
  return a + b;
}
```

### Objects and Interfaces

```ts
// @ts-check

/**
 * @param {{ firstName: string, lastName: string, age?: number }} person
 */
function greet(person) {
  return `Hello, ${person.firstName} ${person.lastName}`;
}

greet({ firstName: 'John', lastName: 'Doe' }); // OK
greet({ firstName: 'Jane' });
  // Error: Property 'lastName' is missing
```

### Type Definitions with @typedef

```ts
// @ts-check

/**
 * @typedef {Object} User
 * @property {number} id - The user ID
 * @property {string} username - The username
 * @property {string} [email] - Optional email address
 * @property {('admin'|'user'|'guest')} role - User role
 * @property {() => string} getFullName - Method that returns full name
 */

/** @type {User} */
const currentUser = {
  id: 1,
  username: 'johndoe',
  role: 'admin',
  getFullName() {
    return 'John Doe';
  }
};

// TypeScript will provide autocomplete for User properties
console.log(currentUser.role);
```

### Intersection Types

```ts
// @ts-check

/** @typedef {{ x: number, y: number }} Point */

/**
 * @typedef {Point & { z: number }} Point3D
 */

/** @type {Point3D} */
const point3d = { x: 1, y: 2, z: 3 };

// @ts-expect-error - missing z property
const point2d = { x: 1, y: 2 };
```

### Function Types - Basic

```ts
// @ts-check

/**
 * Calculates the area of a rectangle
 * @param {number} width - The width of the rectangle
 * @param {number} height - The height of the rectangle
 * @returns {number} The calculated area
 */
function calculateArea(width, height) {
  return width * height;
}

// TypeScript knows the parameter and return types
const area = calculateArea(10, 20);
```

### Function Types - Callbacks

```ts
// @ts-check

/**
 * @callback StringProcessor
 * @param {string} input
 * @returns {string}
 */

/**
 * @type {StringProcessor}
 */
const toUpperCase = (str) => str.toUpperCase();

/**
 * @param {string[]} strings
 * @param {StringProcessor} processor
 * @returns {string[]}
 */
function processStrings(strings, processor) {
  return strings.map(processor);
}

const result = processStrings(['hello', 'world'], toUpperCase);
// result will be ['HELLO', 'WORLD']
```

### Function Overloads

```ts
// @ts-check

/**
 * @overload
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
/**
 * @overload
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
/**
 * @param {string | number} a
 * @param {string | number} b
 * @returns {string | number}
 */
function add(a, b) {
  if (typeof a === 'string' || typeof b === 'string') {
    return String(a) + String(b);
  }
  return a + b;
}

const strResult = add('Hello, ', 'World!'); // string
const numResult = add(10, 20);             // number
```

### Advanced Types - Union and Intersection

```ts
// @ts-check

/** @typedef {{ name: string, age: number }} Person */
/** @typedef {Person & { employeeId: string }} Employee */
/** @typedef {Person | { guestId: string, visitDate: Date }} Visitor */

/** @type {Employee} */
const employee = {
  name: 'Alice',
  age: 30,
  employeeId: 'E123'
};

/** @type {Visitor} */
const guest = {
  guestId: 'G456',
  visitDate: new Date()
};

/**
 * @param {Visitor} visitor
 * @returns {string}
 */
function getVisitorId(visitor) {
  if ('guestId' in visitor) {
    return visitor.guestId;  // TypeScript knows this is a guest
  }
  return visitor.name;      // TypeScript knows this is a Person
}
```

### Advanced Types - Mapped Types

```ts
// @ts-check

/**
 * @template T
 * @typedef {[K in keyof T]: T[K] extends Function ? K : never}[keyof T] MethodNames
 */

/**
 * @template T
 * @typedef {{[K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]}} Getters
 */

/** @type {Getters<{ name: string, age: number }>} */
const userGetters = {
  getName: () => 'John',
  getAge: () => 30
};

// TypeScript enforces the return types
const name = userGetters.getName(); // string
const age = userGetters.getAge();   // number
```

### Type Imports

```ts
// @ts-check

// Importing types from TypeScript files
/** @typedef {import('./types').User} User */

// Importing types from node_modules
/** @typedef {import('express').Request} ExpressRequest */

// Importing with renaming
/** @typedef {import('./api').default as ApiClient} ApiClient */
```

### Create a types.d.ts file

```ts
// types.d.ts
declare module 'my-module' {
  export interface Config {
    apiKey: string;
    timeout?: number;
    retries?: number;
  }

  export function initialize(config: Config): void;
  export function fetchData<T = any>(url: string): Promise<T>;
}
```

### Using type imports in JavaScript

```ts
// @ts-check

/** @type {import('my-module').Config} */
const config = {
  apiKey: '12345',
  timeout: 5000
};

// TypeScript will provide autocomplete and type checking
import { initialize } from 'my-module';
initialize(config);
```

### Create a types.d.ts file in your project

```ts
// types.d.ts
declare module 'my-module' {
  export interface Config {
    apiKey: string;
    timeout?: number;
    retries?: number;
  }

  export function initialize(config: Config): void;
  export function fetchData<T = any>(url: string): Promise<T>;
}
```

#### Then use it in your JavaScript files

```ts
// @ts-check

/** @type {import('my-module').Config} */
const config = {
  apiKey: '12345',
  timeout: 5000
};

// TypeScript will provide autocomplete and type checking
import { initialize } from 'my-module';
initialize(config);
```

## TypeScript Migration

- Reference [Migration](https://www.w3schools.com/typescript/typescript_migration.php)

### Create a new branch for the migration

```ts
git checkout -b typescript-migration

# Commit your current state
git add .
git commit -m "Pre-TypeScript migration state"
```

### Configuration

```ts
# Install TypeScript as a dev dependency
npm install --save-dev typescript @types/node
```

### Create a basic tsconfig.json to start with:Configuration

```ts
{
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "outDir": "./dist",
      "rootDir": "./src"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules"]
}
```

> [!Note]
> Adjust the target based on your minimum supported environments.

### Create a basic tsconfig.json with these recommended settings:Step-by-Step Migration

```ts
{
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "outDir": "./dist",
      "rootDir": "./src",
      "allowJs": true,
      "checkJs": true,
      "noEmit": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### Add // @ts-check to the top of your JavaScript files to enable type checking:Step-by-Step Migration

```ts
// @ts-check

/** @type {string} */
const name = 'John';

// TypeScript will catch this error
name = 42;
// Error: Type '42' is not assignable to type 'string'
```

> [!Note]
> You can disable type checking for specific lines using // @ts-ignore.

### Start with non-critical files and rename them from .js to .ts:Step-by-Step Migration

```ts
# Rename a single file
mv src/utils/helpers.js src/utils/helpers.ts

# Or rename all files in a directory (use with caution)
find src/utils -name "*.js" -exec sh -c 'mv "$0" "${0%.js}.ts"' {} \;
```

### Gradually add type annotations to your code:Step-by-Step Migration

```ts
// Before
function add(a, b) {
  return a + b;
}

// After
function add(a: number, b: number): number {
  return a + b;
}

// With interface
interface User {
  id: number;
  name: string;
  email?: string;
}

function getUser(id: number): User {
  return { id, name: 'John Doe' };
}
```

### Modify your package.json to include TypeScript compilation:Step-by-Step Migration

```ts
  {
    "scripts": {
      "build": "tsc",
      "dev": "tsc --watch",
      "test": "jest"
    }
  }
```

> [!Note]
> Make sure to update your test configuration to work with TypeScript files.

### Best Practices for Migration

```ts
  // Use type inference where possible
  const name = 'John';  // TypeScript infers 'string'
  const age = 30;       // TypeScript infers 'number'

  // Use union types for flexibility
  type Status = 'active' | 'inactive' | 'pending';

  // Use type guards for runtime checks
  function isString(value: any): value is string {
    return typeof value === 'string';
  }
```

### Common Challenges and Solutions

```ts
  // Before
  const user = {};
  user.name = 'John';
  // Error: Property 'name' does not exist
```

### Common Challenges and Solutions

```ts
  // Option 1: Index signature
  interface User {
    [key: string]: any;
  }
  const user: User = {};
  user.name = 'John';  // OK

  // Option 2: Type assertion
  const user = {} as { name: string };
  user.name = 'John';  // OK
```

### Common Challenges and Solutions

```ts
  class Counter {
    count = 0;
    increment() {
      setTimeout(function() {
        this.count++;
        // Error: 'this' is not defined
      }, 1000);
    }
  }
```

### Common Challenges and Solutions

```ts
  // Solution 1: Arrow function
  setTimeout(() => {
    this.count++;  // 'this' is lexically scoped
  }, 1000);

  // Solution 2: Bind 'this'
  setTimeout(function(this: Counter) {
    this.count++;
  }.bind(this), 1000);
```

## TypeScript Error Handling

- Reference [Error Handling](https://www.w3schools.com/typescript/typescript_error_handling.php)

### Basic Error Handling

```ts
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

try {
  const result = divide(10, 0);
  console.log(result);
} catch (error) {
  console.error('An error occurred:', error.message);
}
```

### Custom Error Classes

```ts
class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
    // Restore prototype chain
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

class DatabaseError extends Error {
  constructor(message: string, public code: number) {
    super(message);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

// Usage
function validateUser(user: any) {
  if (!user.name) {
    throw new ValidationError('Name is required', 'name');
  }
  if (!user.email.includes('@')) {
    throw new ValidationError('Invalid email format', 'email');
  }
}
```

### Type Guards for Errors

```ts
// Type guards
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, any>).message === 'string'
  );
}

function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

// Usage in catch block
try {
  validateUser({});
} catch (error: unknown) {
  if (isValidationError(error)) {
    console.error(`Validation error in ${error.field}: ${error.message}`);
  } else if (isErrorWithMessage(error)) {
    console.error('An error occurred:', error.message);
  } else {
    console.error('An unknown error occurred');
  }
}
```

### Type Assertion Functions

```ts
function assertIsError(error: unknown): asserts error is Error {
  if (!(error instanceof Error)) {
    throw new Error('Caught value is not an Error instance');
  }
}

try {
  // ...
} catch (error) {
  assertIsError(error);
  console.error(error.message); // TypeScript now knows error is Error
}
```

### Async Error Handling

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

// Using async/await with try/catch
async function fetchUser(userId: number): Promise<User> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as User;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to fetch user:', error.message);
    }
    throw error; // Re-throw to allow caller to handle
  }
}

// Using Promise.catch() for error handling
function fetchUserPosts(userId: number): Promise<any[]> {
  return fetch(`/api/users/${userId}/posts`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('Failed to fetch posts:', error);
      return []; // Return empty array as fallback
    });
}
```

### Always Handle Promise Rejections

```ts
// Bad: Unhandled promise rejection
fetchData().then(data => console.log(data));

// Good: Handle both success and error cases
fetchData()
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));

// Or use void for intentionally ignored errors
void fetchData().catch(console.error);
```

### Error Boundaries in React

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Log to error reporting service
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary fallback={<div>Oops! Something broke.</div>}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### Best Practices - Don't Swallow Errors

```ts
// Bad: Silent failure
try { /* ... */ } catch { /* empty */ }

// Good: At least log the error
try { /* ... */ } catch (error) {
  console.error('Operation failed:', error);
}
```

### Best Practices - Use Custom Error Types

```ts
class NetworkError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Best Practices - Handle Errors at Appropriate Layers

```ts
// In a data access layer
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new NetworkError(response.status, 'Failed to fetch user');
  }
  return response.json();
}

// In a UI component
async function loadUser() {
  try {
    const user = await getUser('123');
    setUser(user);
  } catch (error) {
    if (error instanceof NetworkError) {
      if (error.status === 404) {
        showError('User not found');
      } else {
        showError('Network error. Please try again later.');
      }
    } else {
      showError('An unexpected error occurred');
    }
  }
}
```

## TypeScript Best Practices

- Reference [Best Practices](https://www.w3schools.com/typescript/typescript_best_practices.php)

### Project Configuration - Enable Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    /* Enable all strict type-checking options */
    "strict": true,
    /* Additional recommended settings */
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Project Configuration - Additional Strict Checks

```json
{
  "compilerOptions": {
    /* Additional strict checks */
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Type System - Let TypeScript Infer

```ts
// Bad: Redundant type annotation
const name: string = 'John';

// Good: Let TypeScript infer the type
const name = 'John';

// Bad: Redundant return type
function add(a: number, b: number): number {
  return a + b;
}

// Good: Let TypeScript infer return type
function add(a: number, b: number) {
  return a + b;
}
```

### Type System - Be Explicit with Public APIs

```ts
// Bad: No type information
function processUser(user) {
  return user.name.toUpperCase();
}

// Good: Explicit parameter and return types
interface User {
  id: number;
  name: string;
  email?: string;  // Optional property
}

function processUser(user: User): string {
  return user.name.toUpperCase();
}
```

### Type System - Interface vs Type

```ts
// Use interface for object shapes that can be extended/implemented
interface User {
  id: number;
  name: string;
}

// Extending an interface
interface AdminUser extends User {
  permissions: string[];
}

// Use type for unions, tuples, or mapped types
type UserRole = 'admin' | 'editor' | 'viewer';

// Union types
type UserId = number | string;

// Mapped types
type ReadonlyUser = Readonly<User>;

// Tuple types
type Point = [number, number];
```

### Type System - Prefer Specific Types Over 'any'

```ts
// Bad: Loses type safety
function logValue(value: any) {
  console.log(value.toUpperCase()); // No error until runtime
}

// Better: Use generic type parameter
function logValue<T>(value: T) {
  console.log(String(value)); // Safer, but still not ideal
}

// Best: Be specific about expected types
function logString(value: string) {
  console.log(value.toUpperCase()); // Type-safe
}

// When you need to accept any value but still be type-safe
function logUnknown(value: unknown) {
  if (typeof value === 'string') {
    console.log(value.toUpperCase());
  } else {
    console.log(String(value));
  }
}
```

### Code Organization - Logical Modules

```ts
// user/user.model.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

// user/user.service.ts
import { User } from './user.model';

export class UserService {
  private users: User[] = [];

  addUser(user: User) {
    this.users.push(user);
  }

  getUser(id: string): User | undefined {
    return this.users.find(user => user.id === id);
  }
}

// user/index.ts (barrel file)
export * from './user.model';
export * from './user.service';
```

### Code Organization - File Naming Patterns

```ts
// Good
user.service.ts      // Service classes
user.model.ts        // Type definitions
user.controller.ts   // Controllers
user.component.ts    // Components
user.utils.ts        // Utility functions
user.test.ts         // Test files

// Bad
UserService.ts       // Avoid PascalCase for file names
user_service.ts      // Avoid snake_case
userService.ts       // Avoid camelCase for file names
```

### Functions and Methods - Type-Safe Functions

```ts
// Bad: No type information
function process(user, notify) {
  notify(user.name);
}

// Good: Explicit parameter and return types
function processUser(
  user: User,
  notify: (message: string) => void
): void {
  notify(`Processing user: ${user.name}`);
}

// Use default parameters instead of conditionals
function createUser(
  name: string,
  role: UserRole = 'viewer',
  isActive: boolean = true
): User {
  return { name, role, isActive };
}

// Use rest parameters for variable arguments
function sum(...numbers: number[]): number {
  return numbers.reduce((total, num) => total + num, 0);
}
```

### Functions and Methods - Single Responsibility

```ts
// Bad: Too many responsibilities
function processUserData(userData: any) {
  // Validation
  if (!userData || !userData.name) throw new Error('Invalid user data');

  // Data transformation
  const processedData = {
    ...userData,
    name: userData.name.trim(),
    createdAt: new Date()
  };

  // Side effect
  saveToDatabase(processedData);

  // Notification
  sendNotification(processedData.email, 'Profile updated');

  return processedData;
}

// Better: Split into smaller, focused functions
function validateUserData(data: unknown): UserData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user data');
  }
  return data as UserData;
}

function processUserData(userData: UserData): ProcessedUserData {
  return {
    ...userData,
    name: userData.name.trim(),
    createdAt: new Date()
  };
}
```

### Async/Await Patterns - Proper Error Handling

```ts
// Bad: Not handling errors
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

// Good: Proper error handling
async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as T;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error; // Re-throw to allow caller to handle
  }
}

// Better: Use Promise.all for parallel operations
async function fetchMultipleData<T>(urls: string[]): Promise<T[]> {
  try {
    const promises = urls.map(url => fetchData<T>(url));
    return await Promise.all(promises);
  } catch (error) {
    console.error('One or more requests failed:', error);
    throw error;
  }
}

// Example usage
interface User {
  id: string;
  name: string;
  email: string;
}

// Fetch user data with proper typing
async function getUserData(userId: string): Promise<User> {
  return fetchData<User>(`/api/users/${userId}`);
}
```

### Async/Await Patterns - Flatten Code

```ts
// Bad: Nested async/await (callback hell)
async function processUser(userId: string) {
  const user = await getUser(userId);
  if (user) {
    const orders = await getOrders(user.id);
    if (orders.length > 0) {
      const latestOrder = orders[0];
      const items = await getOrderItems(latestOrder.id);
      return { user, latestOrder, items };
    }
  }
  return null;
}

// Better: Flatten the async/await chain
async function processUser(userId: string) {
  const user = await getUser(userId);
  if (!user) return null;

  const orders = await getOrders(user.id);
  if (orders.length === 0) return { user, latestOrder: null, items: [] };

  const latestOrder = orders[0];
  const items = await getOrderItems(latestOrder.id);

  return { user, latestOrder, items };
}

// Best: Use Promise.all for independent async operations
async function processUser(userId: string) {
  const [user, orders] = await Promise.all([
    getUser(userId),
    getOrders(userId)
  ]);

  if (!user) return null;
  if (orders.length === 0) return { user, latestOrder: null, items: [] };

  const latestOrder = orders[0];
  const items = await getOrderItems(latestOrder.id);

  return { user, latestOrder, items };
}
```

### Testing and Quality - Dependency Injection

```ts
// Bad: Hard to test due to direct dependencies
class PaymentProcessor {
  async processPayment(amount: number) {
    const paymentGateway = new PaymentGateway();
    return paymentGateway.charge(amount);
  }
}

// Better: Use dependency injection
interface PaymentGateway {
  charge(amount: number): Promise<boolean>;
}

class PaymentProcessor {
  constructor(private paymentGateway: PaymentGateway) {}

  async processPayment(amount: number): Promise<boolean> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }
    return this.paymentGateway.charge(amount);
  }
}

// Test example with Jest
describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;
  let mockGateway: jest.Mocked<PaymentGateway>;

  beforeEach(() => {
    mockGateway = {
      charge: jest.fn()
    };
    processor = new PaymentProcessor(mockGateway);
  });

  it('should process a valid payment', async () => {
    mockGateway.charge.mockResolvedValue(true);
    const result = await processor.processPayment(100);
    expect(result).toBe(true);
    expect(mockGateway.charge).toHaveBeenCalledWith(100);
  });

  it('should throw for invalid amount', async () => {
    await expect(processor.processPayment(-50))
      .rejects.toThrow('Amount must be greater than zero');
  });
});
```

### Testing and Quality - Type Testing

```ts
// Using @ts-expect-error to test for type errors
// @ts-expect-error - Should not allow negative values
const invalidUser: User = { id: -1, name: 'Test' };

// Using type assertions in tests
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Not a string');
  }
}

// Using utility types for testing
type IsString<T> = T extends string ? true : false;
type Test1 = IsString<string>;  // true
type Test2 = IsString<number>;  // false

// Using tsd for type testing (install with: npm install --save-dev tsd)
/*
import { expectType } from 'tsd';

const user = { id: 1, name: 'John' };
expectType<{ id: number; name: string }>(user);
expectType<string>(user.name);
*/
```

### Performance - Type-Only Imports

```ts
// Bad: Imports both type and value
import { User, fetchUser } from './api';

// Good: Separate type and value imports
import type { User } from './api';
import { fetchUser } from './api';

// Even better: Use type-only imports when possible
import type { User, UserSettings } from './types';

// Type-only export
export type { User };

// Runtime export
export { fetchUser };

// In tsconfig.json, enable "isolatedModules": true
// to ensure type-only imports are properly handled
```

### Performance - Avoid Complex Types

```ts
// Bad: Deeply nested mapped types can be slow
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Better: Use built-in utility types when possible
type User = {
  id: string;
  profile: {
    name: string;
    email: string;
  };
  preferences?: {
    notifications: boolean;
  };
};

// Instead of DeepPartial<User>, use Partial with type assertions
const updateUser = (updates: Partial<User>) => {
  // Implementation
};

// For complex types, consider using interfaces
interface UserProfile {
  name: string;
  email: string;
}

interface UserPreferences {
  notifications: boolean;
}

interface User {
  id: string;
  profile: UserProfile;
  preferences?: UserPreferences;
}
```

### Performance - Const Assertions

```ts
// Without const assertion (wider type)
const colors = ['red', 'green', 'blue'];
// Type: string[]

// With const assertion (narrower, more precise type)
const colors = ['red', 'green', 'blue'] as const;
// Type: readonly ["red", "green", "blue"]

// Extract union type from const array
type Color = typeof colors[number];  // "red" | "green" | "blue"

// Objects with const assertions
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  features: ['auth', 'notifications'],
} as const;

// Type is:
// {
//   readonly apiUrl: "https://api.example.com";
//   readonly timeout: 5000;
//   readonly features: readonly ["auth", "notifications"];
// }
```

### Common Mistakes - Avoid 'any'

```ts
// Bad: Loses all type safety
function process(data: any) {
  return data.map(item => item.name);
}

// Better: Use generics for type safety
function process<T extends { name: string }>(items: T[]) {
  return items.map(item => item.name);
}

// Best: Use specific types when possible
interface User {
  name: string;
  age: number;
}

function processUsers(users: User[]) {
  return users.map(user => user.name);
}
```

### Common Mistakes - Enable Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    /* Additional strictness flags */
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Common Mistakes - Let TypeScript Infer

```ts
// Redundant type annotation
const name: string = 'John';

// Let TypeScript infer the type
const name = 'John';  // TypeScript knows it's a string

// Redundant return type
function add(a: number, b: number): number {
  return a + b;
}

// Let TypeScript infer the return type
function add(a: number, b: number) {
  return a + b;  // TypeScript infers number
}
```

### Common Mistakes - Use Type Guards

```ts
// Without type guard
function process(input: string | number) {
  return input.toUpperCase();  // Error: toUpperCase doesn't exist on number
}

// With type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function process(input: string | number) {
  if (isString(input)) {
    return input.toUpperCase();  // TypeScript knows input is string here
  } else {
    return input.toFixed(2);  // TypeScript knows input is number here
  }
}

// Built-in type guards
if (typeof value === 'string') { /* value is string */ }
if (value instanceof Date) { /* value is Date */ }
if ('id' in user) { /* user has id property */ }
```

### Common Mistakes - Handle Null/Undefined

```ts
// Bad: Potential runtime error
function getLength(str: string | null) {
  return str.length;  // Error: Object is possibly 'null'
}

// Good: Null check
function getLength(str: string | null) {
  if (str === null) return 0;
  return str.length;
}

// Better: Use optional chaining and nullish coalescing
function getLength(str: string | null) {
  return str?.length ?? 0;
}

// For arrays
const names: string[] | undefined = [];
const count = names?.length ?? 0;  // Safely handle undefined

// For object properties
interface User {
  profile?: {
    name?: string;
  };
}

const user: User = {};
const name = user.profile?.name ?? 'Anonymous';
```
