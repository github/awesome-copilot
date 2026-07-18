<#
.SYNOPSIS
    Monitors an ongoing shepherd-task run by watching its log directory and polling GitHub.

.DESCRIPTION
    Watches a shepherd-task log directory for new files and polls the GitHub API
    for real-time PR/review/CI status. Alerts on failures, stalls, and completion.

    Run this in a SEPARATE terminal while shepherd-task-given-list.ps1 is running.

.PARAMETER LogDir
    Path to the shepherd-tasks log directory (e.g., shepherd-tasks-20260718-1648).

.PARAMETER Repo
    Repository in OWNER/REPO format.

.PARAMETER PollInterval
    Seconds between polls (default: 30).

.EXAMPLE
    .\shepherd-task-monitor.ps1 ..\shepherd-tasks-20260718-1827 edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$LogDir,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$Repo,

    [Parameter(Mandatory = $false, Position = 2)]
    [int]$PollInterval = 30
)

$ErrorActionPreference = "Continue"

if (-not (Test-Path $LogDir)) {
    Write-Error "Log directory not found: $LogDir"
    exit 1
}

$LogDirFull = (Resolve-Path $LogDir).Path
Write-Host "=== Shepherd Task Monitor ===" -ForegroundColor Cyan
Write-Host "Log directory: $LogDirFull"
Write-Host "Repository:    $Repo"
Write-Host "Poll interval: ${PollInterval}s"
Write-Host "Press Ctrl+C to stop."
Write-Host ""

# --- State tracking ---
$knownFiles = @{}
$issueState = @{}   # issue# -> { phase1: done/running/none, phase2: done/running/none, pr: #, status: ... }
$lastActivity = Get-Date
$staleMinutes = 20

function Get-Timestamp {
    return (Get-Date -Format 'HH:mm:ss')
}

function Write-Monitor {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[$(Get-Timestamp)] $Message" -ForegroundColor $Color
}

function Write-Alert {
    param([string]$Message)
    Write-Host "[$(Get-Timestamp)] ⚠️  $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "[$(Get-Timestamp)] ✅ $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "[$(Get-Timestamp)] ❌ $Message" -ForegroundColor Red
}

# Extract issue number from a log filename like "phase1-task-20260718-1650-33.md"
function Get-IssueFromFilename {
    param([string]$Name)
    if ($Name -match '-(\d+)\.(md|json|jsonl)$') {
        return $Matches[1]
    }
    return $null
}

# Extract phase from a log filename
function Get-PhaseFromFilename {
    param([string]$Name)
    if ($Name -match '^(phase[12])') {
        return $Matches[1]
    }
    return $null
}

# Find PR linked to an issue
function Find-PR {
    param([string]$Issue)

    # Strategy A: issue timeline
    $pr = gh api "/repos/$Repo/issues/$Issue/timeline" `
        --jq '.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number' 2>$null |
        Select-Object -First 1

    if ($pr) { return $pr.Trim() }

    # Strategy B: PR body search
    $pr = gh pr list -R $Repo --state all --json number,body `
        --jq ".[] | select(.body | test(`"#$Issue`")) | .number" 2>$null |
        Select-Object -First 1

    if ($pr) { return $pr.Trim() }

    return $null
}

# Get PR status summary
function Get-PRStatus {
    param([string]$PRNumber)

    $info = gh pr view $PRNumber -R $Repo --json state,isDraft,baseRefName,headRefName,mergeable,reviews,reviewRequests 2>$null | ConvertFrom-Json
    if (-not $info) { return $null }

    $reviewCount = 0
    $copilotReviews = @()
    if ($info.reviews) {
        $copilotReviews = @($info.reviews | Where-Object {
            $_.author.login -match 'copilot|copilot-pull-request-reviewer'
        })
        $reviewCount = $copilotReviews.Count
    }

    # Check for unresolved review comments
    $comments = gh api "/repos/$Repo/pulls/$PRNumber/comments" `
        --jq '.[] | select(.user.login | test("copilot-pull-request-reviewer|Copilot")) | .id' 2>$null
    $commentCount = if ($comments) { @($comments).Count } else { 0 }

    # Check CI
    $ciFailures = gh pr checks $PRNumber -R $Repo --json name,state,bucket `
        --jq '.[] | select(.bucket == "fail") | select(.name != "No remove-before-merge directories") | .name' 2>$null
    $ciStatus = if ([string]::IsNullOrWhiteSpace($ciFailures)) { "passing" } else { "failing" }

    return @{
        State        = $info.state
        IsDraft      = $info.isDraft
        Base         = $info.baseRefName
        Mergeable    = $info.mergeable
        ReviewRounds = $reviewCount
        Comments     = $commentCount
        CI           = $ciStatus
    }
}

# --- Main monitor loop ---
$iteration = 0
while ($true) {
    $iteration++
    $now = Get-Date
    $newFiles = @()

    # Scan log directory for new or changed files
    $currentFiles = Get-ChildItem $LogDirFull -File -ErrorAction SilentlyContinue
    foreach ($file in $currentFiles) {
        $key = $file.Name
        if (-not $knownFiles.ContainsKey($key)) {
            $knownFiles[$key] = $file.Length
            $newFiles += $file
            $lastActivity = $now
        }
        elseif ($knownFiles[$key] -ne $file.Length) {
            $knownFiles[$key] = $file.Length
            $lastActivity = $now
        }
    }

    # Process new files
    foreach ($file in $newFiles) {
        $issue = Get-IssueFromFilename $file.Name
        $phase = Get-PhaseFromFilename $file.Name
        $ext = [System.IO.Path]::GetExtension($file.Name)

        if ($issue -and $phase -and $ext -eq '.md') {
            # .md means the session exported — phase complete
            if (-not $issueState.ContainsKey($issue)) {
                $issueState[$issue] = @{ phase1 = 'none'; phase2 = 'none'; pr = $null; status = 'unknown' }
            }

            if ($phase -eq 'phase1') {
                $issueState[$issue].phase1 = 'done'
                Write-Monitor "Issue #$($issue): Phase 1 session exported ($($file.Name))"

                # Try to find the PR
                $pr = Find-PR $issue
                if ($pr) {
                    $issueState[$issue].pr = $pr
                    Write-Monitor "Issue #$($issue): Linked to PR #$($pr)"
                }
            }
            elseif ($phase -eq 'phase2') {
                $issueState[$issue].phase2 = 'done'
                Write-Monitor "Issue #$($issue): Phase 2 session exported ($($file.Name))"
            }
        }
        elseif ($issue -and $phase -and $ext -eq '.json') {
            # .json appearing means the copilot process exited (stdout captured)
            if (-not $issueState.ContainsKey($issue)) {
                $issueState[$issue] = @{ phase1 = 'none'; phase2 = 'none'; pr = $null; status = 'unknown' }
            }
        }
    }

    # For issues with known PRs, poll GitHub for status
    $activeIssue = $null
    foreach ($issue in $issueState.Keys) {
        $state = $issueState[$issue]
        $pr = $state.pr

        # Detect the currently active issue (has a PR but phase2 not done)
        if ($pr -and $state.phase2 -ne 'done') {
            $activeIssue = $issue
        }

        # If phase2 just completed, check final PR state
        if ($pr -and $state.phase2 -eq 'done' -and $state.status -ne 'merged' -and $state.status -ne 'failed') {
            $prStatus = Get-PRStatus $pr
            if ($prStatus) {
                if ($prStatus.State -eq 'MERGED') {
                    $state.status = 'merged'
                    Write-Success "Issue #$($issue): PR #$($pr) MERGED ($($prStatus.ReviewRounds) review rounds)"
                }
                elseif ($prStatus.State -eq 'CLOSED') {
                    $state.status = 'failed'
                    Write-Failure "Issue #$($issue): PR #$($pr) CLOSED (not merged)"
                }
                else {
                    $state.status = 'open'
                    Write-Failure "Issue #$($issue): PR #$($pr) still OPEN after Phase 2 exited"
                }
            }
        }
    }

    # Poll active PR for real-time status
    if ($activeIssue) {
        $pr = $issueState[$activeIssue].pr
        if ($pr) {
            $prStatus = Get-PRStatus $pr
            if ($prStatus) {
                $statusLine = "Issue #$($activeIssue) PR #$($pr): state=$($prStatus.State) draft=$($prStatus.IsDraft) " +
                              "reviews=$($prStatus.ReviewRounds) comments=$($prStatus.Comments) CI=$($prStatus.CI)"

                if ($prStatus.State -eq 'MERGED') {
                    Write-Success $statusLine
                    $issueState[$activeIssue].status = 'merged'
                }
                elseif ($prStatus.CI -eq 'failing') {
                    Write-Alert $statusLine
                }
                else {
                    Write-Monitor $statusLine -Color "Gray"
                }
            }
        }
    }
    # If no active issue detected yet but files exist, try to find one
    elseif ($iteration -eq 1 -or $newFiles.Count -gt 0) {
        foreach ($issue in $issueState.Keys) {
            $state = $issueState[$issue]
            if (-not $state.pr) {
                $pr = Find-PR $issue
                if ($pr) {
                    $state.pr = $pr
                    Write-Monitor "Issue #$($issue): Found PR #$($pr)"
                }
            }
        }
    }

    # Stale detection
    $staleDuration = ($now - $lastActivity).TotalMinutes
    if ($staleDuration -gt $staleMinutes) {
        Write-Alert "No activity for $([Math]::Round($staleDuration, 0)) minutes — shepherd may be stalled or waiting for CCRA"
    }

    # Periodic summary (every 5 iterations)
    if ($iteration % 5 -eq 0 -and $issueState.Count -gt 0) {
        Write-Host ""
        Write-Host "[$(Get-Timestamp)] === Summary ===" -ForegroundColor Cyan
        foreach ($issue in $issueState.Keys | Sort-Object) {
            $s = $issueState[$issue]
            $prLabel = if ($s.pr) { "PR #$($s.pr)" } else { "no PR" }
            $statusLabel = $s.status
            Write-Host "  Issue #$($issue) : P1=$($s.phase1) P2=$($s.phase2) $prLabel status=$statusLabel"
        }
        Write-Host ""
    }

    Start-Sleep -Seconds $PollInterval
}
