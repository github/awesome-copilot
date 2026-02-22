# Pipelines

- [Pipelines](#pipelines)
  - [List Pipelines](#list-pipelines)
  - [Create Pipeline](#create-pipeline)
  - [Show Pipeline](#show-pipeline)
  - [Update Pipeline](#update-pipeline)
  - [Delete Pipeline](#delete-pipeline)
  - [Run Pipeline](#run-pipeline)
  - [Pipeline Runs](#pipeline-runs)
    - [List Runs](#list-runs)
    - [Show Run Details](#show-run-details)
  - [Pipeline Artifacts](#pipeline-artifacts)
  - [Pipeline Run Tags](#pipeline-run-tags)
  - [Builds](#builds)
    - [Build Tags](#build-tags)
  - [Build Definitions](#build-definitions)
  - [Releases](#releases)
  - [Release Definitions](#release-definitions)
  - [Pipeline Variables](#pipeline-variables)
  - [Variable Groups](#variable-groups)
    - [Variable Group Variables](#variable-group-variables)
  - [Pipeline Folders](#pipeline-folders)
  - [Agent Pools](#agent-pools)
  - [Agent Queues](#agent-queues)
  - [Agents](#agents)
  - [JMESPath Examples](#jmespath-examples)
  - [Scripting Patterns for Idempotent Operations](#scripting-patterns-for-idempotent-operations)
  - [Common Workflows](#common-workflows)
    - [Create Pipeline from Local Repo](#create-pipeline-from-local-repo)
    - [Download Latest Pipeline Artifact](#download-latest-pipeline-artifact)
    - [Pipeline Orchestration](#pipeline-orchestration)
    - [Variable Group Management](#variable-group-management)
    - [CI/CD Pipeline Setup](#cicd-pipeline-setup)
    - [Pipeline Monitoring and Alerting](#pipeline-monitoring-and-alerting)
    - [Multi-Environment Deployment](#multi-environment-deployment)
  - [Error Handling](#error-handling)
    - [Pipeline Failure Notification](#pipeline-failure-notification)

## List Pipelines

```bash
az pipelines list --output table
az pipelines list --query "[?name=='myPipeline']"
az pipelines list --folder-path 'folder/subfolder'
```

## Create Pipeline

```bash
# From local repository context (auto-detects settings)
az pipelines create --name 'ContosoBuild' --description 'Pipeline for contoso project'

# With specific branch and YAML path
az pipelines create \
  --name {pipeline-name} \
  --repository {repo} \
  --branch main \
  --yaml-path azure-pipelines.yml \
  --description "My CI/CD pipeline"

# For GitHub repository
az pipelines create \
  --name 'GitHubPipeline' \
  --repository https://github.com/Org/Repo \
  --branch main \
  --repository-type github

# Skip first run
az pipelines create --name 'MyPipeline' --skip-run true
```

## Show Pipeline

```bash
az pipelines show --id {pipeline-id}
az pipelines show --name {pipeline-name}
```

## Update Pipeline

```bash
az pipelines update --id {pipeline-id} --name "New name" --description "Updated description"
```

## Delete Pipeline

```bash
az pipelines delete --id {pipeline-id} --yes
```

## Run Pipeline

```bash
# Run by name
az pipelines run --name {pipeline-name} --branch main

# Run by ID
az pipelines run --id {pipeline-id} --branch refs/heads/main

# With parameters
az pipelines run --name {pipeline-name} --parameters version=1.0.0 environment=prod

# With variables
az pipelines run --name {pipeline-name} --variables buildId=123 configuration=release

# Open results in browser
az pipelines run --name {pipeline-name} --open
```

## Pipeline Runs

### List Runs

```bash
az pipelines runs list --pipeline {pipeline-id}
az pipelines runs list --name {pipeline-name} --top 10
az pipelines runs list --branch main --status completed
```

### Show Run Details

```bash
az pipelines runs show --run-id {run-id}
az pipelines runs show --run-id {run-id} --open
```

## Pipeline Artifacts

```bash
# List artifacts for a run
az pipelines runs artifact list --run-id {run-id}

# Download artifact
az pipelines runs artifact download \
  --artifact-name '{artifact-name}' \
  --path {local-path} \
  --run-id {run-id}

# Upload artifact
az pipelines runs artifact upload \
  --artifact-name '{artifact-name}' \
  --path {local-path} \
  --run-id {run-id}
```

## Pipeline Run Tags

```bash
# Add tag to run
az pipelines runs tag add --run-id {run-id} --tags production v1.0

# List run tags
az pipelines runs tag list --run-id {run-id} --output table
```

## Builds

```bash
# List builds
az pipelines build list
az pipelines build list --definition {build-definition-id}
az pipelines build list --status completed --result succeeded

# Queue build
az pipelines build queue --definition {build-definition-id} --branch main
az pipelines build queue --definition {build-definition-id} --parameters version=1.0.0

# Show build details
az pipelines build show --id {build-id}

# Cancel build
az pipelines build cancel --id {build-id}
```

### Build Tags

```bash
# Add tag to build
az pipelines build tag add --build-id {build-id} --tags prod release

# Delete tag from build
az pipelines build tag delete --build-id {build-id} --tag prod
```

## Build Definitions

```bash
az pipelines build definition list
az pipelines build definition list --name {definition-name}
az pipelines build definition show --id {definition-id}
```

## Releases

```bash
az pipelines release list
az pipelines release list --definition {release-definition-id}

# Create release
az pipelines release create --definition {release-definition-id}
az pipelines release create --definition {release-definition-id} --description "Release v1.0"

# Show release
az pipelines release show --id {release-id}
```

## Release Definitions

```bash
az pipelines release definition list
az pipelines release definition show --id {definition-id}
```

## Pipeline Variables

```bash
# List variables
az pipelines variable list --pipeline-id {pipeline-id}

# Create non-secret variable
az pipelines variable create \
  --name {var-name} \
  --value {var-value} \
  --pipeline-id {pipeline-id}

# Create secret variable
az pipelines variable create \
  --name {var-name} \
  --secret true \
  --pipeline-id {pipeline-id}

# Create secret with prompt
az pipelines variable create \
  --name {var-name} \
  --secret true \
  --prompt true \
  --pipeline-id {pipeline-id}

# Update variable
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

# Delete variable
az pipelines variable delete --name {var-name} --pipeline-id {pipeline-id} --yes
```

## Variable Groups

```bash
# List variable groups
az pipelines variable-group list
az pipelines variable-group list --output table

# Show variable group
az pipelines variable-group show --id {group-id}

# Create variable group
az pipelines variable-group create \
  --name {group-name} \
  --variables key1=value1 key2=value2 \
  --authorize true

# Update variable group
az pipelines variable-group update \
  --id {group-id} \
  --name {new-name} \
  --description "Updated description"

# Delete variable group
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

# Create secret variable
az pipelines variable-group variable create \
  --group-id {group-id} \
  --name {var-name} \
  --secret true

# Secret with environment variable
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

```bash
# List folders
az pipelines folder list

# Create folder
az pipelines folder create --path 'folder/subfolder' --description "My folder"

# Delete folder
az pipelines folder delete --path 'folder/subfolder'

# Update folder
az pipelines folder update --path 'old-folder' --new-path 'new-folder'
```

## Agent Pools

```bash
# List agent pools
az pipelines pool list
az pipelines pool list --pool-type automation
az pipelines pool list --pool-type deployment

# Show agent pool
az pipelines pool show --pool-id {pool-id}
```

## Agent Queues

```bash
# List agent queues
az pipelines queue list
az pipelines queue list --pool-name {pool-name}

# Show agent queue
az pipelines queue show --id {queue-id}
```

## Agents

```bash
# List agents in pool
az pipelines agent list --pool-id {pool-id}

# Show agent details
az pipelines agent show --agent-id {agent-id} --pool-id {pool-id}
```

## JMESPath Examples

```bash
# Count items by status
az pipelines runs list --query "groupBy([?status=='completed'], &[result]) | {Succeeded: [?key=='succeeded'][0].count, Failed: [?key=='failed'][0].count}"

# Find longest running builds
az pipelines build list --query "sort_by([?result=='succeeded'], &queueTime) | reverse(@) | [0:3].{ID:id, Number:buildNumber, Duration:duration}"
```

## Scripting Patterns for Idempotent Operations

```bash
# Ensure pipeline exists, update if different
ensure_pipeline() {
  local name=$1
  local yaml_path=$2

  PIPELINE=$(az pipelines list --query "[?name=='$name']" -o json)

  if [[ -z "$PIPELINE" ]]; then
    echo "Creating pipeline: $name"
    az pipelines create --name "$name" --yaml-path "$yaml_path"
  else
    echo "Pipeline exists: $name"
  fi
}
```

## Common Workflows

### Create Pipeline from Local Repo

```bash
# From local git repository (auto-detects repo, branch, etc.)
az pipelines create --name 'CI-Pipeline' --description 'Continuous Integration'
```

### Download Latest Pipeline Artifact

```bash
RUN_ID=$(az pipelines runs list --pipeline {pipeline-id} --top 1 --query "[0].id" -o tsv)
az pipelines runs artifact download \
  --artifact-name 'webapp' \
  --path ./output \
  --run-id $RUN_ID
```

### Pipeline Orchestration

```bash
# Run pipeline and wait for completion
RUN_ID=$(az pipelines run --name "$PIPELINE_NAME" --query "id" -o tsv)

while true; do
  STATUS=$(az pipelines runs show --run-id $RUN_ID --query "status" -o tsv)
  if [[ "$STATUS" != "inProgress" && "$STATUS" != "notStarted" ]]; then
    break
  fi
  sleep 10
done

# Check result
RESULT=$(az pipelines runs show --run-id $RUN_ID --query "result" -o tsv)
if [[ "$RESULT" == "succeeded" ]]; then
  echo "Pipeline succeeded"
else
  echo "Pipeline failed with result: $RESULT"
  exit 1
fi
```

### Variable Group Management

```bash
# Create variable group idempotently
VG_NAME="production-variables"
VG_ID=$(az pipelines variable-group list --query "[?name=='$VG_NAME'].id" -o tsv)

if [[ -z "$VG_ID" ]]; then
  VG_ID=$(az pipelines variable-group create \
    --name "$VG_NAME" \
    --variables API_URL=$API_URL API_KEY=$API_KEY \
    --authorize true \
    --query "id" -o tsv)
  echo "Created variable group with ID: $VG_ID"
else
  echo "Variable group already exists with ID: $VG_ID"
fi
```

### CI/CD Pipeline Setup

```bash
# Setup complete CI/CD pipeline
setup_cicd_pipeline() {
  local project=$1
  local repo=$2
  local branch=$3

  # Create variable groups
  VG_DEV=$(ensure_variable_group "dev-vars" "ENV=dev API_URL=api-dev.com")
  VG_PROD=$(ensure_variable_group "prod-vars" "ENV=prod API_URL=api-prod.com")

  # Create CI pipeline
  az pipelines create \
    --name "$repo-CI" \
    --repository "$repo" \
    --branch "$branch" \
    --yaml-path .azure/pipelines/ci.yml \
    --skip-run true

  # Create CD pipeline
  az pipelines create \
    --name "$repo-CD" \
    --repository "$repo" \
    --branch "$branch" \
    --yaml-path .azure/pipelines/cd.yml \
    --skip-run true

  echo "CI/CD pipeline setup complete"
}
```

### Pipeline Monitoring and Alerting

```bash
# Monitor pipeline and alert on failure
monitor_pipeline() {
  local pipeline_name=$1
  local slack_webhook=$2

  while true; do
    # Get latest run
    RUN_ID=$(az pipelines list --query "[?name=='$pipeline_name'] | [0].id" -o tsv)
    RUNS=$(az pipelines runs list --pipeline $RUN_ID --top 1)

    LATEST_RUN_ID=$(echo "$RUNS" | jq -r '.[0].id')
    RESULT=$(echo "$RUNS" | jq -r '.[0].result')

    # Check if failed and not already processed
    if [[ "$RESULT" == "failed" ]]; then
      # Send Slack alert
      curl -X POST "$slack_webhook" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"Pipeline $pipeline_name failed! Run ID: $LATEST_RUN_ID\"}"
    fi

    sleep 300 # Check every 5 minutes
  done
}
```

### Multi-Environment Deployment

```bash
# Deploy across multiple environments
deploy_to_environments() {
  local run_id=$1
  shift
  local environments=("$@")

  # Download artifacts
  ARTIFACT_NAME=$(az pipelines runs artifact list --run-id $run_id --query "[0].name" -o tsv)
  az pipelines runs artifact download \
    --artifact-name "$ARTIFACT_NAME" \
    --path ./artifacts \
    --run-id $run_id

  # Deploy to each environment
  for env in "${environments[@]}"; do
    echo "Deploying to: $env"

    # Get environment-specific variables
    VG_ID=$(az pipelines variable-group list --query "[?name=='$env-vars'].id" -o tsv)

    # Run deployment pipeline
    DEPLOY_RUN_ID=$(az pipelines run \
      --name "Deploy-$env" \
      --variables ARTIFACT_PATH=./artifacts ENV="$env" \
      --query "id" -o tsv)

    # Wait for deployment
    while true; do
      STATUS=$(az pipelines runs show --run-id $DEPLOY_RUN_ID --query "status" -o tsv)
      if [[ "$STATUS" != "inProgress" ]]; then
        break
      fi
      sleep 10
    done
  done
}
```

## Error Handling

### Pipeline Failure Notification

```bash
# Run pipeline and check result
RUN_ID=$(az pipelines run --name "$PIPELINE_NAME" --query "id" -o tsv)

# Wait for completion
while true; do
  STATUS=$(az pipelines runs show --run-id $RUN_ID --query "status" -o tsv)
  if [[ "$STATUS" != "inProgress" && "$STATUS" != "notStarted" ]]; then
    break
  fi
  sleep 10
done

# Check result and create work item on failure
RESULT=$(az pipelines runs show --run-id $RUN_ID --query "result" -o tsv)
if [[ "$RESULT" != "succeeded" ]]; then
  BUILD_NUMBER=$(az pipelines runs show --run-id $RUN_ID --query "buildNumber" -o tsv)

  az boards work-item create \
    --title "Build $BUILD_NUMBER failed" \
    --type Bug \
    --description "Pipeline run $RUN_ID failed with result: $RESULT\n\nURL: $ORG_URL/$PROJECT/_build/results?buildId=$RUN_ID"
fi
```
