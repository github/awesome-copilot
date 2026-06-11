---
description: 'Best practices for applying Object-Oriented Programming (OOP) design patterns, including Gang of Four (GoF) patterns and SOLID principles, to ensure clean, maintainable, and scalable code.'
applyTo: '**/*.py, **/*.java, **/*.ts, **/*.js, **/*.cs'
---


# Design Patterns for Object-Oriented Programming for Clean Code

These instructions configure GitHub Copilot to prioritize Gang of Four (GoF) Design Patterns, SOLID principles, and clean Object-Oriented Programming (OOP) practices when generating or refactoring code.

## Core Architectural Philosophy

- **Program to an Interface, not an Implementation:** Always favor abstract classes or interfaces over concrete implementations. Use dependency injection to provide concrete instances.
- **Favor Object Composition over Class Inheritance:** Use composition to combine behaviors dynamically at runtime. Avoid deep inheritance trees. Use Delegation where appropriate to reuse behavior without breaking encapsulation.
- **Encapsulate What Varies:** Identify the aspects of the application that vary and separate them from what stays the same. Use patterns like Strategy, State, or Bridge to isolate these variations.
- **Loose Coupling:** Minimize direct dependencies between classes. Use Mediator, Observer, or abstract factories to keep components decoupled.

## Creational Patterns Guidelines

When generating code that involves object creation or instantiation, apply these patterns to decouple the system from how its objects are created:

- **Abstract Factory:** Use when a system must be configured with one of multiple families of related products (e.g., cross-platform UI widgets). Ensure clients only interact with the abstract factory and abstract product interfaces.
- **Factory Method:** Use when a class cannot anticipate the class of objects it must create. Defer instantiation to subclasses.
- **Builder:** Use when constructing a complex object requires a step-by-step process, especially when the same construction process can yield different representations.
- **Singleton:** Use *only* when absolutely necessary to guarantee a single instance of a class and provide a global access point (e.g., a central configuration manager or a hardware interface). Prefer Dependency Injection over strict Singletons where possible.
- **Prototype:** Use to avoid building a class hierarchy of factories or when creating an object from scratch is more expensive than cloning an existing one.

## Structural Patterns Guidelines

When generating code that defines how classes and objects are composed to form larger structures, apply these patterns:

- **Adapter:** Use to make incompatible interfaces work together. Prefer Object Adapters (using composition) over Class Adapters (using multiple inheritance) for greater flexibility.
- **Bridge:** Use to separate an abstraction from its implementation so the two can vary independently (e.g., separating a high-level `Window` concept from platform-specific `WindowImpl` logic).
- **Composite:** Use to represent part-whole hierarchies. Ensure clients can treat individual objects and compositions of objects uniformly via a common `Component` interface.
- **Decorator:** Use to attach additional responsibilities to an object dynamically. Prefer this over subclassing for extending functionality to prevent class explosion. Ensure the Decorator has the exact same interface as the component it decorates.
- **Facade:** Use to provide a simple, unified interface to a complex subsystem.
- **Flyweight:** Use to minimize memory usage or computational expenses by sharing as much as possible with similar objects.
- **Proxy:** Use to provide a surrogate or placeholder for another object to control access to it (e.g., lazy loading, access control, or remote communication).

## Behavioral Patterns Guidelines

When generating code involving algorithms, control flow, or communication between objects, apply these patterns:

- **Strategy:** Use to define a family of algorithms, encapsulate each one, and make them interchangeable. Eliminate complex conditional logic (`switch`/`if-else`) that selects behavior by delegating to a Strategy object.
- **Observer:** Use to define a one-to-many dependency where a change in one object (Subject) automatically notifies and updates others (Observers). Keep subjects and observers loosely coupled.
- **Command:** Use to encapsulate a request as an object. This is essential for implementing undo/redo functionality, queues, or logging requests.
- **State:** Use when an object's behavior depends heavily on its internal state, and it must change its behavior at runtime. Represent each state as a separate class.
- **Template Method:** Use to define the skeleton of an algorithm in a base class, deferring specific steps to subclasses without changing the algorithm's structure.
- **Chain of Responsibility:** Use to pass a request along a chain of potential handlers until one handles it, avoiding coupling the sender to a specific receiver.
- **Mediator:** Use to centralize complex communications and control logic between a set of objects, keeping them from referring to each other explicitly.
- **Iterator:** Use to provide a standard way to sequentially access elements of an aggregate object without exposing its underlying representation.
- **Visitor:** Use to define a new operation on an object structure without changing the classes of the elements on which it operates. This is highly effective for performing different analyses on stable composite structures (like Abstract Syntax Trees).
- **Memento:** Use to capture and externalize an object's internal state without violating encapsulation, allowing the object to be restored later (useful for complex Undo mechanisms).

## Code Generation Rules for Copilot

- **Pattern Recognition:** When prompted to solve a problem that maps to a GoF pattern (e.g., "I need a way to undo this action", "I have multiple ways to calculate taxes"), explicitly mention the pattern you are applying in comments.
- **Interface First:** Generate the interface or abstract base class *before* generating concrete implementations.
- **Immutability & Encapsulation:** Make fields `private` by default. Provide getters/setters only when necessary. Favor immutable objects.
- **Naming Conventions:** Use pattern names in class names where it aids understanding (e.g., `TaxCalculationStrategy`, `ButtonDecorator`, `WidgetFactory`), but keep names natural to the domain when appropriate.
- **Avoid God Classes:** Break large, complex classes into smaller, focused classes coordinating via a Mediator or composed of smaller Strategy objects.
- **Single Responsibility Principle:** Ensure each class has only one reason to change. If a class is doing too much, refactor it into multiple classes.
- **Open/Closed Principle:** Design classes to be open for extension but closed for modification. Use abstract classes or interfaces to allow new behavior without changing existing code.
- **Liskov Substitution Principle:** Ensure that subclasses can be substituted for their base classes without altering the correctness of the program. Avoid violating this principle by ensuring that derived classes do not strengthen preconditions or weaken postconditions.
- **Interface Segregation Principle:** Prefer many specific interfaces over a single general-purpose interface. Clients should not be forced to depend on interfaces they do not use.
- **Dependency Inversion Principle:** Depend on abstractions, not on concretions. High-level modules should not depend on low-level modules; both should depend on abstractions.
- **Use Design Patterns Judiciously:** Apply patterns when they solve a real problem in the codebase. Avoid over-engineering by applying patterns only when they provide clear benefits in terms of maintainability, flexibility, or readability.
- **Document Intent:** When using a design pattern, include comments that explain why the pattern was chosen and how it is being applied. This helps future maintainers understand the rationale behind the design decisions.
- **Testability:** Ensure that the generated code is testable. Use patterns that facilitate unit testing (e.g., Dependency Injection for easier mocking). Write tests that verify the behavior of the patterns in use.
- **Refactor Iteratively:** When refactoring existing code to apply design patterns, do so iteratively. Start with small, incremental changes that improve the design without introducing bugs. Use tests to verify that behavior remains correct throughout the refactoring process.
- **Performance Considerations:** Be mindful of the performance implications of design patterns. Some patterns may introduce additional layers of abstraction that can impact performance. Use profiling tools to identify bottlenecks and optimize as necessary without sacrificing maintainability.
- **Consistency:** Apply design patterns consistently across the codebase. If a particular pattern is used in one part of the code, consider using it in similar situations elsewhere to maintain a consistent design language.
- **Review and Iterate:** Regularly review the codebase for opportunities to apply design patterns or refactor existing code to better adhere to OOP principles. Encourage code reviews that focus on design quality and adherence to these guidelines.
- **Stay Updated:** Keep up with the latest developments in OOP design patterns and best practices. Continuously learn and adapt your coding style to incorporate new insights and techniques that can improve the quality of your codebase.
- **Balance Simplicity and Flexibility:** While design patterns can provide powerful solutions, they can also add complexity. Strive for a balance between simplicity and flexibility, ensuring that the code remains easy to understand and maintain while still being adaptable to future changes. Favor function definition over class definition when the problem can be solved with a simple function, and use classes and patterns when they provide clear organizational benefits.
- **Use Repositories and Typing definitions:** When generating code that involves complex data structures or interactions, consider using repositories to abstract data access and typing definitions to ensure type safety and clarity in the codebase. This can help maintain a clean separation of concerns and improve the overall maintainability of the code.

## Logging and Error Handling

- When applying design patterns, ensure that logging and error handling are integrated appropriately.
- Fail safe, loud, clear and early.
- Avoid silent failures and ensure that errors are logged with sufficient context to facilitate debugging and maintenance.
- Use custom exceptions where appropriate to provide more meaningful error messages and to allow for more granular error handling in client code.
- Use exception blocks judiciously, ensuring that they are used to handle expected error conditions rather than to control normal program flow.
- Use logging frameworks to manage log levels and outputs, allowing for better control over the logging behavior in different environments (e.g., development vs. production).
- Use info, debug, warning, error and critical log levels appropriately in every class and function to provide clear insights into the application's behavior and potential issues. Consider implementing a centralized error handling mechanism (e.g., a global exception handler) to ensure consistent error responses and logging across the application.

## Documentation

- When applying design patterns, ensure that the code is well-documented.
- Use docstrings written in English to explain the purpose of classes and methods, and include comments that clarify complex logic or design decisions. Use the numpy pattern for documenting the parameters and returns in the docstring unless another pattern is used in the existing code. Ask the developer at the first usage of this instruction which kind of docstring parameter and return he prefers, override the numpy docstring definition here and use this kind of docstring for all later programming tasks. This helps other developers understand the intent behind the code and how to use it effectively.
- Consider using tools like Sphinx or JSDoc to generate documentation from your codebase, making it easier for developers to navigate and understand the available classes, methods, and their intended usage.
- Additionally, maintain a high-level architectural overview in a README or dedicated documentation file that explains how different components and patterns fit together within the overall system architecture.
- Divide your documentation into user documentation (how to use the code) and developer documentation (how the code works and how to maintain it). Ensure that both types of documentation are kept up-to-date as the code evolves.
- Use diagrams (e.g., UML) where appropriate to visually represent the relationships between classes and patterns, aiding in comprehension for developers who may be new to OOP design patterns.
- Encourage a culture of documentation within the development team, emphasizing its importance for maintaining a clean and maintainable codebase.
- Never explode in documentation by creating constantly new documentation files which contain the same content.
- Scan existing doc files to extend them or to build new required doc sheets in the same style as existing ones. Keep it concise, clear and focused on the most important aspects of the code and its design patterns.
- Avoid redundant or overly verbose documentation that can overwhelm developers and obscure the key information they need to understand the codebase effectively.
