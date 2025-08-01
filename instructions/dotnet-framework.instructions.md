---
description: 'Guidelines for working with .NET Framework projects'
applyTo: '**/*.csproj', '**/*.cs'
description: 'These instructions provide guidance  for working with .NET Framework projects. Because .NET Framework projects require different tools and language versions compared to .NET/.NET Core, these instructions can be
helpful for ensuring LLMs understand the context and requirements of .NET Framework development.'
---

# .NET Framework Development

## Build and Compilation Requirements
- Always use `msbuild /t:rebuild` to build the solution or projects instead of `dotnet build`

## C# Language Version is 7.3
- This project is limited to C# 7.3 features only. Please avoid using:
  - C# 8.0+ features like using declarations (using var x = ...)
  - await using statements
  - Switch expressions
  - etc.

## Project File Management
- All new source files **MUST** be explicitly added to the project file (`.csproj`) using a `<Compile>` element
  - .NET Framework projects do not automatically include files in the directory like SDK-style projects
  - Example: `<Compile Include="Path\To\NewFile.cs" />`

## NuGet Package Management
- Instead, ask the user to install or update NuGet packages using the Visual Studio NuGet Package Manager or Visual Studio package manager console.
- Installing and updating NuGet packages in .NET Framework projects is a complex task requiring coordinated changes to multiple files. Therefore, **do not attempt to install or update NuGet packages** in this project.
- When recommending NuGet packages, ensure they are compatible with .NET Framework or .NET Standard 2.0 (not only .NET Core or .NET 5+).

## Environment Considerations (Windows environment)
- Use Windows-style paths with backslashes (e.g., `C:\path\to\file.cs`)
- Use Windows-appropriate commands when suggesting terminal operations
- Consider Windows-specific behaviors when working with file system operations
