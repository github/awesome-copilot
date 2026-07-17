<#
.SYNOPSIS
    Shepherds a child Task issue end-to-end: from Copilot assignment through merge.

.DESCRIPTION
    Orchestrates two phases by launching separate `copilot --yolo` sessions:
    Phase 1: Assignment to Ready for Review
    Phase 2: Ready for Review to Merged

    Between phases, the script verifies state using gh CLI (not copilot exit codes).

.PARAMETER TaskIssue
    The issue number (e.g., 1841) or URL of the child task to shepherd.

.PARAMETER BaseBranch
    The base branch the task PR should target.

.PARAMETER Repo
    Repository in OWNER/REPO format.
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$TaskIssue,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$BaseBranch,

    [Parameter(Mandatory = $true, Position = 2)]
    [string]$Repo,

    [Parameter(Mandatory = $false, Position = 3)]
    [string]$LogDir = "shepherd-tasks-$(Get-Date -Format 'yyyyMMdd-HHmm')"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

function Write-Status($msg) {
    Write-Output "[shepherd-task] $msg"
}

function Write-Fail($msg) {
    Write-Output "[shepherd-task] FAILED: $msg"
}

function Write-Ok($msg) {
    Write-Output "[shepherd-task] $msg"
}

# --- Helper: Find the PR linked to the task issue ---
function Find-LinkedPR {
    # Strategy A: Issue timeline for cross-referenced PRs
    $prNumber = gh api "/repos/$Repo/issues/$TaskIssue/timeline" `
        --jq '.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number' 2>$null |
        Select-Object -First 1

    if ($prNumber) { return $prNumber.Trim() }

    # Strategy B: Search PR bodies for the issue number
    $prNumber = gh pr list -R $Repo --state open --json number,body `
        --jq ".[] | select(.body | test(`"#$TaskIssue`")) | .number" 2>$null |
        Select-Object -First 1

    if ($prNumber) { return $prNumber.Trim() }

    # Strategy C: Title or branch name match
    $prNumber = gh pr list -R $Repo --state open --json number,title,headRefName `
        --jq ".[] | select((.title | test(`"$TaskIssue`"; `"i`")) or (.headRefName | test(`"$TaskIssue`"))) | .number" 2>$null |
        Select-Object -First 1

    if ($prNumber) { return $prNumber.Trim() }

    return $null
}

# --- Helper: Verify all CI checks pass (excluding expected failure) ---
function Test-CIPassing {
    param([string]$PRNumber)

    $failures = gh pr checks $PRNumber -R $Repo --json name,state,bucket `
        --jq '.[] | select(.bucket == "fail") | select(.name != "No remove-before-merge directories") | .name' 2>$null

    return [string]::IsNullOrWhiteSpace($failures)
}

# --- Helper: Check for unresolved bot review comments ---
function Test-NoUnresolvedReviews {
    param([string]$PRNumber)

    $repoOwner = ($Repo -split '/')[0]
    $repoName = ($Repo -split '/')[1]

    $unresolved = gh api graphql -F owner=$repoOwner -F name=$repoName -F number=$PRNumber -f query='
    query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          reviewThreads(first: 100) {
            nodes { isResolved comments(first: 1) { nodes { author { login } } } }
          }
        }
      }
    }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .comments.nodes[0].author.login' 2>$null

    return [string]::IsNullOrWhiteSpace($unresolved)
}

# =============================================================================
# PHASE 1: Assignment to Ready for Review
# =============================================================================

# Idempotency: skip Phase 1 if a PR already exists for this issue
$prNumber = Find-LinkedPR
if ($prNumber) {
    Write-Status "PR #$prNumber already exists for issue #$TaskIssue — skipping Phase 1."
} else {
    Write-Status "Phase 1: Launching copilot --yolo for task #$TaskIssue"

    $phase1Prompt = @"
Invoke skill ``shepherd-task-from-assignment-to-ready`` with these inputs:

- TASK_ISSUE: $TaskIssue
- BASE_BRANCH: $BaseBranch
- REPO: $Repo
"@

    Write-Status "Phase 1 prompt: $phase1Prompt"
    $phase1Share = Join-Path $LogDir "phase1-task-$(Get-Date -Format 'yyyyMMdd-HHmm')-$TaskIssue.md"
    $phase1Json = Join-Path $LogDir "phase1-task-$(Get-Date -Format 'yyyyMMdd-HHmm')-$TaskIssue.json"
    $phase1Otel = Join-Path $LogDir "phase1-otel-$(Get-Date -Format 'yyyyMMdd-HHmm')-$TaskIssue.jsonl"
    $env:COPILOT_OTEL_FILE_EXPORTER_PATH = $phase1Otel
    $phase1Prompt | copilot --yolo --output-format json --share $phase1Share > $phase1Json
    Remove-Item Env:\COPILOT_OTEL_FILE_EXPORTER_PATH -ErrorAction SilentlyContinue

    Write-Status "Phase 1: copilot exited. Verifying state..."

    # --- Verify Phase 1 outcome ---
    $prNumber = Find-LinkedPR
    if (-not $prNumber) {
        Write-Fail "No open PR found linked to issue #$TaskIssue after Phase 1."
        exit 1
    }
}
Write-Status "Found PR #$prNumber"

# Verify base branch
$actualBase = gh pr view $prNumber -R $Repo --json baseRefName --jq '.baseRefName'
if ($actualBase -ne $BaseBranch) {
    Write-Status "PR base is '$actualBase', fixing to '$BaseBranch'..."
    gh pr edit $prNumber -R $Repo --base $BaseBranch
}

# Verify CI passing
if (-not (Test-CIPassing $prNumber)) {
    Write-Fail "CI checks not passing on PR #$prNumber after Phase 1."
    exit 1
}

# Verify no unresolved reviews
if (-not (Test-NoUnresolvedReviews $prNumber)) {
    Write-Fail "Unresolved review comments remain on PR #$prNumber after Phase 1."
    exit 1
}

Write-Ok "Phase 1 VERIFIED: PR #$prNumber is ready. CI passing, no unresolved comments."

# =============================================================================
# PHASE 2: Ready for Review to Merged
# =============================================================================

# Idempotency: skip Phase 2 if PR is already merged
$prState = gh pr view $prNumber -R $Repo --json state --jq '.state'
if ($prState -eq "MERGED") {
    Write-Ok "PR #$prNumber already merged — skipping Phase 2."
} else {
    Write-Status "Phase 2: Launching copilot --yolo for PR #$prNumber"

    $phase2Prompt = @"
Invoke skill ``shepherd-task-from-ready-to-merged-to-base`` with these inputs:

- TASK_ISSUE: $TaskIssue
- BASE_BRANCH: $BaseBranch
- REPO: $Repo
- PR_NUMBER: $prNumber
"@

    Write-Status "Phase 2 prompt: $phase2Prompt"
    $phase2Share = Join-Path $LogDir "phase2-task-$(Get-Date -Format 'yyyyMMdd-HHmm')-$TaskIssue.md"
    $phase2Json = Join-Path $LogDir "phase2-task-$(Get-Date -Format 'yyyyMMdd-HHmm')-$TaskIssue.json"
    $phase2Otel = Join-Path $LogDir "phase2-otel-$(Get-Date -Format 'yyyyMMdd-HHmm')-$TaskIssue.jsonl"
    $env:COPILOT_OTEL_FILE_EXPORTER_PATH = $phase2Otel
    $phase2Prompt | copilot --yolo --output-format json --share $phase2Share > $phase2Json
    Remove-Item Env:\COPILOT_OTEL_FILE_EXPORTER_PATH -ErrorAction SilentlyContinue

    Write-Status "Phase 2: copilot exited. Verifying state..."

    # --- Verify Phase 2 outcome ---
    $prState = gh pr view $prNumber -R $Repo --json state --jq '.state'
    if ($prState -ne "MERGED") {
        Write-Fail "PR #$prNumber is in state '$prState', expected MERGED."
        exit 1
    }
}

# Verify merged into correct branch
$mergedBase = gh pr view $prNumber -R $Repo --json baseRefName --jq '.baseRefName'
if ($mergedBase -ne $BaseBranch) {
    Write-Fail "PR #$prNumber was merged into '$mergedBase', expected '$BaseBranch'."
    exit 1
}

# Verify issue is closed
$issueState = gh issue view $TaskIssue -R $Repo --json state --jq '.state'
if ($issueState -ne "CLOSED") {
    Write-Status "Issue #$TaskIssue still open, closing..."
    gh issue close $TaskIssue -R $Repo
}

Write-Ok "SHEPHERD TASK COMPLETE: Task #$TaskIssue has been fully shepherded."
Write-Ok "PR #$prNumber merged to $BaseBranch."
exit 0
