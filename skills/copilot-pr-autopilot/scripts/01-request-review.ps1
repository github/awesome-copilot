<#
.SYNOPSIS
    Request a Copilot review on a PR and verify the trigger landed.

.DESCRIPTION
    Single mechanism: GraphQL `requestReviewsByLogin` with
    `botLogins:["copilot-pull-request-reviewer"]`. See
    references/api-quirks.md for the GraphQL surface details.

    Success contract (exit 0, single-line JSON):
      - Status="InFlight"      — Copilot already a requested reviewer.
      - Status="TriggerLanded" — mutation submitted and verified via a
                                 new `copilot_work_started` event id.

    Failure (throw, exit 1): mutation failed, or no new event landed
    within -VerifySeconds. Caller should push a substantive commit and
    retry (auto-assign on `synchronize` is the most reliable fallback).

.PARAMETER PrNumber       PR number (required).
.PARAMETER Owner
    Optional; auto-resolved from `gh repo view`.

.PARAMETER Repo
    Optional; auto-resolved from `gh repo view`.
.PARAMETER VerifySeconds  Verification poll window (1..600, default 45).

.EXAMPLE
    pwsh 01-request-review.ps1 -PrNumber 236
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [int]$PrNumber,

    [string]$Owner,
    [string]$Repo,

    [ValidateRange(1, 600)]
    [int]$VerifySeconds = 45
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/_lib.ps1"

function Get-LatestCopilotWorkStartedEvent {
    $eventsPath = "repos/$Owner/$Repo/issues/$PrNumber/events?per_page=100"
    $r = Invoke-Gh -GhArgs @('api','-i',$eventsPath)
    if ($r.ExitCode -ne 0) { throw "events query failed: $($r.Stderr)" }

    $m = [regex]::Match($r.Stdout, '(?s)\A(?<headers>.*?)\r?\n\r?\n(?<body>.*)\z')
    if (-not $m.Success) { throw 'events query returned an unexpected header/body shape.' }
    $headers = $m.Groups['headers'].Value
    $body = $m.Groups['body'].Value

    $lastPage = 1
    # Link header looks like: `<https://api.github.com/...?per_page=100&page=4>; rel="last"`
    # Param order is not guaranteed — `page=4` may appear before or after
    # other query params. Match `page=<n>` inside the URL (allowing `?`
    # or `&` separator) up to the closing angle bracket, then the
    # `rel="last"` marker.
    $lastMatch = [regex]::Match($headers, '<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"')
    if ($lastMatch.Success) { $lastPage = [int]$lastMatch.Groups[1].Value }
    if ($lastPage -gt 1) {
        $r = Invoke-Gh -GhArgs @('api',"repos/$Owner/$Repo/issues/$PrNumber/events?per_page=100&page=$lastPage")
        if ($r.ExitCode -ne 0) { throw "events last-page query failed: $($r.Stderr)" }
        $body = $r.Stdout
    }

    $events = @(ConvertFrom-GhJson -Stdout $body -Context "events page $lastPage")
    $latest = $events | Where-Object { $_.event -eq 'copilot_work_started' } | Sort-Object id | Select-Object -Last 1
    if (-not $latest) { return [pscustomobject]@{ Id = 0L; CreatedAt = '' } }
    $createdAt = Format-IsoUtcString $latest.created_at
    [pscustomobject]@{ Id = [long]$latest.id; CreatedAt = $createdAt }
}

# ---------- repo resolve ----------

$coords = Resolve-RepoCoords -Owner $Owner -Repo $Repo
$Owner = $coords.Owner
$Repo  = $coords.Repo

# ---------- state: is Copilot currently requested? ----------
# Single GraphQL query: requested reviewers + head SHA, followed by
# pagination for the full requested-reviewer set.

$stateQuery = @'
query($o:String!,$r:String!,$n:Int!){
  viewer{login}
  repository(owner:$o,name:$r){
    pullRequest(number:$n){
      id
      headRefOid
      state
      author{login}
      reviews(last:50){nodes{author{login}}}
      reviewRequests(first:100){nodes{requestedReviewer{__typename ... on Bot{login} ... on User{login} ... on Mannequin{login}}} pageInfo{hasNextPage endCursor}}
    }
  }
}
'@
$stateData = Invoke-GhGraphQL -GhArgs @('-f',"query=$stateQuery",'-f',"o=$Owner",'-f',"r=$Repo",'-F',"n=$PrNumber") -Context "state query for $Owner/$Repo PR #$PrNumber"
$pr = $stateData.data.repository.pullRequest
if (-not $pr) { throw "PR #$PrNumber not found in $Owner/$Repo." }
if ($pr.state -ne 'OPEN') {
    throw "PR #$PrNumber is not OPEN (state=$($pr.state))."
}

$viewerLogin = [string]$stateData.data.viewer.login
$prAuthorLogin = if ($pr.author) { [string]$pr.author.login } else { '' }
$viewerIsAuthor = ($viewerLogin -and $prAuthorLogin -and ($viewerLogin -eq $prAuthorLogin))
$copilotHasReviewed = $false
if ($pr.reviews -and $pr.reviews.nodes) {
    foreach ($rev in $pr.reviews.nodes) {
        if ($rev.author -and $rev.author.login -and ($rev.author.login -match $CopilotReviewerLoginRegex)) {
            $copilotHasReviewed = $true; break
        }
    }
}

$headOid = $pr.headRefOid
$prNodeId = [string]$pr.id
if ([string]::IsNullOrWhiteSpace($prNodeId)) {
    throw "Failed to resolve PR node id for $Owner/$Repo PR #$PrNumber from state query."
}
$reviewRequestsList = [System.Collections.Generic.List[object]]::new()
foreach ($n in @($pr.reviewRequests.nodes)) { $reviewRequestsList.Add($n) }
$hasNext = [bool]$pr.reviewRequests.pageInfo.hasNextPage
$after   = $pr.reviewRequests.pageInfo.endCursor
while ($hasNext) {
    $pageQuery = @'
query($o:String!,$r:String!,$n:Int!,$after:String!){
  repository(owner:$o,name:$r){
    pullRequest(number:$n){
      reviewRequests(first:100,after:$after){nodes{requestedReviewer{__typename ... on Bot{login} ... on User{login} ... on Mannequin{login}}} pageInfo{hasNextPage endCursor}}
    }
  }
}
'@
    $pageData = Invoke-GhGraphQL -GhArgs @('-f',"query=$pageQuery",'-f',"o=$Owner",'-f',"r=$Repo",'-F',"n=$PrNumber",'-f',"after=$after") -Context "reviewRequests page query for $Owner/$Repo PR #$PrNumber"
    $page = $pageData.data.repository.pullRequest.reviewRequests
    foreach ($n in $page.nodes) { $reviewRequestsList.Add($n) }
    $hasNext = [bool]$page.pageInfo.hasNextPage
    $after   = $page.pageInfo.endCursor
}
$reviewRequests = $reviewRequestsList.ToArray()
$copilotPendingRequests = @($reviewRequests | Where-Object {
    $_.requestedReviewer -and $_.requestedReviewer.login -and $_.requestedReviewer.login -match $CopilotReviewerLoginRegex
})
$copilotPending = $copilotPendingRequests.Count -gt 0

# If Copilot is currently in requested_reviewers, it's in-flight by definition.
if ($copilotPending) {
    @{
        Status   = 'InFlight'
        PrNumber = $PrNumber
        HeadOid  = $headOid
        Detail   = "Copilot is currently in requested_reviewers; review is in flight."
    } | ConvertTo-Json -Compress
    exit 0
}

# We do NOT short-circuit on AlreadyReviewed — the user wants re-request
# as a first-class flow. Re-trigger; the GraphQL mutation handles both
# initial-add and re-request identically.

# ---------- snapshot copilot_work_started before triggering ----------

# Snapshot the latest copilot_work_started BEFORE triggering. Use the
# event's numeric `id` (monotonic) — `created_at` is second-resolution
# and would collide if a new event lands in the same second.
$beforeEvent = Get-LatestCopilotWorkStartedEvent
$beforeId = $beforeEvent.Id

# ---------- trigger via GraphQL requestReviewsByLogin ----------

$mut = 'mutation($p:ID!){requestReviewsByLogin(input:{pullRequestId:$p,botLogins:["copilot-pull-request-reviewer"]}){pullRequest{number}}}'
# Why this path and not REST or `requestReviews`? Verified end-to-end:
#   - REST POST /pulls/{n}/requested_reviewers `reviewers:["Copilot"]`
#     (the bot's REST login per `GET user/175728472`) → 404. The REST
#     `reviewers` field accepts type=User only; bots are rejected even
#     when the login resolves to a Bot record.
#   - GraphQL `requestReviews` rejects bot node IDs ("Could not resolve
#     to User node with the global id of 'BOT_…'") at schema level.
#   - `requestReviewsByLogin.botLogins` is the ONLY public path for bot
#     reviewers; trade-off is that it requires repo Triage/Write.
#   - The UI 🔄 button uses a github.com Rails endpoint with a session
#     cookie + CSRF that gh's OAuth token cannot satisfy.
# Catch the auth-gated case below and surface the two real workarounds.
$r = Invoke-Gh -GhArgs @('api','graphql','-f',"query=$mut",'-f',"p=$prNodeId")

# Belt-and-suspenders permission-error detection. Empirically `gh api graphql`
# exits non-zero AND puts the message in stderr for FORBIDDEN on
# requestReviewsByLogin (verified: exit=1, stderr contains "does not have the
# correct permissions"). But some GraphQL paths return exit=0 with a top-level
# `errors[]` carrying type=FORBIDDEN, so check both surfaces and route both to
# the same actionable-error formatter.
$permErrInStderr = ($r.ExitCode -ne 0) -and ($r.Stderr -match '(?i)does not have (the )?correct permissions|forbidden|HTTP 403')
$permErrInBody = $false
$bodyErrors = $null
if ($r.Stdout) {
    try {
        # Route through the shared ConvertFrom-GhJson helper so the
        # preview format / context conventions stay consistent. The
        # helper throws on parse failure; we catch and Write-Warning
        # (fall through to the authoritative stderr/exit-code path)
        # rather than abort — the warning makes the fall-through
        # observable in logs.
        $parsed = ConvertFrom-GhJson -Stdout $r.Stdout -Stderr $r.Stderr -Context 'requestReviewsByLogin' -PreviewChars 200
        if ($parsed.errors) {
            $bodyErrors = $parsed.errors
            $permErrInBody = [bool]($parsed.errors | Where-Object {
                ($_.type -eq 'FORBIDDEN') -or ($_.message -match '(?i)does not have (the )?correct permissions|forbidden')
            })
        }
    } catch {
        Write-Warning $_.Exception.Message
    }
}

if ($permErrInStderr -or $permErrInBody) {
    $rawMsg = if ($permErrInStderr) { $r.Stderr } elseif ($bodyErrors) { ($bodyErrors | ForEach-Object { $_.message }) -join '; ' } else { '(no message)' }
    if ($viewerIsAuthor) {
        # External PR author scenario: GitHub's UI 🔄 button uses an internal
        # endpoint not exposed in the public GraphQL/REST schema. Verified via
        # schema enumeration: the only public bot-reviewer mutation is
        # requestReviewsByLogin, which requires Triage/Write on the repo.
        # PR authors without write permission cannot trigger via any public API.
        $scenario = if ($copilotHasReviewed) { 're-request' } else { 'initial add' }
        throw @"
Cannot trigger Copilot via public API in this scenario ($scenario):
  - You are the PR author ($viewerLogin) on $Owner/$Repo PR #$PrNumber.
  - You lack repo Triage/Write permission, so requestReviewsByLogin returns FORBIDDEN.
  - GitHub's public GraphQL schema has no other bot-reviewer mutation
    (verified: requestReviews rejects bot node IDs; no REST ``bot_reviewers`` field).
  - The UI's '🔄 Re-request review' button uses an internal endpoint not in the public API.

Use one of these workarounds (both reliably drive Copilot to re-review):
  1. UI: open the PR in a browser → click 🔄 next to 'copilot-pull-request-reviewer'.
  2. CLI: push a substantive (non-whitespace) commit. The ``synchronize`` event
     auto-triggers Copilot with no API call and no permission required.

After triggering by either means, resume the loop with 02-check-review-status.ps1.

Raw error: $rawMsg
"@
    }
    throw @"
GraphQL requestReviewsByLogin failed with a permission error: $rawMsg

Most likely causes:
  * Authenticated user lacks Triage / Write permission on the repo
    (run ``gh api repos/$Owner/$Repo --jq .permissions`` to confirm; Read-only
    collaborators cannot request reviewers).
  * Copilot Code Review not enabled on the repo / account.
"@
}

if ($r.ExitCode -ne 0) {
    throw @"
GraphQL requestReviewsByLogin failed: $($r.Stderr)

Most likely causes:
  * Quiet-period after a recent dismissal of Copilot — wait 5-10 min, or push a substantive commit.
  * Copilot Code Review not enabled on the repo / account.
  * PR in a state that blocks bot review (draft, conflict, branch protection).
"@
}

if ($bodyErrors) {
    # Non-FORBIDDEN errors[] from a successful exit — surface them directly.
    $msgs = ($bodyErrors | ForEach-Object { $_.message }) -join '; '
    throw "GraphQL requestReviewsByLogin returned errors: $msgs"
}

# ---------- verify copilot_work_started event landed ----------

$deadline = (Get-Date).AddSeconds($VerifySeconds)
$afterTs = ''
$afterId = 0L
$lastErr = ''
do {
    try {
        $nowEvent = Get-LatestCopilotWorkStartedEvent
        $lastErr = ''
        if ($nowEvent.Id -gt $beforeId) {
            $afterId = $nowEvent.Id
            $afterTs = $nowEvent.CreatedAt
            break
        }
    } catch {
        $lastErr = $_.Exception.Message
    }
    if ((Get-Date) -ge $deadline) { break }
    $remaining = [int]($deadline - (Get-Date)).TotalSeconds
    Start-Sleep -Seconds ([Math]::Min(5, [Math]::Max(1, $remaining)))
} while ((Get-Date) -lt $deadline)

if (-not $afterId) {
    $errTail = if ($lastErr) { "`n  Last events-query error: $lastErr" } else { '' }
    throw @"
GraphQL mutation returned success but no new copilot_work_started event landed within $VerifySeconds seconds. The server may have silently dropped the request, or the events query kept failing transiently.
  Latest copilot_work_started event id before trigger: $beforeId
  HEAD: $headOid$errTail

Push a substantive commit (auto-assign on synchronize is the most reliable trigger) and retry.
"@
}

@{
    Status        = 'TriggerLanded'
    PrNumber      = $PrNumber
    HeadOid       = $headOid
    WorkStartedAt = $afterTs
    Detail        = "Triggered via GraphQL requestReviewsByLogin; copilot_work_started at $afterTs."
} | ConvertTo-Json -Compress
exit 0
