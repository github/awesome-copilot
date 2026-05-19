# JavaScript & Programming Reference

Comprehensive reference for JavaScript, ECMAScript, programming concepts, and modern JS patterns.

## Core Concepts

### JavaScript
High-level, interpreted programming language that conforms to the ECMAScript specification. Primary language for web development alongside HTML and CSS.

**Key Characteristics**:
- Dynamically typed
- Prototype-based inheritance
- First-class functions
- Event-driven
- Asynchronous execution

### ECMAScript
The standardized specification that JavaScript implements.

**Major Versions**:
- **ES5** (2009): Strict mode, JSON support
- **ES6/ES2015**: Classes, arrow functions, promises, modules
- **ES2016+**: Async/await, optional chaining, nullish coalescing

## Data Types

### Primitive Types

```javascript
// String
let name = "John";
let greeting = 'Hello';
let template = `Hello, ${name}!`; // Template literal

// Number
let integer = 42;
let float = 3.14;
let negative = -10;
let scientific = 1e6; // 1000000

// BigInt (for very large integers)
let big = 9007199254740991n;

// Boolean
let isTrue = true;
let isFalse = false;

// Undefined (declared but not assigned)
let undefined_var;
console.log(undefined_var); // undefined

// Null (intentional absence of value)
let empty = null;

// Symbol (unique identifier)
let sym = Symbol('description');
```

### Type Checking

```javascript
typeof "hello"; // "string"
typeof 42; // "number"
typeof true; // "boolean"
typeof undefined; // "undefined"
typeof null; // "object" (historical bug)
typeof Symbol(); // "symbol"
typeof {}; // "object"
typeof []; // "object"
typeof function() {}; // "function"

// Better array check
Array.isArray([]); // true

// Null check
value === null; // true if null
```

### Type Coercion and Conversion

```javascript
// Implicit coercion
"5" + 2; // "52" (string concatenation)
"5" - 2; // 3 (numeric subtraction)
"5" * "2"; // 10 (numeric multiplication)
!!"value"; // true (boolean conversion)

// Explicit conversion
String(123); // "123"
Number("123"); // 123
Number("abc"); // NaN
Boolean(0); // false
Boolean(1); // true
parseInt("123px"); // 123
parseFloat("3.14"); // 3.14
```

### Truthy and Falsy Values

**Falsy values** (evaluate to false):
- `false`
- `0`, `-0`
- `""` (empty string)
- `null`
- `undefined`
- `NaN`

**Everything else is truthy**, including:
- `"0"` (string)
- `"false"` (string)
- `[]` (empty array)
- `{}` (empty object)
- `function() {}` (empty function)

## Variables and Constants

```javascript
// var (function-scoped, hoisted - avoid in modern code)
var oldStyle = "avoid this";

// let (block-scoped, can be reassigned)
let count = 0;
count = 1; // ✓ works

// const (block-scoped, cannot be reassigned)
const MAX = 100;
MAX = 200; // ✗ TypeError

// const with objects/arrays (content can change)
const person = { name: "John" };
person.name = "Jane"; // ✓ works (mutating object)
person = {}; // ✗ TypeError (reassigning variable)
```

## Functions

### Function Declaration

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

### Function Expression

```javascript
const greet = function(name) {
  return `Hello, ${name}!`;
};
```

### Arrow Functions

```javascript
// Basic syntax
const add = (a, b) => a + b;

// With block body
const multiply = (a, b) => {
  const result = a * b;
  return result;
};

// Single parameter (parentheses optional)
const square = x => x * x;

// No parameters
const getRandom = () => Math.random();

// Implicit return of object (wrap in parentheses)
const makePerson = (name, age) => ({ name, age });
```

### First-Class Functions

Functions are values that can be:
- Assigned to variables
- Passed as arguments
- Returned from other functions

```javascript
// Assign to variable
const fn = function() { return 42; };

// Pass as argument
function execute(callback) {
  return callback();
}
execute(() => console.log("Hello"));

// Return from function
function createMultiplier(factor) {
  return function(x) {
    return x * factor;
  };
}
const double = createMultiplier(2);
double(5); // 10
```

### Closures

Functions that remember their lexical scope:

```javascript
function createCounter() {
  let count = 0; // Private variable
  
  return {
    increment() {
      count++;
      return count;
    },
    decrement() {
      count--;
      return count;
    },
    getCount() {
      return count;
    }
  };
}

const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.decrement(); // 1
counter.getCount(); // 1
```

### Callback Functions

Function passed as an argument to be executed later:

```javascript
// Array methods use callbacks
const numbers = [1, 2, 3, 4, 5];

numbers.forEach(num => console.log(num));

const doubled = numbers.map(num => num * 2);

const evens = numbers.filter(num => num % 2 === 0);

const sum = numbers.reduce((acc, num) => acc + num, 0);
```

### IIFE (Immediately Invoked Function Expression)

```javascript
(function() {
  // Code here runs immediately
  console.log("IIFE executed");
})();

// With parameters
(function(name) {
  console.log(`Hello, ${name}`);
})("World");

// Arrow function IIFE
(() => {
  console.log("Arrow IIFE");
})();
```

## Objects

### Object Creation

```javascript
// Object literal
const person = {
  name: "John",
  age: 30,
  greet() {
    return `Hello, I'm ${this.name}`;
  }
};

// Constructor function
function Person(name, age) {
  this.name = name;
  this.age = age;
}

const john = new Person("John", 30);

// Object.create
const proto = { greet() { return "Hello"; } };
const obj = Object.create(proto);
```

### Accessing Properties

```javascript
const obj = { name: "John", age: 30 };

// Dot notation
obj.name; // "John"

// Bracket notation
obj["age"]; // 30
const key = "name";
obj[key]; // "John"

// Optional chaining (ES2020)
obj.address?.city; // undefined (no error if address doesn't exist)
obj.getName?.(); // undefined (no error if getName doesn't exist)
```

### Object Methods

```javascript
const person = { name: "John", age: 30, city: "NYC" };

// Get keys
Object.keys(person); // ["name", "age", "city"]

// Get values
Object.values(person); // ["John", 30, "NYC"]

// Get entries
Object.entries(person); // [["name", "John"], ["age", 30], ["city", "NYC"]]

// Assign (merge objects)
const extended = Object.assign({}, person, { country: "USA" });

// Spread operator (modern alternative)
const merged = { ...person, country: "USA" };

// Freeze (make immutable)
Object.freeze(person);
person.age = 31; // Silently fails (throws in strict mode)

// Seal (prevent adding/removing properties)
Object.seal(person);
```

### Destructuring

```javascript
// Object destructuring
const person = { name: "John", age: 30, city: "NYC" };
const { name, age } = person;

// With different variable names
const { name: personName, age: personAge } = person;

// With defaults
const { name, country = "USA" } = person;

// Nested destructuring
const user = { profile: { email: "john@example.com" } };
const { profile: { email } } = user;

// Array destructuring
const numbers = [1, 2, 3, 4, 5];
const [first, second, ...rest] = numbers;
// first = 1, second = 2, rest = [3, 4, 5]

// Skip elements
const [a, , c] = numbers;
// a = 1, c = 3
```

## Arrays

```javascript
// Create arrays
const arr = [1, 2, 3];
const empty = [];
const mixed = [1, "two", { three: 3 }, [4]];

// Access elements
arr[0]; // 1
arr[arr.length - 1]; // Last element
arr.at(-1); // 3 (ES2022 - negative indexing)

// Modify arrays
arr.push(4); // Add to end
arr.pop(); // Remove from end
arr.unshift(0); // Add to beginning
arr.shift(); // Remove from beginning
arr.splice(1, 2, 'a', 'b'); // Remove 2 elements at index 1, insert 'a', 'b'

// Iteration
arr.forEach(item => console.log(item));
for (let item of arr) { console.log(item); }
for (let i = 0; i < arr.length; i++) { console.log(arr[i]); }

// Transformation
const doubled = arr.map(x => x * 2);
const evens = arr.filter(x => x % 2 === 0);
const sum = arr.reduce((acc, x) => acc + x, 0);

// Search
arr.includes(2); // true
arr.indexOf(2); // Index or -1
arr.find(x => x > 2); // First matching element
arr.findIndex(x => x > 2); // Index of first match

// Test
arr.some(x => x > 5); // true if any match
arr.every(x => x > 0); // true if all match

// Sort and reverse
arr.sort((a, b) => a - b); // Ascending
arr.reverse(); // Reverse in place

// Combine
const combined = arr.concat([4, 5]);
const spread = [...arr, 4, 5];

// Slice (copy portion)
const portion = arr.slice(1, 3); // Index 1 to 3 (exclusive)

// Flat (flatten nested arrays)
[[1, 2], [3, 4]].flat(); // [1, 2, 3, 4]
```

## Control Flow

### Conditionals

```javascript
// if/else
if (condition) {
  // code
} else if (otherCondition) {
  // code
} else {
  // code
}

// Ternary operator
const result = condition ? valueIfTrue : valueIfFalse;

// Switch statement
switch (value) {
  case 1:
    // code
    break;
  case 2:
  case 3:
    // code for 2 or 3
    break;
  default:
    // default code
}

// Nullish coalescing (ES2020)
const value = null ?? "default"; // "default"
const value = 0 ?? "default"; // 0 (0 is not nullish)

// Logical OR for defaults (pre-ES2020)
const value = falsy || "default";

// Optional chaining
const city = user?.address?.city;
```

### Loops

```javascript
// for loop
for (let i = 0; i < 10; i++) {
  console.log(i);
}

// while loop
let i = 0;
while (i < 10) {
  console.log(i);
  i++;
}

// do-while loop
do {
  console.log(i);
  i++;
} while (i < 10);

// for...of (iterate values)
for (const item of array) {
  console.log(item);
}

// for...in (iterate keys - avoid for arrays)
for (const key in object) {
  console.log(key, object[key]);
}

// break and continue
for (let i = 0; i < 10; i++) {
  if (i === 5) break; // Exit loop
  if (i === 3) continue; // Skip iteration
  console.log(i);
}
```

## Asynchronous JavaScript

### Callbacks

```javascript
function fetchData(callback) {
  setTimeout(() => {
    callback("Data received");
  }, 1000);
}

fetchData(data => console.log(data));
```

### Promises

```javascript
// Create promise
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    const success = true;
    if (success) {
      resolve("Success!");
    } else {
      reject("Error!");
    }
  }, 1000);
});

// Use promise
promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log("Done"));

// Promise utilities
Promise.all([promise1, promise2]); // Wait for all
Promise.race([promise1, promise2]); // First to complete
Promise.allSettled([promise1, promise2]); // Wait for all (ES2020)
Promise.any([promise1, promise2]); // First to succeed (ES2021)
```

### Async/Await

```javascript
// Async function
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Use async function
fetchData().then(data => console.log(data));

// Top-level await (ES2022, in modules)
const data = await fetchData();
```

## Classes

```javascript
class Person {
  // Constructor
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  
  // Instance method
  greet() {
    return `Hello, I'm ${this.name}`;
  }
  
  // Getter
  get info() {
    return `${this.name}, ${this.age}`;
  }
  
  // Setter
  set birthYear(year) {
    this.age = new Date().getFullYear() - year;
  }
  
  // Static method
  static species() {
    return "Homo sapiens";
  }
}

// Inheritance
class Employee extends Person {
  constructor(name, age, jobTitle) {
    super(name, age); // Call parent constructor
    this.jobTitle = jobTitle;
  }
  
  // Override method
  greet() {
    return `${super.greet()}, I'm a ${this.jobTitle}`;
  }
}

// Usage
const john = new Person("John", 30);
john.greet(); // "Hello, I'm John"
Person.species(); // "Homo sapiens"

const jane = new Employee("Jane", 25, "Developer");
jane.greet(); // "Hello, I'm Jane, I'm a Developer"
```

## Modules

### ES6 Modules (ESM)

```javascript
// Export (math.js)
export const PI = 3.14159;
export function add(a, b) {
  return a + b;
}
export default class Calculator {
  // ...
}

// Import
import Calculator, { PI, add } from './math.js';
import * as math from './math.js';
import { add as sum } from './math.js'; // Rename
```

### CommonJS (Node.js)

```javascript
// Export (math.js)
module.exports = {
  add(a, b) {
    return a + b;
  }
};

// Import
const math = require('./math');
```

## Error Handling

```javascript
// Try/catch
try {
  // Code that might throw
  throw new Error("Something went wrong");
} catch (error) {
  console.error(error.message);
} finally {
  // Always runs
  console.log("Cleanup");
}

// Custom errors
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

throw new ValidationError("Invalid input");
```

## Best Practices

### Do's
- ✅ Use `const` by default, `let` when needed
- ✅ Use strict mode (`'use strict';`)
- ✅ Use arrow functions for callbacks
- ✅ Use template literals for string interpolation
- ✅ Use destructuring for cleaner code
- ✅ Use async/await for asynchronous code
- ✅ Handle errors properly
- ✅ Use descriptive variable names
- ✅ Keep functions small and focused
- ✅ Use modern ES6+ features

### Don'ts
- ❌ Use `var` (use `let` or `const`)
- ❌ Pollute global scope
- ❌ Use `==` (use `===` for strict equality)
- ❌ Modify function parameters
- ❌ Use `eval()` or `with()`
- ❌ Ignore errors silently
- ❌ Use synchronous code for I/O operations
- ❌ Create deeply nested callbacks (callback hell)

## Glossary Terms

**Key Terms Covered**:
- Algorithm
- Argument
- Array
- Asynchronous
- Binding
- BigInt
- Bitwise flags
- Block (scripting)
- Boolean
- Callback function
- Camel case
- Class
- Closure
- Code point
- Code unit
- Compile
- Compile time
- Conditional
- Constant
- Constructor
- Control flow
- Deep copy
- Deserialization
- ECMAScript
- Encapsulation
- Exception
- Expando
- First-class function
- Function
- Hoisting
- IIFE
- Identifier
- Immutable
- Inheritance
- Instance
- JavaScript
- JSON
- JSON type representation
- Just-In-Time Compilation (JIT)
- Kebab case
- Keyword
- Literal
- Local scope
- Local variable
- Loop
- Method
- Mixin
- Modularity
- Mutable
- Namespace
- NaN
- Native
- Null
- Nullish value
- Number
- Object
- Object reference
- OOP
- Operand
- Operator
- Parameter
- Parse
- Polymorphism
- Primitive
- Promise
- Property (JavaScript)
- Prototype
- Prototype-based programming
- Pseudocode
- Recursion
- Regular expression
- Scope
- Serialization
- Serializable object
- Shallow copy
- Signature (functions)
- Sloppy mode
- Snake case
- Static method
- Static typing
- Statement
- Strict mode
- String
- Stringifier
- Symbol
- Synchronous
- Syntax
- Syntax error
- Type
- Type coercion
- Type conversion
- Truthy
- Falsy
- Undefined
- Value
- Variable

## Additional Resources

- [MDN JavaScript Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [ECMAScript Specification](https://tc39.es/ecma262/)
- [JavaScript.info](https://javascript.info/)
- [You Don't Know JS (book series)](https://github.com/getify/You-Dont-Know-JS)
