---
name: pr-address-feedback
description: 'Walk through PR review comments one-by-one, deciding for each whether to act on the feedback or reply with reasoning, and build an approvable resolution plan before changing anything. Use when the user wants to address, respond to, or triage PR review feedback.'
argument-hint: "[PR number or URL] (defaults to current branch's PR)"
user-invocable: true
---

Let's look at each review comment on this pull request one-by-one and make a plan to either take action on the feedback or reply with reasoning.

PR target: use the PR number/URL I passed with this command, if any; otherwise the PR for the current branch.

You are in **plan mode**. Until I approve the final plan, do NOT edit files, commit, push, resolve threads, or post anything to GitHub. Read-only commands (`gh`, `git log/diff/show`, viewing files) are fine.

The PR may live on github.com or on another GitHub host (e.g. GitHub Enterprise Server). Take the host from the PR's `url` and pass `--hostname <host>` to every `gh api` call (or `export GH_HOST=<host>` once). `gh api` defaults to github.com even inside an Enterprise Server checkout.

## 1. Gather the feedback

- Resolve the PR: use the target above if provided (number, URL, or `owner/repo#N`); otherwise use the PR for the current branch (`gh pr view --json number,url,headRefName,headRefOid,baseRefName,headRepository,headRepositoryOwner`). If none is found, ask me.
- Fetch **all** review threads with GraphQL (paginate), including for each thread: `id`, `isResolved`, `isOutdated`, `path`, `line`, `startLine`, `originalLine`, `diffSide`, and every comment's `databaseId`, `url`, `author.login`, `body`, `diffHunk`, `createdAt`.
- Also fetch top-level review bodies (`reviews` with non-empty `body`) and general PR conversation comments, since those can contain feedback too.
- Skip resolved threads and threads where I (the PR author) had the last word unless they still look unaddressed. Mention outdated threads but check whether the feedback still applies to current code.
- `git fetch <base remote> refs/pull/<n>/head` first and check that the fetched SHA matches the PR's `headRefOid`. Read code from that SHA (`<headSha>` below), not from `origin/<headRef>`, which may not exist for PRs from forks. If my local branch is behind it, say so.
- **Order the items so the review reads coherently**, not just by position in the diff:
  - Before ordering, read every item and spot dependencies and patterns. Some comments point back to others ("same as above", "ditto", "as I mentioned on `foo.go`", "same issue here"). Others repeat the same kind of feedback (e.g. the same naming nit or missing error check in several places).
  - Put the comment that sets up a pattern first: the one that explains it fully, usually the earliest-written. Then put every comment that refers back to it or repeats it right after it, so you only have to understand the pattern once.
  - Order the rest by file and line so related feedback stays together. Break ties by comment `createdAt`.
- In a visible message (not just thinking), tell me up front how many items there are. Give a one-line index in the order you'll present them (`N. @reviewer path:line — gist`). Mark follow-ons, e.g. `(same pattern as #2)`. Note any skipped or already-addressed threads. Then go through them **one at a time** in that order.

## 2. Present each item (one per turn)

> **CRITICAL — the item must be visible before you ask.** I cannot see your thinking/reasoning, tool output, or SQL rows. The only things I see are your **assistant message text** and the short `ask_user` prompt. So for every item you MUST write the full item block below as normal assistant message text **in the same response, immediately before** the `ask_user` call. Never call `ask_user` for an item until that block has been written out. Summarizing the item only in your thinking does not count.
>
> This block is **exempt from any general brevity / word-limit guidance** — completeness here matters more than being short. Do not paraphrase the comment or skip the diff to save space.

Write each item using exactly this template (fill every section; write "n/a" rather than dropping one):

````markdown
---
### Item N of M — @reviewer · [`path:line`](COMMENT_URL)
Thread: [open on GitHub](COMMENT_URL) · status: open | outdated

**Feedback**
> full text of the first comment, verbatim (keep its code blocks / suggestions)
>
> **@replier:** full text of each reply, in order

**Diff context** (from the review's `diffHunk`, trimmed to ~10 lines around the commented line)
```diff
...
```

**Current code** — `path` Lstart–Lend (always include; this is what I'm deciding against)
```go
214 | ...
```

**Evidence / related context**
- `other/file.go:123` — why it matters (with a short snippet if it helps)
- Related comment: [@who on path:line](url) — how it interacts with this one

**Assessment**: is the reviewer right? What's the trade-off?

**Recommendation**: **Act** — exact files + short sketch of the change · or · **Reply** — draft reply in my voice, short and friendly:
> draft reply text
````

Rules for the block:

- `COMMENT_URL` is the comment's `url` field (e.g. `https://github.com/o/r/pull/123#discussion_r456`; the host may differ, e.g. on GitHub Enterprise Server). Never omit it.
- Quote the feedback **verbatim** from the fetched `body`, not from memory. For top-level review / conversation feedback, use that comment's URL and replace "Diff context" with "n/a (not a line comment)", but still show the relevant current code.
- Get current code with line numbers from the PR head (e.g. `git show <headSha>:path | sed -n 'A,Bp' | nl -ba -v A` or `gh api repos/<headOwner>/<headRepo>/contents/path?ref=<headSha> -H 'Accept: application/vnd.github.raw'`) — don't rely on a local branch that may be stale. Use the file's language for the code fence.
- Every claim in Assessment should be backed by something in "Evidence" (a `path:line` + snippet, a commit, a doc link, a related comment). If you investigated something while thinking, put the finding there so I can see it.

Then call `ask_user` to get my decision:

- Make the question self-contained enough to identify the comment even if I only see the prompt: `Item N of M — @reviewer on path:line: "<first ~15 words of the comment>…" How should I handle it?`
- Offer choices like: `Act as proposed (Recommended)`, `Reply with reasoning`, `Act differently`, `Skip / defer`. Put your recommendation first.
- For an item that follows an earlier pattern, say which earlier item it refers to and what I decided there, in both the item block (under Evidence) and the prompt. Offer `Same as item K (Recommended)` as the first choice when that decision clearly applies.
- If I pick a freeform option, work it through with me before moving on.
- If I ask to see an item again, re-print its full block (re-fetch if needed) rather than summarizing.

Keep a running record of each item and decision (for example in the session SQL database: comment id, url, path, line, decision, planned change, reply text) so nothing gets lost and items can be re-rendered.

## 3. Build the resolution plan

When every item is decided, write a single plan that lists, for each item: the comment link, the decision, the code change (if acting), the **exact reply text** to post (if replying, or to confirm an action), and whether the thread will be **resolved** (see defaults in §4). End the plan with the list of reviewers whose review will be **re-requested**. Then call `exit_plan_mode` so I can review and approve it.

## 4. Rules for carrying out the approved plan

- Before any edits, make sure the working tree is a clean checkout of the PR head: `gh pr checkout <n>` (which also sets the push destination for PRs from forks), then check that `HEAD` matches the verified `<headSha>`. If it doesn't, or the tree is dirty, stop and ask me.
- Make the code changes as small, focused commits. Where it makes sense, use one commit per feedback item so replies can point to a specific commit.
- **Push before you reply.** Any reply that mentions a commit SHA must only be posted after that commit is on GitHub. Otherwise the SHA won't render as a link. In order:
  1. Commit, then `git push`.
  2. Re-read the PR's `headRefOid` (`gh pr view <n> --json headRefOid`) and confirm each referenced commit is reachable from it: `git fetch <base remote> refs/pull/<n>/head`, then `git merge-base --is-ancestor <sha> FETCH_HEAD`. If it isn't, stop and fix that before posting.
  3. Only then post the replies. Use the full 40-character SHA (or a `https://{host}/{owner}/{repo}/pull/{n}/commits/{sha}` link, using the PR's host) so GitHub links it.
- Reply **inside the existing thread** (`gh api repos/{owner}/{repo}/pulls/{n}/comments/{comment_id}/replies -f body=...`), not as a new top-level comment. For top-level review or conversation feedback, post one PR comment that quotes what it's answering.
- Post the reply text I approved. Changing only the SHAs is fine.
- **Resolve only threads the plan marks for resolution**, and only after their reply is posted. Defaults (I can override per item in the plan):
  - **Act** items: resolve.
  - **Reply with reasoning** items: leave open so the reviewer can respond.
  - **Skip / defer** items: leave open, don't reply.
  - Top-level review / conversation feedback has no thread to resolve; skip.
  - For threads marked for resolution, prefer the `reply_and_resolve_review_thread` tool when available (only some Copilot surfaces provide it; pass the thread `id` + root comment `databaseId`), which replies and resolves in one step. Otherwise post the reply with `gh api` as above, then resolve via GraphQL: `gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id=<thread id>`.
  - For threads staying open, use a reply-only call (`reply_to_review_thread` if available, otherwise the `gh api …/replies` call above). Never use the reply-and-resolve tool for them.
- **Re-request review last.** After all commits are pushed, replies posted, and threads resolved, re-request review from every human reviewer whose feedback was addressed in this pass (excluding me and bot accounts): `gh api -X POST repos/{owner}/{repo}/pulls/{n}/requested_reviewers -f 'reviewers[]=<login>'` (repeat `reviewers[]` for each). Skip anyone who already has a pending review request. If a call fails, report it rather than retrying blindly.
- At the end, give me a short summary with links to each reply you posted, each commit you pushed, which threads were resolved, and who was re-requested.
