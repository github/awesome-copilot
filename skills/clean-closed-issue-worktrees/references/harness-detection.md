# Agent harness detection

Read this reference when any worktree appears to be managed by Codex, Claude Code, or another agent harness.

## General rule

An issue being closed does not prove that the worktree's current agent task is complete. Harness task state overrides issue-derived cleanup confidence.

- **Active**: task/session reports running, active, waiting for approval/input, or recent live progress. Classify as **Keep**.
- **Inactive**: harness explicitly reports completed or archived and no live operation owns the worktree.
- **Unknown**: the task exists but completion is not explicit, the harness reports an unloaded/idle historical entry that can be resumed, or task tooling is unavailable. Classify as **Needs review**.
- **Not managed**: no harness metadata maps to the path and it is outside recognized harness-managed directories.

Do not use process names, `lsof`, modification time, terminal silence, or a clean Git status as the sole proof that a task ended.

## Codex

When Codex thread/task tools are available:

1. List tasks and map each exact `cwd` to the registered worktree path.
2. Treat `active`, running, waiting, or needs-attention tasks as active.
3. Treat archived/completed tasks as inactive.
4. Treat `notLoaded`, idle-but-resumable, missing pagination coverage, or ambiguous duplicate tasks as unknown unless the user confirms completion.
5. Never remove the calling task's own worktree.

If the user later asks to archive or otherwise manage a Codex task, use the harness's task/thread tools; worktree cleanup does not imply task archival permission.

## Claude Code

Use any available session/task metadata and exact working-directory mapping. A path under `.claude/worktrees` is harness-managed even if no process is visible. If no authoritative session state is available, mark it unknown and request confirmation after presenting the scan.

## Other harnesses

Recognize harness-managed paths and metadata when available, but do not invent status mappings. Unknown harness ownership is a review condition, not a reason to fall back to process guessing.
