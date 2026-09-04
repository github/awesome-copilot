<#
.SYNOPSIS
    Validates PowerShell examples embedded in shepherd-task skills.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..' '..' '..' '..')
)
$skillsDirectory = Join-Path $repositoryRoot 'skills'
$skillFiles = @(
    Get-ChildItem -LiteralPath $skillsDirectory -Directory -Filter 'shepherd-task-*' |
        ForEach-Object {
            $skillFile = Join-Path $_.FullName 'SKILL.md'
            if (Test-Path -LiteralPath $skillFile -PathType Leaf) {
                Get-Item -LiteralPath $skillFile
            }
        } |
        Sort-Object FullName
)

$codeBlocks = @()
foreach ($skillFile in $skillFiles) {
    $lines = [System.IO.File]::ReadAllLines($skillFile.FullName)
    $inPowerShellBlock = $false
    $blockStartLine = 0
    $blockLines = [System.Collections.Generic.List[string]]::new()

    for ($lineIndex = 0; $lineIndex -lt $lines.Count; $lineIndex++) {
        $line = $lines[$lineIndex]
        if (-not $inPowerShellBlock) {
            if ($line -match '^\s*(?:>\s*)?```powershell\s*$') {
                $inPowerShellBlock = $true
                $blockStartLine = $lineIndex + 2
                $blockLines.Clear()
            }
            continue
        }

        if ($line -match '^\s*(?:>\s*)?```\s*$') {
            $codeBlocks += [pscustomobject]@{
                File = $skillFile.FullName
                StartLine = $blockStartLine
                Text = $blockLines -join [Environment]::NewLine
            }
            $inPowerShellBlock = $false
            continue
        }

        $blockLines.Add(($line -replace '^\s*>\s?', ''))
    }

    if ($inPowerShellBlock) {
        throw "Unterminated PowerShell code block in '$($skillFile.FullName)' at line $blockStartLine."
    }
}

if ($codeBlocks.Count -lt 4) {
    throw "Expected at least 4 shepherd-task PowerShell code blocks; found $($codeBlocks.Count)."
}

$nativeCommands = @('git', 'gh', 'copilot', 'node', 'npm', 'pwsh')
$powerShellTransforms = @('Select-Object', 'Select-String', 'ConvertFrom-Json')

foreach ($codeBlock in $codeBlocks) {
    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseInput(
        $codeBlock.Text,
        [ref]$tokens,
        [ref]$parseErrors
    )
    if ($parseErrors.Count -ne 0) {
        $details = $parseErrors |
            ForEach-Object {
                $line = $codeBlock.StartLine + $_.Extent.StartLineNumber - 1
                "$($codeBlock.File):${line}: $($_.Message)"
            }
        throw "Invalid embedded PowerShell:`n$($details -join [Environment]::NewLine)"
    }

    $unsafePipelines = @(
        $ast.FindAll(
            {
                param($node)
                if ($node -isnot [System.Management.Automation.Language.PipelineAst] -or
                    $node.PipelineElements.Count -lt 2) {
                    return $false
                }

                $firstCommand = $node.PipelineElements[0]
                if ($firstCommand -isnot [System.Management.Automation.Language.CommandAst] -or
                    $firstCommand.GetCommandName() -notin $nativeCommands) {
                    return $false
                }

                return @(
                    $node.PipelineElements |
                        Select-Object -Skip 1 |
                        Where-Object {
                            $_ -is [System.Management.Automation.Language.CommandAst] -and
                            $_.GetCommandName() -in $powerShellTransforms
                        }
                ).Count -gt 0
            },
            $true
        )
    )
    if ($unsafePipelines.Count -ne 0) {
        $locations = $unsafePipelines |
            ForEach-Object {
                $line = $codeBlock.StartLine + $_.Extent.StartLineNumber - 1
                "$($codeBlock.File):$line"
            }
        throw "Embedded native output must be captured with its exit code before PowerShell transformation: $($locations -join ', ')"
    }
}

$assignmentBlock = $codeBlocks |
    Where-Object { $_.Text.Contains('/assignees') } |
    Select-Object -First 1
if (-not $assignmentBlock -or
    $assignmentBlock.Text -notmatch '--input -\r?\n\$ghExitCode = \$LASTEXITCODE' -or
    -not $assignmentBlock.Text.Contains('if ($ghExitCode -ne 0)')) {
    throw 'The stage-30 PowerShell assignment example must check the gh exit code immediately.'
}

$preflightBlock = $codeBlocks |
    Where-Object { $_.Text.Contains('gh pr edit --help') } |
    Select-Object -First 1
if (-not $preflightBlock -or
    $preflightBlock.Text -notmatch 'gh pr edit --help 2>&1\)\r?\n\$ghExitCode = \$LASTEXITCODE' -or
    -not $preflightBlock.Text.Contains('if ($ghExitCode -ne 0)')) {
    throw 'The stage-40 PowerShell capability preflight must check the gh exit code immediately.'
}

Write-Host 'Shepherd-task embedded PowerShell contract tests passed.' -ForegroundColor Green
