---
applyTo: '**/*.Tests.ps1'
description: 'PowerShell Pester testing best practices based on Pester v6 conventions'
---

# PowerShell Pester v6 Testing Guidelines

This guide provides PowerShell-specific instructions for creating automated tests with the PowerShell Pester v6 module. Pester v6 runs on Windows PowerShell 5.1 and PowerShell 7.4+. Follow the general PowerShell scripting guidance in [powershell.instructions.md](./powershell.instructions.md).

Pester v6 is largely compatible with v5, but it makes several previously deprecated behaviours fail fast. Keep each test file self-contained and run the suite with the same PowerShell and Pester versions used by CI.

## File Naming and Structure

- **File Convention:** Use `*.Tests.ps1` naming pattern
- **Placement:** Place test files next to tested code or in dedicated test directories
- **Import Pattern:** Use `BeforeAll { . $PSScriptRoot/FunctionName.ps1 }` to import tested functions
- **No Direct Code:** Put ALL code inside Pester blocks (`BeforeAll`, `Describe`, `Context`, `It`, etc.)

## Test Structure Hierarchy

```powershell
BeforeAll { # Import tested functions }
Describe 'FunctionName' {
    Context 'When condition' {
        BeforeAll { # Setup for context }
        It 'Should behavior' { # Individual test }
        AfterAll { # Cleanup for context }
    }
}
```

## Discovery and Run

- Pester v6 discovers and runs one file at a time. Do not rely on discovery-time side effects from another test file (for example, a global variable, current directory, or imported module).
- Use `BeforeDiscovery` for data needed to construct tests and `BeforeAll` to import modules or initialise runtime state for the file.
- Keep every test file independently runnable; place shared setup in a Pester configuration (`Run.BeforeContainer`) or a repository `Pester.BeforeContainer.ps1` when it truly applies to all files.

```powershell
BeforeDiscovery {
    $cases = Get-Content "$PSScriptRoot/cases.json" | ConvertFrom-Json
}

BeforeAll {
    Import-Module "$PSScriptRoot/MyModule.psm1"
}

Describe 'MyModule' {
    It 'handles <Name>' -ForEach $cases { Invoke-Thing $Name | Should -Be 'ok' }
}
```

## Core Keywords

- **`Describe`**: Top-level grouping, typically named after function being tested
- **`Context`**: Sub-grouping within Describe for specific scenarios
- **`It`**: Individual test cases, use descriptive names
- **`Should`**: Classic assertion command (`Should -Be`, `Should -Throw`, etc.); existing v5 syntax remains supported
- **`Should-*`**: New v6 assertion commands (`Should-Be`, `Should-Throw`, etc.); adopt them deliberately, not as a required rename
- **`BeforeAll/AfterAll`**: Setup/teardown once per block
- **`BeforeEach/AfterEach`**: Setup/teardown before/after each test

## Setup and Teardown

- **`BeforeAll`**: Runs once at start of containing block, use for expensive operations
- **`BeforeEach`**: Runs before every `It` in block, use for test-specific setup
- **`AfterEach`**: Runs after every `It`, guaranteed even if test fails
- **`AfterAll`**: Runs once at end of block, use for cleanup
- **Variable Scoping**: `BeforeAll` variables are available to child blocks (read-only); `BeforeEach`, `It`, and `AfterEach` share their block scope
- **One hook of each type**: A block may contain only one `BeforeAll`, `BeforeEach`, `AfterAll`, or `AfterEach`; combine setup when necessary

## Assertions (Should)

- **Basic Comparisons**: `-Be`, `-BeExactly`, `-Not -Be`
- **Collections**: `-Contain`, `-BeIn`, `-HaveCount`
- **Numeric**: `-BeGreaterThan`, `-BeLessThan`, `-BeGreaterOrEqual`
- **Strings**: `-Match`, `-Like`, `-BeNullOrEmpty`
- **Types**: `-BeOfType`, `-BeTrue`, `-BeFalse`
- **Files**: `-Exist`, `-FileContentMatch`
- **Exceptions**: `-Throw`, `-Not -Throw`

## Mocking

- **`Mock CommandName { ScriptBlock }`**: Replace command behavior
- **`-ParameterFilter`**: Mock only when parameters match condition
- **`-Verifiable`**: Mark mock as requiring verification
- **`Should -Invoke`**: Verify mock was called specific number of times
- **`Should -InvokeVerifiable`**: Verify all verifiable mocks were called
- **Scope**: Mocks default to containing block scope

Pester v6 removes `Assert-MockCalled` and `Assert-VerifiableMock`; replace them with the `Should -Invoke` forms. Calls that miss every `-ParameterFilter` no longer fall through to the real command, so add a default mock whenever unmatched calls are valid.

```powershell
Mock Get-Service { @{ Status = 'Running' } } -ParameterFilter { $Name -eq 'TestService' }
Should -Invoke Get-Service -Exactly 1 -ParameterFilter { $Name -eq 'TestService' }
```

## Test Cases (Data-Driven Tests)

Use `-TestCases` or `-ForEach` for parameterized tests. In Pester v6, `$null` or an empty array throws instead of silently skipping; fix the data source or opt in to an empty case with `-AllowNullOrEmptyForEach` on the specific block.

```powershell
It 'Should return <Expected> for <Input>' -TestCases @(
    @{ Input = 'value1'; Expected = 'result1' }
    @{ Input = 'value2'; Expected = 'result2' }
) {
    Get-Function $Input | Should -Be $Expected
}
```

## Data-Driven Tests

- **`-ForEach`**: Available on `Describe`, `Context`, and `It` for generating multiple tests from data
- **`-TestCases`**: Alias for `-ForEach` on `It` blocks (backwards compatibility)
- **Hashtable Data**: Each item defines variables available in test (e.g., `@{ Name = 'value'; Expected = 'result' }`)
- **Array Data**: Uses `$_` variable for current item
- **Templates**: Use `<variablename>` in test names for dynamic expansion

```powershell
# Hashtable approach
It 'Returns <Expected> for <Name>' -ForEach @(
    @{ Name = 'test1'; Expected = 'result1' }
    @{ Name = 'test2'; Expected = 'result2' }
) { Get-Function $Name | Should -Be $Expected }

# Array approach
It 'Contains <_>' -ForEach 'item1', 'item2' { Get-Collection | Should -Contain $_ }
```

When a test name contains `<...>`, Pester v6 evaluates the token as a PowerShell expression. Backtick-escape the opening `<` when the text should remain literal.

## Tags

- **Available on**: `Describe`, `Context`, and `It` blocks
- **Filtering**: Use `-Tag` and `-ExcludeTag` with `Invoke-Pester`, or set `Filter.Tag` and `Filter.ExcludeTag` in `New-PesterConfiguration`
- **Wildcards**: Tags support `-like` wildcards for flexible filtering

```powershell
Describe 'Function' -Tag 'Unit' {
    It 'Should work' -Tag 'Fast', 'Stable' { }
    It 'Should be slow' -Tag 'Slow', 'Integration' { }
}

# Run only fast unit tests
Invoke-Pester -Tag 'Unit' -ExcludeTag 'Slow'
```

## Skip

- **`-Skip`**: Available on `Describe`, `Context`, and `It` to skip tests
- **Conditional**: Use `-Skip:$condition` for dynamic skipping
- **Runtime Skip**: Use `Set-ItResult -Skipped` or `Set-ItResult -Inconclusive` during test execution (setup/teardown still run)
- **Ends the test body**: `Set-ItResult -Skipped`/`-Inconclusive` throws internally to end the `It` block, so code after it does not run; a trailing `return` is unreachable and should not be added

```powershell
It 'Should work on Windows' -Skip:(-not $IsWindows) { }
Context 'Integration tests' -Skip { }
```

## Error Handling

- **Continue on Failure**: Use `Should.ErrorAction = 'Continue'` to collect multiple failures
- **Stop on Critical**: Use `-ErrorAction Stop` for pre-conditions
- **Test Exceptions**: Use `{ Code } | Should -Throw` for exception testing
- **Pending tests**: `Set-ItResult -Pending` was removed; use `-Inconclusive`, `-Skipped`, or `It -Skip`

## Best Practices

- **Descriptive Names**: Use clear test descriptions that explain behavior
- **AAA Pattern**: Arrange (setup), Act (execute), Assert (verify)
- **Isolated Tests**: Each test should be independent
- **Avoid Aliases**: Use full cmdlet names (`Where-Object` not `?`)
- **Single Responsibility**: One assertion per test when possible
- **Test File Organization**: Group related tests in Context blocks. Context blocks can be nested.

## Example Test Pattern

```powershell
BeforeAll {
    . $PSScriptRoot/Get-UserInfo.ps1
}

Describe 'Get-UserInfo' {
    Context 'When user exists' {
        BeforeAll {
            Mock Get-ADUser { @{ Name = 'TestUser'; Enabled = $true } }
        }

        It 'Should return user object' {
            $result = Get-UserInfo -Username 'TestUser'
            $result | Should -Not -BeNullOrEmpty
            $result.Name | Should -Be 'TestUser'
        }

        It 'Should call Get-ADUser once' {
            Get-UserInfo -Username 'TestUser'
            Should -Invoke Get-ADUser -Exactly 1
        }
    }

    Context 'When user does not exist' {
        BeforeAll {
            Mock Get-ADUser { throw "User not found" }
        }

        It 'Should throw exception' {
            { Get-UserInfo -Username 'NonExistent' } | Should -Throw "*not found*"
        }
    }
}
```

## Configuration

Configuration is defined **outside** test files when calling `Invoke-Pester` to control execution behavior.

```powershell
# Create configuration (Pester v6)
$config = New-PesterConfiguration
$config.Run.Path = './Tests'
$config.Output.Verbosity = 'Detailed'
$config.TestResult.Enabled = $true
$config.TestResult.OutputFormat = 'NUnitXml'
$config.Should.ErrorAction = 'Continue'
Invoke-Pester -Configuration $config
```

**Key Sections**: Run (Path, Exit), Filter (Tag, ExcludeTag), Output (Verbosity), TestResult (Enabled, OutputFormat), CodeCoverage (Enabled, Path), Should (ErrorAction), Debug
