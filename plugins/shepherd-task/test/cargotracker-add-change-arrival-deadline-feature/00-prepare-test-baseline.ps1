<#
.SYNOPSIS
    Publishes the immutable Cargo Tracker feature-absent baseline.

.DESCRIPTION
    Verifies that the target repository contains the required prepared Cargo
    Tracker branch and that the exact feature-absent commit is an ancestor of
    that branch. Creates the shared baseline branch at that exact commit
    without modifying domain source, and pushes the branch.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$Repo,

    [Parameter(Mandatory)]
    [string]$BaselineBranch,

    [ValidateSet('20260902-2104Z-commit-e7b651f-liberty')]
    [string]$SourceBranch = '20260902-2104Z-commit-e7b651f-liberty',

    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$ExpectedBaselineSha = '9b9f311b2a3a2854bdac947593950d9edb6bca7d'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ExpectedBaselineSha = $ExpectedBaselineSha.ToLowerInvariant()

if ($BaselineBranch -eq 'main') {
    throw "BaselineBranch must not be 'main'."
}
foreach ($branch in @($BaselineBranch, $SourceBranch)) {
    & git check-ref-format --branch $branch *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Invalid Git branch name: '$branch'."
    }
}
if ($BaselineBranch -eq $SourceBranch) {
    throw 'BaselineBranch must differ from SourceBranch.'
}

$repoRootOutput = @(git rev-parse --show-toplevel 2>$null)
$gitExitCode = $LASTEXITCODE
if ($gitExitCode -ne 0 -or $repoRootOutput.Count -eq 0) {
    throw 'Run this script inside the fresh target-repository checkout.'
}
$repoRoot = [System.IO.Path]::GetFullPath(
    ([string]($repoRootOutput | Select-Object -First 1)).Trim()
)
if (git -C $repoRoot status --porcelain) {
    throw 'Working tree is not clean. Commit or stash changes before preparing the baseline.'
}

$resolver = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts' 'resolve-repository-remote.ps1')
)
$baseRemote = & $resolver -Repo $Repo

git -C $repoRoot show-ref --verify --quiet "refs/heads/$BaselineBranch"
if ($LASTEXITCODE -eq 0) {
    throw "Local baseline branch already exists: '$BaselineBranch'."
}

Write-Host "Fetching required source branch '$SourceBranch' from remote '$baseRemote'..."
git -C $repoRoot fetch --no-tags $baseRemote "refs/heads/${SourceBranch}"
if ($LASTEXITCODE -ne 0) {
    throw "Required source branch '$baseRemote/$SourceBranch' is missing or could not be fetched."
}

$fetchedShaOutput = @(git -C $repoRoot rev-parse FETCH_HEAD 2>$null)
$gitExitCode = $LASTEXITCODE
if ($gitExitCode -ne 0 -or $fetchedShaOutput.Count -eq 0) {
    throw "Could not resolve the fetched '$SourceBranch' commit."
}
$fetchedSha = ([string]($fetchedShaOutput | Select-Object -First 1)).Trim().ToLowerInvariant()

git -C $repoRoot merge-base --is-ancestor $ExpectedBaselineSha $fetchedSha
if ($LASTEXITCODE -eq 1) {
    throw "Prepared baseline '$ExpectedBaselineSha' is not an ancestor of '$SourceBranch' at '$fetchedSha'."
}
if ($LASTEXITCODE -ne 0) {
    throw "Could not verify prepared baseline ancestry for '$baseRemote/$SourceBranch'."
}

foreach ($requiredPath in @(
    'pom.xml',
    'mvnw',
    'README.md',
    'src/main/java/org/eclipse/cargotracker/application/BookingService.java',
    'src/main/webapp/admin/tables/listNotRouted.xhtml'
)) {
    git -C $repoRoot cat-file -e "${ExpectedBaselineSha}:$requiredPath" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Baseline commit '$ExpectedBaselineSha' does not contain '$requiredPath'."
    }
}

foreach ($featurePath in @(
    'src/main/java/org/eclipse/cargotracker/interfaces/booking/web/ChangeArrivalDeadlineDate.java',
    'src/main/java/org/eclipse/cargotracker/interfaces/booking/web/ChangeArrivalDeadlineDateDialog.java',
    'src/main/webapp/admin/dialogs/changeArrivalDeadlineDate.xhtml'
)) {
    git -C $repoRoot cat-file -e "${ExpectedBaselineSha}:$featurePath" 2>$null
    if ($LASTEXITCODE -eq 0) {
        throw "Feature-bearing path already exists in baseline '$ExpectedBaselineSha': $featurePath"
    }
    if ($LASTEXITCODE -ne 128) {
        throw "Could not verify feature absence for '$featurePath'."
    }
}

git -C $repoRoot ls-remote --exit-code --heads $baseRemote $BaselineBranch *> $null
if ($LASTEXITCODE -eq 0) {
    throw "Remote baseline branch already exists: '$baseRemote/$BaselineBranch'."
}
if ($LASTEXITCODE -ne 2) {
    throw "Could not determine whether '$baseRemote/$BaselineBranch' exists."
}

git -C $repoRoot checkout -b $BaselineBranch $ExpectedBaselineSha
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create '$BaselineBranch' from '$ExpectedBaselineSha'."
}
git -C $repoRoot push -u $baseRemote $BaselineBranch
if ($LASTEXITCODE -ne 0) {
    throw "Failed to push '$BaselineBranch' to '$baseRemote'."
}

Write-Host ''
Write-Host '=== IMMUTABLE SHARED BASELINE SHA ===' -ForegroundColor Green
Write-Host $ExpectedBaselineSha -ForegroundColor Green
Write-Host "Required source branch: $baseRemote/$SourceBranch"
Write-Host "Source branch tip:      $fetchedSha"
Write-Host 'No domain source or fixture application code was generated.'
Write-Host 'Use this exact 40-character SHA for both campaigns.'
