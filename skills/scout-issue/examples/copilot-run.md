# Copilot Run: Real Issues in `cli/cli`

Captured on 2026-11-06 against `github/cli` (`cli/cli`). This is a condensed
run, not a synthetic scenario. The user was an intermediate Go contributor
looking for a bug fix they could finish in a weekend and explicitly requested
unclaimed work only (no open competing PR).

## Candidate Pool

- Issue-only search count: **1,057 open issues**. The repository
  `open_issues_count` was not used because it also counts open pull requests.
- Read the newest 100 open issues with `gh issue list --state open --limit 100`.
- Added repository-scoped label and text searches for `bug`, `gh-issue`,
  `gh-auth`, and `gh-pr` so older issues were not excluded by recency.
- Those passes left seven candidates: #14621, #14647, #14386, #14844, #14754,
  #14856, and #14550.

## Evidence and Eligibility Screen

| Issue | Evidence from the issue | Open linked PR? | Result |
|---|---|---|---|
| #14647 | Help text promises local files survive `gh skill update`; reproduction and affected version given | Yes — #14689 | **Excluded** for unclaimed work |
| #14844 | Detailed sandbox token-refresh failure; clear steps and impact | Yes — #14845 | **Excluded** for unclaimed work |
| #14621 | Skill description lacks task triggers; concrete gap list | Yes — #14629 | **Excluded** for unclaimed work |
| #14856 | Exact failing command, code path, affected versions, and expected behavior | No — attempts #14860 and #14914 are closed | Eligible |
| #14550 | Clear data-loss repro; points at `pkg/cmd/pr/close/close.go` | No — attempts #14556 and #14763 are closed | Eligible |
| #14754 | Clear scope-mismatch report with token and version details | No — attempt #14857 is closed | Eligible |
| #14386 | Priority-2 behavior regression with nine comments | No — attempt #14448 is closed | Eligible |

None of the seven issues was assigned. Competing PRs were checked from the
issue timeline, not from title matches:

```bash
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh api "repos/$repo/issues/14647/timeline" --paginate --jq '[.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number]'
```

`#14647` was excluded even though it was otherwise a strong documentation fit:
open PR #14689 already claimed the fix. The same rule removed #14844 and #14621.
Closed attempts were treated as evidence (the work was tried before), not as
competing work.

## Ranking

Scores use the default weights from `references/scoring-rubric.md`.

| Rank | Issue | User | Tech | Scope | Diff. | Quality | Activity | Feasibility | Evidence | Overall |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | #14856 | 85 | 90 | 85 | 80 | 90 | 70 | 80 | 85 | **84** |
| 2 | #14754 | 80 | 85 | 85 | 75 | 80 | 55 | 70 | 70 | **78** |
| 3 | #14550 | 80 | 85 | 70 | 65 | 85 | 75 | 65 | 75 | **75** |
| 4 | #14386 | 70 | 80 | 55 | 50 | 75 | 80 | 50 | 70 | **65** |

### Final shortlist

1. **#14856 — 84/100 — best match.** The issue names the failing code path,
   gives reproducible steps, and has a small, testable fix. Concern: two closed
   attempts show the area has tripped people up; check the linked history first.
   Confidence: **High**. Verification gaps: none; open-PR state, assignment, and
   code/test paths were all rechecked.
2. **#14754 — 78/100.** Small auth validation fix with clear expected behavior.
   Concern: lower activity and an earlier closed attempt.
   Confidence: **Medium**. Verification gaps: maintainer appetite for the fix was
   not confirmed.
3. **#14550 — 75/100.** High-quality report with a serious data-loss impact and
   an identified file. Concern: the fix touches branch cleanup and needs
   careful regression tests.
   Confidence: **Medium**. Verification gaps: branch-cleanup regression risk was
   not exercised locally.

## How the Final Ranking Was Checked

- Re-ran the open-linked-PR timeline for each finalist immediately before
  output; #14856, #14754, and #14550 had no open linked PR.
- Re-checked assignees and confirmed all four were unassigned.
- Confirmed via the repository contents API that the cited code paths and their
  test files exist (`develop.go`, `close.go`, `login.go`, `create.go`).
- Used comments and update dates as activity evidence; no issue was discarded
  for age alone.
- Recomputed the weighted total with the default weights and sanity-checked the
  order: #14856 stayed first because its scope, issue quality, and evidence were
  all strongest.
