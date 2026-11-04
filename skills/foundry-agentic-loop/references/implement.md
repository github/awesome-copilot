# Implement phase

Build what `docs/spec.md` specifies on the target in `.azure/deployment-plan.md`. Apply the [skill defaults](../SKILL.md#defaults) and use `microsoft-foundry` for platform operations. Reconcile existing code and infra; never re-scaffold over work.

Run azd from the workspace root, with `AZURE_DEV_USER_AGENT=microsoft_foundry_skill` inline on each azd command.

## 1. Scaffold

Skip any step whose result already exists.

1. Take the Basic sample's `manifestUrl` from `azd ai agent sample list --language python --output json` (the recommended Basic entry).
2. Scaffold the first agent as in [scaffold into an existing workspace](azd-layout.md#scaffold-into-an-existing-workspace): `azd ai agent init .` with `--no-prompt` in an empty `.scaffold` folder, then move it into place. Never run `azd init -t` first: agent init would rewrite the provider and nest the project.
3. Rename its service key to `<agent>`, point its `project` at `src/agents/<agent>`, and set the top-level `name` to the solution. For each further agent, copy a working agent folder to `src/agents/<name>` and run `azd ai agent init --src ./src/agents/<name> --agent-name <name> --no-prompt --deploy-mode code --runtime python_3_13 --entry-point main.py`.
4. `azd env set` each deployment-plan variable, one per command, with `AZURE_RESOURCE_GROUP` first. Read them back with `azd env get-values`.
5. Sanity-check `azure.yaml`:
   - `services.ai-project.deployments[]` is not empty.
   - There is no literal `{{…}}`.
   - Every `entryPoint` exists.
   - There is no duplicated `-2` agent service.

## 2. Infra and services

Lay out `azure.yaml`, `infra/foundry` and `infra/app` exactly as in [azd-layout.md](azd-layout.md):

- **Layers:** a Foundry layer, then a Bicep app layer.
- **Declarative services:** skills, MCP connections and the toolbox.
- **Apps:** Container Apps with `remoteBuild`.
- **Identity:** every row of the RBAC contract, plus a `postdeploy` hook for the runtime instance rows and MCP allow-lists ([grants after deploy](azd-layout.md#grants-after-deploy)).

Validate with `az bicep build --file infra/app/main.bicep`. Then run `azd provision --no-prompt`. Outside a workflow run, whose spec approval covers it, ask first, naming the checkpoint services this phase also deploys. Record the actual regions and resource groups, including the Foundry provider's group (`azd env get-value AZURE_FOUNDRY_RESOURCE_GROUP`), in the plan's Region, Resource groups and Environment variables rows, and any fallback with its reason in the plan and `docs/spec.md`, before continuing. Upsert `FOUNDRY_PROJECT` (the `AZURE_AI_PROJECT_ID` value) into the root `.env`. For Copilot SDK agents, discover the model account's `/openai/v1/` base and `azd env set MODEL_API_BASE_URL <url>` ([endpoint contract](hosted-integration-checkpoint.md#endpoint-contract)).

## 3. Build

1. **Contract first.** Code against the frozen contract in `docs/spec.md`. Contract changes go to the spec first.
2. **Integration checkpoint.** Pass the [hosted integration checkpoint](hosted-integration-checkpoint.md) before fan-out. Build a minimal agent that proves a model request, plus one toolbox skill load and one safe MCP tool call when the spec requires them; record excluded ones as `N/A`.
   1. Prove readiness and skill load locally with `azd ai agent run --no-client`, in the background, and `azd ai agent invoke --local "<probe>"`. `AgenticIdentityToken` tool calls work only hosted.
   2. Run `azd deploy <service>` for the MCP server, skill, connection, toolbox and agent services, in `uses` order.
   3. Prove the hosted version with `azd ai agent invoke <agent> "<probe>"`.
3. **Workstreams.** Build the spec workstreams in parallel when subagents are available. Each worker owns exclusive workspace-relative files or folders, runs its acceptance checks and reports needed changes elsewhere as issues. Shared files stay with the lead: `azure.yaml`, `infra/`, `docs/`, `.env`, `.azure/`, `.agentic-loop/`, `AGENTS.md` and the root lockfiles. After the workers finish, the workflow diffs `git status` against its pre-fan-out snapshot and hands any changed path outside the workstreams to integration as an issue.
4. **Integration.** Integrate centrally. Run builds, linters and unit tests, and lock Python dependencies (`uv.lock` or pinned versions).

**Deployments.** Implement deploys only the checkpoint services (MCP servers, skills, connections, toolbox and agents); the frontend, backend and workers run locally until Deploy. Reproduce agent defects locally first (`azd ai agent run` with `invoke --local`), and redeploy a hosted agent only for hosted-only behavior, once per verified fix. Redeploy only services whose source or configuration changed since their last verified deployment. After a transient `postdeploy` failure, rerun only the hook with `azd hooks run postdeploy`.

Agent code follows these references:

- [foundry-hosted-agent.md](foundry-hosted-agent.md)
- [copilot-sdk-foundry.md](copilot-sdk-foundry.md) or `microsoft-agent-framework`
- [foundry-toolbox.md](foundry-toolbox.md)
- [foundry-iq-grounding.md](foundry-iq-grounding.md)
- [observability.md](observability.md)

## 4. Record

Write `docs/implementation.md` with:

- the components and their files;
- an animated Mermaid flow of a request across the frontend, backend, agent, toolbox, model and telemetry;
- the env contract with the discovered endpoint values ([endpoint contract](hosted-integration-checkpoint.md#endpoint-contract));
- the checkpoint record and its evidence locations;
- how to run each component locally;
- deviations from the spec, with their reason.

Add microsoft-foundry's `AGENTS.md` marker (its quick-start Step 6) if missing, outside the foundry-agentic-loop markers.

## Gate

Pass only when:

- provisioning succeeded;
- the checkpoint has evidence;
- builds and unit tests pass;
- the backend calls the agent through its dedicated endpoint (`azd ai agent show`) with scope `https://ai.azure.com/.default`.

Report: status, summary, artifacts, assumptions, issues and lessons.
