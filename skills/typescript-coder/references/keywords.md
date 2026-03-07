# TypeScript Keywords

## TypeScript Keyof

- Reference material for [Keyof](https://www.w3schools.com/typescript/typescript_keyof.php)
- See [Keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) for additional information
- See [Typeof Type Operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html) for additional information

### Parameters

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

- Reference material for [Null & Undefined](https://www.w3schools.com/typescript/typescript_null.php)
- See [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) for additional information
- See [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) for additional information

### Types

```ts
let value: string | undefined | null = null;
value = 'hello';
value = undefined;
```

### Optional Chaining

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

### Nullish Coalescing

```ts
function printMileage(mileage: number | null | undefined) {
  console.log(`Mileage: ${mileage ?? 'Not Available'}`);
}

printMileage(null); // Prints 'Mileage: Not Available'
printMileage(0); // Prints 'Mileage: 0'
```

### Null Assertion

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

- Reference material for [Definitely Typed](https://www.w3schools.com/typescript/typescript_definitely_typed.php)
- See [Declaration Files Introduction](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html) for additional information

### Installation

```bash
npm install --save-dev @types/jquery
```

## TypeScript 5.x Update

- Reference material for [5.x Update](https://www.w3schools.com/typescript/typescript_5_updates.php)
- See [Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) for additional information

### Template Literal Types

```ts
type Color = "red" | "green" | "blue";
type HexColor<T extends Color> = `#${string}`;

// Usage:
let myColor: HexColor<"blue"> = "#0000FF";
```

### Index Signature Labels

```ts
type DynamicObject = { [key: `dynamic_${string}`]: string };

// Usage:
let obj: DynamicObject = { dynamic_key: "value" };
```
