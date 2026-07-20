# Figure 02: shepherd-task — Single Issue Orchestration

This diagram drills down into what happens inside `shepherd-task.ps1` for a single issue. It shows the two phases, the `copilot --yolo` sessions that invoke skills, and the independent state verification between phases.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant ST as shepherd-task.ps1
    participant GH as gh CLI
    participant Copilot as copilot --yolo
    participant Skill1 as shepherd-task-from-<br/>assignment-to-ready
    participant Skill2 as shepherd-task-from-<br/>ready-to-merged-to-base

    Note over ST: Receive TASK_ISSUE, BASE_BRANCH, REPO, LogDir

    rect rgb(230, 245, 230)
        Note over ST,GH: Idempotency check — skip Phase 1 if PR exists
        ST->>GH: Find-LinkedPR (timeline, body search, title/branch match)
        GH-->>ST: PR exists? → skip to verification<br/>No PR? → proceed to Phase 1
    end

    rect rgb(220, 240, 255)
        Note over ST,Skill1: Phase 1: Assignment to Ready for Review
        ST->>Copilot: echo phase1Prompt | copilot --yolo<br/>--output-format json --share phase1.md > phase1.json
        Note over Copilot: COPILOT_OTEL_FILE_EXPORTER_PATH set<br/>for telemetry capture
        Copilot->>Skill1: "Invoke skill<br/>shepherd-task-from-assignment-to-ready<br/>with TASK_ISSUE, BASE_BRANCH, REPO"
        Note over Skill1: Assign → wait for PR → approve workflows<br/>→ fix CI → iterate (max 20 rounds)<br/>(details in Figure 03)
        Skill1-->>Copilot: Skill complete
        Copilot-->>ST: Session exits
    end

    rect rgb(255, 240, 230)
        Note over ST,GH: Phase 1 Verification (script verifies independently via gh)
        ST->>GH: Find-LinkedPR → PR_NUMBER
        GH-->>ST: PR #N found
        ST->>GH: gh pr view — verify base branch = BASE_BRANCH
        GH-->>ST: Base branch OK (or fix it)
        ST->>GH: Test-CIPassing — all checks pass?
        GH-->>ST: CI passing ✓
        ST->>GH: Test-NoUnresolvedReviews — GraphQL review threads
        GH-->>ST: No unresolved comments ✓
        Note over ST: "Phase 1 VERIFIED: PR #N is ready"
    end

    rect rgb(230, 245, 230)
        Note over ST,GH: Idempotency check — skip Phase 2 if already merged
        ST->>GH: gh pr view — state == MERGED?
        GH-->>ST: Not merged → proceed to Phase 2
    end

    rect rgb(220, 230, 255)
        Note over ST,Skill2: Phase 2: Ready for Review to Merged
        ST->>Copilot: echo phase2Prompt | copilot --yolo<br/>--output-format json --share phase2.md > phase2.json
        Note over Copilot: COPILOT_OTEL_FILE_EXPORTER_PATH set<br/>for telemetry capture
        Copilot->>Skill2: "Invoke skill<br/>shepherd-task-from-ready-to-merged-to-base<br/>with TASK_ISSUE, BASE_BRANCH,<br/>REPO, PR_NUMBER"
        Note over Skill2: Mark ready → request review → resolve<br/>comments locally → push → merge<br/>(details in Figure 04)
        Skill2-->>Copilot: Skill complete
        Copilot-->>ST: Session exits
    end

    rect rgb(255, 240, 230)
        Note over ST,GH: Phase 2 Verification (script verifies independently via gh)
        ST->>GH: gh pr view — state == MERGED?
        GH-->>ST: MERGED ✓
        ST->>GH: gh pr view — merged into BASE_BRANCH?
        GH-->>ST: Correct base ✓
        ST->>GH: gh issue view — state == CLOSED?
        GH-->>ST: CLOSED ✓ (or close it)
    end

    Note over ST: "SHEPHERD TASK COMPLETE:<br/>PR #N merged to BASE_BRANCH"
    ST-->>ST: exit 0
```

## Key Design Points

- **Scripts verify state independently** — they don't trust `copilot` exit codes; they use `gh` CLI to confirm PR existence, CI status, and merge state between phases.
- **Idempotent** — if a PR already exists for the issue, Phase 1 is skipped. If already merged, Phase 2 is skipped. Safe to re-run after failures.
- **Each phase runs in a separate `copilot --yolo` session** — the skill instructions are read fresh each time.
