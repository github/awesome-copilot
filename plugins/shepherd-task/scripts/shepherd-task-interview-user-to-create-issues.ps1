<#
.SYNOPSIS
    Interviews the user for all 12 inputs to the shepherd-task-create-issues-from-plan
    skill and writes a timestamped prompt file in the current directory.

.DESCRIPTION
    Asks the user each required input interactively, then writes a prompt file named
    YYYYMMDD-HHMM-invoke-shepherd-task-create-issues-from-plan-skill.md that, when
    executed, invokes the skill with all parameters inlined.

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

$REPO = Read-Required "1/12  REPO (OWNER/REPO format, e.g. github/copilot-sdk)"

$BASE_BRANCH = Read-Required "2/12  BASE_BRANCH (non-main topic branch, e.g. edburns/1917-java-embed-cli)"

$PARENT_ISSUE = Read-Required "3/12  PARENT_ISSUE (positive integer issue number only, e.g. 123)"

$PLAN_DIRECTORY = Read-Required "4/12  PLAN_DIRECTORY (repo-relative path to directory containing plan and spikes)"

$PLAN_FILE_NAME = Read-Required "5/12  PLAN_FILE_NAME (name of the plan file within that directory)"

Write-Host ""
Write-Host "  Hint: copy the exact markdown heading from the plan." -ForegroundColor DarkGray
$QUESTIONS_SECTION = Read-Required "6/12  QUESTIONS_SECTION (exact heading of the resolved questions section)"

$IMPLEMENTATION_SECTION = Read-Required "7/12  IMPLEMENTATION_SECTION (exact heading of the implementation/build-order section)"

Write-Host ""
Write-Host "  Hint: provide full GitHub issue URLs separated by commas." -ForegroundColor DarkGray
$EXAMPLE_ISSUES = Read-Required "8/12  EXAMPLE_ISSUES (full GitHub issue URLs whose style to follow)"

$BASE_REMOTE = Read-Required "9/12  BASE_REMOTE (git remote name, e.g. upstream or origin)" "upstream"

$ISSUE_TYPE = Read-Required "10/12 ISSUE_TYPE (GitHub issue type for children)" "Task"

Write-Host ""
Write-Host "  Hint: repo-relative paths or constraints; comma-separated." -ForegroundColor DarkGray
$SUPPORTING_ARTIFACTS = Read-Required "11/12 SUPPORTING_ARTIFACTS (paths to spikes, screenshots, etc.)" "$PLAN_DIRECTORY"

$UPDATE_PLAN_CHECKBOXES = Read-Required "12/12 UPDATE_PLAN_CHECKBOXES (true or false)" "false"

# Build the prompt file.
$timestamp = Get-Date -Format 'yyyyMMdd-HHmm'
$outFile = Join-Path (Get-Location) "$timestamp-invoke-shepherd-task-create-issues-from-plan-skill.md"

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
- UPDATE_PLAN_CHECKBOXES: $UPDATE_PLAN_CHECKBOXES
"@

Set-Content -Path $outFile -Value $body -Encoding utf8NoBOM

Write-Host ""
Write-Host "Prompt file written to:" -ForegroundColor Green
Write-Host "  $outFile"
Write-Host ""
Write-Host "To execute, paste the contents into a Copilot chat or pipe to copilot:"
Write-Host "  Get-Content `"$outFile`" | copilot --yolo"
