# DevOps Cli

- [DevOps Cli](#devops-cli)
  - [Authentication](#authentication)
    - [Login to Azure DevOps](#login-to-azure-devops)
    - [Configure Defaults](#configure-defaults)
  - [Extension Management](#extension-management)
  - [Projects](#projects)
    - [List Projects](#list-projects)
    - [Create Project](#create-project)
    - [Show Project Details](#show-project-details)
    - [Delete Project](#delete-project)
  - [Output Formats](#output-formats)
  - [JMESPath Queries](#jmespath-queries)
    - [Advanced JMESPath Queries](#advanced-jmespath-queries)
  - [Global Arguments](#global-arguments)
  - [Common Parameters](#common-parameters)
  - [Best Practices](#best-practices)
    - [Authentication and Security](#authentication-and-security)
    - [Script-Safe Output](#script-safe-output)
  - [Error Handling and Retry Patterns](#error-handling-and-retry-patterns)
    - [Retry Logic for Transient Failures](#retry-logic-for-transient-failures)
    - [Validate Inputs](#validate-inputs)
  - [Getting Help](#getting-help)

## Authentication

### Login to Azure DevOps

```bash
# Interactive login (prompts for PAT)
az devops login --organization https://dev.azure.com/{org}

# Login with PAT token
az devops login --organization https://dev.azure.com/{org} --token YOUR_PAT_TOKEN

# Logout
az devops logout --organization https://dev.azure.com/{org}
```

### Configure Defaults

```bash
# Set default organization and project
az devops configure --defaults organization=https://dev.azure.com/{org} project={project}

# List current configuration
az devops configure --list

# Enable Git aliases
az devops configure --use-git-aliases true
```

## Extension Management

```bash
# List available extensions
az extension list-available --output table

# List installed extensions
az extension list --output table

# Install Azure DevOps extension
az extension add --name azure-devops

# Update Azure DevOps extension
az extension update --name azure-devops

# Remove extension
az extension remove --name azure-devops

# Install from local path
az extension add --source ~/extensions/azure-devops.whl
```

## Projects

### List Projects

```bash
az devops project list --organization https://dev.azure.com/{org}
az devops project list --top 10 --output table
```

### Create Project

```bash
az devops project create \
  --name myNewProject \
  --organization https://dev.azure.com/{org} \
  --description "My new DevOps project" \
  --source-control git \
  --visibility private
```

### Show Project Details

```bash
az devops project show --project {project-name} --org https://dev.azure.com/{org}
```

### Delete Project

```bash
az devops project delete --id {project-id} --org https://dev.azure.com/{org} --yes
```

## Output Formats

```bash
# Table format (human-readable)
az pipelines list --output table

# JSON format (default, machine-readable)
az pipelines list --output json

# JSONC (colored JSON)
az pipelines list --output jsonc

# YAML format
az pipelines list --output yaml

# YAMLC (colored YAML)
az pipelines list --output yamlc

# TSV format (tab-separated values)
az pipelines list --output tsv

# None (no output)
az pipelines list --output none
```

## JMESPath Queries

```bash
# Filter by name
az pipelines list --query "[?name=='myPipeline']"

# Get specific fields
az pipelines list --query "[].{Name:name, ID:id}"

# Chain queries
az pipelines list --query "[?name.contains('CI')].{Name:name, ID:id}" --output table

# Get first result
az pipelines list --query "[0]"

# Get top N
az pipelines list --query "[0:5]"
```

### Advanced JMESPath Queries

```bash
# Filter by multiple conditions
az pipelines list --query "[?name.contains('CI') && enabled==true]"

# Filter by status and result
az pipelines runs list --query "[?status=='completed' && result=='succeeded']"

# Sort by date (descending)
az pipelines runs list --query "sort_by([?status=='completed'], &finishTime | reverse(@))"

# Find pipelines with specific YAML path
az pipelines list --query "[?process.type.name=='yaml' && process.yamlFilename=='azure-pipelines.yml']"

# Find PRs from specific reviewer
az repos pr list --query "[?contains(reviewers[?displayName=='John Doe'].displayName, 'John Doe')]"

# Find work items with specific iteration and state
az boards work-item show --id $WI_ID --query "{Title:fields['System.Title'], State:fields['System.State'], Iteration:fields['System.IterationPath']}"
```

## Global Arguments

Available on all commands:

- `--help` / `-h`: Show help
- `--output` / `-o`: Output format (json, jsonc, none, table, tsv, yaml, yamlc)
- `--query`: JMESPath query string
- `--verbose`: Increase logging verbosity
- `--debug`: Show all debug logs
- `--only-show-errors`: Only show errors, suppress warnings
- `--subscription`: Name or ID of subscription

## Common Parameters

| Parameter                  | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `--org` / `--organization` | Azure DevOps organization URL (e.g., `https://dev.azure.com/{org}`) |
| `--project` / `-p`         | Project name or ID                                                  |
| `--detect`                 | Auto-detect organization from git config                            |
| `--yes` / `-y`             | Skip confirmation prompts                                           |
| `--open`                   | Open in web browser                                                 |

## Best Practices

### Authentication and Security

```bash
# Use PAT from environment variable (most secure)
export AZURE_DEVOPS_EXT_PAT=$MY_PAT
az devops login --organization $ORG_URL

# Pipe PAT securely (avoids shell history)
echo $MY_PAT | az devops login --organization $ORG_URL

# Set defaults to avoid repetition
az devops configure --defaults organization=$ORG_URL project=$PROJECT

# Clear credentials after use
az devops logout --organization $ORG_URL
```

### Script-Safe Output

```bash
# Suppress warnings and errors
az pipelines list --only-show-errors

# No output (useful for commands that only need to execute)
az pipelines run --name "$PIPELINE_NAME" --output none

# TSV format for shell scripts (clean, no formatting)
az repos pr list --output tsv --query "[].{ID:pullRequestId,Title:title}"

# JSON with specific fields
az pipelines list --output json --query "[].{Name:name, ID:id, URL:url}"
```

## Error Handling and Retry Patterns

### Retry Logic for Transient Failures

```bash
# Retry function for network operations
retry_command() {
  local max_attempts=3
  local attempt=1
  local delay=5

  while [[ $attempt -le $max_attempts ]]; do
    if "$@"; then
      return 0
    fi
    echo "Attempt $attempt failed. Retrying in ${delay}s..."
    sleep $delay
    ((attempt++))
    delay=$((delay * 2))
  done

  echo "All $max_attempts attempts failed"
  return 1
}

# Usage
retry_command az pipelines run --name "$PIPELINE_NAME"
```

### Validate Inputs

```bash
# Validate required parameters
if [[ -z "$PROJECT" || -z "$REPO" ]]; then
  echo "Error: PROJECT and REPO must be set"
  exit 1
fi

# Check if branch exists
if ! az repos ref list --repository "$REPO" --query "[?name=='refs/heads/$BRANCH']" -o tsv | grep -q .; then
  echo "Error: Branch $BRANCH does not exist"
  exit 1
fi
```

## Getting Help

```bash
# General help
az devops --help

# Help for specific command group
az pipelines --help
az repos pr --help

# Help for specific command
az repos pr create --help

# Search for examples
az find "az repos pr create"
```
