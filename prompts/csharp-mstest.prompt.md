---
agent: 'agent'
tools: ['changes', 'search/codebase', 'edit/editFiles', 'problems', 'search']
description: 'Get best practices for MSTest unit testing, including data-driven tests'
---

# MSTest Best Practices

Your goal is to help me write effective unit tests with MSTest, covering both standard and data-driven testing approaches.

## Project Setup

- Use a separate test project with naming convention `[ProjectName].Tests`
- Reference MSTest package
- Create test classes that match the classes being tested (e.g., `CalculatorTests` for `Calculator`)
- Use .NET SDK test commands: `dotnet test` for running tests

## Test Structure

- Use `[TestClass]` attribute for test classes
- Use `[TestMethod]` attribute for test methods
- Follow the Arrange-Act-Assert (AAA) pattern
- Name tests using the pattern `MethodName_Scenario_ExpectedBehavior`
- Use `[TestInitialize]` and `[TestCleanup]` for per-test setup and teardown
- Use `[ClassInitialize]` and `[ClassCleanup]` for per-class setup and teardown
- Use `[AssemblyInitialize]` and `[AssemblyCleanup]` for assembly-level setup and teardown

## Standard Tests

- Keep tests focused on a single behavior
- Avoid testing multiple behaviors in one test method
- Use clear assertions that express intent
- Include only the assertions needed to verify the test case
- Make tests independent and idempotent (can run in any order)
- Avoid test interdependencies

## Data-Driven Tests

- Use `[TestMethod]` combined with data source attributes
- Use `[DataRow]` for inline test data
- Use `[DynamicData]` for programmatically generated test data
- Use `[TestProperty]` to add metadata to tests
- Use meaningful parameter names in data-driven tests

## Assertions

- Use `Assert.AreEqual` for value equality
- Use `Assert.AreSame` for reference equality
- Use `Assert.IsTrue`/`Assert.IsFalse` for boolean conditions
- Use `CollectionAssert` for collection comparisons
- Use `StringAssert` for string-specific assertions
- Use `Assert.Throws<T>` to test exceptions
- Ensure assertions are simple in nature and have a message provided for clarity on failure

## Mocking and Isolation

- Consider using Moq or NSubstitute alongside MSTest
- Mock dependencies to isolate units under test
- Use interfaces to facilitate mocking
- Consider using a DI container for complex test setups

## Test Organization

- Group tests by feature or component
- Use test categories with `[TestCategory("Category")]`
- Use test priorities with `[Priority(1)]` for critical tests
- Use `[Owner("DeveloperName")]` to indicate ownership
