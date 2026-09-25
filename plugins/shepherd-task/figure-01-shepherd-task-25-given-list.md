# Figure 01 — Stage 25 given-list batch orchestration

Stage 25 (`shepherd-task-25-given-list`) owns one serial run. It validates the durable campaign
manifest, creates a run manifest, dispatches issues one at a time, stops at the
first failure, finalizes the run manifest, and then invokes the post-mortem path
with that finalized result.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant GL as Stage 25: shepherd-task-25-given-list
    participant CM as shepherd-campaign.json
    participant RM as given-list run manifest
    participant ST as shepherd-task
    participant GH as GitHub
    participant PM as Stage 50 Copilot session

    User->>GL: ordered issue CSV, campaign directory
    GL->>GL: Validate argument shapes and required tools
    GL->>CM: Validate schema, campaign UUID, repo, non-main base, lesson mode
    CM-->>GL: Immutable campaign context including lesson mode
    GL->>GL: Require manifest directory match and campaign-lessons.md
    GL->>RM: Create unique run directory and status=running manifest

    loop Issues in supplied order
        GL->>ST: issue, campaign directory, run directory
        ST->>GH: Complete and verify stages 30 and 40
        alt Issue succeeds
            GH-->>ST: PR merged to campaign base and issue closed
            ST-->>GL: Exit 0
        else Issue fails
            ST-->>GL: Nonzero exit
            GL->>GL: Stop before later issues
        end
    end

    Note over GL,RM: EXIT/finally path runs for success and failure
    GL->>RM: Set completedAt, exitCode, and succeeded or failed status
    RM-->>GL: Finalized run result
    GL->>PM: Run stage 50 with finalized exit code and campaign/run inputs
    Note over PM,RM: RM now contains the completed outcome
    PM->>RM: Read finalized run identity, task list, and outcome
    PM->>PM: Read phase artifacts and write post-mortem
    PM-->>GL: Report result
    GL->>GL: Rescan JSON artifacts for secrets
    GL-->>User: Preserve original run result unless manifest finalization fails
```

The run directory name is
`shepherd-tasks-<campaign-uuid>-YYYYMMDD-HHMM`. A retry is a new stage 25
invocation and therefore a new run directory and run manifest.
