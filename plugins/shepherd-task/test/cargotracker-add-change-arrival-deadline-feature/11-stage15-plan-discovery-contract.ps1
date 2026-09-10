# shepherd-task-version: 1.0.3
<#
.SYNOPSIS
    Regression coverage for Cargo Tracker stage-15 plan-section discovery.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$initializerPath = Join-Path $PSScriptRoot '01-prepare-base-branch.ps1'
$scriptsDirectory = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts')
)
$preparationScript = Join-Path $scriptsDirectory `
    'shepherd-task-15-prepare-create-issues.ps1'
$tempDirectory = Join-Path (
    [System.IO.Path]::GetTempPath()
) "shepherd-stage15-plan-$([guid]::NewGuid().ToString('N'))"
$campaignDirectoryName = '1-stage15-contract-remove-before-merge'
$campaignDirectory = Join-Path $tempDirectory $campaignDirectoryName
$initialLocation = (Get-Location).Path

try {
    $initializer = [System.IO.File]::ReadAllText($initializerPath)
    $planStartMarker = '$plan = @' + "'"
    $planStart = $initializer.IndexOf($planStartMarker, [StringComparison]::Ordinal)
    if ($planStart -lt 0) {
        throw 'Cargo Tracker plan literal was not found.'
    }
    $planContentStart = $initializer.IndexOf("`n", $planStart) + 1
    $planWriteMarker = 'Set-Content -LiteralPath (Join-Path $campaignMetadataPath $planFile)'
    $planWriteStart = $initializer.IndexOf(
        $planWriteMarker,
        $planContentStart,
        [StringComparison]::Ordinal
    )
    $planEnd = $initializer.LastIndexOf(
        "'@",
        $planWriteStart,
        [StringComparison]::Ordinal
    )
    if ($planWriteStart -lt 0 -or $planEnd -lt $planContentStart) {
        throw 'Cargo Tracker plan literal boundaries were not found.'
    }
    $plan = $initializer.Substring($planContentStart, $planEnd - $planContentStart)

    $implementationNamedHeadingCount = [regex]::Matches(
        $plan,
        '(?im)^##\s+.*implementation'
    ).Count
    if ($implementationNamedHeadingCount -ne 2) {
        throw "Regression plan must contain two implementation-named level-two headings; found $implementationNamedHeadingCount."
    }

    New-Item -ItemType Directory -Path $campaignDirectory | Out-Null
    git -C $tempDirectory init --quiet
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not initialize the stage-15 contract repository.'
    }
    git -C $tempDirectory remote add origin https://github.com/owner/repository.git
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not configure the stage-15 contract repository remote.'
    }

    $manifest = [ordered]@{
        schemaVersion = 1
        campaignId = [guid]::NewGuid().ToString()
        campaignIssueNumber = 1
        campaignShortname = 'stage15-contract'
        repository = 'owner/repository'
        baseBranch = 'experiment/stage15-contract'
        lessonPropagation = 'off'
        campaignMetadataDirectory = $campaignDirectoryName
    }
    [System.IO.File]::WriteAllText(
        (Join-Path $campaignDirectory 'shepherd-campaign.json'),
        ($manifest | ConvertTo-Json) + [Environment]::NewLine,
        [System.Text.UTF8Encoding]::new($false)
    )
    [System.IO.File]::WriteAllText(
        (Join-Path $campaignDirectory 'add-change-arrival-deadline-feature-ignorance-reduction-plan.md'),
        $plan,
        [System.Text.UTF8Encoding]::new($false)
    )

    Set-Location -LiteralPath $tempDirectory
    $artifacts = & $preparationScript `
        -CampaignMetadataDirectory $campaignDirectoryName `
        -PassThru

    $expectedHeading = '## Phase 4 — Implementation (five serial issues)'
    if ([string]$artifacts.ImplementationSection -cne $expectedHeading) {
        throw "Stage 15 selected '$($artifacts.ImplementationSection)'; expected '$expectedHeading'."
    }
    if ([int]$artifacts.TaskCount -ne 5) {
        throw "Stage 15 discovered $($artifacts.TaskCount) tasks; expected 5."
    }
    if (-not (Test-Path -LiteralPath $artifacts.PromptFile -PathType Leaf) -or
        -not (Test-Path -LiteralPath $artifacts.InvocationFile -PathType Leaf)) {
        throw 'Stage 15 did not create both required artifacts.'
    }
    $expectedDraftValidator = Join-Path $scriptsDirectory `
        'validate-stage20-drafts.ps1'
    $expectedIssueBodyVerifier = Join-Path $scriptsDirectory `
        'verify-github-issue-body.ps1'
    if ([string]$artifacts.DraftValidator -cne $expectedDraftValidator -or
        [string]$artifacts.IssueBodyVerifier -cne $expectedIssueBodyVerifier) {
        throw 'Stage 15 did not return canonical installed helper paths.'
    }
    $prompt = [System.IO.File]::ReadAllText($artifacts.PromptFile)
    if (-not $prompt.Contains("- DRAFT_VALIDATOR: $expectedDraftValidator") -or
        -not $prompt.Contains("- ISSUE_BODY_VERIFIER: $expectedIssueBodyVerifier")) {
        throw 'Stage 15 prompt does not contain canonical installed helper paths.'
    }
    $invocation = [System.IO.File]::ReadAllText($artifacts.InvocationFile)
    foreach ($requiredPath in @(
        (Join-Path $scriptsDirectory 'redact-secrets.ps1'),
        (Join-Path $scriptsDirectory 'assert-stage20-result.ps1')
    )) {
        if (-not $invocation.Contains($requiredPath)) {
            throw "Stage 15 invocation is missing '$requiredPath'."
        }
    }
}
finally {
    Set-Location -LiteralPath $initialLocation
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Cargo Tracker Stage 15 plan and installed-path contract tests passed.' -ForegroundColor Green
