# JavaScript Reference

A comprehensive reference covering JavaScript fundamentals, advanced features, DOM manipulation, network requests, and modern frameworks. Consolidated from MDN Web Docs and other educational sources.

---

## Table of Contents

1. [What is JavaScript?](#what-is-javascript)
2. [Adding JavaScript to a Page](#adding-javascript-to-a-page)
3. [Script Loading Strategies](#script-loading-strategies)
4. [Comments](#comments)
5. [Variables](#variables)
6. [Numbers and Math](#numbers-and-math)
7. [Strings](#strings)
8. [Useful String Methods](#useful-string-methods)
9. [Arrays](#arrays)
10. [Conditionals](#conditionals)
11. [Loops](#loops)
12. [Functions](#functions)
13. [Building Custom Functions](#building-custom-functions)
14. [Function Return Values](#function-return-values)
15. [Events](#events)
16. [Object Basics](#object-basics)
17. [DOM Scripting](#dom-scripting)
18. [Network Requests](#network-requests)
19. [Working with JSON](#working-with-json)
20. [JavaScript Frameworks: Main Features](#javascript-frameworks-main-features)
21. [Getting Started with React](#getting-started-with-react)
22. [React Components](#react-components)

---

## What is JavaScript?

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript>

JavaScript is a scripting or programming language that allows you to implement complex features on web pages. It enables dynamic content updates, interactive maps, animated graphics, scrolling video jukeboxes, and much more.

### The Three Layers of Web Technologies

JavaScript is the third layer of standard web technologies:

- **HTML**: Markup language for structuring and giving meaning to web content
- **CSS**: Language of style rules for applying styling to HTML content
- **JavaScript**: Scripting language that creates dynamically updating content, controls multimedia, and animates images

### What Can JavaScript Do?

Core JavaScript features allow you to:

- **Store useful values** in variables
- **Perform operations on text** (strings) -- combining and manipulating text
- **Run code in response to events** -- detect user interactions like clicks, keyboard input, etc.
- **Access and manipulate HTML and CSS** via the DOM (Document Object Model)

### Practical Example

```html
<button>Player 1: Chris</button>
```

```javascript
function updateName() {
  const name = prompt("Enter a new name");
  button.textContent = `Player 1: ${name}`;
}

const button = document.querySelector("button");
button.addEventListener("click", updateName);
```

### Browser APIs

Application Programming Interfaces (APIs) provide ready-made code building blocks that enable powerful functionality:

| API | Description |
|-----|-------------|
| **DOM API** | Manipulate HTML and CSS dynamically; create, remove, and change HTML elements |
| **Geolocation API** | Retrieves geographical information |
| **Canvas and WebGL APIs** | Create animated 2D and 3D graphics |
| **Audio and Video APIs** | Play audio and video in web pages; capture video from web cameras |

### Third-Party APIs

Not built into browsers by default; requires grabbing code from the web:

- **Google Maps API**: Embed custom maps into websites
- **OpenStreetMap API**: Add mapping functionality
- **Social media APIs**: Display posts on your website

### How JavaScript Runs

- JavaScript runs **top to bottom** in the order it appears
- Each browser tab has its own separate execution environment
- **JavaScript is interpreted** (though modern interpreters use just-in-time compiling for performance)
- **Client-side JavaScript** runs on the user's computer in the browser
- **Server-side JavaScript** runs on the server (e.g., Node.js environment)
- **Dynamic code** updates display depending on circumstances; **static code** shows the same content all the time

---

## Adding JavaScript to a Page

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript>

### 1. Internal JavaScript

Add JavaScript directly in your HTML file using `<script>` tags:

```html
<body>
  <button>Click me!</button>

  <script>
    function createParagraph() {
      const para = document.createElement("p");
      para.textContent = "You clicked the button!";
      document.body.appendChild(para);
    }

    const buttons = document.querySelectorAll("button");
    for (const button of buttons) {
      button.addEventListener("click", createParagraph);
    }
  </script>
</body>
```

### 2. External JavaScript (Recommended)

Keep JavaScript in a separate file for better organization and reusability:

**HTML file:**

```html
<script type="module" src="script.js"></script>
```

**script.js file:**

```javascript
function createParagraph() {
  const para = document.createElement("p");
  para.textContent = "You clicked the button!";
  document.body.appendChild(para);
}

const buttons = document.querySelectorAll("button");
for (const button of buttons) {
  button.addEventListener("click", createParagraph);
}
```

### 3. Inline JavaScript Handlers (Not Recommended)

```html
<button onclick="createParagraph()">Click me!</button>
```

Avoid inline handlers because they pollute HTML with JavaScript, are inefficient, and are harder to maintain.

### Comparison

| Method | Location | Best For | Pros | Cons |
|--------|----------|----------|------|------|
| **Internal** | `<script>` in body | Small projects | Simple, self-contained | Not reusable |
| **External** | `<script src="">` | Most projects | Reusable, organized | Requires HTTP server |
| **Inline** | `onclick=""` | Not recommended | Quick testing | Hard to maintain, pollutes HTML |
| **Module** | `<script type="module">` | Modern projects | Safe timing, organized | Requires HTTP server |

---

## Script Loading Strategies

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript>

### Place `<script>` at Bottom of Body

```html
<body>
  <h1>My Page</h1>
  <p>Content here</p>
  <script src="script.js"></script>
</body>
```

### Use `<script type="module">` in `<head>` (Recommended)

```html
<head>
  <script type="module" src="script.js"></script>
</head>
```

Browser waits for all HTML to process before executing.

### Use `defer` Attribute

```html
<head>
  <script defer src="script.js"></script>
</head>
```

Script downloads in parallel while HTML continues parsing; executes only after HTML is fully parsed. Scripts with `defer` execute in order.

### Use `async` Attribute (for non-dependent scripts)

```html
<script async src="analytics.js"></script>
```

Script downloads in parallel and executes immediately when ready. Does not guarantee execution order. Use only for scripts that do not depend on DOM elements.

### Wrap Internal Scripts in `DOMContentLoaded`

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const button = document.querySelector("button");
  button.addEventListener("click", updateName);
});
```

---

## Comments

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript>

### Single Line Comments

```javascript
// This is a single line comment
const name = "Chris"; // Can also go at end of line
```

### Multi-Line Comments

```javascript
/*
  This is a multi-line comment.
  It can span multiple lines.
  Useful for longer explanations.
*/
```

### Best Practices

- Use comments to explain **why** code does something, not **what** it does
- Variable names should be intuitive -- don't comment obvious operations
- More comments are usually better than fewer, but avoid overdoing it
- Keep comments up-to-date as code changes

---

## Variables

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Variables>

A variable is a **container for a value**, like a number or string. Variables are essential because they allow your code to remember and manipulate data.

### Declaring Variables

Use the **`let`** keyword to create a variable:

```javascript
let myName;
let myAge;
```

After declaration, the variable exists but has no value (`undefined`).

### Initializing Variables

Assign a value using the equals sign (`=`):

```javascript
myName = "Chris";
myAge = 37;
```

Or declare and initialize together:

```javascript
let myDog = "Rover";
```

### Variable Types

**Numbers:**

```javascript
let myAge = 17;           // integer
let temperature = 98.6;   // floating point number
```

**Strings:**

```javascript
let dolphinGoodbye = "So long and thanks for all the fish";
```

**Booleans:**

```javascript
let iAmAlive = true;
let test = 6 < 3;  // returns false
```

**Arrays:**

```javascript
let myNameArray = ["Chris", "Bob", "Jim"];
let myNumberArray = [10, 15, 40];
myNameArray[0];    // "Chris" (zero-indexed)
myNumberArray[2];  // 40
```

**Objects:**

```javascript
let dog = { name: "Spot", breed: "Dalmatian" };
dog.name;  // "Spot"
```

### Variable Naming Rules

- Use Latin characters (0-9, a-z, A-Z) and underscores only
- Use **lower camel case**: `myAge`, `initialColor`, `finalOutputValue`
- Make names intuitive and descriptive
- Variables are case-sensitive: `myage` is not the same as `myAge`
- Don't start with underscore or numbers
- Don't use reserved keywords (`var`, `function`, `let`, etc.)

### Dynamic Typing

JavaScript is **dynamically typed** -- you don't declare variable types. A variable's type is determined by the value assigned:

```javascript
let myString = "Hello";
typeof myString;           // "string"

let myNumber = "500";
typeof myNumber;           // "string"

myNumber = 500;
typeof myNumber;           // "number"
```

### Constants with `const`

Use **`const`** for values that should not change:

```javascript
const myDog = "Rover";
myDog = "Fido";  // Error: cannot reassign
```

For objects, you can still modify properties even with `const`:

```javascript
const bird = { species: "Kestrel" };
bird.species = "Striated Caracara";  // OK - modifying content
```

### `let` vs `const` vs `var`

| Feature | `let` | `const` | `var` |
|---------|-------|---------|-------|
| Can reassign | Yes | No | Yes |
| Must initialize | No | Yes | No |
| Scoping | Block | Block | Function |
| Hoisting issues | No | No | Yes |

**Best Practice:** Use `const` when possible, use `let` when you need to reassign. Avoid `var` in modern JavaScript.

---

## Numbers and Math

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Math>

### Types of Numbers

- **Integers**: Numbers without a fractional part (e.g., 10, 400, -5)
- **Floating Point Numbers (Floats)**: Have decimal points (e.g., 12.5, 56.7786543)
- JavaScript has only one data type for numbers: `Number` (plus `BigInt` for very large integers)

### Arithmetic Operators

| Operator | Name | Example | Result |
|----------|------|---------|--------|
| `+` | Addition | `6 + 9` | `15` |
| `-` | Subtraction | `20 - 15` | `5` |
| `*` | Multiplication | `3 * 7` | `21` |
| `/` | Division | `10 / 5` | `2` |
| `%` | Remainder (Modulo) | `8 % 3` | `2` |
| `**` | Exponent | `5 ** 2` | `25` |

```javascript
const num1 = 10;
const num2 = 50;
9 * num1;      // 90
num1 ** 3;     // 1000
num2 / num1;   // 5
```

### Operator Precedence

1. **Multiply and Divide** are done first (left to right)
2. **Add and Subtract** are done after (left to right)

```javascript
num2 + num1 / 8 + 2;        // = 53.25  (50 + 1.25 + 2)
(num2 + num1) / (8 + 2);    // = 6      (60 / 10)
```

### Increment and Decrement Operators

```javascript
let num1 = 4;
num1++;     // Returns 4, then increments to 5
++num1;     // Increments first, then returns 6

let num2 = 6;
num2--;     // Returns 6, then decrements to 5
--num2;     // Decrements first, then returns 4
```

### Assignment Operators

| Operator | Example | Equivalent |
|----------|---------|------------|
| `+=` | `x += 4;` | `x = x + 4;` |
| `-=` | `x -= 3;` | `x = x - 3;` |
| `*=` | `x *= 3;` | `x = x * 3;` |
| `/=` | `x /= 5;` | `x = x / 5;` |

### Comparison Operators

| Operator | Name | Example | Result |
|----------|------|---------|--------|
| `===` | Strict equality | `5 === 2 + 3` | `true` |
| `!==` | Strict non-equality | `5 !== 2 + 3` | `false` |
| `<` | Less than | `10 < 6` | `false` |
| `>` | Greater than | `10 > 20` | `false` |
| `<=` | Less than or equal | `3 <= 2` | `false` |
| `>=` | Greater than or equal | `5 >= 4` | `true` |

Always use `===` and `!==` (strict versions) instead of `==` and `!=`.

### Useful Number Methods

```javascript
// Round to decimal places
const lotsOfDecimal = 1.7665849587;
lotsOfDecimal.toFixed(2);  // "1.77"

// Convert string to number
let myNumber = "74";
myNumber = Number(myNumber) + 3;  // 77

// Check data type
typeof 5;      // "number"
typeof 6.667;  // "number"

// Math object methods
Math.random();           // Random number between 0 and 1
Math.floor(2.9);         // 2 (rounds down)
Math.ceil(2.1);          // 3 (rounds up)
Math.pow(5, 2);          // 25 (5 to the power of 2)
```

---

## Strings

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Strings>

### Creating Strings

Strings must be surrounded by quotes:

```javascript
const single = 'Single quotes';
const double = "Double quotes";
const backtick = `Backtick`;
```

The same character must be used for the start and end of a string.

### Template Literals

Template literals (backtick-wrapped strings) have two special features:

**1. Embedding JavaScript Expressions:**

```javascript
const name = "Chris";
const greeting = `Hello, ${name}`;
console.log(greeting); // "Hello, Chris"

const song = "Fight the Youth";
const score = 9;
const highestScore = 10;
const output = `I like the song ${song}. I gave it a score of ${
  (score / highestScore) * 100
}%.`;
// "I like the song Fight the Youth. I gave it a score of 90%."
```

**2. Multiline Strings:**

```javascript
const newline = `One day you finally knew
what you had to do, and began,`;
```

With regular strings, use `\n` for line breaks:

```javascript
const newline2 = "One day you finally knew\nwhat you had to do, and began,";
```

### String Concatenation

```javascript
// Using + operator
const greeting = "Hello" + ", " + "Bob";  // "Hello, Bob"

// Using template literals (recommended)
const name = "Ramesh";
console.log(`Howdy, ${name}`);  // "Howdy, Ramesh"
```

### Escaping Characters

```javascript
const bigmouth = 'I\'ve got no right to take my place...';
```

---

## Useful String Methods

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Useful_string_methods>

### Finding String Length

```javascript
const browserType = "mozilla";
browserType.length;  // 7
```

### Retrieving Characters

```javascript
browserType[0];                          // "m" (first character)
browserType[browserType.length - 1];     // "a" (last character)
```

### Testing for Substrings

```javascript
const browserType = "mozilla";

browserType.includes("zilla");     // true
browserType.startsWith("zilla");   // false
browserType.endsWith("zilla");     // true
```

### Finding Position of a Substring

```javascript
const tagline = "MDN - Resources for developers, by developers";
tagline.indexOf("developers");     // 20
tagline.indexOf("x");             // -1 (not found)

// Finding subsequent occurrences
const first = tagline.indexOf("developers");           // 20
const second = tagline.indexOf("developers", first + 1); // 35
```

### Extracting Substrings

```javascript
const browserType = "mozilla";
browserType.slice(1, 4);  // "ozi"
browserType.slice(2);     // "zilla" (from index 2 to end)
```

### Changing Case

```javascript
const radData = "My NaMe Is MuD";
radData.toLowerCase();  // "my name is mud"
radData.toUpperCase();  // "MY NAME IS MUD"
```

### Replacing Parts of a String

```javascript
// Replace first occurrence
const browserType = "mozilla";
const updated = browserType.replace("moz", "van");  // "vanilla"

// Replace all occurrences
let quote = "To be or not to be";
quote = quote.replaceAll("be", "code");  // "To code or not to code"
```

**Important:** String methods return new strings; they don't modify the original unless you reassign.

---

## Arrays

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Arrays>

### Creating Arrays

```javascript
const shopping = ["bread", "milk", "cheese", "hummus", "noodles"];
const sequence = [1, 1, 2, 3, 5, 8, 13];
const random = ["tree", 795, [0, 1, 2]];  // Mixed types allowed
```

### Finding Array Length

```javascript
shopping.length;  // 5
```

### Accessing and Modifying Items

```javascript
shopping[0];           // "bread" (zero-indexed)
shopping[0] = "tahini"; // Modify first item

// Multidimensional arrays
const random = ["tree", 795, [0, 1, 2]];
random[2][2];  // 2
```

### Finding Index of Items

```javascript
const birds = ["Parrot", "Falcon", "Owl"];
birds.indexOf("Owl");     // 2
birds.indexOf("Rabbit");  // -1 (not found)
```

### Adding Items

```javascript
const cities = ["Manchester", "Liverpool"];

// Add to end
cities.push("Cardiff");
cities.push("Bradford", "Brighton");  // Add multiple

// Add to start
cities.unshift("Edinburgh");
```

### Removing Items

```javascript
const cities = ["Manchester", "Liverpool", "Edinburgh", "Carlisle"];

// Remove from end
cities.pop();       // Returns removed item

// Remove from start
cities.shift();     // Returns removed item

// Remove from specific index
const index = cities.indexOf("Liverpool");
if (index !== -1) {
  cities.splice(index, 1);    // Remove 1 item at index
}
cities.splice(index, 2);      // Remove 2 items starting at index
```

### Iterating Over Arrays

**for...of Loop:**

```javascript
const birds = ["Parrot", "Falcon", "Owl"];
for (const bird of birds) {
  console.log(bird);
}
```

**map() -- Transform Items:**

```javascript
const numbers = [5, 2, 7, 6];
const doubled = numbers.map(number => number * 2);
// [10, 4, 14, 12]
```

**filter() -- Select Matching Items:**

```javascript
const cities = ["London", "Liverpool", "Totnes", "Edinburgh"];
const longer = cities.filter(city => city.length > 8);
// ["Liverpool", "Edinburgh"]
```

### Converting Between Strings and Arrays

```javascript
// String to Array
const data = "Manchester,London,Liverpool";
const cities = data.split(",");
// ["Manchester", "London", "Liverpool"]

// Array to String
const commaSeparated = cities.join(",");
// "Manchester,London,Liverpool"

// Simple toString (always uses comma)
const dogNames = ["Rocket", "Flash", "Bella"];
dogNames.toString();  // "Rocket,Flash,Bella"
```

---

## Conditionals

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Conditionals>

### if...else Statements

```javascript
if (condition) {
  /* code to run if condition is true */
} else {
  /* run some other code instead */
}
```

### else if Statements

```javascript
if (choice === "sunny") {
  para.textContent = "Wear shorts!";
} else if (choice === "rainy") {
  para.textContent = "Take a rain coat.";
} else if (choice === "snowing") {
  para.textContent = "It is freezing!";
} else {
  para.textContent = "";
}
```

### Logical Operators

**AND (`&&`) -- All conditions must be true:**

```javascript
if (choice === "sunny" && temperature < 86) {
  para.textContent = "Nice and sunny. Let's go to the beach!";
}
```

**OR (`||`) -- At least one condition must be true:**

```javascript
if (iceCreamVanOutside || houseStatus === "on fire") {
  console.log("You should leave the house quickly.");
}
```

**NOT (`!`) -- Negates an expression:**

```javascript
if (!(iceCreamVanOutside || houseStatus === "on fire")) {
  console.log("Probably should just stay in then.");
}
```

**Common Mistake:**

```javascript
// WRONG - will always evaluate to true
if (x === 5 || 7 || 10 || 20) { }

// CORRECT
if (x === 5 || x === 7 || x === 10 || x === 20) { }
```

### Switch Statements

```javascript
switch (choice) {
  case "sunny":
    para.textContent = "Wear shorts!";
    break;
  case "rainy":
    para.textContent = "Take a rain coat.";
    break;
  case "snowing":
    para.textContent = "It is freezing!";
    break;
  default:
    para.textContent = "";
}
```

### Ternary Operator

```javascript
const greeting = isBirthday
  ? "Happy birthday Mrs. Smith!"
  : "Good morning Mrs. Smith.";
```

---

## Loops

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Loops>

### for...of Loop

Used to iterate through collections:

```javascript
const cats = ["Leopard", "Serval", "Jaguar", "Tiger"];
for (const cat of cats) {
  console.log(cat);
}
```

### Standard for Loop

```javascript
for (let i = 1; i < 10; i++) {
  console.log(`${i} x ${i} = ${i * i}`);
}
```

Components: **initializer** (`let i = 1`), **condition** (`i < 10`), **final-expression** (`i++`).

### Looping Through Arrays with for

```javascript
const cats = ["Leopard", "Serval", "Jaguar"];
for (let i = 0; i < cats.length; i++) {
  console.log(cats[i]);
}
```

### while Loop

```javascript
let i = 0;
while (i < cats.length) {
  console.log(cats[i]);
  i++;
}
```

### do...while Loop

Code executes **at least once**, then checks condition:

```javascript
let i = 0;
do {
  console.log(cats[i]);
  i++;
} while (i < cats.length);
```

### break and continue

**break -- Exit Loop Immediately:**

```javascript
for (const contact of contacts) {
  const splitContact = contact.split(":");
  if (splitContact[0].toLowerCase() === searchName) {
    console.log(`${splitContact[0]}'s number is ${splitContact[1]}.`);
    break;
  }
}
```

**continue -- Skip to Next Iteration:**

```javascript
for (let i = 1; i <= num; i++) {
  let sqRoot = Math.sqrt(i);
  if (Math.floor(sqRoot) !== sqRoot) {
    continue;  // Skip non-perfect squares
  }
  console.log(i);
}
```

### Which Loop Type to Use?

| Loop Type | Best For |
|-----------|----------|
| `for...of` | Iterating collections when you don't need index |
| `for` | General purpose loops; full control of iteration |
| `while` | When initializer before loop makes sense |
| `do...while` | When code must run at least once |
| `map()` | Transforming array items |
| `filter()` | Selecting specific array items |

**Warning:** Always ensure loops terminate. Infinite loops crash browsers.

---

## Functions

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Functions>

### What Are Functions?

Functions are **reusable blocks of code** that perform a single task. They allow you to store code in a defined block and call it whenever needed.

### Built-in Browser Functions

```javascript
const myText = "I am a string";
const newString = myText.replace("string", "sausage");  // "I am a sausage"

const myArray = ["I", "love", "chocolate", "frogs"];
const madeAString = myArray.join(" ");  // "I love chocolate frogs"

const myNumber = Math.random();  // Random number between 0 and 1
```

### Custom Functions

```javascript
function myFunction() {
  alert("hello");
}

myFunction();  // Calls the function
```

### Function Parameters and Default Parameters

```javascript
function hello(name = "Chris") {
  console.log(`Hello ${name}!`);
}

hello("Ari");  // "Hello Ari!"
hello();       // "Hello Chris!"
```

### Anonymous Functions

Functions without names, often passed as parameters:

```javascript
textBox.addEventListener("keydown", function (event) {
  console.log(`You pressed "${event.key}".`);
});
```

### Arrow Functions

Modern syntax using `=>`:

```javascript
// Full syntax
textBox.addEventListener("keydown", (event) => {
  console.log(`You pressed "${event.key}".`);
});

// Single parameter - parentheses optional
textBox.addEventListener("keydown", event => {
  console.log(`You pressed "${event.key}".`);
});

// Single return statement - implicit return
const originals = [1, 2, 3];
const doubled = originals.map(item => item * 2);  // [2, 4, 6]
```

### Function Scope

Variables inside functions are locked to **function scope** and unreachable from outside:

```javascript
const x = 1;        // global scope - accessible everywhere

function myFunc() {
  const y = 2;      // function scope - only inside myFunc
  console.log(x);   // Can access global x
}

console.log(x);     // Can access global x
console.log(y);     // ReferenceError: y is not defined
```

### Block Scope (let/const)

```javascript
if (x === 1) {
  const c = 4;      // block scope
}
console.log(c);     // ReferenceError: c is not defined
```

---

## Building Custom Functions

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Build_your_own_function>

### Function Structure

```javascript
function displayMessage() {
  // Function body code goes here
}
```

Key components:

- `function` keyword declares a function definition
- Function name follows variable naming conventions
- Parentheses `()` hold parameters
- Curly braces `{}` contain the code that runs when called

### Complete Practical Example

```javascript
function displayMessage(msgText, msgType) {
  const body = document.body;

  const panel = document.createElement("div");
  panel.setAttribute("class", "msgBox");
  body.appendChild(panel);

  const msg = document.createElement("p");
  msg.textContent = msgText;
  panel.appendChild(msg);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "x";
  panel.appendChild(closeBtn);

  closeBtn.addEventListener("click", () => body.removeChild(panel));

  if (msgType === "warning") {
    msg.style.backgroundImage = 'url("icons/warning.png")';
    panel.style.backgroundColor = "red";
  } else if (msgType === "chat") {
    msg.style.backgroundImage = 'url("icons/chat.png")';
    panel.style.backgroundColor = "aqua";
  } else {
    msg.style.paddingLeft = "20px";
  }
}
```

### Calling Functions

```javascript
// Direct invocation
displayMessage("Your inbox is almost full", "warning");

// As event handler (no parentheses)
btn.addEventListener("click", displayMessage);

// With parameters via anonymous function
btn.addEventListener("click", () =>
  displayMessage("Woo, this is a different message!"),
);
```

**Important:** Don't include parentheses when passing a function as a callback:

```javascript
btn.addEventListener("click", displayMessage);    // Correct
btn.addEventListener("click", displayMessage());  // Wrong - calls immediately
```

### Parameters vs Arguments

- **Parameters** are the named variables in the function definition
- **Arguments** are the actual values passed when calling the function

---

## Function Return Values

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Return_values>

### What Are Return Values?

Return values are the values that a function returns when it completes execution.

```javascript
const myText = "The weather is cold";
const newString = myText.replace("cold", "warm");  // "The weather is warm"
```

### Using the return Keyword

```javascript
function random(number) {
  return Math.floor(Math.random() * number);
}
```

When a function is called, the return value **substitutes for the function call**:

```javascript
ctx.arc(random(WIDTH), random(HEIGHT), random(50), 0, 2 * Math.PI);
// If random() calls return 500, 200, 35:
ctx.arc(500, 200, 35, 0, 2 * Math.PI);
```

### Creating Functions with Return Values

```javascript
function squared(num) {
  return num * num;
}

function cubed(num) {
  return num * num * num;
}

function factorial(num) {
  if (num < 0) return undefined;
  if (num === 0) return 1;
  let x = num - 1;
  while (x > 1) {
    num *= x;
    x--;
  }
  return num;
}
```

### Using Return Values

```javascript
input.addEventListener("change", () => {
  const num = parseFloat(input.value);
  if (isNaN(num)) {
    para.textContent = "You need to enter a number!";
  } else {
    para.textContent = `${num} squared is ${squared(num)}. `;
    para.textContent += `${num} cubed is ${cubed(num)}. `;
    para.textContent += `${num} factorial is ${factorial(num)}. `;
  }
});
```

| Concept | Description |
|---------|-------------|
| **return keyword** | Returns a value and exits the function immediately |
| **No return value** | Functions without explicit return return `undefined` |
| **Variable storage** | Return values can be saved to variables for later use |

---

## Events

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Events>

### What Are Events?

Events are signals fired by the browser when something significant happens. They allow your code to react to user interactions and system activities.

### Using addEventListener() (Recommended)

```javascript
const btn = document.querySelector("button");

function random(number) {
  return Math.floor(Math.random() * (number + 1));
}

btn.addEventListener("click", () => {
  const rndCol = `rgb(${random(255)} ${random(255)} ${random(255)})`;
  document.body.style.backgroundColor = rndCol;
});
```

### Using Named Functions

```javascript
function changeBackground() {
  const rndCol = `rgb(${random(255)} ${random(255)} ${random(255)})`;
  document.body.style.backgroundColor = rndCol;
}

btn.addEventListener("click", changeBackground);
```

### Removing Event Listeners

```javascript
btn.removeEventListener("click", changeBackground);
```

### Adding Multiple Listeners

```javascript
myElement.addEventListener("click", functionA);
myElement.addEventListener("click", functionB);
// Both functions run when element is clicked
```

### Common Event Types

| Event | Description |
|-------|-------------|
| `click` | User clicks an element |
| `dblclick` | User double-clicks an element |
| `focus` | Element receives focus |
| `blur` | Element loses focus |
| `mouseover` | Mouse pointer hovers over element |
| `mouseout` | Mouse pointer leaves element |
| `keydown` | User presses a key |
| `submit` | Form is submitted |
| `play` | Media begins playing |
| `pause` | Media is paused |

### Event Objects

Event handler functions receive an **event object** automatically:

```javascript
function bgChange(e) {
  const rndCol = `rgb(${random(255)} ${random(255)} ${random(255)})`;
  e.target.style.backgroundColor = rndCol;
}

btn.addEventListener("click", bgChange);
```

**Keyboard Events:**

```javascript
const textBox = document.querySelector("#textBox");
const output = document.querySelector("#output");

textBox.addEventListener("keydown", (event) => {
  output.textContent = `You pressed "${event.key}".`;
});
```

### Preventing Default Behavior

```javascript
const form = document.querySelector("form");
const fname = document.getElementById("fname");
const lname = document.getElementById("lname");

form.addEventListener("submit", (e) => {
  if (fname.value === "" || lname.value === "") {
    e.preventDefault();
    para.textContent = "You need to fill in both names!";
  }
});
```

### Event Handler Properties (Not Recommended for Multiple Handlers)

```javascript
btn.onclick = () => {
  document.body.style.backgroundColor = rndCol;
};
```

Cannot add multiple listeners -- subsequent assignments overwrite previous ones.

---

## Object Basics

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Object_basics>

### What Are Objects?

An object is a collection of related data and/or functionality, consisting of:

- **Properties**: variables inside objects (data)
- **Methods**: functions inside objects (functionality)

### Object Literal Syntax

```javascript
const person = {
  name: ["Bob", "Smith"],
  age: 32,
  bio() {
    console.log(`${this.name[0]} ${this.name[1]} is ${this.age} years old.`);
  },
  introduceSelf() {
    console.log(`Hi! I'm ${this.name[0]}.`);
  },
};
```

### Dot Notation

```javascript
person.age;           // 32
person.bio();         // Calls the method
person.name.first;    // Access nested properties
```

### Bracket Notation

```javascript
person["age"];              // 32
person["name"]["first"];    // Nested access

// When property names are stored in variables
function logProperty(propertyName) {
  console.log(person[propertyName]);
}
logProperty("name");  // ["Bob", "Smith"]
```

### Setting Object Members

```javascript
// Update existing properties
person.age = 45;

// Create new properties
person["eyes"] = "hazel";
person.farewell = function () {
  console.log("Bye everybody!");
};

// Dynamic property creation (only bracket notation)
const myDataName = "height";
const myDataValue = "1.75m";
person[myDataName] = myDataValue;
```

### What is "this"?

The `this` keyword refers to the **current object the code is being executed in**:

```javascript
const person1 = {
  name: "Chris",
  introduceSelf() {
    console.log(`Hi! I'm ${this.name}.`);
  },
};

const person2 = {
  name: "Deepti",
  introduceSelf() {
    console.log(`Hi! I'm ${this.name}.`);
  },
};

person1.introduceSelf();  // "Hi! I'm Chris."
person2.introduceSelf();  // "Hi! I'm Deepti."
```

### Constructors

Functions called with the `new` keyword that create new objects:

```javascript
function Person(name) {
  this.name = name;
  this.introduceSelf = function () {
    console.log(`Hi! I'm ${this.name}.`);
  };
}

const salva = new Person("Salva");
salva.introduceSelf();  // "Hi! I'm Salva."

const frankie = new Person("Frankie");
frankie.introduceSelf();  // "Hi! I'm Frankie."
```

---

## DOM Scripting

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/DOM_scripting>

### What is the DOM?

The **Document Object Model (DOM)** is a tree structure representation created by the browser that enables HTML to be accessed by programming languages. Each entry in the tree is called a **node**.

### DOM Tree Relationships

- **Root node**: The top node (the `HTML` element)
- **Parent node**: A node that has other nodes inside it
- **Child node**: A node directly inside another node
- **Sibling nodes**: Nodes on the same level under the same parent
- **Descendant node**: A node anywhere inside another node

### Selecting Elements

```javascript
// querySelector - select first match (Recommended)
const link = document.querySelector("a");
const element = document.querySelector("#myId");
const element = document.querySelector(".myClass");

// querySelectorAll - select all matches (returns NodeList)
const paragraphs = document.querySelectorAll("p");

// Legacy methods
const elementRef = document.getElementById('myId');
const elementRefArray = document.getElementsByTagName('p');
```

### Creating and Inserting Elements

```javascript
const para = document.createElement("p");
para.textContent = "We hope you enjoyed the ride.";

const sect = document.querySelector("section");
sect.appendChild(para);

// Create a text node
const text = document.createTextNode(" -- the premier source.");
const linkPara = document.querySelector("p");
linkPara.appendChild(text);
```

### Moving and Removing Elements

```javascript
// Moving (appendChild on existing element moves it)
sect.appendChild(linkPara);

// Cloning
const clone = linkPara.cloneNode();       // Shallow clone
const deepClone = linkPara.cloneNode(true); // Deep clone

// Removing
sect.removeChild(linkPara);               // Using parent
linkPara.remove();                        // Modern method
linkPara.parentNode.removeChild(linkPara); // Older browsers
```

### Manipulating Content

```javascript
// textContent - plain text only (safer)
link.textContent = "Mozilla Developer Network";

// innerHTML - parses HTML (use with caution)
element.innerHTML = "<span>New content</span>";
```

### Manipulating Attributes

```javascript
link.href = "https://developer.mozilla.org";
element.getAttribute("class");
element.setAttribute("class", "newClass");
element.removeAttribute("id");
```

### Manipulating Styles

**Method 1: Inline Styles:**

```javascript
para.style.color = "white";
para.style.backgroundColor = "black";
para.style.padding = "10px";
para.style.width = "250px";
para.style.textAlign = "center";
```

Note: CSS hyphenated properties become camelCase in JavaScript (`background-color` becomes `backgroundColor`).

**Method 2: CSS Classes (Recommended):**

```javascript
para.classList.add("highlight");
para.classList.remove("highlight");
para.classList.toggle("highlight");
```

### Complete Practical Example: Dynamic Shopping List

```html
<h1>My shopping list</h1>
<form>
  <label for="item">Enter a new item:</label>
  <input type="text" name="item" id="item" />
  <button>Add item</button>
</form>
<ul></ul>
```

```javascript
const list = document.querySelector("ul");
const input = document.querySelector("input");
const button = document.querySelector("button");

button.addEventListener("click", (event) => {
  event.preventDefault();

  const myItem = input.value;
  input.value = "";

  const listItem = document.createElement("li");
  const listText = document.createElement("span");
  const listBtn = document.createElement("button");

  listItem.appendChild(listText);
  listText.textContent = myItem;
  listItem.appendChild(listBtn);
  listBtn.textContent = "Delete";
  list.appendChild(listItem);

  listBtn.addEventListener("click", () => {
    list.removeChild(listItem);
  });

  input.focus();
});
```

### Key Browser Objects

| Object | Description |
|--------|-------------|
| `window` | Represents the browser tab |
| `document` | The page loaded in the window |
| `navigator` | Browser state and identity |

---

## Network Requests

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Network_requests>

### The Fetch API

The main modern JavaScript API for making HTTP requests to retrieve resources from the server without full page reloads.

### Basic Syntax

```javascript
fetch(url)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.text();
  })
  .then((data) => {
    // Use the data
  })
  .catch((error) => {
    console.error(`Fetch problem: ${error.message}`);
  });
```

### Fetching Text Content

```javascript
function updateDisplay(verse) {
  verse = verse.replace(" ", "").toLowerCase();
  const url = `${verse}.txt`;

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return response.text();
    })
    .then((text) => {
      poemDisplay.textContent = text;
    })
    .catch((error) => {
      poemDisplay.textContent = `Could not fetch verse: ${error}`;
    });
}
```

### Fetching JSON Data

```javascript
fetch("products.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
  })
  .then((json) => initialize(json))
  .catch((err) => console.error(`Fetch problem: ${err.message}`));
```

### Fetching Binary Data (Blob)

```javascript
fetch(url)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.blob();
  })
  .then((blob) => showProduct(blob, product))
  .catch((err) => console.error(`Fetch problem: ${err.message}`));
```

### Core Response Methods

| Method | Use Case |
|--------|----------|
| `response.text()` | Plain text files |
| `response.json()` | JSON objects/arrays |
| `response.blob()` | Binary data (images, videos) |

### Error Handling

```javascript
.then((response) => {
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  return response.json();
})
.catch((error) => {
  console.error(`Fetch problem: ${error.message}`);
});
```

**Important**: `fetch()` only rejects on network failures, not HTTP error statuses (404, 500). Always check `response.ok` or `response.status`.

### XMLHttpRequest (Legacy Alternative)

```javascript
const request = new XMLHttpRequest();

try {
  request.open("GET", "products.json");
  request.responseType = "json";

  request.addEventListener("load", () => {
    initialize(request.response);
  });
  request.addEventListener("error", () => {
    console.error("XHR error");
  });

  request.send();
} catch (error) {
  console.error(`XHR error ${request.status}`);
}
```

Fetch is simpler and recommended over XMLHttpRequest.

---

## Working with JSON

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON>

### What is JSON?

**JSON (JavaScript Object Notation)** is a standard text-based format for representing structured data based on JavaScript object syntax, commonly used for transmitting data in web applications.

- Converting a string to a native object is called **deserialization**
- Converting a native object to a string is called **serialization**
- JSON files use the `.json` extension and `application/json` MIME type

### JSON Structure

```json
{
  "squadName": "Super hero squad",
  "homeTown": "Metro City",
  "formed": 2016,
  "secretBase": "Super tower",
  "active": true,
  "members": [
    {
      "name": "Molecule Man",
      "age": 29,
      "secretIdentity": "Dan Jukes",
      "powers": ["Radiation resistance", "Turning tiny", "Radiation blast"]
    }
  ]
}
```

### Valid JSON Data Types

- String literals, number literals, `true`, `false`, `null`
- Objects and arrays containing valid JSON types

**Not valid in JSON:**

- `undefined`, `NaN`, `Infinity`
- Functions or object types like `Date`, `Set`, `Map`
- Single quotes (must use double quotes)
- Trailing commas
- Comments

### Accessing JSON Data

```javascript
superHeroes.homeTown;                    // "Metro City"
superHeroes.members[1].powers[2];        // Third power of second hero
superHeroes[0].powers[0];               // For top-level arrays
```

### JSON.parse() -- String to Object

```javascript
const jsonString = '{"name":"John","age":30}';
const obj = JSON.parse(jsonString);
console.log(obj.name);  // "John"
```

### JSON.stringify() -- Object to String

```javascript
let myObj = { name: "Chris", age: 38 };
let myString = JSON.stringify(myObj);
console.log(myString);  // '{"name":"Chris","age":38}'
```

### Complete Example: Fetching and Displaying JSON

```javascript
async function populate() {
  const requestURL =
    "https://mdn.github.io/learning-area/javascript/oojs/json/superheroes.json";
  const request = new Request(requestURL);

  const response = await fetch(request);
  const superHeroes = await response.json();

  populateHeader(superHeroes);
  populateHeroes(superHeroes);
}

function populateHeader(obj) {
  const header = document.querySelector("header");
  const myH1 = document.createElement("h1");
  myH1.textContent = obj.squadName;
  header.appendChild(myH1);

  const myPara = document.createElement("p");
  myPara.textContent = `Hometown: ${obj.homeTown} // Formed: ${obj.formed}`;
  header.appendChild(myPara);
}

function populateHeroes(obj) {
  const section = document.querySelector("section");
  const heroes = obj.members;

  for (const hero of heroes) {
    const myArticle = document.createElement("article");
    const myH2 = document.createElement("h2");
    myH2.textContent = hero.name;
    myArticle.appendChild(myH2);

    const myPara = document.createElement("p");
    myPara.textContent = `Secret identity: ${hero.secretIdentity}`;
    myArticle.appendChild(myPara);

    section.appendChild(myArticle);
  }
}

populate();
```

---

## JavaScript Frameworks: Main Features

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/Main_features>

### Domain-Specific Languages (DSLs)

**JSX (JavaScript and XML):**

```jsx
const subject = "World";
const header = (
  <header>
    <h1>Hello, {subject}!</h1>
  </header>
);
```

Compiles to:

```javascript
const header = React.createElement(
  "header",
  null,
  React.createElement("h1", null, "Hello, ", subject, "!"),
);
```

**Handlebars (Ember):**

```handlebars
<header>
  <h1>Hello, {{subject}}!</h1>
</header>
```

**TypeScript (Angular):**

```typescript
function add(a: number, b: number) {
  return a + b;
}
```

### Component Props and State

**Props (External Data):**

```jsx
function AuthorCredit(props) {
  return (
    <figure>
      <img src={props.src} alt={props.alt} />
      <figcaption>{props.byline}</figcaption>
    </figure>
  );
}

<AuthorCredit
  src="./assets/zelda.png"
  alt="Portrait of Zelda Schiff"
  byline="Zelda Schiff is editor-in-chief of the Library Times."
/>
```

**State (Internal Data):**

```jsx
function CounterButton() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

### Rendering Approaches

| Approach | Used By | Description |
|----------|---------|-------------|
| **Virtual DOM** | React, Vue | Stores DOM info in JS memory, diffs with real DOM, applies changes |
| **Incremental DOM** | Angular | Doesn't create complete copy, ignores unchanged parts |
| **Glimmer VM** | Ember | Transpiles templates into bytecode |

### Dependency Injection

Solutions to "prop drilling" (passing data through many nesting levels):

- **Angular**: Dependency injection system
- **Vue**: `provide()` and `inject()` methods
- **React**: Context API
- **Ember**: Services

### Testing Example (React Testing Library)

```jsx
import { fireEvent, render, screen } from "@testing-library/react";
import CounterButton from "./CounterButton";

it("Renders a semantic button with an initial state of 0", () => {
  render(<CounterButton />);
  const btn = screen.getByRole("button");
  expect(btn).toBeInTheDocument();
  expect(btn).toHaveTextContent("Clicked 0 times");
});

it("Increments the count when clicked", () => {
  render(<CounterButton />);
  const btn = screen.getByRole("button");
  fireEvent.click(btn);
  expect(btn).toHaveTextContent("Clicked 1 times");
});
```

---

## Getting Started with React

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/React_getting_started>

### What is React?

React is **a library for building user interfaces**. It is not a framework -- it is a reusable library used with other libraries like ReactDOM for web development. Its primary goal is to minimize bugs when building UIs through the use of **components**.

### Environment Setup

Requirements:

- **Node.js** (v18 or later; v20 LTS recommended)
- **npm** (comes with Node.js)

### Creating a React App with Vite

```bash
npm create vite@latest moz-todo-react -- --template react
cd moz-todo-react && npm install
npm run dev -- --open --port 3000
```

### Project Structure

```
moz-todo-react/
  index.html              (Entry HTML file)
  package.json            (Project metadata & dependencies)
  src/
    App.jsx               (Main component)
    App.css
    main.jsx              (Entry point - imports App)
    index.css             (Global styles)
    assets/
  vite.config.js
```

### Understanding JSX

JSX extends JavaScript to allow HTML-like code alongside JavaScript:

```jsx
const heading = <h1>Mozilla Developer Network</h1>;
```

Attributes use `className` instead of `class`:

```jsx
<button type="button" className="primary">
  Click me!
</button>
```

### Basic Component

```jsx
import "./App.css";

function App() {
  return (
    <>
      <header>
        <h1>Hello, World!</h1>
        <button type="button">Click me!</button>
      </header>
    </>
  );
}

export default App;
```

### Fragments

Use `<>` (fragments) to return multiple elements without extra `<div>` wrappers:

```jsx
return (
  <>
    <header>Content</header>
    <main>More content</main>
  </>
);
```

### JavaScript Expressions in JSX

Use curly braces `{}` to embed JavaScript expressions:

```jsx
const subject = "React";

function App() {
  return (
    <>
      <h1>Hello, {subject}!</h1>
      <h1>Hello, {subject.toUpperCase()}!</h1>
      <h1>Hello, {2 + 2}!</h1>
    </>
  );
}
```

### Props (Component Properties)

Props pass data from parent to child components (unidirectional data flow):

```jsx
// main.jsx
<App subject="Clarice" />

// App.jsx
function App(props) {
  return (
    <header>
      <h1>Hello, {props.subject}!</h1>
    </header>
  );
}
```

### Rendering the App

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App subject="Clarice" />
  </StrictMode>
);
```

---

## React Components

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/React_components>

### Creating Components

A functional component is a JavaScript function that returns JSX:

```jsx
function Todo(props) {
  return (
    <li className="todo stack-small">
      <div className="c-cb">
        <input id={props.id} type="checkbox" defaultChecked={props.completed} />
        <label className="todo-label" htmlFor={props.id}>
          {props.name}
        </label>
      </div>
      <div className="btn-group">
        <button type="button" className="btn">
          Edit <span className="visually-hidden">{props.name}</span>
        </button>
        <button type="button" className="btn btn__danger">
          Delete <span className="visually-hidden">{props.name}</span>
        </button>
      </div>
    </li>
  );
}

export default Todo;
```

### Passing Props

```jsx
<ul role="list" className="todo-list">
  <Todo name="Eat" id="todo-0" completed />
  <Todo name="Sleep" id="todo-1" />
  <Todo name="Repeat" id="todo-2" />
</ul>
```

### Rendering Lists with map()

```jsx
const DATA = [
  { id: "todo-0", name: "Eat", completed: true },
  { id: "todo-1", name: "Sleep", completed: false },
  { id: "todo-2", name: "Repeat", completed: false },
];

function App(props) {
  const taskList = props.tasks?.map((task) => (
    <Todo
      id={task.id}
      name={task.name}
      completed={task.completed}
      key={task.id}
    />
  ));

  return (
    <ul
      role="list"
      className="todo-list stack-large stack-exception"
      aria-labelledby="list-heading">
      {taskList}
    </ul>
  );
}
```

### Unique Keys

Always provide a unique `key` prop to items rendered with iteration:

```jsx
const taskList = props.tasks?.map((task) => (
  <Todo
    id={task.id}
    name={task.name}
    completed={task.completed}
    key={task.id}
  />
));
```

React uses keys to track which items have changed, been added, or removed.

### Component Architecture Example

```jsx
// src/components/Form.jsx
function Form() {
  return (
    <form>
      <h2 className="label-wrapper">
        <label htmlFor="new-todo-input" className="label__lg">
          What needs to be done?
        </label>
      </h2>
      <input
        type="text"
        id="new-todo-input"
        className="input input__lg"
        name="text"
        autoComplete="off"
      />
      <button type="submit" className="btn btn__primary btn__lg">
        Add
      </button>
    </form>
  );
}

export default Form;
```

```jsx
// src/App.jsx
import Form from "./components/Form";
import FilterButton from "./components/FilterButton";
import Todo from "./components/Todo";

function App(props) {
  const taskList = props.tasks?.map((task) => (
    <Todo
      id={task.id}
      name={task.name}
      completed={task.completed}
      key={task.id}
    />
  ));

  return (
    <div className="todoapp stack-large">
      <h1>TodoMatic</h1>
      <Form />
      <div className="filters btn-group stack-exception">
        <FilterButton />
        <FilterButton />
        <FilterButton />
      </div>
      <h2 id="list-heading">3 tasks remaining</h2>
      <ul
        role="list"
        className="todo-list stack-large stack-exception"
        aria-labelledby="list-heading">
        {taskList}
      </ul>
    </div>
  );
}

export default App;
```

---

## A First Splash into JavaScript

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/A_first_splash>

### Thinking Like a Programmer

Programming requires breaking problems into actionable tasks, applying syntax to real-world problems, and understanding how features work together.

### Number Guessing Game: Complete Example

```javascript
let randomNumber = Math.floor(Math.random() * 100) + 1;

const guesses = document.querySelector(".guesses");
const lastResult = document.querySelector(".lastResult");
const lowOrHi = document.querySelector(".lowOrHi");
const guessSubmit = document.querySelector(".guessSubmit");
const guessField = document.querySelector(".guessField");

let guessCount = 1;
let resetButton;

function checkGuess() {
  const userGuess = Number(guessField.value);

  if (guessCount === 1) {
    guesses.textContent = "Previous guesses:";
  }
  guesses.textContent = `${guesses.textContent} ${userGuess}`;

  if (userGuess === randomNumber) {
    lastResult.textContent = "Congratulations! You got it right!";
    lastResult.style.backgroundColor = "green";
    lowOrHi.textContent = "";
    setGameOver();
  } else if (guessCount === 10) {
    lastResult.textContent = "!!!GAME OVER!!!";
    lowOrHi.textContent = "";
    setGameOver();
  } else {
    lastResult.textContent = "Wrong!";
    lastResult.style.backgroundColor = "red";
    if (userGuess < randomNumber) {
      lowOrHi.textContent = "Last guess was too low!";
    } else if (userGuess > randomNumber) {
      lowOrHi.textContent = "Last guess was too high!";
    }
  }

  guessCount++;
  guessField.value = "";
  guessField.focus();
}

guessSubmit.addEventListener("click", checkGuess);

function setGameOver() {
  guessField.disabled = true;
  guessSubmit.disabled = true;
  resetButton = document.createElement("button");
  resetButton.textContent = "Start new game";
  document.body.appendChild(resetButton);
  resetButton.addEventListener("click", resetGame);
}

function resetGame() {
  guessCount = 1;

  const resetParas = document.querySelectorAll(".resultParas p");
  for (const resetPara of resetParas) {
    resetPara.textContent = "";
  }

  resetButton.parentNode.removeChild(resetButton);

  guessField.disabled = false;
  guessSubmit.disabled = false;
  guessField.value = "";
  guessField.focus();

  lastResult.style.backgroundColor = "white";

  randomNumber = Math.floor(Math.random() * 100) + 1;
}
```

### Key Techniques Demonstrated

- `Math.floor(Math.random() * 100) + 1` -- generate random integer
- `Number()` constructor -- convert input to a number
- `document.querySelector()` -- select DOM elements
- `.textContent` -- set text in elements
- `.style.backgroundColor` -- change element styling
- `.disabled` -- disable/enable form elements
- `document.createElement()` -- create new HTML elements
- `.appendChild()` / `.removeChild()` -- add/remove elements from DOM
- `addEventListener()` -- attach event listeners
- `.focus()` -- return focus to input field

---

## JavaScript Learning Module Overview

> Source: <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting>

### Topics Covered in the MDN Learning Path

**Core Language Fundamentals:**

1. What is JavaScript?
2. A first splash into JavaScript
3. Troubleshooting JavaScript
4. Variables
5. Numbers and operators
6. Strings
7. Useful string methods
8. Arrays

**Control Flow and Functions:**
9. Conditionals
10. Loops
11. Functions
12. Build your own function
13. Function return values

**Events and DOM Manipulation:**
14. Introduction to events
15. Event bubbling
16. Object basics
17. DOM scripting

**APIs and Data:**
18. Making network requests
19. Working with JSON

**Error Handling:**
20. JavaScript debugging and error handling

### Practical Challenges

- **Silly story generator** -- Variables, math, strings, arrays
- **Image gallery** -- Loops, functions, conditionals, events
- **House data UI** -- JSON fetching, filtering, rendering

---

## JavaScript Built-in Objects Quick Reference

> Source: <https://www.w3schools.com/jsref/jsref_reference.asp> (partial -- access was restricted)

### Core Objects and Common Methods

**Array Methods:**
`concat()`, `every()`, `filter()`, `find()`, `findIndex()`, `forEach()`, `from()`, `includes()`, `indexOf()`, `isArray()`, `join()`, `keys()`, `lastIndexOf()`, `map()`, `of()`, `pop()`, `push()`, `reduce()`, `reduceRight()`, `reverse()`, `shift()`, `slice()`, `some()`, `sort()`, `splice()`, `toString()`, `unshift()`, `values()`

**String Methods:**
`charAt()`, `charCodeAt()`, `concat()`, `endsWith()`, `fromCharCode()`, `includes()`, `indexOf()`, `lastIndexOf()`, `match()`, `matchAll()`, `padEnd()`, `padStart()`, `repeat()`, `replace()`, `replaceAll()`, `search()`, `slice()`, `split()`, `startsWith()`, `substring()`, `toLowerCase()`, `toUpperCase()`, `trim()`, `trimEnd()`, `trimStart()`

**Number Methods:**
`isFinite()`, `isInteger()`, `isNaN()`, `isSafeInteger()`, `parseFloat()`, `parseInt()`, `toExponential()`, `toFixed()`, `toLocaleString()`, `toPrecision()`, `toString()`

**Math Methods:**
`abs()`, `acos()`, `asin()`, `atan()`, `atan2()`, `cbrt()`, `ceil()`, `cos()`, `exp()`, `floor()`, `log()`, `max()`, `min()`, `pow()`, `random()`, `round()`, `sign()`, `sin()`, `sqrt()`, `tan()`, `trunc()`

**Date Methods:**
`getDate()`, `getDay()`, `getFullYear()`, `getHours()`, `getMilliseconds()`, `getMinutes()`, `getMonth()`, `getSeconds()`, `getTime()`, `now()`, `parse()`, `setDate()`, `setFullYear()`, `setHours()`, `setMilliseconds()`, `setMinutes()`, `setMonth()`, `setSeconds()`, `toDateString()`, `toISOString()`, `toJSON()`, `toLocaleDateString()`, `toLocaleString()`, `toLocaleTimeString()`, `toString()`, `toTimeString()`, `toUTCString()`

**JSON Methods:**
`JSON.parse()`, `JSON.stringify()`

**Global Functions:**
`decodeURI()`, `decodeURIComponent()`, `encodeURI()`, `encodeURIComponent()`, `eval()`, `isFinite()`, `isNaN()`, `Number()`, `parseFloat()`, `parseInt()`, `String()`

**Promise Methods:**
`Promise.all()`, `Promise.allSettled()`, `Promise.any()`, `Promise.race()`, `Promise.reject()`, `Promise.resolve()`, `.then()`, `.catch()`, `.finally()`

---

*This reference was compiled from the following sources:*

1. *<https://www.w3schools.com/jsref/jsref_reference.asp>*
2. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting>*
3. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript>*
4. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/A_first_splash>*
5. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Variables>*
6. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Math>*
7. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Strings>*
8. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Useful_string_methods>*
9. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Arrays>*
10. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Conditionals>*
11. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Loops>*
12. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Functions>*
13. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Build_your_own_function>*
14. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Return_values>*
15. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Events>*
16. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Object_basics>*
17. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/React_components>*
18. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/React_getting_started>*
19. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/Main_features>*
20. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/DOM_scripting>*
21. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Network_requests>*
22. *<https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON>*
