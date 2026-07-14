# GitHub API Quirks (Verified)

API behaviors that matter for the Copilot review loop. All verified
against the current API surface — read this before reaching for an
alternative API or modifying the bundled scripts.

## GraphQL trigger — `requestReviewsByLogin` is the supported path

```graphql
mutation($p: ID!) {
  requestReviewsByLogin(input: {
    pullRequestId: $p,
    botLogins: ["copilot-pull-request-reviewer"]
  }) {
    pullRequest { number }
  }
}
```

Verified empirically against personal repos without Copilot Pro AND
org repos with Copilot Enterprise. Works for both initial-add and
re-request (no special re-request mutation).

Three GraphQL traps:

1. Mutation is **`requestReviewsByLogin`**, NOT `requestReviews`.
   `RequestReviewsInput` (used by `requestReviews`) does not expose a
   `botLogins` field, so it can't request a bot reviewer at all —
   `botLogins` is the central field on `requestReviewsByLogin`.
2. Field is **`botLogins`**, NOT `userLogins`. The latter returns
   `Could not resolve user with login 'Copilot'`.
3. Slug is **`copilot-pull-request-reviewer`** (the App slug). The
   display login `Copilot` returns `Could not resolve bot with slug
   'Copilot'`.

Verify success via a new `copilot_work_started` event on the issue's
events feed — `GET /repos/{o}/{r}/issues/{n}/events` (see SKILL.md
Gotchas "HTTP 200 / exit 0 is NOT proof"). Empirically this event
type IS exposed on the `/events` endpoint (verified across 20+
trigger rounds on PR 236); it is not timeline-only.
`01-request-review.ps1` enforces this by comparing the event `id`
(monotonic) before and after the trigger.

### Other trigger paths — DO NOT USE

- **`requestReviews` with `botLogins`** → input type rejects the
  field. Don't try variants.
- **REST `POST /pulls/<n>/requested_reviewers` with
  `reviewers[]=Copilot`** → can return HTTP 201 while silently
  dropping the bot. Not used by the script.
- **`gh pr edit --add-reviewer Copilot`** → returns `'Copilot' not
  found` on current `gh`. Not used by the script.

## GraphQL `latestReviews` — stale cache, do NOT use

```graphql
# DO NOT — stale projection:
pullRequest(number:$pr){ latestReviews(first:50){ nodes{...} } }

# USE INSTEAD — always current:
pullRequest(number:$pr){ reviews(last:100){ nodes{...} } }
```

`latestReviews` is a "latest per user" projection with stale-cache
behavior: a fresh Copilot review can be absent for several minutes
after submission, while `reviews(last:100)` reflects it immediately.
Using `latestReviews` for in-flight or convergence checks causes the
script to operate on an obsolete commit OID — either falsely
declaring convergence or timing out for a review that already
exists.

`02-check-review-status.ps1` uses `reviews(last:100)` filtered
client-side to the Copilot reviewer login. It also emits a stderr
warning when the result is exactly 100 reviews, so the caller knows
the boundary was hit and the latest Copilot review COULD be older
than the window — practically only possible if 100+ non-Copilot
reviews landed after the last Copilot review, which doesn't happen
in normal use. If you ever see the warning and the loop misbehaves,
fetch the full review list manually:

```bash
gh pr view <n> --json reviews --jq '.reviews[] | select(.author.login | test("copilot-pull-request-reviewer"))'
```

### Tie-break for multiple Copilot reviews

When more than one Copilot review shares the same `submittedAt`
(rare server-side clock collision under burst re-triggers), the
script first prefers the review whose `commit.oid == HEAD`, then
falls back to a stable sort. The intent is "the review that
matches the current code is the one the agent should reply to" —
preventing a stale-OID review from winning the tie and falsely
flipping `ReviewAtHead` to false.

## Reply + resolve mutations — both work

```graphql
mutation($tid: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: {
    pullRequestReviewThreadId: $tid,
    body: $body
  }) { comment { id } }
}

mutation($tid: ID!) {
  resolveReviewThread(input: { threadId: $tid }) {
    thread { isResolved }
  }
}
```

## `isOutdated` ≠ `isResolved` — current unresolved state is truth

A thread can be `isOutdated: true` (Copilot's comment points at lines
that have since changed) while still `isResolved: false`. These
threads:

- Still need reply + resolve in the per-round loop. A thread can
  become outdated mid-round when your own fix shifts the cited
  lines. Filtering on `!isOutdated` would silently drop those
  threads, leaving the PR's open-conversations list non-empty even
  after the underlying code is fixed.
- `03-list-open-threads.ps1` therefore lists every unresolved
  thread with no `isOutdated` filter.
- `10-cleanup-outdated.ps1` is a safety net only — for the rare
  case where a thread becomes outdated AFTER your last per-round
  fetch.

## Review latency — don't poll faster than ~3 min

Copilot reviews typically post 3–6 minutes after the request,
occasionally up to ~10 minutes. There is no progress signal;
polling more often than every ~3 min wastes API budget without
making the review arrive sooner.

## `gh api graphql -F` coerces strings — use `-f` for `String!`

The `gh` CLI distinguishes its two flag forms:

- `-F key=value` — type inference. Values parsing as int, bool, or
  null are sent as that JSON literal.
- `-f key=value` — always sends as raw string.

For any GraphQL variable declared `String!` (e.g. `owner`, `repo`,
`body`, `tid`, `after`), use **`-f`** at call sites. A reply body that
happens to be `"true"`, `"null"`, or all digits would otherwise be
coerced and the call fails with a type error. Keep `-F` only for
genuinely numeric or boolean variables (e.g. `pr: Int!`).

> Note: the shared `Invoke-Gh` wrapper may internally rewrite
> `-f field=<body>` into `-F field=@<tempfile>` when the body contains
> embedded `"` (Windows PowerShell 5.1 native-arg quoting bug — see
> below). Even via `@file`, `-F` still applies type inference to the
> file content (gh's documented behaviour) — this rewrite is safe
> only because the rewrite trigger ("body contains `"`") guarantees
> the content is a string that no JSON literal (`123`, `true`,
> `null`, etc.) would match. Treat this `-F ...=@file` usage as an
> internal transport detail of the wrapper, not as permission to
> use `-F ...=@file` for arbitrary strings at call sites.

```powershell
# Wrong — body could be coerced AND, under Windows PowerShell 5.1,
# any embedded `"` in $Body will be mis-split by the native-arg
# passer (gh sees a truncated body or a "received N args" error).
gh api graphql -f query=$q -F body=$Body

# Right — go through Invoke-Gh / Invoke-GhGraphQL. The shared helper
# auto-rewrites `-f field=<body>` and `-F field=<body>` pairs whose
# body contains `"` to `-F field=@<tempfile>` so the value is read
# from disk and never appears on the command line. This works
# identically on Windows PowerShell 5.1 and PowerShell 7+.
Invoke-GhGraphQL -GhArgs @('-f',"query=$q",'-f',"body=$Body") -Context 'reply body'
```

Calling `gh` directly (e.g. via `& gh ...` or raw `gh api graphql`)
bypasses the cross-version tempfile rewrite — if your value contains
`"` you'll re-introduce the PowerShell-5.1-only splitting bug. Always
funnel `gh` calls through `Invoke-Gh` / `Invoke-GhGraphQL`.

## Native `gh` exit codes bypass `$ErrorActionPreference`

`gh` is a native executable, not a PowerShell cmdlet, so a non-zero
exit does **not** throw even when `$ErrorActionPreference = 'Stop'`.
Without an explicit check the script will print misleading success
messages after a failed API call, and the loop will falsely declare
convergence on auth issues, rate limits, or transient 5xx.

Additional trap: `gh api graphql` can exit 0 for an HTTP 200 whose
JSON body carries a top-level `errors` array. Treat that as a failed
call too.

The shared helpers in [scripts/_lib.ps1](../scripts/_lib.ps1)
(`Invoke-Gh` and `Invoke-GhGraphQL`) run `gh` via `& gh @args`
with stderr redirected to a temp file (`2>$errFile`), then read
`$LASTEXITCODE` and return `{ExitCode, Stdout, Stderr}`.
`Invoke-GhGraphQL` additionally parses the GraphQL `errors` array
on the response body and throws on either failure mode. All
bundled scripts dot-source `_lib.ps1` and use these wrappers — do
the same in any new script.

## `git stash push` argument order

```bash
git stash push -m "local-build" -- src/path/a src/path/b   # correct
git stash push -- src/path/a src/path/b -m "local-build"   # SILENTLY drops -m
```

The `-m` MUST come before the `--` path separator.
