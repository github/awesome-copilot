# TypeScript d.ts Templates

Template patterns for TypeScript declaration files (.d.ts) from the official TypeScript documentation.

## Modules .d.ts

- Reference material for [Modules .d.ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html)

Use this template when writing a declaration file for a module that is consumed via `import` or `require`. This is the most common template for npm packages.

### Determining What Kind of Module

Before writing a module declaration, look at the JavaScript source for clues:

- Uses `module.exports = ...` or `exports.foo = ...` — use `export =` syntax
- Uses `export default` or named `export` statements — use ES module syntax
- Both accessible as a global and via `require` — use `export as namespace` (UMD)

### Module Template

```ts
// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

/*~ This is the module template file. You should rename it to index.d.ts
 *~ and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ If this module is a UMD module that exposes a global variable 'myLib'
 *~ when loaded outside a module loader environment, declare that global here.
 *~ Remove this section if your library is not UMD.
 */
export as namespace myLib;

/*~ If this module exports functions, declare them like so.
 */
export function myFunction(a: string): string;
export function myOtherFunction(a: number): number;

/*~ You can declare types that are available via importing the module.
 */
export interface someType {
  name: string;
  length: number;
  extras?: string[];
}

/*~ You can declare properties of the module using const, let, or var.
 */
export const myField: number;

/*~ If there are types, properties, or methods inside dotted names in your
 *~ module, declare them inside a 'namespace'.
 */
export namespace subProp {
  /*~ For example, given this definition, someone could write:
   *~   import { subProp } from 'yourModule';
   *~   subProp.foo();
   *~   or
   *~   import * as yourModule from 'yourModule';
   *~   yourModule.subProp.foo();
   */
  export function foo(): void;
}
```

### Exporting a Class and Namespace Together

When the module exports a class as well as related types:

```ts
export = MyClass;

declare class MyClass {
  constructor(someParam?: string);
  someProperty: string[];
  myMethod(opts: MyClass.MyClassMethodOptions): number;
}

declare namespace MyClass {
  export interface MyClassMethodOptions {
    width?: number;
    height?: number;
  }
}
```

## Module: Plugin

- Reference material for [Module: Plugin](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-plugin-d-ts.html)

Use this template when writing a declaration file for a module that augments another module. A plugin imports a base module and extends its types.

### When to Use

- Your library is imported alongside another library and adds capabilities to it
- You call `require("super-greeter")` and then your plugin augments its behavior
- Example: a charting plugin that adds methods to a base chart library

### Plugin Template

```ts
// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

/*~ This is the module plugin template file. You should rename it to index.d.ts
 *~ and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ On this line, import the module which this module adds to */
import { greeter } from "super-greeter";

/*~ Here, declare the same module as the one you imported above,
 *~ then expand the existing declaration of the greeter function.
 */
declare module "super-greeter" {
  /*~ Here, declare the things that are added by your plugin.
   *~ You can add new members to existing types.
   */
  interface Greeter {
    printHello(): void;
  }
}
```

### Key Points

- The `import` at the top is required to make this file a module (not a script), which enables `declare module` augmentation.
- The `declare module "super-greeter"` block must exactly match the original module's specifier string.
- Only exported members can be augmented; you cannot add new exports to an existing module.

## Module: Class

- Reference material for [Module: Class](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-class-d-ts.html)

Use this template when the module's primary export is a class (constructor function). The library is used like `new Greeter("hello")`.

### Usage Example (JavaScript)

```js
const Greeter = require("super-greeter");
const greeter = new Greeter("Hello, world");
greeter.sayHello();
```

### Module: Class Template

```ts
// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

/*~ This is the module-class template file. You should rename it to index.d.ts
 *~ and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

// Note that ES6 modules cannot directly export class objects.
// This file should be imported using the CommonJS-style:
//   import x = require('[~THE MODULE~]');
//
// Alternatively, if --allowSyntheticDefaultImports or
// --esModuleInterop is turned on, this file can also be
// imported as a default import:
//   import x from '[~THE MODULE~]';
//
// Refer to the TypeScript documentation at
// https://www.typescriptlang.org/docs/handbook/modules.html#export--and-import--require
// to understand common workarounds for this limitation of ES6 modules.

/*~ This declaration specifies that the class constructor function
 *~ is the exported object from the file.
 */
export = MyClass;

/*~ Write your module's methods and properties in this class */
declare class MyClass {
  constructor(someParam?: string);
  someProperty: string[];
  myMethod(opts: MyClass.MyClassMethodOptions): number;
}

/*~ If you want to expose types from your module as well, you can
 *~ place them in this block. Note that if you include this namespace,
 *~ the module can be temporarily used as a namespace, although this
 *~ isn't a recommended use.
 */
declare namespace MyClass {
  /** Documentation comment */
  export interface MyClassMethodOptions {
    width?: number;
    height?: number;
  }
}
```

### Key Points

- `export =` is used because the library uses `module.exports = MyClass` (CommonJS).
- To use this with `import MyClass from "..."` syntax, enable `esModuleInterop` in `tsconfig.json`.
- The `declare namespace MyClass` block lets you export nested types that are accessible as `MyClass.MyClassMethodOptions`.

## Module: Function

- Reference material for [Module: Function](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-function-d-ts.html)

Use this template when the module's primary export is a callable function. The library is used like `myFn(42)` after requiring it.

### Usage Example (JavaScript)

```js
const x = require("super-greeter");
const y = x(42);
const z = x("hello");
```

### Module: Function Template

```ts
// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

/*~ This is the module-function template file. You should rename it to index.d.ts
 *~ and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ This declaration specifies that the function
 *~ is the exported object from the file.
 */
export = MyFunction;

/*~ This example shows how to have multiple overloads of your function */
declare function MyFunction(name: string): MyFunction.NamespaceName;
declare function MyFunction(name: string, greeting: string): MyFunction.NamespaceName;

/*~ If you want to expose types from your module as well, you can
 *~ place them in this block. Often you will want to describe the
 *~ shape of the return type of the function; that type should
 *~ be declared in here as shown.
 */
declare namespace MyFunction {
  export interface NamespaceName {
    firstName: string;
    lastName: string;
  }
}
```

### Key Points

- `export =` is required when the module uses `module.exports = myFunction`.
- Overloads are declared as separate `declare function` statements before the namespace.
- The `declare namespace MyFunction` block is merged with the function declaration, letting the function have properties.

## Global .d.ts

- Reference material for [Global .d.ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-d-ts.html)

Use this template for libraries loaded via a `<script>` tag that add names to the global scope. No `import` or `require` is involved.

### Identifying Global Libraries

Look at the library's documentation or source for:

- Assignments to `window.myLib` or top-level `var`/`function` declarations
- Documentation showing `<script src="..."></script>` as the installation method
- Usage examples with no `import`/`require` statement
- References to a global like `$` or `_` with no import

### Global Template

```ts
// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

/*~ If this library is callable (e.g. can be invoked as myLib(3)),
 *~ include those call signatures here.
 *~ Otherwise, delete this section.
 */
declare function myLib(a: string): string;
declare function myLib(a: number): number;

/*~ If you want the name of this library to be a valid type name,
 *~ you can do so here.
 *~
 *~ For example, this allows us to write 'var x: myLib'.
 *~ Be sure this actually makes sense! If it doesn't, just
 *~ delete this declaration and add types inside the namespace below.
 */
interface myLib {
  name: string;
  length: number;
  extras?: string[];
}

/*~ If your library has properties exposed on a global variable,
 *~ place them here.
 *~ You should also place types (interfaces and type aliases) here.
 */
declare namespace myLib {
  //~ We can write 'myLib.timeout = 50'
  let timeout: number;
  //~ We can access 'myLib.version', but not change it
  const version: string;
  //~ There's some class we can create via 'let c = new myLib.Cat(42)'
  //~ Or reference, e.g. 'function f(c: myLib.Cat) { ... }'
  class Cat {
    constructor(n: number);
    //~ We can read 'c.age' from a 'Cat' instance
    readonly age: number;
    //~ We can invoke 'c.purr()' from a 'Cat' instance
    purr(): void;
  }
  //~ We can declare a variable as
  //~   'var s: myLib.CatSettings = { weight: 5, name: "Maru" };'
  interface CatSettings {
    weight: number;
    name: string;
    tailLength?: number;
  }
  //~ We can write 'myLib.VetID = 42' or 'myLib.VetID = "bob"'
  type VetID = string | number;
  //~ We can invoke 'myLib.checkCat(c)' or 'myLib.checkCat(c, v)'
  function checkCat(c: Cat, s?: VetID): boolean;
}
```

### Key Points

- Do not include `export` or `import` statements — that would make this a module file, not a global script file.
- Top-level `declare` statements describe what exists in the global scope.
- `declare namespace myLib` groups all properties and types accessible under the `myLib` global.
- An `interface myLib` at the top level (merged with the namespace) allows `myLib` to be used as a type directly.

## Global: Modifying Module

- Reference material for [Global: Modifying Module](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-modifying-module-d-ts.html)

Use this template when a library is imported as a module but has the side effect of modifying the global scope (e.g., adding methods to built-in prototypes like `String.prototype`).

### When to Use

- The library is loaded with `require("my-lib")` or `import "my-lib"` for its side effects
- The import adds new methods to existing global types (e.g., `String`, `Array`, `Promise`)
- Usage example: `require("moment"); moment().format("YYYY")` combined with `String.prototype.toDate()`

### Global-Modifying Module Template

```ts
// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

/*~ This is the global-modifying module template file. You should rename it
 *~ to index.d.ts and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ Note: If your global-modifying module is callable or constructable, you'll
 *~ need to combine the patterns here with those in the module-class or
 *~ module-function template files.
 */
declare global {
  /*~ Here, declare things in the normal global namespace */
  interface String {
    fancyFormat(opts: StringFormatOptions): string;
  }
}

/*~ If your module exports nothing, you'll need this line. Otherwise, delete it */
export {};

/*~ Mark the types that are referenced inside the 'declare global' block here */
export interface StringFormatOptions {
  fancinessLevel: number;
}
```

### Key Points

- The file must be a **module** (contain at least one `export` or `import`) for `declare global` to work. The `export {}` statement at the bottom satisfies this requirement without exporting anything.
- `declare global { }` is the mechanism for adding to the global scope from within a module file.
- If the module also has callable or constructable exports, combine this template with the module-function or module-class template.
- Consumers install the type augmentation simply by importing the module:

```ts
import "super-greeter";

const s = "hello";
s.fancyFormat({ fancinessLevel: 3 }); // OK — added by the module
```
