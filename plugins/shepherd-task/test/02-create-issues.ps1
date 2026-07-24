<#
.SYNOPSIS
    Creates a parent epic and four sequential child issues for the
    shepherd-task math-tool test scenario.

.DESCRIPTION
    This script creates a deterministic set of GitHub issues that exercise
    the shepherd-task pipeline end-to-end.  Each child issue is a small,
    well-scoped coding task for a PowerShell math-tool script.  The issues
    build on one another sequentially, exactly as shepherd-task expects.

    Enabling assumptions from plugins/shepherd-task/README.md must already
    be satisfied before running this script.

.PARAMETER Repo
    GitHub repository in owner/repo format (e.g. "edburns/my-test-repo").

.PARAMETER BaseBranch
    The non-main base branch on which work will happen
    (e.g. "edburns/math-tool-test").

.EXAMPLE
    .\02-create-issues.ps1 -Repo edburns/my-test-repo -BaseBranch edburns/math-tool-test
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$Repo,

    [Parameter(Mandatory)]
    [string]$BaseBranch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Derive names from base branch ────────────────────────────────────────

$slug = $BaseBranch
if ($slug -match '/') {
    $slug = $slug.Substring($slug.LastIndexOf('/') + 1)
}

$rbmDir   = "$slug-remove-before-merge"
$planFile = "$slug-ignorance-reduction-plan.md"

# ── Helpers ──────────────────────────────────────────────────────────────

function New-Issue {
    param(
        [string]$Title,
        [string]$Body
    )
    $url = gh issue create `
        --repo $Repo `
        --title $Title `
        --body $Body 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create issue '$Title': $url"
    }
    # gh issue create prints the URL, e.g. https://github.com/owner/repo/issues/42
    $url = ($url | Select-Object -Last 1).Trim()
    $number = [int]($url -split '/')[-1]
    $parsed = [PSCustomObject]@{ number = $number; url = $url }
    Write-Host "  Created issue #$number`: $Title"
    return $parsed
}

function Add-SubIssue {
    param(
        [int]$ParentNumber,
        [int]$ChildNumber
    )
    $null = gh api graphql -f query="mutation {
        addSubIssue(input: {issueId: `"$($parentNodeId)`", subIssueId: `"$($childNodeIds[$ChildNumber])`"}) {
            issue { id }
        }
    }" 2>&1
}

# ── Issue body templates ─────────────────────────────────────────────────

$issue1Body = @"
## Task

Create a PowerShell script ``math-tool.ps1`` that computes the 10th Fibonacci number (hardcoded) and prints the result, plus a Pester test that validates it.

## Pre-reading (REQUIRED)

Before starting, read the implementation plan on the ``$BaseBranch`` branch:

``````
$rbmDir/$planFile
``````

Then carefully re-read these sections:
- **Phase 1, Section 1.1 — Script structure** (function and parameter conventions)
- **Phase 1, Section 1.2 — Test structure** (Pester patterns)
- **Phase 3, Section 3.1 — Hardcoded Fibonacci** (this task's specification)

## Branch

Work on branch: ``$BaseBranch`` (push to ``origin``).

## Specification

Create the following files in the repository root:

1. **``math-tool.ps1``**:
   - Implement a function ``Get-Fibonacci`` that computes the Nth Fibonacci number iteratively (not recursively)
   - The script calls ``Get-Fibonacci -N 10`` and writes the result to stdout: ``Fibonacci(10) = 55``
   - The function must be defined with ``function Get-Fibonacci { [CmdletBinding()] param(...) ... }``
   - Use ``[int]`` parameter type for N

2. **``math-tool.Tests.ps1``** — Pester 5 test file:
   - Import ``math-tool.ps1`` via dot-sourcing
   - Test that ``Get-Fibonacci -N 0`` returns ``0``
   - Test that ``Get-Fibonacci -N 1`` returns ``1``
   - Test that ``Get-Fibonacci -N 10`` returns ``55``
   - Test that ``Get-Fibonacci -N 20`` returns ``6765``

## Gating criteria (ALL must pass before closing)

1. Running ``pwsh -File math-tool.ps1`` prints ``Fibonacci(10) = 55``
2. Running ``Invoke-Pester -Path math-tool.Tests.ps1 -PassThru`` shows all tests passing
3. The script exits with code 0
"@

$issue2Body = @"
## Task

Update ``math-tool.ps1`` to accept the Fibonacci index as a command-line parameter instead of using a hardcoded value.

## Pre-reading (REQUIRED)

Before starting, read the implementation plan on the ``$BaseBranch`` branch:

``````
$rbmDir/$planFile
``````

Then carefully re-read these sections:
- **Phase 2, Section 2.3 — Script-level param() and dot-sourcing** (interaction pattern)
- **Phase 3, Section 3.2 — Parameterize N** (this task's specification)

## Branch

Work on branch: ``$BaseBranch`` (push to ``origin``).

## Prerequisite

Issue 1 (Fibonacci hardcoded) must be complete. ``math-tool.ps1`` exists with a working ``Get-Fibonacci`` function.

## Specification

Modify the following files:

1. **``math-tool.ps1``**:
   - Add a ``param()`` block at script level with parameter ``[int]`$N = 10``
   - The script calls ``Get-Fibonacci -N `$N`` and prints ``Fibonacci(<N>) = <result>``
   - Default behavior (no argument) must still print ``Fibonacci(10) = 55``

2. **``math-tool.Tests.ps1``** — update Pester tests:
   - Keep all existing ``Get-Fibonacci`` unit tests
   - Add a test that invokes the script with ``-N 15`` and verifies stdout contains ``Fibonacci(15) = 610``
   - Add a test that invokes the script with no arguments and verifies stdout contains ``Fibonacci(10) = 55``

## Gating criteria (ALL must pass before closing)

1. ``pwsh -File math-tool.ps1`` prints ``Fibonacci(10) = 55`` (default)
2. ``pwsh -File math-tool.ps1 -N 15`` prints ``Fibonacci(15) = 610``
3. ``pwsh -File math-tool.ps1 -N 0`` prints ``Fibonacci(0) = 0``
4. All Pester tests pass
"@

$issue3Body = @"
## Task

Add a ``-Operation`` parameter to ``math-tool.ps1`` that supports both ``fibonacci`` and ``factorial`` operations.

## Pre-reading (REQUIRED)

Before starting, read the implementation plan on the ``$BaseBranch`` branch:

``````
$rbmDir/$planFile
``````

Then carefully re-read these sections:
- **Phase 2, Section 2.2 — BigInt support** (``[bigint]`` for large factorials)
- **Phase 3, Section 3.3 — Add factorial operation** (this task's specification)

## Branch

Work on branch: ``$BaseBranch`` (push to ``origin``).

## Prerequisite

Issue 2 (parameterized N) must be complete. ``math-tool.ps1`` accepts ``-N`` as a parameter.

## Specification

Modify the following files:

1. **``math-tool.ps1``**:
   - Add a new function ``Get-Factorial`` that computes N! iteratively using ``[bigint]`` to handle large values
   - Add parameter ``[ValidateSet('fibonacci','factorial')][string]`$Operation = 'fibonacci'``
   - The script dispatches to the correct function based on ``-Operation``
   - Output format: ``Fibonacci(<N>) = <result>`` or ``Factorial(<N>) = <result>``
   - Default behavior (no arguments) must still print ``Fibonacci(10) = 55``

2. **``math-tool.Tests.ps1``** — update Pester tests:
   - Keep all existing tests
   - Add ``Describe 'Get-Factorial'`` block with tests:
     - ``Get-Factorial -N 0`` returns ``1``
     - ``Get-Factorial -N 1`` returns ``1``
     - ``Get-Factorial -N 5`` returns ``120``
     - ``Get-Factorial -N 20`` returns ``2432902008176640000``
   - Add script-level tests:
     - ``-Operation factorial -N 5`` produces ``Factorial(5) = 120``
     - ``-Operation fibonacci -N 10`` produces ``Fibonacci(10) = 55``
     - Default (no ``-Operation``) still produces ``Fibonacci(10) = 55``

## Gating criteria (ALL must pass before closing)

1. ``pwsh -File math-tool.ps1 -Operation factorial -N 5`` prints ``Factorial(5) = 120``
2. ``pwsh -File math-tool.ps1 -Operation fibonacci -N 10`` prints ``Fibonacci(10) = 55``
3. ``pwsh -File math-tool.ps1`` prints ``Fibonacci(10) = 55`` (default unchanged)
4. All Pester tests pass (both Fibonacci and Factorial)
"@

$issue4Body = @"
## Task

Add input validation, error handling, and built-in help to ``math-tool.ps1``.

## Pre-reading (REQUIRED)

Before starting, read the implementation plan on the ``$BaseBranch`` branch:

``````
$rbmDir/$planFile
``````

Then carefully re-read these sections:
- **Phase 1, Section 1.1 — Script structure** (validation attributes)
- **Phase 2, Section 2.3 — Script-level param() and dot-sourcing** (dot-source safety for tests)
- **Phase 3, Section 3.4 — Input validation, error handling, and help** (this task's specification)

## Branch

Work on branch: ``$BaseBranch`` (push to ``origin``).

## Prerequisite

Issue 3 (multi-operation) must be complete. ``math-tool.ps1`` supports ``-Operation fibonacci`` and ``-Operation factorial``.

## Specification

Modify the following files:

1. **``math-tool.ps1``**:
   - Add ``[ValidateRange(0, 100)]`` to the ``-N`` parameter
   - Add comment-based help (``<# .SYNOPSIS ... .EXAMPLE ... #>``) at the top of the script
   - If ``-N`` is out of range, PowerShell's built-in validation should produce a clear error
   - Add a ``-Verbose`` switch that, when present, prints the computation method (e.g., ``Computing fibonacci(10) iteratively...``) before the result

2. **``math-tool.Tests.ps1``** — update Pester tests:
   - Keep all existing tests
   - Add tests for validation:
     - Invoking with ``-N -1`` should throw a validation error
     - Invoking with ``-N 101`` should throw a validation error
   - Add test for verbose output:
     - ``-Verbose -N 5`` should include verbose stream text containing ``Computing``
   - Add test for help:
     - ``Get-Help .\math-tool.ps1`` should return help text containing ``SYNOPSIS``

## Gating criteria (ALL must pass before closing)

1. ``pwsh -File math-tool.ps1 -N -1`` produces a validation error (non-zero exit)
2. ``pwsh -File math-tool.ps1 -N 50 -Operation factorial`` succeeds (large factorial works with ``[bigint]``)
3. ``pwsh -File math-tool.ps1 -Verbose -N 5`` prints verbose text plus ``Fibonacci(5) = 5``
4. ``Get-Help .\math-tool.ps1`` shows help with SYNOPSIS
5. All Pester tests pass
"@

# ── Create the parent epic ───────────────────────────────────────────────

Write-Host "Creating issues in $Repo on branch $BaseBranch..."
Write-Host ""

$epicBody = @"
## shepherd-task test scenario: math-tool.ps1

This epic contains four sequential tasks that build a PowerShell math-tool
script incrementally.  The tasks are designed to exercise the shepherd-task
pipeline end-to-end.

**Base branch:** ``$BaseBranch``

### Tasks

1. Hardcoded Fibonacci(10) with Pester tests
2. Parameterize N from command line
3. Add factorial operation (multi-operation dispatch)
4. Input validation, error handling, and help

Each task builds on the previous one.  Run them in order via
``shepherd-task-given-list.ps1``.
"@

Write-Host "[1/5] Creating parent epic..."
$epic = New-Issue -Title "[Epic] shepherd-task test: math-tool.ps1" -Body $epicBody

# ── Create child issues ──────────────────────────────────────────────────

Write-Host "[2/5] Creating task 1..."
$t1 = New-Issue `
    -Title "1 — Hardcoded Fibonacci: create math-tool.ps1 with Pester tests" `
    -Body $issue1Body

Write-Host "[3/5] Creating task 2..."
$t2 = New-Issue `
    -Title "2 — Parameterize N: accept -N from command line" `
    -Body $issue2Body

Write-Host "[4/5] Creating task 3..."
$t3 = New-Issue `
    -Title "3 — Multi-operation: add -Operation (fibonacci | factorial)" `
    -Body $issue3Body

Write-Host "[5/5] Creating task 4..."
$t4 = New-Issue `
    -Title "4 — Validation and help: input guards, verbose output, comment-based help" `
    -Body $issue4Body

# ── Link child issues to the parent epic via sub-issues API ──────────────

Write-Host ""
Write-Host "Linking child issues to parent epic #$($epic.number)..."

$epicNodeId = gh api "repos/$Repo/issues/$($epic.number)" --jq .node_id
$childIssues = @($t1, $t2, $t3, $t4)

foreach ($child in $childIssues) {
    $childNodeId = gh api "repos/$Repo/issues/$($child.number)" --jq .node_id
    $mutation = "mutation { addSubIssue(input: {issueId: `"$epicNodeId`", subIssueId: `"$childNodeId`"}) { issue { id } } }"
    $null = gh api graphql -f query=$mutation
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not link #$($child.number) as sub-issue of #$($epic.number) (sub-issues API may not be available)"
    } else {
        Write-Host "  Linked #$($child.number) -> parent #$($epic.number)"
    }
}

# ── Summary ──────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Done. Created issues in $Repo :"
Write-Host ""
Write-Host "  Epic:   #$($epic.number)  $($epic.url)"
Write-Host "  Task 1: #$($t1.number)  $($t1.url)"
Write-Host "  Task 2: #$($t2.number)  $($t2.url)"
Write-Host "  Task 3: #$($t3.number)  $($t3.url)"
Write-Host "  Task 4: #$($t4.number)  $($t4.url)"
Write-Host ""
Write-Host "To run shepherd-task on these issues:"
Write-Host ""
Write-Host "  shepherd-task-given-list.ps1 `"$($t1.number),$($t2.number),$($t3.number),$($t4.number)`" $BaseBranch $Repo"
