# Pipeline Variables, Variable Groups & Agents

## Table of Contents
- [Pipeline Variables](#pipeline-variables)
- [Variable Groups](#variable-groups)
- [Pipeline Folders](#pipeline-folders)
- [Agent Pools](#agent-pools)
- [Agent Queues](#agent-queues)
- [Agents](#agents)

---

## Pipeline Variables

### List Variables

```bash
az pipelines variable list --pipeline-id {pipeline-id}
```

### Create Variable

```bash
# Non-secret variable
az pipelines variable create \
  --name {var-name} \
  --value {var-value} \
  --pipeline-id {pipeline-id}

# Secret variable
az pipelines variable create \
  --name {var-name} \
  --secret true \
  --pipeline-id {pipeline-id}

# Secret with prompt
az pipelines variable create \
  --name {var-name} \
  --secret true \
  --prompt true \
  --pipeline-id {pipeline-id}
```

### Update Variable

```bash
az pipelines variable update \
  --name {var-name} \
  --value {new-value} \
  --pipeline-id {pipeline-id}

# Update secret variable
az pipelines variable update \
  --name {var-name} \
  --secret true \
  --value "{new-secret-value}" \
  --pipeline-id {pipeline-id}
```

### Delete Variable

```bash
az pipelines variable delete --name {var-name} --pipeline-id {pipeline-id} --yes
```

## Variable Groups

### List Variable Groups

```bash
az pipelines variable-group list
az pipelines variable-group list --output table
```

### Show Variable Group

```bash
az pipelines variable-group show --id {group-id}
```

### Create Variable Group

```bash
az pipelines variable-group create \
  --name {group-name} \
  --variables key1=value1 key2=value2 \
  --authorize true
```

### Update Variable Group

```bash
az pipelines variable-group update \
  --id {group-id} \
  --name {new-name} \
  --description "Updated description"
```

### Delete Variable Group

```bash
az pipelines variable-group delete --id {group-id} --yes
```

### Variable Group Variables

```bash
# List variables
az pipelines variable-group variable list --group-id {group-id}

# Create non-secret variable
az pipelines variable-group variable create \
  --group-id {group-id} \
  --name {var-name} \
  --value {var-value}

# Create secret variable (will prompt for value if not provided)
az pipelines variable-group variable create \
  --group-id {group-id} \
  --name {var-name} \
  --secret true

# Create secret with environment variable
export AZURE_DEVOPS_EXT_PIPELINE_VAR_MySecret=secretvalue
az pipelines variable-group variable create \
  --group-id {group-id} \
  --name MySecret \
  --secret true

# Update variable
az pipelines variable-group variable update \
  --group-id {group-id} \
  --name {var-name} \
  --value {new-value} \
  --secret false

# Delete variable
az pipelines variable-group variable delete \
  --group-id {group-id} \
  --name {var-name}
```

## Pipeline Folders

### List Folders

```bash
az pipelines folder list
```

### Create Folder

```bash
az pipelines folder create --path 'folder/subfolder' --description "My folder"
```

### Delete Folder

```bash
az pipelines folder delete --path 'folder/subfolder'
```

### Update Folder

```bash
az pipelines folder update --path 'old-folder' --new-path 'new-folder'
```

## Agent Pools

### List Agent Pools

```bash
az pipelines pool list
az pipelines pool list --pool-type automation
az pipelines pool list --pool-type deployment
```

### Show Agent Pool

```bash
az pipelines pool show --pool-id {pool-id}
```

## Agent Queues

### List Agent Queues

```bash
az pipelines queue list
az pipelines queue list --pool-name {pool-name}
```

### Show Agent Queue

```bash
az pipelines queue show --id {queue-id}
```

## Agents

### List Agents in Pool

```bash
az pipelines agent list --pool-id {pool-id}
```

### Show Agent Details

```bash
az pipelines agent show --agent-id {agent-id} --pool-id {pool-id}
```
