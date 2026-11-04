<!-- foundry-agentic-loop:begin mode=sdd -->
## Agentic Loop: SDD workflow

This workspace is built with spec-driven development. For build requests and the short commands below, load the `foundry-agentic-loop` skill and follow its `references/sdd.md`; it checks the live run first and resumes a running or paused run instead of starting a second one.

| Command | Step |
| --- | --- |
| `status` | Report the live run from `dynamic_workflows_manage`, then the gate issues in its `.agentic-loop/runs/` record |
| `approve`, `resume` | Resume the paused run with `resumeFromRunId` |
| `deploy` | If a run is active, deploy only through it: at `approve-deploy-v1` or `approve-deploy-r<n>[-a<k>]-v1`, summarize it and resume it once approved; at any other pause, report where it stopped and resolve that first. With no active run, run the Deploy phase guide, which asks before `azd up` |
| `specify`, `implement`, `verify` | With no run active, run that phase guide on the existing artifacts |
| `build <brief>` | Offer to resume a running or paused run; otherwise start a new `foundry-agentic-loop-workflow` run |
| `improve` | Improve mode |

- The spec and contract live in `docs/spec.md`, lessons in `docs/LOOP.md` and Azure settings only in `.azure/deployment-plan.md`, never here.
- This section locks the build mode. Change it only when the user explicitly confirms a switch.
<!-- foundry-agentic-loop:end -->
