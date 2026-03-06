# TypeScript Elements

## TypeScript Arrays

- Reference [Arrays](https://www.w3schools.com/typescript/typescript_arrays.php)

### Elements Syntax:

```ts
const names: string[] = [];
names.push("Dylan"); // no error
// names.push(3); 
// Error: Argument of type 'number' is not assignable to parameter of type 'string'.
```

### Readonly:

```ts
const names: readonly string[] = ["Dylan"];
names.push("Jack"); 
// Error: Property 'push' does not exist on type 'readonly string[]'.
// try removing the readonly modifier and see if it works?
```

```ts
const numbers = [1, 2, 3]; // inferred to type number[]
numbers.push(4); // no error
// comment line below out to see the successful assignment 
numbers.push("2"); 
// Error: Argument of type 'string' is not assignable to parameter of type 'number'.
let head: number = numbers[0]; // no error
```
## TypeScript Tuples

- Reference [Tuples](https://www.w3schools.com/typescript/typescript_tuples.php)

### Typed Arrays:

```ts
// define our tuple
let ourTuple: [number, boolean, string];

// initialize correctly
ourTuple = [5, false, 'Coding God was here'];
```

```ts
// define our tuple
let ourTuple: [number, boolean, string];

// initialized incorrectly which throws an error
ourTuple = [false, 'Coding God was mistaken', 5];
```

### Readonly Tuple:

```ts
// define our tuple
let ourTuple: [number, boolean, string];
// initialize correctly
ourTuple = [5, false, 'Coding God was here'];
// We have no type safety in our tuple for indexes 3+
ourTuple.push('Something new and wrong');
console.log(ourTuple);
```

```ts
// define our readonly tuple
const ourReadonlyTuple: readonly [number, boolean, string] = 
 [5, true, 'The Real Coding God'];
// throws error as it is readonly.
ourReadonlyTuple.push('Coding God took a day off');
```

### Named Tuples:

```ts
const graph: [x: number, y: number] = [55.2, 41.3];
```

```ts
const graph: [number, number] = [55.2, 41.3];
const [x, y] = graph;
```
## TypeScript Object Types

- Reference [Object Types](https://www.w3schools.com/typescript/typescript_object_types.php)

### Elements Syntax:

```ts
const car: { type: string, model: string, year: number } = {
  type: "Toyota",
  model: "Corolla",
  year: 2009
};
```

### Type Inference:

```ts
const car = {
  type: "Toyota",
};
car.type = "Ford"; // no error
car.type = 2; 
// Error: Type 'number' is not assignable to type 'string'.
```

### Optional Properties:

```ts
const car: { type: string, mileage: number } = { 
  // Error: Property 'mileage' is missing in type '{ type: string;}' 
  // but required in type '{ type: string; mileage: number; }'.
  type: "Toyota",
};
car.mileage = 2000;
```

```ts
const car: { type: string, mileage?: number } = { // no error
  type: "Toyota"
};
car.mileage = 2000;
```

### Index Signatures:

```ts
const nameAgeMap: { [index: string]: number } = {};
nameAgeMap.Jack = 25; // no error
nameAgeMap.Mark = "Fifty"; 
// Error: Type 'string' is not assignable to type 'number'.
```
## TypeScript Enums

- Reference [Enums](https://www.w3schools.com/typescript/typescript_enums.php)

### Numeric Enums - Default:

```ts
enum CardinalDirections {
  North,
  East,
  South,
  West
}
let currentDirection = CardinalDirections.North;
// logs 0
console.log(currentDirection);
// throws error as 'North' is not a valid enum
currentDirection = 'North'; 
// Error: "North" is not assignable to type 'CardinalDirections'.
```

### Numeric Enums - Initialized:

```ts
enum CardinalDirections {
  North = 1,
  East,
  South,
  West
}
// logs 1
console.log(CardinalDirections.North);
// logs 4
console.log(CardinalDirections.West);
```

### Numeric Enums - Fully Initialized:

```ts
enum StatusCodes {
  NotFound = 404,
  Success = 200,
  Accepted = 202,
  BadRequest = 400
}
// logs 404
console.log(StatusCodes.NotFound);
// logs 200
console.log(StatusCodes.Success);
```

### String Enums:

```ts
enum CardinalDirections {
  North = 'North',
  East = "East",
  South = "South",
  West = "West"
};
// logs "North"
console.log(CardinalDirections.North);
// logs "West"
console.log(CardinalDirections.West);
```
## TypeScript Type Aliases and Interfaces

- Reference [Type Aliases and Interfaces](https://www.w3schools.com/typescript/typescript_aliases_and_interfaces.php)

### Type Aliases:

```ts
type CarYear = number
type CarType = string
type CarModel = string
type Car = {
  year: CarYear,
  type: CarType,
  model: CarModel
}

const carYear: CarYear = 2001
const carType: CarType = "Toyota"
const carModel: CarModel = "Corolla"
const car: Car = {
  year: carYear,
  type: carType,
  model: carModel
};
```

```ts
type Animal = { name: string };
type Bear = Animal & { honey: boolean };
const bear: Bear = { name: "Winnie", honey: true };

type Status = "success" | "error";
let response: Status = "success";
```

### Interfaces:

```ts
interface Rectangle {
  height: number,
  width: number
}

const rectangle: Rectangle = {
  height: 20,
  width: 10
};
```

```ts
interface Animal {
     name: string; 
}
interface Animal {
  age: number; 
}
const dog: Animal = {
  name: "Fido",
  age: 5
};
```

### Extending Interfaces:

```ts
interface Rectangle {
  height: number,
  width: number
}

interface ColoredRectangle extends Rectangle {
  color: string
}

const coloredRectangle: ColoredRectangle = {
  height: 20,
  width: 10,
  color: "red"
};
```

## TypeScript Union Types

- Reference [Union Types](https://www.w3schools.com/typescript/typescript_union_types.php)

### Union | (OR):

```ts
function printStatusCode(code: string | number) {
  console.log(`My status code is ${code}.`)
}
printStatusCode(404);
printStatusCode('404');
```

### Type Guards:

```ts
function printStatusCode(code: string | number) {
  console.log(`My status code is ${code.toUpperCase()}.`) 
  // error: Property 'toUpperCase' does not exist on type 'string | number'. 
  // Property 'toUpperCase' does not exist on type 'number'
}
```

> [!NOTE]
> In our example we are having an issue invoking `toUpperCase()` as it's a string method and number doesn't have access to it.

## TypeScript Functions

- Reference [Functions](https://www.w3schools.com/typescript/typescript_functions.php)

### Return Type:

```ts
// the `: number` here specifies that this function returns a number
function getTime(): number {
  return new Date().getTime();
}
```

### Void Return Type:

```ts
function printHello(): void {
  console.log('Hello!');
}
```

### Parameters:

```ts
function multiply(a: number, b: number) {
  return a * b;
}
```

### Optional Parameters:

```ts
// the `?` operator here marks parameter `c` as optional
function add(a: number, b: number, c?: number) {
  return a + b + (c || 0);
}
```

### Default Parameters:

```ts
function pow(value: number, exponent: number = 10) {
  return value ** exponent;
}
```

### Named Parameters:

```ts
function divide({ dividend, divisor }: { dividend: number, divisor: number }) {
  return dividend / divisor;
}
```

### Rest Parameters:

```ts
function add(a: number, b: number, ...rest: number[]) {
  return a + b + rest.reduce((p, c) => p + c, 0);
}
```

### Type Alias:

```ts
type Negate = (value: number) => number;

// in this function, the parameter `value` automatically gets assigned
// the type `number` from the type `Negate`
const negateFunction: Negate = (value) => value * -1;
```

## TypeScript Casting

- Reference [Casting](https://www.w3schools.com/typescript/typescript_casting.php)

### Casting with as:

```ts
let x: unknown = 'hello';
console.log((x as string).length);
```

### Casting with <>:

```ts
let x: unknown = 'hello';
console.log((<string>x).length);
```

### Force Casting:

```ts
let x = 'hello';
console.log(((x as unknown) as number).length); 
// x is not actually a number so this will return undefined
```
