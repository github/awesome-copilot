---
name: autoresearch
description: 'Autonomous iterative experimentation loop for any programming task. Guides the user through defining goals, measurable metrics, and scope constraints, then runs an autonomous loop of code changes, testing, measuring, and keeping/discarding results. Inspired by Karpathy''s autoresearch. USE FOR: autonomous improvement, iterative optimization, experiment loop, auto research, performance tuning, automated experimentation, hill climbing, try things automatically, optimize code, run experiments, autonomous coding loop. DO NOT USE FOR: one-shot tasks, simple bug fixes, code review, or tasks without a measurable metric.'
license: MIT
compatibility: Requires git. The project must be a git repository. Requires terminal access to run commands.
metadata:
  author: luiscantero
  inspired-by: https://github.com/karpathy/autoresearch
---

# Autoresearch: Autonomous Iterative Experimentation

An autonomous experimentation loop for any programming task. You define the goal and how to measure it; the agent iterates autonomously -- modifying code, running experiments, measuring results, and keeping or discarding changes -- until interrupted.

This skill is inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch), generalized from ML training to **any programming task with a measurable outcome**.

---

## Agent Behavior Rules

1. **DO** guide the user through the Setup phase interactively before starting the loop.
2. **DO** establish a baseline measurement before making any changes.
3. **DO** commit every experiment attempt before running it (so it can be reverted cleanly).
4. **DO** keep a results log (TSV) tracking every experiment.
5. **DO** revert changes that do not improve the metric (git reset to last known good).
6. **DO** run autonomously once the loop starts -- never pause to ask "should I continue?".
7. **DO NOT** modify files the user marked as out-of-scope.
8. **DO NOT** skip the measurement step -- every experiment must be measured.
9. **DO NOT** keep changes that regress the metric unless the user explicitly allowed trade-offs.
10. **DO NOT** install new dependencies or make environment changes unless the user approved it.

---

## Phase 1: Setup (Interactive)

Before any experimentation begins, work with the user to establish these parameters.
Ask the user directly for each item. Do not assume or skip any.

### 1.1 Define the Goal

Ask the user:

> **What are you trying to improve or optimize?**
>
> Examples: execution time, memory usage, binary size, test pass rate, code coverage,
> API response latency, throughput, error rate, benchmark score, build time, bundle size,
> lines of code, cyclomatic complexity, etc.

Record the user's answer as the **goal**.

### 1.2 Define the Metric

Ask the user:

> **How do we measure success? What exact command produces the metric?**
>
> I need:
> 1. **The command** to run (e.g., `dotnet test`, `npm run benchmark`, `time ./build.sh`, `pytest --tb=short`)
> 2. **How to extract the metric** from the output (e.g., a regex pattern, a specific line, a JSON field)
> 3. **Direction**: Is lower better or higher better?
>
> Example: "Run `dotnet test --logger trx`, count passing tests. Higher is better."
> Example: "Run `hyperfine './my-program'`, extract mean time. Lower is better."

Record:
- `METRIC_COMMAND`: the command to run
- `METRIC_EXTRACTION`: how to extract the numeric metric from output
- `METRIC_DIRECTION`: `lower_is_better` or `higher_is_better`

### 1.3 Define the Scope

Ask the user:

> **Which files or directories am I allowed to modify?**
>
> And which files are OFF LIMITS (read-only)?

Record:
- `IN_SCOPE_FILES`: files/dirs the agent may edit
- `OUT_OF_SCOPE_FILES`: files/dirs that must not be modified

### 1.4 Define Constraints

Ask the user:

> **Are there any constraints I should respect?**
>
> Examples:
> - Time budget per experiment (e.g., "each run should take < 2 minutes")
> - No new dependencies
> - Must keep all existing tests passing
> - Must not change the public API
> - Must maintain backward compatibility
> - VRAM/memory limit
> - Code complexity limits (prefer simpler solutions)

Record as `CONSTRAINTS`.

### 1.5 Define the Experiment Budget (Optional)

Ask the user:

> **How many experiments should I run, or should I just keep going until you stop me?**
>
> You can say a number (e.g., "try 20 experiments") or "unlimited" (I'll run until you interrupt).

Record as `MAX_EXPERIMENTS` (number or `unlimited`).

### 1.6 Simplicity Criterion

Inform the user of the default simplicity policy:

> **Simplicity policy (default):** All else being equal, simpler is better. A small improvement
> that adds ugly complexity is not worth it. Removing code while maintaining or improving
> the metric is a great outcome. I'll weigh the complexity cost against the improvement
> magnitude. Does this policy work for you, or do you want to adjust it?

Record any adjustments as `SIMPLICITY_POLICY`.

### 1.7 Confirm Setup

Summarize all parameters back to the user in a clear table:

| Parameter          | Value                        |
| ------------------ | ---------------------------- |
| Goal               | ...                          |
| Metric command     | ...                          |
| Metric extraction  | ...                          |
| Direction          | lower is better / higher ... |
| In-scope files     | ...                          |
| Out-of-scope files | ...                          |
| Constraints        | ...                          |
| Max experiments    | ...                          |
| Simplicity policy  | ...                          |

Ask the user to confirm. Do not proceed until confirmed.

---

## Phase 2: Branch & Baseline

Once the user confirms:

1. **Create a branch**: Propose a tag based on today's date (e.g., `autoresearch/mar17`).
   Create the branch: `git checkout -b autoresearch/<tag>`.

2. **Read in-scope files**: Read all files that are in scope to build full context of the current state.

3. **Initialize results.tsv**: Create `results.tsv` in the repo root with the header row:
   ```
   experiment	commit	metric	status	description
   ```
   Add `results.tsv` and `run.log` to `.git/info/exclude` (append if not already present) so they stay untracked without modifying any tracked files.

4. **Run the baseline**: Execute the metric command on the current unmodified code.
   Record the result as experiment `0` with status `baseline` in `results.tsv`.

5. **Report baseline** to the user:
   > Baseline established: **[metric_name] = [value]**
   > Starting autonomous experimentation loop.

---

## Phase 3: Experiment Loop

Run this loop continuously. Do not stop to ask the user. Run until:
- `MAX_EXPERIMENTS` is reached, OR
- The user manually interrupts

### For each experiment:

```
LOOP:
  1. THINK   - Analyze previous results and the current code.
               Generate an experiment hypothesis.
               Consider: what worked, what didn't, what hasn't been tried.

  2. EDIT    - Modify the in-scope file(s) to implement the idea.
               Keep changes focused and minimal per experiment.

  3. COMMIT  - git add + git commit with a short descriptive message.
               Format: "experiment: <short description of what changed>"

  4. RUN     - Execute the metric command.
               Redirect output to run.log so it does not flood the context window.
               Use shell-appropriate redirection:
               - Bash/Zsh: `<command> > run.log 2>&1`
               - PowerShell: `<command> *> run.log`

  5. MEASURE - Extract the metric from run.log.
               If extraction fails (crash/error), read the last 50 lines
               of run.log for the error.

  6. DECIDE  - Compare metric to the current best:
               - IMPROVED: Keep the commit. Update the "best" baseline.
                 Log status = "keep".
               - SAME OR WORSE: Revert. `git reset --hard HEAD~1`.
                 Log status = "discard".
               - CRASH: Attempt a quick fix (typo, import, simple error).
                 Amend the experiment commit (`git commit --amend`) with the fix
                 and rerun. The experiment keeps its original number.
                 If unfixable after 2 attempts, revert the entire experiment
                 (`git reset --hard HEAD~1`) and log status = "crash".

  7. LOG     - Append a row to results.tsv:
               experiment_number  commit_hash  metric_value  status  description

  8. CONTINUE - Go to step 1.
```

### Experiment Strategy

When generating experiment ideas, follow this priority order:

1. **Low-hanging fruit first**: Simple parameter tweaks, obvious inefficiencies.
2. **Informed by results**: If a direction showed promise, explore further in that direction.
3. **Diversify after plateaus**: If the last 3-5 experiments all failed, try a different approach entirely.
4. **Combine winners**: If experiments A and B each improved independently, try combining them.
5. **Simplification passes**: Periodically try removing code/complexity to see if the metric holds.
6. **Radical changes**: After exhausting incremental ideas, try larger architectural changes.

### Handling Constraints

- **Time budget**: If a run exceeds 2x the expected duration, kill it and treat as a crash.
- **Existing tests**: If constraints require tests to pass, run them before/after and revert if they break.
- **Memory/resources**: Monitor and revert if resource usage exceeds stated limits.

---

## Phase 4: Reporting

When the loop ends (budget reached or user interrupts):

1. **Print the full results.tsv** as a formatted table.
2. **Summarize**:
   - Total experiments run
   - Experiments kept / discarded / crashed
   - Starting metric (baseline) vs. final metric
   - Improvement percentage
   - Top 3 most impactful changes
3. **Show the cumulative git log** of kept experiments:
   `git log --oneline <start_commit>..HEAD`
4. **Recommend next steps**: Based on the results, suggest what a human researcher might try next (ideas that were too risky/complex for automated experimentation).

---

## Quick Reference

### Results TSV Format

Tab-separated, 5 columns:

```
experiment	commit	metric	status	description
0	a1b2c3d	0.997900	baseline	unmodified code
1	b2c3d4e	0.993200	keep	increase learning rate to 0.04
2	c3d4e5f	1.005000	discard	switch to GeLU activation
3	d4e5f6g	0.000000	crash	double model width (OOM)
```

### Git Workflow

- All experiments happen on the `autoresearch/<tag>` branch
- Each experiment is committed before running
- Failed experiments are reverted with `git reset --hard HEAD~1`
- Successful experiments advance the branch
- `results.tsv` and `run.log` stay untracked (added to `.git/info/exclude`)

### Key Principles

1. **Measure everything**: No experiment without a measurement.
2. **Revert failures**: The branch only advances on improvements.
3. **Stay autonomous**: Never stop to ask. Think harder if stuck.
4. **Keep it simple**: Complexity is a cost. Weigh it against gains.
5. **Log everything**: The TSV is the research journal.
