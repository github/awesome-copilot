# Repositories

- [Repositories](#repositories)
  - [List Repositories](#list-repositories)
  - [Show Repository Details](#show-repository-details)
  - [Create Repository](#create-repository)
  - [Delete Repository](#delete-repository)
  - [Update Repository](#update-repository)
  - [Repository Import](#repository-import)
  - [Pull Requests](#pull-requests)
    - [Create Pull Request](#create-pull-request)
    - [List Pull Requests](#list-pull-requests)
    - [Show PR Details](#show-pr-details)
    - [Update PR (Complete/Abandon/Draft)](#update-pr-completeabandondraft)
    - [Checkout PR Locally](#checkout-pr-locally)
    - [Vote on PR](#vote-on-pr)
    - [PR Reviewers](#pr-reviewers)
    - [PR Work Items](#pr-work-items)
    - [PR Policies](#pr-policies)
  - [Git References](#git-references)
  - [Repository Policies](#repository-policies)
    - [List All Policies](#list-all-policies)
    - [Create Policy Using Configuration File](#create-policy-using-configuration-file)
    - [Update/Delete Policy](#updatedelete-policy)
    - [Policy Types](#policy-types)
      - [Approver Count Policy](#approver-count-policy)
      - [Build Policy](#build-policy)
      - [Work Item Linking Policy](#work-item-linking-policy)
      - [Required Reviewer Policy](#required-reviewer-policy)
      - [Merge Strategy Policy](#merge-strategy-policy)
      - [Case Enforcement Policy](#case-enforcement-policy)
      - [Comment Required Policy](#comment-required-policy)
      - [File Size Policy](#file-size-policy)
  - [Git Aliases](#git-aliases)
  - [JMESPath Examples](#jmespath-examples)
  - [Common Workflows](#common-workflows)
    - [Create PR from Current Branch](#create-pr-from-current-branch)
    - [Approve and Complete PR](#approve-and-complete-pr)
    - [Automated PR Creation](#automated-pr-creation)
    - [Branch Policy Automation](#branch-policy-automation)

## List Repositories

```bash
az repos list --org https://dev.azure.com/{org} --project {project}
az repos list --output table
```

## Show Repository Details

```bash
az repos show --repository {repo-name} --project {project}
```

## Create Repository

```bash
az repos create --name {repo-name} --project {project}
```

## Delete Repository

```bash
az repos delete --id {repo-id} --project {project} --yes
```

## Update Repository

```bash
az repos update --id {repo-id} --name {new-name} --project {project}
```

## Repository Import

```bash
# Import from public Git repository
az repos import create \
  --git-source-url https://github.com/user/repo \
  --repository {repo-name}

# Import with authentication
az repos import create \
  --git-source-url https://github.com/user/private-repo \
  --repository {repo-name} \
  --user {username} \
  --password {password-or-pat}
```

## Pull Requests

### Create Pull Request

```bash
# Basic PR creation
az repos pr create \
  --repository {repo} \
  --source-branch {source-branch} \
  --target-branch {target-branch} \
  --title "PR Title" \
  --description "PR description" \
  --open

# PR with work items
az repos pr create \
  --repository {repo} \
  --source-branch {source-branch} \
  --work-items 63 64

# Draft PR with reviewers
az repos pr create \
  --repository {repo} \
  --source-branch feature/new-feature \
  --target-branch main \
  --title "Feature: New functionality" \
  --draft true \
  --reviewers user1@example.com user2@example.com \
  --required-reviewers lead@example.com \
  --labels "enhancement" "backlog"
```

### List Pull Requests

```bash
# All PRs
az repos pr list --repository {repo}

# Filter by status
az repos pr list --repository {repo} --status active

# Filter by creator
az repos pr list --repository {repo} --creator {email}

# Output as table
az repos pr list --repository {repo} --output table
```

### Show PR Details

```bash
az repos pr show --id {pr-id}
az repos pr show --id {pr-id} --open  # Open in browser
```

### Update PR (Complete/Abandon/Draft)

```bash
# Complete PR
az repos pr update --id {pr-id} --status completed

# Abandon PR
az repos pr update --id {pr-id} --status abandoned

# Set to draft
az repos pr update --id {pr-id} --draft true

# Publish draft PR
az repos pr update --id {pr-id} --draft false

# Auto-complete when policies pass
az repos pr update --id {pr-id} --auto-complete true

# Set title and description
az repos pr update --id {pr-id} --title "New title" --description "New description"
```

### Checkout PR Locally

```bash
# Checkout PR branch
az repos pr checkout --id {pr-id}

# Checkout with specific remote
az repos pr checkout --id {pr-id} --remote-name upstream
```

### Vote on PR

```bash
az repos pr set-vote --id {pr-id} --vote approve
az repos pr set-vote --id {pr-id} --vote approve-with-suggestions
az repos pr set-vote --id {pr-id} --vote reject
az repos pr set-vote --id {pr-id} --vote wait-for-author
az repos pr set-vote --id {pr-id} --vote reset
```

### PR Reviewers

```bash
# Add reviewers
az repos pr reviewer add --id {pr-id} --reviewers user1@example.com user2@example.com

# List reviewers
az repos pr reviewer list --id {pr-id}

# Remove reviewers
az repos pr reviewer remove --id {pr-id} --reviewers user1@example.com
```

### PR Work Items

```bash
# Add work items to PR
az repos pr work-item add --id {pr-id} --work-items {id1} {id2}

# List PR work items
az repos pr work-item list --id {pr-id}

# Remove work items from PR
az repos pr work-item remove --id {pr-id} --work-items {id1}
```

### PR Policies

```bash
# List policies for a PR
az repos pr policy list --id {pr-id}

# Queue policy evaluation for a PR
az repos pr policy queue --id {pr-id} --evaluation-id {evaluation-id}
```

## Git References

```bash
# List references (branches)
az repos ref list --repository {repo}
az repos ref list --repository {repo} --query "[?name=='refs/heads/main']"

# Create reference (branch)
az repos ref create --name refs/heads/new-branch --object-type commit --object {commit-sha}

# Delete reference (branch)
az repos ref delete --name refs/heads/old-branch --repository {repo} --project {project}

# Lock branch
az repos ref lock --name refs/heads/main --repository {repo} --project {project}

# Unlock branch
az repos ref unlock --name refs/heads/main --repository {repo} --project {project}
```

## Repository Policies

### List All Policies

```bash
az repos policy list --repository {repo-id} --branch main
```

### Create Policy Using Configuration File

```bash
az repos policy create --config policy.json
```

### Update/Delete Policy

```bash
# Update
az repos policy update --id {policy-id} --config updated-policy.json

# Delete
az repos policy delete --id {policy-id} --yes
```

### Policy Types

#### Approver Count Policy

```bash
az repos policy approver-count create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id} \
  --minimum-approver-count 2 \
  --creator-vote-counts true
```

#### Build Policy

```bash
az repos policy build create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id} \
  --build-definition-id {definition-id} \
  --queue-on-source-update-only true \
  --valid-duration 720
```

#### Work Item Linking Policy

```bash
az repos policy work-item-linking create \
  --blocking true \
  --branch main \
  --enabled true \
  --repository-id {repo-id}
```

#### Required Reviewer Policy

```bash
az repos policy required-reviewer create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id} \
  --required-reviewers user@example.com
```

#### Merge Strategy Policy

```bash
az repos policy merge-strategy create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id} \
  --allow-squash true \
  --allow-rebase true \
  --allow-no-fast-forward true
```

#### Case Enforcement Policy

```bash
az repos policy case-enforcement create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id}
```

#### Comment Required Policy

```bash
az repos policy comment-required create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id}
```

#### File Size Policy

```bash
az repos policy file-size create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id} \
  --maximum-file-size 10485760  # 10MB in bytes
```

## Git Aliases

```bash
# Enable Git aliases
az devops configure --use-git-aliases true

# Use Git commands for DevOps operations
git pr create --target-branch main
git pr list
git pr checkout 123
```

## JMESPath Examples

```bash
# Find PRs from specific reviewer
az repos pr list --query "[?contains(reviewers[?displayName=='John Doe'].displayName, 'John Doe')]"

# Get unique reviewers
az repos pr list --query "unique_by(reviewers[], &displayName)"
```

## Common Workflows

### Create PR from Current Branch

```bash
CURRENT_BRANCH=$(git branch --show-current)
az repos pr create \
  --source-branch $CURRENT_BRANCH \
  --target-branch main \
  --title "Feature: $(git log -1 --pretty=%B)" \
  --open
```

### Approve and Complete PR

```bash
# Vote approve
az repos pr set-vote --id {pr-id} --vote approve

# Complete PR
az repos pr update --id {pr-id} --status completed
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
