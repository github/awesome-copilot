---
applyTo: '**/*.bicep,**/*.tf,**/*.tfvars,**/*.bicepparam,**/infra/**,**/infrastructure/**'
description: 'Azure resource naming conventions based on Microsoft CAF (Cloud Adoption Framework). Use when creating, reviewing, or suggesting names for Azure resources.'
---

# Azure Resource Naming Conventions (CAF)

Source: [Define your naming convention](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming) | [Abbreviations](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations) | [Name rules](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules)

Always follow these rules when creating, suggesting, or reviewing Azure resource names.

---

## General Pattern

```
<resource-type-abbr>-<workload>-<environment>-<region>-<instance>
```

**Component rules:**
- **Resource type** — use the official abbreviation from the table below, placed first
- **Workload / app / project** — short descriptive name (e.g., `navigator`, `payments`)
- **Environment** — `prod`, `dev`, `qa`, `stage`, `test`
- **Region** — use Azure region short names: `westus`, `eastus2`, `westeurope`, `northeurope`, `uksouth`, `southeastasia`, `australiaeast`, etc.
- **Instance** — zero-padded number: `001`, `002`

> Some resource types deviate from this pattern (e.g., no hyphens allowed). See [Official Abbreviations and Naming Rules](#official-abbreviations-and-naming-rules) for per-resource patterns and constraints.

**General character rules:**
- Prefer lowercase letters and hyphens (`-`). No spaces, no underscores unless the resource type requires it.
- Some resources **do not allow hyphens** — use concatenated lowercase alphanumerics instead (see table).
- Do not use: `#`, `<`, `>`, `%`, `&`, `\`, `?`, `/` or control characters.
- Do not encode sensitive data (subscription ID, tenant ID) in names.
- Most names are **case-insensitive** in Azure — always compare case-insensitively.
- Resources with public endpoints cannot include reserved words or trademarks.

---

## Naming Scope

| Scope | Meaning |
|-------|---------|
| **Global** | Unique across all of Azure (PaaS with public endpoints) |
| **Resource group** | Unique within the resource group |
| **Resource** | Unique within the parent resource |

---

## Official Abbreviations and Naming Rules

### Management and Governance

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| Management group | `mg` | tenant | 1-90 | Alphanumerics, hyphens, underscores, periods, parentheses | `mg-platform-prod` |
| Resource group | `rg` | subscription | 1-90 | Underscores, hyphens, periods, parentheses, letters, digits | `rg-navigator-prod` |
| Log Analytics workspace | `log` | resource group | 4-63 | Alphanumerics and hyphens | `log-navigator-prod-001` |
| Application Insights | `appi` | resource group | 1-260 | Can't use: `%&\?/` | `appi-navigator-prod-001` |
| Automation account | `aa` | resource group + region | 6-50 | Alphanumerics and hyphens, start with letter | `aa-navigator-prod-001` |

### Networking

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| Virtual network | `vnet` | resource group | 2-64 | Alphanumerics, underscores, periods, hyphens | `vnet-shared-eastus2-001` |
| Subnet | `snet` | virtual network | 1-80 | Alphanumerics, underscores, periods, hyphens | `snet-shared-eastus2-001` |
| Network security group | `nsg` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `nsg-weballow-001` |
| Application security group | `asg` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `asg-navigator-prod-001` |
| Network interface | `nic` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `nic-01-vmnavigator-prod-001` |
| Public IP address | `pip` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `pip-navigator-prod-westus-001` |
| Load balancer (internal) | `lbi` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `lbi-navigator-prod-001` |
| Load balancer (external) | `lbe` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `lbe-navigator-prod-001` |
| Application gateway | `agw` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `agw-navigator-prod-001` |
| Firewall | `afw` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `afw-navigator-prod-001` |
| Firewall policy | `afwp` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `afwp-navigator-prod-001` |
| Route table | `rt` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `rt-navigator-prod-001` |
| Virtual network gateway | `vgw` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `vgw-shared-eastus2-001` |
| VPN Gateway | `vpng` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `vpng-navigator-prod-001` |
| Azure Bastion | `bas` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `bas-navigator-prod-001` |
| Private endpoint | `pep` | resource group | 2-64 | Alphanumerics, underscores, periods, hyphens | `pep-navigator-prod-001` |
| Traffic Manager profile | `traf` | global | 1-63 | Alphanumerics and hyphens (no periods) | `traf-navigator-prod` |
| ExpressRoute circuit | `erc` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `erc-navigator-prod-001` |
| CDN profile | `cdnp` | resource group | 1-260 | Alphanumerics and hyphens | `cdnp-navigator-prod-001` |
| Front Door profile | `afd` | resource group | 5-64 | Alphanumerics and hyphens | `afd-navigator-prod` |

### Compute and Web

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| Virtual machine | `vm` | resource group | 1-15 (Windows) / 1-64 (Linux) | No spaces or: `~ ! @ # $ % ^ & * ( ) = + _ [ ] { } \| ; : . ' " , < > / ?` | `vm-sql-test-001` |
| VM scale set | `vmss` | resource group | 1-15 (Windows) / 1-64 (Linux) | Same as VM | `vmss-navigator-prod-001` |
| Availability set | `avail` | resource group | 1-80 | Alphanumerics, underscores, periods, hyphens | `avail-navigator-prod-001` |
| App Service plan | `asp` | resource group | 1-60 | Alphanumeric, hyphens, Unicode | `asp-navigator-prod-001` |
| Web app | `app` | global | 2-60 | Alphanumeric, hyphens, Unicode. Can't start/end with hyphen. | `app-navigator-prod-001` |
| Function app | `func` | global | 2-60 | Alphanumeric, hyphens, Unicode. Can't start/end with hyphen. | `func-navigator-prod-001` |
| Static web app | `stapp` | resource group | — | — | `stapp-navigator-prod-001` |
| App Service environment | `ase` | resource group | — | — | `ase-navigator-prod-001` |

### Containers

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| AKS cluster | `aks` | resource group | 1-63 | Alphanumerics, underscores, hyphens | `aks-navigator-prod-001` |
| AKS system node pool | `npsystem` | managed cluster | 1-12 (Linux) / 1-6 (Windows) | Lowercase letters and numbers, can't start with number | `npsystem` |
| AKS user node pool | `np` | managed cluster | 1-12 (Linux) / 1-6 (Windows) | Lowercase letters and numbers, can't start with number | `npusers` |
| Container apps | `ca` | resource group | 2-32 | Lowercase letters, numbers, hyphens. Start with letter, end with alphanumeric. | `ca-navigator-prod-001` |
| Container apps environment | `cae` | resource group | — | — | `cae-navigator-prod-001` |
| Container instance | `ci` | resource group | 1-63 | Lowercase letters, numbers, hyphens. Can't start/end with hyphen. | `ci-navigator-prod-001` |
| Container registry | `cr` | global | 5-50 | **Alphanumerics only — no hyphens** | `crnavigatorprod001` |

### Databases

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| Azure SQL server | `sql` | global | 1-63 | Lowercase letters, numbers, hyphens. Can't start/end with hyphen. | `sql-navigator-prod-001` |
| Azure SQL database | `sqldb` | SQL server | 1-128 | Can't use: `<>*%&:\/?` | `sqldb-navigator-prod` |
| SQL Managed Instance | `sqlmi` | global | 1-63 | Lowercase letters, numbers, hyphens. Can't start/end with hyphen. | `sqlmi-navigator-prod-001` |
| Azure Cosmos DB | `cosmos` | global | 3-44 | Lowercase letters, numbers, hyphens. Start with lowercase letter or number. | `cosmos-navigator-prod` |
| Azure Managed Redis | `amr` | global | 1-63 | Alphanumerics and hyphens. Start/end with alphanumeric. | `amr-navigator-prod-001` |
| MySQL server | `mysql` | global | 3-63 | Lowercase letters, hyphens, numbers. Can't start/end with hyphen. | `mysql-navigator-prod-001` |
| PostgreSQL server | `psql` | global | 3-63 | Lowercase letters, hyphens, numbers. Can't start/end with hyphen. | `psql-navigator-prod-001` |

### Storage

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| Storage account | `st` | global | 3-24 | **Lowercase letters and numbers only — no hyphens** | `stnavigatorprod001` |
| Backup vault | `bvault` | resource group | 2-50 | Alphanumerics and hyphens. Start with a letter. | `bvault-navigator-prod-001` |

### Security

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| Key vault | `kv` | global | 3-24 | Alphanumerics and hyphens. Start with letter, end with letter or number. No consecutive hyphens. | `kv-navigator-prod-001` |
| Managed identity | `id` | resource group | 3-128 | Alphanumerics, hyphens, underscores. Start with letter or number. | `id-navigator-prod-001` |

### Integration

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| API Management | `apim` | global | 1-50 | Alphanumerics and hyphens. Start with letter, end with alphanumeric. | `apim-navigator-prod` |
| Service Bus namespace | `sbns` | global | 6-50 | Alphanumerics and hyphens. Start with letter, end with letter or number. | `sbns-navigator-prod` |
| Service Bus queue | `sbq` | Service Bus | 1-260 | Alphanumerics, periods, hyphens, underscores, slashes | `sbq-navigator` |
| Service Bus topic | `sbt` | Service Bus | 1-260 | Alphanumerics, periods, hyphens, underscores, slashes | `sbt-navigator` |
| Event Hubs namespace | `evhns` | global | 6-50 | Alphanumerics and hyphens. Start with letter, end with letter or number. | `evhns-navigator-prod` |
| Event hub | `evh` | Event Hubs namespace | 1-256 | Alphanumerics, periods, hyphens, underscores | `evh-navigator` |
| Logic app | `logic` | resource group | 1-43 | Alphanumerics, hyphens, underscores, periods | `logic-navigator-prod-001` |

### AI and Machine Learning

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| Azure OpenAI Service | `oai` | resource group | 2-64 | Alphanumerics and hyphens | `oai-navigator-prod` |
| AI Search | `srch` | global | — | — | `srch-navigator-prod` |
| Azure ML workspace | `mlw` | resource group | 3-33 | Alphanumerics, hyphens, underscores | `mlw-navigator-prod` |
| Foundry hub | `hub` | resource group | 3-33 | Alphanumerics, hyphens, underscores | `hub-navigator-prod` |
| Foundry hub project | `proj` | Foundry hub | 3-33 | Alphanumerics, hyphens, underscores | `proj-navigator-prod` |
| Foundry account | `aif` | resource group | 2-64 | Alphanumerics and hyphens | `aif-navigator-prod` |
| Foundry account project | `proj` | Foundry account | — | — | `proj-navigator-prod` |
| Foundry Tools (multi-service) | `ais` | resource group | 2-64 | Alphanumerics and hyphens | `ais-navigator-prod` |

### Analytics and IoT

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| Azure Data Factory | `adf` | global | 3-63 | Alphanumerics and hyphens. Start/end with alphanumeric. | `adf-navigator-prod` |
| Azure Databricks workspace | `dbw` | resource group | 3-64 | Alphanumerics, underscores, hyphens | `dbw-navigator-prod-001` |
| Azure Data Explorer cluster | `dec` | global | 4-22 | Lowercase letters and numbers. Start with a letter. | `decnavigatorprod` |
| Azure Synapse workspace | `synw` | global | 1-50 | Lowercase letters, hyphens, numbers. Start/end with letter or number. | `synw-navigator-prod` |
| IoT hub | `iot` | global | 3-50 | Alphanumerics and hyphens. Can't end with hyphen. | `iot-navigator-prod` |
| Event Grid topic | `evgt` | region | 3-50 | Alphanumerics and hyphens | `evgt-navigator-prod` |

### Developer Tools

| Resource | Abbr | Scope | Length | Valid Characters | Example |
|----------|------|-------|--------|-----------------|---------|
| App Configuration store | `appcs` | global | 5-50 | Alphanumerics and hyphens. No more than two consecutive hyphens. | `appcs-navigator-prod` |
| SignalR | `sigr` | global | 3-63 | Alphanumerics and hyphens. Start with letter, end with letter or number. | `sigr-navigator-prod` |

---

## Resources That Do NOT Allow Hyphens

These resources require concatenated lowercase alphanumerics (no separators):

| Resource | Abbr | Pattern |
|----------|------|---------|
| Storage account | `st` | `st{workload}{env}{instance}` → `stnavigatorprod001` |
| Container registry | `cr` | `cr{workload}{env}{instance}` → `crnavigatorprod001` |
| Azure Data Explorer cluster | `dec` | `dec{workload}{env}` → `decnavigatorprod` |

---

## Examples (CAF)

```
# Management
rg-navigator-prod
rg-webapp-database-dev

# Networking
vnet-shared-eastus2-001
snet-shared-eastus2-001
nsg-weballow-001
pip-dc1-shared-eastus2-001
lbe-navigator-prod-001

# Compute
vm-sql-test-001
vm-sharepoint-dev-001
vmss-navigator-prod-001
asp-navigator-prod-001
app-navigator-prod-001
func-navigator-prod-001

# Containers
aks-navigator-prod-001
ca-navigator-prod-001
cae-navigator-prod-001
crnavigatorprod001        # no hyphens!

# Databases
sql-navigator-prod-001
sqldb-navigator-prod
cosmos-navigator-prod
psql-navigator-prod-001

# Storage / Security
stnavigatorprod001        # no hyphens!
kv-navigator-prod-001
id-navigator-prod-001

# Integration
apim-navigator-prod
sbns-navigator-prod
evhns-navigator-prod

# Monitoring
log-navigator-prod-001
appi-navigator-prod-001

# AI
oai-navigator-prod
srch-navigator-prod
```

---

## Do NOT Do

- Do not use underscores unless the resource type requires it — use hyphens.
- Do not spell out the full resource type word (e.g., `storageaccount-myapp` → use `stmyapp001`).
- Do not use uppercase letters (resources are case-insensitive; lowercase is the convention).
- Do not include sensitive data (subscription ID, tenant ID, passwords) in names.
- Do not skip the environment segment — even for production.
- Do not use `#` — it breaks URL parsing in Azure Resource Manager.
- Do not use reserved words or trademarks in names for resources with public endpoints.
- Do not use more than two consecutive hyphens (e.g., `app--prod` is invalid).
