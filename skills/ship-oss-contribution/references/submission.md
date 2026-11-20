# Submission

Landing the PR without friction.

## Branch and fork hygiene

- Branch from the project's **default branch**, named per its conventions
  (Conventional-Commit-ish prefixes like `fix/` and `feat/` are safe
  defaults when nothing is specified).
- Push to a fork under your account. Never push to upstream. One branch per
  contribution; never stack unrelated changes.

## Commits

Follow the project's format exactly. Where Conventional Commits are
enforced:

```
fix(scope): terminate stdio MCP server when transport finishes after the server severs stdout
```

- Scope: the package or module the change lands in.
- Subject: the behavior change, not the emotion ("terminate server" not
  "fix leak").
- Add a changeset/changelog entry when the project requires one for
  behavior changes; copy the format of an existing entry.

## The PR body must carry receipts

Structure the body so a maintainer can approve it without re-doing your
investigation:

1. **Fixes #N** (or the linking syntax the project expects) in the first
   line, so the issue auto-closes on merge.
2. **Problem** — the root cause with file and line references.
3. **Fix** — what changed and why it is minimal.
4. **Test** — the red→green story: the regression test name, what fails on
   main and why, and what passes with the fix. Include full-suite results
   and any pre-existing failures you verified and dismissed.
5. **Credit** — any prior diagnoses or related issues you built on.

## Gated repos

If Phase 1 found an approval gate, do not open the PR yet. Post the
analysis on the issue, request approval explicitly, and hold the PR draft:

```bash
gh pr create --title "..." --body-file pr-draft.md   # only after /approve
```

The draft should exist before the gate clears so approval converts to a PR
in one command.

## Post-PR care

- Watch CI (`gh pr checks`); fix failures on the same branch with
  follow-up commits. Do not force-push while a review is in progress —
  it invalidates review comments.
- Respond to every review comment, even one-liners like "nit:".
- If the project requires sign-off, add it (`--signoff` or trailer) before
  the bot complains.
- If the PR sits with no review after the project's normal turnaround,
  one polite follow-up comment is acceptable; repeated pings are not.

## Rejection etiquette

If a maintainer closes or declines: thank them, ask one clarifying
question if the reason is unclear, and move to the next issue. The
relationship is worth more than any single PR.
