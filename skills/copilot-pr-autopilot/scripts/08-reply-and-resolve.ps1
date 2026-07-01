<#
.SYNOPSIS
    Post a reply on a Copilot review thread and resolve it.

.DESCRIPTION
    Performs the two GraphQL mutations needed to address a Copilot finding:
    1. addPullRequestReviewThreadReply — appends a reply comment.
    2. resolveReviewThread             — marks the thread resolved.

    Use this for both accepted-and-fixed findings and for declined-with-
    rationale findings. See ../templates/reply-fix.md, reply-decline.md,
    reply-drift.md, and reply-partial.md for body patterns.

.PARAMETER ThreadId
    The GraphQL node ID of the review thread (e.g. PRRT_kw...).

.PARAMETER Body
    The reply body. Markdown is supported.

.PARAMETER NoResolve
    If set, posts the reply only and leaves the thread open. Useful when
    you want to start a back-and-forth discussion rather than close out the
    thread.

.EXAMPLE
    pwsh 08-reply-and-resolve.ps1 -ThreadId PRRT_kw... -Body "Fixed in abc1234."

.EXAMPLE
    # Decline with rationale, do not resolve yet
    pwsh 08-reply-and-resolve.ps1 -ThreadId PRRT_kw... -NoResolve `
        -Body "Declining: this would require cross-class plumbing for a hypothetical race."

.NOTES
    Reply + resolve are TWO separate GraphQL mutations and the script
    is NOT atomic: if the reply succeeds and the resolve then fails
    (transient 5xx, rate limit, thread disappeared mid-call), the reply
    is already posted. The script is also NOT idempotent on reply —
    re-running it with the same -ThreadId and -Body will post a
    duplicate reply because -Body is mandatory.

    Recommended retry policy when a call fails:
      - If "Replied to thread X" did NOT print, the reply step failed;
        safe to re-run the whole command.
      - If "Replied to thread X" DID print but "Resolved thread X" did
        not, ONLY the resolve step failed. Do NOT re-run this script
        (it would post a duplicate reply). Instead resolve directly:

          gh api graphql `
            -f query='mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{id}}}' `
            -f t=$ThreadId

        This raw call bypasses the Invoke-Gh helper but is safe here
        because the mutation contains no embedded double-quote
        characters, so the PowerShell-5.1 native-arg splitting bug
        documented in references/api-quirks.md does not apply.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ThreadId,

    [Parameter(Mandatory = $true)]
    [string]$Body,

    [switch]$NoResolve
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/_lib.ps1"

$replyMutation = @'
mutation($tid: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: {
    pullRequestReviewThreadId: $tid,
    body: $body
  }) {
    comment { id }
  }
}
'@

$replyArgs = @('-f', "query=$replyMutation", '-f', "tid=$ThreadId", '-f', "body=$Body")
Invoke-GhGraphQL -GhArgs $replyArgs -Context "reply to thread $ThreadId" | Out-Null
Write-Output "Replied to thread $ThreadId"

if (-not $NoResolve) {
    $resolveMutation = @'
mutation($tid: ID!) {
  resolveReviewThread(input: { threadId: $tid }) {
    thread { isResolved }
  }
}
'@
    $resolveArgs = @('-f', "query=$resolveMutation", '-f', "tid=$ThreadId")
    Invoke-GhGraphQL -GhArgs $resolveArgs -Context "resolve thread $ThreadId" | Out-Null
    Write-Output "Resolved thread $ThreadId"
}
