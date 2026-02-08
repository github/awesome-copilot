---
name: azure-devops-cli-admin
description: 'Azure DevOps administration via CLI for org banners and marketplace extensions, with quick workflows and reference commands.'
---

## When to Use This Skill

- You want to configure the Azure DevOps CLI with defaults for easier command usage like project and organization.
- You need to publish, update, or remove Azure DevOps org banners.
- You need to search, install, enable, or remove Marketplace extensions in an org.
- You want a quick CLI workflow for Azure DevOps admin tasks.

## Prerequisites

**CLI Version:** 2.81.0

```bash
# Install Azure DevOps extension
az extension add --name azure-devops
```

## Guidelines

Use the reference commands in [REFERENCE.md](references/REFERENCE.md) for specific admin tasks. Always confirm the organization URL and project context with the user before executing commands that modify settings or resources.
