<#
.SYNOPSIS
    Stage 25: dispatches an ordered issue subset within an initialized shepherd-task campaign.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateSet('off', 'campaign')]
    [string]$LessonPropagation,

    [Parameter(Mandatory, Position = 1)]
    [string]$TaskIssues,

    [Parameter(Mandatory, Position = 2)]
    [string]$CampaignMetadataDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($TaskIssues -notmatch '^[1-9][0-9]*(,[1-9][0-9]*)*$') {
    throw 'TaskIssues must be a comma-separated list of positive issue numbers.'
}
if ([IO.Path]::IsPathRooted($CampaignMetadataDirectory) -or $CampaignMetadataDirectory -ne (Split-Path -Leaf $CampaignMetadataDirectory)) {
    throw 'CampaignMetadataDirectory must be a repository-root-relative basename.'
}
if ($CampaignMetadataDirectory -notmatch '^[1-9][0-9]*-[a-z0-9][a-z0-9-]*-remove-before-merge$') {
    throw 'CampaignMetadataDirectory does not follow the campaign directory naming contract.'
}

$repoRoot = (& git rev-parse --show-toplevel 2>$null | Select-Object -First 1)
if ($LASTEXITCODE -ne 0 -or -not $repoRoot) { throw 'Run inside the campaign Git worktree.' }
$repoRoot = [IO.Path]::GetFullPath($repoRoot.Trim())
$campaignPath = [IO.Path]::GetFullPath((Join-Path $repoRoot $CampaignMetadataDirectory))
if (-not (Test-Path -LiteralPath $campaignPath -PathType Container)) { throw "Campaign metadata directory not found: $campaignPath" }
$campaignPath = (Resolve-Path -LiteralPath $campaignPath).Path
if ([IO.Directory]::GetParent($campaignPath).FullName -ne $repoRoot) { throw 'Campaign metadata directory must be a direct child of the repository root.' }

$manifestPath = Join-Path $campaignPath 'shepherd-campaign.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw "Campaign manifest not found: $manifestPath" }
$campaign = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($campaign.schemaVersion -ne 1) { throw "Unsupported campaign schemaVersion '$($campaign.schemaVersion)'." }
if ([string]$campaign.campaignId -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') { throw 'Invalid campaignId.' }
if ([string]$campaign.lessonPropagation -ne $LessonPropagation) { throw "Requested lesson mode does not match campaign mode '$($campaign.lessonPropagation)'." }
if ([string]$campaign.campaignMetadataDirectory -ne $CampaignMetadataDirectory) { throw 'Manifest directory does not match supplied directory.' }
if ([string]$campaign.repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw 'Invalid campaign repository.' }
if (-not [string]$campaign.baseBranch -or [string]$campaign.baseBranch -eq 'main') { throw 'Invalid campaign baseBranch.' }
if (-not (Test-Path -LiteralPath (Join-Path $campaignPath 'campaign-lessons.md') -PathType Leaf)) { throw 'Campaign lessons file not found.' }

$campaignId = [string]$campaign.campaignId
$repo = [string]$campaign.repository
$baseBranch = [string]$campaign.baseBranch
$timestamp = Get-Date -Format 'yyyyMMdd-HHmm'
$logDirFull = Join-Path $campaignPath "shepherd-tasks-$campaignId-$timestamp"
if (Test-Path -LiteralPath $logDirFull) { throw "Given-list run directory already exists: $logDirFull" }
New-Item -ItemType Directory -Path $logDirFull | Out-Null

$runManifestPath = Join-Path $logDirFull 'shepherd-task-25-given-list-run.json'
$runManifest = [ordered]@{
    schemaVersion = 1
    campaignId = $campaignId
    campaignMetadataDirectory = $CampaignMetadataDirectory
    repository = $repo
    baseBranch = $baseBranch
    lessonPropagation = $LessonPropagation
    taskIssues = @($TaskIssues -split ',' | ForEach-Object { [int]$_ })
    startedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    completedAt = $null
    exitCode = $null
    status = 'running'
}
$utf8 = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($runManifestPath, ($runManifest | ConvertTo-Json -Depth 4) + [Environment]::NewLine, $utf8)

$scriptDir = $PSScriptRoot
$shepherdScript = Join-Path $scriptDir 'shepherd-task.ps1'
$scriptExitCode = 0
$postMortemInvoked = $false

function Invoke-CopilotRedacted {
    param([string]$Prompt, [string]$JsonlPath, [string]$SharePath)
    $tempDir = Join-Path ([IO.Path]::GetTempPath()) "shepherd-redact-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    try {
        $rawJsonl = Join-Path $tempDir 'session.jsonl'
        $rawShare = Join-Path $tempDir 'session.md'
        $Prompt | copilot --yolo --output-format json --share $rawShare > $rawJsonl
        $exitCode = $LASTEXITCODE
        & (Join-Path $scriptDir 'redact-secrets.ps1') $tempDir | Out-Null
        Move-Item -LiteralPath $rawJsonl -Destination $JsonlPath -Force
        Move-Item -LiteralPath $rawShare -Destination $SharePath -Force
        if ($exitCode -ne 0) { throw "copilot exited with code $exitCode" }
    } finally {
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

try {
    Write-Host "Campaign ID: $campaignId"
    Write-Host "Lesson propagation: $LessonPropagation"
    Write-Host "Logging shepherd-task-25-given-list run to: $logDirFull"
    foreach ($issue in $TaskIssues -split ',') {
        & $shepherdScript -TaskIssue $issue -CampaignMetadataDirectory $CampaignMetadataDirectory -RunDirectory $logDirFull
        if ($LASTEXITCODE -ne 0) { throw "shepherd-task.ps1 failed for issue #$issue." }
    }
}
catch {
    $scriptExitCode = 1
    Write-Error $_ -ErrorAction Continue
}
finally {
    $runManifest.completedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    $runManifest.exitCode = $scriptExitCode
    $runManifest.status = if ($scriptExitCode -eq 0) { 'succeeded' } else { 'failed' }
    $tempManifest = "$runManifestPath.tmp"
    try {
        [IO.File]::WriteAllText($tempManifest, ($runManifest | ConvertTo-Json -Depth 4) + [Environment]::NewLine, $utf8)
        Move-Item -LiteralPath $tempManifest -Destination $runManifestPath -Force
    } catch {
        Write-Error "Could not finalize run manifest: $_" -ErrorAction Continue
        if ($scriptExitCode -eq 0) { $scriptExitCode = 1 }
    }

    if (-not $postMortemInvoked) {
        $postMortemInvoked = $true
        $pmTimestamp = Get-Date -Format 'yyyyMMdd-HHmm'
        $postMortemPath = Join-Path $logDirFull "$pmTimestamp-post-mortem.md"
        $sharePath = Join-Path $logDirFull "post-mortem-session-$pmTimestamp.md"
        $jsonlPath = Join-Path $logDirFull "post-mortem-session-$pmTimestamp.jsonl"
        $prompt = @"
Invoke skill ``shepherd-task-50-create-post-mortem`` with these inputs:
- SHEPHERD_LOG_DIR: $logDirFull
- SCRIPT_EXIT_CODE: $scriptExitCode
- TASK_ISSUES: $TaskIssues
- BASE_BRANCH: $baseBranch
- REPO: $repo
- CAMPAIGN_ID: $campaignId
- CAMPAIGN_METADATA_DIRECTORY: $CampaignMetadataDirectory
- LESSON_PROPAGATION: $LessonPropagation

Write the report to:
- OUTPUT_FILE: $postMortemPath
"@
        Write-Host '[shepherd-task] Stage 50: Generating campaign post-mortem...'
        Write-Host "[shepherd-task] Stage 50 report:  $postMortemPath"
        Write-Host "[shepherd-task] Stage 50 session: $sharePath"
        Write-Host "[shepherd-task] Stage 50 events:  $jsonlPath"
        Write-Host "[shepherd-task] Stage 50 prompt: $prompt"
        try {
            Invoke-CopilotRedacted -Prompt $prompt `
                -JsonlPath $jsonlPath `
                -SharePath $sharePath
            & (Join-Path $scriptDir 'redact-secrets.ps1') $logDirFull | Out-Null
            if (Test-Path -LiteralPath $postMortemPath -PathType Leaf) {
                Write-Host "[shepherd-task] Stage 50 COMPLETE: Post-mortem created: $postMortemPath"
            } else {
                Write-Warning "Stage 50 completed, but the expected post-mortem was not created: $postMortemPath"
            }
        } catch { Write-Warning "Post-mortem generation failed: $($_.Exception.Message)" }
    }
}

exit $scriptExitCode
