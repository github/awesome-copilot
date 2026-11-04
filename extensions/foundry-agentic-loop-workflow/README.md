# Foundry Agentic Loop workflow

A GitHub Copilot dynamic workflow that turns a brief into a verified Microsoft Foundry solution on Azure. It runs four phases in sequence:

1. **Specify**: EARS spec, frozen contract and deployment plan.
2. **Implement**: azd scaffold and provision, a hosted checkpoint, then parallel workstreams and integration.
3. **Verify**: local E2E, a hosted invocation, telemetry and evaluations.
4. **Deploy**: `azd up`, health checks and deployed E2E.

It ships with the `foundry-agentic-loop` plugin. The **SDD** mode of the `foundry-agentic-loop` skill starts it, and the Foundry Agentic Loop canvas shows its progress.

At setup, it adds the Agentic Loop SDD section to the workspace root `AGENTS.md` unless one exists. The section locks the workspace to SDD and routes short commands such as `deploy`, `status` and `resume` in later prompts. A workspace locked to rapid prototyping stops the run until Copilot converts the prototype to SDD.

One run is active per workspace. The run holds a lease in `.agentic-loop/active-run.json` (`runId`, `startedAt`, `heartbeatAt`), refreshes it with every flight record write and every five minutes, and releases it when it pauses, fails or finishes. A second run refuses to start while the lease is fresh (heartbeat under 30 minutes old) and names the active run; delete the file if that run is gone. A stale lease is taken over with a Chat line, and resuming a run takes its lease back. Every lease read-check-write runs under an exclusive `.agentic-loop/active-run.lock` folder, so two runs cannot both take over the same stale lease; a lock older than two minutes is left by a crash and must be deleted.

The workflow reads and writes its own files (`AGENTS.md`, `.agentic-loop/`, `.agentic-loop/runs/`, the record, lease and waiver files) only inside the workspace: a symbolic link on any of those paths, or a path that resolves outside the workspace, stops the run with an error instead of being followed. It never writes `docs/LOOP.md` itself; subagents do.

## How a phase runs

Each phase follows its guide in the `foundry-agentic-loop` skill (`references/specify.md`, `implement.md`, `verify.md` or `deploy.md`) in fresh-context subagents, using `microsoft-foundry` for platform operations. Subagents stay inside the workspace, read skills from the paths resolved at setup and delete only Azure resources the run created whose provisioning failed:

- **Lead**: does the phase work and records lessons in `docs/LOOP.md`.
- **Review**: an independent reviewer reruns every check and reports all blocking issues at once, with evidence. Earlier reports count as claims, not evidence.
- **Fix**: a fixer resolves the issues, then a new review first confirms each one is resolved before finishing its checks. This repeats up to `maxFixLoops` times.
- **Implement**: the foundation step plans up to four workstreams. If they own disjoint workspace-relative files outside the shared ones the lead keeps, such as `azure.yaml`, `infra/`, `docs/` and the root lockfiles, they run in parallel before integration; otherwise the build runs in sequence. Implement deploys only the hosted checkpoint services, and only when they changed; the app services deploy in Deploy.
- **Ownership**: before parallel workers start, overlapping or shared ownership falls back to a sequential build. After they finish, the workflow compares `git status` with a snapshot from before the fan-out and hands every changed path that no workstream owns to integration as an issue. It never reverts changes, and it skips the check outside a git repository.
- **Retry**: a subagent that ends without a report, usually after a provider error, is retried once and told to continue from the current workspace and Azure state. A second miss blocks the gate instead of spending fix loops; for a workstream worker, integration receives it as a failed workstream and finishes it.

The gate passes only on the reviewer's verdict. Reports are untrusted and fail closed: a `passed` report that still lists issues counts as `failed`, and in Verify and Deploy a `passed` report without `evidence` items (`{claim, source, result}`, at most 12) counts as `failed` with an issue asking for evidence. The gate's evidence is kept in the flight record.

## Checkpoints

| Checkpoint | When | Resume means |
| --- | --- | --- |
| `approve-spec-v1` | After Specify, when `autonomy` is `gated` and the run continues past Specify; or before Implement, when a gated run starts at Implement and no recorded spec approval matches the current spec and plan | The spec and deployment plan are approved for provisioning |
| `approve-spec-r<n>-v1` | Before gated Implement round n, when the spec or plan changed since the spec approval | The changed spec is approved again |
| `approve-deploy-v1` | Before Deploy, always | Deployment to the planned target is approved |
| `approve-deploy-r<n>-v1`, `approve-deploy-r<n>-a<k>-v1` | Before Deploy round n, or after its attempt k, when the approved files or azd target changed since the last approval | The changed plan is approved again |
| `blocked-<phase>-r<n>` | A gate failed after its fix loops, a subagent ended twice without a report, or a human decision is needed | The issue is resolved; round n+1 continues from the current state and re-checks it first |
| `blocked-record-<step>` | The flight record could not be written at a gate, checkpoint or other boundary, even after a retry | The cause is fixed; the record is saved before the run continues |

Each pause posts a `Needs you:` line in Chat that names the decision. The flight record lists every gate issue, and the canvas shows them. Resume with `run_dynamic_workflow` and `resumeFromRunId`, or from the canvas. Completed steps, including every subagent report, replay from the journal, so resuming never repeats finished work.

- **Final round:** a phase gets at most 20 rounds. The checkpoint after round 20 says the rounds are exhausted and that resuming ends the run; fix the root cause and start a new run, or rerun that phase alone with `from` and `to`.
- **Deploy approval:** approving deployment records a fingerprint in the flight record (`deployApproval`): the SHA-256 of `.azure/deployment-plan.md`, `docs/spec.md` and `docs/verify.md`, and the azd environment, subscription, location, resource group and Foundry target (`AZURE_FOUNDRY_RESOURCE_GROUP`, `AZURE_AI_ACCOUNT_NAME`, `AZURE_AI_PROJECT_NAME`) from `.azure/<env>/.env` (falling back to the args). Before every Deploy round and after every Deploy attempt, the workflow recomputes it and asks again through `approve-deploy-r<n>-v1` or `approve-deploy-r<n>-a<k>-v1` if anything changed, so no later step deploys and no gate passes on an unapproved change. Deploy subagents must confirm that `azd env get-values` and `az account show` match the fingerprint, and stop as blocked if they don't. A fix that needs to change an approved file or the target makes only that change, without deploying, and reports it.
- **Spec approval:** approving the spec records `specApproval`, the SHA-256 of `docs/spec.md` and `.azure/deployment-plan.md`. A gated rerun from Implement inherits it only while both still match, and otherwise asks again at `approve-spec-v1`, naming what changed. Before every gated Implement round, including one resumed after a pause, the workflow recomputes it and asks again at `approve-spec-r<n>-v1` if either file changed. A file that is missing or cannot be read, such as a link, never matches, for spec and deploy approvals alike.
- **Waivers:** only a human waives a gate issue. While the run waits at `blocked-<phase>-r<n>`, write `.agentic-loop/waivers/<runId>.json` (the same file name rule as the record) as `[{"issue": "<exact gate issue>", "reason": "..."}]`, then resume. The workflow accepts a waiver only when the file was written during that pause and the issue matches one of that checkpoint's issues, records it as `waivers: [{issue, reason, approvedAt, checkpoint}]`, deletes the file and lists accepted waivers in that phase's later prompts. Subagents never waive issues themselves.

Workflow subagents don't appear in `list_agents` or `read_agent`. The flight record is saved when the run starts, at the first step that runs after a resume, at each gate, checkpoint, Deploy skip and other journaled event, at the result and on failure, so a quiet hour inside one Implement step is normal. Every write is tried twice. If the record still cannot be written at setup, the run fails; at a later boundary it pauses at `blocked-record-<step>` with the path and error instead of continuing without a record. Only the best-effort saves at the first step after a resume and on failure log a `Flight record not saved` line and continue. A cancelled run keeps its last saved status, so the run status from `dynamic_workflows_manage` (`runs` or `inspect-run`) is authoritative. The canvas Build tab shows live subagent activity.

## Arguments

| Arg | Default | Meaning |
| --- | --- | --- |
| `brief` | required | Self-contained brief covering users, agents, data, tools and UX (20–20,000 characters) |
| `subscriptionId` | current `az` default | Target subscription GUID |
| `location` | `auto` | Preferred region. A joint model, quota and service placement check decides |
| `environmentName` | derived | azd environment name, 2–20 characters |
| `scenarioId` | none | Canvas prompt template that the run came from |
| `autonomy` | `gated` | `gated` pauses for spec approval; `auto` skips that pause |
| `maxFixLoops` | `2` | Fix rounds per phase gate, 0–5 |
| `skipDeploy` | `false` | End after Verify with status `verified` |
| `from` | `Specify` | Start at a later phase, for example `"Verify"`. Allowed only when the latest flight record in `.agentic-loop/runs/` passed every earlier phase; those phases are recorded as inherited (`round: 0`, `inheritedFrom`). Implement and Verify gates also record the SHA-256 of `docs/spec.md` and `.azure/deployment-plan.md` they passed on; if either changed since, the run refuses to inherit them and names the phase to start at. Otherwise the run refuses to start. `Deploy` cannot be combined with `skipDeploy` |
| `to` | `Deploy` (`Verify` with `skipDeploy`) | Last phase to run; later phases are recorded as skipped and the run ends with status `specified`, `implemented`, `verified` or `deployed`. Set `from` and `to` to the same phase to run only that phase. A run that ends at `Specify` skips the spec approval pause, and Deploy approval is asked only when Deploy runs |

For an unattended run from Specify through Verify, use `autonomy: "auto"` and `skipDeploy: true` with `copilot workflow run foundry-agentic-loop-workflow --args @args.json --result-file result.json`, where `--result-file` writes only the workflow result. Such a run can still pause at a `blocked-<phase>-r<n>` checkpoint, and with `autonomy: "gated"` or without `skipDeploy` it also pauses for approval. The CLI has no resume command, so continue a paused run from a Copilot session with its run ID.

## Limits

`META.limits` sets default ceilings; override them per invocation with `run_dynamic_workflow` `limits`, or raise the one that was reached when resuming a run that stopped on it.

| Limit | Default | Why |
| --- | --- | --- |
| `maxTotalSubagents` | `250` | Calls per round are lead + review + 2 per fix loop; Implement round 1 is foundation + up to 4 workers + integration + review. A run with no failures makes about 13 calls. With the default `maxFixLoops: 2` and three full rounds in every phase, it makes 4 × 3 × 6 + 5 = 77 calls, so 250 leaves about 3× for missing-report and schema retries. With `maxFixLoops: 5` and three rounds, it makes 149 calls. The theoretical ceiling, 20 rounds of 12 calls in all four phases (965 calls, and up to 4 spawns each with retries), is not a useful default |
| `maxConcurrentSubagents` | `4` | The workflow never runs more than four workstream workers at once |
| `timeoutSeconds` | `43200` (12 hours) | Active execution only, so paused time does not count. Provisioning, the hosted checkpoint and several fix rounds fit; a stuck run stops instead of consuming credits indefinitely |

Subagents poll long Azure operations every 30–60 seconds against an explicit deadline (20 minutes unless the phase guide sets another) and report `blocked` with the last status when it passes.

## Outputs

- **Workspace:** the `AGENTS.md` lock, `docs/spec.md`, `docs/implementation.md`, `docs/verify.md`, `docs/deploy.md`, the lessons in `docs/LOOP.md` and `.azure/deployment-plan.md`, which alone holds the Azure settings, plus the solution itself.
- **Flight record:** `.agentic-loop/runs/<runId>.json`. A run ID that is not 1–120 characters of `A-Z a-z 0-9 . _ -` becomes a sanitized prefix plus the first 8 hex characters of its SHA-256, so distinct IDs never share a file. It holds status, gates (with `evidence`), attempts, issues, lessons, checkpoints and endpoints, plus `waivers`, `deployApproval`, `ownership`, `rerun`, `skillProvenance` (per skill: source kind, path, plugin version and SHA-256 of `SKILL.md` and the phase guides) and `skillDrift` (hash changes seen when a later attempt starts). Improve mode in the `foundry-agentic-loop` skill learns from it.
- **Workspace lease:** `.agentic-loop/active-run.json` while a run is active.
- **Result:** `{ status, runId, phases, rounds, endpoints, flightRecord }`, where `status` is `deployed`, `verified`, or `specified`/`implemented` when `to` ends the run early.

## Tests

```bash
node --test extensions/foundry-agentic-loop-workflow/tests/*.test.mjs
```

Or run `npm test` from `extensions/foundry-agentic-loop-workflow`. `extension.mjs` only wires `lib/workflow.mjs` to the SDK, and a test loads it with the SDK replaced by a stub, because the repository's root `@github/copilot-sdk` can be older than the runtime's. When the Foundry Agentic Loop canvas sits next to this extension, a contract test checks that it reads the workflow's Chat lines, checkpoints, flight record path and `AGENTS.md` section, and validates Azure args the same way.
