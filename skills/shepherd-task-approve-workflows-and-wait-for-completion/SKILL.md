---
name: shepherd-task-approve-workflows-and-wait-for-completion
description: "Use this skill to approve pending workflow runs on a PR branch and wait for them to complete."
---

# Skill: Approve Workflows and Wait for Completion

## Purpose

Approve all pending workflow runs (`action_required` status) on a PR's topic branch and wait for them to complete. This is a reusable sub-skill invoked by other shepherd skills whenever workflow approval is needed.

## Inputs

- `REPO`: Repository in `OWNER/REPO` format (e.g., `github/copilot-sdk`).
- `JTBDTASK_BRANCH`: The topic branch name associated with the PR (used to find workflow runs).
- `PR_NUMBER`: The PR number (used for `gh pr checks --watch`).

## Prerequisites

- `gh` CLI authenticated with sufficient permissions (actions, PRs).
- The PR exists and has workflow runs triggered on `JTBDTASK_BRANCH`.

---

## Procedure

### Step 1: Approve pending workflow runs

For each run in `action_required` status on the PR's branch, re-run it. The correct mechanism is `gh run rerun` (the `POST .../actions/runs/{id}/approve` endpoint is for fork PRs only and will return HTTP 403 here).

```bash
# Get all action_required runs for the PR branch
PENDING_RUNS=$(gh run list -R $REPO --branch "$JTBDTASK_BRANCH" \
  --json databaseId,conclusion --jq '.[] | select(.conclusion == "action_required") | .databaseId')

for RUN_ID in $PENDING_RUNS; do
  gh run rerun $RUN_ID -R $REPO
done
```

### Step 2: Wait for workflow runs to complete

```bash
# Watch all runs on the branch until they complete
# Use gh pr checks with --watch for convenience
gh pr checks $PR_NUMBER -R $REPO --watch --fail-fast
```

Alternatively, poll with:

```bash
gh run list -R $REPO --branch "$JTBDTASK_BRANCH" \
  --json databaseId,status,conclusion,name \
  --jq '.[] | select(.status != "completed")'
```

---

## Error handling

- **No pending runs found**: This is not an error — it means runs were already approved (possibly manually). Proceed directly to waiting for completion.
- **`gh run rerun` fails**: Retry up to 3 times with 10-second backoff, then report and stop.
- **Runs do not complete within a reasonable time**: The `--watch` flag on `gh pr checks` will block until completion or failure. If it times out, report and stop.

## Notes

- This skill is extracted from Steps 4 and 5 of `shepherd-task-from-assignment-to-ready` for reuse across multiple shepherd skills.
- The `gh api .../actions/runs/{id}/approve` endpoint does NOT work for same-repo PRs (returns HTTP 403 "This run is not from a fork pull request"). Always use `gh run rerun` instead.
