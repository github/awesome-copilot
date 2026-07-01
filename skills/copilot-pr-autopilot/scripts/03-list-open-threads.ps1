<#
.SYNOPSIS
    List unresolved review threads on a pull request (all reviewers).

.DESCRIPTION
    Fetches review threads via GraphQL (paginated) and prints every
    thread that is still `isResolved: false`. Threads from all reviewers
    (Copilot, humans, other bots) are included; the triage step decides
    what to do with each.

    Each thread's `comments(first:1)` is the originating review comment
    — that's where `path`, `line`, and `body` come from. Reply chains
    on the same thread are intentionally not surfaced here; this script
    is the input to triage, not to reading conversation history.

.PARAMETER Owner
    Optional; auto-resolved from `gh repo view`.

.PARAMETER Repo
    Optional; auto-resolved from `gh repo view`.
.PARAMETER PrNumber                  The pull request number.

.EXAMPLE
    pwsh 03-list-open-threads.ps1 -PrNumber 122

.PARAMETER MaxBodyLength
    Cap the `Body` column at this many characters (default 500; pass 0 to
    disable). Long Copilot comments otherwise dominate stdout and slow
    triage; truncated bodies are suffixed with `…`.
#>
[CmdletBinding()]
param(
    [string]$Owner,
    [string]$Repo,

    [Parameter(Mandatory = $true)]
    [int]$PrNumber,

    [ValidateRange(0, 100000)]
    [int]$MaxBodyLength = 500
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/_lib.ps1"

$coords = Resolve-RepoCoords -Owner $Owner -Repo $Repo
$Owner = $coords.Owner
$Repo  = $coords.Repo

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
          comments(first: 1) {
            nodes {
              author { login }
              body
              path
              line
              createdAt
            }
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

    $data = Invoke-GhGraphQL -GhArgs $ghArgs -Context "list threads for $Owner/$Repo PR #$PrNumber"
    $page = $data.data.repository.pullRequest.reviewThreads
    foreach ($n in $page.nodes) { $all.Add($n) }
    $after = $page.pageInfo.endCursor
} while ($page.pageInfo.hasNextPage)

$threads = $all.ToArray()

$open = $threads | Where-Object { -not $_.isResolved }

$resultList = [System.Collections.Generic.List[object]]::new()
foreach ($t in $open) {
    $c = if ($t.comments -and $t.comments.nodes -and $t.comments.nodes.Count -gt 0) { $t.comments.nodes[0] } else { $null }
    if (-not $c) { continue }  # malformed thread (no originating comment) — skip rather than crash
    $body = ($c.body -replace "`r?`n", ' ')
    if ($MaxBodyLength -gt 0 -and $body.Length -gt $MaxBodyLength) {
        $body = $body.Substring(0, $MaxBodyLength) + '…'
    }
    $path = if ($null -ne $c.line) { "$($c.path):$($c.line)" } else { $c.path }
    $author = if ($c.author -and $c.author.login) { $c.author.login } else { '(deleted)' }
    # Normalise createdAt via the shared helper so the format stays
    # identical across 01/02/03 (Format-IsoUtcString in _lib.ps1).
    $createdAt = Format-IsoUtcString $c.createdAt
    $resultList.Add([pscustomobject]@{
        ThreadId  = $t.id
        Author    = $author
        Path      = $path
        CreatedAt = $createdAt
        Body      = $body
    })
}
$result = $resultList.ToArray()

# Single-line JSON output (matches the contract used by 01/02/08/10).
# -Compress so callers can pipe to ConvertFrom-Json or jq directly without
# stripping PowerShell's default Format-List rendering / ANSI escapes.
[pscustomobject]@{
    PrNumber        = $PrNumber
    Owner           = $Owner
    Repo            = $Repo
    OpenThreadCount = $result.Count
    Threads         = $result
} | ConvertTo-Json -Depth 6 -Compress
