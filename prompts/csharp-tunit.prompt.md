---
mode: 'agent'
tools: ['changes', 'codebase', 'editFiles', 'problems', 'search']
description: 'Get best practices for TUnit unit testing, including data-driven tests'
---

# TUnit Best Practices

Your goal is to help me write effective unit tests with TUnit, covering both standard and data-driven testing approaches.

## Project Setup

- Use a separate test project with naming convention `[ProjectName].Tests`
- Reference TUnit package and TUnit.Assertions for fluent assertions
- Create test classes that match the classes being tested (e.g., `CalculatorTests` for `Calculator`)
- Use .NET SDK test commands: `dotnet test` for running tests
- TUnit requires .NET 8.0 or higher

## Test Structure

- No test class attributes required (like xUnit/NUnit)
- Use `[Test]` attribute for test methods (not `[Fact]` like xUnit)
- Follow the Arrange-Act-Assert (AAA) pattern
- Name tests using the pattern `MethodName_Scenario_ExpectedBehavior`
- Use lifecycle hooks: `[Before(Test)]` for setup and `[After(Test)]` for teardown
- Use `[Before(Class)]` and `[After(Class)]` for shared context between tests in a class
- Use `[Before(Assembly)]` and `[After(Assembly)]` for shared context across test classes
- TUnit supports advanced lifecycle hooks like `[Before(TestSession)]` and `[After(TestSession)]`

## Standard Tests

- Keep tests focused on a single behavior
- Avoid testing multiple behaviors in one test method
- Use TUnit's fluent assertion syntax with `await Assert.That()`
- Include only the assertions needed to verify the test case
- Make tests independent and idempotent (can run in any order)
- Avoid test interdependencies (use `[DependsOn]` attribute if needed)

## Data-Driven Tests

- Use `[Arguments]` attribute for inline test data (equivalent to xUnit's `[InlineData]`)
- Use `[MethodData]` for method-based test data (equivalent to xUnit's `[MemberData]`)
- Use `[ClassData]` for class-based test data
- Create custom data sources by implementing `ITestDataSource`
- Use meaningful parameter names in data-driven tests
- Multiple `[Arguments]` attributes can be applied to the same test method

## Assertions

- Use `await Assert.That(value).IsEqualTo(expected)` for value equality
- Use `await Assert.That(value).IsSameReferenceAs(expected)` for reference equality
- Use `await Assert.That(value).IsTrue()` or `await Assert.That(value).IsFalse()` for boolean conditions
- Use `await Assert.That(collection).Contains(item)` or `await Assert.That(collection).DoesNotContain(item)` for collections
- Use `await Assert.That(value).Matches(pattern)` for regex pattern matching
- Use `await Assert.That(action).Throws<TException>()` or `await Assert.That(asyncAction).ThrowsAsync<TException>()` to test exceptions
- Chain assertions with `.And` operator: `await Assert.That(value).IsNotNull().And.IsEqualTo(expected)`
- Use `.Or` operator for alternative conditions: `await Assert.That(value).IsEqualTo(1).Or.IsEqualTo(2)`
- Use `.Within(tolerance)` for DateTime and numeric comparisons with tolerance
- All assertions are asynchronous and must be awaited

## Advanced Features

- Use `[Repeat(n)]` to repeat tests multiple times
- Use `[Retry(n)]` for automatic retry on failure
- Use `[ParallelLimit<T>]` to control parallel execution limits
- Use `[Skip("reason")]` to skip tests conditionally
- Use `[DependsOn(nameof(OtherTest))]` to create test dependencies
- Use `[Timeout(milliseconds)]` to set test timeouts
- Create custom attributes by extending TUnit's base attributes

## Test Organization

- Group tests by feature or component
- Use `[Category("CategoryName")]` for test categorization
- Use `[DisplayName("Custom Test Name")]` for custom test names
- Consider using `TestContext` for test diagnostics and information
- Use conditional attributes like custom `[WindowsOnly]` for platform-specific tests

## Performance and Parallel Execution

- TUnit runs tests in parallel by default (unlike xUnit which requires explicit configuration)
- Use `[NotInParallel]` to disable parallel execution for specific tests
- Use `[ParallelLimit<T>]` with custom limit classes to control concurrency
- Tests within the same class run sequentially by default
- Use `[Repeat(n)]` with `[ParallelLimit<T>]` for load testing scenarios

## Migration from xUnit

- Replace `[Fact]` with `[Test]`
- Replace `[Theory]` with `[Test]` and use `[Arguments]` for data
- Replace `[InlineData]` with `[Arguments]`
- Replace `[MemberData]` with `[MethodData]`
- Replace `Assert.Equal` with `await Assert.That(actual).IsEqualTo(expected)`
- Replace `Assert.True` with `await Assert.That(condition).IsTrue()`
- Replace `Assert.Throws<T>` with `await Assert.That(action).Throws<T>()`
- Replace constructor/IDisposable with `[Before(Test)]`/`[After(Test)]`
- Replace `IClassFixture<T>` with `[Before(Class)]`/`[After(Class)]`

**Why TUnit over xUnit?**

TUnit offers a modern, fast, and flexible testing experience with advanced features not present in xUnit, such as asynchronous assertions, more refined lifecycle hooks, and improved data-driven testing capabilities. TUnit's fluent assertions provide clearer and more expressive test validation, making it especially suitable for complex .NET projects.