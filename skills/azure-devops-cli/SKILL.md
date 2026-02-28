---
name: azure-devops-cli
description: Manage Azure DevOps resources via CLI including projects, repos, pipelines, builds, pull requests, work items, artifacts, and service endpoints. Use when working with Azure DevOps, az commands, devops automation, CI/CD, or when user mentions Azure DevOps CLI.
---

# Azure DevOps CLI

Manage Azure DevOps resources using the Azure CLI with the Azure DevOps extension.

**CLI Version:** 2.81.0 (current as of 2025)

## Prerequisites

```bash
# Install Azure CLI
brew install azure-cli  # macOS
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux

# Install Azure DevOps extension
az extension add --name azure-devops
```

## Authentication

```bash
# Login with PAT token
az devops login --organization https://dev.azure.com/{org} --token YOUR_PAT_TOKEN

# Set default organization and project (avoids repeating --org/--project)
az devops configure --defaults organization=https://dev.azure.com/{org} project={project}

# List current configuration
az devops configure --list
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
```

## Reference Files

Read the relevant reference file based on the user's task. Each file contains complete command syntax and examples for its domain.

| File | When to read | Covers |
|---|---|---|
| `references/repos-and-prs.md` | Repos, branches, pull requests, branch policies | Repositories, Import, PRs (create/list/vote/reviewers/policies), Git refs, Branch policies |
| `references/pipelines-and-builds.md` | Pipelines, builds, releases, artifacts | Pipelines CRUD, runs, builds, releases, artifacts download/upload |
| `references/boards-and-iterations.md` | Work items, sprints, area paths | Work items (WIQL/create/update/relations), Area paths, Iterations, Team iterations |
| `references/variables-and-agents.md` | Pipeline variables, agent pools | Pipeline variables, Variable groups, Pipeline folders, Agent pools/queues |
| `references/org-and-security.md` | Projects, teams, users, permissions, wikis | Projects, Extensions, Teams, Users, Security groups/permissions, Service endpoints, Wikis, Admin |
| `references/advanced-usage.md` | Output formatting, JMESPath queries | Output formats, JMESPath queries (basic + advanced), Global args, Common params, Git aliases |
| `references/workflows-and-patterns.md` | Automation scripts, best practices, error handling | Common workflows, Best practices, Error handling, Scripting patterns, Real-world examples |
