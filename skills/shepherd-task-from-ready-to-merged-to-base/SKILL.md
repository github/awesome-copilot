---
name: shepherd-task-from-ready-to-merged-to-base
description: "Use this skill to shepherd a task PR from 'Ready for review' through Copilot code review, local comment resolution, and merge to the specified base branch."
---

# Skill: Shepherd Task from Ready for Review to Merged

## Purpose

Automate the lifecycle of a task PR from marking as **Ready for review** through Copilot code review comment resolution and merge to the specified base branch. This is a follow-up skill intended to be run after `shepherd-task-from-assignment-to-ready`.

## Inputs

- `TASK_ISSUE`: The issue number (e.g., `1850`) or URL of the child task.
- `BASE_BRANCH`: The base branch the task PR should target (e.g., `edburns/1810-java-tool-ergonomics-tool-as-lambda`).
- `REPO`: Repository in `OWNER/REPO` format (default: `github/copilot-sdk`).
- `REMOTE`: Git remote to push to (default: `upstream`).

## Prerequisites

- The `shepherd-task-from-assignment-to-ready` skill has completed successfully for this task.
- `PR_NUMBER` is known (the PR created by Copilot for this task). For discussion: `jtbdtask-pr`.
- `gh` CLI authenticated with sufficient permissions.
- The PR is currently in draft state with all CI checks passing.

---

## ⚠️ CRITICAL: Never go idle while waiting

The `copilot --yolo` runtime **terminates the session shortly after the agent goes idle** (i.e., when there are no pending tool calls). If you launch a long-running polling command with a short `initial_wait` and then say "I'll check back when it completes," the runtime will kill the session before the command finishes.

**Rules for all polling and waiting steps:**

1. ✅✅✅ **ALWAYS use `initial_wait` ≥ 600 seconds** (10 minutes) on any polling/waiting command. This keeps the agent blocked on the tool call rather than going idle. ✅✅✅
2. ❌❌❌ **NEVER background a polling command and then end your turn with no tool calls.** If a command exceeds `initial_wait`, immediately issue another tool call (e.g., `read_powershell`) to stay active. ❌❌❌
3. ❌❌❌ **NEVER say "I'll check back when it completes" or "Waiting for notification."** These phrases mean you are going idle, which KILLS THE SESSION. ❌❌❌
4. ✅✅✅ **ALWAYS prefer a single blocking poll** over launching a background command and waiting for a notification. ✅✅✅

---

## Procedure

### Step 0: Find the PR

Use the same multi-strategy approach as the assignment skill:

1. **Issue timeline** — query `gh api "/repos/$REPO/issues/$TASK_ISSUE/timeline"` for cross-referenced open PRs.
2. **PR body search** — search open PR bodies for `#$TASK_ISSUE`.
3. **Title/branch match** — regex match on title or headRefName.

If none of these find the PR, fail the skill and report the error.

### Step 1: Mark the PR as Ready for Review and request Copilot review

```bash
gh pr ready $PR_NUMBER -R $REPO
```

**Important:** Copilot code review is NOT automatically triggered when a PR is taken out of draft state. You must explicitly request it.

Before requesting review, capture the PR head and the latest completed Copilot review. These values identify the review round and prevent a previous review from satisfying a later poll:

```bash
REVIEW_TARGET_HEAD=$(gh pr view "$PR_NUMBER" -R "$REPO" --json headRefOid --jq '.headRefOid')
PREVIOUS_COPILOT_REVIEW_ID=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" \
  --jq '[.[]
    | select((.user.login // "") | test("^copilot-pull-request-reviewer(\\[bot\\])?$"; "i"))
    | .id
  ] | max // 0')
```

Request reviewer `Copilot` with `gh pr edit`. Do not substitute the REST request `reviewers[]=copilot-pull-request-reviewer`; that login is the review bot's output identity, not the requestable Copilot reviewer. Also do not treat a nonzero `gh pr edit` exit caused only by its deprecated Projects Classic query as proof that the mutation failed. Verify the result instead.

For up to three attempts, record the request time, request reviewer `Copilot`, and poll for up to two minutes for at least one positive acknowledgement:

- a new `review_requested` timeline event for requested reviewer `Copilot` at or after the recorded request time;
- `Copilot` in `gh pr view --json reviewRequests`; or
- a new Copilot review whose `commit_id` is `REVIEW_TARGET_HEAD` and whose ID is greater than `PREVIOUS_COPILOT_REVIEW_ID`.

```bash
REVIEW_REQUEST_ACKNOWLEDGED=false

for ATTEMPT in 1 2 3; do
  REQUESTED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  EDIT_STATUS=0
  gh pr edit "$PR_NUMBER" -R "$REPO" --add-reviewer Copilot || EDIT_STATUS=$?

  # gh pr edit may complete the mutation and then fail its deprecated Projects
  # Classic query. Trust positive API state, not this process status alone.
  if [ "$EDIT_STATUS" -ne 0 ]; then
    echo "gh pr edit exited $EDIT_STATUS; verifying whether the review request was accepted"
  fi

  ACK_ELAPSED=0
  while [ "$ACK_ELAPSED" -lt 120 ]; do
    REQUEST_EVENT=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
      -H 'Accept: application/vnd.github+json' 2>/dev/null \
      | jq --arg requested_at "$REQUESTED_AT" '[.[]
          | select(.event == "review_requested")
          | select((.requested_reviewer.login // "") == "Copilot")
          | select(.created_at >= $requested_at)
        ] | length')

    REQUEST_STATE=$(gh pr view "$PR_NUMBER" -R "$REPO" --json reviewRequests \
      --jq '[.reviewRequests[] | select((.login // "") == "Copilot")] | length' 2>/dev/null)

    COMPLETED_REVIEW=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" 2>/dev/null \
      | jq --arg head "$REVIEW_TARGET_HEAD" --argjson previous "$PREVIOUS_COPILOT_REVIEW_ID" '[.[]
          | select((.user.login // "") | test("^copilot-pull-request-reviewer(\\[bot\\])?$"; "i"))
          | select(.commit_id == $head)
          | select(.id > $previous)
        ] | length')

    if [ "${REQUEST_EVENT:-0}" -gt 0 ] || [ "${REQUEST_STATE:-0}" -gt 0 ] || [ "${COMPLETED_REVIEW:-0}" -gt 0 ]; then
      REVIEW_REQUEST_ACKNOWLEDGED=true
      break 2
    fi

    sleep 10
    ACK_ELAPSED=$((ACK_ELAPSED + 10))
  done

  [ "$ATTEMPT" -lt 3 ] && sleep 10
done

if [ "$REVIEW_REQUEST_ACKNOWLEDGED" != true ]; then
  echo "SHEPHERD FAILED: Copilot review request was not acknowledged for PR #$PR_NUMBER at $REVIEW_TARGET_HEAD."
  echo "The task is resumable; do not repeat completed fixes."
  exit 1
fi
```

Do not begin the review-completion timeout until the request is positively acknowledged. If all three attempts remain unacknowledged, report `SHEPHERD FAILED: Copilot review request was not acknowledged`, include the PR number and target head, and stop in a resumable state.

### Step 2: Wait for Copilot code review agent to complete

Wait for a new review from the Copilot code review agent for `REVIEW_TARGET_HEAD`. Review body text is presentation and may change; do not use headings such as `Copilot's findings`, `Pull request overview`, or `Not ready to approve` as completion signals.

Set `COPILOT_REVIEW_TIMEOUT_SECONDS` to override the default 30-minute completion timeout. The request-acknowledgement check in Step 1 is separate and must already have succeeded.

**⚠️ Keep the polling command active. Use the largest supported `initial_wait`, and if the tool returns while the command is still running, immediately read the same shell again.**

```bash
TIMEOUT=${COPILOT_REVIEW_TIMEOUT_SECONDS:-1800}
INTERVAL=30
ELAPSED=0
COPILOT_REVIEW=''

while [ $ELAPSED -lt $TIMEOUT ]; do
  COPILOT_REVIEW=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" 2>/dev/null \
    | jq --arg head "$REVIEW_TARGET_HEAD" --argjson previous "$PREVIOUS_COPILOT_REVIEW_ID" '
      [.[]
        | select((.user.login // "") | test("^copilot-pull-request-reviewer(\\[bot\\])?$"; "i"))
        | select(.commit_id == $head)
        | select(.id > $previous)
      ] | last // empty')

  if [ -n "$COPILOT_REVIEW" ]; then
    break
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ -z "$COPILOT_REVIEW" ]; then
  echo "SHEPHERD FAILED: Copilot review did not complete within ${TIMEOUT}s for PR #$PR_NUMBER at $REVIEW_TARGET_HEAD."
  echo "The acknowledged review request is resumable; do not repeat completed fixes."
  exit 1
fi

COPILOT_REVIEW_ID=$(printf '%s' "$COPILOT_REVIEW" | jq -r '.id')
```

#### 2.1: Stop if Copilot refused review because the PR has too many files

Before interpreting the review as findings or treating a zero-comment review as success, check the current review for the specific too-many-files refusal. Require both stable phrases so unrelated review text cannot trigger this gate:

```bash
TOO_MANY_FILES_REVIEW=$(printf '%s' "$COPILOT_REVIEW" | jq '
  select((.body // "") | test("wasn.t able to review"; "i"))
  | select((.body // "") | test("maximum number of files"; "i"))')

if [ -n "$TOO_MANY_FILES_REVIEW" ]; then
  echo "SHEPHERD FAILED: Copilot could not review PR #$PR_NUMBER because it exceeds the maximum number of files."
  echo "The PR must not be merged. Reduce or split the PR, then request a new Copilot review."
  echo "Manual intervention required."
  exit 1
fi
```

Do not attempt to reduce or split the PR automatically. This gate handles only this specific refusal and does not change the treatment of any other Copilot review outcome.

Use `COPILOT_REVIEW_ID` to identify this batch of review findings (`jtbdtask-pr-comments`).

If there are no top-level line comments associated with `COPILOT_REVIEW_ID`, skip to **Step 15**.

When `jtbdtask-pr-comments` has been identified, proceed.

### Step 3: Determine N (number of comments)

❌❌❌ DO NOT TAKE ANY ACTION ON COMMENTS ALREADY MARKED **Resolved**. ❌❌❌

Count top-level comments associated with the completed review. Do not parse the review body's **Comments generated:** line; that presentation syntax is not an API contract.

```bash
N=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/comments" \
  | jq --argjson review_id "$COPILOT_REVIEW_ID" '
    [.[]
      | select(.pull_request_review_id == $review_id)
      | select(.in_reply_to_id == null)
    ] | length')
```

There will be exactly N individual review comments in this batch to address.

### Step 4: Fetch upstream and set up local worktree

❌❌❌ This part of the work does not use the remote agent. All comment resolution is done locally. ❌❌❌

```bash
# Fetch upstream to get the topic branch
git fetch upstream

# Get the currently logged in username
GH_CURRENT_USER=$(gh api /user --jq '.login')

# Get the topic branch name for the PR
JTBDTASK_BRANCH=$(gh pr view $PR_NUMBER -R $REPO --json headRefName --jq '.headRefName')

# Create a worktree for local review work — as a SIBLING of the current repo clone, not inside it.
git worktree add "../review-copilot-pr-$PR_NUMBER" "upstream/$JTBDTASK_BRANCH"
```

For discussion, this worktree is the `jtbdtask-pr-comments-comment-worktree`.

### Step 5: Approve workflows and wait for completion

Invoke the **`shepherd-task-approve-workflows-and-wait-for-completion`** skill (`skills/shepherd-task-approve-workflows-and-wait-for-completion/SKILL.md`) with:

- `REPO` = `$REPO`
- `JTBDTASK_BRANCH` = the PR's topic branch
- `PR_NUMBER` = `$PR_NUMBER`

This ensures any pending workflow runs triggered by prior pushes are approved and complete before gathering review comments.

### Step 6: Gather all review comments

```bash
# Get all review comments from the Copilot code review batch.
# The reviewer may appear as "copilot-pull-request-reviewer[bot]" or "Copilot" depending on the repo.
gh api "/repos/$REPO/pulls/$PR_NUMBER/comments" \
  | jq --argjson review_id "$COPILOT_REVIEW_ID" '.[]
    | select(.pull_request_review_id == $review_id)
    | select(.in_reply_to_id == null)
    | {id: .id, path: .path, line: .line, body: .body}'
```

Identify each individual comment. Each has a unique `id` (e.g., `discussion_r3456155645`-style reference). For discussion, each is a `jtbdtask-pr-comments-comment`.

### Step 7: Address each review comment locally

For each review comment (`jtbdtask-pr-comments-comment`), working in the `jtbdtask-pr-comments-comment-worktree`:

#### 7.1: Evaluate the comment

- Carefully consider the comment and judge its merit.
- **If there is no merit:** mark the comment as resolved with an explanatory note (defer the resolution reply until Step 9).
- **If there is merit:** evaluate the suggested remedy.
  - If you agree with the suggested remedy, proceed with it.
  - If you disagree with the suggested remedy, devise a better remedy and proceed with that.

#### 7.2: Implement the fix

- Implement the remedy in the `jtbdtask-pr-comments-comment-worktree`.
- Use the appropriate language coding skill in `skills/` to know how to run tests.
- If there are a large number of tests:
   - ❌❌❌ DO NOT RUN THE FULL TEST SUITE at this stage. ❌❌❌ .
   - ✅✅✅ Only run the tests directly related to the fix, in isolation. ✅✅✅ .
- Otherwise, if there is not a large number of tests:
   - Run all the tests.
- **If the commit touches any Java code, YOU MUST ALWAYS RUN `mvn spotless:apply` in the java directory before each commit.**

#### 7.3: Commit locally (do not push)

- Once the relevant tests pass, commit the fix.
- ❌❌❌ Do NOT push yet. ❌❌❌
- Keep track of the commit hash — you will need it when replying to the review comment.

### Step 8: Push all fixes to `$REMOTE`

Once **all** N review comments have been addressed locally:

```bash
# Push from the worktree to the configured remote (sibling directory)
cd "../review-copilot-pr-$PR_NUMBER"
git push "$REMOTE" HEAD:$JTBDTASK_BRANCH
```

### Step 9: Reply to each review comment and resolve the thread

For each `jtbdtask-pr-comments-comment`:

1. State what you did to address the comment. If the action corresponds to a commit, include the hash: "Fixed in `<hash>`".
2. Reply to the comment.
3. Resolve the review thread.

To reply to the comment:

```bash
# Reply to a specific review comment
gh api --method POST "/repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies" \
  -f "body=Fixed in $COMMIT_HASH. [explanation of the fix]"
```

To resolve the thread, use the GraphQL API (the REST API does not support thread resolution):

```bash
# 1. Get the GraphQL thread node ID for the comment
THREAD_ID=$(gh api graphql -F number=$PR_NUMBER -f query='
query($number: Int!) {
  repository(owner: "github", name: "copilot-sdk") {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 1) { nodes { databaseId } }
        }
      }
    }
  }
}' --jq ".data.repository.pullRequest.reviewThreads.nodes[] | select(.comments.nodes[0].databaseId == $COMMENT_ID) | .id")

# 2. Resolve the thread
gh api graphql -f query="
mutation {
  resolveReviewThread(input: {threadId: \"$THREAD_ID\"}) {
    thread { id isResolved }
  }
}"
```

### Step 10: Wait for CI to run

The push triggers CI/CD. Use the same approach as `shepherd-task-from-assignment-to-ready` to:

1. Wait for workflow runs to complete (`gh pr checks $PR_NUMBER -R $REPO --watch`).
2. Evaluate results (excluding the expected "Block remove-before-merge paths" / "No remove-before-merge directories" failure).
3. If there are real CI failures, gather logs and fix locally, commit, and push again. Repeat until CI passes.

**Note:** Ignore failures from the "Block remove-before-merge paths" / "No remove-before-merge directories" workflow. This failure is expected on feature branches and is not a real problem.

### Step 11: Approve workflows and wait for completion

Invoke the **`shepherd-task-approve-workflows-and-wait-for-completion`** skill (`skills/shepherd-task-approve-workflows-and-wait-for-completion/SKILL.md`) with:

- `REPO` = `$REPO`
- `JTBDTASK_BRANCH` = the PR's topic branch
- `PR_NUMBER` = `$PR_NUMBER`

This ensures any pending workflow runs triggered by the push in Step 8 are approved and complete before re-requesting review.

### Step 12: Re-request Copilot review

Repeat the review-target capture and acknowledged request procedure from Step 1. The new `REVIEW_TARGET_HEAD` must be the pushed fix commit, and `PREVIOUS_COPILOT_REVIEW_ID` must include the review just addressed.

Do not continue to Step 13 unless the new request is positively acknowledged.

### Step 13: Loop back

Go back to **Step 2**. Wait for the Copilot code review agent to post new findings.

**Max iterations: 8.** If exhausted, report failure and stop:

```
SHEPHERD FAILED: Exhausted 8 iterations on PR #$PR_NUMBER for task #$TASK_ISSUE.
Manual intervention required.
```

### Step 14: Approve workflows and wait for completion

Invoke the **`shepherd-task-approve-workflows-and-wait-for-completion`** skill (`skills/shepherd-task-approve-workflows-and-wait-for-completion/SKILL.md`) with:

- `REPO` = `$REPO`
- `JTBDTASK_BRANCH` = the PR's topic branch
- `PR_NUMBER` = `$PR_NUMBER`

This ensures any pending workflow runs are approved and complete before performing final checks.

### Step 15: Final checks before merge

Verify:

- Re-run the Step 2.1 too-many-files refusal query. If it matches, stop immediately; the PR must not be merged.
- The only failed check is "Block remove-before-merge paths" / "No remove-before-merge directories".
- All other checks pass.

### Step 16: Clean up worktree

```bash
# Remove the worktree (sibling directory)
git worktree remove "../review-copilot-pr-$PR_NUMBER"

# Remove the local branch tracking the PR topic branch (if created)
git branch -D "$JTBDTASK_BRANCH" 2>/dev/null || true
```

### Step 17: Verify base branch

❌❌❌ Ensure the base branch is NEVER `main` ❌❌❌ and always the `BASE_BRANCH` from this invocation.

```bash
ACTUAL_BASE=$(gh pr view $PR_NUMBER -R $REPO --json baseRefName --jq '.baseRefName')
if [ "$ACTUAL_BASE" = "main" ]; then
  echo "ERROR: PR base is 'main' — must be '$BASE_BRANCH'. Fixing..."
  gh pr edit $PR_NUMBER -R $REPO --base "$BASE_BRANCH"
fi
```

### Step 18: Handle merge conflicts

If there are conflicts between the PR branch and `BASE_BRANCH`:

```bash
# Check for merge conflicts
MERGEABLE=$(gh pr view $PR_NUMBER -R $REPO --json mergeable --jq '.mergeable')
if [ "$MERGEABLE" = "CONFLICTING" ]; then
  # Resolve conflicts locally in the worktree (sibling directory)
  cd "../review-copilot-pr-$PR_NUMBER"
  git fetch upstream
  git rebase "upstream/$BASE_BRANCH"
  # Resolve conflicts, then:
  git rebase --continue
  git push "$REMOTE" HEAD:$JTBDTASK_BRANCH --force-with-lease
fi
```

### Step 19: Merge the PR

```bash
gh pr merge $PR_NUMBER -R $REPO --merge --delete-branch
```

This merges the work to `BASE_BRANCH`.

### Step 20: Close the corresponding issue

```bash
gh issue close $TASK_ISSUE -R $REPO
```

### Step 21: Final status report

```
SHEPHERD COMPLETE: PR #$PR_NUMBER for task #$TASK_ISSUE has been merged to $BASE_BRANCH.
```

---

## Error handling

- **Copilot review request is not acknowledged after 3 attempts**: Report the PR and target head, preserve the resumable state, and stop.
- **An acknowledged Copilot review does not complete within `COPILOT_REVIEW_TIMEOUT_SECONDS` (default 30 minutes)**: Report the PR and target head, preserve the resumable state, and stop.
- **Copilot refuses review because the PR exceeds the maximum number of files**: Report, require manual intervention, and stop without merging.
- **8 iterations exhausted**: Report and stop.
- **Merge conflicts that cannot be auto-resolved**: Report and stop.
- **API errors**: Retry up to 3 times with 10-second backoff, then report and stop.

## Notes

- This skill runs in a `copilot --yolo` session on a Dev Box, executing as the authenticated user.
- All review comment resolution is done **locally** — not via the remote Copilot coding agent.
- **Do NOT edit any plan/checklist files** (e.g., `1810-ignorance-reduction-for-implementation-plan.md`) to mark tasks as complete. Marking checklist items is outside the scope of this skill.
