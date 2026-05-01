---
name: csharp-mstest
description: 'Get best practices for MSTest 3.x/4.x unit testing, including modern assertion APIs and data-driven tests'
---

# MSTest Best Practices (MSTest 3.x/4.x)

Your goal is to help me write effective unit tests with modern MSTest, using current APIs and best practices.

## Project Setup

- Use a separate test project with naming convention `[ProjectName].Tests`
- Reference MSTest 3.x+ NuGet packages (includes analyzers)
- Consider using MSTest.Sdk for simplified project setup
- Run tests with `dotnet test`

## Test Class Structure

- Use `[TestClass]` attribute for test classes
- **Seal test classes by default** for performance and design clarity
- Use `[TestMethod]` for test methods (prefer over `[DataTestMethod]`)
- Follow Arrange-Act-Assert (AAA) pattern
- Name tests using pattern `MethodName_Scenario_ExpectedBehavior`

```csharp
[TestClass]
public sealed class CalculatorTests
{
    [TestMethod]
    public void Add_TwoPositiveNumbers_ReturnsSum()
    {
        // Arrange
        var calculator = new Calculator();

        // Act
        var result = calculator.Add(2, 3);

        // Assert
        Assert.AreEqual(5, result);
    }
}
```

## Test Lifecycle

- **Prefer constructors over `[TestInitialize]`** - enables `readonly` fields and follows standard C# patterns
- Use `[TestCleanup]` for cleanup that must run even if test fails
- Combine constructor with async `[TestInitialize]` when async setup is needed

```csharp
[TestClass]
public sealed class ServiceTests
{
    private readonly MyService _service;  // readonly enabled by constructor

    public ServiceTests()
    {
        _service = new MyService();
    }

    [TestInitialize]
    public async Task InitAsync()
    {
        // Use for async initialization only
        await _service.WarmupAsync();
    }

    [TestCleanup]
    public void Cleanup() => _service.Reset();
}
```

### Execution Order

1. **Assembly Initialization** - `[AssemblyInitialize]` (once per test assembly)
2. **Class Initialization** - `[ClassInitialize]` (once per test class)
3. **Test Initialization** (for every test method):
   1. Constructor
   2. Set `TestContext` property
   3. `[TestInitialize]`
4. **Test Execution** - test method runs
5. **Test Cleanup** (for every test method):
   1. `[TestCleanup]`
   2. `DisposeAsync` (if implemented)
   3. `Dispose` (if implemented)
6. **Class Cleanup** - `[ClassCleanup]` (once per test class)
7. **Assembly Cleanup** - `[AssemblyCleanup]` (once per test assembly)

## Modern Assertion APIs

MSTest provides three assertion classes: `Assert`, `StringAssert`, and `CollectionAssert`.

### Assert Class - Core Assertions

```csharp
// Equality
Assert.AreEqual(expected, actual);
Assert.AreNotEqual(notExpected, actual);
Assert.AreSame(expectedObject, actualObject);      // Reference equality
Assert.AreNotSame(notExpectedObject, actualObject);

// Null checks
Assert.IsNull(value);
Assert.IsNotNull(value);

// Boolean
Assert.IsTrue(condition);
Assert.IsFalse(condition);

// Fail/Inconclusive
Assert.Fail("Test failed due to...");
Assert.Inconclusive("Test cannot be completed because...");
```

### Exception Testing (Prefer over `[ExpectedException]`)

```csharp
// Assert.Throws - matches TException or derived types
var ex = Assert.Throws<ArgumentException>(() => Method(null));
Assert.AreEqual("Value cannot be null.", ex.Message);

// Assert.ThrowsExactly - matches exact type only
var ex = Assert.ThrowsExactly<InvalidOperationException>(() => Method());

// Async versions
var ex = await Assert.ThrowsAsync<HttpRequestException>(async () => await client.GetAsync(url));
var ex = await Assert.ThrowsExactlyAsync<InvalidOperationException>(async () => await Method());
```

### Collection Assertions (Assert class)

```csharp
Assert.Contains(expectedItem, collection);
Assert.DoesNotContain(unexpectedItem, collection);
Assert.ContainsSingle(collection);  // exactly one element
Assert.HasCount(5, collection);
Assert.IsEmpty(collection);
Assert.IsNotEmpty(collection);
```

### String Assertions (Assert class)

```csharp
Assert.Contains("expected", actualString);
Assert.StartsWith("prefix", actualString);
Assert.EndsWith("suffix", actualString);
Assert.DoesNotStartWith("prefix", actualString);
Assert.DoesNotEndWith("suffix", actualString);
Assert.MatchesRegex(@"\d{3}-\d{4}", phoneNumber);
Assert.DoesNotMatchRegex(@"\d+", textOnly);
```

### Comparison Assertions

```csharp
Assert.IsGreaterThan(lowerBound, actual);
Assert.IsGreaterThanOrEqualTo(lowerBound, actual);
Assert.IsLessThan(upperBound, actual);
Assert.IsLessThanOrEqualTo(upperBound, actual);
Assert.IsInRange(actual, low, high);
Assert.IsPositive(number);
Assert.IsNegative(number);
```

### Type Assertions

```csharp
// MSTest 3.x - uses out parameter
Assert.IsInstanceOfType<MyClass>(obj, out var typed);
typed.DoSomething();

// MSTest 4.x - returns typed result directly
var typed = Assert.IsInstanceOfType<MyClass>(obj);
typed.DoSomething();

Assert.IsNotInstanceOfType<WrongType>(obj);
```

### Assert.That (MSTest 4.0+)

```csharp
Assert.That(result.Count > 0);  // Auto-captures expression in failure message
```

### StringAssert Class

> **Note:** Prefer `Assert` class equivalents when available (e.g., `Assert.Contains("expected", actual)` over `StringAssert.Contains(actual, "expected")`).

```csharp
StringAssert.Contains(actualString, "expected");
StringAssert.StartsWith(actualString, "prefix");
StringAssert.EndsWith(actualString, "suffix");
StringAssert.Matches(actualString, new Regex(@"\d{3}-\d{4}"));
StringAssert.DoesNotMatch(actualString, new Regex(@"\d+"));
```

### CollectionAssert Class

> **Note:** Prefer `Assert` class equivalents when available (e.g., `Assert.Contains`).

```csharp
// Containment
CollectionAssert.Contains(collection, expectedItem);
CollectionAssert.DoesNotContain(collection, unexpectedItem);

// Equality (same elements, same order)
CollectionAssert.AreEqual(expectedCollection, actualCollection);
CollectionAssert.AreNotEqual(unexpectedCollection, actualCollection);

// Equivalence (same elements, any order)
CollectionAssert.AreEquivalent(expectedCollection, actualCollection);
CollectionAssert.AreNotEquivalent(unexpectedCollection, actualCollection);

// Subset checks
CollectionAssert.IsSubsetOf(subset, superset);
CollectionAssert.IsNotSubsetOf(notSubset, collection);

// Element validation
CollectionAssert.AllItemsAreInstancesOfType(collection, typeof(MyClass));
CollectionAssert.AllItemsAreNotNull(collection);
CollectionAssert.AllItemsAreUnique(collection);
```

## Data-Driven Tests

### DataRow

```csharp
[TestMethod]
[DataRow(1, 2, 3)]
[DataRow(0, 0, 0, DisplayName = "Zeros")]
[DataRow(-1, 1, 0, IgnoreMessage = "Known issue #123")]  // MSTest 3.8+
public void Add_ReturnsSum(int a, int b, int expected)
{
    Assert.AreEqual(expected, Calculator.Add(a, b));
}
```

### DynamicData

The data source can return any of the following types:

- `IEnumerable<(T1, T2, ...)>` (ValueTuple) - **preferred**, provides type safety (MSTest 3.7+)
- `IEnumerable<Tuple<T1, T2, ...>>` - provides type safety
- `IEnumerable<TestDataRow>` - provides type safety plus control over test metadata (display name, categories)
- `IEnumerable<object[]>` - **least preferred**, no type safety

> **Note:** When creating new test data methods, prefer `ValueTuple` or `TestDataRow` over `IEnumerable<object[]>`. The `object[]` approach provides no compile-time type checking and can lead to runtime errors from type mismatches.

```csharp
[TestMethod]
[DynamicData(nameof(TestData))]
public void DynamicTest(int a, int b, int expected)
{
    Assert.AreEqual(expected, Calculator.Add(a, b));
}

// ValueTuple - preferred (MSTest 3.7+)
public static IEnumerable<(int a, int b, int expected)> TestData =>
[
    (1, 2, 3),
    (0, 0, 0),
];

// TestDataRow - when you need custom display names or metadata
public static IEnumerable<TestDataRow<(int a, int b, int expected)>> TestDataWithMetadata =>
[
    new((1, 2, 3)) { DisplayName = "Positive numbers" },
    new((0, 0, 0)) { DisplayName = "Zeros" },
    new((-1, 1, 0)) { DisplayName = "Mixed signs", IgnoreMessage = "Known issue #123" },
];

// IEnumerable<object[]> - avoid for new code (no type safety)
public static IEnumerable<object[]> LegacyTestData =>
[
    [1, 2, 3],
    [0, 0, 0],
];
```

## TestContext

The `TestContext` class provides test run information, cancellation support, and output methods.
See [TestContext documentation](https://learn.microsoft.com/dotnet/core/testing/unit-testing-mstest-writing-tests-testcontext) for complete reference.

### Accessing TestContext

```csharp
// Property (MSTest suppresses CS8618 - don't use nullable or = null!)
public TestContext TestContext { get; set; }

// Constructor injection (MSTest 3.6+) - preferred for immutability
[TestClass]
public sealed class MyTests
{
    private readonly TestContext _testContext;

    public MyTests(TestContext testContext)
    {
        _testContext = testContext;
    }
}

// Static methods receive it as parameter
[ClassInitialize]
public static void ClassInit(TestContext context) { }

// Optional for cleanup methods (MSTest 3.6+)
[ClassCleanup]
public static void ClassCleanup(TestContext context) { }

[AssemblyCleanup]
public static void AssemblyCleanup(TestContext context) { }
```

### Cancellation Token

Always use `TestContext.CancellationToken` for cooperative cancellation with `[Timeout]`:

```csharp
[TestMethod]
[Timeout(5000)]
public async Task LongRunningTest()
{
    await _httpClient.GetAsync(url, TestContext.CancellationToken);
}
```

### Test Run Properties

```csharp
TestContext.TestName              // Current test method name
TestContext.TestDisplayName       // Display name (3.7+)
TestContext.CurrentTestOutcome    // Pass/Fail/InProgress
TestContext.TestData              // Parameterized test data (3.7+, in TestInitialize/Cleanup)
TestContext.TestException         // Exception if test failed (3.7+, in TestCleanup)
TestContext.DeploymentDirectory   // Directory with deployment items
```

### Output and Result Files

```csharp
// Write to test output (useful for debugging)
TestContext.WriteLine("Processing item {0}", itemId);

// Attach files to test results (logs, screenshots)
TestContext.AddResultFile(screenshotPath);

// Store/retrieve data across test methods
TestContext.Properties["SharedKey"] = computedValue;
```

## Advanced Features

### Retry for Flaky Tests (MSTest 3.9+)

```csharp
[TestMethod]
[Retry(3)]
public void FlakyTest() { }
```

### Conditional Execution (MSTest 3.10+)

Skip or run tests based on OS or CI environment:

```csharp
// OS-specific tests
[TestMethod]
[OSCondition(OperatingSystems.Windows)]
public void WindowsOnlyTest() { }

[TestMethod]
[OSCondition(OperatingSystems.Linux | OperatingSystems.MacOS)]
public void UnixOnlyTest() { }

[TestMethod]
[OSCondition(ConditionMode.Exclude, OperatingSystems.Windows)]
public void SkipOnWindowsTest() { }

// CI environment tests
[TestMethod]
[CICondition]  // Runs only in CI (default: ConditionMode.Include)
public void CIOnlyTest() { }

[TestMethod]
[CICondition(ConditionMode.Exclude)]  // Skips in CI, runs locally
public void LocalOnlyTest() { }
```

### Parallelization

```csharp
// Assembly level
[assembly: Parallelize(Workers = 4, Scope = ExecutionScope.MethodLevel)]

// Disable for specific class
[TestClass]
[DoNotParallelize]
public sealed class SequentialTests { }
```

### Work Item Traceability (MSTest 3.8+)

Link tests to work items for traceability in test reports:

```csharp
// Azure DevOps work items
[TestMethod]
[WorkItem(12345)]  // Links to work item #12345
public void Feature_Scenario_ExpectedBehavior() { }

// Multiple work items
[TestMethod]
[WorkItem(12345)]
[WorkItem(67890)]
public void Feature_CoversMultipleRequirements() { }

// GitHub issues (MSTest 3.8+)
[TestMethod]
[GitHubWorkItem("https://github.com/owner/repo/issues/42")]
public void BugFix_Issue42_IsResolved() { }
```

Work item associations appear in test results and can be used for:
- Tracing test coverage to requirements
- Linking bug fixes to regression tests
- Generating traceability reports in CI/CD pipelines

## Common Mistakes to Avoid

```csharp
// ❌ Wrong argument order
Assert.AreEqual(actual, expected);
// ✅ Correct
Assert.AreEqual(expected, actual);

// ❌ Using ExpectedException (obsolete)
[ExpectedException(typeof(ArgumentException))]
// ✅ Use Assert.Throws
Assert.Throws<ArgumentException>(() => Method());

// ❌ Using LINQ Single() - unclear exception
var item = items.Single();
// ✅ Use ContainsSingle - better failure message
var item = Assert.ContainsSingle(items);

// ❌ Hard cast - unclear exception
var handler = (MyHandler)result;
// ✅ Type assertion - shows actual type on failure
var handler = Assert.IsInstanceOfType<MyHandler>(result);

// ❌ Ignoring cancellation token
await client.GetAsync(url, CancellationToken.None);
// ✅ Flow test cancellation
await client.GetAsync(url, TestContext.CancellationToken);

// ❌ Making TestContext nullable - leads to unnecessary null checks
public TestContext? TestContext { get; set; }
// ❌ Using null! - MSTest already suppresses CS8618 for this property
public TestContext TestContext { get; set; } = null!;
// ✅ Declare without nullable or initializer - MSTest handles the warning
public TestContext TestContext { get; set; }
```

## Test Organization

- Group tests by feature or component
- Use `[TestCategory("Category")]` for filtering
- Use `[TestProperty("Name", "Value")]` for custom metadata (e.g., `[TestProperty("Bug", "12345")]`)
- Use `[Priority(1)]` for critical tests
- Enable relevant MSTest analyzers (MSTEST0020 for constructor preference)

## Mocking and Isolation

- Use Moq or NSubstitute for mocking dependencies
- Use interfaces to facilitate mocking
- Mock dependencies to isolate units under test
