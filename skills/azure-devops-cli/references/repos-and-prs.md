# Repositories & Pull Requests

## Table of Contents
- [Repositories](#repositories)
- [Repository Import](#repository-import)
- [Pull Requests](#pull-requests)
- [Git References](#git-references)
- [Repository Policies](#repository-policies)

---

## Repositories

### List Repositories

```bash
az repos list --org https://dev.azure.com/{org} --project {project}
az repos list --output table
```

### Show Repository Details

```bash
az repos show --repository {repo-name} --project {project}
```

### Create Repository

```bash
az repos create --name {repo-name} --project {project}
```

### Delete Repository

```bash
az repos delete --id {repo-id} --project {project} --yes
```

### Update Repository

```bash
az repos update --id {repo-id} --name {new-name} --project {project}
```

## Repository Import

### Import Git Repository

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

### List References (Branches)

```bash
az repos ref list --repository {repo}
az repos ref list --repository {repo} --query "[?name=='refs/heads/main']"
```

### Create Reference (Branch)

```bash
az repos ref create --name refs/heads/new-branch --object-type commit --object {commit-sha}
```

### Delete Reference (Branch)

```bash
az repos ref delete --name refs/heads/old-branch --repository {repo} --project {project}
```

### Lock/Unlock Branch

```bash
az repos ref lock --name refs/heads/main --repository {repo} --project {project}
az repos ref unlock --name refs/heads/main --repository {repo} --project {project}
```

## Repository Policies

### List All Policies

```bash
az repos policy list --repository {repo-id} --branch main
```

### Create/Update/Delete Policy

```bash
# Create from config file
az repos policy create --config policy.json

# Update
az repos policy update --id {policy-id} --config updated-policy.json

# Delete
az repos policy delete --id {policy-id} --yes
```

### Approver Count Policy

```bash
az repos policy approver-count create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id} \
  --minimum-approver-count 2 \
  --creator-vote-counts true
```

### Build Policy

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

### Work Item Linking Policy

```bash
az repos policy work-item-linking create \
  --blocking true \
  --branch main \
  --enabled true \
  --repository-id {repo-id}
```

### Required Reviewer Policy

```bash
az repos policy required-reviewer create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id} \
  --required-reviewers user@example.com
```

### Merge Strategy Policy

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

### Case Enforcement Policy

```bash
az repos policy case-enforcement create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id}
```

### Comment Required Policy

```bash
az repos policy comment-required create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id}
```

### File Size Policy

```bash
az repos policy file-size create \
  --blocking true \
  --enabled true \
  --branch main \
  --repository-id {repo-id} \
  --maximum-file-size 10485760  # 10MB in bytes
```
