---
description: 'Playwright .NET test generation instructions'
applyTo: '**'
---

# Playwright .NET Test Generation Instructions

## Test Writing Guidelines

### Code Quality Standards

- **Locators**: Prioritize user-facing, role-based locators (`GetByRole`, `GetByLabel`, `GetByText`, etc.) for resilience and accessibility. Use `await Test.StepAsync()` to group interactions and improve test readability and reporting.
- **Assertions**: Use auto-retrying web-first assertions. These assertions use `Expect()` from Playwright assertions (e.g., `await Expect(locator).ToHaveTextAsync()`). Avoid checking visibility unless specifically testing for visibility changes.
- **Timeouts**: Rely on Playwright's built-in auto-waiting mechanisms. Avoid hard-coded waits or increased default timeouts.
- **Clarity**: Use descriptive test and step titles that clearly state the intent. Add comments only to explain complex logic or non-obvious interactions.

### Test Structure

- **Usings**: Start with `using Microsoft.Playwright;` and either `using Microsoft.Playwright.Xunit;` or `using Microsoft.Playwright.NUnit;` or `using Microsoft.Playwright.MSTest;` for MSTest.
- **Organization**: Create test classes that inherit from `PageTest` (available in NUnit, xUnit, and MSTest packages) or use `IClassFixture<PlaywrightFixture>` for xUnit with custom fixtures. Group related tests for a feature in the same test class.
- **Setup**: Use `[SetUp]` (NUnit), `[TestInitialize]` (MSTest), or constructor initialization (xUnit) for setup actions common to all tests (e.g., navigating to a page).
- **Titles**: Use the appropriate test attribute (`[Test]` for NUnit, `[Fact]` for xUnit, `[TestMethod]` for MSTest) with descriptive method names following C# naming conventions (e.g., `SearchForMovieByTitle`).

### File Organization

- **Location**: Store all test files in a `Tests/` directory or organize by feature.
- **Naming**: Use the convention `<FeatureOrPage>Tests.cs` (e.g., `LoginTests.cs`, `SearchTests.cs`).
- **Scope**: Aim for one test class per major application feature or page.

### Assertion Best Practices

- **UI Structure**: Use `ToMatchAriaSnapshotAsync` to verify the accessibility tree structure of a component. This provides a comprehensive and accessible snapshot.
- **Element Counts**: Use `ToHaveCountAsync` to assert the number of elements found by a locator.
- **Text Content**: Use `ToHaveTextAsync` for exact text matches and `ToContainTextAsync` for partial matches.
- **Navigation**: Use `ToHaveURLAsync` to verify the page URL after an action.

## Example Test Structure

```csharp
using Microsoft.Playwright;
using Microsoft.Playwright.Xunit;
using static Microsoft.Playwright.Assertions;

namespace PlaywrightTests;

public class MovieSearchTests : PageTest
{
    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        // Navigate to the application before each test
        await Page.GotoAsync("https://debs-obrien.github.io/playwright-movies-app");
    }

    [Fact]
    public async Task SearchForMovieByTitle()
    {
        await Test.StepAsync("Activate and perform search", async () =>
        {
            await Page.GetByRole(AriaRole.Search).ClickAsync();
            var searchInput = Page.GetByRole(AriaRole.Textbox, new() { Name = "Search Input" });
            await searchInput.FillAsync("Garfield");
            await searchInput.PressAsync("Enter");
        });

        await Test.StepAsync("Verify search results", async () =>
        {
            // Verify the accessibility tree of the search results
            await Expect(Page.GetByRole(AriaRole.Main)).ToMatchAriaSnapshotAsync(@"
                - main:
                  - heading ""Garfield"" [level=1]
                  - heading ""search results"" [level=2]
                  - list ""movies"":
                    - listitem ""movie"":
                      - link ""poster of The Garfield Movie The Garfield Movie rating"":
                        - /url: /playwright-movies-app/movie?id=tt5779228&page=1
                        - img ""poster of The Garfield Movie""
                        - heading ""The Garfield Movie"" [level=2]
            ");
        });
    }
}
```

## Test Execution Strategy

1. **Initial Run**: Execute tests with `dotnet test` or using the test runner in your IDE
2. **Debug Failures**: Analyze test failures and identify root causes
3. **Iterate**: Refine locators, assertions, or test logic as needed
4. **Validate**: Ensure tests pass consistently and cover the intended functionality
5. **Report**: Provide feedback on test results and any issues discovered

## Quality Checklist

Before finalizing tests, ensure:

- [ ] All locators are accessible and specific and avoid strict mode violations
- [ ] Tests are grouped logically and follow a clear structure
- [ ] Assertions are meaningful and reflect user expectations
- [ ] Tests follow consistent naming conventions
- [ ] Code is properly formatted and commented
