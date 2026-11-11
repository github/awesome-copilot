---
name: scout-issue
description: "Use when a developer wants to find the best GitHub issues to contribute to in a repository. Invoke with /scout-issue or ask to find good first issues, beginner-friendly issues, or open source work. Asks about experience level, technical skills, time, and contribution type, then searches GitHub issues, scores them, and presents ranked recommendations with match analysis."
---

# Issue Scout - /scout-issue Command

Run this four-phase pipeline when the user invokes `/scout-issue` or asks for
help finding issues to contribute to. This skill is read-only by default:
inspect issues and code, but never modify issues unless the user explicitly
asks.

## Bundled Resources

- `references/interview.md` — intake questions, prioritization, and the internal specification format
- `references/scoring-rubric.md` — scoring dimensions, adaptive weights, and confidence levels
- `references/workflow.md` — end-to-end workflow, decision points, and edge cases
- `references/tool-patterns.md` — GitHub CLI, REST, and git command patterns
- `references/investigation-templates.md` — deep-investigation and implementation-plan output templates
- `references/recovery.md` — cancellation, missing tools, rate limits, and fallbacks
- `references/quick-reference.md` — condensed command and output reference
- `examples/` — worked scenarios, including `copilot-run.md`, a run against real issues
- `scripts/validate-skill.sh` — local consistency check for this skill

Read the relevant reference when a phase needs more detail than this file provides.

## Command Detection

**Trigger:** The user invokes `/scout-issue`, or asks for help finding issues to
contribute to (for example, "find me a beginner-friendly issue I could finish
this weekend").

**Detection:** Parse user input for `/scout-issue` anywhere in the message, or
recognize a request to discover and rank contribution opportunities. If
detected, activate this pipeline instead of normal chat.

**Examples:**
- `/scout-issue`
- `/scout-issue rust`
- `/scout-issue beginner-friendly`
- `Find a beginner-friendly Rust issue I could finish this weekend`

**Note:** If the user types `/scout-issue` again during the process, restart
from Phase 1. If they type `/cancel`, abort the pipeline.

## Pipeline Flow

```
/scout-issue invoked
    ↓
Phase 1: User Interrogation
    ↓
Phase 2: Issue Detection
    ↓
Phase 3: Issue Analysis & Ranking
    ↓
Phase 4: Output Formatting
    ↓
Display to User
```

---

## Phase 1: User Interrogation

**Goal:** Build an internal specification: experience, languages, available
time, contribution type, difficulty, and special requirements.

Ask the six questions in `references/interview.md`, in a single message when the
client supports it. Skip any question the user already answered, and do not
re-ask after a clarification. If the user gives no special requirements, do not
filter on assignment or linked-PR status.

**Output:**
```
Experience: [level]
Languages: [list]
Scope: [time estimate]
Type: [contribution type]
Difficulty: [level]
Special: [requirements]
```

---

## Phase 2: Issue Detection

**Goal:** Find candidate issues with GitHub CLI/REST and git.

### Step 1: Inspect Repository

```bash
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh repo view --json name,primaryLanguage,languages
cat CONTRIBUTING.md 2>/dev/null || echo "No CONTRIBUTING.md"
git log --oneline -10
ls -la
```

### Step 2: List Candidate Issues

```bash
# Issue-only total. open_issues_count also counts open pull requests, so it
# overstates the search population.
gh api "search/issues?q=repo:$repo+is:issue+is:open&per_page=1" --jq '.total_count'

# Newest 100 open issues. gh issue list excludes pull requests.
gh issue list --state open --limit 100

# Page beyond 100 with REST. --paginate follows the API's pagination links
# before jq runs, so filtering pull requests cannot cut pagination short. The
# issues endpoint includes pull requests, so drop entries that have a
# pull_request field.
gh api "repos/$repo/issues?state=open&per_page=100" --paginate \
  --jq '.[] | select(.pull_request == null) | .number'

# Filter by label when the user named a language, type, or difficulty hint
gh issue list --state open --label "bug" --limit 50
gh issue list --state open --label "good first issue" --limit 50
```

> **Note:** `gh issue list` and `gh search issues` have no `--page` flag. Use the
> REST issues endpoint with `--paginate` to walk every page, and always filter
> out entries with a non-null `pull_request` field. `gh search issues --repo
> "$repo" --limit N` can raise the search ceiling without pagination; `--repo`
> is required to keep results repository-scoped.

### Step 3: Initial Filtering

Only apply filters that match the user's explicit preferences.

Remove issues that:
- Are assigned, **only** when special requirements include "No active PRs
  (unclaimed work only)".
- Are clearly outside the user's stated skill set.

Keep these for Phase 3 as weighted evidence, not automatic rejection:
- Issues with linked PRs (an **open** linked PR is competing work; closed or
  reverted PRs are evidence only).
- Inactive issues (no activity for 6+ months) unless there is evidence of
  obsolescence or the user set a recency constraint.

**Output:** Candidate issue numbers (typically 20-50).

---

## Phase 3: Issue Analysis & Ranking

> The `good first issue` label is a candidate-hunting hint only. Verify difficulty
> from the issue body, comments, and surrounding code before scoring.

**Goal:** Apply eligibility gates, score candidates, and rank them.

For each candidate:
```bash
gh issue view ISSUE_NUM
gh issue view ISSUE_NUM --comments
gh api "repos/$repo/issues/ISSUE_NUM/timeline" --paginate --jq '[.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number]'
rg "relevant_function" src/
find . -name "*test*" -type f | head -5
```

**Eligibility gates (all must pass before scoring):**
- The issue is open and still matches the user's hard constraints.
- When the user requested unclaimed work, the issue is unassigned and has no
  open linked PR.
- Evidence comes from the issue body, comments, code, and tests — never from the
  title alone.
- The proposed work is actionable: a location or subsystem can be identified, or
  the missing information is called out as a risk.

**Score each eligible issue 0-100 on:** User Fit, Technical Fit, Scope Fit,
Difficulty Fit, Issue Quality, Activity, Contribution Feasibility, and Evidence
Quality.

Use the default weights (User Fit 20%, Technical Fit 15%, Scope Fit 20%,
Difficulty Fit 15%, Issue Quality 10%, Activity 5%, Contribution Feasibility
10%, Evidence Quality 5%), or the adapted weights in
`references/scoring-rubric.md`. Rank by weighted score and keep the evidence
behind each score.

**Output:** Top 5-10 issues with scores and analysis.

---

## Phase 4: Output Formatting

**Goal:** Present a ranked shortlist that a developer can act on.

**Output contract:** Top 5 maximum. For each issue show the overall match score
out of 100, difficulty level, estimated scope, confidence level, a brief note on
verification gaps, short evidence bullets, and short concerns bullets. End with
a single "best match" recommendation. Use emojis for visual clarity.

Use the template in `references/quick-reference.md` ("Output Format"). Mention
the issue-only candidate pool size and any issues excluded for competing PRs,
assignments, or hard constraints.

**Rules:**
- Show top 5 issues maximum.
- Explain why each issue matches and note concerns.
- Separate evidence from inference; never claim an issue "will definitely be
  accepted" or is "guaranteed to work".
- Never skip eligibility or evidence checks for a quick-scan shortcut.

---

## Investigation Mode

**Trigger:** User says "Investigate #[NUMBER]"

**Action:** Produce the deep-investigation brief in
`references/investigation-templates.md`. Include the problem, why it matches,
relevant code and tests, related PRs/commits, implementation scope, potential
difficulties, maintainer expectations, effort estimate, first steps, and
confidence.

End with: `Want me to create an implementation plan? Say: "Plan this issue".`

---

## Implementation Planning

**Trigger:** User says "Plan this issue" or "How should I approach this?"

**Action:** Produce the implementation plan in
`references/investigation-templates.md`. Separate verified facts from likely
implementation and open questions, and include files to modify, testing
approach, potential challenges, time estimate, and confidence.

End with: `Ready to start? Say: "Start working on this".`

---

## Evidence Rules

- **Evidence:** what was observed — issue text, comment, code, test, timeline, or
  assignment.
- **Inference:** what you conclude — likely actionable, likely accepted.
- Use: likely, appears, suggests, uncertain, insufficient evidence.
- Never: "will definitely be accepted", "guaranteed to work".
- Record the source for every claim; call out gaps instead of filling them.

---

## Error Handling

- **Cancel:** on `/cancel`, stop immediately and return to normal chat.
- **Restart:** on `/scout-issue` again, discard progress and restart Phase 1.
- **Missing tools, auth failures, rate limits:** explain the limitation and use
  the fallbacks in `references/recovery.md`.
- **No issues found:** explain which constraints are binding and offer to relax
  them.

---

## Important Rules

1. Never rank by title match alone.
2. Never trust `good first issue` or `help-wanted` labels without checking the
   issue and surrounding code.
3. Never assume active from open status, or abandoned from age.
4. Always check for open linked PRs before recommending unclaimed work.
5. Always check code and tests when difficulty or feasibility matters.
6. Explain recommendations and rejections.
7. Separate evidence from inference; never invent facts.
8. Fewer, better recommendations beat many weak ones.
9. Read-only by default; never modify issues unless explicitly asked.
10. Handle cancellation and restart at any point.

---

## Portability

Works with any AI CLI that provides shell access, git, and optional GitHub CLI.
If `gh` is unavailable, use the git and web fallbacks in `references/recovery.md`
and state what could not be checked.
