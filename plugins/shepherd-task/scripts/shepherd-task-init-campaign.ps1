<#
.SYNOPSIS
    Initializes durable shepherd-task campaign metadata.

.DESCRIPTION
    Creates a repository-root campaign metadata directory, mints one campaign
    GUID, and atomically writes shepherd-campaign.json and campaign-lessons.md.
    Existing campaign directories are rejected.

.PARAMETER CampaignIssueNumber
    Positive decimal GitHub issue number without '#'.

.PARAMETER CampaignShortname
    Lowercase ASCII kebab-case campaign short name.

.PARAMETER BaseBranch
    Checked-out non-main campaign base branch.

.PARAMETER Repo
    GitHub repository in OWNER/REPO format.

.PARAMETER LessonPropagation
    Immutable campaign lesson mode: off or campaign.

.EXAMPLE
    ./shepherd-task-init-campaign.ps1 3031763 improve-agentic-velocity edburns/dd-3031763-shepherd-task edburns/awesome-copilot campaign
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$CampaignIssueNumber,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$CampaignShortname,

    [Parameter(Mandatory = $true, Position = 2)]
    [string]$BaseBranch,

    [Parameter(Mandatory = $true, Position = 3)]
    [string]$Repo,

    [Parameter(Mandatory = $true, Position = 4)]
    [ValidateSet('off', 'campaign')]
    [string]$LessonPropagation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($CampaignIssueNumber -notmatch '^[1-9][0-9]*$') {
    throw "CAMPAIGN_ISSUE_NUMBER must be a positive integer; received '$CampaignIssueNumber'."
}

if ($CampaignShortname -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
    throw "CAMPAIGN_SHORTNAME must be lowercase ASCII kebab-case; received '$CampaignShortname'."
}

if ($BaseBranch -eq 'main') {
    throw "BASE_BRANCH must not be 'main'."
}

& git check-ref-format --branch $BaseBranch *> $null
if ($LASTEXITCODE -ne 0) {
    throw "BASE_BRANCH is not a valid Git branch name; received '$BaseBranch'."
}

if ($Repo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
    throw "REPO must be in OWNER/REPO format; received '$Repo'."
}

$repoRootOutput = & git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $repoRootOutput) {
    throw 'Run this command inside the campaign Git worktree.'
}
$repoRoot = [System.IO.Path]::GetFullPath(($repoRootOutput | Select-Object -First 1).Trim())

$currentBranch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to determine the current Git branch.'
}
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    throw 'Campaign initialization requires a checked-out branch, not detached HEAD.'
}
if ($currentBranch -ne $BaseBranch) {
    throw "Current branch '$currentBranch' does not match BASE_BRANCH '$BaseBranch'."
}

$campaignMetadataDirectory = "$CampaignIssueNumber-$CampaignShortname-remove-before-merge"
$campaignMetadataPath = Join-Path $repoRoot $campaignMetadataDirectory
$manifestPath = Join-Path $campaignMetadataPath 'shepherd-campaign.json'
$lessonsPath = Join-Path $campaignMetadataPath 'campaign-lessons.md'
$tempManifestPath = Join-Path $campaignMetadataPath ".shepherd-campaign.json.tmp.$PID"
$tempLessonsPath = Join-Path $campaignMetadataPath ".campaign-lessons.md.tmp.$PID"
$createdDirectory = $false

if (Test-Path -LiteralPath $campaignMetadataPath) {
    throw "Campaign metadata path already exists: $campaignMetadataPath"
}

try {
    New-Item -ItemType Directory -Path $campaignMetadataPath | Out-Null
    $createdDirectory = $true

    $campaignId = [guid]::NewGuid().ToString('D').ToLowerInvariant()
    $createdAt = [DateTime]::UtcNow.ToString(
        'yyyy-MM-ddTHH:mm:ssZ',
        [Globalization.CultureInfo]::InvariantCulture
    )

    $manifest = [ordered]@{
        schemaVersion = 1
        campaignId = $campaignId
        campaignIssueNumber = [long]$CampaignIssueNumber
        campaignShortname = $CampaignShortname
        repository = $Repo
        baseBranch = $BaseBranch
        lessonPropagation = $LessonPropagation
        campaignMetadataDirectory = $campaignMetadataDirectory
        lessonsFile = 'campaign-lessons.md'
        createdAt = $createdAt
    }

    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    $manifestJson = $manifest | ConvertTo-Json -Depth 3
    [System.IO.File]::WriteAllText(
        $tempManifestPath,
        $manifestJson + [Environment]::NewLine,
        $utf8NoBom
    )

    $lessons = @'
# Campaign lessons

This file contains validated, reusable lessons for subsequent issues in this campaign.
The issue specification and repository instructions remain authoritative.

## Validated lessons

No validated lessons have been recorded yet.
'@
    [System.IO.File]::WriteAllText(
        $tempLessonsPath,
        $lessons + [Environment]::NewLine,
        $utf8NoBom
    )

    Move-Item -LiteralPath $tempManifestPath -Destination $manifestPath
    Move-Item -LiteralPath $tempLessonsPath -Destination $lessonsPath
    $createdDirectory = $false
}
catch {
    if ($createdDirectory) {
        foreach ($path in @($tempManifestPath, $tempLessonsPath, $manifestPath, $lessonsPath)) {
            Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        }
        Remove-Item -LiteralPath $campaignMetadataPath -ErrorAction SilentlyContinue
    }
    throw
}

Write-Host 'Campaign initialized.'
Write-Host "  Campaign ID:                 $campaignId"
Write-Host "  Repository:                  $Repo"
Write-Host "  Base branch:                 $BaseBranch"
Write-Host "  Lesson propagation:         $LessonPropagation"
Write-Host "  Campaign metadata directory: $campaignMetadataDirectory"
Write-Host "  Absolute path:               $campaignMetadataPath"
