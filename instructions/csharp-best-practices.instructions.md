# (File removed)
- Use string interpolation `$""` instead of `String.Format()` or concatenation
- Use `StringBuilder` for extensive string manipulation
- Prefer `string.Equals()` with `StringComparison` for culture-aware comparisons
- Use verbatim strings `@""` for paths and multi-line strings

### Exception Handling

- Use specific exception types rather than generic `Exception`
- Implement proper exception filtering with `when` clauses when available
- Provide meaningful exception messages
- Follow the fail-fast principle

## Performance Considerations

### Memory Efficiency

- Dispose of `IDisposable` objects properly using `using` statements or blocks
- Avoid unnecessary boxing and unboxing
- Use appropriate collection types for the use case
- Consider object pooling for frequently allocated objects

### Collections

- Use appropriate collection types: `List<T>`, `HashSet<T>`, `Dictionary<TKey, TValue>`
- Prefer `IEnumerable<T>` for method parameters when only enumeration is needed
- Use `IReadOnlyList<T>` and `IReadOnlyCollection<T>` for immutable data exposure
- Initialize collections with known capacity when possible

### LINQ Usage

- Use LINQ methods appropriately for readability and performance
- Prefer method syntax over query syntax for simple operations
- Be aware of deferred execution implications
- Use `ToList()` or `ToArray()` when multiple enumeration is needed

## Async/Await Best Practices

### Async Methods

- Use `async Task` for void-returning async methods
- Use `async Task<T>` for value-returning async methods
- Avoid `async void` except for event handlers
- Use `ConfigureAwait(false)` in library code

### Cancellation

- Accept `CancellationToken` parameters in long-running async methods
- Check for cancellation at appropriate intervals
- Pass cancellation tokens through the call chain
- Handle `OperationCanceledException` appropriately

## Object-Oriented Principles

### Encapsulation

- Keep fields private and expose through properties
- Use appropriate access modifiers to control visibility
- Validate property setters when necessary
- Hide implementation details behind interfaces

### Inheritance and Polymorphism

- Prefer composition over inheritance when appropriate
- Use virtual methods judiciously
- Override `Equals`, `GetHashCode`, and `ToString` when meaningful
- Implement interfaces explicitly when there might be naming conflicts

### SOLID Principles

- Single Responsibility: Classes should have one reason to change
- Open/Closed: Open for extension, closed for modification
- Liskov Substitution: Subtypes must be substitutable for base types
- Interface Segregation: Many specific interfaces are better than one general
- Dependency Inversion: Depend on abstractions, not concretions

## XML Documentation

- Provide XML documentation comments for all public APIs
- Use `<summary>`, `<param>`, `<returns>`, and `<exception>` tags appropriately
- Include `<example>` sections for complex methods
- Document any thread safety considerations

## Testing Patterns

- Use modern test frameworks like xUnit, NUnit, or MSTest
- Follow AAA pattern: Arrange, Act, Assert
- Use meaningful test method names that describe the scenario
- Test both happy path and edge cases
- Mock dependencies appropriately

## File Organization

- One public type per file
- File name should match the primary type name
- Organize using statements: System namespaces first, then third-party, then project namespaces
- Remove unused using statements
- Group related types in appropriate namespaces

## Code Quality Rules

- Follow Microsoft's .NET coding conventions
- Use EditorConfig files for consistent formatting across teams
- Enable and address code analysis warnings
- Use static analysis tools like SonarQube or Roslyn analyzers
- Implement code reviews and pair programming

## Error Handling

- Use exceptions for exceptional circumstances, not control flow
- Catch specific exceptions rather than generic `Exception`
- Log errors appropriately without exposing sensitive information
- Provide meaningful error messages to users
- Consider using Result pattern for expected failures

## Resource Management

- Implement `IDisposable` for types that manage unmanaged resources
- Use `using` statements for automatic resource cleanup
- Follow the Dispose pattern correctly
- Consider implementing finalizers only when necessary

## Performance Monitoring

- Use appropriate logging frameworks
- Implement health checks for long-running services
- Monitor memory usage and garbage collection
- Profile applications to identify bottlenecks

## Post-Generation Actions

- **ALWAYS trim trailing whitespace from all lines after any code changes**
- Ensure consistent line endings (LF on Unix, CRLF on Windows)
- Remove any extra blank lines at the end of files
- Ensure proper indentation (4 spaces for C#, no tabs)
- Format code according to project standards

## Security Considerations

- Validate all input parameters
- Use secure string handling practices
- Implement proper authentication and authorization
- Follow OWASP guidelines for secure coding practices
- Avoid hardcoding sensitive information
- Use secure communication protocols (HTTPS, TLS)
- Implement proper error handling without exposing sensitive information
