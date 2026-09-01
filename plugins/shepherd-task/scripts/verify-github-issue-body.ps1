<#
.SYNOPSIS
    Fetches a GitHub issue through REST and verifies its body against a file.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$Repository,

    [Parameter(Mandatory)]
    [ValidateRange(1, [int]::MaxValue)]
    [int]$IssueNumber,

    [Parameter(Mandatory)]
    [string]$ExpectedBodyPath,

    [ValidateRange(1, 100)]
    [int]$MaxAttempts = 6,

    [ValidateRange(0, 300)]
    [int]$DelaySeconds = 5,

    [string]$DiagnosticPath,

    [string]$GitHubCli = 'gh'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

function ConvertTo-NormalizedLineEndings {
    param([AllowEmptyString()][string]$Text)
    return $Text -replace "`r`n|`r", "`n"
}

function Test-EquivalentBody {
    param(
        [AllowEmptyString()][string]$Actual,
        [AllowEmptyString()][string]$Expected
    )

    if ($Actual -ceq $Expected) {
        return $true
    }
    if ($Actual.EndsWith("`n") -and $Actual.Substring(0, $Actual.Length - 1) -ceq $Expected) {
        return $true
    }
    if ($Expected.EndsWith("`n") -and $Expected.Substring(0, $Expected.Length - 1) -ceq $Actual) {
        return $true
    }
    return $false
}

function Get-Sha256 {
    param([AllowEmptyString()][string]$Text)

    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Text)
    return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Get-FirstDifference {
    param(
        [AllowEmptyString()][string]$Actual,
        [AllowEmptyString()][string]$Expected
    )

    $limit = [Math]::Min($Actual.Length, $Expected.Length)
    $offset = 0
    while ($offset -lt $limit -and $Actual[$offset] -ceq $Expected[$offset]) {
        $offset++
    }
    if ($offset -eq $limit -and $Actual.Length -eq $Expected.Length) {
        return $null
    }

    $prefix = $Expected.Substring(0, [Math]::Min($offset, $Expected.Length))
    $line = ([regex]::Matches($prefix, "`n").Count) + 1
    $lastNewline = $prefix.LastIndexOf("`n", [StringComparison]::Ordinal)
    $column = if ($lastNewline -lt 0) { $offset + 1 } else { $offset - $lastNewline }
    return [ordered]@{
        offset = $offset
        line = $line
        column = $column
    }
}

function Test-TerminalGitHubFailure {
    param([string]$Message)
    return $Message -match '(?i)(HTTP\s+(401|403)|authentication|not authorized|resource not accessible)'
}

function Write-Diagnostic {
    param(
        [string]$Reason,
        [int]$Attempts,
        [AllowEmptyString()][string]$Actual,
        [AllowEmptyString()][string]$Expected
    )

    if ([string]::IsNullOrWhiteSpace($DiagnosticPath)) {
        return
    }

    $parent = Split-Path -Parent $DiagnosticPath
    if (-not [string]::IsNullOrWhiteSpace($parent) -and
        -not (Test-Path -LiteralPath $parent -PathType Container)) {
        New-Item -ItemType Directory -Path $parent | Out-Null
    }

    $diagnostic = [ordered]@{
        schemaVersion = 1
        repository = $Repository
        issueNumber = $IssueNumber
        endpoint = "repos/$Repository/issues/$IssueNumber"
        attempts = $Attempts
        observedAt = (Get-Date).ToUniversalTime().ToString('o')
        reason = $Reason
        expectedLength = $Expected.Length
        actualLength = $Actual.Length
        expectedSha256 = Get-Sha256 $Expected
        actualSha256 = Get-Sha256 $Actual
        firstDifference = Get-FirstDifference -Actual $Actual -Expected $Expected
    }
    $diagnostic | ConvertTo-Json -Depth 4 |
        Set-Content -LiteralPath $DiagnosticPath -Encoding utf8NoBOM
}

if (-not (Test-Path -LiteralPath $ExpectedBodyPath -PathType Leaf)) {
    throw "Expected issue body file not found: $ExpectedBodyPath"
}

$expected = ConvertTo-NormalizedLineEndings (
    Get-Content -LiteralPath $ExpectedBodyPath -Raw
)
$lastReason = ''
$lastActual = ''

for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $output = (& $GitHubCli api "repos/$Repository/issues/$IssueNumber" 2>&1 | Out-String).Trim()
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $lastReason = "GitHub REST request failed with exit code $exitCode."
        if (Test-TerminalGitHubFailure $output) {
            Write-Diagnostic -Reason $lastReason -Attempts $attempt -Actual '' -Expected $expected
            throw "Unable to fetch issue #$IssueNumber from ${Repository}: $output"
        }
    }
    else {
        try {
            $issue = $output | ConvertFrom-Json
            $lastActual = ConvertTo-NormalizedLineEndings ([string]$issue.body)
            if (Test-EquivalentBody -Actual $lastActual -Expected $expected) {
                return $issue
            }
            $lastReason = 'GitHub issue body differs from the persisted draft.'
        }
        catch {
            $lastReason = "GitHub REST response was invalid JSON: $($_.Exception.Message)"
        }
    }

    if ($attempt -lt $MaxAttempts) {
        Write-Warning "$lastReason Retrying issue #$IssueNumber body verification ($attempt/$MaxAttempts)."
        if ($DelaySeconds -gt 0) {
            Start-Sleep -Seconds $DelaySeconds
        }
    }
}

Write-Diagnostic -Reason $lastReason -Attempts $MaxAttempts -Actual $lastActual -Expected $expected
$diagnosticSuffix = if ([string]::IsNullOrWhiteSpace($DiagnosticPath)) {
    ''
}
else {
    " Diagnostic: $DiagnosticPath"
}
throw "Issue #$IssueNumber body verification failed after $MaxAttempts attempts. $lastReason$diagnosticSuffix"
