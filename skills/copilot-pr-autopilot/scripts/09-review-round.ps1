<#
.SYNOPSIS
    Deterministically count a PR's Copilot review rounds and flag whether
    the periodic recap gate is due this round. Single-shot, read-only.

.DESCRIPTION
    ONE job: compute the round number N for a PR from observable history —
    the count of review submissions authored by the Copilot Code Review
    bot — and report whether the recap circuit-breaker is due.

    Each top-of-loop trigger (01-request-review.ps1) produces exactly one
    Copilot review submission, so the count of those submissions IS the
    round number. It is read from the GitHub API on every call, so it
    never depends on agent working memory or any on-disk state file. The
    original failure mode this skill was built to survive — an agent
    losing track of the count across a long run, drifting for 156 rounds —
    cannot happen when the count is derived, not remembered.

    This script does NOT decide anything. It does not stop the loop, does
    not enforce a cap, and does not pick a verdict. It reports two facts;
    the parent agent still owns the recap reasoning and the
    CONTINUE / REVERT-AND-SHIP / HAND-OFF verdict (see
    ../references/09-convergence.md). "No script decides the cap" stays
    true — this script only makes the *trigger* (Nth round) deterministic
    instead of a fallible mental tally.

    Output JSON fields:
      - PrNumber, Owner, Repo
      - Round         : count of Copilot Code Review submissions on the PR.
                        Full pagination — every Copilot submission, NOT the
                        most-recent-100 window 02-check-review-status.ps1
                        uses to find the latest review. The count must stay
                        correct on exactly the long loops the gate exists
                        to catch (a 100-review window would silently
                        undercount past round 100).
      - RecapInterval : the recap cadence (default 10; override with
                        -RecapInterval).
      - RecapDue      : true iff Round > 0 AND Round % RecapInterval == 0 —
                        i.e. this is a 10th / 20th / 30th ... round and the
                        parent should RUN THE RECAP GATE before looping back
                        to step 1.

    Parsing the JSON (any PowerShell version, 5.1 + 7.x):

        $snap     = pwsh -NoProfile -File 09-review-round.ps1 -PrNumber <n>
        $round    = if ($snap -match '"Round":(\d+)')    { [int]$Matches[1] } else { 0 }
        $recapDue = ($snap -match '"RecapDue":true')

.PARAMETER PrNumber
    The pull request number. The only required parameter.

.PARAMETER Owner
    Repository owner. OPTIONAL — auto-resolved from `gh repo view`.

.PARAMETER Repo
    Repository name. OPTIONAL — auto-resolved from `gh repo view`.

.PARAMETER RecapInterval
    Recap cadence in rounds. Default 10 (stop at 10, 20, 30, ...). Must be
    a positive integer. Exposed as a single named knob so the cadence
    isn't a magic number duplicated in prose, and so the gate boundary is
    testable on a real PR without fabricating review history.

.EXAMPLE
    pwsh ./scripts/09-review-round.ps1 -PrNumber 1944

    # {"PrNumber":1944,"Owner":"github","Repo":"awesome-copilot","Round":154,"RecapInterval":10,"RecapDue":false}

.EXAMPLE
    pwsh ./scripts/09-review-round.ps1 -PrNumber 1944 -RecapInterval 7

    # 154 % 7 == 0 -> {"...","Round":154,"RecapInterval":7,"RecapDue":true}
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [int]$PrNumber,

    [string]$Owner,
    [string]$Repo,

    [ValidateRange(1, [int]::MaxValue)]
    [int]$RecapInterval = 10
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/_lib.ps1"

$coords = Resolve-RepoCoords -Owner $Owner -Repo $Repo
$Owner = $coords.Owner
$Repo  = $coords.Repo

# Walk ALL reviews (full pagination). 02-check-review-status.ps1 only needs
# the most-recent-100 window to find the LATEST Copilot review; the round
# COUNT must include EVERY Copilot submission, because the gate exists
# precisely for long loops where the count can exceed 100. Counting is
# order-independent, so forward pagination is sufficient.
$qReviews = @'
query($o:String!,$r:String!,$n:Int!,$after:String){
  repository(owner:$o,name:$r){
    pullRequest(number:$n){
      reviews(first:100, after:$after){
        pageInfo{endCursor hasNextPage}
        nodes{author{login}}
      }
    }
  }
}
'@

$after = $null
$round = 0
do {
    $ghArgs = @('-f', "query=$qReviews", '-f', "o=$Owner", '-f', "r=$Repo", '-F', "n=$PrNumber")
    if ($after) { $ghArgs = $ghArgs + @('-f', "after=$after") }
    $resp = Invoke-GhGraphQL -GhArgs $ghArgs -Context "reviews count for $Owner/$Repo PR #$PrNumber"
    $pagePr = $resp.data.repository.pullRequest
    if (-not $pagePr) { throw "PR #$PrNumber not found in $Owner/$Repo (reviews page)." }
    $round += @($pagePr.reviews.nodes | Where-Object {
        $_.author -and $_.author.login -and $_.author.login -match $CopilotReviewerLoginRegex
    }).Count
    $after = $pagePr.reviews.pageInfo.endCursor
} while ($pagePr.reviews.pageInfo.hasNextPage)

# Gate TRIGGER only — not the verdict. RecapDue says "this is an Nth round,
# run the recap"; the parent agent reads the recap and picks
# CONTINUE / REVERT-AND-SHIP / HAND-OFF (09-convergence.md).
$recapDue = ($round -gt 0) -and (($round % $RecapInterval) -eq 0)

$result = [ordered]@{
    PrNumber      = $PrNumber
    Owner         = $Owner
    Repo          = $Repo
    Round         = $round
    RecapInterval = $RecapInterval
    RecapDue      = $recapDue
}
$result | ConvertTo-Json -Depth 3 -Compress
