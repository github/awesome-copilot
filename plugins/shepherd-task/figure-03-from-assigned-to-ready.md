# Figure 03: From Assignment to Ready for Review

This diagram shows the detail of the `shepherd-task-from-assignment-to-ready` skill, including its nested invocation of `shepherd-task-approve-workflows-and-wait-for-completion`. All of this runs inside a single `copilot --yolo` session (the Local Copilot CLI), which orchestrates interaction with the remote Copilot Coding Agent (CCA) via the GitHub API.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant CLI as Local Copilot CLI<br/>(copilot --yolo)
    participant GitHub as GitHub API / gh CLI
    participant CCA as Copilot Coding Agent<br/>(remote)
    participant ApproveWF as shepherd-task-approve-<br/>workflows-and-wait

    Note over CLI: Skill inputs: TASK_ISSUE, BASE_BRANCH, REPO

    rect rgb(220, 240, 255)
        Note over CLI,CCA: Step 1: Assign issue to @Copilot with base branch
        CLI->>GitHub: POST /repos/REPO/issues/TASK_ISSUE/assignees<br/>{ assignees: ["copilot-swe-agent[bot]"],<br/>  agent_assignment: { base_branch: BASE_BRANCH } }
        GitHub->>CCA: Trigger: issue assigned to Copilot
        Note over CCA: CCA creates topic branch from BASE_BRANCH,<br/>opens draft PR, pushes initial commits
    end

    rect rgb(230, 245, 230)
        Note over CLI,GitHub: Step 2: Poll for PR creation (up to 15 min, every 30s)
        loop Strategy A → B → C each iteration
            CLI->>GitHub: A: Issue timeline (cross-referenced PRs)
            CLI->>GitHub: B: PR body search for #TASK_ISSUE
            CLI->>GitHub: C: Title/branch name regex match
        end
        GitHub-->>CLI: PR #N found
        CLI->>GitHub: Verify base branch == BASE_BRANCH
    end

    rect rgb(255, 245, 220)
        Note over CLI,ApproveWF: Steps 3–5: Approve workflows (nested skill)
        CLI->>GitHub: Check for action_required workflow runs
        CLI->>ApproveWF: Invoke shepherd-task-approve-<br/>workflows-and-wait-for-completion<br/>with REPO, JTBDTASK_BRANCH, PR_NUMBER
        ApproveWF->>GitHub: gh run rerun (for each pending run)
        ApproveWF->>GitHub: gh pr checks --watch --fail-fast
        GitHub-->>ApproveWF: All runs complete
        ApproveWF-->>CLI: Workflows done
    end

    rect rgb(240, 230, 255)
        Note over CLI,GitHub: Step 6: Evaluate CI results
        CLI->>GitHub: gh pr checks PR_NUMBER<br/>--jq (exclude "No remove-before-merge directories")
        GitHub-->>CLI: Real failures? or All pass?
    end

    alt All CI checks pass and no unresolved reviews
        Note over CLI: Skip to Step 8–9
    else CI failures or unresolved review comments
        rect rgb(255, 230, 230)
            Note over CLI,CCA: Step 7: Iteration loop (max 20 rounds)
            loop Up to 20 iterations
                CLI->>GitHub: 7.1: Gather failed run logs<br/>gh run view RUN_ID --log-failed
                CLI->>GitHub: 7.2: Gather bot review comments<br/>from PR comments and reviews
                Note over CLI: 7.3: Compose "Request changes" review<br/>with log excerpts + fix instructions
                CLI->>GitHub: gh pr review PR_NUMBER --request-changes<br/>--body "@copilot Please fix..."
                GitHub->>CCA: Review notification: changes requested
                Note over CCA: CCA reads review, pushes fix commits
                CLI->>GitHub: 7.4: Poll for new commits<br/>(compare HEAD SHA, up to 10 min)
                GitHub-->>CLI: New SHA detected
                CLI->>ApproveWF: 7.5: Re-invoke approve-workflows skill
                ApproveWF->>GitHub: Approve & wait for new runs
                ApproveWF-->>CLI: Workflows complete
                CLI->>GitHub: Re-evaluate CI results
                Note over CLI: If all pass → break loop<br/>If failures remain → next iteration
            end
        end
    end

    rect rgb(230, 255, 230)
        Note over CLI,GitHub: Step 8: Check for unresolved pre-ready review comments
        CLI->>GitHub: Query review threads (CHANGES_REQUESTED)
        CLI->>GitHub: Query bot comments on PR
        Note over CLI: If unresolved comments exist,<br/>iterate using same Step 7 pattern<br/>(shares the 20-iteration budget)
    end

    rect rgb(220, 255, 220)
        Note over CLI: Step 9: Final status report
        Note over CLI: "SHEPHERD COMPLETE: PR #N for task<br/>#TASK_ISSUE is ready for marking<br/>as Ready for Review."
    end
```

## Notes

- The Local Copilot CLI acts as the **orchestrator** — it never modifies code itself in this phase. All code changes are made by the **remote Copilot Coding Agent (CCA)**.
- The `agent_assignment.base_branch` API parameter is the only reliable way to set the base branch. The simpler `gh issue edit --add-assignee` does not support this parameter, causing CCA to default to `main`.
- The "No remove-before-merge directories" CI failure is always ignored — it is expected on feature branches.
- The 20-iteration budget is shared between CI fix iterations (Step 7) and pre-ready review comment iterations (Step 8).
