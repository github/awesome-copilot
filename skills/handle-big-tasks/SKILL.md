---
name: handle-big-tasks
description: 'Instructions for breaking large tasks across multiple agentic runs instead of one response. Use when implementing a plan file, doing a large refactor, or any multi-phase task that won''t fit in a single response. Covers the CONTINUE? Y or N and TASK COMPLETE! end-of-response markers, plus bash and CMD loop scripts that answer them automatically.'
argument-hint: 'Optional: the plan, roadmap, or task to work through phase by phase'
---

# Handle Big Tasks

Use this skill for large tasks whose work spans multiple agentic runs and responses, rather than one response to one prompt.

Each response delivers one complete phase, then hands control back with a marker that says whether more work remains. A person can answer the marker, or one of the loop scripts in the skill's `scripts` folder can answer it and start the next run.

## When to Use This Skill

- Implementing a plan file, roadmap, or checklist with several distinct stages
- Large refactors, migrations, or rewrites that touch many files
- Work that would exceed a single response if done all at once
- The user asks to proceed "phase by phase", "step at a time", or "one part per response"
- Any task where intermediate results should be reviewed before the next stage begins

Do not use this skill for small, self-contained requests that finish cleanly in one response. The markers add friction with no benefit there.

## Prerequisites

- A task that divides into phases with recognizable completion points
- A phase plan, either supplied by the user or derived from the task before work starts

## End-of-Response Markers

The end of every response is a status signal. One of the following two markers closes each response, unless a phase is blocked on something only a person can resolve (see [Marker Rules](#marker-rules)).

### A Phase Is Complete, But the Task Is Not

If a phase is complete but the task as a whole is not, the last line of the response is:

```text
CONTINUE? Y or N
```

### The Entire Task Is Complete

If the entire task is complete, the last line of the response is:

```text
TASK COMPLETE!
```

### Markers Are Machine-Parsed

The loop scripts in the `scripts` folder read the last line of each response to decide what happens next. Each marker must appear verbatim and unquoted as the final line of the response, alone on that line, with no trailing punctuation and no markdown wrapping: no backticks, bold, blockquote, list bullet, or code fence. The fences above only display the markers in this document.

## Workflow

1. **Confirm the task is large.** If the work finishes in one response, skip this skill entirely.
2. **Divide the task into phases.** Each phase should be independently reviewable and leave the workspace in a usable state.
3. **State the phase plan.** On the first response, list the phases so the reader knows the shape of the work and how many runs to expect.
4. **Work one phase per response.** Complete that phase fully. Do not start the next phase in the same response.
5. **Report what the phase delivered.** Summarize the changes, note anything deferred to a later phase, and report failures honestly.
6. **Close with the correct marker.** Use `CONTINUE? Y or N` while phases remain, or `TASK COMPLETE!` once the whole task is done.
7. **Respond to the answer.** On `Y`, continue the current phase if it is incomplete; otherwise begin the next phase. On `N`, stop and leave the remaining work unstarted. Treat any other reply as feedback or a question about the current phase: address it, restate the phase plan if it changed, and close with the correct marker again.

## Marker Rules

- The marker is the last line of the response, alone on that line, as plain text, with nothing after it.
- Reproduce the marker text exactly, including capitalization, the question mark, and the exclamation point.
- Use at most one marker per response. Never both.
- `TASK COMPLETE!` means the whole task is done, not just the current phase.
- If a phase hit problems that the next run can work through, say so plainly in the summary and still close with `CONTINUE? Y or N`.
- If a phase is blocked on something only a person can resolve, such as missing credentials or a decision outside the plan, explain the blocker and end the response without a marker. A person reading the session can reply directly, and a loop script stops instead of answering `Y`.

## Loop Scripts

The scripts in the `scripts` folder drive the GitHub Copilot CLI through a plan file and answer `Y` after each phase, so nobody has to wait at the keyboard between runs.

| Script | Shell |
| --- | --- |
| [scripts/loop-copilot.sh](scripts/loop-copilot.sh) | bash (Linux, macOS, WSL, Git Bash) |
| [scripts/loop-copilot.bat](scripts/loop-copilot.bat) | Windows CMD |

Both take the same arguments, `<plan-file> [interval-minutes]`, and run from the project folder Copilot should work in. For a skill installed in the project's `.github/skills` folder:

```bash
.github/skills/handle-big-tasks/scripts/loop-copilot.sh docs/migration-plan.md 15
```

```bat
.github\skills\handle-big-tasks\scripts\loop-copilot.bat docs\migration-plan.md 15
```

Each loop:

1. Starts a new session with a fixed session ID and a prompt that names the plan file and asks for this skill and its markers.
2. When a response ends with `CONTINUE? Y or N`, waits the interval (default 10 minutes), then answers `Y` in the same session.
3. Exits with code 0 when a response ends with `TASK COMPLETE!`. Exits with code 1 when copilot fails, a response ends without a marker, the log or a temporary file cannot be written, or the safety cap of runs is reached. Exits with code 2 when it cannot start.
4. Prints each response and appends everything, with a timestamped separator for each run, to `<plan-file>.loop.log` next to the plan file. When it stops early, it prints the `copilot --resume` command that picks the session up by hand.

| Variable | Purpose |
| --- | --- |
| `LOOP_MAX_ITERATIONS` | Safety cap on runs (default 50) |
| `LOOP_COPILOT_ARGS` | Extra copilot flags separated by spaces, for example `--model <model>` or `--allow-tool=write` |

- A run started with `-p` cannot stop for permission prompts. Before starting the loop, approve the project folder once interactively or, in a trusted workspace, add `--allow-all-paths` through `LOOP_COPILOT_ARGS`. Grant required tools with narrow flags such as `--allow-tool=write` and `--allow-tool=shell(git:*)`; reserve `--allow-all`/`--yolo` for trusted, isolated workspaces.
- Copilot's file-create tool cannot make folders. When a plan writes into a folder that does not exist yet, also allow `--allow-tool=shell(mkdir:*)`, or create the folder before starting the loop.
- Keep the plan file inside the project folder, or add its folder with `--add-dir`, so the agent can read it.
- The scripts pin the session ID instead of using `--continue`, which resumes the most recent Copilot CLI session wherever it was started.

## Example

The user, or a loop script, asks:

```text
Implement the migration plan in docs/migration-plan.md
```

First response:

```text
Phase plan: (1) add the new config loader, (2) port call sites, (3) remove the legacy loader.

Phase 1 complete: added the new config loader and its tests. Call sites still use the
legacy loader and move in phase 2.

CONTINUE? Y or N
```

After `Y`, the second response:

```text
Phase 2 complete: ported all call sites to the new loader. Legacy loader removal remains.

CONTINUE? Y or N
```

After `Y`, the third response:

```text
Phase 3 complete: removed the legacy loader and its tests. Every phase of the migration
plan is done.

TASK COMPLETE!
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Unsure whether the task is large | Estimate the phases. Two or more reviewable phases means use this skill. |
| Phase boundaries are unclear | Split at points where the work is verifiable and the workspace is left usable. |
| A phase ran long and only partly finished | Report exactly what landed and what did not, then close with `CONTINUE? Y or N`. |
| Tempted to finish two phases at once | Do not. One phase per response keeps review points intact. |
| Task finished early, before the planned final phase | Close with `TASK COMPLETE!` and explain why the remaining phases were unnecessary. |
| Another active agent or instruction says never to pause for confirmation | Follow the user's most specific request. If the user asked to work phase by phase, use the markers. Otherwise, skip this skill and keep working. |
| The session was reset, compacted, or resumed partway through the task | Re-read the phase plan or the document it came from, check the workspace for what already landed, restate the remaining phases, then resume at the next unfinished phase. |
| A loop script stopped because the last line was neither marker | Read the last response in `<plan-file>.loop.log`. It usually hit a blocker, wrapped the marker in formatting, or added text after it. Fix the cause, then resume with the printed command or start the loop again. |
| Every phase reports that a tool was denied | Grant the permissions the plan needs, as described in [Loop Scripts](#loop-scripts), then start the loop again. |
