---
name: 'diagnose-ci-gate'
description: 'Determine whether a failing CI check was caused by the current change, then recommend exactly one action. Use when a required check fails on a pull request, when asked "is this failure mine?", when a job passes locally but fails in CI, or before retrying a red build. Covers fetching the real log, reading the first error instead of the tail, classifying bug / flaky / environment / pipeline, comparing against the base branch and recent runs, reproducing with CI versions, and fixing a flaky test rather than re-running it forever.'
---

# Diagnose CI Gate

A red check is a claim, not a diagnosis. Before you change code or press
re-run, establish three things from evidence: what actually failed, which class
of failure it is, and whether this change caused it.

This skill is for a failing required check on a pull request or a branch. For
cutting CI cost in general, use the `github-actions-efficiency` skill. For a
domain-specific flaky suite, use the skill for that tool (for example
`cypress-flake-fixer`) after this triage.

## When to Use This Skill

- A required check fails on a pull request and you need to know if it is yours
- A job passes locally but fails in CI, or fails on only some runs
- Someone says "that failure is unrelated, just re-run it"
- A build has been retried several times and keeps failing
- You are about to edit a workflow file to make a check pass

## Prerequisites

- `gh` CLI authenticated, or the raw logs pasted by the user
- Read access to the base branch and its recent runs
- The commands in the failing step, so they can be reproduced

If logs are truncated, partial, or only a summary, stop and ask for the full
log. Do not diagnose from the last few lines of a summarized check.

## Workflow

### 1. Get the failing job, not the check summary

```bash
gh pr checks <pr-number>                     # which check, which state
gh run list --branch <branch> --limit 10     # current and recent runs
gh run view <run-id> --log-failed            # only the failing steps
gh run view <run-id> --job <job-id> --log    # one job, full log
```

Record the commit SHA under test, the runner image, and the time. A failure on
an older SHA is a different problem from a failure on the current head.

### 2. Read from the first error

Read the top of the failing step, not the bottom. The first error is usually
the cause; everything after it is fallout from that cause or from the runner
giving up.

Quote the exact lines, and name the command that produced them. If the log
shows only a summary line (`Process completed with exit code 1`), find the step
that emitted it and read that step's output.

### 3. Classify the failure

| Class | Signal | Confirm by |
| --- | --- | --- |
| **Bug** | Same failure every run, deterministic input | Re-running fails identically at the same assertion |
| **Flaky** | Passes sometimes, timing/ordering/network/shared state | At least one green run of the same job on the same SHA, or a local loop that fails intermittently |
| **Environment** | Tool version, missing secret, runner image, cache, disk or memory | Version in CI differs from local, or the step fails before any project code runs |
| **Pipeline** | The workflow itself is wrong: bad path filter, wrong working directory, missing dependency install, YAML error, or a check that asserts a target the pull request cannot produce (such as a production URL for a page that is not merged yet) | The command succeeds against the pull request's own build, and the workflow line or its target is demonstrably wrong |

Write the class and the evidence for it in one sentence each. A failure that
cannot be classified is not ready for a fix.

### 4. Decide whether this change caused it

Compare with the base branch before claiming anything about ownership:

```bash
gh run list --branch main --limit 10
git merge-base HEAD origin/main
```

If the same job fails on the base branch, or on recent runs of the base branch,
it is pre-existing. Say so and link the run.

Some jobs only run on pull requests, so no base-branch run exists. In that case,
say that instead of implying you compared, and use the diff to establish what
the change added.

To test the base directly without disturbing the worktree, create a unique
throwaway worktree and remove it when done:

```bash
base_dir="$(mktemp -d)"
git worktree add "$base_dir" "$(git merge-base HEAD origin/main)"
( cd "$base_dir" && <failing command> )
git worktree remove --force "$base_dir"
```

`mktemp -d` returns a fresh path, so concurrent runs cannot collide. `--force` is
safe here because the directory was created for this check and the failing
command may have written build output into it. Never point this at a path that
holds work, and remove the worktree with `git worktree remove` instead of
deleting the directory by hand. If a directory was deleted by hand, run
`git worktree prune`.

This example is POSIX shell. On Windows, run it from Git Bash, or use
PowerShell:

```powershell
$baseDir = Join-Path $env:TEMP ("ci-base-" + [guid]::NewGuid())
git worktree add $baseDir (git merge-base HEAD origin/main)
Push-Location $baseDir; <failing command>; Pop-Location
git worktree remove --force $baseDir
```

If it passes on the base and fails on the head, name the commit and the file and
line that introduced it. If the change is a dependency bump, check the lockfile
diff and the tool version, not only the source diff.

### 5. Reproduce with CI's versions

Run the failing command with the versions CI used, from the same working
directory, with the same environment variables and the same install step. Read
the versions from the log, not from your local machine.

If you cannot reproduce it, say so and name every difference you found: OS,
runtime version, dependency resolution, environment variable, timezone,
parallelism, cached state. "Cannot reproduce" is a finding, not a failure.

### 6. Choose exactly one action

- **Retry** - only when you already have evidence the failure is flaky. Name
  the green run of the same job on the same SHA.
- **Fix the code** - name the file, line, and change. This is the default for a
  deterministic bug.
- **Fix the pipeline** - name the workflow file and line. This is for pipeline
  faults, not for hiding a real failure.

For a flaky test, do the follow-up work instead of re-running forever:

1. Run it repeatedly and record the failure rate: `for i in $(seq 1 20); do <command>; done`
2. Find the shared state, timing assumption, or ordering dependency behind it
3. Fix or quarantine it with an owner and a removal date, and say which

### 7. Verify and report

Re-run the check after the fix and show the result. For a flaky test, show the
repeated runs.

Report in this shape:

```text
Check:      <name> on <SHA>
First error: <quoted line> (<step>, <command>)
Class:      bug | flaky | environment | pipeline
Ownership:  introduced by <commit/file:line> | pre-existing (<run link>)
Reproduced: yes (<command>) | no (<differences>)
Action:     retry | fix code | fix pipeline
Result:     <run link, or the repeated-run tally>
```

## Verification Checklist

- [ ] The quoted error comes from the real log, with the step and command named
- [ ] The failure is classified, with the evidence for that class
- [ ] The base branch and recent runs were checked before claiming ownership
- [ ] The failure was reproduced with CI versions, or the differences are listed
- [ ] The recommended action is one of retry, fix code, or fix pipeline, with a reason
- [ ] The check was re-run after the fix, and the result is shown

## Rules

- Never recommend re-running without evidence that the failure is flaky
- Never call a failure unrelated without comparing against the base branch
- Never skip, delete, or weaken a failing test to make a check pass
- Never add `continue-on-error`, `if: always()`, or a path filter to hide a real failure
- Never treat a passing retry as proof the root cause is gone; say what changed
- Never diagnose from a summary line when the full log is available

## Validation

[`references/validation.md`](references/validation.md) records this skill applied
to real failed checks on a public repository: the job log, the classification,
the ownership evidence, the reproduction attempt, and the recommended action.

The first scenario is a transcript from GitHub Copilot CLI, prompted only with
the failing job log, in a checkout where the failing command passes. It returned
the report format below, classified the failure as pipeline, and attributed it to
the parent commit rather than the change under test. Both findings were confirmed
afterwards, and a depth-1 checkout reproduces the failure. The scenario exists to
show the report surviving a green local run instead of collapsing into "cannot
reproduce, probably flaky".

## Limitations

- Log access depends on permissions. Without it, ask for the log instead of guessing
- Private runners and self-hosted infrastructure can fail for reasons the log does not show
- A failure that only reproduces under load or on real hardware may need production-like infrastructure
- This skill diagnoses and recommends. It does not decide whether a check is allowed to be bypassed; that is a policy decision for the repository owner
