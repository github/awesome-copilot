<#
.SYNOPSIS
    Shepherds a child Task issue end-to-end: from Copilot assignment through merge.

.DESCRIPTION
    Orchestrates two phases by launching separate `copilot --yolo` sessions:
    Phase 1: Assignment to Ready for Review
    Phase 2: Ready for Review to Merged

    Between phases, the script requires an explicit successful shepherd
    terminal marker and independently verifies state using gh CLI. A zero
    Copilot process exit code is not treated as semantic success.

.PARAMETER TaskIssue
    The issue number (e.g., 1841) or URL of the child task to shepherd.

.PARAMETER CampaignMetadataDirectory
    Repository-root-relative campaign metadata directory.

.PARAMETER RunDirectory
    Existing shepherd-task-25-given-list run directory.
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$TaskIssue,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$CampaignMetadataDirectory,

    [Parameter(Mandatory = $true, Position = 2)]
    [string]$RunDirectory
)

$ErrorActionPreference = "Stop"
if ($TaskIssue -notmatch '^[1-9][0-9]*$') { throw 'TaskIssue must be a positive issue number.' }
if ($CampaignMetadataDirectory -notmatch '^[1-9][0-9]*-[a-z0-9][a-z0-9-]*-remove-before-merge$') {
    throw 'Invalid campaign metadata directory name.'
}
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sessionOutcomeAssertion = Join-Path $scriptDir 'assert-shepherd-session-outcome.ps1'
if (-not (Test-Path -LiteralPath $sessionOutcomeAssertion -PathType Leaf)) {
    throw "Session outcome assertion script not found: $sessionOutcomeAssertion"
}
$repoRootOutput = @(& git rev-parse --show-toplevel 2>$null)
$gitExitCode = $LASTEXITCODE
if ($gitExitCode -ne 0 -or $repoRootOutput.Count -eq 0) {
    throw 'Run inside the campaign Git worktree.'
}
$repoRoot = ([string]($repoRootOutput | Select-Object -First 1)).Trim()
$campaignPath = Join-Path $repoRoot $CampaignMetadataDirectory
$manifestPath = Join-Path $campaignPath 'shepherd-campaign.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or -not (Test-Path -LiteralPath $RunDirectory -PathType Container)) {
    throw 'Invalid campaign or run directory.'
}
$campaign = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$CampaignId = [string]$campaign.campaignId
$BaseBranch = [string]$campaign.baseBranch
$Repo = [string]$campaign.repository
$LessonPropagation = [string]$campaign.lessonPropagation
$Remote = & (Join-Path $scriptDir 'resolve-repository-remote.ps1') -Repo $Repo
if ([string]$campaign.campaignMetadataDirectory -ne $CampaignMetadataDirectory) { throw 'Manifest directory does not match supplied directory.' }
if ($LessonPropagation -notin @('off', 'campaign')) { throw 'Invalid campaign lesson propagation mode.' }
if (-not (Test-Path -LiteralPath (Join-Path $campaignPath 'campaign-lessons.md') -PathType Leaf)) { throw 'Campaign lessons file not found.' }
$LogDir = (Resolve-Path -LiteralPath $RunDirectory).Path
if ([IO.Directory]::GetParent($LogDir).FullName -ne (Resolve-Path -LiteralPath $campaignPath).Path) {
    throw 'Run directory is not a direct child of the campaign metadata directory.'
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

function Invoke-CopilotRedacted {
    param(
        [string]$Prompt,
        [string]$JsonlPath,
        [string]$SharePath
    )

    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "shepherd-redact-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    $rawJsonlPath = Join-Path $tempDir 'session.jsonl'
    $rawSharePath = Join-Path $tempDir 'session.md'
    try {
        $Prompt | copilot --yolo --output-format json --share $rawSharePath > $rawJsonlPath
        $copilotExit = $LASTEXITCODE
        if ($copilotExit -ne 0) {
            throw "copilot exited with code $copilotExit"
        }
        & (Join-Path $scriptDir 'redact-secrets.ps1') $tempDir | Out-Null
        Move-Item -LiteralPath $rawJsonlPath -Destination $JsonlPath -Force
        Move-Item -LiteralPath $rawSharePath -Destination $SharePath -Force
    }
    finally {
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# --- Helper: Find the PR linked to the task issue ---
function Find-LinkedPR {
    param(
        [ValidateSet('OPEN', 'MERGED')]
        [string]$State = 'OPEN'
    )

    # Strategy A: Issue timeline for cross-referenced PRs in this repository.
    $prCandidates = @(gh api "/repos/$Repo/issues/$TaskIssue/timeline" `
        --jq '.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | .source.issue.pull_request.url' 2>$null)
    $ghExitCode = $LASTEXITCODE
    if ($ghExitCode -ne 0) {
        throw "Unable to query the issue timeline for issue #$TaskIssue."
    }
    $pullRequestApiPrefix = "https://api.github.com/repos/$Repo/pulls/"
    foreach ($candidateUrl in @($prCandidates | Select-Object -Unique)) {
        if (-not ([string]$candidateUrl).StartsWith(
            $pullRequestApiPrefix,
            [StringComparison]::OrdinalIgnoreCase
        )) {
            continue
        }
        $candidate = ([string]$candidateUrl).Substring(
            $pullRequestApiPrefix.Length
        )
        $candidateStateOutput = @(gh pr view $candidate -R $Repo `
            --json state,closingIssuesReferences 2>$null)
        $ghExitCode = $LASTEXITCODE
        if ($ghExitCode -ne 0 -or $candidateStateOutput.Count -eq 0) {
            continue
        }
        try {
            $candidateInfo =
                ($candidateStateOutput -join [Environment]::NewLine) |
                ConvertFrom-Json
        }
        catch {
            throw "Linked PR #$candidate state response is invalid JSON."
        }
        $closesTask = @(
            $candidateInfo.closingIssuesReferences |
                Where-Object { [int]$_.number -eq [int]$TaskIssue }
        ).Count -gt 0
        if ([string]$candidateInfo.state -eq $State -and
            ($State -ne 'MERGED' -or $closesTask)) {
            return ([string]$candidate).Trim()
        }
    }
    if ($State -eq 'MERGED') {
        return $null
    }

    # Strategy B: Search PR bodies for the issue number
    $prCandidates = @(gh pr list -R $Repo --state ($State.ToLowerInvariant()) --json number,body `
        --jq ".[] | select(.body | test(`"#$TaskIssue`")) | .number" 2>$null)
    $ghExitCode = $LASTEXITCODE
    if ($ghExitCode -ne 0) {
        throw "Unable to search open PR bodies for issue #$TaskIssue."
    }
    $prNumber = $prCandidates | Select-Object -First 1

    if ($prNumber) { return $prNumber.Trim() }

    # Strategy C: Title or branch name match
    $prCandidates = @(gh pr list -R $Repo --state ($State.ToLowerInvariant()) --json number,title,headRefName `
        --jq ".[] | select((.title | test(`"$TaskIssue`"; `"i`")) or (.headRefName | test(`"$TaskIssue`"))) | .number" 2>$null)
    $ghExitCode = $LASTEXITCODE
    if ($ghExitCode -ne 0) {
        throw "Unable to search open PR titles and branches for issue #$TaskIssue."
    }
    $prNumber = $prCandidates | Select-Object -First 1

    if ($prNumber) { return $prNumber.Trim() }

    return $null
}

# --- Helper: Verify all CI checks pass (excluding expected failure) ---
function Test-CIPassing {
    param([string]$PRNumber)

    $failures = @(gh pr checks $PRNumber -R $Repo --json name,state,bucket `
        --jq '.[] | select(.bucket == "fail") | select(.name != "No remove-before-merge directories") | .name' 2>$null)
    $ghExitCode = $LASTEXITCODE
    if ($ghExitCode -ne 0) {
        throw "Unable to query CI checks for PR #$PRNumber."
    }

    return $failures.Count -eq 0
}

# --- Helper: Check for unresolved review state ---
function Test-NoUnresolvedReviews {
    param([string]$PRNumber)

    $repoOwner = ($Repo -split '/')[0]
    $repoName = ($Repo -split '/')[1]

    $reviewStateOutput = @(gh api graphql --paginate --slurp `
        -F owner=$repoOwner -F name=$repoName -F number=$PRNumber -f query='
    query($owner: String!, $name: String!, $number: Int!, $endCursor: String) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          reviewDecision
          reviewThreads(first: 100, after: $endCursor) {
            nodes { isResolved }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }' 2>$null)
    $ghExitCode = $LASTEXITCODE
    if ($ghExitCode -ne 0 -or $reviewStateOutput.Count -eq 0) {
        throw "Unable to query review state for PR #$PRNumber."
    }
    try {
        $reviewPages = @(($reviewStateOutput -join [Environment]::NewLine) |
            ConvertFrom-Json
        )
    }
    catch {
        throw "Review state for PR #$PRNumber is invalid JSON."
    }
    $unresolvedCount = @(
        $reviewPages |
            ForEach-Object {
                $_.data.repository.pullRequest.reviewThreads.nodes
            } |
            Where-Object { $_.isResolved -eq $false }
    ).Count
    $reviewDecision = @(
        $reviewPages |
            ForEach-Object {
                [string]$_.data.repository.pullRequest.reviewDecision
            } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    ) | Select-Object -Last 1

    return $unresolvedCount -eq 0 -and
        [string]$reviewDecision -ne 'CHANGES_REQUESTED'
}

# =============================================================================
# PHASE 1: Assignment to Ready for Review
# =============================================================================

$issueStateOutput = @(gh issue view $TaskIssue -R $Repo `
    --json state --jq '.state' 2>$null)
$ghExitCode = $LASTEXITCODE
if ($ghExitCode -ne 0 -or $issueStateOutput.Count -eq 0) {
    throw "Unable to inspect task issue #$TaskIssue."
}
$issueState = ([string]$issueStateOutput[0]).Trim()
if ($issueState -eq 'CLOSED') {
    $mergedPrNumber = Find-LinkedPR -State MERGED
    if (-not $mergedPrNumber) {
        throw "Task issue #$TaskIssue is closed, but no linked merged PR was found."
    }
    $mergedBaseOutput = @(gh pr view $mergedPrNumber -R $Repo `
        --json baseRefName --jq '.baseRefName' 2>$null)
    $ghExitCode = $LASTEXITCODE
    if ($ghExitCode -ne 0 -or $mergedBaseOutput.Count -eq 0) {
        throw "Unable to inspect merged PR #$mergedPrNumber."
    }
    $mergedBase = ([string]$mergedBaseOutput[0]).Trim()
    if ($mergedBase -ne $BaseBranch) {
        throw "Linked PR #$mergedPrNumber was merged into '$mergedBase', expected '$BaseBranch'."
    }
    Write-Ok "SHEPHERD TASK COMPLETE: Task #$TaskIssue was already completed by PR #$mergedPrNumber."
    exit 0
}
if ($issueState -ne 'OPEN') {
    throw "Task issue #$TaskIssue has unsupported state '$issueState'."
}

$prNumber = Find-LinkedPR -State OPEN
if ($prNumber) {
    Write-Status "PR #$prNumber already exists for issue #$TaskIssue — resuming Phase 1."
}
Write-Status "Phase 1: Launching copilot --yolo for task #$TaskIssue"

$phase1Prompt = @"
Invoke skill ``shepherd-task-30-from-assignment-to-ready`` with these inputs:

- TASK_ISSUE: $TaskIssue
- BASE_BRANCH: $BaseBranch
- REPO: $Repo
- CAMPAIGN_ID: $CampaignId
- CAMPAIGN_METADATA_DIRECTORY: $CampaignMetadataDirectory
- LESSON_PROPAGATION: $LessonPropagation
"@

$phase1Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Write-Status "Phase 1 prompt: $phase1Prompt"
$phase1Share = Join-Path $LogDir "phase1-task-$phase1Timestamp-$TaskIssue.md"
$phase1Jsonl = Join-Path $LogDir "phase1-task-$phase1Timestamp-$TaskIssue.jsonl"
$phase1Otel = Join-Path (Resolve-Path $LogDir) "phase1-otel-$phase1Timestamp-$TaskIssue.jsonl"
$env:COPILOT_OTEL_FILE_EXPORTER_PATH = $phase1Otel
Invoke-CopilotRedacted -Prompt $phase1Prompt -JsonlPath $phase1Jsonl -SharePath $phase1Share
& (Join-Path $scriptDir 'redact-secrets.ps1') $LogDir | Out-Null
Remove-Item Env:\COPILOT_OTEL_FILE_EXPORTER_PATH -ErrorAction SilentlyContinue

Write-Status "Phase 1: copilot exited. Verifying semantic outcome and state..."

$prNumber = Find-LinkedPR -State OPEN
& $sessionOutcomeAssertion `
    -SharePath $phase1Share `
    -Stage 30 `
    -TaskIssue ([int]$TaskIssue) `
    -PRNumber $(if ($prNumber) { [int]$prNumber } else { 0 }) | Out-Null
Write-Status "Found PR #$prNumber"

# Verify state and base branch
$phase1StateOutput = @(gh pr view $prNumber -R $Repo `
    --json state,isDraft,baseRefName,reviewDecision 2>$null)
$ghExitCode = $LASTEXITCODE
if ($ghExitCode -ne 0 -or $phase1StateOutput.Count -eq 0) {
    Write-Fail "Unable to inspect PR #$prNumber after Phase 1."
    exit 1
}
$phase1State = ($phase1StateOutput -join [Environment]::NewLine) |
    ConvertFrom-Json
if ($phase1State.baseRefName -ne $BaseBranch) {
    Write-Status "PR base is '$($phase1State.baseRefName)', fixing to '$BaseBranch'..."
    gh pr edit $prNumber -R $Repo --base $BaseBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Could not update PR #$prNumber base to '$BaseBranch'."
        exit 1
    }
}
if ($phase1State.state -ne 'OPEN' -or
    $phase1State.isDraft -ne $true -or
    [string]$phase1State.reviewDecision -eq 'CHANGES_REQUESTED') {
    Write-Fail "PR #$prNumber is not ready after Phase 1: state=$($phase1State.state), isDraft=$($phase1State.isDraft), reviewDecision=$($phase1State.reviewDecision)."
    exit 1
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
Invoke skill ``shepherd-task-40-from-ready-to-merged-to-base`` with these inputs:

- TASK_ISSUE: $TaskIssue
- BASE_BRANCH: $BaseBranch
- REPO: $Repo
- REMOTE: $Remote
- CAMPAIGN_ID: $CampaignId
- CAMPAIGN_METADATA_DIRECTORY: $CampaignMetadataDirectory
- LESSON_PROPAGATION: $LessonPropagation
- PR_NUMBER: $prNumber
"@

    Write-Status "Phase 2 prompt: $phase2Prompt"
    $phase2Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $phase2Share = Join-Path $LogDir "phase2-task-$phase2Timestamp-$TaskIssue.md"
    $phase2Jsonl = Join-Path $LogDir "phase2-task-$phase2Timestamp-$TaskIssue.jsonl"
    $phase2Otel = Join-Path (Resolve-Path $LogDir) "phase2-otel-$phase2Timestamp-$TaskIssue.jsonl"
    $env:COPILOT_OTEL_FILE_EXPORTER_PATH = $phase2Otel
    Invoke-CopilotRedacted -Prompt $phase2Prompt -JsonlPath $phase2Jsonl -SharePath $phase2Share
    & (Join-Path $scriptDir 'redact-secrets.ps1') $LogDir | Out-Null
    Remove-Item Env:\COPILOT_OTEL_FILE_EXPORTER_PATH -ErrorAction SilentlyContinue

    Write-Status "Phase 2: copilot exited. Verifying semantic outcome and state..."

    # --- Verify Phase 2 outcome ---
    & $sessionOutcomeAssertion `
        -SharePath $phase2Share `
        -Stage 40 `
        -TaskIssue ([int]$TaskIssue) `
        -PRNumber ([int]$prNumber) | Out-Null
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
