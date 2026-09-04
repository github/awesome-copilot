<#
.SYNOPSIS
    Regression coverage for Cargo Tracker control-driver output contracts.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$skillListHelper = Join-Path $PSScriptRoot 'get-copilot-skill-list.ps1'
$driverPath = Join-Path $PSScriptRoot '20260904-run-control-experiment.ps1'
$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "shepherd-driver-encoding-$([guid]::NewGuid().ToString('N'))"

try {
    $driverBytes = [System.IO.File]::ReadAllBytes($driverPath)
    if ($driverBytes.Length -ge 3 -and
        $driverBytes[0] -eq 0xEF -and
        $driverBytes[1] -eq 0xBB -and
        $driverBytes[2] -eq 0xBF) {
        throw 'Control driver must be UTF-8 without BOM.'
    }
    $driverContent = [System.IO.File]::ReadAllText(
        $driverPath,
        [System.Text.UTF8Encoding]::new($false, $true)
    )
    $tokens = $null
    $parseErrors = $null
    $driverAst = [System.Management.Automation.Language.Parser]::ParseFile(
        $driverPath,
        [ref]$tokens,
        [ref]$parseErrors
    )
    if ($parseErrors.Count -ne 0) {
        $details = @(
            $parseErrors | ForEach-Object {
                "line $($_.Extent.StartLineNumber): $($_.Message)"
            }
        )
        throw "Control driver does not parse: $($details -join '; ')"
    }

    $parameterNames = @(
        $driverAst.ParamBlock.Parameters |
            ForEach-Object { $_.Name.VariablePath.UserPath }
    )
    foreach ($parameterName in @(
        'ShowDomainFixtureOutput',
        'ShowShepherdTaskScriptOutput',
        'ShowContractOutput',
        'ShowNativeToolOutput',
        'ShowAllOutput'
    )) {
        if ($parameterName -notin $parameterNames) {
            throw "Control driver parameter is missing: $parameterName"
        }
    }
    foreach ($forbiddenParameter in @(
        'ShowCopilotCLIOutput',
        'ShowCopilotSkillOutput'
    )) {
        if ($forbiddenParameter -in $parameterNames) {
            throw "Control driver must not define $forbiddenParameter."
        }
    }
    foreach ($allOutputAssignment in @(
        '$ShowDomainFixtureOutput -or $ShowAllOutput',
        '$ShowShepherdTaskScriptOutput -or $ShowAllOutput',
        '$ShowContractOutput -or $ShowAllOutput',
        '$ShowNativeToolOutput -or $ShowAllOutput'
    )) {
        if (-not $driverContent.Contains($allOutputAssignment)) {
            throw "ShowAllOutput does not enable: $allOutputAssignment"
        }
    }

    $lifecycleSummaryCalls = @(
        $driverAst.FindAll(
            {
                param($node)
                $node -is [System.Management.Automation.Language.CommandAst] -and
                    $node.GetCommandName() -eq 'Write-ControlStatus' -and
                    $node.Extent.Text.Contains('Canonical lifecycle:')
            },
            $true
        )
    )
    if ($lifecycleSummaryCalls.Count -ne 1 -or
        -not $lifecycleSummaryCalls[0].Extent.Text.Contains(
            'Stage 00 -> Stage 10 -> research gate ->'
        ) -or
        -not $lifecycleSummaryCalls[0].Extent.Text.Contains(
            'Stage 15 -> Stage 20 -> Stage 25 -> Stage 30 -> Stage 40 -> Stage 50.'
        )) {
        throw 'Control driver is missing the ordered lifecycle summary.'
    }

    $invocationCalls = @(
        $driverAst.FindAll(
            {
                param($node)
                $node -is [System.Management.Automation.Language.CommandAst] -and
                    $node.GetCommandName() -eq
                        'Write-ShepherdScriptInvocation'
            },
            $true
        ) |
            Sort-Object { $_.Extent.StartOffset }
    )
    $expectedInvocationOrder = @(
        @{ Stage = '00'; Type = 'Planned' },
        @{ Stage = '00'; Type = 'Actual' },
        @{ Stage = '15'; Type = 'Planned' },
        @{ Stage = '25'; Type = 'Planned' },
        @{ Stage = '15'; Type = 'Actual' },
        @{ Stage = '25'; Type = 'Actual' }
    )
    if ($invocationCalls.Count -ne $expectedInvocationOrder.Count) {
        throw "Expected $($expectedInvocationOrder.Count) canonical invocation displays; found $($invocationCalls.Count)."
    }
    for ($index = 0; $index -lt $expectedInvocationOrder.Count; $index++) {
        $expected = $expectedInvocationOrder[$index]
        $callText = $invocationCalls[$index].Extent.Text
        if (-not $callText.Contains("-Stage '$($expected.Stage)'") -or
            -not $callText.Contains(
                "-InvocationType $($expected.Type)"
            )) {
            throw "Canonical invocation display $index is out of order: $callText"
        }
    }

    $stage10Call = @(
        $driverAst.FindAll(
            {
                param($node)
                $node -is [System.Management.Automation.Language.CommandAst] -and
                    $node.GetCommandName() -eq 'Write-ControlStage' -and
                    $node.Extent.Text.Contains("-Stage '10'")
            },
            $true
        )
    )
    $stage20Call = @(
        $driverAst.FindAll(
            {
                param($node)
                $node -is [System.Management.Automation.Language.CommandAst] -and
                    $node.GetCommandName() -eq 'Write-ControlStage' -and
                    $node.Extent.Text.Contains("-Stage '20'")
            },
            $true
        )
    )
    if ($stage10Call.Count -ne 1 -or $stage20Call.Count -ne 1 -or
        $stage10Call[0].Extent.StartOffset -ge
            $invocationCalls[2].Extent.StartOffset -or
        $stage20Call[0].Extent.StartOffset -le
            $invocationCalls[2].Extent.StartOffset -or
        $stage20Call[0].Extent.StartOffset -ge
            $invocationCalls[3].Extent.StartOffset) {
        throw 'Stage 10, Stage 15, Stage 20, and Stage 25 preview calls are not ordered correctly.'
    }

    $stage25ActualEnd = $invocationCalls[5].Extent.EndOffset
    $stage30Index = $driverContent.IndexOf(
        'For each issue, Stage 30',
        $stage25ActualEnd,
        [System.StringComparison]::Ordinal
    )
    $stage40Index = $driverContent.IndexOf(
        'then Stage 40',
        $stage30Index + 1,
        [System.StringComparison]::Ordinal
    )
    $stage50Index = $driverContent.IndexOf(
        'Stage 50 creates the campaign post-mortem',
        $stage40Index + 1,
        [System.StringComparison]::Ordinal
    )
    if ($stage30Index -lt 0 -or $stage40Index -lt 0 -or
        $stage50Index -lt 0) {
        throw 'Stage 30, Stage 40, and Stage 50 explanations are missing or out of order.'
    }

    foreach ($requiredText in @(
        '-InvocationType Planned',
        '-InvocationType Actual',
        '<CAMPAIGN_ISSUE_NUMBER>',
        '<TASK_ISSUE_LIST>',
        'shepherd-task-00-init-campaign.ps1',
        '-CampaignIssueNumber',
        '-CampaignShortname',
        '-BaseBranch',
        '-Repo',
        'shepherd-task-15-prepare-create-issues.ps1',
        '-CampaignMetadataDirectory',
        '-PassThru',
        'shepherd-task-25-given-list.ps1',
        '-TaskIssues',
        '00-prepare-test-baseline.ps1',
        '01-prepare-base-branch.ps1',
        '02-create-issues.ps1',
        '04-verify-control-campaign.ps1'
    )) {
        if (-not $driverContent.Contains($requiredText)) {
            throw "Control driver educational contract is missing: $requiredText"
        }
    }

    $functionNames = @(
        'Write-ControlStatus',
        'Write-ControlStage',
        'Test-OutputChannelEnabled',
        'Write-CapturedOutput',
        'Invoke-CheckedPwshScript',
        'Invoke-CheckedNativeCommand',
        'ConvertTo-PowerShellDisplayLiteral',
        'Write-ShepherdScriptInvocation'
    )
    $functionAsts = @(
        $driverAst.FindAll(
            {
                param($node)
                $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
                    $node.Name -in $functionNames
            },
            $true
        )
    )
    if ($functionAsts.Count -ne $functionNames.Count) {
        throw "Expected $($functionNames.Count) driver helpers; found $($functionAsts.Count)."
    }
    foreach ($functionAst in $functionAsts) {
        . ([scriptblock]::Create($functionAst.Extent.Text))
    }

    New-Item -ItemType Directory -Path $tempDirectory | Out-Null
    $successScript = Join-Path $tempDirectory 'success.ps1'
    $failureScript = Join-Path $tempDirectory 'failure.ps1'
    [System.IO.File]::WriteAllText(
        $successScript,
        "Write-Output 'stub-success-output'`nexit 0`n",
        [System.Text.UTF8Encoding]::new($false)
    )
    [System.IO.File]::WriteAllText(
        $failureScript,
        "[Console]::Error.WriteLine('stub-failure-output')`nexit 23`n",
        [System.Text.UTF8Encoding]::new($false)
    )

    $ShowDomainFixtureOutput = $false
    $ShowShepherdTaskScriptOutput = $false
    $ShowContractOutput = $false
    $ShowNativeToolOutput = $false

    $hiddenSuccess = @(
        & {
            Invoke-CheckedPwshScript `
                -Path $successScript `
                -OutputChannel DomainFixture
        } 2>&1 3>&1 4>&1 5>&1 6>&1
    )
    if (($hiddenSuccess -join "`n").Contains('stub-success-output')) {
        throw 'Disabled child channel leaked successful output.'
    }

    $ShowDomainFixtureOutput = $true
    $shownSuccess = @(
        & {
            Invoke-CheckedPwshScript `
                -Path $successScript `
                -OutputChannel DomainFixture
        } 2>&1 3>&1 4>&1 5>&1 6>&1
    )
    if (-not ($shownSuccess -join "`n").Contains('stub-success-output')) {
        throw 'Enabled child channel did not pass through successful output.'
    }

    $ShowDomainFixtureOutput = $false
    $hiddenFailure = @(
        & {
            try {
                Invoke-CheckedPwshScript `
                    -Path $failureScript `
                    -OutputChannel DomainFixture
            }
            catch {
                Write-Output "caught: $($_.Exception.Message)"
            }
        } 2>&1 3>&1 4>&1 5>&1 6>&1
    )
    $hiddenFailureText = $hiddenFailure -join "`n"
    if (-not $hiddenFailureText.Contains('stub-failure-output') -or
        -not $hiddenFailureText.Contains('exit code 23')) {
        throw "Disabled child failure did not reveal output and exit code: $hiddenFailureText"
    }

    $nativeSuccess = @(
        & {
            Invoke-CheckedNativeCommand `
                -FilePath 'pwsh' `
                -Arguments @(
                    '-NoLogo',
                    '-NoProfile',
                    '-Command',
                    "Write-Output 'native-success-output'; exit 0"
                ) `
                -Operation 'Native success probe'
        } 2>&1 3>&1 4>&1 5>&1 6>&1
    )
    if (($nativeSuccess -join "`n").Contains('native-success-output')) {
        throw 'Disabled native channel leaked successful output.'
    }

    $ShowNativeToolOutput = $true
    $shownNativeSuccess = @(
        & {
            Invoke-CheckedNativeCommand `
                -FilePath 'pwsh' `
                -Arguments @(
                    '-NoLogo',
                    '-NoProfile',
                    '-Command',
                    "Write-Output 'native-success-output'; exit 0"
                ) `
                -Operation 'Native success probe'
        } 2>&1 3>&1 4>&1 5>&1 6>&1
    )
    if (-not ($shownNativeSuccess -join "`n").Contains(
        'native-success-output'
    )) {
        throw 'Enabled native channel did not pass through successful output.'
    }

    $ShowNativeToolOutput = $false
    $nativeFailure = @(
        & {
            try {
                Invoke-CheckedNativeCommand `
                    -FilePath 'pwsh' `
                    -Arguments @(
                        '-NoLogo',
                        '-NoProfile',
                        '-Command',
                        "[Console]::Error.WriteLine('native-failure-output'); exit 19"
                    ) `
                    -Operation 'Native failure probe'
            }
            catch {
                Write-Output "caught: $($_.Exception.Message)"
            }
        } 2>&1 3>&1 4>&1 5>&1 6>&1
    )
    $nativeFailureText = $nativeFailure -join "`n"
    if (-not $nativeFailureText.Contains('native-failure-output') -or
        -not $nativeFailureText.Contains('exit code 19')) {
        throw "Disabled native failure did not reveal output and exit code: $nativeFailureText"
    }

    $displayOutput = @(
        & {
            Write-ShepherdScriptInvocation `
                -Stage '00' `
                -Purpose 'Display contract' `
                -InvocationType Planned `
                -ScriptPath "C:\Program Files\O'Brien\shepherd-task.ps1" `
                -Arguments @(
                    [pscustomobject]@{
                        Name = '-CampaignIssueNumber'
                        Value = '<CAMPAIGN_ISSUE_NUMBER>'
                        IsSwitch = $false
                    },
                    [pscustomobject]@{
                        Name = '-Repo'
                        Value = "owner/o'brien"
                        IsSwitch = $false
                    }
                )
        } 2>&1 3>&1 4>&1 5>&1 6>&1
    )
    $displayText = $displayOutput -join "`n"
    foreach ($expectedDisplay in @(
        "'C:\Program Files\O''Brien\shepherd-task.ps1'",
        '<CAMPAIGN_ISSUE_NUMBER>',
        "'owner/o''brien'"
    )) {
        if (-not $displayText.Contains($expectedDisplay)) {
            throw "Invocation display did not quote '$expectedDisplay': $displayText"
        }
    }

    $mockScriptPath = Join-Path $tempDirectory 'mock-copilot.mjs'
    $mockCommandPath = Join-Path $tempDirectory 'mock-copilot.cmd'
    $mockScript = @'
process.stdout.write(
    'Personal skills:\n' +
    '  shepherd-task-20-create-issues-from-plan - Stage 20 — create ordered issues.\n'
);
'@
    [System.IO.File]::WriteAllText(
        $mockScriptPath,
        $mockScript,
        [System.Text.UTF8Encoding]::new($false)
    )
    $mockCommand = @"
@echo off
node "$mockScriptPath" %*
exit /b %ERRORLEVEL%
"@
    [System.IO.File]::WriteAllText(
        $mockCommandPath,
        $mockCommand,
        [System.Text.ASCIIEncoding]::new()
    )

    $originalConsoleOutputEncoding = [Console]::OutputEncoding
    $originalOutputEncoding = $OutputEncoding
    try {
        $oemEncoding = [System.Text.Encoding]::GetEncoding(437)
        [Console]::OutputEncoding = $oemEncoding
        $OutputEncoding = $oemEncoding

        $result = & $skillListHelper -CopilotCli $mockCommandPath
        $skillList = @($result.Output)
        $joinedOutput = $skillList -join "`n"
        if ($result.ExitCode -ne 0) {
            throw "Mocked Copilot skill list exited with code $($result.ExitCode)."
        }
        if (-not $joinedOutput.Contains('Stage 20 — create ordered issues.')) {
            throw "Copilot skill-list output was not decoded as UTF-8: $joinedOutput"
        }
        if (-not $joinedOutput.Contains('shepherd-task-20-create-issues-from-plan')) {
            throw 'Required ASCII skill name was not preserved.'
        }
        if ([Console]::OutputEncoding.CodePage -ne $oemEncoding.CodePage -or
            $OutputEncoding.CodePage -ne $oemEncoding.CodePage) {
            throw 'Skill-list helper did not restore the caller encoding.'
        }
    }
    finally {
        $OutputEncoding = $originalOutputEncoding
        [Console]::OutputEncoding = $originalConsoleOutputEncoding
    }
}
finally {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Driver UTF-8 encoding contract tests passed.' -ForegroundColor Green
