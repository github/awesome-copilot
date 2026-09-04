<#
.SYNOPSIS
    Bootstraps the immutable baseline for shepherd-task mechanism experiments.

.DESCRIPTION
    Creates a non-main baseline branch from the target repository's fetched
    default-branch tip, adds deterministic PowerShell/Pester CI, commits it,
    and pushes it to the unique remote whose URL matches Repo.

.PARAMETER Repo
    GitHub repository in OWNER/REPO form.

.PARAMETER BaselineBranch
    New non-main branch that will hold the shared immutable baseline.

.PARAMETER PesterVersion
    Exact Pester version installed by both local and CI test runners.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$Repo,

    [Parameter(Mandatory)]
    [string]$BaselineBranch,

    [ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+$')]
    [string]$PesterVersion = '5.7.1'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($BaselineBranch -eq 'main') {
    throw "BaselineBranch must not be 'main'."
}
& git check-ref-format --branch $BaselineBranch *> $null
if ($LASTEXITCODE -ne 0) {
    throw "BaselineBranch is not a valid Git branch name: '$BaselineBranch'."
}

$repoRootOutput = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $repoRootOutput) {
    throw 'Run this script inside the fresh target-repository checkout.'
}
$repoRoot = [System.IO.Path]::GetFullPath(($repoRootOutput | Select-Object -First 1).Trim())
if (git -C $repoRoot status --porcelain) {
    throw 'Working tree is not clean. Commit or stash changes before preparing the baseline.'
}

$resolver = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts' 'resolve-repository-remote.ps1')
)
$baseRemote = & $resolver -Repo $Repo

$repositoryInfoOutput = gh repo view $Repo --json defaultBranchRef 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Unable to query repository '$Repo' default branch: $repositoryInfoOutput"
}
try {
    $repositoryInfo = $repositoryInfoOutput | ConvertFrom-Json
}
catch {
    throw "Repository '$Repo' returned invalid metadata: $($_.Exception.Message)"
}
$defaultBranch = [string]$repositoryInfo.defaultBranchRef.name
if ([string]::IsNullOrWhiteSpace($defaultBranch)) {
    throw "Repository '$Repo' did not report a default branch."
}
if ($BaselineBranch -eq $defaultBranch) {
    throw "BaselineBranch must differ from the repository default branch '$defaultBranch'."
}

git -C $repoRoot show-ref --verify --quiet "refs/heads/$BaselineBranch"
if ($LASTEXITCODE -eq 0) {
    throw "Local baseline branch already exists: '$BaselineBranch'."
}

Write-Host "Fetching '$defaultBranch' from remote '$baseRemote'..."
git -C $repoRoot fetch --no-tags $baseRemote $defaultBranch
if ($LASTEXITCODE -ne 0) {
    throw "Failed to fetch '$defaultBranch' from '$baseRemote'."
}

git -C $repoRoot ls-remote --exit-code --heads $baseRemote $BaselineBranch *> $null
if ($LASTEXITCODE -eq 0) {
    throw "Remote baseline branch already exists: '$baseRemote/$BaselineBranch'."
}
if ($LASTEXITCODE -ne 2) {
    throw "Could not determine whether '$baseRemote/$BaselineBranch' exists."
}

git -C $repoRoot checkout -b $BaselineBranch FETCH_HEAD
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create '$BaselineBranch' from fetched default-branch tip."
}

$workflowDirectory = Join-Path $repoRoot '.github/workflows'
$engDirectory = Join-Path $repoRoot 'eng'
New-Item -ItemType Directory -Path $workflowDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $engDirectory -Force | Out-Null

$workflow = @"
name: Shepherd task math tool

on:
  pull_request:
  push:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    name: Shepherd task math tool
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Pester $PesterVersion
        shell: pwsh
        run: Install-Module Pester -RequiredVersion $PesterVersion -Scope CurrentUser -Force
      - name: Test math tool
        shell: pwsh
        run: ./eng/test-math-tool.ps1
"@

$runner = @'
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$requiredVersion = '__PESTER_VERSION__'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$implementationPath = Join-Path $repositoryRoot 'math-tool.ps1'
$testPath = Join-Path $repositoryRoot 'math-tool.Tests.ps1'

$implementationExists = Test-Path -LiteralPath $implementationPath -PathType Leaf
$testsExist = Test-Path -LiteralPath $testPath -PathType Leaf
if (-not $implementationExists -and -not $testsExist) {
    Write-Host 'Math-tool implementation has not been introduced yet; baseline validation passed.'
    exit 0
}
if (-not $implementationExists -or -not $testsExist) {
    throw 'math-tool.ps1 and math-tool.Tests.ps1 must be introduced together.'
}

$available = Get-Module -ListAvailable Pester |
    Where-Object { $_.Version.ToString() -eq $requiredVersion } |
    Select-Object -First 1
if (-not $available) {
    Write-Host "Installing Pester $requiredVersion in CurrentUser scope..."
    Install-Module Pester -RequiredVersion $requiredVersion -Scope CurrentUser -Force
}

Import-Module Pester -RequiredVersion $requiredVersion -Force
$result = Invoke-Pester -Path $testPath -PassThru
if ($result.FailedCount -gt 0) {
    Write-Error "Pester reported $($result.FailedCount) failed test(s)."
    exit 1
}
exit 0
'@.Replace('__PESTER_VERSION__', $PesterVersion)

Set-Content -LiteralPath (Join-Path $workflowDirectory 'shepherd-task-math-tool.yml') -Value $workflow -Encoding utf8NoBOM
Set-Content -LiteralPath (Join-Path $engDirectory 'test-math-tool.ps1') -Value $runner -Encoding utf8NoBOM

git -C $repoRoot add -- .github/workflows/shepherd-task-math-tool.yml eng/test-math-tool.ps1
if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
git -C $repoRoot commit -m 'test: bootstrap shepherd-task math fixture baseline'
if ($LASTEXITCODE -ne 0) { throw 'git commit failed.' }

$baselineSha = (git -C $repoRoot rev-parse HEAD).Trim()
if ($baselineSha -notmatch '^[0-9a-f]{40}$') {
    throw "Could not determine the full baseline commit SHA: '$baselineSha'."
}
git -C $repoRoot push -u $baseRemote $BaselineBranch
if ($LASTEXITCODE -ne 0) {
    throw "Failed to push '$BaselineBranch' to '$baseRemote'."
}

Write-Host ''
Write-Host '=== IMMUTABLE SHARED BASELINE SHA ===' -ForegroundColor Green
Write-Host $baselineSha -ForegroundColor Green
Write-Host 'Use this exact 40-character SHA for both campaigns.'
