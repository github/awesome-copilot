---
name: csharp-xunit
description: 'Get best practices for XUnit unit testing, including data-driven tests'
---

# XUnit Best Practices

Your goal is to help me write effective unit tests with XUnit, covering both standard and data-driven testing approaches.

## Project Setup

- Use a separate test project with naming convention `[ProjectName].Tests`
- Create new projects from the xUnit.net v3 template: install it with `dotnet new install xunit.v3.templates`, then run `dotnet new xunit3`. The template provides the xUnit.net v3 package and Microsoft Testing Platform (MTP) setup.
- For manual setup, reference the `xunit.v3` NuGet package. Do not add VSTest packages (`Microsoft.NET.Test.Sdk` or `xunit.runner.visualstudio`) unless you also need VSTest compatibility.
- Set `<OutputType>Exe</OutputType>` in the project file; xUnit.net v3 test projects are standalone executables.
- Use MTP's command-line runner by setting `<UseMicrosoftTestingPlatformRunner>true</UseMicrosoftTestingPlatformRunner>` in the project file.
- Create test classes that match the classes being tested (e.g., `CalculatorTests` for `Calculator`)
- Run tests with `dotnet test` after enabling MTP integration for the installed .NET SDK:
  - With .NET SDK 8 or 9, set `<TestingPlatformDotnetTestSupport>true</TestingPlatformDotnetTestSupport>` in the project file.
  - With .NET SDK 10 or later, set `"test": { "runner": "Microsoft.Testing.Platform" }` in the repository's `global.json`.
- You can also run the test project directly with `dotnet run`.

## Test Structure

- No test class attributes required (unlike MSTest/NUnit)
- Use fact-based tests with `[Fact]` attribute for simple tests
- Follow the Arrange-Act-Assert (AAA) pattern
- Name tests using the pattern `MethodName_Scenario_ExpectedBehavior`
- Use constructor for setup and `IDisposable.Dispose()` for teardown
- Use `IClassFixture<T>` for shared context between tests in a class
- Use `ICollectionFixture<T>` for shared context between multiple test classes

## Standard Tests

- Keep tests focused on a single behavior
- Avoid testing multiple behaviors in one test method
- Use clear assertions that express intent
- Include only the assertions needed to verify the test case
- Make tests independent and idempotent (can run in any order)
- Avoid test interdependencies

## Data-Driven Tests

- Use `[Theory]` combined with data source attributes
- Use `[InlineData]` for inline test data
- Use `[MemberData]` for method-based test data
- Use `[ClassData]` for class-based test data
- Create custom data attributes by implementing `DataAttribute`
- Use meaningful parameter names in data-driven tests

## Assertions

- Use `Assert.Equal` for value equality
- Use `Assert.Same` for reference equality
- Use `Assert.True`/`Assert.False` for boolean conditions
- Use `Assert.Contains`/`Assert.DoesNotContain` for collections
- Use `Assert.Matches`/`Assert.DoesNotMatch` for regex pattern matching
- Use `Assert.Throws<T>` or `await Assert.ThrowsAsync<T>` to test exceptions
- Use fluent assertions library for more readable assertions

## Mocking and Isolation

- Consider using Moq or NSubstitute alongside XUnit
- Mock dependencies to isolate units under test
- Use interfaces to facilitate mocking
- Consider using a DI container for complex test setups

## Test Organization

- Group tests by feature or component
- Use `[Trait("Category", "CategoryName")]` for categorization
- Use collection fixtures to group tests with shared dependencies
- Consider output helpers (`ITestOutputHelper`) for test diagnostics
- Skip tests conditionally with `Skip = "reason"` in fact/theory attributes
