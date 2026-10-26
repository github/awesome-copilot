# azd layout for SDD solutions

Reference for the [Implement](implement.md) and [Deploy](deploy.md) phases. All names below are examples. Take the real names from `docs/spec.md`.

## Scaffold into an existing workspace

Specify leaves `docs/` and `.azure/` in the workspace. `azd ai agent init .` with `--no-prompt` declines a non-empty folder ("confirmation declined; app was not initialized"), and adoption rejects `--force`. Scaffold the first agent in an empty folder instead:

1. `mkdir .scaffold && cd .scaffold`, then run `azd ai agent init . -e <env> --no-prompt -t <azureYamlUrl> --deploy-mode code --runtime python_3_13 --entry-point main.py --agent-name <agent>`, taking the URL from the sample's `initCommand` (`-m` is deprecated). Add `--model <model>` when the spec differs from the sample default.
2. Move the sample folder (`.scaffold/src/<sample>`) to `src/agents/<agent>` and update that service's `project:` path in `azure.yaml`.
3. Move `azure.yaml`, `AGENTS.md` and `CLAUDE.md` to the root only when absent there; otherwise merge them, keeping the root `AGENTS.md` Agentic Loop section unchanged.
4. Copy `.scaffold/.azure/config.json` and `.scaffold/.azure/<env>/` into `.azure/`. Never move or overwrite `.azure/`: it holds `deployment-plan.md`.
5. Init git-stages its files: run `git rm --cached -r -q --ignore-unmatch .scaffold`, then `rm -rf .scaffold`, and check that `git status --short` lists no `.scaffold` path.
6. Write `.agentignore` (not `.azdignore`) in every agent folder, listing tests, evaluators, eval config, the Dockerfile, virtual environments and `.env*`, so the code package carries runtime files only.

Add further agents with `azd ai agent init --src`, as in Implement step 3.

## azure.yaml

Keep the `ai-project` block and the agent settings that the scaffold wrote, then add the extra services and the infra layers.

Declarative skill, connection and toolbox services need these extension versions:

- `azure.ai.agents` 1.0.0-beta.17 or later
- `azure.ai.connections` and `azure.ai.toolboxes` 1.0.0-beta.8 or later
- `azure.ai.skills` 1.0.0-beta.1 or later

Check the installed versions with `azd ext list`. Upgrade only with approval, using `azd extension update <id>`.

```yaml
requiredVersions:
  azd: '>=1.32.0'
  extensions:
    azure.ai.agents: '>=1.0.0-beta.17'
    azure.ai.connections: '>=1.0.0-beta.8'
    azure.ai.toolboxes: '>=1.0.0-beta.8'
    azure.ai.skills: '>=1.0.0-beta.1'
name: claims-triage
services:
  ai-project:                          # from the scaffold; models live here
    host: azure.ai.project
    deployments: [...]
  claims-policy:                       # Foundry skill: folder with SKILL.md
    host: azure.ai.skill
    uses: [ai-project]
    archive: skills/claims-policy
  claims-mcp:                          # FastMCP on Container Apps
    host: containerapp
    project: src/mcp/claims
    language: python
    docker: { path: Dockerfile, remoteBuild: true }
  claims-mcp-conn:
    host: azure.ai.connection
    uses: [ai-project, claims-mcp]
    category: RemoteTool
    target: ${MCP_CLAIMS_URL}
    authType: AgenticIdentityToken     # see "MCP auth"
    audience: ${MCP_CLAIMS_AUDIENCE}
    env:
      MCP_CLAIMS_URL: ${MCP_CLAIMS_URL}
      MCP_CLAIMS_AUDIENCE: ${MCP_CLAIMS_AUDIENCE}
  claims-tools:                        # writes TOOLBOX_CLAIMS_TOOLS_MCP_ENDPOINT
    host: azure.ai.toolbox
    uses: [ai-project, claims-policy, claims-mcp-conn]
    skills: [{ name: claims-policy }]
    tools:
      - type: mcp
        server_label: claims
        server_url: ${MCP_CLAIMS_URL}
        connection: claims-mcp-conn
        require_approval: never
    env: { MCP_CLAIMS_URL: ${MCP_CLAIMS_URL} }
  triage-agent:
    host: azure.ai.agent
    project: src/agents/triage-agent
    uses: [ai-project, claims-tools]
    # keep kind, name, codeConfiguration, protocols and container from the scaffold
    env:
      AZURE_AI_MODEL_DEPLOYMENT_NAME: ${AZURE_AI_MODEL_DEPLOYMENT_NAME}
      MODEL_API_BASE_URL: ${MODEL_API_BASE_URL}   # Copilot SDK agents; set after provision
      TOOLBOX_ENDPOINT: ${TOOLBOX_CLAIMS_TOOLS_MCP_ENDPOINT}
  backend:
    host: containerapp
    project: src/backend
    language: python
    docker: { path: Dockerfile, remoteBuild: true }
  frontend:
    host: containerapp
    project: src/frontend
    language: js
    docker: { path: Dockerfile, remoteBuild: true }
infra:
  layers:
    - name: foundry
      provider: microsoft.foundry
      path: infra/foundry              # README.md only
    - name: app
      provider: bicep
      path: infra/app
      dependsOn: [foundry]
```

### Rules for azure.yaml

- **Platform variables:** never set `FOUNDRY_*` or `AGENT_*` names in an agent's `env`, because the platform injects them. Deploy writes `AGENT_<SERVICE>_NAME`, `_VERSION` and `_<PROTOCOL>_ENDPOINT` to the azd environment.
- **Older extensions without upgrade approval:** remove the skill, connection and toolbox services. Recreate them in an idempotent `postprovision` hook that runs these commands in this order:
  1. `azd ai skill create|update <name> --file ./skills/<name>`
  2. `azd ai connection create <name> --kind remote-tool --target <url> --auth-type agentic-identity --audience <aud> --force`
  3. `azd ai toolbox create <name> --from-file <file>`

  See [foundry-toolbox.md](foundry-toolbox.md).
- **MCP auth:** the agent identity calls MCP tools through the connection ([rbac-contract.md](rbac-contract.md)).
  - **Keyless (default):** use `AgenticIdentityToken` with the MCP server's Entra app ID URI as the audience. The MCP server validates the token with Container Apps authentication, which must allow the agents' client IDs ([grants after deploy](#grants-after-deploy)). This needs an Entra app registration, which the deployer creates or which comes from the Microsoft Graph Bicep extension; record each one's display name and app ID in `docs/implementation.md` for teardown. If the tenant blocks app registrations, report the gate as `blocked`.
  - **No auth:** use `authType: None` only for read-only tools over synthetic or public data, with explicit approval. Record it as an assumption in the spec.

## infra/app (Bicep with AVM)

`main.bicep` sets `targetScope = 'resourceGroup'` and deploys to `AZURE_RESOURCE_GROUP`. The foundry layer creates `rg-<env>` first. The `microsoft.foundry` provider may put the account and project in its own group (`AZURE_FOUNDRY_RESOURCE_GROUP`, for example `rg-<env>-foundry`): reference them, and create their role assignments and project connection, in a module with `scope: resourceGroup(aiResourceGroupName)`.

Pin each AVM module to its latest version. Find it at `https://mcr.microsoft.com/v2/bicep/avm/res/<path>/tags/list`.

| Module or resource | Purpose |
| --- | --- |
| `managed-identity/user-assigned-identity` | One identity per app; pass its `AZURE_CLIENT_ID` to the app |
| `operational-insights/workspace`, `insights/component` | Log Analytics and Application Insights |
| `Microsoft.CognitiveServices/accounts/projects/connections@2025-04-01-preview` | Connects App Insights to the existing project. Set `category: 'AppInsights'`, `target` to the component ID, `authType: 'ApiKey'`, `isSharedToAll: true`, `credentials.key` to the connection string and `metadata: { ApiType: 'Azure', ResourceId: <component ID> }`. |
| `container-registry/registry` | Basic SKU with the admin user disabled; grant AcrPull to every app identity |
| `app/managed-environment` | Consumption profile, logs sent to the workspace |
| `app/container-app` ×n | See [Container app settings](#container-app-settings) |
| `Microsoft.Authorization/roleAssignments` | One per [RBAC contract](rbac-contract.md) row, such as backend → Foundry User on the account and apps → Monitoring Metrics Publisher. Reference roles by definition ID. |

### Container app settings

- Tag each app with `azd-service-name: <service key>`.
- Set the image to `empty(<app>Image) ? '<placeholder>' : <app>Image`, with `<app>Image` from `${SERVICE_<NAME>_IMAGE_NAME=}` and the first-provision placeholder `mcr.microsoft.com/azuredocs/containerapps-helloworld:latest`, so a re-provision keeps the deployed image.
- Pull images through `registries` with the app's identity.
- Set `targetPort` to the app's real port.
- Keep names to 32 characters or fewer.

### Grants after deploy

The hosted agent's runtime identities exist only after deploy. An idempotent `postdeploy` hook creates their [RBAC contract](rbac-contract.md) rows and the MCP allow-lists. For each agent:

1. Run `azd ai agent show <agent> --output json --no-prompt` and read the principal and client IDs of `instance_identity` and `blueprint`.
2. Grant the runtime rows to the instance principal only; the blueprint returns `PrincipalTypeNotSupported`. Check with `az role assignment list --assignee <id> --role <role> --scope <scope>` first, then run `az role assignment create --assignee-object-id <id> --assignee-principal-type ServicePrincipal` only when missing.
3. For each keyless MCP app (and any other Easy Auth app the agents call), allow the instance and blueprint client IDs of every agent whose toolbox reaches it: all agents for a shared toolbox. Store the sorted list comma-separated with `azd env set`, for example `MCP_ALLOWED_CLIENT_IDS`. Bicep `split()`s it into `validation.defaultAuthorizationPolicy.allowedApplications`, so a re-provision keeps it. With an empty list the toolbox's `tools/list` returns 403.
4. Patch the live apps: `az rest` GET `https://management.azure.com<appId>/authConfigs/current?api-version=2024-03-01`, set `allowedApplications`, then PUT.

Grants take 2–5 minutes to apply: retry the first hosted invoke with backoff until a fixed deadline instead of redeploying unchanged code. After `azd up` or `azd deploy`, confirm with `az role assignment list --assignee <principalId> --all` and each app's `authConfigs/current`; if anything is missing, run `azd hooks run postdeploy --no-prompt` and check again.

### Parameters

`main.parameters.json` maps values from the azd environment, including the foundry layer's outputs:

```json
{
  "parameters": {
    "environmentName": { "value": "${AZURE_ENV_NAME}" },
    "location": { "value": "${AZURE_LOCATION}" },
    "principalId": { "value": "${AZURE_PRINCIPAL_ID}" },
    "aiAccountName": { "value": "${AZURE_AI_ACCOUNT_NAME}" },
    "aiProjectName": { "value": "${AZURE_AI_PROJECT_NAME}" },
    "aiResourceGroupName": { "value": "${AZURE_FOUNDRY_RESOURCE_GROUP}" },
    "projectEndpoint": { "value": "${FOUNDRY_PROJECT_ENDPOINT}" },
    "mcpAllowedClientIds": { "value": "${MCP_ALLOWED_CLIENT_IDS=}" },
    "backendImage": { "value": "${SERVICE_BACKEND_IMAGE_NAME=}" }
  }
}
```

### Outputs

Each output becomes an azd environment variable:

- `AZURE_CONTAINER_REGISTRY_ENDPOINT` (container app deploys need it)
- `APPLICATIONINSIGHTS_CONNECTION_STRING`
- `SERVICE_<NAME>_URI` for each app
- `MCP_<NAME>_URL`, including the MCP route, for example `/mcp`

## App wiring

- **Backend:** receives `FOUNDRY_PROJECT_ENDPOINT`, the agent name and `AZURE_CLIENT_ID` as environment variables. It calls the agent's dedicated endpoint with a token for `https://ai.azure.com/.default`, as in the [hosted integration checkpoint](hosted-integration-checkpoint.md).
- **Frontend:** nginx serves the Vite build and proxies `/api` to `${BACKEND_URL}` through the nginx image's `templates/` substitution. This needs no CORS and no build-time URLs.
- **Telemetry:** every app receives `APPLICATIONINSIGHTS_CONNECTION_STRING` ([observability.md](observability.md)).
