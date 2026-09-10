---
# shepherd-task-version: 1.0.3
name: shepherd-task-approve-workflows-and-wait-for-completion
description: 'Use this skill to approve pending workflow runs and wait for the PR''s required checks to complete.'
---

# Skill: Approve Workflows and Wait for Completion

## Purpose

Approve pending workflow runs (`action_required` status) on a PR's topic
branch, then wait for the PR's required checks to complete. This is a reusable
sub-skill invoked by other shepherd skills whenever workflow approval is
needed.

## Inputs

- `REPO`: Repository in `OWNER/REPO` format (e.g., `github/copilot-sdk`).
- `JTBDTASK_BRANCH`: The topic branch name associated with the PR (used to find workflow runs).
- `PR_NUMBER`: The PR number (used for `gh pr checks --watch`).

## Prerequisites

- `gh` CLI authenticated with sufficient permissions (actions, PRs).
- The PR exists and has workflow runs triggered on `JTBDTASK_BRANCH`.

## PowerShell native-command safety

When translating the Bash examples in this skill to PowerShell, capture native
command output and `$LASTEXITCODE` before applying PowerShell transformations
such as `Select-Object`, `Select-String`, or `ConvertFrom-Json`. Never pipe a
native producer directly into those commands. A pipeline whose final command
is native is allowed when `$LASTEXITCODE` is captured immediately afterward.

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
# Watch the PR's required checks until they complete
gh pr checks $PR_NUMBER -R $REPO --watch --fail-fast
```

`gh pr checks` is the sole authoritative completion gate. A successful exit
means the workflow gate passed, even if the topic branch has queued or failed
runs for obsolete commits. Do not add a second wait that requires every
historical run on `JTBDTASK_BRANCH` to complete.

Branch-wide workflow history may be inspected only for diagnostics:

```bash
gh run list -R $REPO --branch "$JTBDTASK_BRANCH" \
  --json databaseId,status,conclusion,name,headSha,url
```

Never use this diagnostic listing to control the completion wait, determine
the command's exit status, or block a merge. In particular, an obsolete-SHA
run that remains queued after the PR's current checks pass is non-blocking.

---

## Error handling

- **No pending runs found**: This is not an error — it means runs were already approved (possibly manually). Proceed directly to waiting for completion.
- **`gh run rerun` fails**: Retry up to 3 times with 10-second backoff, then report and stop.
- **Required PR checks do not complete within a reasonable time**: The
  `--watch` flag on `gh pr checks` will block until completion or failure. If
  it times out, report and stop.

## Notes

- This skill is extracted from Steps 4 and 5 of `shepherd-task-30-from-assignment-to-ready` for reuse across multiple shepherd skills.
- The `gh api .../actions/runs/{id}/approve` endpoint does NOT work for same-repo PRs (returns HTTP 403 "This run is not from a fork pull request"). Always use `gh run rerun` instead.
