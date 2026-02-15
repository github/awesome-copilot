# Validation Commands Reference

This reference documents all commands used for Azure deployment preflight validation.

## Azure Developer CLI (azd)

### azd provision --preview

Preview infrastructure changes for azd projects without deploying.

```bash
azd provision --preview [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--environment`, `-e` | Name of the environment to use |
| `--no-prompt` | Accept defaults without prompting |
| `--debug` | Enable debug logging |
| `--cwd` | Set working directory |

**Examples:**

```bash
# Preview with default environment
azd provision --preview

# Preview specific environment
azd provision --preview --environment dev

# Preview without prompts (CI/CD)
azd provision --preview --no-prompt
```

**Output:** Shows resources that will be created, modified, or deleted.

### azd auth login

Authenticate to Azure for azd operations.

```bash
azd auth login [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--check-status` | Check login status without logging in |
| `--use-device-code` | Use device code flow |
| `--tenant-id` | Specify tenant |
| `--client-id` | Service principal client ID |

### azd env list

List available environments.

```bash
azd env list
```

---

## Azure CLI (az)

### az deployment group what-if

Preview changes for resource group deployments.

```bash
az deployment group what-if \
  --resource-group <rg-name> \
  --template-file <bicep-file> \
  [options]
```

**Required Parameters:**
| Parameter | Description |
|-----------|-------------|
| `--resource-group`, `-g` | Target resource group name |
| `--template-file`, `-f` | Path to Bicep file |

**Optional Parameters:**
| Parameter | Description |
|-----------|-------------|
| `--parameters`, `-p` | Parameter file or inline values |
| `--validation-level` | `Provider` (default), `ProviderNoRbac`, or `Template` |
| `--result-format` | `FullResourcePayloads` (default) or `ResourceIdOnly` |
| `--no-pretty-print` | Output raw JSON for parsing |
| `--name`, `-n` | Deployment name |
| `--exclude-change-types` | Exclude specific change types from output |

**Validation Levels:**
| Level | Description | Use Case |
|-------|-------------|----------|
| `Provider` | Full validation with RBAC checks | Default, most thorough |
| `ProviderNoRbac` | Full validation, read permissions only | When lacking deploy permissions |
| `Template` | Static syntax validation only | Quick syntax check |

**Examples:**

```bash
# Basic what-if
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep

# With parameters and full validation
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.bicepparam \
  --validation-level Provider

# Fallback without RBAC checks
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --validation-level ProviderNoRbac

# JSON output for parsing
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --no-pretty-print
```

### az deployment sub what-if

Preview changes for subscription-level deployments.

```bash
az deployment sub what-if \
  --location <location> \
  --template-file <bicep-file> \
  [options]
```

**Required Parameters:**
| Parameter | Description |
|-----------|-------------|
| `--location`, `-l` | Location for deployment metadata |
| `--template-file`, `-f` | Path to Bicep file |

**Examples:**

```bash
az deployment sub what-if \
  --location eastus \
  --template-file main.bicep \
  --parameters main.bicepparam \
  --validation-level Provider
```

### az deployment mg what-if

Preview changes for management group deployments.

```bash
az deployment mg what-if \
  --location <location> \
  --management-group-id <mg-id> \
  --template-file <bicep-file> \
  [options]
```

**Required Parameters:**
| Parameter | Description |
|-----------|-------------|
| `--location`, `-l` | Location for deployment metadata |
| `--management-group-id`, `-m` | Target management group ID |
| `--template-file`, `-f` | Path to Bicep file |

### az deployment tenant what-if

Preview changes for tenant-level deployments.

```bash
az deployment tenant what-if \
  --location <location> \
  --template-file <bicep-file> \
  [options]
```

**Required Parameters:**
| Parameter | Description |
|-----------|-------------|
| `--location`, `-l` | Location for deployment metadata |
| `--template-file`, `-f` | Path to Bicep file |

### az login

Authenticate to Azure CLI.

```bash
az login [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--tenant`, `-t` | Tenant ID or domain |
| `--use-device-code` | Use device code flow |
| `--service-principal` | Login as service principal |

### az account show

Display current subscription context.

```bash
az account show
```

### az group exists

Check if resource group exists.

```bash
az group exists --name <rg-name>
```

---

## Bicep CLI

### bicep build

Compile Bicep to ARM JSON and validate syntax.

```bash
bicep build <bicep-file> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--stdout` | Output to stdout instead of file |
| `--outdir` | Output directory |
| `--outfile` | Output file path |
| `--no-restore` | Skip module restore |

**Examples:**

```bash
# Validate syntax (output to stdout, no file created)
bicep build main.bicep --stdout > /dev/null

# Build to specific directory
bicep build main.bicep --outdir ./build

# Validate multiple files
for f in *.bicep; do bicep build "$f" --stdout; done
```

**Error Output Format:**
```
/path/to/file.bicep(22,51) : Error BCP064: Found unexpected tokens in interpolated expression.
/path/to/file.bicep(22,51) : Error BCP004: The string at this location is not terminated.
```

Format: `<file>(<line>,<column>) : <severity> <code>: <message>`

### bicep --version

Check Bicep CLI version.

```bash
bicep --version
```

---

## Parameter File Detection

### Bicep Parameters (.bicepparam)

Modern Bicep parameter files (recommended):

```bicep
using './main.bicep'

param location = 'eastus'
param environment = 'dev'
param tags = {
  environment: 'dev'
  project: 'myapp'
}
```

**Detection pattern:** `<template-name>.bicepparam`

### JSON Parameters (.parameters.json)

Traditional ARM parameter files:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "location": { "value": "eastus" },
    "environment": { "value": "dev" }
  }
}
```

**Detection patterns:**
- `<template-name>.parameters.json`
- `parameters.json`
- `parameters/<env>.json`

### Using Parameters with Commands

```bash
# Bicep parameters file
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.bicepparam

# JSON parameters file
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters @parameters.json

# Inline parameter overrides
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters main.bicepparam \
  --parameters location=westus
```

---

## Determining Deployment Scope

Check the Bicep file's `targetScope` declaration:

```bicep
// Resource Group (default if not specified)
targetScope = 'resourceGroup'

// Subscription
targetScope = 'subscription'

// Management Group
targetScope = 'managementGroup'

// Tenant
targetScope = 'tenant'
```

**Scope to Command Mapping:**

| targetScope | Command | Required Parameters |
|-------------|---------|---------------------|
| `resourceGroup` | `az deployment group what-if` | `--resource-group` |
| `subscription` | `az deployment sub what-if` | `--location` |
| `managementGroup` | `az deployment mg what-if` | `--location`, `--management-group-id` |
| `tenant` | `az deployment tenant what-if` | `--location` |

---

## Version Requirements

| Tool | Minimum Version | Recommended Version | Key Features |
|------|-----------------|---------------------|--------------|
| Azure CLI | 2.14.0 | 2.76.0+ | `--validation-level` switch |
| Azure Developer CLI | 1.0.0 | Latest | `--preview` flag |
| Bicep CLI | 0.4.0 | Latest | Best error messages |

**Check versions:**
```bash
az --version
azd version
bicep --version
```
