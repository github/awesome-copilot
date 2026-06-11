# Workflows, Best Practices & Scripting Patterns

## Table of Contents
- [Common Workflows](#common-workflows)
- [Best Practices](#best-practices)
- [Error Handling & Retry Patterns](#error-handling--retry-patterns)
- [Scripting Patterns for Idempotent Operations](#scripting-patterns-for-idempotent-operations)
- [Real-World Workflows](#real-world-workflows)

---

## Common Workflows

### Create PR from current branch

```bash
CURRENT_BRANCH=$(git branch --show-current)
az repos pr create \
  --source-branch $CURRENT_BRANCH \
  --target-branch main \
  --title "Feature: $(git log -1 --pretty=%B)" \
  --open
```

### Create work item on pipeline failure

```bash
az boards work-item create \
  --title "Build $BUILD_BUILDNUMBER failed" \
  --type bug \
  --org $SYSTEM_TEAMFOUNDATIONCOLLECTIONURI \
  --project $SYSTEM_TEAMPROJECT
```

### Download latest pipeline artifact

```bash
RUN_ID=$(az pipelines runs list --pipeline {pipeline-id} --top 1 --query "[0].id" -o tsv)
az pipelines runs artifact download \
  --artifact-name 'webapp' \
  --path ./output \
  --run-id $RUN_ID
```

### Approve and complete PR

```bash
# Vote approve
az repos pr set-vote --id {pr-id} --vote approve

# Complete PR
az repos pr update --id {pr-id} --status completed
```

### Create pipeline from local repo

```bash
# From local git repository (auto-detects repo, branch, etc.)
az pipelines create --name 'CI-Pipeline' --description 'Continuous Integration'
```

### Bulk update work items

```bash
# Query items and update in loop
for id in $(az boards query --wiql "SELECT ID FROM WorkItems WHERE State='New'" -o tsv); do
  az boards work-item update --id $id --state "Active"
done
```

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

### Idempotent Operations

```bash
# Always use --detect for auto-detection
az devops configure --defaults organization=$ORG_URL project=$PROJECT

# Check existence before creation
if ! az pipelines show --id $PIPELINE_ID 2>/dev/null; then
  az pipelines create --name "$PIPELINE_NAME" --yaml-path azure-pipelines.yml
fi

# Use --output tsv for shell parsing
PIPELINE_ID=$(az pipelines list --query "[?name=='MyPipeline'].id" --output tsv)

# Use --output json for programmatic access
BUILD_STATUS=$(az pipelines build show --id $BUILD_ID --query "status" --output json)
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

### Service Connection Automation

```bash
# Create service connection using configuration file
cat > service-connection.json <<'EOF'
{
  "data": {
    "subscriptionId": "$SUBSCRIPTION_ID",
    "subscriptionName": "My Subscription",
    "creationMode": "Manual",
    "serviceEndpointId": "$SERVICE_ENDPOINT_ID"
  },
  "url": "https://management.azure.com/",
  "authorization": {
    "parameters": {
      "tenantid": "$TENANT_ID",
      "serviceprincipalid": "$SP_ID",
      "authenticationType": "spnKey",
      "serviceprincipalkey": "$SP_KEY"
    },
    "scheme": "ServicePrincipal"
  },
  "type": "azurerm",
  "isShared": false,
  "isReady": true
}
EOF

az devops service-endpoint create \
  --service-endpoint-configuration service-connection.json \
  --project "$PROJECT"
```

### Pull Request Automation

```bash
# Create PR with work items and reviewers
PR_ID=$(az repos pr create \
  --repository "$REPO_NAME" \
  --source-branch "$FEATURE_BRANCH" \
  --target-branch main \
  --title "Feature: $(git log -1 --pretty=%B)" \
  --description "$(git log -1 --pretty=%B)" \
  --work-items $WORK_ITEM_1 $WORK_ITEM_2 \
  --reviewers "$REVIEWER_1" "$REVIEWER_2" \
  --required-reviewers "$LEAD_EMAIL" \
  --labels "enhancement" "backlog" \
  --open \
  --query "pullRequestId" -o tsv)

# Set auto-complete when policies pass
az repos pr update --id $PR_ID --auto-complete true
```

## Error Handling & Retry Patterns

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

### Check and Handle Errors

```bash
# Check if pipeline exists before operations
PIPELINE_ID=$(az pipelines list --query "[?name=='$PIPELINE_NAME'].id" -o tsv)

if [[ -z "$PIPELINE_ID" ]]; then
  echo "Pipeline not found. Creating..."
  az pipelines create --name "$PIPELINE_NAME" --yaml-path azure-pipelines.yml
else
  echo "Pipeline exists with ID: $PIPELINE_ID"
fi
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

### Handle Permission Errors

```bash
# Try operation, handle permission errors
if az devops security permission update \
  --id "$USER_ID" \
  --namespace "GitRepositories" \
  --project "$PROJECT" \
  --token "repoV2/$PROJECT/$REPO_ID" \
  --allow-bit 2 \
  --deny-bit 0 2>&1 | grep -q "unauthorized"; then
  echo "Error: Insufficient permissions to update repository permissions"
  exit 1
fi
```

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

### Graceful Degradation

```bash
# Try to download artifact, fallback to alternative source
if ! az pipelines runs artifact download \
  --artifact-name 'webapp' \
  --path ./output \
  --run-id $RUN_ID 2>/dev/null; then
  echo "Warning: Failed to download from pipeline run. Falling back to backup source..."

  # Alternative download method
  curl -L "$BACKUP_URL" -o ./output/backup.zip
fi
```

## Scripting Patterns for Idempotent Operations

### Create or Update Pattern

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

### Ensure Variable Group

```bash
# Create variable group with idempotent updates
ensure_variable_group() {
  local vg_name=$1
  shift
  local variables=("$@")

  VG_ID=$(az pipelines variable-group list --query "[?name=='$vg_name'].id" -o tsv)

  if [[ -z "$VG_ID" ]]; then
    echo "Creating variable group: $vg_name"
    VG_ID=$(az pipelines variable-group create \
      --name "$vg_name" \
      --variables "${variables[@]}" \
      --authorize true \
      --query "id" -o tsv)
  else
    echo "Variable group exists: $vg_name (ID: $VG_ID)"
  fi

  echo "$VG_ID"
}
```

### Ensure Service Connection

```bash
# Check if service connection exists, create if not
ensure_service_connection() {
  local name=$1
  local project=$2

  SC_ID=$(az devops service-endpoint list \
    --project "$project" \
    --query "[?name=='$name'].id" \
    -o tsv)

  if [[ -z "$SC_ID" ]]; then
    echo "Service connection not found. Creating..."
    # Create logic here
  else
    echo "Service connection exists: $name"
    echo "$SC_ID"
  fi
}
```

### Idempotent Work Item Creation

```bash
# Create work item only if doesn't exist with same title
create_work_item_if_new() {
  local title=$1
  local type=$2

  WI_ID=$(az boards query \
    --wiql "SELECT ID FROM WorkItems WHERE [System.WorkItemType]='$type' AND [System.Title]='$title'" \
    --query "[0].id" -o tsv)

  if [[ -z "$WI_ID" ]]; then
    echo "Creating work item: $title"
    WI_ID=$(az boards work-item create --title "$title" --type "$type" --query "id" -o tsv)
  else
    echo "Work item exists: $title (ID: $WI_ID)"
  fi

  echo "$WI_ID"
}
```

### Bulk Idempotent Operations

```bash
# Ensure multiple pipelines exist
declare -a PIPELINES=(
  "ci-pipeline:azure-pipelines.yml"
  "deploy-pipeline:deploy.yml"
  "test-pipeline:test.yml"
)

for pipeline in "${PIPELINES[@]}"; do
  IFS=':' read -r name yaml <<< "$pipeline"
  ensure_pipeline "$name" "$yaml"
done
```

### Configuration Synchronization

```bash
# Sync variable groups from config file
sync_variable_groups() {
  local config_file=$1

  while IFS=',' read -r vg_name variables; do
    ensure_variable_group "$vg_name" "$variables"
  done < "$config_file"
}

# config.csv format:
# prod-vars,API_URL=prod.com,API_KEY=secret123
# dev-vars,API_URL=dev.com,API_KEY=secret456
```

## Real-World Workflows

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

### Automated PR Creation

```bash
# Create PR from feature branch with automation
create_automated_pr() {
  local branch=$1
  local title=$2

  # Get branch info
  LAST_COMMIT=$(git log -1 --pretty=%B "$branch")
  COMMIT_SHA=$(git rev-parse "$branch")

  # Find related work items
  WORK_ITEMS=$(az boards query \
    --wiql "SELECT ID FROM WorkItems WHERE [System.ChangedBy] = @Me AND [System.State] = 'Active'" \
    --query "[].id" -o tsv)

  # Create PR
  PR_ID=$(az repos pr create \
    --source-branch "$branch" \
    --target-branch main \
    --title "$title" \
    --description "$LAST_COMMIT" \
    --work-items $WORK_ITEMS \
    --auto-complete true \
    --query "pullRequestId" -o tsv)

  # Set required reviewers
  az repos pr reviewer add \
    --id $PR_ID \
    --reviewers $(git log -1 --pretty=format:'%ae' "$branch") \
    --required true

  echo "Created PR #$PR_ID"
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

### Bulk Work Item Management

```bash
# Bulk update work items based on query
bulk_update_work_items() {
  local wiql=$1
  local updates=("$@")

  # Query work items
  WI_IDS=$(az boards query --wiql "$wiql" --query "[].id" -o tsv)

  # Update each work item
  for wi_id in $WI_IDS; do
    az boards work-item update --id $wi_id "${updates[@]}"
    echo "Updated work item: $wi_id"
  done
}

# Usage: bulk_update_work_items "SELECT ID FROM WorkItems WHERE State='New'" --state "Active" --assigned-to "user@example.com"
```

### Branch Policy Automation

```bash
# Apply branch policies to all repositories
apply_branch_policies() {
  local branch=$1
  local project=$2

  # Get all repositories
  REPOS=$(az repos list --project "$project" --query "[].id" -o tsv)

  for repo_id in $REPOS; do
    echo "Applying policies to repo: $repo_id"

    # Require minimum approvers
    az repos policy approver-count create \
      --blocking true \
      --enabled true \
      --branch "$branch" \
      --repository-id "$repo_id" \
      --minimum-approver-count 2 \
      --creator-vote-counts true

    # Require work item linking
    az repos policy work-item-linking create \
      --blocking true \
      --branch "$branch" \
      --enabled true \
      --repository-id "$repo_id"

    # Require build validation
    BUILD_ID=$(az pipelines list --query "[?name=='CI'].id" -o tsv | head -1)
    az repos policy build create \
      --blocking true \
      --enabled true \
      --branch "$branch" \
      --repository-id "$repo_id" \
      --build-definition-id "$BUILD_ID" \
      --queue-on-source-update-only true
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
