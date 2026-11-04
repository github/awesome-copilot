# Connector discovery, authentication, and connections

Mandatory before connector discovery, connection operations, identities, or ACL changes.
Baseline: `logicapp` 1.0.0b1. Apply `SKILL.md` authorization/secret rules. Cloud mutations
require an explicitly authorized subscription, resource group, app, location, and scope.
Uppercase names below are placeholders, not discovered connector metadata.

## Discover the actual operation and authentication support

For built-in/service-provider connectors, establish an authorized ready host first through
the mandatory local-runtime procedure. Query its catalog:

```azurecli
az logicapp connector list --local --port 7071
az logicapp connector show --local --port 7071 --connector CONNECTOR
az logicapp connector operation list --local --port 7071 --connector CONNECTOR
az logicapp connector operation show --local --port 7071 --connector CONNECTOR --operation OPERATION
```

For managed connectors, inspect the regional ARM catalog with the intended subscription:

```azurecli
az logicapp connector managed list --location LOCATION --subscription SUBSCRIPTION_ID
az logicapp connector managed show --location LOCATION --connector CONNECTOR --subscription SUBSCRIPTION_ID
az logicapp connector managed operation list --location LOCATION --connector CONNECTOR --subscription SUBSCRIPTION_ID
az logicapp connector managed operation show --location LOCATION --connector CONNECTOR --operation OPERATION --subscription SUBSCRIPTION_ID
```

These catalogs are not interchangeable. Record exact connector/operation IDs, connection
class, parameter set, required inputs, and supported authentication. If metadata does not
establish identity support or local credential behavior, consult authoritative connector
documentation. Do not treat authentication errors as evidence of unsupported identity.
Do not infer an action from a trigger operation or use a similar connector's parameter shape.

## Managed identity is the default

For new connections use managed identity unless the customer explicitly requests another
method or the connector/operation does not support it. When unsupported, explain the
evidence and establish the alternative before wiring credentials. Never silently downgrade
to a connection string, service principal, or OAuth to get past a failure.

For existing projects, preserve functioning authentication unless migration is authorized.
Recommend a supported identity migration without performing it unsolicited.

For new project delivery:

1. Configure the connector's supported identity-based local wiring. A local process uses
   its documented development credential mechanism, not the deployed app's identity.
   Verify the selected local principal; do not assume universal `DefaultAzureCredential`.
2. For authorized deployment/provisioning, enable an app identity by default. Preserve an
   existing identity convention; otherwise select system-assigned. Use user-assigned for
   explicit stable/shared/pre-provisioned principal requirements.
3. Verify app principal, connection authorization/access policy, and data-plane access
   separately. Assign only the required roles at the narrowest appropriate scope.
4. If Azure changes are outside scope, configure permissible local files and report the
   outstanding app-identity/grant prerequisite. Do not claim cloud identity is enabled.

Identity assignment is additive and does not grant connector access:

```azurecli
az logicapp identity show --resource-group GROUP --name APP --subscription SUBSCRIPTION_ID
az logicapp identity assign --resource-group GROUP --name APP --system-assigned --subscription SUBSCRIPTION_ID
```

Run assignment only when needed and authorized, then verify it. Repeat
`--user-assigned IDENTITY_RESOURCE_ID` for authorized user-assigned identities.
Do not create a user-assigned resource implicitly or attach an unrelated identity.
Identity removal is an explicit access-affecting operation, not cleanup after testing:

```azurecli
az logicapp identity remove --resource-group GROUP --name APP --system-assigned --subscription SUBSCRIPTION_ID
```

Use the selected identity flags, not all flags. Verify dependent connections before removal.

## Create a local service-provider connection

Inspect current aliases, setting names, references, and ignore rules before creation.
`connection create` writes local `connections.json`; settings are written to
`local.settings.json`. No cloud identity is enabled by this local operation.
Select the discovered identity parameter set explicitly; the command's default parameter
set is not the skill's authentication policy.

The following templates illustrate nested parameters and expressions, not universal input
names. Replace `ENDPOINT_PARAMETER`, `IDENTITY_PARAMETER_SET`, and other placeholders with
the discovered values. The `authProvider.Type` field must also be verified for the connector.

POSIX shell example; use that shell's actual project path:

```bash
az logicapp connection create --path App --name ALIAS --connector CONNECTOR --parameter-set IDENTITY_PARAMETER_SET --parameter "ENDPOINT_PARAMETER=@appsetting('ENDPOINT_SETTING')" --parameter authProvider.Type=ManagedServiceIdentity --app-setting ENDPOINT_SETTING=NONSECRET_ENDPOINT
```

Windows PowerShell calling `az.cmd` can otherwise lose expression quoting. Use its Windows-
only stop-parsing token with all remaining arguments on the same physical line:

```powershell
az logicapp connection create --path App --name ALIAS --connector CONNECTOR --parameter-set IDENTITY_PARAMETER_SET --% --parameter "ENDPOINT_PARAMETER=@appsetting('ENDPOINT_SETTING')" --parameter authProvider.Type=ManagedServiceIdentity --app-setting ENDPOINT_SETTING=NONSECRET_ENDPOINT
```

After `--%`, PowerShell variables do not expand; do not paste variables expecting substitution.
Resolve non-secret literals before constructing the invocation. On other shells/platforms,
use their quoting rules; do not copy `--%`. Preserve `@appsetting('NAME')` exactly.
Repeat `--parameter` for parameters; dots express nested values. Never place secret values
in `--parameter` or `--app-setting`.

Only for an approved non-identity method, obtain the secret through an approved secure
source and pipe it directly into stdin. `--secret` names the setting, not its value.
Examples assume the environment value was already provided securely:

```powershell
$env:CONNECTOR_SECRET | az logicapp connection create --path App --name ALIAS --connector CONNECTOR --secret SECRET_SETTING
```

```bash
printf '%s' "$CONNECTOR_SECRET" | az logicapp connection create --path App --name ALIAS --connector CONNECTOR --secret SECRET_SETTING
```

Use a discovered `--secret-parameter` when the default connection-string binding is wrong.
Never echo a secret for diagnosis, put it in a command literal, or write a plaintext fixture.
Protect required local settings with appropriate access controls, Git exclusions, and
deployment exclusions. Use supported secret stores/Key Vault references for deployed
settings where appropriate; do not assume the runtime consumes arbitrary settings templates.

Creation fails on existing connection/setting names. `--force` is reviewed replacement,
not idempotence, secret recovery, or an authorization bypass.

**Gate:** Correct discovered wiring and setting references, protected storage, chosen local
principal and permissions verified or explicitly blocked; no exposed credentials.

## Create an Azure managed API connection

Use the distinct-name command, not deprecated `connection create --managed-api` semantics:

```azurecli
az logicapp connection managed create --resource-group GROUP --logic-app-name APP --name CONNECTION --connector CONNECTOR --location LOCATION --auth-mode managed-identity --subscription SUBSCRIPTION_ID
```

Prerequisites: existing assigned app identity; discovered connector/authentication support;
existing valid deployed `connections.json` with a strong VFS ETag. Missing files, weak
revisions, or invalid wiring must be resolved through authorized deployment, not an
unconditional file replacement. The command creates a V2 ARM connection, an access policy,
and app file wiring. These are coupled resources, not a transaction.

`--name` names the connection resource; `--logic-app-name` names the app. Use
`--user-assigned-identity ID` only for an identity already assigned to that app.
Use discovered `--parameter-set`, non-secret repeated `--parameter`, and stdin
`--secret-parameter NAME` when the approved method requires it.

Allowed authentication modes include `managed-identity`, `oauth`, `raw`, and
`service-principal`; availability is not proof a mode works for every connector.
OAuth is an exception to the default and requires interactive consent:

```azurecli
az logicapp connection managed create --resource-group GROUP --logic-app-name APP --name CONNECTION --connector CONNECTOR --location LOCATION --auth-mode oauth --subscription SUBSCRIPTION_ID
```

`--no-browser` prints a consent URL but still requires a browser that can reach the CLI
machine's loopback listener; it does not enable unattended consent. Consent defaults to
300 seconds; override with `--consent-timeout` only deliberately. Connected status is
required; `consent.confirmed: false` alone does not establish failure because the callback
commonly contains no authorization code.

On consent, policy, or wiring failure, ARM connections/policies may remain and credentials/
access may have changed. Only guarded file-entry restoration is attempted. Inspect the
reported resources, revisions, policies, and file state before recovery or retry. Never
assume a timeout cleaned up resources, automatically delete retained resources, or restore
credentials/access from incomplete ARM readback.
`--force` does not bypass strong revisions, policy identity checks, or concurrency limits.

## Inspect, test, and preserve aliases

```azurecli
az logicapp connection list --resource-group GROUP --name APP --subscription SUBSCRIPTION_ID --output table
az logicapp connection show --resource-group GROUP --name APP --connection ALIAS --class managedApiConnections --subscription SUBSCRIPTION_ID
az logicapp connection test --resource-group GROUP --name APP --connection ALIAS --subscription SUBSCRIPTION_ID
```

List/show read the app's deployed `connections.json`, not a reconciled ARM inventory.
Unwired resources are absent; dangling file references can remain. Redacted URLs/values do
not guarantee provider errors or workflow payloads are secret-free. Setting-name expressions
remain visible without resolving values.

| Test result | Exit | Required response |
|---|---|---|
| `passed` | 0 | Connection test passed; still verify required business behavior |
| `failed` | 1 | Inspect platform failure |
| `authorizationFailed` | 1 | Verify principal/grants; exercise the exact authorized operation |
| `couldNotReach` | 1 | Resolve reachability; honor HTTP 429 `retryAfter` |
| `noTestAvailable` | 3 | Unverified, not passed; exercise the workflow when authorized |

Preserve stable existing aliases by default. To consolidate, trace every workflow reference,
verify resource sharing/ownership, authorize the migration, and update dependent references
together. A Designer-generated name is not proof of duplication or permission to delete.
Keep environment-specific resource references configurable; keep runtime URLs/keys in
protected settings instead of source-controlled literals.

## Delete connections or change access

Inspect impact and obtain explicit authorization before unlinking/revoking anything:

```azurecli
az logicapp connection delete --resource-group GROUP --name APP --connection ALIAS --subscription SUBSCRIPTION_ID
az logicapp connection acl list --resource-group GROUP --connection RESOURCE_NAME --subscription SUBSCRIPTION_ID
az logicapp connection acl show --resource-group GROUP --connection RESOURCE_NAME --policy POLICY_NAME --subscription SUBSCRIPTION_ID
az logicapp connection acl add --resource-group GROUP --connection RESOURCE_NAME --object-id PRINCIPAL_ID --subscription SUBSCRIPTION_ID
az logicapp connection acl remove --resource-group GROUP --connection RESOURCE_NAME --policy POLICY_NAME --subscription SUBSCRIPTION_ID
```

Select only the intended operation; these are not a sequence. ACLs require V2 connections;
one policy per principal is allowed. Removal immediately removes that principal's access.
Use `--yes` only for previously approved targets/effects.

Managed deletion checks ownership before unlink, uses a fresh exact strong ETag, and verifies
unlink before ARM cleanup. Invalid/cross-scope resource IDs are refused even with
`--keep-resource`; manage cross-scope resources explicitly, not by bypassing the check.
Only demonstrably exclusive system-assigned policies are eligible for automatic removal.
Shared user-assigned policies/resources remain, even if the identity belongs to this app.
Ambiguous/incomplete ownership evidence retains resources with a reason.
`--keep-resource` deliberately retains the connection and does not revoke shared access.
Referenced app settings are reported, not deleted. Conflicts, partial unlink, and later
cleanup failures require inspection; do not retry unconditionally or replay old wiring.

**Gate:** Intended wiring/access verified, required data-plane grants verified separately,
and retained/shared resources or uncertain effects explicitly reported.
