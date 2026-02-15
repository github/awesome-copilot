---
name: azure-devops-cli
description: Manage Azure DevOps resources via CLI including projects, repos, pipelines, builds, pull requests, work items, artifacts, and service endpoints. Use when working with Azure DevOps, az commands, devops automation, CI/CD, or when user mentions Azure DevOps CLI.
---

# Azure DevOps CLI

This Skill helps manage Azure DevOps resources using the Azure CLI with Azure DevOps extension.

**CLI Version:** 2.81.0 (current as of 2025)

## Prerequisites

Install Azure CLI and Azure DevOps extension:

```bash
# Install Azure CLI
brew install azure-cli  # macOS
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux
pip install azure-cli  # via pip

# Verify installation
az --version

# Install Azure DevOps extension
az extension add --name azure-devops
az extension show --name azure-devops
```

## CLI Structure

```
az devops          # Main DevOps commands
├── admin          # Administration (banner)
├── extension      # Extension management
├── project        # Team projects
├── security       # Security operations
│   ├── group      # Security groups
│   └── permission # Security permissions
├── service-endpoint # Service connections
├── team           # Teams
├── user           # Users
├── wiki           # Wikis
├── configure      # Set defaults
├── invoke         # Invoke REST API
├── login          # Authenticate
└── logout         # Clear credentials

az pipelines       # Azure Pipelines
├── agent          # Agents
├── build          # Builds
├── folder         # Pipeline folders
├── pool           # Agent pools
├── queue          # Agent queues
├── release        # Releases
├── runs           # Pipeline runs
├── variable       # Pipeline variables
└── variable-group # Variable groups

az boards          # Azure Boards
├── area           # Area paths
├── iteration      # Iterations
└── work-item      # Work items

az repos           # Azure Repos
├── import         # Git imports
├── policy         # Branch policies
├── pr             # Pull requests
└── ref            # Git references

az artifacts       # Azure Artifacts
└── universal      # Universal Packages
    ├── download   # Download packages
    └── publish    # Publish packages
```

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

### List Extensions

```bash
# List available extensions
az extension list-available --output table

# List installed extensions
az extension list --output table
```

### Manage Azure DevOps Extension

```bash
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

## Pipelines

### List Pipelines

```bash
az pipelines list --output table
az pipelines list --query "[?name=='myPipeline']"
az pipelines list --folder-path 'folder/subfolder'
```

### Create Pipeline

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

### Show Pipeline

```bash
az pipelines show --id {pipeline-id}
az pipelines show --name {pipeline-name}
```

### Update Pipeline

```bash
az pipelines update --id {pipeline-id} --name "New name" --description "Updated description"
```

### Delete Pipeline

```bash
az pipelines delete --id {pipeline-id} --yes
```

### Run Pipeline

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

### Pipeline Artifacts

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

### Pipeline Run Tags

```bash
# Add tag to run
az pipelines runs tag add --run-id {run-id} --tags production v1.0

# List run tags
az pipelines runs tag list --run-id {run-id} --output table
```

## Builds

### List Builds

```bash
az pipelines build list
az pipelines build list --definition {build-definition-id}
az pipelines build list --status completed --result succeeded
```

### Queue Build

```bash
az pipelines build queue --definition {build-definition-id} --branch main
az pipelines build queue --definition {build-definition-id} --parameters version=1.0.0
```

### Show Build Details

```bash
az pipelines build show --id {build-id}
```

### Cancel Build

```bash
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

### List Build Definitions

```bash
az pipelines build definition list
az pipelines build definition list --name {definition-name}
```

### Show Build Definition

```bash
az pipelines build definition show --id {definition-id}
```

## Releases

### List Releases

```bash
az pipelines release list
az pipelines release list --definition {release-definition-id}
```

### Create Release

```bash
az pipelines release create --definition {release-definition-id}
az pipelines release create --definition {release-definition-id} --description "Release v1.0"
```

### Show Release

```bash
az pipelines release show --id {release-id}
```

## Release Definitions

### List Release Definitions

```bash
az pipelines release definition list
```

### Show Release Definition

```bash
az pipelines release definition show --id {definition-id}
```

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

#### List Variables

```bash
az pipelines variable-group variable list --group-id {group-id}
```

#### Create Variable

```bash
# Non-secret variable
az pipelines variable-group variable create \
  --group-id {group-id} \
  --name {var-name} \
  --value {var-value}

# Secret variable (will prompt for value if not provided)
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
```

#### Update Variable

```bash
az pipelines variable-group variable update \
  --group-id {group-id} \
  --name {var-name} \
  --value {new-value} \
  --secret false
```

#### Delete Variable

```bash
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

## Work Items (Boards)

### Query Work Items

```bash
# WIQL query
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.State] = 'Active'"

# Query with output format
az boards query --wiql "SELECT * FROM WorkItems" --output table
```

### Show Work Item

```bash
az boards work-item show --id {work-item-id}
az boards work-item show --id {work-item-id} --open
```

### Create Work Item

```bash
# Basic work item
az boards work-item create \
  --title "Fix login bug" \
  --type Bug \
  --assigned-to user@example.com \
  --description "Users cannot login with SSO"

# With area and iteration
az boards work-item create \
  --title "New feature" \
  --type "User Story" \
  --area "Project\\Area1" \
  --iteration "Project\\Sprint 1"

# With custom fields
az boards work-item create \
  --title "Task" \
  --type Task \
  --fields "Priority=1" "Severity=2"

# With discussion comment
az boards work-item create \
  --title "Issue" \
  --type Bug \
  --discussion "Initial investigation completed"

# Open in browser after creation
az boards work-item create --title "Bug" --type Bug --open
```

### Update Work Item

```bash
# Update state, title, and assignee
az boards work-item update \
  --id {work-item-id} \
  --state "Active" \
  --title "Updated title" \
  --assigned-to user@example.com

# Move to different area
az boards work-item update \
  --id {work-item-id} \
  --area "{ProjectName}\\{Team}\\{Area}"

# Change iteration
az boards work-item update \
  --id {work-item-id} \
  --iteration "{ProjectName}\\Sprint 5"

# Add comment/discussion
az boards work-item update \
  --id {work-item-id} \
  --discussion "Work in progress"

# Update with custom fields
az boards work-item update \
  --id {work-item-id} \
  --fields "Priority=1" "StoryPoints=5"
```

### Delete Work Item

```bash
# Soft delete (can be restored)
az boards work-item delete --id {work-item-id} --yes

# Permanent delete
az boards work-item delete --id {work-item-id} --destroy --yes
```

### Work Item Relations

```bash
# List relations
az boards work-item relation list --id {work-item-id}

# List supported relation types
az boards work-item relation list-type

# Add relation
az boards work-item relation add --id {work-item-id} --relation-type parent --target-id {parent-id}

# Remove relation
az boards work-item relation remove --id {work-item-id} --relation-id {relation-id}
```

## Area Paths

### List Areas for Project

```bash
az boards area project list --project {project}
az boards area project show --path "Project\\Area1" --project {project}
```

### Create Area

```bash
az boards area project create --path "Project\\NewArea" --project {project}
```

### Update Area

```bash
az boards area project update \
  --path "Project\\OldArea" \
  --new-path "Project\\UpdatedArea" \
  --project {project}
```

### Delete Area

```bash
az boards area project delete --path "Project\\AreaToDelete" --project {project} --yes
```

### Area Team Management

```bash
# List areas for team
az boards area team list --team {team-name} --project {project}

# Add area to team
az boards area team add \
  --team {team-name} \
  --path "Project\\NewArea" \
  --project {project}

# Remove area from team
az boards area team remove \
  --team {team-name} \
  --path "Project\\AreaToRemove" \
  --project {project}

# Update team area
az boards area team update \
  --team {team-name} \
  --path "Project\\Area" \
  --project {project} \
  --include-sub-areas true
```

## Iterations

### List Iterations for Project

```bash
az boards iteration project list --project {project}
az boards iteration project show --path "Project\\Sprint 1" --project {project}
```

### Create Iteration

```bash
az boards iteration project create --path "Project\\Sprint 1" --project {project}
```

### Update Iteration

```bash
az boards iteration project update \
  --path "Project\\OldSprint" \
  --new-path "Project\\NewSprint" \
  --project {project}
```

### Delete Iteration

```bash
az boards iteration project delete --path "Project\\OldSprint" --project {project} --yes
```

### List Iterations for Team

```bash
az boards iteration team list --team {team-name} --project {project}
```

### Add Iteration to Team

```bash
az boards iteration team add \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}
```

### Remove Iteration from Team

```bash
az boards iteration team remove \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}
```

### List Work Items in Iteration

```bash
az boards iteration team list-work-items \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}
```

### Set Default Iteration for Team

```bash
az boards iteration team set-default-iteration \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}
```

### Show Default Iteration

```bash
az boards iteration team show-default-iteration \
  --team {team-name} \
  --project {project}
```

### Set Backlog Iteration for Team

```bash
az boards iteration team set-backlog-iteration \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}
```

### Show Backlog Iteration

```bash
az boards iteration team show-backlog-iteration \
  --team {team-name} \
  --project {project}
```

### Show Current Iteration

```bash
az boards iteration team show --team {team-name} --project {project} --timeframe current
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

### Lock Branch

```bash
az repos ref lock --name refs/heads/main --repository {repo} --project {project}
```

### Unlock Branch

```bash
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

## Service Endpoints

### List Service Endpoints

```bash
az devops service-endpoint list --project {project}
az devops service-endpoint list --project {project} --output table
```

### Show Service Endpoint

```bash
az devops service-endpoint show --id {endpoint-id} --project {project}
```

### Create Service Endpoint

```bash
# Using configuration file
az devops service-endpoint create --service-endpoint-configuration endpoint.json --project {project}
```

### Delete Service Endpoint

```bash
az devops service-endpoint delete --id {endpoint-id} --project {project} --yes
```

## Teams

### List Teams

```bash
az devops team list --project {project}
```

### Show Team

```bash
az devops team show --team {team-name} --project {project}
```

### Create Team

```bash
az devops team create \
  --name {team-name} \
  --description "Team description" \
  --project {project}
```

### Update Team

```bash
az devops team update \
  --team {team-name} \
  --project {project} \
  --name "{new-team-name}" \
  --description "Updated description"
```

### Delete Team

```bash
az devops team delete --team {team-name} --project {project} --yes
```

### Show Team Members

```bash
az devops team list-member --team {team-name} --project {project}
```

## Users

### List Users

```bash
az devops user list --org https://dev.azure.com/{org}
az devops user list --top 10 --output table
```

### Show User

```bash
az devops user show --user {user-id-or-email} --org https://dev.azure.com/{org}
```

### Add User

```bash
az devops user add \
  --email user@example.com \
  --license-type express \
  --org https://dev.azure.com/{org}
```

### Update User

```bash
az devops user update \
  --user {user-id-or-email} \
  --license-type advanced \
  --org https://dev.azure.com/{org}
```

### Remove User

```bash
az devops user remove --user {user-id-or-email} --org https://dev.azure.com/{org} --yes
```

## Security Groups

### List Groups

```bash
# List all groups in project
az devops security group list --project {project}

# List all groups in organization
az devops security group list --scope organization

# List with filtering
az devops security group list --project {project} --subject-types vstsgroup
```

### Show Group Details

```bash
az devops security group show --group-id {group-id}
```

### Create Group

```bash
az devops security group create \
  --name {group-name} \
  --description "Group description" \
  --project {project}
```

### Update Group

```bash
az devops security group update \
  --group-id {group-id} \
  --name "{new-group-name}" \
  --description "Updated description"
```

### Delete Group

```bash
az devops security group delete --group-id {group-id} --yes
```

### Group Memberships

```bash
# List memberships
az devops security group membership list --id {group-id}

# Add member
az devops security group membership add \
  --group-id {group-id} \
  --member-id {member-id}

# Remove member
az devops security group membership remove \
  --group-id {group-id} \
  --member-id {member-id} --yes
```

## Security Permissions

### List Namespaces

```bash
az devops security permission namespace list
```

### Show Namespace Details

```bash
# Show permissions available in a namespace
az devops security permission namespace show --namespace "GitRepositories"
```

### List Permissions

```bash
# List permissions for user/group and namespace
az devops security permission list \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project}

# List for specific token (repository)
az devops security permission list \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}"
```

### Show Permissions

```bash
az devops security permission show \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}"
```

### Update Permissions

```bash
# Grant permission
az devops security permission update \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}" \
  --permission-mask "Pull,Contribute"

# Deny permission
az devops security permission update \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}" \
  --permission-mask 0
```

### Reset Permissions

```bash
# Reset specific permission bits
az devops security permission reset \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}" \
  --permission-mask "Pull,Contribute"

# Reset all permissions
az devops security permission reset-all \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}" --yes
```

## Wikis

### List Wikis

```bash
# List all wikis in project
az devops wiki list --project {project}

# List all wikis in organization
az devops wiki list
```

### Show Wiki

```bash
az devops wiki show --wiki {wiki-name} --project {project}
az devops wiki show --wiki {wiki-name} --project {project} --open
```

### Create Wiki

```bash
# Create project wiki
az devops wiki create \
  --name {wiki-name} \
  --project {project} \
  --type projectWiki

# Create code wiki from repository
az devops wiki create \
  --name {wiki-name} \
  --project {project} \
  --type codeWiki \
  --repository {repo-name} \
  --mapped-path /wiki
```

### Delete Wiki

```bash
az devops wiki delete --wiki {wiki-id} --project {project} --yes
```

### Wiki Pages

```bash
# List pages
az devops wiki page list --wiki {wiki-name} --project {project}

# Show page
az devops wiki page show \
  --wiki {wiki-name} \
  --path "/page-name" \
  --project {project}

# Create page
az devops wiki page create \
  --wiki {wiki-name} \
  --path "/new-page" \
  --content "# New Page\n\nPage content here..." \
  --project {project}

# Update page
az devops wiki page update \
  --wiki {wiki-name} \
  --path "/existing-page" \
  --content "# Updated Page\n\nNew content..." \
  --project {project}

# Delete page
az devops wiki page delete \
  --wiki {wiki-name} \
  --path "/old-page" \
  --project {project} --yes
```

## Administration

### Banner Management

```bash
# List banners
az devops admin banner list

# Show banner details
az devops admin banner show --id {banner-id}

# Add new banner
az devops admin banner add \
  --message "System maintenance scheduled" \
  --level info  # info, warning, error

# Update banner
az devops admin banner update \
  --id {banner-id} \
  --message "Updated message" \
  --level warning \
  --expiration-date "2025-12-31T23:59:59Z"

# Remove banner
az devops admin banner remove --id {banner-id}
```

## DevOps Extensions

Manage extensions installed in an Azure DevOps organization (different from CLI extensions).

```bash
# List installed extensions
az devops extension list --org https://dev.azure.com/{org}

# Search marketplace extensions
az devops extension search --search-query "docker"

# Show extension details
az devops extension show --ext-id {extension-id} --org https://dev.azure.com/{org}

# Install extension
az devops extension install \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org} \
  --publisher {publisher-id}

# Enable extension
az devops extension enable \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org}

# Disable extension
az devops extension disable \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org}

# Uninstall extension
az devops extension uninstall \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org} --yes
```

## Universal Packages

### Publish Package

```bash
az artifacts universal publish \
  --feed {feed-name} \
  --name {package-name} \
  --version {version} \
  --path {package-path} \
  --project {project}
```

### Download Package

```bash
az artifacts universal download \
  --feed {feed-name} \
  --name {package-name} \
  --version {version} \
  --path {download-path} \
  --project {project}
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

## Git Aliases

After enabling git aliases:

```bash
# Enable Git aliases
az devops configure --use-git-aliases true

# Use Git commands for DevOps operations
git pr create --target-branch main
git pr list
git pr checkout 123
```

## Output Formats

All commands support multiple output formats:

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

Filter and transform output:

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

## Advanced JMESPath Queries

### Filtering and Sorting

```bash
# Filter by multiple conditions
az pipelines list --query "[?name.contains('CI') && enabled==true]"

# Filter by status and result
az pipelines runs list --query "[?status=='completed' && result=='succeeded']"

# Sort by date (descending)
az pipelines runs list --query "sort_by([?status=='completed'], &finishTime | reverse(@))"

# Get top N items after filtering
az pipelines runs list --query "[?result=='succeeded'] | [0:5]"
```

### Nested Queries

```bash
# Extract nested properties
az pipelines show --id $PIPELINE_ID --query "{Name:name, Repo:repository.{Name:name, Type:type}, Folder:folder}"

# Query build details
az pipelines build show --id $BUILD_ID --query "{ID:id, Number:buildNumber, Status:status, Result:result, Requested:requestedFor.displayName}"
```

### Complex Filtering

```bash
# Find pipelines with specific YAML path
az pipelines list --query "[?process.type.name=='yaml' && process.yamlFilename=='azure-pipelines.yml']"

# Find PRs from specific reviewer
az repos pr list --query "[?contains(reviewers[?displayName=='John Doe'].displayName, 'John Doe')]"

# Find work items with specific iteration and state
az boards work-item show --id $WI_ID --query "{Title:fields['System.Title'], State:fields['System.State'], Iteration:fields['System.IterationPath']}"
```

### Aggregation

```bash
# Count items by status
az pipelines runs list --query "groupBy([?status=='completed'], &[result]) | {Succeeded: [?key=='succeeded'][0].count, Failed: [?key=='failed'][0].count}"

# Get unique reviewers
az repos pr list --query "unique_by(reviewers[], &displayName)"

# Sum values
az pipelines runs list --query "[?result=='succeeded'] | [].{Duration:duration} | [0].Duration"
```

### Conditional Transformation

```bash
# Format dates
az pipelines runs list --query "[].{ID:id, Date:createdDate, Formatted:createdDate | format_datetime(@, 'yyyy-MM-dd HH:mm')}"

# Conditional output
az pipelines list --query "[].{Name:name, Status:(enabled ? 'Enabled' : 'Disabled')}"

# Extract with defaults
az pipelines show --id $PIPELINE_ID --query "{Name:name, Folder:folder || 'Root', Description:description || 'No description'}"
```

### Complex Workflows

```bash
# Find longest running builds
az pipelines build list --query "sort_by([?result=='succeeded'], &queueTime) | reverse(@) | [0:3].{ID:id, Number:buildNumber, Duration:duration}"

# Get PR statistics per reviewer
az repos pr list --query "groupBy([], &reviewers[].displayName) | [].{Reviewer:@.key, Count:length(@)}"

# Find work items with multiple child items
az boards work-item relation list --id $PARENT_ID --query "[?rel=='System.LinkTypes.Hierarchy-Forward'] | [].{ChildID:url | split('/', @) | [-1]}"
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

## Enhanced Global Arguments

| Parameter            | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `--help` / `-h`      | Show command help                                          |
| `--output` / `-o`    | Output format (json, jsonc, none, table, tsv, yaml, yamlc) |
| `--query`            | JMESPath query string for filtering output                 |
| `--verbose`          | Increase logging verbosity                                 |
| `--debug`            | Show all debug logs                                        |
| `--only-show-errors` | Only show errors, suppress warnings                        |
| `--subscription`     | Name or ID of subscription                                 |
| `--yes` / `-y`       | Skip confirmation prompts                                  |

## Enhanced Common Parameters

| Parameter                  | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `--org` / `--organization` | Azure DevOps organization URL (e.g., `https://dev.azure.com/{org}`) |
| `--project` / `-p`         | Project name or ID                                                  |
| `--detect`                 | Auto-detect organization from git config                            |
| `--yes` / `-y`             | Skip confirmation prompts                                           |
| `--open`                   | Open resource in web browser                                        |
| `--subscription`           | Azure subscription (for Azure resources)                            |

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
