# TypeScript Keywords

## TypeScript Keyof

- Reference [Keyof](https://www.w3schools.com/typescript/typescript_keyof.php)

### Parameters:

```ts
interface Person {
  name: string;
  age: number;
}
// `keyof Person` here creates a union type of "name" and "age",
// other strings will not be allowed
function printPersonProperty(person: Person, property: keyof Person) {
  console.log(`Printing person property ${property}: "${person[property]}"`);
}
let person = {
  name: "Max",
  age: 27
};
printPersonProperty(person, "name"); // Printing person property name: "Max"
```

```ts
type StringMap = { [key: string]: unknown };
// `keyof StringMap` resolves to `string` here
function createStringPair(property: keyof StringMap, value: string): StringMap {
  return { [property]: value };
}
```
## TypeScript Null & Undefined

- Reference [Null & Undefined](https://www.w3schools.com/typescript/typescript_null.php)

### Types:

```ts
let value: string | undefined | null = null;
value = 'hello';
value = undefined;
```

### Optional Chaining:

```ts
interface House {
  sqft: number;
  yard?: {
    sqft: number;
  };
}
function printYardSize(house: House) {
  const yardSize = house.yard?.sqft;
  if (yardSize === undefined) {
    console.log('No yard');
  } else {
    console.log(`Yard is ${yardSize} sqft`);
  }
}

let home: House = {
  sqft: 500
};

printYardSize(home); // Prints 'No yard'
```

### Nullish Coalescing:

```ts
function printMileage(mileage: number | null | undefined) {
  console.log(`Mileage: ${mileage ?? 'Not Available'}`);
}

printMileage(null); // Prints 'Mileage: Not Available'
printMileage(0); // Prints 'Mileage: 0'
```

### Null Assertion:

```ts
function getValue(): string | undefined {
  return 'hello';
}
let value = getValue();
console.log('value length: ' + value!.length);
```

```ts
let array: number[] = [1, 2, 3];
let value = array[0];
// with `noUncheckedIndexedAccess` this has the type `number | undefined`
```
## TypeScript Definitely Typed

- Reference [Definitely Typed](https://www.w3schools.com/typescript/typescript_definitely_typed.php)

### Installation:

```bash
npm install --save-dev @types/jquery
```

## TypeScript 5.x Update

- Reference [5.x Update](https://www.w3schools.com/typescript/typescript_5_updates.php)

### Template Literal Types:

```ts
type Color = "red" | "green" | "blue";
type HexColor<T extends Color> = `#${string}`;

// Usage:
let myColor: HexColor<"blue"> = "#0000FF";
```

### Index Signature Labels:

```ts
type DynamicObject = { [key: `dynamic_${string}`]: string };

// Usage:
let obj: DynamicObject = { dynamic_key: "value" };
```
