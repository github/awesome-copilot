---
name: shepherd-task-30-from-assignment-to-ready
description: "Stage 30 of the shepherd-task campaign lifecycle (each issue from assignment through the boundary immediately before Ready for review). Use this skill to shepherd a child Task issue from 'assigned to Copilot' through CI approval and review-agent feedback resolution, stopping just before marking the PR as **Ready for review**."
---

# Skill: Shepherd Task to Ready for Review (shepherd-task stage 30 — assignment through the boundary before Ready for review)

## Purpose

This is stage 30 of the ordered shepherd-task campaign lifecycle (10 → 20 → 30 → 40 → 50): each issue from assignment through the boundary immediately before Ready for review. Automate the lifecycle of a child **Task** issue from "assigned to Copilot" through CI passing and review-agent feedback resolution, stopping just before marking the PR as **Ready for review**.

The existence of a draft PR is only evidence that CCA accepted the assignment. CCA commonly opens a draft PR with an empty `Initial plan` commit before it starts implementation. Never treat PR creation, an `Initial plan` commit, passing selector checks, or an absence of review comments as evidence that the task is complete.

## Inputs

- `TASK_ISSUE`: The issue number (e.g., `1850`) or URL of the child task to shepherd.
- `BASE_BRANCH`: The base branch the task PR should target (default: `upstream/edburns/1810-java-tool-ergonomics-tool-as-lambda`).
- `REPO`: Repository in `OWNER/REPO` format (default: `github/copilot-sdk`).

## Prerequisites

- `gh` CLI authenticated with sufficient permissions (issues, PRs, actions, reviews).
- The task issue already exists and has a clear description of work to do.
- The base branch exists in the repository.

---

## ⚠️ CRITICAL: Never go idle while waiting

The `copilot --yolo` runtime **terminates the session shortly after the agent goes idle** (i.e., when there are no pending tool calls). If you launch a long-running polling command with a short `initial_wait` and then say "I'll check back when it completes," the runtime will kill the session before the command finishes.

**Rules for all polling and waiting steps:**

1. ✅✅✅ **ALWAYS use `initial_wait` ≥ 600 seconds** (10 minutes) on any polling/waiting command. This keeps the agent blocked on the tool call rather than going idle. ✅✅✅
2. ❌❌❌ **NEVER background a polling command and then end your turn with no tool calls.** If a command exceeds `initial_wait`, immediately issue another tool call (e.g., `read_powershell`) to stay active. ❌❌❌
3. ❌❌❌ **NEVER say "I'll check back when it completes" or "Waiting for notification."** These phrases mean you are going idle, which KILLS THE SESSION. ❌❌❌
4. ✅✅✅ **ALWAYS prefer a single blocking poll** over launching a background command and waiting for a notification. ✅✅✅

---

## Non-negotiable readiness invariant

This skill must fail closed. It may emit `SHEPHERD COMPLETE` only when all of the following are true for the same PR HEAD SHA:

1. The PR is linked to `TASK_ISSUE`, is open, is still a draft, and targets `BASE_BRANCH`.
2. CCA has recorded a `copilot_work_started` event followed by a `copilot_work_finished` event. The latest finish is not older than the latest start.
3. The PR has a nonempty effective diff: `changed_files > 0`, the PR files API returns at least one file, and the base and head Git tree SHAs differ. An empty commit is not work.
4. Every deliverable and acceptance criterion in the issue body has been checked against concrete evidence from the PR diff, repository state, or command output. No criterion is assumed satisfied merely because CI is green.
5. Every executable gating command required by the issue has passed against the current PR HEAD. If a required command cannot be run, stop for manual intervention.
6. All required and relevant CI checks for the current PR HEAD are complete and successful. Selector/aggregator checks alone are not meaningful CI.
7. There are no unresolved review threads, change requests, or actionable bot comments.
8. The HEAD SHA has not changed while gates 3–7 were evaluated. If it changes, restart validation from gate 2.

Do not weaken or skip an invariant because the task appears small, because CCA has produced good work in prior runs, or because a timeout would otherwise expire. A timeout is a failure requiring intervention, never permission to proceed.

---

## Procedure

### Step 1: Assign the task to @Copilot

Use the GitHub Issues REST API with the `agent_assignment.base_branch` parameter. This is the **only 100% reliable method** — it passes `BASE_BRANCH` directly to CCA as a first-class input, so it cannot default to `main`.

> [!NOTE]
> Do **not** use `gh issue edit --add-assignee "@copilot"` here. That command uses the plain assignees endpoint which has no `base_branch` parameter; CCA will default to `main`.

```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/$REPO/issues/$TASK_ISSUE/assignees \
  --input - <<< "{
    \"assignees\": [\"copilot-swe-agent[bot]\"],
    \"agent_assignment\": {
      \"target_repo\": \"$REPO\",
      \"base_branch\": \"$BASE_BRANCH\"
    }
  }"
```

> **PowerShell equivalent** (when running on Windows):
> ```powershell
> $body = @{
>     assignees        = @("copilot-swe-agent[bot]")
>     agent_assignment = @{
>         target_repo = $REPO
>         base_branch = $BASE_BRANCH
>     }
> } | ConvertTo-Json -Depth 3
> gh api `
>   --method POST `
>   -H "Accept: application/vnd.github+json" `
>   -H "X-GitHub-Api-Version: 2022-11-28" `
>   /repos/$REPO/issues/$TASK_ISSUE/assignees `
>   --input - <<< $body
> ```

This triggers Copilot to begin an asynchronous lifecycle:
1. Create a topic branch from `$BASE_BRANCH`.
2. Open a draft PR targeting `$BASE_BRANCH`.
3. Push an empty `Initial plan` commit in some runs.
4. Record `copilot_work_started`, implement the issue, push substantive commits, and record `copilot_work_finished`.

Steps 1–3 are startup signals, not completion signals.

### Step 2: Find the corresponding PR

Use **all three** of the following strategies (in order) each polling iteration. Copilot often creates PRs whose title or branch name does NOT contain the issue number — it may use a descriptive name instead. Therefore, relying on title/branch regex alone is insufficient.

#### Strategy A: Query the issue timeline for linked PRs

The GitHub timeline API shows PRs linked via "Fixes #N" or the UI link feature. This is the most reliable signal.

```bash
# Query issue timeline for cross-referenced or connected PRs
PR_NUMBER=$(gh api "/repos/$REPO/issues/$TASK_ISSUE/timeline" \
  --jq '.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number' | head -1)
```

#### Strategy B: Search PR bodies for "Fixes #N" or "#N"

Copilot PRs typically include "Fixes #1876" in the body even when the title is descriptive.

```bash
# Search open PR bodies for the issue number
PR_NUMBER=$(gh pr list -R $REPO --state open --json number,body \
  --jq ".[] | select(.body | test(\"#$TASK_ISSUE\")) | .number" | head -1)
```

#### Strategy C: Match title or branch name (original approach)

```bash
PR_NUMBER=$(gh pr list -R $REPO --state open --json number,title,headRefName \
  --jq ".[] | select((.title | test(\"$TASK_ISSUE\"; \"i\")) or (.headRefName | test(\"$TASK_ISSUE\"))) | .number" | head -1)
```

#### Polling loop

Try all three strategies each iteration. Poll every 30 seconds for up to 15 minutes (Copilot coding agent can take 5-12 minutes to produce a PR).

```bash
TIMEOUT=900
INTERVAL=30
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Strategy A: issue timeline
  PR_NUMBER=$(gh api "/repos/$REPO/issues/$TASK_ISSUE/timeline" \
    --jq '.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number' 2>/dev/null | head -1)

  # Strategy B: PR body search
  if [ -z "$PR_NUMBER" ]; then
    PR_NUMBER=$(gh pr list -R $REPO --state open --json number,body \
      --jq ".[] | select(.body | test(\"#$TASK_ISSUE\")) | .number" | head -1)
  fi

  # Strategy C: title/branch match
  if [ -z "$PR_NUMBER" ]; then
    PR_NUMBER=$(gh pr list -R $REPO --state open --json number,title,headRefName \
      --jq ".[] | select((.title | test(\"$TASK_ISSUE\"; \"i\")) or (.headRefName | test(\"$TASK_ISSUE\"))) | .number" | head -1)
  fi

  if [ -n "$PR_NUMBER" ]; then
    break
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done
```

If no PR is found after timeout, report failure and stop. Finding the PR does **not** mean CCA has finished.

Once the PR is found, verify the base branch as a sanity check (the `agent_assignment.base_branch` API call in Step 1 guarantees this, but confirm):

```bash
# Sanity-check: confirm PR targets the correct base branch
ACTUAL_BASE=$(gh pr view $PR_NUMBER -R $REPO --json baseRefName --jq '.baseRefName')
if [ "$ACTUAL_BASE" != "$BASE_BRANCH" ]; then
  echo "ERROR: PR #$PR_NUMBER targets '$ACTUAL_BASE' instead of '$BASE_BRANCH'."
  echo "This should not happen when Step 1 used the agent_assignment.base_branch API."
  echo "Manual intervention required — stop here."
  exit 1
fi
echo "Base branch confirmed: $ACTUAL_BASE"
```

Verify that the PR has an authoritative closing reference to the exact task issue. A title, branch-name, or free-text match was sufficient for discovery but is not sufficient for the readiness invariant:

```bash
OWNER=${REPO%%/*}
NAME=${REPO#*/}
LINKED_TASK=$(gh api graphql \
  -f query='query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){closingIssuesReferences(first:100){nodes{number}}}}}' \
  -F owner="$OWNER" -F name="$NAME" -F number="$PR_NUMBER" \
  --jq ".data.repository.pullRequest.closingIssuesReferences.nodes[] | select(.number == $TASK_ISSUE) | .number")

if [ "$LINKED_TASK" != "$TASK_ISSUE" ]; then
  echo "ERROR: PR #$PR_NUMBER does not close task issue #$TASK_ISSUE."
  exit 2
fi
```

### Step 3: Wait for CCA implementation completion

Poll the PR timeline, not merely the PR commits or workflow list. CCA may create the PR and its empty `Initial plan` commit before `copilot_work_started`. Wait up to two hours for a completed CCA work cycle while continuously enforcing that the PR remains open and draft.

```bash
TIMEOUT=7200
INTERVAL=30
ELAPSED=0

while [ "$ELAPSED" -lt "$TIMEOUT" ]; do
  PR_STATE=$(gh pr view "$PR_NUMBER" -R "$REPO" --json state --jq '.state')
  IS_DRAFT=$(gh pr view "$PR_NUMBER" -R "$REPO" --json isDraft --jq '.isDraft')
  if [ "$PR_STATE" != "OPEN" ] || [ "$IS_DRAFT" != "true" ]; then
    echo "ERROR: PR #$PR_NUMBER was closed, merged, or marked ready before CCA completion was verified."
    exit 4
  fi

  TIMELINE=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
    -H "Accept: application/vnd.github+json")
  LATEST_START=$(printf '%s' "$TIMELINE" | jq -r \
    '[.[] | select(.event == "copilot_work_started") | .created_at] | max // empty')
  LATEST_FINISH=$(printf '%s' "$TIMELINE" | jq -r \
    '[.[] | select(.event == "copilot_work_finished") | .created_at] | max // empty')

  if [ -n "$LATEST_START" ] && [ -n "$LATEST_FINISH" ] \
      && [[ "$LATEST_FINISH" > "$LATEST_START" || "$LATEST_FINISH" == "$LATEST_START" ]]; then
    break
  fi

  # Handle copilot_work_finished_failure (CCA timed out or hit an internal error)
  LATEST_FAILURE=$(printf '%s' "$TIMELINE" | jq -r \
    '[.[] | select(.event == "copilot_work_finished_failure") | .created_at] | max // empty')

  if [ -n "$LATEST_START" ] && [ -n "$LATEST_FAILURE" ] \
      && [[ "$LATEST_FAILURE" > "$LATEST_START" || "$LATEST_FAILURE" == "$LATEST_START" ]]; then
    # CCA failed after its latest start — check if it still produced substantive work
    CHANGED_FILES=$(gh api "/repos/$REPO/pulls/$PR_NUMBER" --jq '.changed_files')
    if [ "$CHANGED_FILES" -gt 0 ]; then
      echo "WARNING: CCA reported failure (copilot_work_finished_failure at $LATEST_FAILURE) but PR has $CHANGED_FILES changed files."
      echo "Proceeding with validation — gates will determine if the work is sufficient."
      LATEST_FINISH="$LATEST_FAILURE"
      break
    else
      echo "WARNING: CCA failed (copilot_work_finished_failure at $LATEST_FAILURE) with no substantive changes. Re-assigning."
      gh api --method POST \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "/repos/$REPO/issues/$TASK_ISSUE/assignees" \
        --input - <<< "{
          \"assignees\": [\"copilot-swe-agent[bot]\"],
          \"agent_assignment\": {
            \"target_repo\": \"$REPO\",
            \"base_branch\": \"$BASE_BRANCH\"
          }
        }" > /dev/null
    fi
  fi

  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ -z "${LATEST_START:-}" ] || [ -z "${LATEST_FINISH:-}" ] \
    || [[ "$LATEST_FINISH" < "$LATEST_START" ]]; then
  echo "ERROR: CCA did not complete its latest work cycle on PR #$PR_NUMBER within ${TIMEOUT}s."
  exit 5
fi
```

Immediately prove that CCA produced an effective change. All three checks are required so an empty commit, stale comparison, or API anomaly cannot pass:

```bash
PR_JSON=$(gh api "/repos/$REPO/pulls/$PR_NUMBER")
CHANGED_FILES=$(printf '%s' "$PR_JSON" | jq -r '.changed_files')
BASE_SHA=$(printf '%s' "$PR_JSON" | jq -r '.base.sha')
HEAD_SHA=$(printf '%s' "$PR_JSON" | jq -r '.head.sha')
PR_FILE_COUNT=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/files?per_page=100" --paginate --jq '.[].filename' | wc -l)
BASE_TREE=$(gh api "/repos/$REPO/git/commits/$BASE_SHA" --jq '.tree.sha')
HEAD_TREE=$(gh api "/repos/$REPO/git/commits/$HEAD_SHA" --jq '.tree.sha')

if [ "$CHANGED_FILES" -le 0 ] || [ "$PR_FILE_COUNT" -le 0 ] || [ "$BASE_TREE" = "$HEAD_TREE" ]; then
  echo "ERROR: PR #$PR_NUMBER has no effective file changes after CCA reported completion."
  echo "An empty or Initial-plan-only PR must never advance to Ready for review."
  exit 6
fi
```

Record `HEAD_SHA` as the validation candidate. Every later gate must apply to this SHA.

### Step 4: Verify issue deliverables before CI

Read the complete issue body and inspect the complete PR file list and patches:

```bash
ISSUE_JSON=$(gh api "/repos/$REPO/issues/$TASK_ISSUE")
ISSUE_BODY=$(printf '%s' "$ISSUE_JSON" | jq -r '.body // ""')
gh api "/repos/$REPO/pulls/$PR_NUMBER/files?per_page=100" --paginate \
  --jq '.[] | {filename, status, additions, deletions, patch}'
```

Build an evidence table in the session output with one row for every issue deliverable and acceptance criterion:

| Issue requirement | Evidence | Status |
|---|---|---|
| Exact requirement text | Changed path, relevant diff, or command and result | PASS/FAIL |

Rules:

- Use the issue body as the source of truth; do not substitute the PR title or CCA summary.
- Verify required created, modified, moved, or deleted paths against the PR files API.
- Verify behavioral requirements with code inspection and executable checks.
- Mark a requirement `PASS` only with concrete evidence. Missing, ambiguous, contradictory, or untestable evidence is `FAIL`.
- If any row is `FAIL`, request changes from CCA using Step 7. Do not proceed to readiness.

### Steps 5–6: Approve pending workflow runs and wait for completion

Invoke the **`shepherd-task-approve-workflows-and-wait-for-completion`** skill (`skills/shepherd-task-approve-workflows-and-wait-for-completion/SKILL.md`) with:

- `REPO` = `$REPO`
- `JTBDTASK_BRANCH` = the PR's topic branch
- `PR_NUMBER` = `$PR_NUMBER`

This sub-skill approves all `action_required` runs and waits for completion. The checks must belong to `HEAD_SHA`. A workflow run triggered only by the placeholder commit is stale and cannot satisfy this gate.

### Step 6.1: Evaluate workflow results and relevance

**Note:** Ignore failures from the "Block remove-before-merge paths" / "No remove-before-merge directories" workflow. This failure is expected on feature branches and is not a real problem.

```bash
# Get check results, excluding the expected "Block remove-before-merge paths" failure
RESULTS=$(gh pr checks $PR_NUMBER -R $REPO --json name,state,bucket \
  --jq '.[] | select(.bucket == "fail") | select(.name != "No remove-before-merge directories")')
```

If there are real failures (after excluding the expected one), proceed to Step 7. If all pass, proceed to Step 8.

Also inspect the workflow/check runs for `HEAD_SHA`. Passing required selector or aggregator jobs while every substantive job is skipped is not evidence that the implementation passed CI. Determine which language or component workflows are relevant from the changed paths and issue body, and require at least one substantive relevant check to complete successfully. If repository workflow selection unexpectedly skips the changed component, mark the CI gate `FAIL` and stop for manual intervention.

Query check runs by commit SHA, not only through the mutable PR view:

```bash
CHECK_RUNS=$(gh api "/repos/$REPO/commits/$HEAD_SHA/check-runs?per_page=100" --paginate --slurp)
PENDING_CHECKS=$(printf '%s' "$CHECK_RUNS" | jq \
  '[.[].check_runs[] | select(.status != "completed")] | length')
FAILING_CHECKS=$(printf '%s' "$CHECK_RUNS" | jq \
  '[.[].check_runs[] | select(.status == "completed") | select(.conclusion != "success" and .conclusion != "skipped" and .conclusion != "neutral")] | length')

if [ "$PENDING_CHECKS" -ne 0 ] || [ "$FAILING_CHECKS" -ne 0 ]; then
  echo "ERROR: Checks for HEAD $HEAD_SHA are pending or failing."
  exit 7
fi
```

Evaluate relevant skipped checks separately as described above; the allowed `skipped` conclusion in this mechanical query does not make skipped substantive CI acceptable.

### Step 6.2: Run issue-specified gating commands

Check out the exact `HEAD_SHA` in an isolated worktree or otherwise ensure commands execute against that SHA. Run every executable gating command named in the issue body, including formatting, unit, integration, build, generated-file, and compatibility checks. Preserve each command and exit code in the session output.

Do not replace issue-specified commands with narrower checks. If a command requires unavailable infrastructure, credentials, or a platform not present in the environment, report the unmet gate and stop for manual intervention. Do not infer a pass from CCA's PR description.

### Step 7: Request changes from Copilot (iteration loop)

**Max iterations: 20**

When CI fails or review agents flag problems:

#### 7.1: Gather failure details

```bash
# Get failed run IDs
FAILED_RUNS=$(gh run list -R $REPO --branch "$JTBDTASK_BRANCH" \
  --status completed --json databaseId,conclusion,name \
  --jq '.[] | select(.conclusion == "failure") | .databaseId')

# Get logs for failed runs (only failed steps)
for RUN_ID in $FAILED_RUNS; do
  gh run view $RUN_ID -R $REPO --log-failed
done
```

#### 7.2: Gather review agent comments

```bash
# Get review comments on the PR
gh api "/repos/$REPO/pulls/$PR_NUMBER/comments" \
  --jq '.[] | select(.user.type == "Bot") | {user: .user.login, body: .body}'

# Also get issue-level comments (review agents sometimes post there)
gh pr view $PR_NUMBER -R $REPO --comments --json comments \
  --jq '.comments[] | select(.author.login | test("bot|copilot|agent"; "i")) | {author: .author.login, body: .body}'
```

#### 7.3: Compose and submit a "Request changes" review

Analyze the failures and compose a hybrid message: relevant log excerpts plus a short targeted instruction for Copilot.

```bash
# Submit review requesting changes, @mentioning Copilot
gh pr review $PR_NUMBER -R $REPO --request-changes --body "$REVIEW_BODY"
```

The `$REVIEW_BODY` should follow this format:

```
@copilot Please fix the following issues:

## CI Failure: [workflow name]

<relevant log excerpt, trimmed to the essential error>

**Fix:** [Short, specific instruction on what to change]

## Review Comment from [bot name]

> [quoted comment]

**Fix:** [Short, specific instruction on what to change]
```

#### 7.4: Wait for Copilot to push fixes (with re-engagement)

After submitting the review, CCA may or may not re-engage automatically. Once CCA has emitted `copilot_work_finished`, a review comment alone may not restart it. This step uses a two-phase approach: first wait briefly for organic re-engagement, then explicitly re-assign CCA if needed.

```bash
# Record the review submission timestamp and current HEAD
REVIEW_SUBMITTED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
CURRENT_SHA=$(gh pr view $PR_NUMBER -R $REPO --json headRefOid --jq '.headRefOid')

# --- Phase A: Wait up to 2 minutes for CCA to organically re-engage ---
PHASE_A_TIMEOUT=120
INTERVAL=15
ELAPSED=0
CCA_REENGAGED=false

while [ $ELAPSED -lt $PHASE_A_TIMEOUT ]; do
  # Check for a new copilot_work_started event after our review
  TIMELINE=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
    -H "Accept: application/vnd.github+json" 2>/dev/null)
  NEW_START=$(printf '%s' "$TIMELINE" | jq -r --arg after "$REVIEW_SUBMITTED_AT" \
    '[.[] | select(.event == "copilot_work_started") | .created_at | select(. >= $after)] | first // empty')
  if [ -n "$NEW_START" ]; then
    CCA_REENGAGED=true
    echo "CCA re-engaged organically at $NEW_START"
    break
  fi
  # Also check if HEAD already changed (CCA pushed without a visible start event)
  NEW_SHA=$(gh pr view $PR_NUMBER -R $REPO --json headRefOid --jq '.headRefOid')
  if [ "$NEW_SHA" != "$CURRENT_SHA" ]; then
    CCA_REENGAGED=true
    echo "CCA pushed new HEAD $NEW_SHA (no explicit work_started observed)"
    break
  fi
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

# --- Phase B: If CCA did not re-engage, explicitly re-assign ---
if [ "$CCA_REENGAGED" != true ]; then
  echo "CCA did not re-engage within ${PHASE_A_TIMEOUT}s. Re-assigning task to trigger a new work cycle."
  gh api --method POST \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/repos/$REPO/issues/$TASK_ISSUE/assignees" \
    --input - <<< "{
      \"assignees\": [\"copilot-swe-agent[bot]\"],
      \"agent_assignment\": {
        \"target_repo\": \"$REPO\",
        \"base_branch\": \"$BASE_BRANCH\"
      }
    }" > /dev/null
fi

# --- Phase C: Wait for CCA to complete a full work cycle (up to 10 minutes) ---
PHASE_C_TIMEOUT=600
ELAPSED=0

while [ $ELAPSED -lt $PHASE_C_TIMEOUT ]; do
  # Check for new HEAD
  NEW_SHA=$(gh pr view $PR_NUMBER -R $REPO --json headRefOid --jq '.headRefOid')
  if [ "$NEW_SHA" != "$CURRENT_SHA" ]; then
    # Verify CCA actually finished (not mid-cycle)
    TIMELINE=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
      -H "Accept: application/vnd.github+json" 2>/dev/null)
    LATEST_START=$(printf '%s' "$TIMELINE" | jq -r \
      '[.[] | select(.event == "copilot_work_started") | .created_at] | max // empty')
    LATEST_FINISH=$(printf '%s' "$TIMELINE" | jq -r \
      '[.[] | select(.event == "copilot_work_finished") | .created_at] | max // empty')
    if [ -n "$LATEST_START" ] && [ -n "$LATEST_FINISH" ] \
        && [[ "$LATEST_FINISH" > "$LATEST_START" || "$LATEST_FINISH" == "$LATEST_START" ]]; then
      echo "CCA completed work cycle. New HEAD: $NEW_SHA"
      break
    fi
  fi
  sleep 30
  ELAPSED=$((ELAPSED + 30))
done

# --- Diagnostic output on failure ---
if [ "$NEW_SHA" = "$CURRENT_SHA" ]; then
  TIMELINE=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
    -H "Accept: application/vnd.github+json" 2>/dev/null)
  LAST_FINISH=$(printf '%s' "$TIMELINE" | jq -r \
    '[.[] | select(.event == "copilot_work_finished") | .created_at] | max // "none"')
  LAST_START=$(printf '%s' "$TIMELINE" | jq -r \
    '[.[] | select(.event == "copilot_work_started") | .created_at] | max // "none"')
  echo "SHEPHERD FAILED: CCA did not push fixes for PR #$PR_NUMBER within ${PHASE_C_TIMEOUT}s after re-engagement attempt."
  echo "  Review posted at: $REVIEW_SUBMITTED_AT"
  echo "  Last copilot_work_started: $LAST_START"
  echo "  Last copilot_work_finished: $LAST_FINISH"
  echo "  Re-assignment attempted: $([ "$CCA_REENGAGED" = true ] && echo 'no (organic)' || echo 'yes')"
  echo "  HEAD unchanged at: $CURRENT_SHA"
  exit 8
fi
```

After a new SHA appears and CCA's work cycle is complete, return to **Step 3**. Wait for the latest CCA work cycle to finish, re-prove the nonempty effective diff, rebuild the issue-requirement evidence table, and rerun every validation gate. A new commit invalidates all evidence collected for the previous SHA.

#### 7.5: Loop back

Return to **Step 3** and repeat. Track iteration count. If 20 iterations are exhausted without all checks passing, stop and report:

```
SHEPHERD FAILED: Exhausted 20 iterations on PR #$PR_NUMBER for task #$TASK_ISSUE.
Manual intervention required.
```

### Step 8: Address pre-Ready-for-Review comments

Even when CI passes, review agents (e.g., "Copilot code review", "SDK Consistency Review Agent") may leave comments that should be addressed before marking ready.

#### 8.1: Check for unresolved review comments

```bash
OWNER=${REPO%%/*}
NAME=${REPO#*/}

# Query authoritative thread resolution and aggregate review decision.
REVIEW_STATE=$(gh api graphql --paginate \
  -f query='query($owner:String!,$name:String!,$number:Int!,$endCursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewDecision reviewThreads(first:100,after:$endCursor){nodes{isResolved comments(last:1){nodes{author{login} body url}}}pageInfo{hasNextPage endCursor}}}}}' \
  -F owner="$OWNER" -F name="$NAME" -F number="$PR_NUMBER")

UNRESOLVED_THREADS=$(printf '%s' "$REVIEW_STATE" | jq -s \
  '[.[].data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length')
REVIEW_DECISION=$(printf '%s' "$REVIEW_STATE" | jq -r \
  '.data.repository.pullRequest.reviewDecision // empty' | tail -1)

if [ "$UNRESOLVED_THREADS" -ne 0 ] || [ "$REVIEW_DECISION" = "CHANGES_REQUESTED" ]; then
  echo "ERROR: PR #$PR_NUMBER has unresolved review threads or requested changes."
fi

# Issue-level bot comments are not review threads; inspect them separately for
# actionable findings posted outside a formal review.
gh pr view "$PR_NUMBER" -R "$REPO" --comments --json comments \
  --jq '.comments[] | select(.author.login | test("bot|copilot|agent"; "i")) | {author: .author.login, body: .body, url: .url}'
```

#### 8.2: If unresolved comments exist, iterate

Use the same pattern as Step 7: compose a review requesting changes with specific instructions, wait for Copilot to push, approve workflows, and check results. This shares the same 20-iteration budget.

### Step 9: Atomic final readiness gate and status report

Immediately before reporting completion, re-query all state. Do not reuse cached values. Require:

- PR state is `OPEN`, `isDraft` is `true`, and base is exactly `BASE_BRANCH`.
- Current HEAD equals the validated `HEAD_SHA`.
- The latest `copilot_work_finished` is not older than the latest `copilot_work_started`.
- `changed_files > 0`, the files API is nonempty, and base/head trees differ.
- The issue-requirement evidence table contains no `FAIL` or `UNKNOWN` rows.
- Every issue-specified gating command passed on `HEAD_SHA`.
- Relevant CI checks for `HEAD_SHA` passed and no check or workflow is pending or `action_required`.
- No unresolved review thread, `CHANGES_REQUESTED` review, or actionable bot comment remains.

Use the authoritative closing-issue GraphQL query from Step 2, commit/check-runs API query from Step 6.1, and paginated review-thread GraphQL query from Step 8.1 for this recheck. Do not replace them with PR title matching, `gh pr checks` against an unverified HEAD, or the presence/absence of raw review comments.

Query HEAD once more after these checks. If it differs from `HEAD_SHA`, discard all results and return to Step 3.

Only then report:

```
SHEPHERD COMPLETE: PR #$PR_NUMBER for task #$TASK_ISSUE is ready for marking as **Ready for review**.
CCA completed its latest work cycle. The PR has a nonempty effective diff. Every issue requirement and gating command passed against HEAD $HEAD_SHA. Relevant CI passed. No unresolved review comments remain.
Next step: Mark as Ready for Review (use separate skill).
```

---

## Error handling

- **PR not created within 15 minutes**: Report and stop.
- **CCA work cycle not finished within 2 hours**: Report and stop.
- **PR is no longer open and draft before final readiness**: Report and stop.
- **Empty diff, empty PR files response, or identical base/head trees**: Report and stop.
- **Issue requirement lacks concrete passing evidence**: Request changes or stop for manual intervention.
- **Issue-specified gating command cannot run or fails**: Request changes or stop for manual intervention.
- **Only selector/aggregator CI passes while relevant substantive jobs skip**: Report and stop.
- **Copilot doesn't push after review request within 10 minutes (including re-assignment attempt)**: Report structured diagnostics (review timestamp, last work_started, last work_finished, whether re-assignment was attempted, unchanged HEAD SHA) and stop.
- **HEAD changes during validation**: Discard stale results and restart validation at Step 3.
- **20 iterations exhausted**: Report and stop.
- **API errors**: Retry up to 3 times with 10-second backoff, then report and stop.

## Notes

- This skill runs in a `copilot --yolo` session on a Dev Box, executing as the authenticated user.
- The skill does NOT mark the PR as "Ready for review" — that is a separate skill.
- The `gh api .../actions/runs/{id}/approve` endpoint is the programmatic equivalent of the "Approve and run" button in the GitHub UI.
- Review comments from bots/agents are treated the same as CI failures for iteration purposes.
- **Do NOT edit any plan/checklist files** (e.g., `1810-ignorance-reduction-for-implementation-plan.md`) to mark tasks as complete. Marking checklist items is outside the scope of this skill.
