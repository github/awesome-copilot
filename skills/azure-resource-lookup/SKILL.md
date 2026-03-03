---
name: azure-resource-lookup
description: "List, find, and show Azure resources. Answers \"list my VMs\", \"show my storage accounts\", \"list websites\", \"find container apps\", \"what resources do I have\", and similar queries for any Azure resource type. USE FOR: list resources, list virtual machines, list VMs, list storage accounts, list websites, list web apps, list container apps, show resources, find resources, what resources do I have, list resources in resource group, list resources in subscription, find resources by tag, find orphaned resources, resource inventory, count resources by type, cross-subscription resource query, Azure Resource Graph, resource discovery, list container registries, list SQL servers, list Key Vaults, show resource groups, list app services, find resources across subscriptions, find unattached disks, tag analysis. DO NOT USE FOR: deploying resources (use azure-deploy), creating or modifying resources, cost optimization (use azure-cost-optimization), writing application code, non-Azure clouds."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# Azure Resource Lookup

List, find, and discover Azure resources of any type across subscriptions and resource groups. Use Azure Resource Graph (ARG) for fast, cross-cutting queries when dedicated MCP tools don't cover the resource type.

## When to Use This Skill

Use this skill when the user wants to:
- **List resources** of any type (VMs, web apps, storage accounts, container apps, databases, etc.)
- **Show resources** in a specific subscription or resource group
- Query resources **across multiple subscriptions** or resource types
- Find **orphaned resources** (unattached disks, unused NICs, idle IPs)
- Discover resources **missing required tags** or configurations
- Get a **resource inventory** spanning multiple types
- Find resources in a **specific state** (unhealthy, failed provisioning, stopped)
- Answer "**what resources do I have?**" or "**show me my Azure resources**"

> 💡 **Tip:** For single-resource-type queries, first check if a dedicated MCP tool can handle it (see routing table below). If none exists, use Azure Resource Graph.

## Quick Reference

| Property | Value |
|----------|-------|
| **Query Language** | KQL (Kusto Query Language subset) |
| **CLI Command** | `az graph query -q "<KQL>" -o table` |
| **Extension** | `az extension add --name resource-graph` |
| **MCP Tool** | `extension_cli_generate` with intent for `az graph query` |
| **Best For** | Cross-subscription queries, orphaned resources, tag audits |

## MCP Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `extension_cli_generate` | Generate `az graph query` commands | Primary tool — generate ARG queries from user intent |
| `mcp_azure_mcp_subscription_list` | List available subscriptions | Discover subscription scope before querying |
| `mcp_azure_mcp_group_list` | List resource groups | Narrow query scope |

## Workflow

### Step 1: Check for a Dedicated MCP Tool

For single-resource-type queries, check if a dedicated MCP tool can handle it:

| Resource Type | MCP Tool | Coverage |
|---|---|---|
| Virtual Machines | `compute` | ✅ Full — list, details, sizes |
| Storage Accounts | `storage` | ✅ Full — accounts, blobs, tables |
| Cosmos DB | `cosmos` | ✅ Full — accounts, databases, queries |
| Key Vault | `keyvault` | ⚠️ Partial — secrets/keys only, no vault listing |
| SQL Databases | `sql` | ⚠️ Partial — requires resource group name |
| Container Registries | `acr` | ✅ Full — list registries |
| Kubernetes (AKS) | `aks` | ✅ Full — clusters, node pools |
| App Service / Web Apps | `appservice` | ❌ No list command — use ARG |
| Container Apps | — | ❌ No MCP tool — use ARG |
| Event Hubs | `eventhubs` | ✅ Full — namespaces, hubs |
| Service Bus | `servicebus` | ✅ Full — queues, topics |

If a dedicated tool is available with full coverage, use it. Otherwise proceed to Step 2.

### Step 2: Generate the ARG Query

Use `extension_cli_generate` to build the `az graph query` command:

```yaml
mcp_azure_mcp_extension_cli_generate
  intent: "query Azure Resource Graph to <user's request>"
  cli-type: "az"
```

See [Azure Resource Graph Query Patterns](references/azure-resource-graph.md) for common KQL patterns.

### Step 3: Execute and Format Results

Run the generated command. Use `--query` (JMESPath) to shape output:

```bash
az graph query -q "<KQL>" --query "data[].{name:name, type:type, rg:resourceGroup}" -o table
```

Use `--first N` to limit results. Use `--subscriptions` to scope.

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `resource-graph extension not found` | Extension not installed | `az extension add --name resource-graph` |
| `AuthorizationFailed` | No read access to subscription | Check RBAC — need Reader role |
| `BadRequest` on query | Invalid KQL syntax | Verify table/column names; use `=~` for case-insensitive type matching |
| Empty results | No matching resources or wrong scope | Check `--subscriptions` flag; verify resource type spelling |

## Constraints

- ✅ **Always** use `=~` for case-insensitive type matching (types are lowercase)
- ✅ **Always** scope queries with `--subscriptions` or `--first` for large tenants
- ✅ **Prefer** dedicated MCP tools for single-resource-type queries
- ❌ **Never** use ARG for real-time monitoring (data has slight delay)
- ❌ **Never** attempt mutations through ARG (read-only)
