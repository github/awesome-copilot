---
name: azure-devops-cli-devops
description: Core Azure DevOps CLI setup, auth, configuration, projects, and global CLI usage patterns.
---

## When to Use This Skill

- Core Azure DevOps CLI usage with authentication, configuration, extension management, and projects.


## Prerequisites

**CLI Version:** 2.81.0

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

## Guidelines
Use the reference commands in [REFERENCE.md](references/REFERENCE.md) for specific authentication, configuration, extension management, and project management tasks.
