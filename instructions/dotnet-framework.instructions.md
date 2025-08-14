---
description: 'Guidance for working with .NET Framework projects. Includes project structure, C# language version, NuGet management, and best practices.'
applyTo: '**/*.csproj, **/*.cs'
---

# .NET Framework Development

## Build and Compilation Requirements
- Always use `msbuild /t:rebuild` to build the solution or projects instead of `dotnet build`

## Project File Management

### Non-SDK Style Project Structure
.NET Framework projects use the legacy project format, which differs significantly from modern SDK-style projects:

- **Explicit File Inclusion**: All new source files **MUST** be explicitly added to the project file (`.csproj`) using a `<Compile>` element
  - .NET Framework projects do not automatically include files in the directory like SDK-style projects
  - Example: `<Compile Include="Path\To\NewFile.cs" />`

- **No Implicit Imports**: Unlike SDK-style projects, .NET Framework projects do not automatically import common namespaces or assemblies
 
- **Build Configuration**: Contains explicit `<PropertyGroup>` sections for Debug/Release configurations

- **Output Paths**: Explicit `<OutputPath>` and `<IntermediateOutputPath>` definitions

- **Target Framework**: Uses `<TargetFrameworkVersion>` instead of `<TargetFramework>`
  - Example: `<TargetFrameworkVersion>v4.7.2</TargetFrameworkVersion>`

## NuGet Package Management
- Installing and updating NuGet packages in .NET Framework projects is a complex task requiring coordinated changes to multiple files. Therefore, **do not attempt to install or update NuGet packages** in this project.
- Instead, if changes to NuGet references are required, ask the user to install or update NuGet packages using the Visual Studio NuGet Package Manager or Visual Studio package manager console.
- When recommending NuGet packages, ensure they are compatible with .NET Framework or .NET Standard 2.0 (not only .NET Core or .NET 5+).

## C# Language Version is 7.3
- This project is limited to C# 7.3 features only. Please avoid using:

### C# 8.0+ Features (NOT SUPPORTED):
  - Using declarations (`using var stream = ...`)
  - Await using statements (`await using var resource = ...`)
  - Switch expressions (`variable switch { ... }`)
  - Null-coalescing assignment (`??=`)
  - Range and index operators (`array[1..^1]`, `array[^1]`)
  - Default interface methods
  - Readonly members in structs
  - Static local functions
  - Nullable reference types (`string?`, `#nullable enable`)

### C# 9.0+ Features (NOT SUPPORTED):
  - Records (`public record Person(string Name)`)
  - Init-only properties (`{ get; init; }`)
  - Top-level programs (program without Main method)
  - Pattern matching enhancements
  - Target-typed new expressions (`List<string> list = new()`)

### C# 10+ Features (NOT SUPPORTED):
  - Global using statements
  - File-scoped namespaces
  - Record structs
  - Required members

### Use Instead (C# 7.3 Compatible):
  - Traditional using statements with braces
  - Switch statements instead of switch expressions
  - Explicit null checks instead of null-coalescing assignment
  - Array slicing with manual indexing
  - Abstract classes or interfaces instead of default interface methods

## Environment Considerations (Windows environment)
- Use Windows-style paths with backslashes (e.g., `C:\path\to\file.cs`)
- Use Windows-appropriate commands when suggesting terminal operations
- Consider Windows-specific behaviors when working with file system operations

## Common .NET Framework Pitfalls and Best Practices

### Async/Await Patterns
- **ConfigureAwait(false)**: Always use `ConfigureAwait(false)` in library code to avoid deadlocks:
  ```csharp
  var result = await SomeAsyncMethod().ConfigureAwait(false);
  ```
- **Avoid sync-over-async**: Don't use `.Result` or `.Wait()` or `.GetAwaiter().GetResult()`. These sync-over-async patterns can lead to deadlocks and poor performance. Always use `await` for asynchronous calls.

### DateTime Handling
- **Use DateTimeOffset for timestamps**: Prefer `DateTimeOffset` over `DateTime` for absolute time points
- **Specify DateTimeKind**: When using `DateTime`, always specify `DateTimeKind.Utc` or `DateTimeKind.Local`
- **Culture-aware formatting**: Use `CultureInfo.InvariantCulture` for serialization/parsing

### String Operations
- **StringBuilder for concatenation**: Use `StringBuilder` for multiple string concatenations
- **StringComparison**: Always specify `StringComparison` for string operations:
  ```csharp
  string.Equals(other, StringComparison.OrdinalIgnoreCase)
  ```

### Memory Management
- **Dispose pattern**: Implement `IDisposable` properly for unmanaged resources
- **Using statements**: Always wrap `IDisposable` objects in using statements
- **Avoid large object heap**: Keep objects under 85KB to avoid LOH allocation

### Configuration
- **Use ConfigurationManager**: Access app settings through `ConfigurationManager.AppSettings`
- **Connection strings**: Store in `<connectionStrings>` section, not `<appSettings>`
- **Transformations**: Use web.config/app.config transformations for environment-specific settings

### Exception Handling
- **Specific exceptions**: Catch specific exception types, not generic `Exception`
- **Don't swallow exceptions**: Always log or re-throw exceptions appropriately
- **Use using for disposable resources**: Ensures proper cleanup even when exceptions occur

### Performance Considerations
- **Avoid boxing**: Be aware of boxing/unboxing with value types and generics
- **String interning**: Use `string.Intern()` judiciously for frequently used strings
- **Lazy initialization**: Use `Lazy<T>` for expensive object creation
- **Avoid reflection in hot paths**: Cache `MethodInfo`, `PropertyInfo` objects when possible
