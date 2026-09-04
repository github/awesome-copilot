<#
.SYNOPSIS
    Regression coverage for PowerShell native command pipeline propagation.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptsDirectory = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' 'scripts')
)
$stage25 = Join-Path $scriptsDirectory 'shepherd-task-25-given-list.ps1'
$powerShellFiles = @(
    Get-ChildItem -LiteralPath $PSScriptRoot -File -Filter '*.ps1'
    Get-ChildItem -LiteralPath $scriptsDirectory -File -Filter '*.ps1'
)

foreach ($file in $powerShellFiles) {
    $tokens = $null
    $errors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile(
        $file.FullName,
        [ref]$tokens,
        [ref]$errors
    )
    if ($errors.Count -ne 0) {
        throw "PowerShell parse errors in '$($file.FullName)': $($errors -join '; ')"
    }

    $nativeTransformPipelines = @(
        $ast.FindAll(
            {
                param($node)
                if ($node -isnot [System.Management.Automation.Language.PipelineAst] -or
                    $node.PipelineElements.Count -lt 2) {
                    return $false
                }
                $first = $node.PipelineElements[0]
                if ($first -isnot [System.Management.Automation.Language.CommandAst]) {
                    return $false
                }
                $nativeName = $first.GetCommandName()
                if ($nativeName -notin @('git', 'gh', 'copilot', 'node', 'npm', 'pwsh')) {
                    return $false
                }
                return @(
                    $node.PipelineElements |
                        Select-Object -Skip 1 |
                        Where-Object {
                            $_ -is [System.Management.Automation.Language.CommandAst] -and
                            $_.GetCommandName() -in @('Select-Object', 'ConvertFrom-Json')
                        }
                ).Count -gt 0
            },
            $true
        )
    )
    if ($nativeTransformPipelines.Count -ne 0) {
        $locations = $nativeTransformPipelines |
            ForEach-Object { "$($file.FullName):$($_.Extent.StartLineNumber)" }
        throw "Native output must be captured with its exit code before PowerShell transformation: $($locations -join ', ')"
    }
}

$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "shepherd-psncpps-$([guid]::NewGuid().ToString('N'))"
try {
    New-Item -ItemType Directory -Path $tempDirectory | Out-Null
    git -C $tempDirectory init --quiet
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not initialize the PSNCPPS test repository.'
    }

    Push-Location $tempDirectory
    try {
        $output = @(
            & pwsh -NoLogo -NoProfile -File $stage25 `
                -TaskIssues 1 `
                -CampaignMetadataDirectory '1-test-remove-before-merge' 2>&1
        )
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
    $text = $output -join [Environment]::NewLine
    if ($exitCode -eq 0) {
        throw 'Stage 25 unexpectedly accepted a missing campaign directory.'
    }
    if ($text.Contains("variable '`$LASTEXITCODE' cannot be retrieved")) {
        throw "Stage 25 reproduced the unset LASTEXITCODE failure: $text"
    }
    if (-not $text.Contains('Campaign metadata directory not found')) {
        throw "Stage 25 failed for an unexpected reason: $text"
    }
}
finally {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'PSNCPPS contract tests passed.' -ForegroundColor Green
