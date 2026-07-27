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

# Without a Docker daemon: get an Entra access token for the registry
az acr login --name {registry} --expose-token
# Returns accessToken + loginServer; use with:
docker login {registry}.azurecr.io --username 00000000-0000-0000-0000-000000000000 --password-stdin
```

Notes:
- `az acr login` tokens are valid for 3 hours; re-run on expiry.
- The full login server name is always `{registry}.azurecr.io` (lowercase).

## Microsoft Entra RBAC Roles

Built-in roles for data-plane access:

| Role | Permissions |
|---|---|
| `AcrPull` | Pull images |
| `AcrPush` | Pull + push images |
| `AcrDelete` | Delete images |
| `AcrImageSigner` | Sign images (content trust) |
| `Contributor`/`Owner` | Full control-plane management + push/pull |

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

# Docker login with the SP
docker login {registry}.azurecr.io --username {appId} --password {password}
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

## Repository-Scoped Tokens

Premium SKU. Fine-grained, non-Entra credentials (e.g., external partners, IoT devices):

```bash
# 1. Create a scope map (actions: content/read, content/write, content/delete, metadata/read, metadata/write)
az acr scope-map create --name {scope-map} --registry {registry} \
  --repository app content/read metadata/read \
  --description "Pull-only access to app"

# 2. Create a token bound to the scope map
az acr token create --name {token} --registry {registry} --scope-map {scope-map}

# 3. Generate/rotate passwords (up to 2, optional expiry)
az acr token credential generate --name {token} --registry {registry} --password1 --expiration-in-days 30

# Login with the token
docker login {registry}.azurecr.io --username {token} --password {token-password}

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

## Content Trust

```bash
# Enable Docker Content Trust support (Premium)
az acr config content-trust update --registry {registry} --status enabled

# Client side: push signed images
export DOCKER_CONTENT_TRUST=1
docker push {registry}.azurecr.io/app:v1
```

Signers need `AcrImageSigner` in addition to `AcrPush`. For new projects prefer Notation/ORAS-based signing over Docker Content Trust.
