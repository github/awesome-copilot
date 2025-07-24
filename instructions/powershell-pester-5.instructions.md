---
applyTo: '**/*.Tests.ps1'
description: 'PowerShell Pester testing best practices based on Pester v5 conventions'
---

# PowerShell Pester v5 Testing Guidelines

This guide provides PowerShell-specific instructions for creating automated tests using PowerShell Pester v5 module. Follow PowerShell cmdlet development guidelines in [powershell.instructions.md](./powershell.instructions.md) for general PowerShell scripting best practices.

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

## Core Keywords

- **`Describe`**: Top-level grouping, typically named after function being tested
- **`Context`**: Sub-grouping within Describe for specific scenarios
- **`It`**: Individual test cases, use descriptive names
- **`Should`**: Assertion keyword for test validation
- **`BeforeAll/AfterAll`**: Setup/teardown once per block
- **`BeforeEach/AfterEach`**: Setup/teardown before/after each test

## Setup and Teardown

- **`BeforeAll`**: Runs once at start of containing block, use for expensive operations
- **`BeforeEach`**: Runs before every `It` in block, use for test-specific setup
- **`AfterEach`**: Runs after every `It`, guaranteed even if test fails
- **`AfterAll`**: Runs once at end of block, use for cleanup
- **Variable Scoping**: `BeforeAll` variables available to child blocks (read-only), `BeforeEach/It/AfterEach` share same scope

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

```powershell
Mock Get-Service { @{ Status = 'Running' } } -ParameterFilter { $Name -eq 'TestService' }
Should -Invoke Get-Service -Exactly 1 -ParameterFilter { $Name -eq 'TestService' }
```

## Test Cases (Data-Driven Tests)

Use `-TestCases` or `-ForEach` for parameterized tests:

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

## Tags

- **Available on**: `Describe`, `Context`, and `It` blocks
- **Filtering**: Use `-TagFilter` and `-ExcludeTagFilter` with `Invoke-Pester`
- **Wildcards**: Tags support `-like` wildcards for flexible filtering

```powershell
Describe 'Function' -Tag 'Unit' {
    It 'Should work' -Tag 'Fast', 'Stable' { }
    It 'Should be slow' -Tag 'Slow', 'Integration' { }
}

# Run only fast unit tests
Invoke-Pester -TagFilter 'Unit' -ExcludeTagFilter 'Slow'
```

## Skip

- **`-Skip`**: Available on `Describe`, `Context`, and `It` to skip tests
- **Conditional**: Use `-Skip:$condition` for dynamic skipping
- **Runtime Skip**: Use `Set-ItResult -Skipped` during test execution (setup/teardown still run)

```powershell
It 'Should work on Windows' -Skip:(-not $IsWindows) { }
Context 'Integration tests' -Skip { }
```

## Error Handling

- **Continue on Failure**: Use `Should.ErrorAction = 'Continue'` to collect multiple failures
- **Stop on Critical**: Use `-ErrorAction Stop` for pre-conditions
- **Test Exceptions**: Use `{ Code } | Should -Throw` for exception testing

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
# Create configuration (Pester 5.2+)
$config = New-PesterConfiguration
$config.Run.Path = './Tests'
$config.Output.Verbosity = 'Detailed'
$config.TestResult.Enabled = $true
$config.TestResult.OutputFormat = 'NUnitXml'
$config.Should.ErrorAction = 'Continue'
Invoke-Pester -Configuration $config
```

**Key Sections**: Run (Path, Exit), Filter (Tag, ExcludeTag), Output (Verbosity), TestResult (Enabled, OutputFormat), CodeCoverage (Enabled, Path), Should (ErrorAction), Debug
