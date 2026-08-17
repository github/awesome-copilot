<#
.SYNOPSIS
    Batch-resolve outdated Copilot review threads on a PR.

.DESCRIPTION
    After a review loop converges, the PR may still show old `isOutdated`
    Copilot threads listed as open. They were addressed by later commits
    but never explicitly resolved. This script finds them and resolves them
    in bulk.

    Only acts on threads where:
      - isOutdated: true
      - isResolved: false
      - the first comment's author is copilot-pull-request-reviewer
      - the LAST comment's author is the authenticated user (i.e. we
        have already replied to the thread). This safety guard prevents
        the script from hiding actionable findings if invoked before
        the review loop has converged. Override with -Force.
      - NO comment in the thread is from a non-Copilot, non-authenticated-
        user author (the "human-in-thread" guard — if a human or another
        bot has chimed in anywhere in the thread, even past Copilot's
        opener, the thread is SKIPPED). This guard is NOT overridable
        by -Force; auto-resolving a thread carrying human signal would
        silently hide unaddressed concerns.

    The doc claim "threads from human reviewers are never touched"
    therefore holds for both single-author human threads AND mixed-
    authorship threads where Copilot opened and a human replied.

.PARAMETER Owner
    Repository owner (org or user). Defaults to the current repo's owner
    (resolved via `gh repo view`).

.PARAMETER Repo
    Repository name. Defaults to the current repo's name.

.PARAMETER PrNumber
    The pull request number.

.EXAMPLE
    pwsh 10-cleanup-outdated.ps1 -PrNumber 122

.EXAMPLE
    pwsh 10-cleanup-outdated.ps1 -PrNumber 122 -DryRun
#>
[CmdletBinding()]
param(
    [string]$Owner,
    [string]$Repo,

    [Parameter(Mandatory = $true)]
    [int]$PrNumber,

    # Print what would be resolved without making any GraphQL
    # mutation. Uses an explicit switch (not the PowerShell
    # SupportsShouldProcess / -WhatIf machinery) so the helper's
    # internal `2>` redirect doesn't inherit a WhatIfPreference and
    # print cosmetic "Performing the operation Output to File" noise.
    [switch]$DryRun,

    # Override the safety guard that requires the last commenter on a
    # thread to be the authenticated user. Without -Force, threads
    # where Copilot (or anyone other than us) had the last word are
    # SKIPPED — resolving them would hide an actionable finding the
    # agent hasn't replied to yet. Pass -Force only when you're
    # intentionally clearing stale outdated Copilot threads out of
    # band of the convergence loop.
    #
    # -Force does NOT override the human-in-thread guard: threads with
    # any non-Copilot, non-authenticated-user comment anywhere in the
    # thread are always skipped regardless of -Force.
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/_lib.ps1"

$coords = Resolve-RepoCoords -Owner $Owner -Repo $Repo
$Owner = $coords.Owner
$Repo  = $coords.Repo

# Authenticated-user login — needed (unless -Force) so we only resolve
# threads where we have actually replied. Mirrors the pattern in
# 02-check-review-status.ps1.
$meR = Invoke-Gh -GhArgs @('api','user','--jq','.login')
if ($meR.ExitCode -ne 0) {
    throw "gh api user failed (exit $($meR.ExitCode)): $($meR.Stderr)"
}
$me = $meR.Stdout.Trim()

$query = @'
query($owner: String!, $repo: String!, $pr: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $after) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          id
          isResolved
          isOutdated
          firstComment: comments(first: 1) {
            nodes { author { login } }
          }
          lastComment: comments(last: 1) {
            nodes { author { login } }
          }
          # First page of comment authors so we can reject threads where
          # any non-Copilot, non-$me participant has commented (a human
          # or different bot chimed in after Copilot's opener). The doc
          # promise "threads from human reviewers are never touched"
          # must hold even when the human comment is not the FIRST.
          # totalCount lets us detect threads that exceed the 100-node
          # window; for those we paginate the rest via the node(id:)
          # query below so authorship visibility is always complete.
          allComments: comments(first: 100) {
            totalCount
            pageInfo { endCursor hasNextPage }
            nodes { author { login } }
          }
        }
      }
    }
  }
}
'@

$all = [System.Collections.Generic.List[object]]::new()
$after = $null
do {
    $ghArgs = @('-f', "query=$query", '-f', "owner=$Owner", '-f', "repo=$Repo", '-F', "pr=$PrNumber")
    if ($after) { $ghArgs = $ghArgs + @('-f', "after=$after") }

    $data = Invoke-GhGraphQL -GhArgs $ghArgs -Context "list outdated threads for $Owner/$Repo PR #$PrNumber"
    $page = $data.data.repository.pullRequest.reviewThreads
    foreach ($n in $page.nodes) { $all.Add($n) }
    $after = $page.pageInfo.endCursor
} while ($page.pageInfo.hasNextPage)

$threads = $all.ToArray()

# Comment-pagination helper: when a thread's first 100 comments don't
# cover the full set (totalCount > nodes.Count), fetch the remaining
# pages via node(id:) so authorship visibility is always complete.
# Returns the full ordered list of author logins (may include $null
# entries for ghost/deleted users — callers must tolerate $null).
#
# Guarantees:
#   * Uses a typed List[object] (preserves $null author entries for
#     ghost / deleted users) to avoid O(n^2) array growth via `+=`.
#   * Hard upper bound of `(MaxPages + 1) * 100` comments to prevent a
#     runaway loop if the server ever returns an invalid pageInfo
#     (cursor that never advances). The outer query is page 0 (first
#     100 comments); MaxPages caps the paginated additional pages.
#     Default MaxPages=200 → up to 201 pages → 20,100 comments, three
#     orders of magnitude beyond any plausible PR thread.
#   * Throws with explicit context if the paginated `node(id:)` query
#     returns $null (e.g., thread deleted mid-pagination) so the failure
#     bubbles up rather than silently producing partial authorship.
function Get-AllThreadAuthors {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$ThreadId,
        [Parameter(Mandatory)] $FirstPage,           # the allComments object from the outer query
        [int]$MaxPages = 200
    )

    # List[object] (not List[string]) so $null author entries — which
    # GitHub returns for deleted / ghost users — round-trip as $null
    # instead of being coerced to ''. Callers rely on `-not $login` to
    # skip both, but preserving the original shape keeps the contract
    # honest for any future caller.
    $authors = [System.Collections.Generic.List[object]]::new()

    $firstNodes = @()
    if ($FirstPage -and $FirstPage.nodes) { $firstNodes = @($FirstPage.nodes) }
    foreach ($n in $firstNodes) {
        $login = $null
        if ($n -and $n.author) { $login = $n.author.login }
        $authors.Add($login)
    }

    $hasNext = $false
    $after   = $null
    if ($FirstPage -and $FirstPage.pageInfo) {
        $hasNext = [bool]$FirstPage.pageInfo.hasNextPage
        $after   = $FirstPage.pageInfo.endCursor
    }

    $pageQuery = @'
query($id: ID!, $after: String) {
  node(id: $id) {
    ... on PullRequestReviewThread {
      comments(first: 100, after: $after) {
        pageInfo { endCursor hasNextPage }
        nodes { author { login } }
      }
    }
  }
}
'@

    # First fetched page is labeled 1: $pageIndex initialised to 0 here,
    # incremented at loop entry. The outer (pre-loop) query is page 0;
    # this loop fetches additional pages, so MaxPages caps the in-loop
    # iterations, making the total bound (outer + paginated) = MaxPages + 1.
    $pageIndex = 0
    while ($hasNext) {
        $pageIndex++
        if ($pageIndex -gt $MaxPages) {
            throw "Get-AllThreadAuthors: exceeded MaxPages=$MaxPages for thread $ThreadId — likely a malformed server response (cursor not advancing)."
        }

        $pageArgs = @('-f', "query=$pageQuery", '-f', "id=$ThreadId")
        if ($after) { $pageArgs = $pageArgs + @('-f', "after=$after") }
        $pageData = Invoke-GhGraphQL -GhArgs $pageArgs -Context "paginate comments for thread $ThreadId (page $pageIndex)"

        $threadNode = $null
        if ($pageData -and $pageData.data) { $threadNode = $pageData.data.node }
        if (-not $threadNode) {
            throw "Get-AllThreadAuthors: node(id: '$ThreadId') returned null on page $pageIndex (thread deleted or inaccessible)."
        }
        $pageBody = $threadNode.comments
        if (-not $pageBody) {
            throw "Get-AllThreadAuthors: thread $ThreadId has no comments connection on page $pageIndex."
        }

        $pageNodes = @()
        if ($pageBody.nodes) { $pageNodes = @($pageBody.nodes) }
        foreach ($n in $pageNodes) {
            $login = $null
            if ($n -and $n.author) { $login = $n.author.login }
            $authors.Add($login)
        }

        $prevCursor = $after
        $hasNext = $false
        $after   = $null
        if ($pageBody.pageInfo) {
            $hasNext = [bool]$pageBody.pageInfo.hasNextPage
            $after   = $pageBody.pageInfo.endCursor
        }
        # Belt-and-suspenders: if the server claims more pages but the
        # cursor didn't advance, MaxPages would still catch it — but
        # bail explicitly with a clearer message.
        if ($hasNext -and $after -eq $prevCursor) {
            throw "Get-AllThreadAuthors: pagination cursor did not advance for thread $ThreadId on page $pageIndex (server returned same endCursor='$after')."
        }
    }

    # Return as an array (comma-prefix prevents PowerShell from
    # unwrapping a single-element list at the call boundary).
    return ,$authors.ToArray()
}

$copilotLoginRegex = $CopilotReviewerLoginRegex  # canonical regex defined in _lib.ps1

# Build $targets via an explicit foreach instead of Where-Object {...}.
# The earlier Where-Object predicate did real work (warnings, try/catch,
# pagination calls, counter mutation) — Where-Object's script-block runs
# in a child scope, which is why those counters had to be $script:. A
# plain foreach keeps the predicate semantics readable, lets the
# counters be normal locals, and makes error handling easier to follow.
[int]$skippedAwaitingReply = 0
[int]$skippedHumanInThread = 0
[int]$skippedUnknownAuthorInThread = 0
[int]$skippedPaginationError = 0
$targets = New-Object System.Collections.Generic.List[object]

foreach ($thread in $threads) {
    if (-not $thread.isOutdated) { continue }
    if ($thread.isResolved)      { continue }

    # Defensive null guard around the GraphQL shape. The reviewer
    # login can appear as either `copilot-pull-request-reviewer` or
    # `copilot-pull-request-reviewer[bot]` depending on the GraphQL
    # surface; match both with the same regex used elsewhere.
    $firstAuthor = $null
    if ($thread.firstComment -and $thread.firstComment.nodes -and $thread.firstComment.nodes.Count -gt 0 -and $thread.firstComment.nodes[0].author) {
        $firstAuthor = $thread.firstComment.nodes[0].author.login
    }
    if (-not ($firstAuthor -and ($firstAuthor -match $copilotLoginRegex))) { continue }

    # Human-in-thread guard: if ANY comment in the thread is from a
    # non-Copilot, non-$me author (i.e., a human or different bot chimed
    # in after Copilot's opener), refuse to auto-resolve even with -Force.
    # The doc claim "threads from human reviewers are never touched"
    # must hold regardless of *position* of the human comment — a thread
    # with mixed authorship still carries human signal that must not
    # silently disappear when the loop calls cleanup.
    #
    # The outer query fetches the first 100 comment authors; when the
    # connection's pageInfo.hasNextPage is true, Get-AllThreadAuthors
    # paginates the rest via node(id:) so authorship visibility is
    # always complete. hasNextPage is the canonical connection signal
    # for "more pages exist" — using it directly is more robust than
    # comparing totalCount vs nodes.Count (totalCount is kept on the
    # query for diagnostics but not used as the pagination trigger).
    $hasMore = $false
    if ($thread.allComments -and $thread.allComments.pageInfo) {
        $hasMore = [bool]$thread.allComments.pageInfo.hasNextPage
    }
    $allAuthors = $null
    if ($hasMore) {
        # Per-thread try/catch so a transient pagination failure on ONE
        # thread (cursor not advancing, node(id:) returning null mid-walk,
        # rate-limit etc.) doesn't abort the rest of the cleanup pass —
        # mirrors the per-thread isolation already used for the resolve
        # mutation below. On failure: fail-safe by SKIPPING the thread
        # (never resolve when authorship is unknown).
        try {
            $allAuthors = Get-AllThreadAuthors -ThreadId $thread.id -FirstPage $thread.allComments
        } catch {
            $skippedPaginationError++
            Write-Warning "Pagination failed for thread $($thread.id) — skipping (fail-safe): $($_.Exception.Message)"
            continue
        }
    } else {
        $allAuthorsList = [System.Collections.Generic.List[object]]::new()
        if ($thread.allComments -and $thread.allComments.nodes) {
            foreach ($n in $thread.allComments.nodes) {
                $login = if ($n.author) { $n.author.login } else { $null }
                $allAuthorsList.Add($login)
            }
        }
        $allAuthors = $allAuthorsList.ToArray()
    }

    $humanInThread = $false
    $unknownAuthorInThread = $false
    foreach ($login in $allAuthors) {
        if (-not $login) {
            # `$null` author = ghost / deleted user. Authorship is
            # genuinely unknown, so treat as unsafe (fail-safe): we'd
            # rather leak an outdated bot thread than auto-resolve a
            # thread that *might* contain human signal hidden behind
            # a deleted account. Surfaced separately from
            # $humanInThread so summaries can distinguish "human
            # touched this" from "we couldn't tell who touched this".
            $unknownAuthorInThread = $true
            continue
        }
        if ($login -eq $me) { continue }
        if ($login -match $copilotLoginRegex) { continue }
        $humanInThread = $true
        break
    }
    if ($humanInThread) {
        $skippedHumanInThread++
        continue
    }
    if ($unknownAuthorInThread) {
        $skippedUnknownAuthorInThread++
        continue
    }

    # Safety guard: don't resolve threads where Copilot (or anyone
    # other than us) had the last word — we haven't replied yet, so
    # resolving would hide an actionable finding. Override with -Force.
    $lastAuthor = $null
    if ($thread.lastComment -and $thread.lastComment.nodes -and $thread.lastComment.nodes.Count -gt 0 -and $thread.lastComment.nodes[0].author) {
        $lastAuthor = $thread.lastComment.nodes[0].author.login
    }
    if (-not $Force -and $lastAuthor -ne $me) {
        $skippedAwaitingReply++
        continue
    }

    $targets.Add($thread)
}

if ($skippedHumanInThread -gt 0) {
    Write-Output "Skipped $skippedHumanInThread outdated Copilot thread(s) where a non-Copilot, non-'$me' commenter participated (-Force does NOT override this — human signal must not silently disappear)."
}
if ($skippedUnknownAuthorInThread -gt 0) {
    Write-Output "Skipped $skippedUnknownAuthorInThread outdated Copilot thread(s) with at least one ghost / deleted-user (null author) comment (-Force does NOT override this — authorship is unknown, fail-safe is to skip)."
}
if ($skippedAwaitingReply -gt 0) {
    Write-Output "Skipped $skippedAwaitingReply outdated Copilot thread(s) where the last comment is not from '$me' (pass -Force to override)."
}
if ($skippedPaginationError -gt 0) {
    Write-Output "Skipped $skippedPaginationError outdated Copilot thread(s) due to authorship-pagination errors (fail-safe: never resolve when authorship is unknown). See warnings above for per-thread detail."
}

if ($targets.Count -eq 0) {
    Write-Output 'No outdated Copilot threads to clean up.'
    return
}

Write-Output "Found $($targets.Count) outdated Copilot thread(s) to resolve."

$resolveMutation = @'
mutation($tid: ID!) {
  resolveReviewThread(input: { threadId: $tid }) {
    thread { isResolved }
  }
}
'@

# Per-thread try/catch so a single mutation failure (rate-limit, transient
# GraphQL error, thread-disappeared-mid-loop) does NOT abort the whole
# cleanup pass and leave the remaining outdated threads unresolved. Track
# successes and failures, then summarise at the end with a non-zero exit
# code if any thread failed.
$resolved = 0
$failed = New-Object System.Collections.Generic.List[object]
foreach ($t in $targets) {
    if ($DryRun) {
        Write-Output "Would resolve $($t.id) (DryRun)"
        continue
    }
    try {
        $resolveArgs = @('-f', "query=$resolveMutation", '-f', "tid=$($t.id)")
        Invoke-GhGraphQL -GhArgs $resolveArgs -Context "resolve outdated thread $($t.id)" | Out-Null
        Write-Output "Resolved $($t.id)"
        $resolved++
    } catch {
        $msg = $_.Exception.Message
        Write-Warning "Failed to resolve $($t.id): $msg"
        $failed.Add([pscustomobject]@{ ThreadId = $t.id; Error = $msg })
    }
}

if (-not $DryRun) {
    Write-Output "Cleanup summary: resolved=$resolved failed=$($failed.Count) skippedAwaitingReply=$skippedAwaitingReply skippedHumanInThread=$skippedHumanInThread skippedUnknownAuthorInThread=$skippedUnknownAuthorInThread skippedPaginationError=$skippedPaginationError"
    if ($failed.Count -gt 0) {
        Write-Output ("Failed threads: " + (($failed | ForEach-Object { "$($_.ThreadId) ($($_.Error))" }) -join '; '))
        exit 1
    }
}
