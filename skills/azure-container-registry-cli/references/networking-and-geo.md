# Networking & Geo-Replication

## Table of Contents
- [Geo-Replication](#geo-replication)
- [Zone Redundancy](#zone-redundancy)
- [Private Endpoints (Private Link)](#private-endpoints-private-link)
- [Public Network Rules](#public-network-rules)
- [Dedicated Data Endpoints](#dedicated-data-endpoints)
- [Connected Registry](#connected-registry)
- [Registry Transfer Pipelines](#registry-transfer-pipelines)

Geo-replication, private endpoints, public IP network rules, dedicated data endpoints, connected registries, and transfer pipelines require the **Premium** SKU. Zone redundancy is automatic in every tier.

---

## Geo-Replication

One registry, one login server, images served from the nearest region:

```bash
az acr replication create --registry {registry} --location westeurope
az acr replication list --registry {registry} --output table
az acr replication show --registry {registry} --name westeurope
az acr replication delete --registry {registry} --name westeurope

# Regional endpoint status (useful for webhook/replication debugging)
az acr replication update --registry {registry} --name westeurope --region-endpoint-enabled true
```

Pushes replicate automatically; clients keep pulling `{registry}.azurecr.io` and Traffic Manager routes to the closest replica.

## Zone Redundancy

Zone redundancy is **enabled automatically for all registries, in all tiers (Basic/Standard/Premium), in regions that support availability zones** — no flag, SKU, or action required, and it cannot be disabled. Geo-replicas in supported regions are also zone-redundant by default.

Do not rely on the `zoneRedundancy` property or the legacy `--zone-redundancy` flag: the property is a deprecated artifact that may display `Disabled` even though the registry is fully zone-redundant. Registries in regions without availability-zone support are the only exception — migrate them (via `az acr import` or a transfer pipeline) to a supported region.

## Private Endpoints (Private Link)

```bash
# 1. Disable network policies on the endpoint subnet if needed, then create the endpoint
az network private-endpoint create --resource-group {rg} --name {registry}-pe \
  --vnet-name {vnet} --subnet {subnet} \
  --private-connection-resource-id $(az acr show --name {registry} --query id --output tsv) \
  --group-ids registry \
  --connection-name {registry}-pe-conn

# 2. Private DNS so {registry}.azurecr.io resolves to the private IP
az network private-dns zone create --resource-group {rg} --name privatelink.azurecr.io
az network private-dns link vnet create --resource-group {rg} \
  --zone-name privatelink.azurecr.io --name {registry}-dns-link --virtual-network {vnet} --registration-enabled false
az network private-endpoint dns-zone-group create --resource-group {rg} \
  --endpoint-name {registry}-pe --name default \
  --private-dns-zone privatelink.azurecr.io --zone-name registry

# 3. Optionally shut off public access entirely
az acr update --name {registry} --public-network-enabled false

# Manage connection approvals
az acr private-endpoint-connection list --registry-name {registry} --output table
az acr private-endpoint-connection approve --registry-name {registry} --name {connection}
```

Notes:
- Each private endpoint creates records for the registry **and** its data endpoint(s) (`{registry}.{region}.data.azurecr.io`) — geo-replicated registries need one data record per region.
- With public access disabled, standard ACR Tasks agents cannot reach the registry — use a dedicated agent pool attached to a subnet in the VNet, or enable trusted services **and** the task network bypass policy (see below).

## Public Network Rules

Restrict public access to specific IPs instead of (or before) going fully private:

```bash
# Default-deny, then allow specific ranges
az acr update --name {registry} --default-action Deny
az acr network-rule add --name {registry} --ip-address 203.0.113.0/24
az acr network-rule list --name {registry}
az acr network-rule remove --name {registry} --ip-address 203.0.113.0/24

# Let trusted Azure services (e.g., Defender, ACI, image import) through the firewall
az acr update --name {registry} --allow-trusted-services true
```

⚠️ **Since June 1, 2025, `--allow-trusted-services` alone is NOT enough for ACR Tasks using a system-assigned managed identity** — without the task network bypass policy, their runs get 403 errors on a network-restricted registry. Enable it explicitly:

```bash
az resource update \
  --namespace Microsoft.ContainerRegistry --resource-type registries \
  --name {registry} --resource-group {rg} \
  --api-version 2025-06-01-preview \
  --set properties.networkRuleBypassAllowedForTasks=true
```

Alternatives that avoid the bypass entirely: run tasks in a VNet-attached agent pool, or run `acr purge` locally with the [acr-cli binary](https://github.com/azure/acr-cli). Tasks using a user-assigned identity are not affected.

## Dedicated Data Endpoints

Give layer downloads stable, registry-specific FQDNs (`{registry}.{region}.data.azurecr.io`) instead of shared storage endpoints — simplifies client-side firewall rules:

```bash
az acr update --name {registry} --data-endpoint-enabled true
az acr show-endpoints --name {registry}
```

## Connected Registry

On-premises / IoT edge mirror of a cloud registry:

```bash
# Parent registry must have a dedicated data endpoint
az acr update --name {registry} --data-endpoint-enabled true

az acr connected-registry create --registry {registry} --name {connected-name} \
  --repository "app" "hello-world" \
  --mode ReadOnly            # or ReadWrite

az acr connected-registry list --registry {registry} --output table
az acr connected-registry get-settings --registry {registry} --name {connected-name} \
  --parent-protocol https --generate-password 1
az acr connected-registry deactivate --registry {registry} --name {connected-name}
```

## Registry Transfer Pipelines

Move images between disconnected clouds/tenants via storage blobs (extension `acrtransfer`):

```bash
az extension add --name acrtransfer

# Export from source registry to a storage container (SAS token in Key Vault)
az acr export-pipeline create --resource-group {rg} --registry {src-registry} \
  --name export-pipe \
  --secret-uri https://{vault}.vault.azure.net/secrets/{sas-secret} \
  --storage-container-uri https://{account}.blob.core.windows.net/{container}

# Import on the target side
az acr import-pipeline create --resource-group {rg} --registry {dst-registry} \
  --name import-pipe \
  --secret-uri https://{vault}.vault.azure.net/secrets/{sas-secret} \
  --storage-container-uri https://{account}.blob.core.windows.net/{container}

# Run an export
az acr pipeline-run create --resource-group {rg} --registry {src-registry} \
  --pipeline export-pipe --name run1 --pipeline-type export \
  --artifacts app:v1 app:v2 --storage-blob transfer-blob-1
```

For simple same-cloud copies prefer `az acr import` (see `images-and-artifacts.md`).
