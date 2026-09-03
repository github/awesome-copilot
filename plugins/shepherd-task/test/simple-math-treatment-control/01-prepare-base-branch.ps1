<#
.SYNOPSIS
    Creates one shepherd-task mechanism-experiment campaign.

.DESCRIPTION
    Creates a campaign branch from an exact immutable fixture SHA, creates the
    real campaign issue, initializes stage 00, writes a controlled two-task
    plan and experiment metadata, then commits and pushes the campaign state.
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
    [string]$LessonPropagation,

    [Parameter(Mandatory)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$BaselineSha
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$BaselineSha = $BaselineSha.ToLowerInvariant()

if ($BaseBranch -eq 'main') { throw "BaseBranch must not be 'main'." }
& git check-ref-format --branch $BaseBranch *> $null
if ($LASTEXITCODE -ne 0) { throw "Invalid BaseBranch: '$BaseBranch'." }

$repoRootOutput = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $repoRootOutput) {
    throw 'Run this script inside the target test worktree.'
}
$repoRoot = [System.IO.Path]::GetFullPath(($repoRootOutput | Select-Object -First 1).Trim())
if (git -C $repoRoot status --porcelain) {
    throw 'Working tree is not clean. Commit or stash changes before creating a campaign.'
}

$resolver = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts' 'resolve-repository-remote.ps1')
)
$baseRemote = & $resolver -Repo $Repo
git -C $repoRoot fetch --no-tags $baseRemote
if ($LASTEXITCODE -ne 0) { throw "Failed to fetch remote '$baseRemote'." }

git -C $repoRoot cat-file -e "$BaselineSha^{commit}" 2>$null
if ($LASTEXITCODE -ne 0) { throw "BaselineSha is not an available commit: '$BaselineSha'." }
foreach ($baselineFile in @(
    '.github/workflows/shepherd-task-math-tool.yml',
    'eng/test-math-tool.ps1'
)) {
    git -C $repoRoot cat-file -e "${BaselineSha}:$baselineFile" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Baseline commit '$BaselineSha' does not contain '$baselineFile'."
    }
}

git -C $repoRoot show-ref --verify --quiet "refs/heads/$BaseBranch"
if ($LASTEXITCODE -eq 0) { throw "Local campaign branch already exists: '$BaseBranch'." }
git -C $repoRoot ls-remote --exit-code --heads $baseRemote $BaseBranch *> $null
if ($LASTEXITCODE -eq 0) { throw "Remote campaign branch already exists: '$baseRemote/$BaseBranch'." }
if ($LASTEXITCODE -ne 2) { throw "Could not determine whether '$baseRemote/$BaseBranch' exists." }

git -C $repoRoot checkout -b $BaseBranch $BaselineSha
if ($LASTEXITCODE -ne 0) { throw "Failed to create '$BaseBranch' from '$BaselineSha'." }

$campaignIssueBody = @"
## Shepherd-task lesson propagation mechanism experiment

This is the **$LessonPropagation** arm of a controlled two-campaign mechanism
experiment. It contains two serial math-tool tasks. This experiment checks that
the lesson propagation machinery behaves as designed; it does not prove causal
productivity.

- Campaign base branch: ``$BaseBranch``
- Campaign shortname: ``$CampaignShortname``
- Lesson propagation: ``$LessonPropagation``
- Shared immutable baseline SHA: ``$BaselineSha``
- Expected task count: 2
- Task 1: Fibonacci implementation and unit/CLI tests
- Task 2: factorial and operation dispatch using the same test infrastructure
"@

$campaignIssueOutput = gh issue create --repo $Repo `
    --title "[Campaign][$LessonPropagation] shepherd-task math mechanism experiment" `
    --body $campaignIssueBody 2>&1
if ($LASTEXITCODE -ne 0) { throw "Failed to create campaign issue: $campaignIssueOutput" }
$campaignIssueUrl = ($campaignIssueOutput | Select-Object -Last 1).Trim()
if ($campaignIssueUrl -notmatch '/issues/([1-9][0-9]*)$') {
    throw "Could not parse campaign issue number from '$campaignIssueUrl'."
}
$campaignIssueNumber = [int]$Matches[1]

$initializer = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts' 'shepherd-task-00-init-campaign.ps1')
)
& $initializer -CampaignIssueNumber $campaignIssueNumber `
    -CampaignShortname $CampaignShortname -BaseBranch $BaseBranch -Repo $Repo `
    -LessonPropagation $LessonPropagation

$campaignMetadataDirectory = "$campaignIssueNumber-$CampaignShortname-remove-before-merge"
$campaignMetadataPath = Join-Path $repoRoot $campaignMetadataDirectory
$manifestPath = Join-Path $campaignMetadataPath 'shepherd-campaign.json'
$campaign = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ([string]$campaign.lessonPropagation -ne $LessonPropagation) {
    throw 'Initialized campaign mode does not match the requested experiment mode.'
}

$planFile = 'math-tool-ignorance-reduction-plan.md'
$canonicalCommand = 'pwsh -NoLogo -NoProfile -File ./eng/test-math-tool.ps1'
$plan = @"
# PowerShell math-tool mechanism experiment

Build the fixture in two cheap, serial tasks. The repository already contains
deterministic CI pinned to Pester 5.7.1. The acceptance command for every task
is ``$canonicalCommand``. Task 2 starts only after task 1 is merged.

## Ignorance reduction

### Repository-owned validation

**Question:** What command and environment define acceptance?

**Resolution:** The committed canonical command is
``$canonicalCommand``. The baseline workflow
``.github/workflows/shepherd-task-math-tool.yml`` installs exactly Pester
5.7.1 and invokes that repository-owned runner. Do not replace or bypass it.

### Output and ordering contracts

**Question:** What externally observable behavior and dependency order are required?

**Resolution:** Direct CLI execution writes exactly one result line to stdout:
``Fibonacci(N) = value`` or ``Factorial(N) = value``. Functions return the
numeric value without incidental output. Inputs are non-negative integers.
Implementation is serial: task 2 depends on merged task 1. The implementation
and test files are repository-root ``math-tool.ps1`` and
``math-tool.Tests.ps1``.

## Implementation

### 1. Implement Fibonacci with unit and isolated CLI coverage

Create ``math-tool.ps1`` with parameter ``N`` and a pure ``Get-Fibonacci``
function. Direct execution must print exactly ``Fibonacci(N) = value``.
Create ``math-tool.Tests.ps1`` containing dot-sourced unit tests for the
function and isolated child-``pwsh`` process tests for direct CLI behavior.
Cover N=0, N=1, and a small representative value. Keep changes limited to the
math tool and its tests.

Acceptance: ``$canonicalCommand`` exits zero and the pinned pull-request CI
passes.

### 2. Add factorial and operation dispatch

After task 1 is merged, extend the same script with a pure ``Get-Factorial``
function and an ``Operation`` parameter that dispatches between ``fibonacci``
and ``factorial`` while retaining ``N``. Preserve Fibonacci behavior. Cover
factorial edge cases 0 and 1 plus a small representative value. Keep the
interface and tests objective and small; the issue does not prescribe how to
extend the tests.

Acceptance: ``$canonicalCommand`` exits zero for the combined regression suite
and the pinned pull-request CI passes.
"@
Set-Content -LiteralPath (Join-Path $campaignMetadataPath $planFile) -Value $plan -Encoding utf8NoBOM

$experiment = [ordered]@{
    schemaVersion = 1
    baselineSha = $BaselineSha
    lessonPropagation = $LessonPropagation
    expectedTaskCount = 2
}
$experiment | ConvertTo-Json -Depth 3 |
    Set-Content -LiteralPath (Join-Path $campaignMetadataPath 'shepherd-test-experiment.json') -Encoding utf8NoBOM

git -C $repoRoot add -- $campaignMetadataDirectory
if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
git -C $repoRoot commit -m "test: initialize $LessonPropagation mechanism campaign #$campaignIssueNumber"
if ($LASTEXITCODE -ne 0) { throw 'git commit failed.' }

$firstParent = (git -C $repoRoot rev-parse 'HEAD^').Trim()
if ($firstParent -ne $BaselineSha) {
    throw "Campaign init commit parent '$firstParent' is not baseline '$BaselineSha'."
}
git -C $repoRoot push -u $baseRemote $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "Failed to push '$BaseBranch' to '$baseRemote'." }

Write-Host ''
Write-Host 'Campaign initialized.' -ForegroundColor Green
Write-Host "  Mode:               $LessonPropagation"
Write-Host "  Campaign issue:     $campaignIssueUrl"
Write-Host "  Campaign ID:        $($campaign.campaignId)"
Write-Host "  Base remote:        $baseRemote"
Write-Host "  Baseline SHA:       $BaselineSha"
Write-Host "  Init commit parent: $firstParent"
Write-Host "  Metadata directory: $campaignMetadataDirectory"
Write-Host ''
Write-Host "Next: 02-create-issues.ps1 -CampaignMetadataDirectory `"$campaignMetadataDirectory`""
