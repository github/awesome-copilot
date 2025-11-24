---
description: 'Instructions for writing Dart and Flutter code following the official recommendations.'
applyTo: '**/*.dart'
---

# Dart and Flutter

Best practices recommended by the Dart and Flutter teams. These instructions were taken from [Effective Dart](https://dart.dev/effective-dart) and [Architecture Recommendations](https://docs.flutter.dev/app-architecture/recommendations).

## Effective Dart

Over the past several years, we've written a ton of Dart code and learned a lot about what works well and what doesn't. We're sharing this with you so you can write consistent, robust, fast code too. There are two overarching themes:

1.  **Be consistent.** When it comes to things like formatting, and casing, arguments about which is better are subjective and impossible to resolve. What we do know is that being *consistent* is objectively helpful.

    If two pieces of code look different it should be because they *are* different in some meaningful way. When a bit of code stands out and catches your eye, it should do so for a useful reason.

2.  **Be brief.** Dart was designed to be familiar, so it inherits many of the same statements and expressions as C, Java, JavaScript and other languages. But we created Dart because there is a lot of room to improve on what those languages offer. We added a bunch of features, from string interpolation to initializing formals, to help you express your intent more simply and easily.

    If there are multiple ways to say something, you should generally pick the most concise one. This is not to say you should `code golf` yourself into cramming a whole program into a single line. The goal is code that is *economical*, not *dense*.

### The topics

We split the guidelines into a few separate topics for easy digestion:

*   **Style** – This defines the rules for laying out and organizing code, or at least the parts that `dart format` doesn't handle for you. The style topic also specifies how identifiers are formatted: `camelCase`, `using_underscores`, etc.

*   **Documentation** – This tells you everything you need to know about what goes inside comments. Both doc comments and regular, run-of-the-mill code comments.

*   **Usage** – This teaches you how to make the best use of language features to implement behavior. If it's in a statement or expression, it's covered here.

*   **Design** – This is the softest topic, but the one with the widest scope. It covers what we've learned about designing consistent, usable APIs for libraries. If it's in a type signature or declaration, this goes over it.

### How to read the topics

Each topic is broken into a few sections. Sections contain a list of guidelines. Each guideline starts with one of these words:

*   **DO** guidelines describe practices that should always be followed. There will almost never be a valid reason to stray from them.

*   **DON'T** guidelines are the converse: things that are almost never a good idea. Hopefully, we don't have as many of these as other languages do because we have less historical baggage.

*   **PREFER** guidelines are practices that you *should* follow. However, there may be circumstances where it makes sense to do otherwise. Just make sure you understand the full implications of ignoring the guideline when you do.

*   **AVOID** guidelines are the dual to "prefer": stuff you shouldn't do but where there may be good reasons to on rare occasions.

*   **CONSIDER** guidelines are practices that you might or might not want to follow, depending on circumstances, precedents, and your own preference.

Some guidelines describe an **exception** where the rule does *not* apply. When listed, the exceptions may not be exhaustive—you might still need to use your judgement on other cases.

This sounds like the police are going to beat down your door if you don't have your laces tied correctly. Things aren't that bad. Most of the guidelines here are common sense and we're all reasonable people. The goal, as always, is nice, readable and maintainable code.

### Rules

#### Style

##### Identifiers

*   DO name types using `UpperCamelCase`.
*   DO name extensions using `UpperCamelCase`.
*   DO name packages, directories, and source files using `lowercase_with_underscores`.
*   DO name import prefixes using `lowercase_with_underscores`.
*   DO name other identifiers using `lowerCamelCase`.
*   PREFER using `lowerCamelCase` for constant names.
*   DO capitalize acronyms and abbreviations longer than two letters like words.
*   PREFER using wildcards for unused callback parameters.
*   DON'T use a leading underscore for identifiers that aren't private.
*   DON'T use prefix letters.
*   DON'T explicitly name libraries.

##### Ordering

*   DO place `dart:` imports before other imports.
*   DO place `package:` imports before relative imports.
*   DO specify exports in a separate section after all imports.
*   DO sort sections alphabetically.

##### Formatting

*   DO format your code using `dart format`.
*   CONSIDER changing your code to make it more formatter-friendly.
*   PREFER lines 80 characters or fewer.
*   DO use curly braces for all flow control statements.

#### Documentation

##### Comments

*   DO format comments like sentences.
*   DON'T use block comments for documentation.

##### Doc comments

*   DO use `///` doc comments to document members and types.
*   PREFER writing doc comments for public APIs.
*   CONSIDER writing a library-level doc comment.
*   CONSIDER writing doc comments for private APIs.
*   DO start doc comments with a single-sentence summary.
*   DO separate the first sentence of a doc comment into its own paragraph.
*   AVOID redundancy with the surrounding context.
*   PREFER starting comments of a function or method with third-person verbs if its main purpose is a side effect.
*   PREFER starting a non-boolean variable or property comment with a noun phrase.
*   PREFER starting a boolean variable or property comment with "Whether" followed by a noun or gerund phrase.
*   PREFER a noun phrase or non-imperative verb phrase for a function or method if returning a value is its primary purpose.
*   DON'T write documentation for both the getter and setter of a property.
*   PREFER starting library or type comments with noun phrases.
*   CONSIDER including code samples in doc comments.
*   DO use square brackets in doc comments to refer to in-scope identifiers.
*   DO use prose to explain parameters, return values, and exceptions.
*   DO put doc comments before metadata annotations.

##### Markdown

*   AVOID using markdown excessively.
*   AVOID using HTML for formatting.
*   PREFER backtick fences for code blocks.

##### Writing

*   PREFER brevity.
*   AVOID abbreviations and acronyms unless they are obvious.
*   PREFER using "this" instead of "the" to refer to a member's instance.

#### Usage

##### Libraries

*   DO use strings in `part of` directives.
*   DON'T import libraries that are inside the `src` directory of another package.
*   DON'T allow an import path to reach into or out of `lib`.
*   PREFER relative import paths.

##### Null

*   DON'T explicitly initialize variables to `null`.
*   DON'T use an explicit default value of `null`.
*   DON'T use `true` or `false` in equality operations.
*   AVOID `late` variables if you need to check whether they are initialized.
*   CONSIDER type promotion or null-check patterns for using nullable types.

##### Strings

*   DO use adjacent strings to concatenate string literals.
*   PREFER using interpolation to compose strings and values.
*   AVOID using curly braces in interpolation when not needed.

##### Collections

*   DO use collection literals when possible.
*   DON'T use `.length` to see if a collection is empty.
*   AVOID using `Iterable.forEach()` with a function literal.
*   DON'T use `List.from()` unless you intend to change the type of the result.
*   DO use `whereType()` to filter a collection by type.
*   DON'T use `cast()` when a nearby operation will do.
*   AVOID using `cast()`.

##### Functions

*   DO use a function declaration to bind a function to a name.
*   DON'T create a lambda when a tear-off will do.

##### Variables

*   DO follow a consistent rule for `var` and `final` on local variables.
*   AVOID storing what you can calculate.

##### Members

*   DON'T wrap a field in a getter and setter unnecessarily.
*   PREFER using a `final` field to make a read-only property.
*   CONSIDER using `=>` for simple members.
*   DON'T use `this.` except to redirect to a named constructor or to avoid shadowing.
*   DO initialize fields at their declaration when possible.

##### Constructors

*   DO use initializing formals when possible.
*   DON'T use `late` when a constructor initializer list will do.
*   DO use `;` instead of `{}` for empty constructor bodies.
*   DON'T use `new`.
*   DON'T use `const` redundantly.

##### Error handling

*   AVOID catches without `on` clauses.
*   DON'T discard errors from catches without `on` clauses.
*   DO throw objects that implement `Error` only for programmatic errors.
*   DON'T explicitly catch `Error` or types that implement it.
*   DO use `rethrow` to rethrow a caught exception.

##### Asynchrony

*   PREFER async/await over using raw futures.
*   DON'T use `async` when it has no useful effect.
*   CONSIDER using higher-order methods to transform a stream.
*   AVOID using Completer directly.
*   DO test for `Future<T>` when disambiguating a `FutureOr<T>` whose type argument could be `Object`.

#### Design

##### Names

*   DO use terms consistently.
*   AVOID abbreviations.
*   PREFER putting the most descriptive noun last.
*   CONSIDER making the code read like a sentence.
*   PREFER a noun phrase for a non-boolean property or variable.
*   PREFER a non-imperative verb phrase for a boolean property or variable.
*   CONSIDER omitting the verb for a named boolean parameter.
*   PREFER the "positive" name for a boolean property or variable.
*   PREFER an imperative verb phrase for a function or method whose main purpose is a side effect.
*   PREFER a noun phrase or non-imperative verb phrase for a function or method if returning a value is its primary purpose.
*   CONSIDER an imperative verb phrase for a function or method if you want to draw attention to the work it performs.
*   AVOID starting a method name with `get`.
*   PREFER naming a method `to...()` if it copies the object's state to a new object.
*   PREFER naming a method `as...()` if it returns a different representation backed by the original object.
*   AVOID describing the parameters in the function's or method's name.
*   DO follow existing mnemonic conventions when naming type parameters.

##### Libraries

*   PREFER making declarations private.
*   CONSIDER declaring multiple classes in the same library.

##### Classes and mixins

*   AVOID defining a one-member abstract class when a simple function will do.
*   AVOID defining a class that contains only static members.
*   AVOID extending a class that isn't intended to be subclassed.
*   DO use class modifiers to control if your class can be extended.
*   AVOID implementing a class that isn't intended to be an interface.
*   DO use class modifiers to control if your class can be an interface.
*   PREFER defining a pure `mixin` or pure `class` to a `mixin class`.

##### Constructors

*   CONSIDER making your constructor `const` if the class supports it.

##### Members

*   PREFER making fields and top-level variables `final`.
*   DO use getters for operations that conceptually access properties.
*   DO use setters for operations that conceptually change properties.
*   DON'T define a setter without a corresponding getter.
*   AVOID using runtime type tests to fake overloading.
*   AVOID public `late final` fields without initializers.
*   AVOID returning nullable `Future`, `Stream`, and collection types.
*   AVOID returning `this` from methods just to enable a fluent interface.

##### Types

*   DO type annotate variables without initializers.
*   DO type annotate fields and top-level variables if the type isn't obvious.
*   DON'T redundantly type annotate initialized local variables.
*   DO annotate return types on function declarations.
*   DO annotate parameter types on function declarations.
*   DON'T annotate inferred parameter types on function expressions.
*   DON'T type annotate initializing formals.
*   DO write type arguments on generic invocations that aren't inferred.
*   DON'T write type arguments on generic invocations that are inferred.
*   AVOID writing incomplete generic types.
*   DO annotate with `dynamic` instead of letting inference fail.
*   PREFER signatures in function type annotations.
*   DON'T specify a return type for a setter.
*   DON'T use the legacy typedef syntax.
*   PREFER inline function types over typedefs.
*   PREFER using function type syntax for parameters.
*   AVOID using `dynamic` unless you want to disable static checking.
*   DO use `Future<void>` as the return type of asynchronous members that do not produce values.
*   AVOID using `FutureOr<T>` as a return type.

##### Parameters

*   AVOID positional boolean parameters.
*   AVOID optional positional parameters if the user may want to omit earlier parameters.
*   AVOID mandatory parameters that accept a special "no argument" value.
*   DO use inclusive start and exclusive end parameters to accept a range.

##### Equality

*   DO override `hashCode` if you override `==`.
*   DO make your `==` operator obey the mathematical rules of equality.
*   AVOID defining custom equality for mutable classes.
*   DON'T make the parameter to `==` nullable.

---

## Flutter Architecture Recommendations

This page presents architecture best practices, why they matter, and
whether we recommend them for your Flutter application.
You should treat these recommendations as recommendations,
and not steadfast rules, and you should
adapt them to your app's unique requirements.

The best practices on this page have a priority,
which reflects how strongly the Flutter team recommends it.

* **Strongly recommend:** You should always implement this recommendation if
  you're starting to build a new application. You should strongly consider
  refactoring an existing app to implement this practice unless doing so would
  fundamentally clash with your current approach.
* **Recommend**: This practice will likely improve your app.
* **Conditional**: This practice can improve your app in certain circumstances.

### Separation of concerns

You should separate your app into a UI layer and a data layer. Within those layers, you should further separate logic into classes by responsibility.

#### Use clearly defined data and UI layers.
**Strongly recommend**

Separation of concerns is the most important architectural principle.
The data layer exposes application data to the rest of the app, and contains most of the business logic in your application.
The UI layer displays application data and listens for user events from users. The UI layer contains separate classes for UI logic and widgets.

#### Use the repository pattern in the data layer.
**Strongly recommend**

The repository pattern is a software design pattern that isolates the data access logic from the rest of the application.
It creates an abstraction layer between the application's business logic and the underlying data storage mechanisms (databases, APIs, file systems, etc.).
In practice, this means creating Repository classes and Service classes.

#### Use ViewModels and Views in the UI layer. (MVVM)
**Strongly recommend**

Separation of concerns is the most important architectural principle.
This particular separation makes your code much less error prone because your widgets remain "dumb".

#### Use `ChangeNotifiers` and `Listenables` to handle widget updates.
**Conditional**

> There are many options to handle state-management, and ultimately the decision comes down to personal preference.

The `ChangeNotifier` API is part of the Flutter SDK, and is a convenient way to have your widgets observe changes in your ViewModels.

#### Do not put logic in widgets.
**Strongly recommend**

Logic should be encapsulated in methods on the ViewModel. The only logic a view should contain is:
* Simple if-statements to show and hide widgets based on a flag or nullable field in the ViewModel
* Animation logic that relies on the widget to calculate
* Layout logic based on device information, like screen size or orientation.
* Simple routing logic

#### Use a domain layer.
**Conditional**

> Use in apps with complex logic requirements.

A domain layer is only needed if your application has exceeding complex logic that crowds your ViewModels,
or if you find yourself repeating logic in ViewModels.
In very large apps, use-cases are useful, but in most apps they add unnecessary overhead.

### Handling data

Handling data with care makes your code easier to understand, less error prone, and
prevents malformed or unexpected data from being created.

#### Use unidirectional data flow.
**Strongly recommend**

Data updates should only flow from the data layer to the UI layer.
Interactions in the UI layer are sent to the data layer where they're processed.

#### Use `Commands` to handle events from user interaction.
**Recommend**

Commands prevent rendering errors in your app, and standardize how the UI layer sends events to the data layer.

#### Use immutable data models.
**Strongly recommend**

Immutable data is crucial in ensuring that any necessary changes occur only in the proper place, usually the data or domain layer.
Because immutable objects can't be modified after creation, you must create a new instance to reflect changes.
This process prevents accidental updates in the UI layer and supports a clear, unidirectional data flow.

#### Use freezed or built_value to generate immutable data models.
**Recommend**

You can use packages to help generate useful functionality in your data models, `freezed` or `built_value`.
These can generate common model methods like JSON ser/des, deep equality checking and copy methods.
These code generation packages can add significant build time to your applications if you have a lot of models.

#### Create separate API models and domain models.
**Conditional**

> Use in large apps.

Using separate models adds verbosity, but prevents complexity in ViewModels and use-cases.

### App structure

Well organized code benefits both the health of the app itself, and the team working on the code.

#### Use dependency injection.
**Strongly recommend**

Dependency injection prevents your app from having globally accessible objects, which makes your code less error prone.
We recommend you use the `provider` package to handle dependency injection.

#### Use `go_router` for navigation.
**Recommend**

Go_router is the preferred way to write 90% of Flutter applications.
There are some specific use-cases that go_router doesn't solve,
in which case you can use the `Flutter Navigator API` directly or try other packages found on `pub.dev`.

#### Use standardized naming conventions for classes, files and directories.
**Recommend**

We recommend naming classes for the architectural component they represent.
For example, you may have the following classes:

* HomeViewModel
* HomeScreen
* UserRepository
* ClientApiService

For clarity, we do not recommend using names that can be confused with objects from the Flutter SDK.
For example, you should put your shared widgets in a directory called `ui/core/`,
rather than a directory called `/widgets`.

#### Use abstract repository classes
**Strongly recommend**

Repository classes are the sources of truth for all data in your app,
and facilitate communication with external APIs.
Creating abstract repository classes allows you to create different implementations,
which can be used for different app environments, such as "development" and "staging".

### Testing

Good testing practices makes your app flexible.
It also makes it straightforward and low risk to add new logic and new UI.

#### Test architectural components separately, and together.
**Strongly recommend**

* Write unit tests for every service, repository and ViewModel class. These tests should test the logic of every method individually.
* Write widget tests for views. Testing routing and dependency injection are particularly important.

#### Make fakes for testing (and write code that takes advantage of fakes.)
**Strongly recommend**

Fakes aren't concerned with the inner workings of any given method as much
as they're concerned with inputs and outputs. If you have this in mind while writing application code,
you're forced to write modular, lightweight functions and classes with well defined inputs and outputs.
