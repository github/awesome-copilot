# shepherd-task-version: 1.0.1
<#
.SYNOPSIS
    Verifies Stage 15 artifacts use canonical installed PowerShell paths.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptsDirectory = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts')
)
$preparationScript = Join-Path $scriptsDirectory `
    'shepherd-task-15-prepare-create-issues.ps1'
$tempDirectory = Join-Path (
    [System.IO.Path]::GetTempPath()
) "shepherd-stage15-installed-$([guid]::NewGuid().ToString('N'))"
$campaignDirectoryName = '1-stage15-installed-remove-before-merge'
$campaignDirectory = Join-Path $tempDirectory $campaignDirectoryName
$initialLocation = (Get-Location).Path
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

try {
    New-Item -ItemType Directory -Path $campaignDirectory | Out-Null
    git -C $tempDirectory init --quiet
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not initialize the installed Stage 15 contract repository.'
    }
    git -C $tempDirectory remote add origin https://github.com/owner/repository.git
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not configure the installed Stage 15 contract remote.'
    }

    $manifest = [ordered]@{
        schemaVersion = 1
        campaignId = '12345678-1234-4123-8123-123456789abc'
        campaignIssueNumber = 1
        campaignShortname = 'stage15-installed'
        repository = 'owner/repository'
        baseBranch = 'experiment/stage15-installed'
        lessonPropagation = 'off'
        campaignMetadataDirectory = $campaignDirectoryName
    }
    [System.IO.File]::WriteAllText(
        (Join-Path $campaignDirectory 'shepherd-campaign.json'),
        ($manifest | ConvertTo-Json) + [Environment]::NewLine,
        $utf8NoBom
    )
    [System.IO.File]::WriteAllText(
        (Join-Path $campaignDirectory 'math-tool-ignorance-reduction-plan.md'),
        @'
## Ignorance reduction

### Question

Resolution: Resolved.

## Implementation

### First task

### Second task
'@,
        $utf8NoBom
    )

    Set-Location -LiteralPath $tempDirectory
    $artifacts = & $preparationScript `
        -CampaignMetadataDirectory $campaignDirectoryName `
        -PassThru

    $expectedDraftValidator = Join-Path $scriptsDirectory `
        'validate-stage20-drafts.ps1'
    $expectedIssueBodyVerifier = Join-Path $scriptsDirectory `
        'verify-github-issue-body.ps1'
    if ([string]$artifacts.DraftValidator -cne $expectedDraftValidator) {
        throw "Installed Stage 15 emitted a noncanonical draft-validator path: $($artifacts.DraftValidator)"
    }
    if ([string]$artifacts.IssueBodyVerifier -cne $expectedIssueBodyVerifier) {
        throw "Installed Stage 15 emitted a noncanonical issue-body-verifier path: $($artifacts.IssueBodyVerifier)"
    }

    $prompt = [System.IO.File]::ReadAllText($artifacts.PromptFile)
    if (-not $prompt.Contains("- DRAFT_VALIDATOR: $expectedDraftValidator") -or
        -not $prompt.Contains("- ISSUE_BODY_VERIFIER: $expectedIssueBodyVerifier")) {
        throw 'Installed Stage 15 prompt does not contain canonical helper paths.'
    }
    $invocation = [System.IO.File]::ReadAllText($artifacts.InvocationFile)
    foreach ($requiredPath in @(
        (Join-Path $scriptsDirectory 'redact-secrets.ps1'),
        (Join-Path $scriptsDirectory 'assert-stage20-result.ps1')
    )) {
        if (-not $invocation.Contains($requiredPath)) {
            throw "Installed Stage 15 invocation is missing '$requiredPath'."
        }
    }
}
finally {
    Set-Location -LiteralPath $initialLocation
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Simple-math PowerShell installed Stage 15 path contract tests passed.' -ForegroundColor Green
