---
name: azure-devops-cli-boards
description: Manage Azure Boards work items, queries, areas, and iterations with the CLI.
---

## When to Use This Skill

- You want to create, update, or query Azure Boards work items using the CLI.
- You need to manage areas and iterations for your Azure DevOps projects and teams.

## Prerequisites

- CLI Version: 2.81.0

```bash
# Install Azure DevOps extension
az extension add --name azure-devops

# Optional: set defaults to avoid repeating org/project
az devops configure --defaults organization=https://dev.azure.com/{org} project={project}
```

## Guidelines
- Use the reference commands in [REFERENCE.md](references/REFERENCE.md) for specific work item, area, and iteration management tasks.
- Area/iteration paths are absolute (for example, `\Project\Area\Team` and `\Project\Iteration\Sprint 1`).
