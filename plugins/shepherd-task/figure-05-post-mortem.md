# Figure 05 — Stage 50: run post-mortem

The given-list exit path invokes stage 50 for both successful and failed runs.
It supplies the original script exit code plus campaign and task-list context.

```mermaid
sequenceDiagram
    autonumber
    participant GL as Given-list EXIT/finally path
    participant PM as Stage 50 Copilot session
    participant RM as Run manifest
    participant Art as Phase artifacts
    participant Ctx as Campaign directory
    participant Out as Post-mortem Markdown

    GL->>PM: Run directory, original exit, issues, repo, base, campaign UUID, directory, lesson mode
    PM->>PM: Require existing run directory
    PM->>RM: Read campaign identity, task list, mode, timestamps, and current run state
    Note over RM: Caller finalizes exitCode and status after this session
    PM->>Art: Read phase JSON, shares, OTel, and supporting notes
    PM->>Ctx: Read available memory, prompts, and job logs
    PM->>PM: Calculate per-task timings, review rounds, failures, idle markers, and token usage
    alt Successful original run
        PM->>PM: Analyze throughput, convergence, and quality
    else Failed original run
        PM->>PM: Analyze root cause, evidence, and corrective actions
    end
    PM->>Out: Write timestamped eight-section Markdown report
    PM-->>GL: Report success or failure
    GL->>GL: Warn if report failed; preserve original run result
    GL->>RM: Finalize completedAt, exitCode, and status
```

The report contains an executive summary, system architecture, per-task
metrics, aggregate statistics, AI-credit/token data, a wall-clock timeline,
failure analysis when applicable, and actionable observations. When the
repository is known, issue and PR references are rendered as GitHub links.
