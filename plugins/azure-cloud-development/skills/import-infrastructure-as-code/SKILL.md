---
name: import-infrastructure-as-code
description: 'Import existing Azure resources into Terraform using Azure CLI discovery and Azure Verified Modules (AVM). Use when asked to reverse-engineer live Azure infrastructure, generate Infrastructure as Code from existing subscriptions/resource groups/resource IDs, map dependencies, derive exact import addresses from downloaded module source, prevent configuration drift, and produce AVM-based Terraform files ready for validation and planning across any Azure resource type.'
---

# Import Infrastructure as Code (Azure -> Terraform with AVM)

Convert existing Azure infrastructure into maintainable Terraform code using discovery data and Azure Verified Modules.

## When to Use This Skill

Use this skill when the user asks to:

- Import existing Azure resources into Terraform
- Generate IaC from live Azure environments
- Handle any Azure resource type supported by AVM (and document justified non-AVM fallbacks)
- Recreate infrastructure from a subscription or resource group
- Map dependencies between discovered Azure resources
- Use AVM modules instead of handwritten `azurerm_*` resources

## Prerequisites

- Azure CLI installed and authenticated (`az login`)
- Access to the target subscription or resource group
- Terraform CLI installed
- Network access to Terraform Registry and AVM index sources

## Inputs

| Parameter | Required | Default | Description |
|---|---|---|---|
| `subscription-id` | No | Active CLI context | Azure subscription used for subscription-scope discovery and context setting |
| `resource-group-name` | No | None | Azure resource group used for resource-group-scope discovery |
| `resource-id` | No | None | One or more Azure ARM resource IDs used for specific-resource-scope discovery |

At least one of `subscription-id`, `resource-group-name`, or `resource-id` is required.

## Step-by-Step Workflows

### 1) Collect Required Scope (Mandatory)

Request one of these scopes before running discovery commands:

- Subscription scope: `<subscription-id>`
- Resource group scope: `<resource-group-name>`
- Specific resources scope: one or more `<resource-id>` values

Scope handling rules:

- Treat Azure ARM resource IDs (for example `/subscriptions/.../providers/...`) as cloud resource identifiers, not local file system paths.
- Use resource IDs only with Azure CLI `--ids` arguments (for example `az resource show --ids <resource-id>`).
- Never pass resource IDs to file-reading commands (`cat`, `ls`, `read_file`, glob searches) unless the user explicitly says they are local file paths.
- If the user already provided one valid scope, do not ask for additional scope inputs unless required by a failing command.
- Do not ask follow-up questions that can be answered from already-provided scope values.

If scope is missing, ask for it explicitly and stop.

### 2) Authenticate and Set Context

Run only the commands required for the selected scope.

For subscription scope:

```bash
az login
az account set --subscription <subscription-id>
az account show --query "{subscriptionId:id, name:name, tenantId:tenantId}" -o json
```

Expected output: JSON object with `subscriptionId`, `name`, and `tenantId`.

For resource group or specific resource scope, `az login` is still required but `az account set` is optional if the active context is already correct.

When using specific resource scope, prefer direct `--ids`-based commands first and avoid extra discovery prompts for subscription or resource group unless needed for a concrete command.

### 3) Run Discovery Commands

Discover resources using the selected scopes. Ensure to fetch all necessary information for accurate Terraform generation.

```bash
# Subscription scope
az resource list --subscription <subscription-id> -o json

# Resource group scope
az resource list --resource-group <resource-group-name> -o json

# Specific resource scope
az resource show --ids <resource-id-1> <resource-id-2> ... -o json
```

Expected output: JSON object or array containing Azure resource metadata (`id`, `type`, `name`, `location`, `tags`, `properties`).

### 4) Resolve Dependencies Before Code Generation

Parse exported JSON and map:

- Parent-child relationships (for example: NIC -> Subnet -> VNet)
- Cross-resource references in `properties`
- Ordering for Terraform creation

IMPORTANT: Generate the following documentation and save it to a docs folder in the root of the project.
- `exported-resources.json` with all discovered resources and their metadata, including dependencies and references.
- `EXPORTED-ARCHITECTURE.MD` file with a human-readable architecture overview based on the discovered resources and their relationships.

### 5) Select Azure Verified Modules (Required)

Use the latest AVM version for each resource type.

### Terraform Registry

- Search for "avm" + resource name
- Filter by "Partner" tag to find official AVM modules
- Example: Search "avm storage account" → filter by Partner

### Official AVM Index

> **Note:** The following links always point to the latest version of the CSV files on the main branch. As intended, this means the files may change over time. If you require a point-in-time version, consider using a specific release tag in the URL.

- **Terraform Resource Modules**: `https://raw.githubusercontent.com/Azure/Azure-Verified-Modules/refs/heads/main/docs/static/module-indexes/TerraformResourceModules.csv`
- **Terraform Pattern Modules**: `https://raw.githubusercontent.com/Azure/Azure-Verified-Modules/refs/heads/main/docs/static/module-indexes/TerraformPatternModules.csv`
- **Terraform Utility Modules**: `https://raw.githubusercontent.com/Azure/Azure-Verified-Modules/refs/heads/main/docs/static/module-indexes/TerraformUtilityModules.csv`

### Individual Module information

Use the `web` tool or another suitable MCP method to get module information if not available locally in the `.terraform` folder.

Use AVM sources:

- Registry: `https://registry.terraform.io/modules/Azure/<module>/azurerm/latest`
- GitHub: `https://github.com/Azure/terraform-azurerm-avm-res-<service>-<resource>`

Prefer AVM modules over handwritten `azurerm_*` resources when an AVM module exists.

When fetching module information from GitHub repositories, the README.md file in the root of the repository typically contains all detailed information about the module, for example: https://raw.githubusercontent.com/Azure/terraform-azurerm-avm-res-<service>-<resource>/refs/heads/main/README.md

### 5a) Read the Module README Before Writing Any Code (Mandatory)

**This step is not optional.** Before writing a single line of HCL for a module, fetch and
read the full README for that module. Do not rely on knowledge of the raw `azurerm` provider
or prior experience with other AVM modules.

For each selected AVM module, fetch its README:

```text
https://raw.githubusercontent.com/Azure/terraform-azurerm-avm-res-<service>-<resource>/refs/heads/main/README.md
```

Or if the module is already downloaded after `terraform init`:

```bash
cat .terraform/modules/<module_key>/README.md
```

From the README, extract and record **before writing code**:

1. **Required Inputs** — every input the module requires. Any child resource listed here
	 (NICs, extensions, subnets, public IPs) is managed **inside** the module. Do **not**
	 create standalone module blocks for those resources.
2. **Optional Inputs** — the exact Terraform variable names and their declared `type`.
	 Do not assume they match the raw `azurerm` provider argument names or block shapes.
3. **Usage examples** — check what resource group identifier is used (`parent_id` vs
	 `resource_group_name`), how child resources are expressed (inline map vs separate module),
	 and what syntax each input expects.

#### Apply module rules as patterns, not assumptions

Use the lessons below as examples of the *type* of mismatch that often causes imports to fail.
Do not assume these exact names apply to every AVM module. Always verify each selected module's
README and `variables.tf`.

**`avm-res-compute-virtualmachine` (any version)**

- `network_interfaces` is a **Required Input**. NICs are owned by the VM module. Never
	create standalone `avm-res-network-networkinterface` modules alongside a VM module —
	define every NIC inline under `network_interfaces`.
- TrustedLaunch is expressed through the top-level booleans `secure_boot_enabled = true`
	and `vtpm_enabled = true`. The `security_type` argument exists only under `os_disk` for
	Confidential VM disk encryption and must not be used for TrustedLaunch.
- `boot_diagnostics` is a `bool`, not an object. Use `boot_diagnostics = true`; use the
	separate `boot_diagnostics_storage_account_uri` variable if a storage URI is needed.
- Extensions are managed inside the module via the `extensions` map. Do not create
	standalone extension resources.

**`avm-res-network-virtualnetwork` (any version)**

- This module is backed by the AzAPI provider, not `azurerm`. Use `parent_id` (the full
	resource group resource ID string) to specify the resource group, not `resource_group_name`.
- Every example in the README shows `parent_id`; none show `resource_group_name`.

Generalized takeaway for all AVM modules:

- Determine child resource ownership from **Required Inputs** before creating sibling modules.
- Determine accepted variable names and types from **Optional Inputs** and `variables.tf`.
- Determine identifier style and input shape from README usage examples.
- Do not infer argument names from raw `azurerm_*` resources.

### 6) Generate Terraform Files

### Before Writing Import Blocks — Inspect Module Source (Mandatory)

After `terraform init` downloads the modules, inspect each module's source files to determine
the exact Terraform resource addresses before writing any `import {}` blocks. Never write
import addresses from memory.

#### Step A — Identify the provider and resource label

```bash
grep "^resource" .terraform/modules/<module_key>/main*.tf
```

This reveals whether the module uses `azurerm_*` or `azapi_resource` labels. For example,
`avm-res-network-virtualnetwork` exposes `azapi_resource "vnet"`, not
`azurerm_virtual_network "this"`.

#### Step B — Identify child modules and nested paths

```bash
grep "^module" .terraform/modules/<module_key>/main*.tf
```

If child resources are managed in a sub-module (subnets, extensions, etc.), the import
address must include every intermediate module label:

```text
module.<root_module_key>.module.<child_module_key>["<map_key>"].<resource_type>.<label>[<index>]
```

#### Step C — Check for `count` vs `for_each`

```bash
grep -n "count\|for_each" .terraform/modules/<module_key>/main*.tf
```

Any resource using `count` requires an index in the import address. When `count = 1` (e.g.,
conditional Linux vs Windows selection), the address must end with `[0]`. Resources using
`for_each` use string keys, not numeric indexes.

#### Known import address patterns (examples from lessons learned)

These are examples only. Use them as templates for reasoning, then derive the exact addresses
from the downloaded source code for the modules in your current import.

| Resource | Correct import `to` address pattern |
|---|---|
| AzAPI-backed VNet | `module.<vnet_key>.azapi_resource.vnet` |
| Subnet (nested, count-based) | `module.<vnet_key>.module.subnet["<subnet_name>"].azapi_resource.subnet[0]` |
| Linux VM (count-based) | `module.<vm_key>.azurerm_linux_virtual_machine.this[0]` |
| VM NIC | `module.<vm_key>.azurerm_network_interface.virtualmachine_network_interfaces["<nic_key>"]` |
| VM extension (default deploy_sequence=5) | `module.<vm_key>.module.extension["<ext_name>"].azurerm_virtual_machine_extension.this` |
| VM extension (deploy_sequence=1–4) | `module.<vm_key>.module.extension_<n>["<ext_name>"].azurerm_virtual_machine_extension.this` |
| NSG-NIC association | `module.<vm_key>.azurerm_network_interface_security_group_association.this["<nic_key>-<nsg_key>"]` |

Produce:

- `providers.tf` with `azurerm` provider and required version constraints
- `main.tf` with AVM module blocks and explicit dependencies
- `variables.tf` for environment-specific values
- `outputs.tf` for key IDs and endpoints
- `terraform.tfvars.example` with placeholder values

### Diff Live Properties Against Module Defaults (Mandatory)

After writing the initial configuration, compare every non-zero property of each discovered
live resource against the default value declared in the corresponding AVM module's
`variables.tf`. Any property where the live value differs from the module default must be
set explicitly in the Terraform configuration.

Pay particular attention to the following property categories, which are common sources
of silent configuration drift:

- **Timeout values** (e.g., Public IP `idle_timeout_in_minutes` defaults to `4`; live
	deployments often use `30`)
- **Network policy flags** (e.g., subnet `private_endpoint_network_policies` defaults to
	`"Enabled"`; existing subnets often have `"Disabled"`)
- **SKU and allocation** (e.g., Public IP `sku`, `allocation_method`)
- **Availability zones** (e.g., VM zone, Public IP zone)
- **Redundancy and replication** settings on storage and database resources

Retrieve full live properties with explicit `az` commands, for example:

```bash
az network public-ip show --ids <resource_id> --query "{idleTimeout:idleTimeoutInMinutes, sku:sku.name, zones:zones}" -o json
az network vnet subnet show --ids <resource_id> --query "{privateEndpointPolicies:privateEndpointNetworkPolicies, delegation:delegations}" -o json
```

Do not rely solely on `az resource list` output, which may omit nested or computed properties.

Pin module versions explicitly:

```hcl
module "example" {
	source  = "Azure/<module>/azurerm"
	version = "<latest-compatible-version>"
}
```

### 7) Validate Generated Code

Run:

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan
```

Expected output: no syntax errors, no validation errors, and a plan that matches discovered infrastructure intent.

## Troubleshooting

| Problem | Likely Cause | Action |
|---|---|---|
| `az` command fails with authorization errors | Wrong tenant/subscription or missing RBAC role | Re-run `az login`, verify subscription context, confirm required permissions |
| Discovery output is empty | Incorrect scope or no resources in scope | Re-check scope input and run scoped list/show command again |
| No AVM module found for a resource type | Resource type not yet covered by AVM | Use native `azurerm_*` resource for that type and document the gap |
| `terraform validate` fails | Missing variables or unresolved dependencies | Add required variables and explicit dependencies, then re-run validation |
| Unknown argument or variable not found in module | AVM variable name differs from `azurerm` provider argument name | Read the module README `variables.tf` or Optional Inputs section for the correct name |
| Import block fails — resource not found at address | Wrong provider label (`azurerm_` vs `azapi_`), missing sub-module path, or missing `[0]` index | Run `grep "^resource" .terraform/modules/<key>/main*.tf` and `grep "^module"` to find exact address |
| `terraform plan` shows unexpected `~ update` on imported resource | Live value differs from AVM module default | Fetch live property with `az <resource> show`, compare to module default, add explicit value |
| Child-resource module gives "provider configuration not present" | Child resources declared as standalone modules even though parent module owns them | Check Required Inputs in README, remove incorrect standalone modules, and model child resources using the parent module's documented input structure |
| Nested child resource import fails with "resource not found" | Missing intermediate module path, wrong map key, or missing index | Inspect module blocks and `count`/`for_each` in source; build full nested import address including all module segments and required key/index |
| Tool tries to read ARM resource ID as file path or asks repeated scope questions | Resource ID not treated as `--ids` input, or agent did not trust already-provided scope | Treat ARM IDs strictly as cloud identifiers, use `az ... --ids ...`, and stop re-prompting once one valid scope is present |

## Response Contract

When returning results, provide:

1. Scope used (subscription, resource group, or resource IDs)
2. Discovery files created
3. Resource types detected
4. AVM modules selected with versions
5. Terraform files generated or updated
6. Validation command results
7. Open gaps requiring user input (if any)

## Execution Rules for the Agent

- Do not continue if scope is missing.
- Do not claim successful import without listing discovered files and validation output.
- Do not skip dependency mapping before generating Terraform.
- Prefer AVM modules first; justify each non-AVM fallback explicitly.
- **Read the README for every AVM module before writing code.** Required Inputs identify
	which child resources the module owns. Optional Inputs document exact variable names and
	types. Usage examples show provider-specific conventions (`parent_id` vs
	`resource_group_name`). Skipping the README is the single most common cause of
	code errors in AVM-based imports.
- **Never assume NIC, extension, or public IP resources are standalone.** For
	any AVM module, treat child resources as parent-owned unless the README explicitly indicates
	a separate module is required. Check Required Inputs before creating sibling modules.
- **Never write import addresses from memory.** After `terraform init`, grep the downloaded
	module source to discover the actual provider (`azurerm` vs `azapi`), resource labels,
	sub-module nesting, and `count` vs `for_each` usage before writing any `import {}` block.
- **Never treat ARM resource IDs as file paths.** Resource IDs belong in Azure CLI `--ids`
	arguments and API queries, not file IO tools. Only read local files when a real workspace
	path is provided.
- **Minimize prompts when scope is already known.** If subscription, resource group, or
	specific resource IDs are already provided, proceed with commands directly and only ask a
	follow-up when a command fails due to missing required context.
- **Do not declare the import complete until `terraform plan` shows 0 destroys and 0
	unwanted changes.** Telemetry `+ create` resources are acceptable. Any `~ update` or
	`- destroy` on real infrastructure resources must be resolved.

## References

- [Azure Verified Modules index (Terraform)](https://github.com/Azure/Azure-Verified-Modules/tree/main/docs/static/module-indexes)
- [Terraform AVM Registry namespace](https://registry.terraform.io/namespaces/Azure)
