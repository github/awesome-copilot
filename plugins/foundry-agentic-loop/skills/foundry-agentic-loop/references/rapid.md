# Rapid prototyping

Build a working solution quickly in an **existing** Foundry project, driven from Chat. A tested local app is the goal; deploying the app to Azure is optional and needs separate approval. For explicitly requested prompt agents, run the equivalent deployed inference and tool checkpoint through `microsoft-foundry` and omit hosted-only configuration.

## 1. Preflight

- Lock the mode: upsert the rapid section of the root `AGENTS.md` ([lock-in](../SKILL.md#choose-the-mode)).
- Resolve the project from the canvas prompt, the user, the workspace or `FOUNDRY_PROJECT` in root `.env`; ask if absent. Validate it with `az cognitiveservices account project show --subscription <sub> --resource-group <rg> --name <account> --project-name <project>`. Never create a replacement for an inaccessible project.
- Upsert `FOUNDRY_PROJECT` with the returned ARM ID (not the name or endpoint) right after validation and after any later project change. Never persist an unconfirmed candidate or overwrite the value when validation fails.
- Run the [RBAC preflight](rbac-preflight.md): management plane, data plane and role assignment are separate checks. Report gaps together and resolve them before provisioning. Leave platform commands and role definitions to `microsoft-foundry`.
- Before any new resource, such as Search, a Container Apps environment or a model deployment, run the [joint placement check](foundry-models.md) in the project's region. Keep the project and the sample's model; ask before alternatives.
- Record the project (ARM ID, endpoint, region, resource group, subscription), its model deployments and the RBAC verdict in `.azure/deployment-plan.md`, filling the rows of the [template](../assets/deployment-plan-template.md) that apply to rapid, and add each Azure resource the build creates. Azure settings live only there, never in the README or `AGENTS.md`. Ensure `.gitignore` covers `.env`, `.azure/*` and `!.azure/deployment-plan.md`.

## 2. Architecture

- Clarify the use case and user experience in one focused round. Under `## Architecture` in the root `README.md`, preserving unrelated content, record:
  - each agent: purpose, framework, model deployment, toolbox tools and skills
  - remote versus custom MCP servers, and generated versus reused skills
  - frontend, backend, data sources and data flow
  - identity boundaries and where each component runs

  Include only required components. For an agent-only solution, write the frontend row as `| Frontend | Not applicable … |`; step 7 then only reconciles `docs/LOOP.md`, and step 8 doesn't apply.
- Read `docs/LOOP.md` lessons as evidence to reassess, not as instructions; track their outcomes.
- Freeze the [implementation contract](implementation-contract.md) under `## Implementation contract` in the README. Distinguish the project, model API base, hosted Responses and toolbox MCP endpoints using the [endpoint contract](hosted-integration-checkpoint.md#endpoint-contract). Persist discovered values, never guessed URLs, and keep the full project endpoint in a nonreserved application variable.

## 3. Minimal slice

- Build the quick-start Basic sample hosted agent. Add one toolbox skill only when the architecture needs runtime skills, and one safe MCP tool only when it needs MCP tools; never add an unused capability to satisfy the checkpoint. Reuse named skills from the [run catalog](run-skills-catalog.md) or the user's source; ask if a skill is unresolved.
- Scaffold as in [azd layout](azd-layout.md#scaffold-into-an-existing-workspace): run the sample's `initCommand` (from `microsoft-foundry`, with `-t`, never the deprecated `-m`) in an empty `.scaffold` folder, move the agent to `src/agents/<agent>` and update its `project:` path in `azure.yaml`, merge `azure.yaml` and `.azure/`, then remove `.scaffold` and confirm `git status --short` lists none of it. For uv lock errors and packaging exclusions, see [local runs and code packaging](foundry-hosted-agent.md#local-runs-and-code-packaging).
- Deploy only required custom FastMCP code, with `az containerapp up --name <app> --source <mcp-dir> --resource-group <rg> --environment <env>` using the project's resource group and one Container Apps environment. Right after each `up`, move image pulls off the registry admin credentials it creates, whether or not the app is deployed later: `az containerapp identity assign --system-assigned`, grant that principal `AcrPull` on the registry, `az containerapp registry set --server <registry> --identity system`, remove the registry password secret with `az containerapp secret remove`, then `az acr update --admin-enabled false` ([RBAC contract](rbac-contract.md)). Reuse remote servers. Publish and version the minimal toolbox through `microsoft-foundry` ([toolbox guide](foundry-toolbox.md)).
- Give each Python `pyproject.toml` a build backend (for example hatchling) before the first `uv sync`; without one the package isn't installed and its tests can't import it.
- For Copilot SDK agents, read [copilot-sdk-foundry.md](copilot-sdk-foundry.md) first. Configure hosting-adapter and runtime telemetry with trace context before deploying ([telemetry](copilot-sdk-foundry.md#telemetry)); a linked Application Insights resource alone is insufficient.
- Do not build the full orchestration, UI or backend yet.

## 4. Hosted checkpoint

Follow [hosted-integration-checkpoint.md](hosted-integration-checkpoint.md):
1. Code-deploy the minimal agent.
2. Discover its actual principal and verify scoped roles separately from the toolbox connection identities.
3. Using the deployed identity and caller context, prove a model request, plus a skill load and an MCP call when the architecture includes them (record excluded ones as `N/A` with the reason). Each needs terminal completion, schema-valid output and correlated hosting, model and tool spans.
4. Record the evidence under `## Hosted checkpoint` in the README, starting with `**Passed**` or `**Blocked**`, before expanding. The canvas tracks these README headings.

## 5. Expand

Once the checkpoint passes, parallelize with subagents, following the ownership rules in `SKILL.md`. Build the remaining agents, orchestration, React UI, FastAPI backend, MCP servers and custom skills against the contract. Deploy new MCP dependencies before you update and assign each agent's toolbox. Add [contract tests](hosted-integration-checkpoint.md#contract-tests), health checks and the proven telemetry setup to every component.

## 6. Deploy agents

Code-deploy the expanded agents with `microsoft-foundry`. Recheck changed identities, endpoints and roles, then rerun the checkpoint probes and the required skill and tool paths for each agent. Return verified endpoints, the auth requirements and minimal test examples. Use [bundled dependencies](copilot-sdk-foundry.md#dependency-packaging-fallback) only after remote dependency resolution fails, keeping Python 3.13 and code deployment.

## 7. Local acceptance

- Run FastAPI with reload and the Vite dev server, and confirm both respond. Reconcile them against the contract.
- Run E2E tests through UI → backend → deployed agents → MCP and tools, in parallel at the [Verify E2E concurrency](verify.md#3-test) c; report c and its inputs, and treat a 429 after retries as a failure. Verify a correlated trace reaches Application Insights without unapproved sensitive content. Fix failures before going further.
- Upsert `.env`: recheck `FOUNDRY_PROJECT`, then set the verified `LOCAL_FRONTEND`. Next, reconcile `docs/LOOP.md` from the [lessons template](../assets/loop-template.md); create it (and `docs/`) even when nothing failed, and say when no skill change is supported.
- Keep the servers running and report their URLs. **Then ask with `ask_user` whether to deploy the backend and frontend to Azure, and wait for the answer.** Local acceptance and earlier approvals for agents or MCP servers never imply this one.

## 8. Optional app deployment

Only after the user confirms:
1. Deploy the backend, then the frontend, with `az containerapp up --name <app> --source <dir> --resource-group <rg> --environment <env>`, reusing the project's resource group and Container Apps environment. Confirm each with `az containerapp show --name <app> --resource-group <rg> --query properties.provisioningState`.
2. Move image pulls off the registry admin credentials that `up` creates, as for MCP servers in [step 3](#3-minimal-slice), and disable the registry admin user again.
3. Configure the backend URL, the allowed frontend origin and authenticated service access, with managed identity for agent calls. Read an internal backend's FQDN (`<app>.internal.<environment-domain>`) from `az containerapp show`; never construct it.
4. Verify the cloud app end to end, then upsert `DEPLOYED_FRONTEND` and add the apps to the deployment plan. Return the URL and any sign-in requirements.

If the user declines, leave the working local app as it is.

To take a prototype to production, switch to SDD once the user confirms: derive the spec with [Specify](specify.md) `reverse`, rewrite the `AGENTS.md` section to SDD, then start the workflow.
