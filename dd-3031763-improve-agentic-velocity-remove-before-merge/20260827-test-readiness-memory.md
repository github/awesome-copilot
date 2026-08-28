### 16:24 Prompt

You stated:

> So the next concrete milestone is one small two-issue treatment campaign plus an equivalent `off` campaign, verifying the actual `campaign-lessons.md` evolution and confirming the second issue’s agent used the first issue’s validated guidance.

Let's run with this. My first question is whether or not the simple test app scenario baked into `awesome-copilot-01/plugins/shepherd-task/test/01-prepare-base-branch.ps1` is sufficient to get a result. Analyze `01-prepare-base-branch.ps1` and `awesome-copilot-01/plugins/shepherd-task/test/02-create-issues.ps1` for appropriateness for this experiment.

### 16:29 Response

Thought for 4s
I need to analyze the code without making changes right now. It looks like I have a partial read on the first file and should aim for the full view, targeting around 14k lines which is manageable under 20k. I also need to look closely at the issue plan and test content. If there are parallel views exceeding 20 lines, I might want to check that too. I’ll use specific range views to inspect both sections effectively.

I’ll evaluate whether the fixture creates a genuine cross-issue learning opportunity, whether stage 20 can create the required issues in the target repository, and whether the scripts support matched `campaign` and `off` runs without confounding differences.

Read 01-prepare-base-branch.ps1 L1:220 (220 lines read)
Read 01-prepare-base-branch.ps1 L221:end (160 lines read)
Read 02-create-issues.ps1 L1:220 (180 lines read)
Read 02-create-issues.ps1 view_range out of bounds

Search "math-tool|lesson|Task 1|Task 2|Phase|ISSUE_TYPE|EXAMPLE_ISSUES|SUPPORTING_ARTIFACTS|Accept… 229 lines found

Thought for 15s
I’m thinking about testing the mechanism, not its efficacy. I assume Pester 5 is preinstalled on ubuntu-latest, which might not be true for the current GitHub runner. That unpredictability could lead to lessons learned. It seems no CI workflow exists, and while the plan mentions CI, the deliverables only include two files and a gateway for local Pester. If there are no Actions, can it continue? The README needs to clarify these assumptions, but 01 doesn’t seem to create it, which is significant.
Thought for 8s
I’m looking at the A/B testing process. It’s important that there's no rollback if creation of a branch or issue fails, as it leaves a remote issue. This means I need to manage experiments carefully. I notice that it assumes the origin points to the repo without verification. This could lead to mishaps like pushing to the wrong origin. Also, it doesn't verify the current branch, which could create inconsistencies in campaign metadata across tasks. I’ll need separate clones for accurate A/B testing.
I’m considering the campaign's organization and notice there's an identical campaign shortname, but the directory name varies with the issue number. The hardcoded baseRemote origin seems to work well. It's important to identify the issue type as a Task for managing blockers. Each child issue is dependent in sequence, which is good. I note that it's just for PS; however, the cross-platform environment probably has PowerShell installed. Also, A/B testing with n=1 means I need to dig deeper into assumptions regarding the issue types.

The fixture can smoke-test the plumbing, but its current shape has several threats to a valid A/B result: the two campaigns may not start from the same commit, the target repository may not support `Task` issue types, and the four math tasks do not deliberately create a reusable discovery. I’m checking the repository prerequisites and stage-20 gates before giving a go/no-go recommendation.

Search "Enabling assumptions|issue type|Task|CI|workflow|Actions|repository|test" (plugins/shepher… 290 lines found
Search "ISSUE_TYPE|issue type|issueTypes|IssueType|SUPPORTING_ARTIFACTS|Campaign lessons" (skills/s… 88 lines found
Search "gh pr checks|no checks|required checks|check runs|CI checks|action_required" (skills/shephe… 77 lines found
Search "workflow|\.github|Pester|Install-Module|Invoke-Pester" (plugins/shepherd-task/test) 16 lines found

Thought for 45s
I’m thinking that task 01 doesn't verify if the repo matches the origin, which is something I should address. Maybe for examples, I could limit access and costs by using one or two small, stable example issues from the target repo. Pre-creating a template issue might help too. As for task 02, I noticed it doesn't verify the manifest lesson mode, but the interview script does load the manifest. It should test the generated issue body based on the mode.

Verdict: the scenario is suitable as a low-cost plumbing smoke test, but not sufficient as-is for a trustworthy lesson-propagation experiment. It can demonstrate that lesson sections move through the pipeline, but it currently cannot show that lessons materially helped the next issue.

```
┌───────────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐
│ Area                      │ Assessment                                                                         │
├───────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Serial dependency         │ Good. The four tasks incrementally modify the same files, so ordering is real.     │
├───────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Treatment/control option  │ Good. 01 persists campaign or off, and 02 passes it into stage 20.                 │
├───────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Cross-issue learning      │ Weak. Most likely “lessons” are already stated in the plan.                        │
│ opportunity               │                                                                                    │
├───────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Identical A/B starting    │ Not guaranteed. 01 branches from whatever commit is currently checked out.         │
│ state                     │                                                                                    │
├───────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ CI readiness              │ Insufficient. The fixture creates no workflow despite shepherd stages requiring    │
│                           │ substantive relevant CI.                                                           │
├───────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Issue creation            │ Blocked in personal repositories because 02 hardcodes issueType = 'Task'.          │
│ portability               │                                                                                    │
├───────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Experimental assertions   │ Insufficient. 02 validates issue creation, not treatment/control issue-body        │
│                           │ differences or lesson use.                                                         │
├───────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
│ Cost                      │ Higher than needed: four tasks and nineteen example issues for what should be a    │
│                           │ two-task smoke test.                                                               │
└───────────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘
```

`01-prepare-base-branch.ps1`

The four-step math application is deterministic, understandable, and inexpensive relative to a production campaign. Its gating criteria are concrete, and tasks 3.1–3.4 are genuinely serial.

The main problem is that the plan front-loads the knowledge that lessons would otherwise capture:

- It already explains the dot-sourcing/main-execution pattern.
- It already specifies Pester installation if unavailable.
- It already specifies `[bigint]`, parameter validation, output format, and file structure.

Stage 20 copies these resolutions into every issue. A lesson such as “guard execution when dot-sourcing” would therefore be redundant; issue 2 receives it whether propagation is on or off. Any difference between campaigns would mostly measure extra prompt text, not accumulated learning.

There are also setup problems:

1. No substantive CI workflow. The fixture promises “CI validation” but creates only the plan and campaign metadata. Stage 30 explicitly requires at least one relevant substantive check. The test repository needs a committed PowerShell/Pester workflow on the common baseline.
2. Uncontrolled baseline. The branch is created from current `HEAD`. Running treatment first and control second from the treatment branch would contaminate the control. Both campaigns must branch from the exact same immutable baseline SHA.
3. No remote/repository consistency check. GitHub issues are created in `-Repo`, but the branch is pushed to local remote `origin`. The script should verify that `origin` corresponds to `Repo`.
4. Uncertain Pester assumption. The plan declares that Pester 5 is preinstalled and offers installation as a fallback. For a controlled experiment, the baseline workflow should install or pin Pester deterministically rather than letting environment drift become the dominant variable.
5. Four issues are unnecessary. Two are enough to prove propagation and reduce paid agent, review, and post-mortem activity.

`02-create-issues.ps1`

The script correctly exercises stage 20 and verifies that four issues were created, linked, ordered, and body-verified. It also derives the lesson mode from the campaign manifest and prints the correct given-list invocation.

However:

1. `issueType = 'Task'` is a hard blocker unless the repository owner has an enabled `Task` issue type. The previously proposed personal `edburns/...` repository does not satisfy this requirement.
2. Nineteen `github/copilot-sdk` example issues are excessive and domain-mismatched. Stage 20 must fetch and study all of them. That adds cost and variance unrelated to lesson propagation. One or two stable examples are enough.
3. It always creates four issues. We could run only the first two, but that leaves two unused child issues and makes the campaign/post-mortem less clean.
4. It does not assert the experimental manipulation. After stage 20:
- treatment issue bodies should contain the correct campaign ID, lesson-reading instruction, and candidate-writing instruction;
- control issue bodies should contain none of those.
5. It does not define the expected transferable lesson. Without that, “issue 2 used issue 1’s lesson” becomes a subjective post-hoc judgment.

Recommended fixture adjustment

Use the same basic math application, but narrow it to two issues and introduce one deliberate, observable learning seam:

1. Issue 1: Implement Fibonacci plus tests and discover the repository’s canonical Pester invocation/environment constraint.
2. Issue 2: Add factorial while using the same test infrastructure. Its logs and result should make it possible to tell whether it consumed the validated operational lesson.

Before either campaign, create one shared baseline commit containing:

- a substantive PowerShell CI workflow;
- deterministic Pester installation/versioning;
- any repository instructions needed by both campaigns.

Then create separate `campaign` and `off` base branches from that exact SHA. Use an organization repository with the `Task` issue type enabled, or change stage 20 and the test harness to support untyped issues.

With those adjustments, this becomes a good mechanism test: it can prove candidate creation, stage-40 curation, atomic merge, and issue-2 consumption. One treatment and one control campaign still will not establish statistically meaningful productivity improvement, but it is sufficient for the first end-to-end result.
