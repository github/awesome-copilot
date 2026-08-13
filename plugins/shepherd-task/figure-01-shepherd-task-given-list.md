# Figure 01: shepherd-task-given-list — Batch Dispatch

This diagram shows the highest-level orchestration: how `shepherd-task-given-list.ps1` takes a comma-separated list of issue numbers and dispatches them serially.

## Example Invocation

```powershell
shepherd-task-given-list.ps1 -LessonPropagation campaign -TaskIssues "51,52,53,54" -CampaignMetadataDirectory 2-example-remove-before-merge
```

## Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant STGL as shepherd-task-given-list.ps1
    participant ST as shepherd-task.ps1
    participant Copilot as copilot --yolo
    participant PostMortem as shepherd-task-50-create-post-mortem

    User->>STGL: lessonPropagation=campaign<br/>issues="51,52,53,54"<br/>campaign metadata directory

    Note over STGL: Validate campaign manifest and mode<br/>Create shepherd-tasks-CAMPAIGN-ID-YYYYMMDD-HHMM/

    Note over STGL: Parse comma-separated list<br/>into [51, 52, 53, 54]

    rect rgb(220, 240, 255)
        Note over STGL,ST: Serial loop — one issue at a time
        STGL->>ST: shepherd-task.ps1 -TaskIssue 51<br/>-CampaignMetadataDirectory ...<br/>-RunDirectory shepherd-tasks-CAMPAIGN-ID-.../
        ST-->>STGL: exit 0 (success)

        STGL->>ST: shepherd-task.ps1 -TaskIssue 52<br/>-CampaignMetadataDirectory ...<br/>-RunDirectory shepherd-tasks-CAMPAIGN-ID-.../
        ST-->>STGL: exit 0 (success)

        STGL->>ST: shepherd-task.ps1 -TaskIssue 53<br/>-CampaignMetadataDirectory ...<br/>-RunDirectory shepherd-tasks-CAMPAIGN-ID-.../
        ST-->>STGL: exit 0 (success)

        STGL->>ST: shepherd-task.ps1 -TaskIssue 54<br/>-CampaignMetadataDirectory ...<br/>-RunDirectory shepherd-tasks-CAMPAIGN-ID-.../
        ST-->>STGL: exit 0 (success)
    end

    rect rgb(255, 245, 220)
        Note over STGL,PostMortem: finally block — runs on success OR failure
        STGL->>Copilot: echo prompt | copilot --yolo<br/>"Invoke skill shepherd-task-50-create-post-mortem"
        Copilot->>PostMortem: Invoke with run and campaign context,<br/>SCRIPT_EXIT_CODE, TASK_ISSUES,<br/>BASE_BRANCH, REPO
        PostMortem-->>Copilot: Write YYYYMMDD-HHMM-post-mortem.md<br/>to log directory
        Copilot-->>STGL: Session complete
    end

    STGL-->>User: exit 0<br/>"All tasks shepherded successfully"
```

## Failure Behavior

If any `shepherd-task.ps1` invocation fails (non-zero exit), the loop stops immediately at that issue. The `finally` block still runs, invoking the post-mortem skill with the non-zero exit code so that a failure report is always generated.
