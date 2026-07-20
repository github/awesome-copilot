# Skill: Create Shepherd Task Post-Mortem

## Purpose

Create a comprehensive post-mortem report for a completed (or failed) `shepherd-task` run.

This skill is designed to be invoked from `shepherd-task-given-list.ps1` / `shepherd-task-given-list.sh` in a `finally` / `trap EXIT` path so it runs for **all outcomes**.

---

## Inputs

- `SHEPHERD_LOG_DIR` (**required**)  
  Absolute path to the shepherd run log directory (for example: `C:\Users\edburns\workareas\BRK206-02\28-python-agent-demo-remove-before-merge\shepherd-tasks-20260718-1827`).
- `SCRIPT_EXIT_CODE` (optional but recommended)  
  Exit code from the caller script, to classify success vs failure.
- `TASK_ISSUES` (optional)
- `BASE_BRANCH` (optional)
- `REPO` (optional)

---

## Required Output

Write the report to:

`<SHEPHERD_LOG_DIR>\YYYYMMDD-HHMM-post-mortem.md`

Use local time for `YYYYMMDD-HHMM`.

---

## Bundled Examples (style + structure references)

Use both of these as concrete examples:

1. `examples/dd-3029269-post-mortem-report.md`  
   (prior complete Java post-mortem; canonical sectioning and depth)
2. `examples/28-python-agent-demo-post-mortem.md`  
   (Python shepherd-task run post-mortem)

Match their structure and tone: concise executive summary, clear sectioning, metrics tables, explicit timeline, and action-oriented recommendations.

---

## Data Collection Procedure

Given `SHEPHERD_LOG_DIR`:

1. Validate the directory exists; fail clearly if it does not.
2. Collect all run artifacts from that directory:
   - `phase1-task-*.json`, `phase2-task-*.json`
   - `phase1-task-*.md`, `phase2-task-*.md`
   - any supporting markdown notes
3. Determine the parent campaign directory (`PARENT_DIR = dirname(SHEPHERD_LOG_DIR)`), then collect context files there:
   - `*memory*.md` (if present)
   - `*prompts.md` (if present)
   - `*job-logs.txt` (if present)
4. Extract quantitative metrics from JSON/MD artifacts:
   - issues/PRs touched
   - per-task phase durations
   - review rounds (`Comments generated`)
   - success/failure and failure signatures
   - idle/timeout markers
   - token usage where available (`assistant.message.outputTokens` / `inputTokens`)
5. Build the report so it is useful for both:
   - **successful runs** (throughput/convergence/quality)
   - **failed runs** (root cause and corrective actions)

---

## Report Structure (required)

1. **Section 1: Executive Summary**  
   High-level outcome, completion rate, elapsed time, key totals.
2. **Section 2: System Architecture**  
   CCA, CCRA, Local Copilot CLI responsibilities.
3. **Section 3: Per-Task Metrics**  
   Table with issue, PR, phase timings, rounds, comments, result.
4. **Section 4: Aggregate Statistics**  
   Totals/averages and convergence signals.
5. **Section 5: AI Credits and Token Usage**  
   Include measured values; state clearly when data is unavailable.
6. **Section 6: Wall-Clock Timeline**  
   Batch windows and notable events.
7. **Section 7: Failure Analysis (if any)**  
   Root cause(s), evidence, and fixes.
8. **Section 8: Observations and Recommendations**  
   What worked, what failed, and specific script/skill improvements.

Use Markdown tables for metrics and keep assertions tied to observable logs.

### Link Formatting (required)

Whenever an issue or PR is referenced in the report body, render it as a Markdown hyperlink using `REPO`:

- Issue format: `[#123](https://github.com/<REPO>/issues/123)`
- PR format: `[#456](https://github.com/<REPO>/pull/456)`

Apply this consistently in narrative text, metric tables, legends, and comparisons.
Do not leave plain-text references like `#123` or `PR #456` when `REPO` is known.

---

## Invocation Pattern

The caller should invoke this skill with a prompt like:

```text
Invoke skill `shepherd-task-create-post-mortem` with these inputs:

- SHEPHERD_LOG_DIR: <absolute-path>
- SCRIPT_EXIT_CODE: <code>
- TASK_ISSUES: <csv>
- BASE_BRANCH: <branch>
- REPO: <owner/repo>
```

---

## Guardrails

- Always produce a post-mortem file, even when the run fails.
- Do not require GitHub API/network calls unless local artifacts are insufficient.
- Prefer evidence from local run logs over assumptions.
- Keep report content factual and reproducible from the captured artifacts.
