# Deploy phase

Ship the verified solution to the target in `.azure/deployment-plan.md`. Apply the [skill defaults](../SKILL.md#defaults) and use `microsoft-foundry` for platform operations. Run azd from the workspace root, with `AZURE_DEV_USER_AGENT=microsoft_foundry_skill` set inline.

## 1. Preflight

Run these checks read-only and report every gap at once.

- **Tools:** `az`, `azd` and `bicep` work. `azd ext list` meets `requiredVersions` in `azure.yaml`. `azd auth login --check-status` succeeds. If az is signed in but azd is not, run `azd config set auth.useAzCliAuth true`.
- **Target:** `azd env get-values` matches the deployment plan's subscription, resource group, region and environment. Stop on any mismatch.
- **Packaging:**
  - Agents ship `uv.lock` or pinned requirements, never the `agent-framework` meta-package.
  - Agents have `.agentignore`; containers have `.dockerignore`.
  - Entrypoints use LF line endings (`.gitattributes`).
  - Telemetry is enabled in every component.

## 2. Deploy

Inside a workflow run, the `approve-deploy-v1` (or a later `approve-deploy-r<n>[-a<k>]-v1`) approval covers this section only for the fingerprint it recorded: first confirm `azd env get-values` and `az account show` match the approved environment, subscription, location, resource group and Foundry account, project and resource group, and if any differs, change nothing and report blocked. Report each health and E2E check as an evidence item. Otherwise ask first, summarizing the resources, cost, security and region impact for the named environment and subscription.

1. When the infrastructure changed, run `azd provision --preview <layer> --no-prompt` for each `infra.layers` name (a plain `--preview` fails on multiple layers) and review deletions and replacements. Stop on surprises.
2. Run `azd up --no-prompt`, or `azd deploy --no-prompt` when the infrastructure is unchanged. Wait for it to finish, record the exit code, and read back the [grants after deploy](azd-layout.md#grants-after-deploy).
3. Read the endpoints from `azd env get-values` (`SERVICE_<NAME>_URI`, `AGENT_<NAME>_RESPONSES_ENDPOINT`). Confirm each container app has an active, healthy revision (`az containerapp revision list`).
4. For each agent, run:
   - `azd ai agent show <agent>` to get the endpoint and playground URL;
   - `azd ai agent invoke <agent> "<scenario>"`;
   - `azd ai agent monitor <agent> --session-id <id>`, with the ID from the invoke's `Session:` line, to read its logs.

   Retry 424 `session_not_ready` or 502 warm-up responses with backoff for up to 5 minutes.
5. Rerun the E2E suite against the deployed frontend at the concurrency recorded in `docs/verify.md`, plus every check it defers to Deploy.

## 3. Common failures

| Symptom | Fix |
| --- | --- |
| `QuotaExceeded`, `InsufficientQuota` | Rerun the placement check in another approved region, or lower capacity |
| `Conflict` (name taken), soft-deleted account | Add a suffix to the environment, or purge with approval |
| `ImagePullBackOff` | Check ACR push, AcrPull for the app identity and `AZURE_CONTAINER_REGISTRY_ENDPOINT` |
| `InvalidTemplate`, `InvalidResourceName` | Run `az bicep build`; check AVM versions and name limits |
| `AuthorizationFailed` | Run the RBAC preflight and hand the owner the grant block |
| `Hosted agents can only be called through the agent endpoint` | Call `{project}/agents/{agent}/endpoint/protocols/openai` with the `https://ai.azure.com/.default` scope |
| Agent dependency resolution fails | Pin sub-packages and their transitive imports |
| Hook fails with missing `AZURE_TENANT_ID` or an `AGENT_*` variable | Export it from `azd env get-values` in the hook; order hooks after deploy |

## 4. Record

1. Upsert `DEPLOYED_FRONTEND` in `.env`.
2. Write `docs/deploy.md` with:
   - the environment, subscription, resource group and region;
   - resources and agent versions;
   - endpoints and playground links;
   - check results;
   - cost drivers;
   - rollback (`azd deploy` of the previous version) and teardown (`azd down --purge`, then the Entra app registrations from `docs/implementation.md`, only with approval).
3. Refresh the root `README.md` with the overview, architecture, how to run and deploy, and links to all `docs/`.

## Gate

Pass only when:

- azd exits 0;
- revisions are healthy;
- each hosted agent answers;
- the deployed E2E suite and the deferred checks pass.

Report status, summary, artifacts, assumptions, issues, lessons, and endpoints as `{name, url}`.
