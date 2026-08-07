<#
.SYNOPSIS
    Interviews the user for 11 inputs to the shepherd-task-create-issues-from-plan
    skill and writes timestamped prompt and invocation artifacts.

.DESCRIPTION
    Asks the user each required input interactively, then writes a prompt file named
    YYYYMMDD-HHMM-invoke-shepherd-task-create-issues-from-plan-skill.md inside a
    persistent log directory. It also writes a PowerShell script that invokes the prompt
    with JSON, session-share, and OTel logging enabled.

.EXAMPLE
    .\shepherd-task-interview-user-to-create-issues.ps1
#>

$ErrorActionPreference = 'Stop'

function Read-Required {
    param(
        [string]$Prompt,
        [string]$Default = ''
    )
    $displayPrompt = if ($Default) { "$Prompt [$Default]" } else { $Prompt }
    do {
        $value = Read-Host $displayPrompt
        if ([string]::IsNullOrWhiteSpace($value) -and $Default) {
            $value = $Default
        }
        if ([string]::IsNullOrWhiteSpace($value)) {
            Write-Host "  This input is required." -ForegroundColor Yellow
        }
    } while ([string]::IsNullOrWhiteSpace($value))
    return $value.Trim()
}

Write-Host "=== shepherd-task-create-issues-from-plan — Input Interview ===" -ForegroundColor Cyan
Write-Host ""

$REPO = Read-Required "1/11  REPO (OWNER/REPO format, e.g. github/copilot-sdk)"

$BASE_BRANCH = Read-Required "2/11  BASE_BRANCH (non-main topic branch, e.g. edburns/1917-java-embed-cli)"

$PARENT_ISSUE = Read-Required "3/11  PARENT_ISSUE (positive integer issue number only, e.g. 123)"

$PLAN_DIRECTORY = Read-Required "4/11  PLAN_DIRECTORY (repo-relative path to directory containing plan and spikes)"

$PLAN_FILE_NAME = Read-Required "5/11  PLAN_FILE_NAME (name of the plan file within that directory)"

Write-Host ""
Write-Host "  Hint: copy the exact markdown heading from the plan." -ForegroundColor DarkGray
$QUESTIONS_SECTION = Read-Required "6/11  QUESTIONS_SECTION (exact heading of the resolved questions section)"

$IMPLEMENTATION_SECTION = Read-Required "7/11  IMPLEMENTATION_SECTION (exact heading of the implementation/build-order section)"

Write-Host ""
Write-Host "  Hint: provide full GitHub issue URLs separated by commas." -ForegroundColor DarkGray
$EXAMPLE_ISSUES = Read-Required "8/11  EXAMPLE_ISSUES (full GitHub issue URLs whose style to follow)"

$BASE_REMOTE = Read-Required "9/11  BASE_REMOTE (git remote name, e.g. upstream or origin)" "upstream"

$ISSUE_TYPE = Read-Required "10/11 ISSUE_TYPE (GitHub issue type for children)" "Task"

Write-Host ""
Write-Host "  Hint: repo-relative paths or constraints; comma-separated." -ForegroundColor DarkGray
$SUPPORTING_ARTIFACTS = Read-Required "11/11 SUPPORTING_ARTIFACTS (paths to spikes, screenshots, etc.)" "$PLAN_DIRECTORY"

# Build the prompt file.
$timestamp = Get-Date -Format 'yyyyMMdd-HHmm'
$logDir = Join-Path (Get-Location) "shepherd-task-$timestamp"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logDirFull = (Resolve-Path $logDir).Path
$outFile = Join-Path $logDirFull "$timestamp-invoke-shepherd-task-create-issues-from-plan-skill.md"
$invocationFile = Join-Path $logDirFull "$timestamp-invoke-shepherd-task-create-issues-from-plan-skill.ps1"

$body = @"
Invoke skill ``shepherd-task-create-issues-from-plan`` with these inputs:

- REPO: $REPO
- BASE_BRANCH: $BASE_BRANCH
- PARENT_ISSUE: $PARENT_ISSUE
- PLAN_DIRECTORY: $PLAN_DIRECTORY
- PLAN_FILE_NAME: $PLAN_FILE_NAME
- QUESTIONS_SECTION: $QUESTIONS_SECTION
- IMPLEMENTATION_SECTION: $IMPLEMENTATION_SECTION
- EXAMPLE_ISSUES: $EXAMPLE_ISSUES
- BASE_REMOTE: $BASE_REMOTE
- ISSUE_TYPE: $ISSUE_TYPE
- SUPPORTING_ARTIFACTS: $SUPPORTING_ARTIFACTS
- LOG_DIRECTORY: $logDirFull
"@

Set-Content -Path $outFile -Value $body -Encoding utf8NoBOM

$escapedOutFile = $outFile.Replace("'", "''")
$escapedLogDir = $logDirFull.Replace("'", "''")
$redactorPath = (Join-Path $PSScriptRoot 'redact-secrets.ps1').Replace("'", "''")
$command = @'
$timestamp = '__TIMESTAMP__'
$logDirFull = '__LOG_DIRECTORY__'
New-Item -ItemType Directory -Path $logDirFull -Force | Out-Null
$sessionSharePath = Join-Path $logDirFull "create-issues-session-$timestamp.md"
$sessionJsonPath = Join-Path $logDirFull "create-issues-session-$timestamp.json"
$sessionOtelPath = Join-Path $logDirFull "create-issues-otel-$timestamp.jsonl"
$promptPath = '__PROMPT_PATH__'
$prompt = Get-Content $promptPath -Raw
Write-Output "[shepherd-task] Logging create-issues run to: $logDirFull"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "shepherd-redact-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempDir | Out-Null
$rawJsonPath = Join-Path $tempDir 'session.json'
$rawSharePath = Join-Path $tempDir 'session.md'
$env:COPILOT_OTEL_FILE_EXPORTER_PATH = $sessionOtelPath
$copilotExit = 0
try {
    $prompt | copilot --yolo --output-format json --share $rawSharePath > $rawJsonPath
    $copilotExit = $LASTEXITCODE
    if ($copilotExit -eq 0) {
        & '__REDACTOR_PATH__' $tempDir | Out-Null
        Move-Item -LiteralPath $rawJsonPath -Destination $sessionJsonPath -Force
        Move-Item -LiteralPath $rawSharePath -Destination $sessionSharePath -Force
        & '__REDACTOR_PATH__' $logDirFull | Out-Null
    }
}
finally {
    Remove-Item Env:\COPILOT_OTEL_FILE_EXPORTER_PATH -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
if ($copilotExit -ne 0) {
    Write-Error "[shepherd-task] FAILED: copilot exited with code $copilotExit"
}
else {
    Write-Output "[shepherd-task] Create-issues session complete."
}
'@.Replace('__TIMESTAMP__', $timestamp).Replace('__LOG_DIRECTORY__', $escapedLogDir).Replace('__PROMPT_PATH__', $escapedOutFile).Replace('__REDACTOR_PATH__', $redactorPath)

Set-Content -Path $invocationFile -Value $command -Encoding utf8NoBOM

Write-Host ""
Write-Host "Artifacts written:" -ForegroundColor Green
Write-Host "  Prompt: $outFile"
Write-Host "  Script: $invocationFile"
