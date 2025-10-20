---
description: 'Guidelines for building Java base applications'
applyTo: '**/*.java'
---

# Java Development

## General Instructions

- First, prompt the user if they want to integrate static analysis tools (SonarQube, PMD, Checkstyle) into their project setup.
  - If yes, document a recommended static-analysis setup. 
    - Prefer SonarQube/SonarCloud (SonarLint in IDE + `sonar-scanner` in CI).
    - Create a Sonar project key.
    - Store the scanner token in CI secrets.
    - Provide a sample CI job that runs the scanner.
    - If the team declines Sonar, note this in the project README and continue.
  - If Sonar is bound to the project:
    - Use Sonar as the primary source of actionable issues.
    - Reference Sonar rule keys in remediation guidance.
  - If Sonar is unavailable:
    - Perform up to 3 troubleshooting checks:
      1. Verify project binding and token.
      2. Ensure SonarScanner runs in CI.
      3. Confirm SonarLint is installed and configured.
    - If still failing after 3 attempts:
      - Enable SpotBugs, PMD, or Checkstyle as CI fallbacks.
      - Open a short tracker issue documenting the blocker and next steps.
- If the user declines static analysis tools or wants to proceed without them, continue with implementing the Best practices, bug patterns and code smell prevention guidelines outlined below.
- Address code smells proactively during development rather than accumulating technical debt.
- Focus on readability, maintainability, and performance when refactoring identified issues.
- Use IDE / Code editor reported warnings and suggestions to catch common patterns early in development.

## Best practices

- **Records**: For classes primarily intended to store data (e.g., DTOs, immutable data structures), **Java Records should be used instead of traditional classes**.
- **Pattern Matching**: Utilize pattern matching for `instanceof` and `switch` expression to simplify conditional logic and type casting.
- **Type Inference**: Use `var` for local variable declarations to improve readability, but only when the type is explicitly clear from the right-hand side of the expression.
- **Immutability**: Favor immutable objects. Make classes and fields `final` where possible. Use collections from `List.of()`/`Map.of()` for fixed data. Use `Stream.toList()` to create immutable lists.
- **Streams and Lambdas**: Use the Streams API and lambda expressions for collection processing. Employ method references (e.g., `stream.map(Foo::toBar)`).
- **Null Handling**: Avoid returning or accepting `null`. Use `Optional<T>` for possibly-absent values and `Objects` utility methods like `equals()` and `requireNonNull()`.

### Naming Conventions

- Follow Google's Java style guide:
  - `UpperCamelCase` for class and interface names.
  - `lowerCamelCase` for method and variable names.
  - `UPPER_SNAKE_CASE` for constants.
  - `lowercase` for package names.
- Use nouns for classes (`UserService`) and verbs for methods (`getUserById`).
- Avoid abbreviations and Hungarian notation.

### Common Bug Patterns

Below are concise, human-readable rules you can apply regardless of which static analysis tool you use. If you run Sonar/SonarLint, the IDE will show the matching rule and location — direct Sonar connections are preferred and should override this ruleset.

- Resource management — Always close resources (files, sockets, streams). Use try-with-resources where possible so resources are closed automatically.
- Equality checks — Compare object equality with `.equals()` or `Objects.equals(...)` rather than `==` for non-primitives; this avoids reference-equality bugs.
- Redundant casts — Remove unnecessary casts; prefer correct generic typing and let the compiler infer types where possible.
- Reachable conditions — Avoid conditional expressions that are always true or false; they indicate bugs or dead code and should be corrected.

For contributors who *do* use Sonar or SonarLint: the IDE/scan will show the specific rule key (for example, S2095 for resource leaks) and the affected file/line. Use that information to navigate to the exact location, then apply the recommended remediation.

### Common Code Smells

These patterns are phrased for humans; they map cleanly to checks in Sonar, SpotBugs, PMD, or Checkstyle but do not require those tools to be useful.

- Parameter count — Keep method parameter lists short. If a method needs many params, consider grouping into a value object or using the builder pattern.
- Method size — Keep methods focused and small. Extract helper methods to improve readability and testability.
- Cognitive complexity — Reduce nested conditionals and heavy branching by extracting methods, using polymorphism, or applying the Strategy pattern.
- Duplicated literals — Extract repeated strings and numbers into named constants or enums to reduce errors and ease changes.
- Dead code — Remove unused variables and assignments. They confuse readers and can hide bugs.
- Magic numbers — Replace numeric literals with named constants that explain intent (e.g., MAX_RETRIES).

If you run a static analyzer like Sonar or SonarLint — direct Sonar connections are preferred and should override this ruleset. Sonar rule keys are useful for automation and suppression, but they are not required in day-to-day developer guidance.

## Build and Verification

- After adding or modifying code, verify the project continues to build successfully.
- If the project uses Maven, run `mvn clean install`.
- If the project uses Gradle, run `./gradlew build` (or `gradlew.bat build` on Windows).
- Ensure all tests pass as part of the build.
