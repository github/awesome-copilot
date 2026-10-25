---
name: foundry-agentic-loop
description: 'Build agentic solutions on Microsoft Foundry, GitHub and Azure: hosted agents, toolbox tools and skills, Foundry IQ grounding and a React/FastAPI app. Three modes: rapid prototyping in an existing Foundry project; spec-driven development (SDD), where the foundry-agentic-loop-workflow runs Specify, Implement, Verify and Deploy to create the Foundry project and deploy with azd, or one phase runs alone; and Improve, which refines this skill and the workflow from past runs. Use for Agentic Loop requests and canvas actions, or end-to-end agent solutions from architecture to Azure deployment. Not for isolated Azure administration or unrelated UI edits.'
---

# Foundry Agentic Loop

Coordinate the solution and use `microsoft-foundry` for platform operations. Explicit user choices override defaults. Reuse known context, ask only for missing decisions, read only the references a step needs, and report decisions, blockers and endpoints concisely.

## Bootstrap (once per session)

1. **Foundry skill.** If `microsoft-foundry` is unavailable, ask, then install it (`copilot plugin install azure@awesome-copilot`, or `gh skill install microsoft/azure-skills microsoft-foundry --agent github-copilot --scope project`) and reload skills.
2. **Canvas and workflow.** This plugin ships `foundry-agentic-loop-canvas` and `foundry-agentic-loop-workflow`, listed as `foundry-agentic-loop:<name>` or `<name>`. Call `extensions_manage` with `operation: "list"`. Never install extensions from a URL and never edit Copilot settings files. If one is listed under neither name, tell the user which is missing and that it ships with the plugin, then ask before running `copilot plugin install foundry-agentic-loop@awesome-copilot`; after they approve, call `extensions_reload` once. If one is disabled, tell the user to re-enable it in their extension settings and continue in a new session: running sessions keep it disabled, even after a reload. If one failed, `inspect` it and report its log. Without the canvas, continue in Chat; without the workflow, SDD cannot start, so offer rapid prototyping.
3. **Canvas.** When work starts from Chat, open it once: `open_canvas` with `canvasId: "foundry-agentic-loop-canvas"`, `instanceId: "foundry-agentic-loop"` and `input: { mode }`. Prompts that begin `[Agentic Loop canvas action]` come from the canvas; follow their target, approval and resume instructions literally.

## Choose the mode

| Signal | Mode |
| --- | --- |
| Root `AGENTS.md` has an Agentic Loop section | Its `mode`. Switch only when the user confirms, then rewrite the section |
| Canvas prompt or explicit choice | As stated |
| Existing Foundry project selected or named; fast prototype; no deployment pipeline needed | **Rapid prototyping**: [rapid.md](references/rapid.md) |
| Spec, new Foundry project, azd or IaC, CI-ready repo or full Azure deployment | **SDD**: [sdd.md](references/sdd.md) |
| Improve, learn from runs, or the canvas improve prompt | **Improve**: [improve.md](references/improve.md); measure changes with `node scripts/evals.mjs` (index, then run `--base <commit>`; exit 2 means evals are unavailable, so stop) |
| One named SDD phase, with no run active | Its guide ([Specify](references/specify.md), [Implement](references/implement.md), [Verify](references/verify.md) or [Deploy](references/deploy.md)) with the [SDD defaults](references/sdd.md#sdd-defaults) |

Otherwise ask once with the choices "Rapid prototyping (existing Foundry project)" and "SDD (new project, deployed with azd)".

**Lock it in.** Before any other workspace write (in the rapid preflight, or just before the SDD workflow starts), upsert the section from [agents-md-rapid.md](assets/agents-md-rapid.md) or [agents-md-sdd.md](assets/agents-md-sdd.md) into the root `AGENTS.md`: replace everything between its `foundry-agentic-loop` begin and end markers, or append it, keeping other content; then read it back. The section routes short commands such as `deploy` and locks the mode for Chat, the canvas and the workflow. Azure settings go only in `.azure/deployment-plan.md`, never in `AGENTS.md`. Improve mode never writes it.

## Defaults

- **Agents:** [Foundry hosted agents](references/foundry-hosted-agent.md) exposing the Responses API, Python 3.13, code deployment. Create them through `microsoft-foundry`'s `foundry-agent/create/quick-start-hosted.md` with the **Basic sample**, resolved through that skill, never a guessed URL. Use its advanced workflow only when quick-start cannot support a capability, keeping these defaults. Prompt agents only when requested.
- **Framework:** the Copilot SDK for agents that use runtime skills ([recipe](references/copilot-sdk-foundry.md), [reference agent](references/copilot-sdk-with-toolbox.py)); Microsoft Agent Framework for basic agents and explicit workflows. If a workflow also needs skills, clarify. One framework per agent.
- **Models:** rapid keeps the Basic sample's model deployment, or verifies and reuses a supplied one; SDD defaults to `gpt-5.4-mini` unless the spec needs otherwise. Run the joint placement preflight in [foundry-models.md](references/foundry-models.md) before creating resources. Never hard-code a replacement or silently duplicate a deployment.
- **Tools and knowledge:** one governed [Foundry toolbox](references/foundry-toolbox.md) for built-in tools, MCP connections and agent skills; agents use its endpoint, not hard-coded tool URLs. Private knowledge uses [Foundry IQ](references/foundry-iq-grounding.md) through the toolbox, with citations for supported claims and a deterministic insufficient-evidence response; test both. Add Search only when needed. Reuse run skills the user names from the [run catalog](references/run-skills-catalog.md) instead of regenerating them.
- **App:** React + Vite, FastAPI and FastMCP (streamable HTTP) on Azure Container Apps. Rapid deploys with `az containerapp up --name <app> --source <dir> --resource-group <rg> --environment <env>`; SDD uses [azd](references/azd-layout.md) with a `microsoft.foundry` layer plus a Bicep (AVM) app layer, `remoteBuild: true` and one ACR pulled by managed identity. Add services from the [reference architecture](references/reference-architecture.md) only when the solution needs them.
- **App access:** decide it from the data. When everything the app shows is sample, synthetic or deliberately public, default to no end-user sign-in, even for staff users; services still authenticate with managed identities and need no anonymous-session or identity-verification workarounds. When it shows private, sensitive or user-specific data, ask for the access model before deploying and default to internal ingress or Entra sign-in; anonymous access needs explicit approval. With sign-in, the API pre-authorizes the SPA, the spec states how automated browser tests get a user token, and Implement proves that token path as soon as the app registrations exist.
- **Identity and safety:** managed identities and least-privilege keyless RBAC ([contract](references/rbac-contract.md); [preflight](references/rbac-preflight.md) with [check_rbac_preflight.py](references/check_rbac_preflight.py)). Check management-plane, data-plane and role-assignment rights separately; subscription Owner does not grant Foundry data-plane roles. Plan roles for identities not yet created and verify actual principals after creation. No credentials in browser code or Git; Foundry guardrails on.
- **Observability:** OpenTelemetry from the backend, agents, MCP servers and model calls into one Application Insights connected to the project ([observability.md](references/observability.md)). Sensitive content capture stays off unless approved with redaction and retention controls.

## Workspace files

| File | Holds |
| --- | --- |
| `AGENTS.md` (root) | The mode lock and short-command routes; never Azure settings |
| `README.md` (rapid) or `docs/spec.md` (SDD, from the [spec template](assets/spec-template.md)) | The contract |
| `.azure/deployment-plan.md` | Every Azure setting, in both modes ([template](assets/deployment-plan-template.md)) |
| `.env` (Git-ignored) | What the canvas reads: `FOUNDRY_PROJECT` (full ARM ID, once validated or created), `LOCAL_FRONTEND` and `DEPLOYED_FRONTEND` (verified URLs only). Upsert, keep other keys and read back |
| `docs/LOOP.md` | Lessons ([template](assets/loop-template.md)) |
| `.agentic-loop/runs/<runId>.json` | SDD flight records, written by the workflow |
| `.devcontainer/devcontainer.json` | Optional dev container ([asset](assets/devcontainer.json)) |

## Working rules

- **Contract first.** Freeze service names, environment variables, protocols, endpoints, schemas, auth, streaming, errors and versions ([implementation-contract.md](references/implementation-contract.md)) before parallel work.
- **Integration first.** Pass the [hosted integration checkpoint](references/hosted-integration-checkpoint.md) with a minimal agent before building full orchestration, UI or backend: always a model request, plus a toolbox skill load and a safe MCP call only when the architecture needs them. Record excluded capabilities as `N/A` with the reason, never as passed, and never add unused ones to satisfy the checkpoint.
- **Evidence, not signals.** HTTP 200, exit 0 or `active` never pass alone; require terminal completion, schema-valid output, execution evidence and correlated traces. Fix with bounded diagnostics, not unchanged redeployments.
- **Wait by completion.** Provisioning, deployments, role-assignment propagation and agent readiness end when their command or status check says so: run the command synchronously with a long initial wait, or poll its status every 30-60 s against a stated deadline. Never chain fixed sleeps; keep coding while Azure works.
- **Subagents.** Before the checkpoint, parallelize only research and preflight. After it, give each worker a bounded goal, exclusive workspace-relative files or folders, skill references, verified context, the contract, acceptance checks and stop conditions. One owner (the coordinator, or the SDD phase lead) holds the contract and the shared files: `azure.yaml`, `infra/`, `docs/`, `.env`, `.azure/`, `.agentic-loop/`, `AGENTS.md` and the root lockfiles. Keep teams small, avoid recursive delegation, serialize shared Azure mutations and integrate centrally; worker success is not acceptance. Delegation grants no extra approval. Without subagents, work sequentially and say so.
- **Safety.** Reuse resources; confirm billable, security or compliance changes; delete without approval only a resource this build created whose provisioning failed; never sign in for the user; never report an unverified deployment as successful.
- **Workspace boundary.** Builds stay inside the workspace: read lessons only from its own `docs/LOOP.md`, scaffold from the Foundry samples and these references, and use code from other folders only when the user names them. Only improve mode reads past runs elsewhere.
- **Work IQ context.** Only when the user or a canvas prompt asks for it, query the `workiq` MCP server before clarifying questions, fold in only the requirements that matter, cite each by source type and confirm them. Never copy confidential content, personal data or secrets into the workspace; if Work IQ is unavailable or needs consent, say so and continue without it.
- **Companions and SDKs.** Verify installed SDK APIs against the latest stable release (or the newest stable one the build's package index serves, recording the gap) and lock versions before generating code; package sources beat stale guidance. Consult the [build catalog](references/build-skills-catalog.md) only for needed capabilities; respect pins, ask before installs and route third-party skill defects upstream.

## Lessons

Right after a fix is verified (the failing probe or an equivalent boundary check reruns successfully; an edit, commit or deployment alone is not resolution), upsert a lesson in the workspace's `docs/LOOP.md` from the [template](assets/loop-template.md) before unrelated work, then read it back. Keep user notes, update matching lessons instead of duplicating them, and never include secrets, raw `.env` values or payloads. The coordinator, or the SDD phase lead, owns writes; workers report evidence. Lessons never authorize skill edits or weaker gates; improve mode applies them with approval.
