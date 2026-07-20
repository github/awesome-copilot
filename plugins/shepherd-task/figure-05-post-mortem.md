# Figure 05: Post-Mortem Report Generation

This diagram shows the detail of the `shepherd-task-create-post-mortem` skill. It is invoked from the `finally` block of `shepherd-task-given-list.ps1` (see Figure 01) so that a report is always generated, regardless of whether the run succeeded or failed.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant STGL as shepherd-task-given-list.ps1<br/>(finally block)
    participant Copilot as copilot --yolo
    participant Skill as shepherd-task-create-post-mortem
    participant LogDir as SHEPHERD_LOG_DIR<br/>(shepherd-tasks-YYYYMMDD-HHMM/)
    participant ParentDir as Parent Directory<br/>(campaign context)

    rect rgb(255, 245, 220)
        Note over STGL,Copilot: Invocation (runs on success OR failure)
        STGL->>Copilot: echo prompt | copilot --yolo<br/>"Invoke skill shepherd-task-create-post-mortem"<br/>with SHEPHERD_LOG_DIR, SCRIPT_EXIT_CODE,<br/>TASK_ISSUES, BASE_BRANCH, REPO
    end

    rect rgb(220, 240, 255)
        Note over Skill,LogDir: Step 1: Validate & collect run artifacts
        Copilot->>Skill: Invoke skill
        Skill->>LogDir: Validate directory exists
        Skill->>LogDir: Collect phase artifacts:<br/>• phase1-task-*.json (session data)<br/>• phase2-task-*.json (session data)<br/>• phase1-task-*.md (session shares)<br/>• phase2-task-*.md (session shares)
    end

    rect rgb(230, 245, 230)
        Note over Skill,ParentDir: Step 2: Collect campaign context from parent directory
        Skill->>ParentDir: Scan for supplementary files:<br/>• *memory*.md<br/>• *prompts.md<br/>• *job-logs.txt
    end

    rect rgb(240, 230, 255)
        Note over Skill: Step 3: Extract quantitative metrics from artifacts
        Note over Skill: Per-task metrics:<br/>• Issues and PRs touched<br/>• Phase 1 & Phase 2 durations<br/>• Review rounds (Comments generated: N)<br/>• Success/failure and failure signatures<br/>• Idle/timeout markers<br/>• Token usage (inputTokens / outputTokens)
    end

    rect rgb(255, 240, 230)
        Note over Skill: Step 4: Compose report (8 required sections)
        Note over Skill: §1 Executive Summary<br/>  — outcome, completion rate, elapsed time
        Note over Skill: §2 System Architecture<br/>  — CCA, CCRA, Local CLI responsibilities
        Note over Skill: §3 Per-Task Metrics<br/>  — table: issue, PR, timings, rounds, result
        Note over Skill: §4 Aggregate Statistics<br/>  — totals, averages, convergence signals
        Note over Skill: §5 AI Credits and Token Usage<br/>  — measured values or "data unavailable"
        Note over Skill: §6 Wall-Clock Timeline<br/>  — batch windows and notable events
        Note over Skill: §7 Failure Analysis (if any)<br/>  — root causes, evidence, fixes
        Note over Skill: §8 Observations & Recommendations<br/>  — what worked, what failed, improvements
    end

    rect rgb(220, 255, 220)
        Note over Skill,LogDir: Step 5: Write report
        Skill->>LogDir: Write YYYYMMDD-HHMM-post-mortem.md
        Note over Skill: Links use full URLs:<br/>[#123](https://github.com/REPO/issues/123)<br/>[#456](https://github.com/REPO/pull/456)
    end

    Skill-->>Copilot: Report written
    Copilot-->>STGL: Session complete
```

## Key Design Points

### Always Runs

The post-mortem skill is invoked from a `finally` block (PowerShell) or `trap EXIT` (Bash), so it executes for **all outcomes** — full success, partial failure, or early abort. The `SCRIPT_EXIT_CODE` input distinguishes these cases.

### Evidence-Based

The report is built entirely from local run artifacts (JSON session logs, markdown shares, OTEL traces). It does not require GitHub API calls unless local artifacts are insufficient, keeping it reliable even when network access is degraded.

### Structured for Both Outcomes

The 8-section structure serves both **successful runs** (throughput, convergence, quality metrics) and **failed runs** (root cause analysis, failure signatures, corrective actions). Sections are populated or marked "N/A" based on available data.

### Link Formatting

All issue and PR references are rendered as full Markdown hyperlinks using the `REPO` input — never plain-text `#123` references. Table-of-contents entries use plain text to avoid nested link issues.
