# Figure 01: shepherd-task-given-list — Batch Dispatch

This diagram shows the highest-level orchestration: how `shepherd-task-given-list.ps1` takes a comma-separated list of issue numbers and dispatches them serially.

## Example Invocation

```powershell
shepherd-task-given-list.ps1 "51,52,53,54" edburns/dd-3034809-test-01 edburns/Build26-BRK206-your-agent
```

## Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant STGL as shepherd-task-given-list.ps1
    participant ST as shepherd-task.ps1
    participant Copilot as copilot --yolo
    participant PostMortem as shepherd-task-create-post-mortem

    User->>STGL: "51,52,53,54"<br/>edburns/dd-3034809-test-01<br/>edburns/Build26-BRK206-your-agent

    Note over STGL: Create timestamped log directory<br/>shepherd-tasks-YYYYMMDD-HHMM/

    Note over STGL: Parse comma-separated list<br/>into [51, 52, 53, 54]

    rect rgb(220, 240, 255)
        Note over STGL,ST: Serial loop — one issue at a time
        STGL->>ST: shepherd-task.ps1 -TaskIssue 51<br/>-BaseBranch edburns/dd-3034809-test-01<br/>-Repo edburns/Build26-BRK206-your-agent<br/>-LogDir shepherd-tasks-YYYYMMDD-HHMM/
        ST-->>STGL: exit 0 (success)

        STGL->>ST: shepherd-task.ps1 -TaskIssue 52<br/>-BaseBranch edburns/dd-3034809-test-01<br/>-Repo edburns/Build26-BRK206-your-agent<br/>-LogDir shepherd-tasks-YYYYMMDD-HHMM/
        ST-->>STGL: exit 0 (success)

        STGL->>ST: shepherd-task.ps1 -TaskIssue 53<br/>-BaseBranch edburns/dd-3034809-test-01<br/>-Repo edburns/Build26-BRK206-your-agent<br/>-LogDir shepherd-tasks-YYYYMMDD-HHMM/
        ST-->>STGL: exit 0 (success)

        STGL->>ST: shepherd-task.ps1 -TaskIssue 54<br/>-BaseBranch edburns/dd-3034809-test-01<br/>-Repo edburns/Build26-BRK206-your-agent<br/>-LogDir shepherd-tasks-YYYYMMDD-HHMM/
        ST-->>STGL: exit 0 (success)
    end

    rect rgb(255, 245, 220)
        Note over STGL,PostMortem: finally block — runs on success OR failure
        STGL->>Copilot: echo prompt | copilot --yolo<br/>"Invoke skill shepherd-task-create-post-mortem"
        Copilot->>PostMortem: Invoke with SHEPHERD_LOG_DIR,<br/>SCRIPT_EXIT_CODE, TASK_ISSUES,<br/>BASE_BRANCH, REPO
        PostMortem-->>Copilot: Write YYYYMMDD-HHMM-post-mortem.md<br/>to log directory
        Copilot-->>STGL: Session complete
    end

    STGL-->>User: exit 0<br/>"All tasks shepherded successfully"
```

## Failure Behavior

If any `shepherd-task.ps1` invocation fails (non-zero exit), the loop stops immediately at that issue. The `finally` block still runs, invoking the post-mortem skill with the non-zero exit code so that a failure report is always generated.
