# Authentication & Security

## Table of Contents
- [Individual Login](#individual-login)
- [Microsoft Entra RBAC Roles](#microsoft-entra-rbac-roles)
- [Service Principals](#service-principals)
- [Managed Identities](#managed-identities)
- [AKS Integration](#aks-integration)
- [Repository-Scoped Tokens](#repository-scoped-tokens)
- [Admin User](#admin-user)
- [Content Trust](#content-trust)

---

## Individual Login

```bash
# Standard login — wires Docker/Podman credentials via your az login identity
az acr login --name {registry}

# Without a Docker daemon: get an Entra access token and pipe it to docker login
LOGIN_SERVER=$(az acr show --name {registry} --query loginServer --output tsv)
az acr login --name {registry} --expose-token --query accessToken --output tsv | \
  docker login $LOGIN_SERVER --username 00000000-0000-0000-0000-000000000000 --password-stdin
```

Notes:
- `az acr login` tokens are valid for 3 hours; re-run on expiry.
- Resolve the login server with `az acr show --name {registry} --query loginServer --output tsv` rather than hardcoding it: it is usually `{registry}.azurecr.io`, but sovereign clouds use other suffixes and registries with a domain name label scope get a hash suffix.

## Microsoft Entra RBAC Roles

The applicable data-plane roles depend on the registry's **role assignment permissions mode** — check it first:

```bash
az acr show --name {registry} --query roleAssignmentMode --output tsv
# LegacyRegistryPermissions  -> use AcrPull/AcrPush/AcrDelete
# AbacRepositoryPermissions  -> use Container Registry Repository Reader/Writer/Contributor
```

**Legacy mode (RBAC Registry Permissions):**

| Role | Permissions |
|---|---|
| `AcrPull` | Pull images |
| `AcrPush` | Pull + push images |
| `AcrDelete` | Delete images |
| `AcrImageSigner` | Sign images (content trust) |
| `Contributor`/`Owner` | Full control-plane management + push/pull |

**ABAC-enabled mode (RBAC Registry + ABAC Repository Permissions):** `AcrPull`/`AcrPush`/`AcrDelete` are **not honored**, and `Owner`/`Contributor`/`Reader` grant control-plane only. Use instead:

| Role | Permissions |
|---|---|
| `Container Registry Repository Reader` | Read images, tags, metadata (add ABAC conditions to scope to repositories) |
| `Container Registry Repository Writer` | Read + write/update |
| `Container Registry Repository Contributor` | Read + write + delete |
| `Container Registry Repository Catalog Lister` | List repositories — assign only when the identity must enumerate the catalog (e.g., `az acr repository list`); not needed for pull/push of known repositories |

```bash
# Get the registry resource ID
ACR_ID=$(az acr show --name {registry} --query id --output tsv)

# Grant pull access to a user, group, service principal, or managed identity
az role assignment create --assignee {principal-id} --scope $ACR_ID --role AcrPull

# List who has access
az role assignment list --scope $ACR_ID --output table
```

## Service Principals

For CI/CD systems that cannot use OIDC/managed identity:

```bash
# Create an SP scoped to pull only
ACR_ID=$(az acr show --name {registry} --query id --output tsv)
az ad sp create-for-rbac --name {sp-name} --scopes $ACR_ID --role AcrPull

# Docker login with the SP — pipe the secret via stdin, never pass it as an argument
# (printf with a quoted variable preserves whitespace/glob characters exactly)
printf '%s' "$SP_PASSWORD" | docker login $LOGIN_SERVER --username {appId} --password-stdin
```

Prefer federated credentials (OIDC) over SP passwords in GitHub Actions / Azure DevOps when possible.

## Managed Identities

For Azure compute (VM, App Service, Container Apps, Functions):

```bash
# Assign a system-assigned identity and grant it pull
az vm identity assign --name {vm} --resource-group {rg}
PRINCIPAL_ID=$(az vm show --name {vm} --resource-group {rg} --query identity.principalId --output tsv)
az role assignment create --assignee $PRINCIPAL_ID --scope $ACR_ID --role AcrPull
```

App Service / Container Apps then pull with `--assign-identity` + `--acr-identity` style flags of their own CLIs — no registry password needed.

## AKS Integration

```bash
# Attach at cluster creation
az aks create --name {cluster} --resource-group {rg} --attach-acr {registry}

# Attach/detach an existing cluster (grants AcrPull to the kubelet identity)
az aks update --name {cluster} --resource-group {rg} --attach-acr {registry}
az aks update --name {cluster} --resource-group {rg} --detach-acr {registry}

# Validate the cluster can reach the registry
az aks check-acr --name {cluster} --resource-group {rg} --acr {registry}.azurecr.io
```

`--attach-acr` requires Owner or User Access Administrator on the registry. Cross-subscription attach works by passing the full ACR resource ID.

⚠️ `--attach-acr` assigns `AcrPull`, which is **not honored on ABAC-enabled registries** (`roleAssignmentMode` = `AbacRepositoryPermissions`). For those, assign the ABAC roles to the kubelet identity manually:

```bash
ACR_ID=$(az acr show --name {registry} --query id --output tsv)
KUBELET_ID=$(az aks show --name {cluster} --resource-group {rg} \
  --query identityProfile.kubeletidentity.objectId --output tsv)
az role assignment create --assignee $KUBELET_ID --scope $ACR_ID \
  --role "Container Registry Repository Reader"
# "Container Registry Repository Catalog Lister" is NOT needed for pulls —
# only add it if the identity must list repositories
```

## Repository-Scoped Tokens

Available in all service tiers. Fine-grained, non-Entra credentials (e.g., external partners, IoT devices):

```bash
# 1. Create a scope map (actions: content/read, content/write, content/delete, metadata/read, metadata/write)
az acr scope-map create --name {scope-map} --registry {registry} \
  --repository app content/read metadata/read \
  --description "Pull-only access to app"

# 2. Create a token bound to the scope map
az acr token create --name {token} --registry {registry} --scope-map {scope-map}

# 3. Generate/rotate passwords (up to 2, optional expiry)
az acr token credential generate --name {token} --registry {registry} --password1 --expiration-in-days 30

# Login with the token — pipe the password via stdin, never pass it as an argument
printf '%s' "$TOKEN_PWD" | docker login $LOGIN_SERVER --username {token} --password-stdin

# Disable or delete
az acr token update --name {token} --registry {registry} --status disabled
az acr token delete --name {token} --registry {registry} --yes
```

## Admin User

Single account, full push/pull on the whole registry, not auditable per user — **keep disabled in production**:

```bash
az acr update --name {registry} --admin-enabled false   # recommended
az acr credential show --name {registry}                # view username/passwords (if enabled)
az acr credential renew --name {registry} --password-name password2   # rotate
```

Legitimate uses: quick local tests, services that only accept username/password and cannot use tokens.

## Content Trust (deprecated)

Docker Content Trust (DCT) is being retired: **since May 31, 2026 it cannot be enabled on new registries** (or on registries that never enabled it), and it will be removed entirely on March 31, 2028. Do not set up DCT — sign images with **Notation (Notary Project)** and store signatures as OCI artifacts instead; see "Transition from Docker Content Trust to Notary Project" in the ACR docs.

```bash
# Registries with legacy DCT only — inspect or disable the existing configuration
az acr config content-trust show --registry {registry}
az acr config content-trust update --registry {registry} --status disabled
```

Legacy DCT signers needed `AcrImageSigner` in addition to `AcrPush`.
