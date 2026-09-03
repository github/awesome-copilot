$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptsDirectory = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\scripts')
)
$stage00 = Join-Path $scriptsDirectory 'shepherd-task-00-init-campaign.ps1'
$stage25 = Join-Path $scriptsDirectory 'shepherd-task-25-given-list.ps1'
$tempDirectory = Join-Path (
    [System.IO.Path]::GetTempPath()
) "shepherd-lesson-default-$([guid]::NewGuid().ToString('N'))"

function New-TestRepository {
    param(
        [Parameter(Mandatory)]
        [string]$Name
    )

    $path = Join-Path $tempDirectory $Name
    $branch = "experiment/$Name"
    New-Item -ItemType Directory -Path $path | Out-Null
    & git -C $path init --quiet --initial-branch $branch
    if ($LASTEXITCODE -ne 0) {
        throw "Could not initialize test repository '$path'."
    }
    return [pscustomobject]@{
        Path = $path
        Branch = $branch
    }
}

function Invoke-InRepository {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [scriptblock]$Operation
    )

    Push-Location $Path
    try {
        & $Operation
    }
    finally {
        Pop-Location
    }
}

function Assert-Fails {
    param(
        [Parameter(Mandatory)]
        [scriptblock]$Operation,

        [Parameter(Mandatory)]
        [string]$ExpectedMessage
    )

    try {
        & $Operation
    }
    catch {
        if (-not $_.Exception.Message.Contains($ExpectedMessage)) {
            throw "Expected failure containing '$ExpectedMessage', received: $($_.Exception.Message)"
        }
        return
    }
    throw "Operation unexpectedly succeeded; expected failure containing '$ExpectedMessage'."
}

try {
    New-Item -ItemType Directory -Path $tempDirectory | Out-Null

    $defaultRepository = New-TestRepository -Name 'default'
    Invoke-InRepository -Path $defaultRepository.Path -Operation {
        & $stage00 `
            -CampaignIssueNumber 1 `
            -CampaignShortname default `
            -BaseBranch $defaultRepository.Branch `
            -Repo owner/repository | Out-Null
    }
    $defaultCampaignPath = Join-Path $defaultRepository.Path `
        '1-default-remove-before-merge'
    $defaultManifest = Get-Content -LiteralPath (
        Join-Path $defaultCampaignPath 'shepherd-campaign.json'
    ) -Raw | ConvertFrom-Json
    if ([string]$defaultManifest.lessonPropagation -ne 'off') {
        throw 'Stage 00 did not persist lessonPropagation=off by default.'
    }
    if (-not (Test-Path -LiteralPath (
        Join-Path $defaultCampaignPath 'campaign-lessons.md'
    ) -PathType Leaf)) {
        throw 'Stage 00 did not create campaign-lessons.md in off mode.'
    }

    $campaignRepository = New-TestRepository -Name 'campaign'
    Invoke-InRepository -Path $campaignRepository.Path -Operation {
        & $stage00 `
            -CampaignIssueNumber 2 `
            -CampaignShortname campaign `
            -BaseBranch $campaignRepository.Branch `
            -Repo owner/repository `
            -LessonPropagation campaign | Out-Null
    }
    $campaignManifest = Get-Content -LiteralPath (
        Join-Path $campaignRepository.Path `
            '2-campaign-remove-before-merge\shepherd-campaign.json'
    ) -Raw | ConvertFrom-Json
    if ([string]$campaignManifest.lessonPropagation -ne 'campaign') {
        throw 'Stage 00 did not preserve explicit campaign lesson propagation.'
    }

    $invalidRepository = New-TestRepository -Name 'invalid'
    Assert-Fails -ExpectedMessage 'LessonPropagation' -Operation {
        Invoke-InRepository -Path $invalidRepository.Path -Operation {
            & $stage00 `
                -CampaignIssueNumber 3 `
                -CampaignShortname invalid `
                -BaseBranch $invalidRepository.Branch `
                -Repo owner/repository `
                -LessonPropagation invalid | Out-Null
        }
    }

    $stage25Source = Get-Content -LiteralPath $stage25 -Raw
    $parameterBlock = [regex]::Match(
        $stage25Source,
        '(?s)\[CmdletBinding\(\)\]\s*param\((.*?)\)\s*Set-StrictMode'
    )
    if (-not $parameterBlock.Success) {
        throw 'Could not locate the stage-25 PowerShell parameter block.'
    }
    if ($parameterBlock.Groups[1].Value.Contains('LessonPropagation')) {
        throw 'Stage 25 still exposes a LessonPropagation parameter.'
    }
    if (-not $stage25Source.Contains(
        '$LessonPropagation = [string]$campaign.lessonPropagation'
    )) {
        throw 'Stage 25 does not derive lesson propagation from the campaign manifest.'
    }
    if (-not $stage25Source.Contains(
        "[string]`$campaign.lessonPropagation -notin @('off', 'campaign')"
    )) {
        throw 'Stage 25 does not fail closed on an invalid manifest lesson mode.'
    }

    $harnessDirectory = Join-Path $tempDirectory 'stage25-harness'
    New-Item -ItemType Directory -Path $harnessDirectory | Out-Null
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText(
        (Join-Path $harnessDirectory 'shepherd-task-25-given-list.ps1'),
        $stage25Source.Replace(
            '$postMortemInvoked = $false',
            '$postMortemInvoked = $true'
        ),
        $utf8
    )
    [System.IO.File]::WriteAllText(
        (Join-Path $harnessDirectory 'shepherd-task.ps1'),
        @'
param(
    [string]$TaskIssue,
    [string]$CampaignMetadataDirectory,
    [string]$RunDirectory
)
exit 0
'@,
        $utf8
    )

    Invoke-InRepository -Path $campaignRepository.Path -Operation {
        & pwsh -NoLogo -NoProfile -File (
            Join-Path $harnessDirectory 'shepherd-task-25-given-list.ps1'
        ) `
            -TaskIssues 1 `
            -CampaignMetadataDirectory '2-campaign-remove-before-merge'
        if ($LASTEXITCODE -ne 0) {
            throw "Stage 25 harness failed with exit code $LASTEXITCODE."
        }
    }

    $runDirectories = @(
        Get-ChildItem -LiteralPath (
            Join-Path $campaignRepository.Path '2-campaign-remove-before-merge'
        ) -Directory -Filter 'shepherd-tasks-*'
    )
    if ($runDirectories.Count -ne 1) {
        throw "Expected one stage-25 run directory; found $($runDirectories.Count)."
    }
    $runManifest = Get-Content -LiteralPath (
        Join-Path $runDirectories[0].FullName 'shepherd-task-25-given-list-run.json'
    ) -Raw | ConvertFrom-Json
    if ([string]$runManifest.lessonPropagation -ne 'campaign') {
        throw 'Stage 25 did not copy the campaign manifest lesson mode into its run manifest.'
    }
    if ([string]$runManifest.status -ne 'succeeded') {
        throw "Stage 25 harness did not succeed: $($runManifest.status)."
    }

    Write-Host 'PowerShell lesson propagation default contract tests passed.'
}
finally {
    if (Test-Path -LiteralPath $tempDirectory) {
        Remove-Item -LiteralPath $tempDirectory -Recurse -Force
    }
}
