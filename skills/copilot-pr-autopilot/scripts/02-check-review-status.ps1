<#
.SYNOPSIS
    Snapshot the current Copilot review state of a PR. Single-shot, no waiting.

.DESCRIPTION
    ONE job: return a JSON snapshot of the PR's current Copilot
    review state. The agent (caller) decides what to do with it —
    including how long to wait between snapshots when polling for a
    new review to land. THIS SCRIPT DOES NOT WAIT.

    Output JSON fields:
      - PrNumber, Owner, Repo
      - HeadOid           : current PR HEAD SHA
      - State             : PR state (OPEN/CLOSED/MERGED)
      - LatestCopilotReview: {state, submittedAt, commitOid, bodyHead}
                            or null if no Copilot review is present
                            in the most recent 100 reviews (very long
                            PRs may have an older Copilot review outside
                            this window — treat null as "no recent
                            review", not "never reviewed")
      - ReviewAtHead       : true iff latest Copilot review's commit.oid == HeadOid
      - NoNewComments      : true iff the latest review body matches
                             "generated no new comments" / "generated 0 comments"
      - OpenThreadCount    : number of unresolved review threads (from all
                             reviewers); informational — convergence does
                             NOT require this to be zero
      - OpenThreadsAwaitingReply: number of open threads where the
                             LAST comment is NOT from the authenticated
                             user (`gh api user`). "Ball-in-court"
                             model: a Copilot/human comment with no
                             reply from us OR a re-raise after our
                             earlier reply both count as awaiting. A
                             thread where WE are the latest commenter
                             counts as "done from our side" (the human
                             merge owner decides next).
      - CopilotPending     : true iff the Copilot reviewer bot is currently
                             listed in `requested_reviewers` on the PR (a
                             review is in flight; the caller should wait
                             rather than re-trigger)
      - Converged          : true iff the agent has done its job.
                             - When a Copilot review is at HEAD:
                               ReviewAtHead && NoNewComments &&
                               OpenThreadsAwaitingReply == 0.
                             - When no Copilot review has been observed
                               on this PR (LatestCopilotReview is null
                               AND CopilotPending is false): just
                               OpenThreadsAwaitingReply == 0. Note this
                               ALSO fires for a brand-new PR with zero
                               threads — meaning "nothing to do yet";
                               the agent should still trigger a Copilot
                               review via 01-request-review.ps1 if
                               Copilot is enabled on the repo. Single-
                               iteration mode (skip the trigger) is the
                               agent's decision after 01 fails with a
                               specific Copilot-disabled error, NOT an
                               auto-detected state from this script.
                             Open threads may remain in either case —
                             those are explicit hand-offs to the human
                             merge owner.

    Canonical agent loop (see ../references/orchestration.md and the per-step files):
      1. Call this script → capture LatestCopilotReview.submittedAt as
         baseline AND read CopilotPending.
      2. If CopilotPending is true, skip the trigger step — Copilot is
         already reviewing. Otherwise, call 01-request-review.ps1.
         If 01 throws with a Copilot-disabled error (e.g. the bot
         isn't a valid reviewer on this repo), the agent may fall
         back to single-iteration mode: skip the wait, jump to
         03-list-open-threads.ps1, triage + reply to whatever exists,
         done.
      3. Wait sub-agent polls this script until either submittedAt
         advances past baseline AND ReviewAtHead is true, OR Converged.
      4. On convergence end the loop; otherwise fetch threads via
         03-list-open-threads.ps1, triage, fix, push, reply, repeat.

    Parsing the JSON: timestamps are emitted as plain ISO-8601 UTC
    strings (e.g. `"2026-06-08T02:02:44Z"`). Extract via regex on the
    raw JSON to avoid PowerShell's auto re-binding of ISO strings to
    `[datetime]` (which renders local culture on string interpolation
    and silently breaks lexicographic baseline compares):

        $snap = pwsh -NoProfile -File 02-check-review-status.ps1 -PrNumber <n>
        $baseline       = if ($snap -match '"submittedAt":"([^"]+)"')  { $Matches[1] } else { '' }
        $copilotPending = ($snap -match '"CopilotPending":true')
        $converged      = ($snap -match '"Converged":true')

    Works on any PowerShell version (5.1 + 7.x). No `[datetime]`
    rebinding, no version-specific parameters.

.PARAMETER PrNumber
    The pull request number. The only required parameter.

.PARAMETER Owner
    Repository owner. OPTIONAL — auto-resolved from `gh repo view`.

.PARAMETER Repo
    Repository name. OPTIONAL — auto-resolved from `gh repo view`.

.EXAMPLE
    pwsh 02-check-review-status.ps1 -PrNumber 236

    # Output (converged):
    # {"HeadOid":"abc...","State":"OPEN","LatestCopilotReview":{...},"ReviewAtHead":true,"NoNewComments":true,"OpenThreadCount":0}

    # Output (not converged — new findings):
    # {"HeadOid":"abc...","ReviewAtHead":true,"NoNewComments":false,"OpenThreadCount":3,...}
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [int]$PrNumber,

    [string]$Owner,
    [string]$Repo,

    # When set, the agent has decided to drive this PR as a single
    # iteration (typically because 01-request-review.ps1 failed with a
    # Copilot-disabled error). In this mode, convergence ignores the
    # stale-review checks (ReviewAtHead / NoNewComments) — those can
    # never become true when the trigger is intentionally skipped —
    # and depends solely on OpenThreadsAwaitingReply == 0.
    [switch]$SingleIteration
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/_lib.ps1"

$coords = Resolve-RepoCoords -Owner $Owner -Repo $Repo
$Owner = $coords.Owner
$Repo  = $coords.Repo

# Identity of the currently-authenticated gh user. Used below to
# detect "the agent has already replied to this thread" and therefore
# count it as our work-completed (the thread may still be open
# deliberately as a human hand-off).
$meR = Invoke-Gh -GhArgs @('api','user','--jq','.login')
if ($meR.ExitCode -ne 0) {
    throw "gh api user failed (exit $($meR.ExitCode)): $($meR.Stderr)"
}
$me = $meR.Stdout.Trim()

# Query A (once): PR head/state/reviews. Reviews are not paginated
# here — `reviews(last:100)` is the most recent 100 reviews, sufficient
# for finding the latest Copilot review.
$qHead = @'
query($o:String!,$r:String!,$n:Int!){
  repository(owner:$o,name:$r){
    pullRequest(number:$n){
      headRefOid
      state
      reviews(last:100){nodes{author{login} state submittedAt body commit{oid}}}
    }
  }
}
'@

$d = Invoke-GhGraphQL -GhArgs @('-f',"query=$qHead",'-f',"o=$Owner",'-f',"r=$Repo",'-F',"n=$PrNumber") -Context "head query for $Owner/$Repo PR #$PrNumber"
$pr = $d.data.repository.pullRequest
if (-not $pr) { throw "PR #$PrNumber not found in $Owner/$Repo." }

# Query B (paginated): reviewThreads — fetch isResolved AND the last
# comment's author per thread so we can compute
# "is this open thread awaiting our reply, or have we already handed
# it off?" The loop converges when WE have nothing more to do, not
# when the open-thread count drops to zero (some threads stay open
# deliberately as human hand-offs / escalated declines).
$qThreads = @'
query($o:String!,$r:String!,$n:Int!,$after:String){
  repository(owner:$o,name:$r){
    pullRequest(number:$n){
      reviewThreads(first:100, after:$after){
        pageInfo{endCursor hasNextPage}
        nodes{
          isResolved
          comments(last:1){nodes{author{login}}}
        }
      }
    }
  }
}
'@

$after = $null
$allThreadsList = [System.Collections.Generic.List[object]]::new()
do {
    $ghArgs = @('-f', "query=$qThreads", '-f', "o=$Owner", '-f', "r=$Repo", '-F', "n=$PrNumber")
    if ($after) { $ghArgs = $ghArgs + @('-f', "after=$after") }
    $threadResp = Invoke-GhGraphQL -GhArgs $ghArgs -Context "threads query for $Owner/$Repo PR #$PrNumber"
    $pagePr = $threadResp.data.repository.pullRequest
    if (-not $pagePr) { throw "PR #$PrNumber not found in $Owner/$Repo (threads page)." }
    foreach ($n in $pagePr.reviewThreads.nodes) { $allThreadsList.Add($n) }
    $after = $pagePr.reviewThreads.pageInfo.endCursor
} while ($pagePr.reviewThreads.pageInfo.hasNextPage)
$allThreads = $allThreadsList.ToArray()

# Query C (paginated): reviewRequests — typical PRs have <100 requested
# reviewers, but pagination is required for correctness so we never
# falsely report CopilotPending=false on a PR with >100 requested
# reviewers (which would cause the wait sub-agent to re-trigger a
# review that's actually already in flight).
$qReviewRequests = @'
query($o:String!,$r:String!,$n:Int!,$after:String){
  repository(owner:$o,name:$r){
    pullRequest(number:$n){
      reviewRequests(first:100, after:$after){
        pageInfo{endCursor hasNextPage}
        nodes{requestedReviewer{__typename ... on Bot{login} ... on User{login} ... on Mannequin{login}}}
      }
    }
  }
}
'@

$after = $null
$allReviewRequestsList = [System.Collections.Generic.List[object]]::new()
do {
    $ghArgs = @('-f', "query=$qReviewRequests", '-f', "o=$Owner", '-f', "r=$Repo", '-F', "n=$PrNumber")
    if ($after) { $ghArgs = $ghArgs + @('-f', "after=$after") }
    $rrResp = Invoke-GhGraphQL -GhArgs $ghArgs -Context "reviewRequests query for $Owner/$Repo PR #$PrNumber"
    $rrPagePr = $rrResp.data.repository.pullRequest
    if (-not $rrPagePr) { throw "PR #$PrNumber not found in $Owner/$Repo (reviewRequests page)." }
    foreach ($n in $rrPagePr.reviewRequests.nodes) { $allReviewRequestsList.Add($n) }
    $after = $rrPagePr.reviewRequests.pageInfo.endCursor
} while ($rrPagePr.reviewRequests.pageInfo.hasNextPage)
$allReviewRequests = $allReviewRequestsList.ToArray()

# M1 tie-break: when multiple Copilot reviews share the same
# submittedAt (server-side clock collision is rare but possible
# under burst re-triggers), pick the one whose commit.oid matches
# HEAD if any; otherwise the original sort order is deterministic
# enough (PowerShell Sort-Object is stable since 5.1).
# M3 pagination: reviews(last:100) returns the MOST RECENT 100
# reviews. If a PR has 100+ reviews more recent than the last
# Copilot review (essentially impossible in normal use, but
# theoretically possible on heavily-bot-reviewed PRs), the latest
# Copilot review would be cut off. Emit a soft warning to stderr
# when we hit the boundary so the caller knows to inspect manually.
if ($pr.reviews.nodes.Count -ge 100) {
    [Console]::Error.WriteLine("WARNING: reviews(last:100) boundary hit on PR #$PrNumber — if there are 100+ non-Copilot reviews more recent than the latest Copilot review, LatestCopilotReview may be stale. Inspect via 'gh pr view $PrNumber --comments' if convergence behaves unexpectedly.")
}
$copilotReviews = @($pr.reviews.nodes | Where-Object {
    $_.author -and $_.author.login -and $_.author.login -match $CopilotReviewerLoginRegex
})
$latest = if ($copilotReviews.Count -gt 0) {
    $atHead = $copilotReviews | Where-Object { $_.commit -and $_.commit.oid -eq $pr.headRefOid } | Sort-Object submittedAt -Descending | Select-Object -First 1
    if ($atHead) { $atHead } else { $copilotReviews | Sort-Object submittedAt -Descending | Select-Object -First 1 }
} else { $null }

$reviewAtHead = $false
$noNewComments = $false
$bodyHead = $null
$latestCommitOid = $null
if ($latest) {
    if ($latest.commit -and $latest.commit.oid) {
        $latestCommitOid = $latest.commit.oid
        $reviewAtHead = ($latestCommitOid -eq $pr.headRefOid)
    }
    $bodyText = if ($latest.body) { $latest.body } else { '' }
    # NoNewComments covers both successful zero-finding reviews AND the
    # "Copilot wasn't able to review any files in this pull request"
    # body that Copilot returns for empty / pure-whitespace / line-ending-
    # only diffs. Both are terminal for the loop: there is nothing for
    # the agent to address and re-triggering will produce the same body.
    # Matches Copilot's "no findings" terminal phrases. Anchored on
    # \b (word boundary, blocks "regenerated") and on a following
    # sentence-end (./!/EOL/EOS) so the regex does NOT false-positive
    # on substrings like "generated no comments yet but..." or
    # "with 0 comments outstanding". Tested against the 4 known
    # negative inputs and 6 known positive Copilot body templates.
    $noNewComments = ($bodyText -match '(?im)\b(?:generated|had|with)\s+(?:no|0|zero)\s+(?:new\s+)?comments\s*(?:[\.\!]|$)|wasn''t\s+able\s+to\s+review\s+any\s+files\s+in\s+this\s+pull\s+request|was\s+not\s+able\s+to\s+review\s+any\s+files\s+in\s+this\s+pull\s+request')
    $bodyHead = if ($bodyText.Length -gt 300) { $bodyText.Substring(0, 300) } else { $bodyText }
}

$openThreads = @($allThreads | Where-Object { -not $_.isResolved })
$openCount = $openThreads.Count

# OpenThreadsAwaitingReply: open threads where the LAST comment is
# NOT from the authenticated user. "Ball is in our court" model:
#   - Copilot/human posts a finding → last=them → awaiting our reply.
#   - We reply → last=us → ball passes back → not awaiting.
#   - Copilot re-raises after our reply → last=them again → awaiting.
# Using "last comment" (not "any comment by us in window") is what
# correctly handles re-raised threads. Threads we've replied to but
# the reviewer hasn't yet acted on count as "done from our side" —
# the human merge owner decides what to do with them next.
$awaitingReply = @($openThreads | Where-Object {
    $thread = $_
    $lastAuthor = $null
    if ($thread.comments -and $thread.comments.nodes -and $thread.comments.nodes.Count -gt 0) {
        $lastComment = $thread.comments.nodes[$thread.comments.nodes.Count - 1]
        if ($lastComment -and $lastComment.author -and $lastComment.author.login) {
            $lastAuthor = $lastComment.author.login
        }
    }
    $lastAuthor -ne $me
})
$awaitingCount = $awaitingReply.Count

# CopilotPending: is the Copilot reviewer bot currently in
# `requested_reviewers`? Canonical signal for "review is in flight";
# the wait sub-agent (workflow step 2) consults this so the trigger
# step (01-request-review.ps1) can be skipped when already pending.
$copilotPending = @($allReviewRequests | Where-Object {
    $_.requestedReviewer -and $_.requestedReviewer.login -and $_.requestedReviewer.login -match $CopilotReviewerLoginRegex
}).Count -gt 0

# Force submittedAt to a stable ISO-8601 UTC string. ConvertFrom-Json
# auto-converted the gh response's ISO string into [datetime], and
# ConvertTo-Json would otherwise emit it with .NET's "o" format
# (`2026-06-07T18:06:59.0000000Z`) — but more importantly, downstream
# callers that pipe our JSON through `ConvertFrom-Json` again would
# get another [datetime] which renders local culture on string
# interpolation, silently breaking lexicographic baseline comparisons.
# Emit a plain string so the round-trip is identity.
$submittedAtIso = if ($latest -and $latest.submittedAt) { Format-IsoUtcString $latest.submittedAt } else { $null }

$result = [ordered]@{
    PrNumber            = $PrNumber
    Owner               = $Owner
    Repo                = $Repo
    HeadOid             = $pr.headRefOid
    State               = $pr.state
    LatestCopilotReview = if ($latest) {
        [ordered]@{
            state       = $latest.state
            submittedAt = $submittedAtIso
            commitOid   = $latestCommitOid
            bodyHead    = $bodyHead
        }
    } else { $null }
    ReviewAtHead              = $reviewAtHead
    NoNewComments             = $noNewComments
    OpenThreadCount           = $openCount
    OpenThreadsAwaitingReply  = $awaitingCount
    CopilotPending            = $copilotPending
    # Converged = "the agent has nothing more to do".
    # PR State guard: a CLOSED / MERGED PR can never be the target of
    # a productive review loop — the agent cannot push, the loop
    # cannot iterate. Force Converged = false so the parent surfaces
    # the PR-state change to the user instead of silently calling
    # task_complete on a non-OPEN PR.
    # - SingleIteration (agent decision; Copilot unavailable or
    #   trigger intentionally skipped): just OpenThreadsAwaitingReply
    #   == 0. Ignores ReviewAtHead / NoNewComments because those will
    #   never advance without a new Copilot review.
    # - Copilot review exists or pending: ReviewAtHead &&
    #   NoNewComments && OpenThreadsAwaitingReply == 0.
    # - No Copilot review has ever been observed: just
    #   OpenThreadsAwaitingReply == 0 (also fires for brand-new PRs
    #   with zero findings; agent should still trigger via
    #   01-request-review.ps1 if Copilot is enabled).
    Converged = if ($pr.state -ne 'OPEN') {
        $false
    } elseif ($SingleIteration) {
        $awaitingCount -eq 0
    } elseif ($latest -or $copilotPending) {
        $reviewAtHead -and $noNewComments -and $awaitingCount -eq 0
    } else {
        $awaitingCount -eq 0
    }
}
$result | ConvertTo-Json -Depth 5 -Compress
