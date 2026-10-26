# RBAC pre-flight

Reference for the `foundry-agentic-loop` skill: the permission gate that runs **before any provisioning** in an agentic loop run, so missing role assignments are reported as one complete list *before* anything is created — never discovered one failure at a time, halfway through provisioning.

> **Why this exists.** An agentic loop run hit RBAC failures on the subscription, then the resource group, then the Foundry project. Each surfaced mid-provisioning, after partial resources already existed, and each had to be chased separately: request a grant, re-run, hit the next one. The whole set of missing assignments was knowable up front. This step makes it knowable up front.

This step is deliberately self-contained — it needs only the caller identity and the scopes in play — so rapid prototyping, SDD Specify and Deploy preflights reuse it unchanged.

## What it checks

The [runtime matrix](rbac-contract.md#runtime-matrix-service-managed-identities) describes the solution's **managed identities** — principals that do not exist yet before provisioning. The pre-flight checks the other half of the contract: the [**deployer prerequisites**](rbac-contract.md#deployer-prerequisites-pre-flight), the rights the **caller** needs both to create the resources and to write every role assignment the generated Bicep will create.

Concretely:

1. **Enumerate required** assignments from the deployer-prerequisites table.
2. **Resolve effective** assignments for the caller at each scope in play — subscription, resource group, Foundry AI account, and Foundry project — including **inherited** and **group-derived** ones.
3. **Diff** required against effective, applying role equivalence (see below).
4. **Report every gap at once** as `principal → scope → role`, with a remediation block a subscription owner can run as-is.
5. **Fail fast** on any gap. Nothing has been provisioned at this point, so there is no partial state to unwind.

### Scopes

| Scope | Resolved from | Notes |
| --- | --- | --- |
| Subscription | `AZURE_SUBSCRIPTION_ID` / `--subscription` | Checked when no existing resource group is in play: the run creates the group. |
| Resource group | `AZURE_RESOURCE_GROUP` / `--resource-group` | When the group **exists**, its rows replace the subscription rows; subscription grants still count through inheritance. A named group that does not exist yet falls back to the subscription rows. |
| Foundry AI account | `AZURE_AI_ACCOUNT_ID` / `--ai-account` | Pass when the run creates model deployments or other account resources in an existing account. |
| Foundry project | `AZURE_AI_PROJECT_ID` / `--ai-project` | Pass for every run against an existing project, such as rapid prototyping. |

Greenfield SDD runs create the resource group, account and project, so only the subscription rows apply. Brownfield runs check the concrete scopes as well, which is where per-resource grants diverge from subscription-level ones.

### Role equivalence

Roles are matched by **built-in role definition ID**, not display name. The Azure AI roles were renamed (Azure AI User → **Foundry User**, Azure AI Project Manager → **Foundry Project Manager**, Azure AI Account Owner → **Foundry Account Owner**, Azure AI Owner → **Foundry Owner**) and the old names no longer resolve in `az role assignment create`. Legacy names are still accepted in `--from-file` input. Custom roles are not evaluated: confirm them manually and record the exception.

A requirement is satisfied by an **equivalent-or-broader** assignment, so a fully-permissioned caller produces no findings rather than a wall of false positives:

| Requirement | Satisfied by |
| --- | --- |
| Deploy resources (subscription or existing resource group) | Contributor, Owner |
| Write role assignments (same scope) | Role Based Access Control Administrator, Owner, User Access Administrator |
| Foundry account control plane | Foundry Account Owner, Foundry Owner, Owner, Contributor, Cognitive Services Contributor |
| Foundry project: agents, skills, toolboxes, connections | Foundry Project Manager, Foundry Owner, or Foundry User (or Cognitive Services User) **plus** an account control-plane role |

Assignments **inherited** from a broader scope also satisfy a narrower one: subscription Contributor satisfies the resource-group Contributor requirement.

> **Control plane and data plane are separate.** Owner, Contributor, Foundry Account Owner and Cognitive Services Contributor grant `Microsoft.CognitiveServices/*` *actions* but no `dataActions`, so on their own they cannot create agents, skills or toolboxes. Foundry User grants the `dataActions` but no write actions, so on its own it cannot create project connections. A subscription Owner therefore still needs Foundry User on the project: the gap that surfaced *separately*, after the subscription and resource-group ones had already been fixed.

## Running it

```bash
# Reference check — copy references/check_rbac_preflight.py from the foundry-agentic-loop skill into ./scripts/
# SDD (greenfield): subscription only
python ./scripts/check_rbac_preflight.py --subscription "$AZURE_SUBSCRIPTION_ID"
# Rapid prototyping (existing project): add the group and project, and the account if the run creates deployments
python ./scripts/check_rbac_preflight.py --subscription "$AZURE_SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" --ai-project "$FOUNDRY_PROJECT"
```

Live mode shells out to the **Azure CLI** — `az ad signed-in-user show` to resolve the caller, `az group exists` for a named resource group, then `az role assignment list --assignee <id> --scope <scope> --include-inherited --include-groups` per scope. No extra Python dependencies, and `az` is already present in any azd-driven run. Pass `--assignee` to check a principal other than the signed-in user (a service principal or CI identity).

`--from-file <observed.json>` replays a recorded set of assignments (or raw `az role assignment list` output) instead of calling Azure; raw output names no principal, so pass `--assignee` with it. Malformed input is an ERROR, never a PASS. Both the pass and the fail path can be exercised without a subscription.

## Verdicts

| Verdict | Exit code | Meaning |
| --- | --- | --- |
| `PASS` | `0` | Every required assignment is satisfied. **One** summary line is printed (`--quiet` prints nothing) — a fully-permissioned run adds no noise to the loop's output. |
| `BLOCKED` | `2` | One or more required assignments are missing. The full list is printed. **Do not start provisioning.** |
| `ERROR` | `1` | The check could not be evaluated (no caller identity, `az` unavailable, CLI failure). Resolve it rather than skipping the gate. |

`BLOCKED` is not a repair loop — unlike the [hosted integration checkpoint](hosted-integration-checkpoint.md#diagnostic-decision-tree), the loop cannot grant itself permissions. The correct response is to hand the report to someone who can, then re-run the pre-flight.

## Report contract

Print **every** missing assignment, not the first one — being handed the complete set in one go is the entire point:

```text
RBAC pre-flight: BLOCKED -- 2 required role assignments are missing.

  principal: sara@contoso.com (b3f1...c2a9)

  MISSING  sara@contoso.com -> /subscriptions/<sub-id>/resourceGroups/rg-app
           grant:   Role Based Access Control Administrator (f58310d9-a9f6-439a-9e8d-f62e7b41a168)
           accepts: Role Based Access Control Administrator | Owner | User Access Administrator
           why:     Microsoft.Authorization/roleAssignments/write - create the runtime matrix rows in the resource group
  MISSING  sara@contoso.com -> /subscriptions/<sub-id>/resourceGroups/rg-app/providers/Microsoft.CognitiveServices/accounts/aif-app/projects/proj
           grant:   Foundry User (53ca6127-db72-4b80-b1b0-d745d6d5456d)
           accepts: Foundry Project Manager | Foundry Owner | Foundry User (or Cognitive Services User) plus Foundry Account Owner, Owner, Contributor or Cognitive Services Contributor
           why:     Create and publish hosted agents, skills, toolboxes (data plane) and project connections (control plane)

Ask a subscription owner to run (role definition IDs are stable across renames):

  az role assignment create --assignee "b3f1...c2a9" --role "f58310d9-a9f6-439a-9e8d-f62e7b41a168" --scope "/subscriptions/<sub-id>/resourceGroups/rg-app"
  az role assignment create --assignee "b3f1...c2a9" --role "53ca6127-db72-4b80-b1b0-d745d6d5456d" --scope "/subscriptions/<sub-id>/resourceGroups/rg-app/providers/Microsoft.CognitiveServices/accounts/aif-app/projects/proj"

reference: skills/foundry-agentic-loop/references/rbac-contract.md#deployer-prerequisites-pre-flight
No resources have been created. Re-run this check once the assignments are in place.
```

Keep all four parts — the principal, one `MISSING` block per gap naming **scope, smallest grant and accepted alternatives**, the ready-to-run remediation, and the statement that nothing was created. The grant is the smallest role that completes the requirement given what the caller already holds (Foundry User for a caller who already has Contributor in the example). The remediation block is what turns the report into a single request to a subscription owner instead of a conversation.

## Where it sits in the loop

Run it **before provisioning**, after the target subscription/scopes are known and before any `azd provision`, resource creation, or Bicep deployment. Optionally wire the same script as a `preprovision` hook in `azure.yaml` so a direct `azd up` is gated too.

Record the verdict in `./.azure/deployment-plan.md`, in both modes, so a later failure can be told apart from a permission gap that was accepted and worked around.

## Reuse

The step depends only on the caller identity and the scopes in play, and touches no mode-specific state — so both agentic loop modes inherit it without extra wiring.

## Source

- [Azure built-in roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Role Based Access Control Administrator](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged#role-based-access-control-administrator)
- [List role assignments with Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-cli)
- [Microsoft Foundry role-based access control](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/rbac-azure-ai-foundry)
