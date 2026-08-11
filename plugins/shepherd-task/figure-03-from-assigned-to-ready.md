# Figure 03: From Assignment to Ready for Review

This diagram shows the detail of the `shepherd-task-30-from-assignment-to-ready` skill, including its nested invocation of `shepherd-task-approve-workflows-and-wait-for-completion`. All of this runs inside a single `copilot --yolo` session (the Local Copilot CLI), which orchestrates interaction with the remote Copilot Coding Agent (CCA) via the GitHub API.

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
        Note over CCA: CCA creates topic branch from BASE_BRANCH,<br/>opens draft PR, may push an empty<br/>Initial plan commit, then starts work
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
        CLI->>GitHub: Verify closingIssuesReferences<br/>contains TASK_ISSUE
        Note over CLI: PR discovery is a startup signal,<br/>not evidence of completed work
    end

    rect rgb(255, 245, 220)
        Note over CLI,CCA: Step 3: Wait for completed CCA implementation
        loop Poll up to 2 hours
            CLI->>GitHub: Query PR state, draft state,<br/>and CCA timeline events
            GitHub-->>CLI: latest copilot_work_started /<br/>copilot_work_finished
        end
        Note over CLI: Require latest finish >= latest start
        CLI->>GitHub: Query PR metadata, files,<br/>base commit tree, head commit tree
        Note over CLI: Require changed_files > 0,<br/>nonempty files API, and differing trees
    end

    rect rgb(235, 245, 255)
        Note over CLI,GitHub: Step 4: Verify issue requirements
        CLI->>GitHub: Read complete issue body and PR patches
        Note over CLI: Map every deliverable and acceptance<br/>criterion to concrete PASS evidence
        Note over CLI: Record HEAD_SHA as validation candidate
    end

    rect rgb(255, 245, 220)
        Note over CLI,ApproveWF: Steps 5–6: Approve workflows (nested skill)
        CLI->>GitHub: Check for action_required workflow runs
        CLI->>ApproveWF: Invoke shepherd-task-approve-<br/>workflows-and-wait-for-completion<br/>with REPO, JTBDTASK_BRANCH, PR_NUMBER
        ApproveWF->>GitHub: gh run rerun (for each pending run)
        ApproveWF->>GitHub: gh pr checks --watch --fail-fast
        GitHub-->>ApproveWF: All runs complete
        ApproveWF-->>CLI: Workflows done
        Note over CLI: Require relevant substantive checks<br/>for current HEAD_SHA; selector-only<br/>success cannot pass
        CLI->>GitHub: Query check runs for exact HEAD_SHA
        Note over CLI: Run every issue-specified gating<br/>command against HEAD_SHA
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
                Note over CLI: Discard all stale evidence;<br/>return to Step 3 and repeat<br/>every gate for the new SHA
            end
        end
    end

    rect rgb(230, 255, 230)
        Note over CLI,GitHub: Step 8: Check for unresolved pre-ready review comments
        CLI->>GitHub: GraphQL: paginated reviewThreads.isResolved<br/>and reviewDecision
        CLI->>GitHub: Query bot comments on PR
        Note over CLI: If unresolved comments exist,<br/>iterate using same Step 7 pattern<br/>(shares the 20-iteration budget)
    end

    rect rgb(220, 255, 220)
        Note over CLI,GitHub: Step 9: Atomic final readiness gate
        CLI->>GitHub: Re-query PR, CCA lifecycle, diff,<br/>checks, workflows, and reviews
        CLI->>GitHub: Query HEAD SHA again after all gates
        alt HEAD changed or any gate failed
            Note over CLI: Discard results and return to Step 3,<br/>or fail closed for manual intervention
        else Same HEAD and every gate passed
            Note over CLI: "SHEPHERD COMPLETE: PR #N for task<br/>#TASK_ISSUE is ready for marking<br/>as Ready for Review."
        end
    end
```

## Notes

- The Local Copilot CLI acts as the **orchestrator** — it never modifies code itself in this phase. All code changes are made by the **remote Copilot Coding Agent (CCA)**.
- A linked draft PR, an `Initial plan` commit, passing selector checks, or an absence of comments is not evidence that CCA implemented the issue.
- The phase fails closed unless one unchanged HEAD SHA satisfies the CCA lifecycle, effective-diff, issue-requirement, gating-command, relevant-CI, and review gates.
- Any new HEAD SHA invalidates prior evidence and restarts validation at Step 3.
- The `agent_assignment.base_branch` API parameter is the only reliable way to set the base branch. The simpler `gh issue edit --add-assignee` does not support this parameter, causing CCA to default to `main`.
- The "No remove-before-merge directories" CI failure is always ignored — it is expected on feature branches.
- The 20-iteration budget is shared between CI fix iterations (Step 7) and pre-ready review comment iterations (Step 8).
