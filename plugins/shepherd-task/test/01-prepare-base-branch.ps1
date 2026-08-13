<#
.SYNOPSIS
    Creates and initializes a shepherd-task test campaign.

.DESCRIPTION
    This script:
    1. Creates a new branch from the currently checked-out commit.
    2. Creates the campaign issue in GitHub.
    3. Invokes shepherd-task-init-campaign.ps1 to mint the campaign ID and
       create the campaign metadata directory.
    4. Writes the ignorance-reduction plan inside the campaign metadata directory.
    5. Commits and pushes the branch to origin.

    Enabling assumptions from plugins/shepherd-task/README.md must already
    be satisfied before running this script. This script creates a real GitHub
    issue, branch, commit, and remote branch.

.PARAMETER Repo
    GitHub repository in owner/repo format (e.g. "edburns/my-test-repo").

.PARAMETER BaseBranch
    The non-main base branch name (e.g. "edburns/dd-3034809-test-01").

.PARAMETER CampaignShortname
    Lowercase kebab-case short name used in the campaign metadata directory.

.PARAMETER LessonPropagation
    Immutable campaign lesson mode: off or campaign.

.EXAMPLE
    .\01-prepare-base-branch.ps1 -Repo edburns/my-test-repo -BaseBranch edburns/dd-3034809-test-01 -CampaignShortname math-tool-test -LessonPropagation campaign
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$Repo,

    [Parameter(Mandatory)]
    [string]$BaseBranch,

    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9]+(-[a-z0-9]+)*$')]
    [string]$CampaignShortname,

    [Parameter(Mandatory)]
    [ValidateSet('off', 'campaign')]
    [string]$LessonPropagation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($BaseBranch -eq 'main') {
    throw "BaseBranch must not be 'main'."
}

& git check-ref-format --branch $BaseBranch *> $null
if ($LASTEXITCODE -ne 0) {
    throw "BaseBranch is not a valid Git branch name: '$BaseBranch'."
}

$repoRootOutput = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $repoRootOutput) {
    throw 'Run this script inside the test Git worktree.'
}
$repoRoot = [System.IO.Path]::GetFullPath(($repoRootOutput | Select-Object -First 1).Trim())
$planFile = 'math-tool-ignorance-reduction-plan.md'

Write-Host "Repository:          $Repo"
Write-Host "Campaign base branch: $BaseBranch"
Write-Host "Campaign shortname:   $CampaignShortname"
Write-Host "Lesson propagation:   $LessonPropagation"
Write-Host ""

# ── Verify git state ────────────────────────────────────────────────────

$gitStatus = git -C $repoRoot status --porcelain 2>&1
if ($gitStatus) {
    throw "Working tree is not clean. Commit or stash changes before running this script."
}

# ── Create and switch to the base branch ─────────────────────────────────

Write-Host "Creating branch '$BaseBranch' from current HEAD..."
git -C $repoRoot checkout -b $BaseBranch 2>&1 | Write-Host
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create branch '$BaseBranch'. Does it already exist?"
}

# ── Create the campaign issue ────────────────────────────────────────────

$campaignIssueBody = @"
## shepherd-task test campaign: math-tool.ps1

This campaign contains four ordered tasks that build a PowerShell math-tool
script incrementally and exercise the shepherd-task pipeline end to end.

**Campaign base branch:** ``$BaseBranch``
**Campaign shortname:** ``$CampaignShortname``
**Lesson propagation:** ``$LessonPropagation``

The campaign metadata directory and campaign ID are initialized on the
campaign base branch by ``shepherd-task-init-campaign.ps1``.
"@

Write-Host "Creating campaign issue in '$Repo'..."
$campaignIssueUrlOutput = gh issue create `
    --repo $Repo `
    --title "[Campaign] shepherd-task test: math-tool.ps1" `
    --body $campaignIssueBody 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create campaign issue: $campaignIssueUrlOutput"
}
$campaignIssueUrl = ($campaignIssueUrlOutput | Select-Object -Last 1).Trim()
$campaignIssueNumber = [int]($campaignIssueUrl -split '/')[-1]
Write-Host "Created campaign issue #$campaignIssueNumber`: $campaignIssueUrl"

# ── Initialize campaign metadata ─────────────────────────────────────────

$initializer = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' 'scripts' 'shepherd-task-init-campaign.ps1')
)
if (-not (Test-Path -LiteralPath $initializer -PathType Leaf)) {
    throw "Campaign initializer not found: $initializer"
}

& $initializer `
    -CampaignIssueNumber $campaignIssueNumber `
    -CampaignShortname $CampaignShortname `
    -BaseBranch $BaseBranch `
    -Repo $Repo `
    -LessonPropagation $LessonPropagation

$manifestFiles = @(
    Get-ChildItem -LiteralPath $repoRoot -Directory |
        ForEach-Object {
            $candidate = Join-Path $_.FullName 'shepherd-campaign.json'
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                $manifest = Get-Content -LiteralPath $candidate -Raw | ConvertFrom-Json
                if ($manifest.campaignIssueNumber -eq $campaignIssueNumber) {
                    Get-Item -LiteralPath $candidate
                }
            }
        }
)
if ($manifestFiles.Count -ne 1) {
    throw "Expected exactly one campaign manifest for issue #$campaignIssueNumber; found $($manifestFiles.Count)."
}

$manifestPath = $manifestFiles[0].FullName
$campaign = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$campaignMetadataDirectory = [string]$campaign.campaignMetadataDirectory
$campaignMetadataPath = Split-Path -Parent $manifestPath
$planPath = Join-Path $campaignMetadataPath $planFile

Write-Host "Campaign ID:                $($campaign.campaignId)"
Write-Host "Lesson propagation:         $($campaign.lessonPropagation)"
Write-Host "Campaign metadata directory: $campaignMetadataDirectory"
Write-Host "Plan file:                  $campaignMetadataDirectory/$planFile"

# ── Write ignorance-reduction plan ───────────────────────────────────────

$planContent = @"
# Implementation plan: PowerShell math-tool ($CampaignShortname)

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
└── $campaignMetadataDirectory/
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

Set-Content -LiteralPath $planPath -Value $planContent -Encoding utf8NoBOM
Write-Host "Wrote ignorance-reduction plan to '$planPath'"

# ── Commit and push ──────────────────────────────────────────────────────

Write-Host ""
Write-Host "Committing and pushing..."
git -C $repoRoot add -- $campaignMetadataDirectory
if ($LASTEXITCODE -ne 0) {
    throw "git add failed"
}

git -C $repoRoot commit -m "chore: initialize shepherd-task campaign #$campaignIssueNumber"
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed"
}

git -C $repoRoot push -u origin $BaseBranch
if ($LASTEXITCODE -ne 0) {
    throw "git push failed"
}

Write-Host ""
Write-Host "Done. Campaign #$campaignIssueNumber is initialized."
Write-Host "  Campaign issue:             $campaignIssueUrl"
Write-Host "  Campaign ID:                $($campaign.campaignId)"
Write-Host "  Lesson propagation:         $($campaign.lessonPropagation)"
Write-Host "  Campaign base branch:       $BaseBranch"
Write-Host "  Campaign metadata directory: $campaignMetadataDirectory"
Write-Host "  Plan:                       $campaignMetadataDirectory/$planFile"
Write-Host ""
Write-Host "Next step:"
Write-Host "  02-create-issues.ps1 -CampaignMetadataDirectory `"$campaignMetadataDirectory`""
