# Contribution Law

How to read a project's contribution rules and behave correctly when they
constrain you.

## The checklist

Read `CONTRIBUTING.md` end to end, then README and `.github/`. Extract:

| Item | Why it matters | Example |
|---|---|---|
| Approval gates | External PRs may be closed without review unless pre-approved | `kimi-code`: "External PRs are accepted for approved bug fixes only. Open an issue first and wait for a maintainer to approve it with an `/approve` comment" |
| Commit format | CI may reject non-conforming titles | Conventional Commits enforced by `pr-title-checker` |
| Changesets | Behavior changes without a changeset fail review | `.changeset/*.md` with package name and bump type |
| Sign-offs | Every commit may need `Signed-off-by` (DCO) or a CLA | DCO bot blocks merge otherwise |
| Test commands | CI runs `lint`, `typecheck`, `test` — run them before pushing | Scoped: `pnpm --filter pkg test` |
| Issue linking | PRs may require `Fixes #N` or an approved linked issue | kimi-code links the approved issue |
| PR templates | Missing sections get review friction | `.github/PULL_REQUEST_TEMPLATE.md` |

## Acceptance reality check

Docs can lie. Verify by recent history (use the GitHub CLI):

```bash
gh pr list --repo OWNER/REPO --state merged --limit 20 --json author,title
gh pr list --repo OWNER/REPO --state closed --limit 20 --json author,title
```

If external authors (no write access) get merged promptly, the repo is
healthy. If external PRs sit for months or close unmerged, pick another
repository no matter what the docs promise.

## Hard gates: what to do

When the law says "wait for approval before opening a PR":

1. Do the full investigation and fix anyway — the work is not wasted.
2. Post your root-cause analysis on the issue: what happens, why (file and
   line references), the minimal fix, and the regression evidence. Keep it
   technical and short.
3. Tag or politely address the maintainers who handle triage.
4. Push the finished branch to your fork so reviewers can see the code
   exists and is tested.
5. Keep a ready-to-run PR draft (title + body) so the PR opens the moment
   approval lands.
6. If you built on another user's diagnosis, credit them by name.

If the gate never clears, the branch and analysis still have value: you can
reference them from other work, and the issue thread itself builds
recognition.

## Soft gates

Some repos don't gate PRs but do enforce mechanics mechanically. Treat CI
requirements (lint, commit format, changesets) as part of the definition of
done — a PR that fails its own CI wastes the first impression, which is the
only impression maintainers have of you.
