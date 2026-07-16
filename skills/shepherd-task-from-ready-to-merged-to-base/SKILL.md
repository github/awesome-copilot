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

## Procedure

### Step 0: Find the PR

Use the same multi-strategy approach as the assignment skill:

1. **Issue timeline** — query `gh api "/repos/$REPO/issues/$TASK_ISSUE/timeline"` for cross-referenced open PRs.
2. **PR body search** — search open PR bodies for `#$TASK_ISSUE`.
3. **Title/branch match** — regex match on title or headRefName.

If none of these find the PR, fail the skill and report the error.

### Step 1: Mark the PR as Ready for Review

```bash
gh pr ready $PR_NUMBER -R $REPO
```

### Step 2: Wait for Copilot code review agent to complete

The act of marking as Ready for Review triggers the Copilot code review agent. Wait for it to post its findings.

Poll the PR reviews and comments using **multiple detection strategies** (any match is sufficient):

**Strategy A:** A review whose body matches `"Copilot.s findings"` (original format).

**Strategy B:** A review whose body matches `"Pull request overview"` (alternate format).

**Strategy C:** A review from a user whose login contains `"copilot-pull-request-reviewer"` (handles `[bot]` suffix).

**Strategy D:** Line-level review comments from user `Copilot` on the PR.

```bash
# Poll every 30 seconds for up to 10 minutes
TIMEOUT=600
INTERVAL=30
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Strategy A: Original "Copilot's findings" header
  FINDINGS=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" \
    --jq '.[] | select(.body | test("Copilot.s findings")) | {id: .id, body: .body}' 2>/dev/null | tail -1)

  # Strategy B: Alternate "Pull request overview" header
  if [ -z "$FINDINGS" ]; then
    FINDINGS=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" \
      --jq '.[] | select(.body | test("Pull request overview")) | {id: .id, body: .body}' 2>/dev/null | tail -1)
  fi

  # Strategy C: Any review from the copilot-pull-request-reviewer bot
  if [ -z "$FINDINGS" ]; then
    FINDINGS=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" \
      --jq '.[] | select(.user.login | test("copilot-pull-request-reviewer")) | {id: .id, body: .body}' 2>/dev/null | tail -1)
  fi

  # Strategy D: Line-level comments from user "Copilot"
  if [ -z "$FINDINGS" ]; then
    FINDINGS=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/comments" \
      --jq '.[] | select(.user.login == "Copilot") | {id: .id, body: .body}' 2>/dev/null | head -1)
  fi

  if [ -n "$FINDINGS" ]; then
    break
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done
```

Search for similar text to identify the batch of review findings (`jtbdtask-pr-comments`).

If **Comments generated: 0** (or no comments for this round), skip to **Step 15**.

When `jtbdtask-pr-comments` has been identified, proceed.

### Step 3: Determine N (number of comments)

❌❌❌ DO NOT TAKE ANY ACTION ON COMMENTS ALREADY MARKED **Resolved**. ❌❌❌

Extract the number of comments from the **Comments generated:** line in the findings header. There will be exactly N individual review comments in this batch to address.

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
  --jq '.[] | select(.user.login | test("copilot-pull-request-reviewer|Copilot")) | {id: .id, path: .path, line: .line, body: .body, in_reply_to_id: .in_reply_to_id}'
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

```bash
gh pr edit $PR_NUMBER -R $REPO --add-reviewer "copilot-pull-request-reviewer"
```

### Step 13: Loop back

Go back to **Step 2**. Wait for the Copilot code review agent to post new findings.

**Max iterations: 8.** If exhausted, report failure and stop:

```
SHEPHERD FAILED: Exhausted 20 iterations on PR #$PR_NUMBER for task #$TASK_ISSUE.
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

- **Copilot review agent doesn't post within 10 minutes**: Report and stop.
- **8 iterations exhausted**: Report and stop.
- **Merge conflicts that cannot be auto-resolved**: Report and stop.
- **API errors**: Retry up to 3 times with 10-second backoff, then report and stop.

## Notes

- This skill runs in a `copilot --yolo` session on a Dev Box, executing as the authenticated user.
- All review comment resolution is done **locally** — not via the remote Copilot coding agent.
- **Do NOT edit any plan/checklist files** (e.g., `1810-ignorance-reduction-for-implementation-plan.md`) to mark tasks as complete. Marking checklist items is outside the scope of this skill.
