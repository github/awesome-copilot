# Keyless identity & RBAC contract

Reference for the `foundry-agentic-loop` skill: the principal → scope → role matrix the deployment creates: the generated **Bicep at provision**, plus an idempotent **`postdeploy` hook** for the hosted-agent runtime instance identity, which exists only after agent deploy. `foundry-agentic-loop` declares the intent (managed identities + least-privilege RBAC, no admin keys or connection strings on the control/data plane); this file holds the full matrix and notes. Defer exact role GUIDs and `Microsoft.Authorization/roleAssignments` syntax to the maintained `microsoft-foundry/rbac` sub-skill.

Two matrices live here, and they answer different questions:

| Matrix | Principal | When it applies |
| --- | --- | --- |
| [Runtime matrix](#runtime-matrix-service-managed-identities) (below) | The solution's **managed identities** | Created **by** the deployment: Bicep at provision, plus a `postdeploy` hook for the runtime instance rows |
| [Deployer prerequisites](#deployer-prerequisites-pre-flight) | The **caller** running the loop | Must already exist **before provisioning**, or provisioning breaks partway through |

## Runtime matrix (service managed identities)

Every component authenticates with a **managed identity** (user-assigned preferred) and **least-privilege RBAC** - no admin keys, no connection strings on the control/data plane.

| Principal (managed identity) | Scope / target resource | Azure role | Why |
| --- | --- | --- | --- |
| Frontend container app | Azure Container Registry (ACR) | **AcrPull** | Pull the frontend container image |
| Backend container app | Azure Container Registry (ACR) | **AcrPull** | Pull the backend container image |
| Backend container app | Foundry **AI account** (AI Services / Foundry account) | **Foundry User** | Invoke Foundry hosted agents |
| Foundry **project** managed identity | Azure Container Registry (ACR) | **Container Registry Repository Reader** (or **AcrPull**) | Pull the **hosted-agent image** at runtime |
| Foundry **project** managed identity | Foundry **AI account** | **Foundry User** | Project-brokered model inference (usually auto-assigned at project creation) |
| Hosted-agent **runtime instance** managed identity | Foundry **AI account** | **Cognitive Services OpenAI User** (+ **Foundry User** if it calls non-OpenAI account capabilities) | **BYOK direct inference** (Copilot SDK / MAF calling the model endpoint with its own token) |
| Hosted-agent **runtime instance** managed identity | Foundry **project** | **Foundry User** | Runtime skill download (the `AIProjectClient` skills API needs `agents/read`; without it the hosted invoke returns 500) |
| Hosted-agent **agent identity** (`agentIdentityId`) | Each downstream tool/grounding resource (Storage, AI Search / Foundry IQ backing service, Cosmos, Key Vault, ...) | The resource's data role (e.g. **Storage Blob Data Contributor**, **Search Index Data Reader**) | Default toolbox MCP path: Agent Service brokers tool and grounding access with the agent identity |
| Hosted-agent **runtime instance managed identity** | Azure AI Search (Foundry IQ backing service) | **Search Index Data Reader** | Escape hatch only: direct in-code Search / Foundry IQ retrieval with `DefaultAzureCredential`; not part of the default toolbox path |
| Foundry **project** managed identity | Log Analytics workspace | **Log Analytics Data Reader** | Only when **Foundry Evals** are in scope (read traces) |
| Frontend container app | Application Insights | **Monitoring Metrics Publisher** | Send telemetry |
| Backend container app | Application Insights | **Monitoring Metrics Publisher** | Send telemetry |
| Hosted-agent **runtime instance** managed identity | Application Insights | **Monitoring Metrics Publisher** | Send telemetry |
| MCP server (container app) | Application Insights | **Monitoring Metrics Publisher** | Send telemetry |
| Deploying principal (`principalId` from `AZURE_PRINCIPAL_ID`) | Application Insights | **Monitoring Metrics Publisher** | Local Verify runs send telemetry (the one non-service row) |

- Scope **Foundry User** to the **AI account** (not a single project) so the backend can invoke any hosted agent in it. Foundry User is the renamed Azure AI User; in Bicep, reference built-in roles by definition ID, never by display name.
- **Model inference depends on the inference path.** Project-brokered inference as the **agent identity** is covered by *implicit access* — no role needed. **BYOK direct inference** (the Copilot SDK / MAF agent calling the model endpoint with a token from `DefaultAzureCredential`) authenticates as the **runtime instance managed identity**, which has **no** implicit access — grant it **Cognitive Services OpenAI User** at the **AI account** scope or inference fails with `401 PermissionDenied`. The **blueprint** principal rejects role assignments (`PrincipalTypeNotSupported`); use its client ID only in MCP Easy Auth allow-lists. azd only auto-assigns `Foundry User` to the shared project agent identity, so create the runtime instance rows in the idempotent `postdeploy` hook ([grants after deploy](azd-layout.md#grants-after-deploy)).
- Scope **Cognitive Services OpenAI User** to the AI account hosting the model deployment.
- **Tool/MCP and default Foundry IQ grounding access are authorized against the `agentIdentityId`, not the runtime MI** — Agent Service brokers an agent-identity token for `AgenticIdentityToken`/`AgenticIdentity` connections. On **publish**, the agent can get a **new** `agentIdentityId`; repeat these assignments (shared-project roles don't carry over).
- **Runtime instance MI Search access is an escape hatch, not the baseline.** Grant **Search Index Data Reader** to the runtime instance MI only when the agent performs direct in-code Search / Foundry IQ retrieval instead of consuming the brokered toolbox grounding tool. The instance identity is minted at deploy/publish time, so make that grant reproducible in a `postdeploy` hook if the escape hatch is used. See [`foundry-iq-grounding.md`](foundry-iq-grounding.md#escape-hatch-direct-in-code-retrieval).
- Scope **AcrPull** to the registry and use managed-identity image pull - keep the ACR admin user disabled.
- Assign roles to each app/agent's identity, not to a shared principal, so the matrix stays least-privilege and auditable.

## Deployer prerequisites (pre-flight)

Every row of the runtime matrix above is created **by the deployment**, which means the caller running the loop needs rights both to create the resources *and* to write those role assignments. Missing caller rights do not fail cleanly at the start - they fail on the first operation that needs them, **after** partial resources exist.

These assignments must therefore be verified **before provisioning** by the [RBAC pre-flight](rbac-preflight.md), which diffs this table against the caller's effective assignments and reports every gap in one list.

| Principal | Scope | Azure role | Why |
| --- | --- | --- | --- |
| Caller (deploying principal) | Subscription | **Contributor** | Create the resource group and every resource in the reference architecture |
| Caller (deploying principal) | Subscription | **Role Based Access Control Administrator** | `Microsoft.Authorization/roleAssignments/write` - the Bicep and the `postdeploy` hook create the runtime matrix rows |
| Caller (deploying principal) | Existing resource group | **Contributor** | Create every resource of the solution in the existing group |
| Caller (deploying principal) | Existing resource group | **Role Based Access Control Administrator** | Write the runtime matrix rows in the group (ACR pulls, App Insights publishers, Foundry access) |
| Caller (deploying principal) | Existing Foundry **AI account** | **Foundry Account Owner** | Create projects, model deployments and account resources (control plane) |
| Caller (deploying principal) | Existing Foundry **project** | **Foundry Project Manager**, or **Foundry User** plus an account control-plane role | Create and publish hosted agents, skills, toolboxes (data plane) and project connections (control plane) |

- **Broader satisfies narrower.** **Owner** satisfies Contributor *and* Role Based Access Control Administrator; **User Access Administrator** satisfies Role Based Access Control Administrator; **Foundry Owner** satisfies both Foundry rows; Owner, Contributor and Cognitive Services Contributor satisfy the account row. A fully-permissioned caller therefore reports no gaps rather than a wall of false positives.
- **Control plane is not data plane.** Owner, Contributor and Foundry Account Owner carry no `dataActions`, so a subscription Owner still cannot create agents, skills or toolboxes until it also holds **Foundry User** on the project. Foundry User carries no write actions, so it needs an account control-plane role to create project connections.
- **Match role definition IDs.** The Azure AI roles were renamed to Foundry roles and the old display names no longer resolve; the pre-flight and the Bicep use built-in role definition IDs.
- **Inheritance counts.** An assignment at the subscription applies to the resource group and to the Foundry account and project beneath it; the pre-flight resolves effective (inherited and group-derived) assignments, not just direct ones.
- **An existing resource group replaces the subscription rows.** When the run deploys into a group that already exists, its rows apply instead; subscription grants still satisfy them through inheritance. SDD creates `rg-<env>`, so its first provision checks the subscription rows.
- **Foundry scopes only exist after the account/project do.** On a greenfield run the account and project are created by the deployment, so the pre-flight checks the inherited subscription-scoped rights that will allow their creation, and re-checks the concrete Foundry scopes when they are supplied (a brownfield run against an existing project).
- Grant these to the caller once, up front - do not work around a gap by falling back to admin keys or connection strings, which would break the keyless contract above.
