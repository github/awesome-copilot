---
name: azure-container-registry-cli
description: 'Manage Azure Container Registry via the az acr CLI including registries, images, cloud builds, ACR Tasks, authentication, tokens, geo-replication, and networking. Use when working with ACR, az acr commands, pushing/importing/purging container images in Azure, or when the user mentions Azure Container Registry.'
---

# Azure Container Registry CLI

Manage Azure Container Registry (ACR) resources using the `az acr` command group of the Azure CLI.

**CLI:** `az acr` ships with core Azure CLI — no extension required (the `acrtransfer` extension is only needed for export/import pipelines).

## Prerequisites

```bash
# Install Azure CLI
brew install azure-cli  # macOS
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux
winget install Microsoft.AzureCLI  # Windows

# Sign in and select subscription
az login
az account set --subscription {subscription-id}
```

## Quick Start

```bash
# Create a registry (SKU: Basic | Standard | Premium)
az acr create --resource-group {rg} --name {registry} --sku Standard

# Authenticate Docker/Podman against the registry
az acr login --name {registry}

# Build and push in the cloud — no local Docker needed
az acr build --registry {registry} --image app:v1 .

# Copy an image from another registry without pull/push
az acr import --name {registry} --source mcr.microsoft.com/hello-world:latest

# List repositories and tags
az acr repository list --name {registry} --output table
az acr repository show-tags --name {registry} --repository app --orderby time_desc

# Diagnose registry connectivity and configuration
az acr check-health --name {registry} --yes
```

## Key Principles

- **Prefer `az acr build` / ACR Tasks** over local `docker build` + `docker push`: builds run in Azure, work without a local daemon, and integrate with triggers.
- **Prefer `az acr import`** to move images between registries: it is server-side, faster, and requires no local storage.
- **Never enable the admin user for production** — use Microsoft Entra identities (RBAC roles `AcrPull`/`AcrPush`, or `Container Registry Repository Reader`/`Writer` on ABAC-enabled registries), repository-scoped tokens, or managed identities.
- **Premium-only features**: geo-replication, private endpoints, retention policies, connected registries, agent pools. (Repository-scoped tokens work in all tiers; zone redundancy is automatic in all tiers in supported regions.)

## CLI Structure

```
az acr
├── create / delete / list / show / update   # Registry lifecycle
├── login                  # Docker credential helper (or --expose-token)
├── check-health / check-name / show-usage   # Diagnostics & quota
├── build                  # Cloud image build (quick task)
├── run                    # Run a command / multi-step task once
├── task                   # ACR Tasks (triggers, timers, logs, runs)
├── agentpool              # Dedicated task agent pools (Premium)
├── import                 # Server-side image copy into the registry
├── repository             # List/show/delete/untag repos & tags, lock images
├── manifest               # Manifest metadata, delete, OCI referrers
├── credential             # Admin user credentials (avoid in production)
├── token / scope-map      # Repository-scoped tokens (Premium)
├── replication            # Geo-replication (Premium)
├── network-rule           # IP network rules
├── private-endpoint-connection  # Private Link approvals
├── config                 # content-trust, retention, soft-delete, ...
├── cache / credential-set # Artifact cache (pull-through cache) rules
├── webhook                # Push/delete event webhooks
├── connected-registry     # On-premises / IoT connected registries
└── export-pipeline / import-pipeline / pipeline-run  # acrtransfer extension
```

## Reference Files

Read the relevant reference file based on the user's task. Each file contains complete command syntax and examples for its domain.

| File | When to read | Covers |
|---|---|---|
| `references/auth-and-security.md` | Login failures, permissions, CI/CD or AKS pull access | `az acr login` (incl. `--expose-token`), Entra RBAC roles, service principals, managed identities, `--attach-acr` for AKS, repository-scoped tokens & scope maps, admin user, content trust |
| `references/build-and-tasks.md` | Building images in Azure, automation, CI triggers | `az acr build`, `az acr run`, multi-step task YAML, `az acr task` (git/base-image/timer triggers, logs, runs), agent pools |
| `references/images-and-artifacts.md` | Managing repos, tags, cleanup, storage costs | `az acr import`, repository & manifest commands, untag vs delete, purge (`acr purge`), image locking, retention policy, soft delete, artifact cache, `show-usage` |
| `references/networking-and-geo.md` | Multi-region, private access, edge scenarios | Geo-replication, zone redundancy, private endpoints, network rules, dedicated data endpoints, connected registries, registry transfer pipelines |
