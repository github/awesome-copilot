# Spec-driven development (SDD)

SDD turns a brief into a deployed, reproducible solution: a new Foundry project and Azure resources provisioned with azd and Bicep (AVM), keyless and monitored. The `foundry-agentic-loop-workflow` dynamic workflow runs four phases in sequence. Each phase runs in fresh-context subagents, follows its phase guide, must pass an evidence gate and leaves durable artifacts:

| Phase | Guide | Gate evidence | Artifacts |
| --- | --- | --- | --- |
| Specify | [specify.md](specify.md) | Independent review of EARS criteria, contract, workstreams, verification mapping, placement and RBAC verdict | `docs/spec.md`, `.azure/deployment-plan.md` |
| Implement | [implement.md](implement.md) | `azd provision`, hosted checkpoint, parallel workstreams integrated, builds and unit tests | `docs/implementation.md` |
| Verify | [verify.md](verify.md) | Local E2E and contract tests, independent spec-conformance review, agent evaluations | `docs/verify.md` |
| Deploy | [deploy.md](deploy.md) | `azd up`, health checks, deployed smoke and E2E tests | `docs/deploy.md` |

In each phase a lead does the work, a fresh-context reviewer reruns the checks, and fixers get up to `maxFixLoops` rounds. Only the reviewer's verdict passes a gate. Implement runs disjoint workstreams in parallel.

Phases reconcile existing artifacts instead of starting over, so reruns are safe. Lessons go to `docs/LOOP.md`. Each run writes a flight record to `.agentic-loop/runs/<runId>.json`, with status `running`, `awaiting-approval`, `blocked`, `deployed`, `verified` (or `specified`/`implemented` when `to` ends it early) or `error`, saved at the start, at the first step after a resume, at each gate and checkpoint, and at the end. A record that cannot be written pauses the run at `blocked-record-<step>`. One run is active per workspace: `.agentic-loop/active-run.json` holds its lease, and a second run refuses to start while that lease is under 30 minutes old.

## Start a run

1. **Check for a run.** List runs with `dynamic_workflows_manage` (`runs`) and match them to this workspace's `.agentic-loop/runs/` records. If one is running or paused, report it and offer to resume it instead of starting a second run.
2. **Preflight in Chat** (read-only): `az account show`, `azd auth login --check-status`, `azd ai agent --help` (azd Foundry extension), `microsoft-foundry` and the bootstrap. Report all gaps at once, and ask before installing or upgrading tools.
3. **Clarify once.** Ask, with choices, only the questions whose answers change the spec: users, data, tools, UX or compliance. Take the subscription, region and azd environment from the canvas prompt. Otherwise confirm the current az default subscription, leave the region to Specify's placement check, and derive a short environment name such as `claims-triage-dev`.
4. **Lock the mode.** Upsert the SDD section of the root `AGENTS.md` ([lock-in](../SKILL.md#choose-the-mode)). The workflow also writes it and refuses a workspace locked to rapid prototyping.
5. **Start** with `run_dynamic_workflow`, `name: "foundry-agentic-loop-workflow"`, and these `args`:

   | Arg | Purpose |
   | --- | --- |
   | `brief` | Required. Self-contained, with the user's answers and decisions |
   | `subscriptionId`, `location`, `environmentName` | Azure target when known |
   | `scenarioId` | Canvas prompt template |
   | `autonomy` | `gated` (default) pauses for spec approval; `auto` skips it |
   | `maxFixLoops` | Fix rounds per phase gate, 0–5 (default 2) |
   | `skipDeploy` | Stop after Verify |
   | `from` | Rerun from this phase; refused unless the latest record passed every earlier phase |
   | `to` | Last phase to run (default `Deploy`); `from` and `to` set to one phase run it alone |

   Pass `limits` only when the user sets them; defaults are 250 subagents, 4 concurrent and 12 hours of active time.
6. Report the run ID and the checkpoints ahead. The run continues in the background, posting phase and gate lines in Chat; the Foundry Agentic Loop canvas Build tab shows live agents. No input is needed until a checkpoint. Do not poll; the run notifies when it pauses or ends.

## Checkpoints and recovery

**Live status first.** For status, approve, resume or deploy requests, read the run with `dynamic_workflows_manage` (`runs`, then `inspect-run`) before its flight record. The run status is authoritative: a cancelled run keeps its last saved record status.

A pause posts a `Needs you:` line. Answer it in one message: what paused and why, the files to review, then the options as `ask_user` choices (approve or resume, change or fix first, leave paused).

| Pause | Meaning | Chat action on request |
| --- | --- | --- |
| `approve-spec-v1` | Spec ready for review | Summarize scope, assumptions, region and cost drivers; apply requested edits to the artifacts |
| `approve-spec-r<n>-v1` | The spec or plan changed since spec approval, before Implement round n | Summarize what changed; approving records the new fingerprint |
| `approve-deploy-v1` | Verified and ready to deploy (always pauses) | Summarize resources, cost, security and region impact; apply requested edits without deploying |
| `approve-deploy-r<n>-v1`, `approve-deploy-r<n>-a<k>-v1` | The deployment plan, spec, verify report or azd target changed since deploy approval, before round n or after its attempt k | Summarize what changed; approving records the new fingerprint |
| `blocked-record-<step>` | The flight record could not be written | Fix the path or permission shown, then resume |
| `blocked-<phase>-r<n>` | A gate failed after its fix rounds, a subagent ended twice without a report (usually a provider error), or a decision is needed (permissions, quota, cost, security) | List every issue from that phase and round in the flight record's `phases`, not just the first from the log. Fix and verify each root cause in the artifacts, record the evidence and `docs/LOOP.md` lessons. Resuming starts round n+1, which continues from the current state; its review first confirms these issues are resolved. To accept an issue instead, only on the user's explicit decision, write `[{"issue": "<exact issue>", "reason": "..."}]` to `.agentic-loop/waivers/<runId>.json` before resuming. After round 20, start a new run or rerun that phase alone with `from` and `to`. |

- Resume with `run_dynamic_workflow` and `resumeFromRunId` only when the user asks. When a canvas prompt says "Do not resume the run", don't: the canvas resumes it.
- **Liveness.** Workflow subagents don't appear in `list_agents` or `read_agent`, and one Implement step can run for over an hour without a record change. The canvas Build tab shows live subagent activity. Never cancel, pause or restart a run to unstick it; only the user decides that.
- **Provider errors.** A subagent that ends without a report is retried once with instructions to continue from the current state; a second miss blocks the phase, except for a workstream worker, which integration finishes. Check the session log, then resume.
- **Effort.** Subagents inherit the session's model and reasoning effort. Prefer medium or high: maximum effort multiplies step time.
- A run that ends in `error` with `workflow_limit_reached` resumes with only that limit raised, after approval. For other errors, read the run with `dynamic_workflows_manage` (`inspect-run`), fix the cause and start a new run.
- Never weaken a gate, skip a phase or report unverified checks as passed.
- For a single named phase, start the workflow with `from` and `to` both set to it; `from` alone also runs every later phase. Without the workflow, follow the phase guides yourself in order, checking each gate and pausing at the same approvals: ask before `azd provision`, `azd deploy` or `azd up`.

## SDD defaults

- **Placement:** a new resource group in the chosen subscription. Model `gpt-5.4-mini` unless the spec needs otherwise. Preferred region `eastus2` (`swedencentral` for EU data residency) unless the user chose one. The [joint placement check](foundry-models.md) decides before `AZURE_LOCATION` is persisted; record the preferred and deployed regions in the deployment plan.
- **Naming:** azd environment `<solution>-<stage>` in at most 20 characters; resource group `rg-<environment>`, set with `azd env set AZURE_RESOURCE_GROUP` right after scaffolding to replace the salted default. Check `az group exists` and add a short suffix on collision.
- **Skills first:** reusable agent behavior goes into Foundry skills authored at `skills/<name>/SKILL.md` and declared as `host: azure.ai.skill` services, so `azd deploy` versions them. Agents load them from the toolbox at runtime, so the image never copies `skills/`. Agents that use skills run on the Copilot SDK; basic agents and graph workflows use MAF.
- **Toolbox:** one `host: azure.ai.toolbox` service carries the skills, MCP tools (each through a `host: azure.ai.connection` service) and grounding. Agents list it in `uses` and map its `TOOLBOX_<NAME>_MCP_ENDPOINT` to `TOOLBOX_ENDPOINT` ([toolbox guide](foundry-toolbox.md)). Older azd extensions without upgrade approval fall back to ordered `postprovision` hooks.
- **Infra:** scaffold the Basic sample with `azd ai agent init .` in an empty `.scaffold` folder, then move it into place ([scaffold](azd-layout.md#scaffold-into-an-existing-workspace)); never `azd init -t <template>` followed by agent init (it rewrites the provider). `azure.yaml` then uses two `infra.layers`: `foundry` (`provider: microsoft.foundry`: account, project and the model deployments in `services.ai-project`) and `app` (Bicep with AVM, `dependsOn: [foundry]`) for user-assigned identities, Log Analytics and Application Insights connected to the project, one ACR pulled by managed identity, the Container Apps environment and apps, and every RBAC row. Agents use `host: azure.ai.agent`; MCP servers, backend and frontend use `host: containerapp` with `docker.remoteBuild: true`. Cosmos DB for NoSQL only when state is needed. No private networking unless required. Layout: [azd-layout.md](azd-layout.md).
- **Identity:** user-assigned managed identities. Bicep creates the [RBAC contract](rbac-contract.md) rows at provision; an idempotent `postdeploy` hook creates the runtime instance rows and the MCP Easy Auth allow-lists. The [RBAC preflight](rbac-preflight.md) runs in Specify; `BLOCKED` stops the run and hands the owner a ready-to-run grant block.
- **Repository:** `.gitignore` covers `.azure/*` with `!.azure/deployment-plan.md`, `.env` and build output. Python dependencies follow the [dependency contract](foundry-hosted-agent.md#python-dependency-contract-requirementstxt) and are locked with `uv.lock` or pinned requirements. `.gitattributes` sets `* text=auto eol=lf`.
- **Evaluations:** Verify always runs a small agent evaluation on spec scenarios (task adherence, intent resolution, and groundedness when grounded); content safety comes from Foundry guardrails. Add recurring or CI evaluations only on request.

## Teardown

Only on request and with explicit approval for the named environment and subscription: run `azd down --purge --force` from the workspace. It deletes the resource group and purges soft-deleted Foundry resources. Entra app registrations live outside the resource group: with the same approval, delete those recorded in `docs/implementation.md` with `az ad app delete --id <appId>`.
