<#
.SYNOPSIS
    Prepares the base branch for a shepherd-task test run by creating
    the remove-before-merge directory with an ignorance-reduction plan.

.DESCRIPTION
    This script:
    1. Creates a new branch from the currently checked-out commit.
    2. Creates the <slug>-remove-before-merge/ directory.
    3. Writes the ignorance-reduction plan for the math-tool scenario.
    4. Commits and pushes the branch to origin.

    Enabling assumptions from plugins/shepherd-task/README.md must already
    be satisfied before running this script.

.PARAMETER Repo
    GitHub repository in owner/repo format (e.g. "edburns/my-test-repo").

.PARAMETER BaseBranch
    The non-main base branch name (e.g. "edburns/dd-3034809-test-01").
    The slug after the last "/" is used for directory and file naming.

.EXAMPLE
    .\01-prepare-base-branch.ps1 -Repo edburns/my-test-repo -BaseBranch edburns/dd-3034809-test-01
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

$rbmDir  = "$slug-remove-before-merge"
$planFile = "$slug-ignorance-reduction-plan.md"

Write-Host "Repo:            $Repo"
Write-Host "Base branch:     $BaseBranch"
Write-Host "Slug:            $slug"
Write-Host "RBM directory:   $rbmDir"
Write-Host "Plan file:       $rbmDir/$planFile"
Write-Host ""

# ── Verify git state ────────────────────────────────────────────────────

$gitStatus = git status --porcelain 2>&1
if ($gitStatus) {
    throw "Working tree is not clean. Commit or stash changes before running this script."
}

# ── Create and switch to the base branch ─────────────────────────────────

Write-Host "Creating branch '$BaseBranch' from current HEAD..."
git checkout -b $BaseBranch 2>&1 | Write-Host
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create branch '$BaseBranch'. Does it already exist?"
}

# ── Create remove-before-merge directory ─────────────────────────────────

Write-Host "Creating directory '$rbmDir'..."
New-Item -ItemType Directory -Path $rbmDir -Force | Out-Null

# ── Write ignorance-reduction plan ───────────────────────────────────────

$planContent = @"
# Implementation plan: PowerShell math-tool ($slug)

Human DRI: (test harness — automated)
Project root: repository root
Test framework: Pester 5

---

## Goal

Build a PowerShell math-tool script (``math-tool.ps1``) incrementally across
four sequential tasks.  Each task is a separate GitHub issue assigned to the
Copilot coding agent.  The purpose is to exercise the **shepherd-task**
pipeline end-to-end: issue assignment → PR creation → CI → code review →
merge to base branch.

The domain is intentionally trivial (Fibonacci and factorial computation) so
that token cost is low and failures are easy to diagnose.

### Technology stack

| Concern | Technology |
|---------|-----------|
| Runtime | PowerShell 7 (``pwsh``) |
| Test framework | Pester 5 |
| CI validation | Script exit codes + Pester ``-PassThru`` |

### Deliverables

| File | Purpose |
|------|---------|
| ``math-tool.ps1`` | Main script with math functions and CLI interface |
| ``math-tool.Tests.ps1`` | Pester 5 test suite |

---

## Phase 1 — Architecture

### 1.1 — Script structure

The script follows standard PowerShell conventions:

| Element | Design |
|---------|--------|
| Functions | ``Get-Fibonacci``, ``Get-Factorial`` — pure functions, no side effects |
| Parameters | Script-level ``param()`` block with ``-N``, ``-Operation``, ``-Verbose`` |
| Output | Single line to stdout: ``<Operation>(<N>) = <result>`` |
| Types | ``[int]`` for ``-N``, ``[bigint]`` for factorial results |
| Validation | ``[ValidateRange(0, 100)]`` on ``-N``, ``[ValidateSet()]`` on ``-Operation`` |

### 1.2 — Test structure

| Pattern | Approach |
|---------|----------|
| Unit tests | Dot-source ``math-tool.ps1``, test ``Get-Fibonacci`` and ``Get-Factorial`` directly |
| Integration tests | Invoke ``pwsh -File math-tool.ps1 <args>`` and assert stdout content |
| Error tests | Invoke with invalid args, assert non-zero exit or error output |

### 1.3 — Final file layout

```
(repo root)
├── math-tool.ps1              # Main script
├── math-tool.Tests.ps1        # Pester 5 test suite
└── $rbmDir/
    └── $planFile              # This file
```

---

## Phase 2 — Ignorance reduction

### 2.1 — Pester availability

**Question:** Is Pester 5 available in the Copilot coding agent's GitHub Actions
runner environment?

**Resolution:** Yes. GitHub-hosted ``ubuntu-latest`` runners include PowerShell 7
with Pester 5 pre-installed. If not present, ``Install-Module Pester -Force
-Scope CurrentUser`` is a one-line fix that the agent can use.

### 2.2 — BigInt support in PowerShell

**Question:** Does PowerShell support ``[bigint]`` for large factorial values?

**Resolution:** Yes. PowerShell 7 supports ``[bigint]`` (``System.Numerics.BigInteger``)
natively. ``Get-Factorial -N 100`` produces the correct 158-digit result without
overflow.

### 2.3 — Script-level param() and dot-sourcing interaction

**Question:** When a Pester test dot-sources ``math-tool.ps1``, does the
script-level ``param()`` block interfere?

**Resolution:** Yes, this is a known pattern. The script must guard its
main execution logic so that dot-sourcing only defines the functions.
Standard pattern:

```powershell
# Functions defined here are available after dot-sourcing
function Get-Fibonacci { ... }
function Get-Factorial { ... }

# Main execution — only runs when script is invoked directly
if (`$MyInvocation.InvocationName -ne '.') {
    # param() values are used here
    ...
}
```

Alternatively, put the main logic after the functions and use ``param()`` at
the top — Pester tests can dot-source and then call functions directly,
ignoring the main output.

---

## Phase 3 — Implementation (build order)

Each step is a separate GitHub issue assigned to the Copilot coding agent.

### 3.1 — Hardcoded Fibonacci(10) with Pester tests

**What:** Create ``math-tool.ps1`` with a ``Get-Fibonacci`` function and a
hardcoded call to ``Get-Fibonacci -N 10``.  Create ``math-tool.Tests.ps1``
with Pester 5 tests.

**Key files:**
- ``math-tool.ps1`` — ``Get-Fibonacci`` function (iterative), hardcoded output
- ``math-tool.Tests.ps1`` — tests for N=0, 1, 10, 20

**Gating criteria:**
1. ``pwsh -File math-tool.ps1`` prints ``Fibonacci(10) = 55``
2. ``Invoke-Pester -Path math-tool.Tests.ps1 -PassThru`` — all tests pass
3. Exit code 0

### 3.2 — Parameterize N from command line

**What:** Add a script-level ``param()`` block with ``[int]`$N = 10``.
Update tests to cover parameterized invocation.

**Key files:**
- ``math-tool.ps1`` — add ``param()`` block, dynamic output
- ``math-tool.Tests.ps1`` — add script invocation tests

**Gating criteria:**
1. ``pwsh -File math-tool.ps1`` prints ``Fibonacci(10) = 55`` (default)
2. ``pwsh -File math-tool.ps1 -N 15`` prints ``Fibonacci(15) = 610``
3. ``pwsh -File math-tool.ps1 -N 0`` prints ``Fibonacci(0) = 0``
4. All Pester tests pass

### 3.3 — Add factorial operation

**What:** Add ``Get-Factorial`` function and ``-Operation`` parameter with
``[ValidateSet('fibonacci','factorial')]``.

**Key files:**
- ``math-tool.ps1`` — add ``Get-Factorial``, ``-Operation`` parameter, dispatch logic
- ``math-tool.Tests.ps1`` — add factorial unit tests and script invocation tests

**Gating criteria:**
1. ``pwsh -File math-tool.ps1 -Operation factorial -N 5`` prints ``Factorial(5) = 120``
2. ``pwsh -File math-tool.ps1 -Operation fibonacci -N 10`` prints ``Fibonacci(10) = 55``
3. Default (no ``-Operation``) still prints ``Fibonacci(10) = 55``
4. All Pester tests pass

### 3.4 — Input validation, error handling, and help

**What:** Add ``[ValidateRange(0, 100)]``, comment-based help, and ``-Verbose``
output.

**Key files:**
- ``math-tool.ps1`` — validation attributes, help block, verbose messages
- ``math-tool.Tests.ps1`` — validation error tests, verbose output test, help test

**Gating criteria:**
1. ``pwsh -File math-tool.ps1 -N -1`` produces a validation error
2. ``pwsh -File math-tool.ps1 -N 50 -Operation factorial`` succeeds (large factorial)
3. ``pwsh -File math-tool.ps1 -Verbose -N 5`` includes verbose text
4. ``Get-Help .\math-tool.ps1`` shows SYNOPSIS
5. All Pester tests pass
"@

$planPath = Join-Path $rbmDir $planFile
Set-Content -Path $planPath -Value $planContent -Encoding utf8NoBOM
Write-Host "Wrote ignorance-reduction plan to '$planPath'"

# ── Commit and push ──────────────────────────────────────────────────────

Write-Host ""
Write-Host "Committing and pushing..."
git add $rbmDir
git commit -m "chore: add $rbmDir with ignorance-reduction plan for math-tool test"
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed"
}

git push -u origin $BaseBranch
if ($LASTEXITCODE -ne 0) {
    throw "git push failed"
}

Write-Host ""
Write-Host "Done. Base branch '$BaseBranch' is ready."
Write-Host "  Remote: https://github.com/$Repo/tree/$BaseBranch"
Write-Host "  Plan:   $rbmDir/$planFile"
Write-Host ""
Write-Host "Next step: run 02-create-issues.ps1 -Repo $Repo -BaseBranch $BaseBranch"
