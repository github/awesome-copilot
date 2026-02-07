# Azure & Cloud Development Plugin

Comprehensive Azure cloud development tools including Infrastructure as Code, serverless functions, architecture patterns, and cost optimization for building scalable cloud applications.

## Installation

```bash
# Using Copilot CLI
copilot plugin install azure-cloud-development@awesome-copilot
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/azure-cloud-development:azure-resource-health-diagnose` | Analyze Azure resource health, diagnose issues from logs and telemetry, and create a remediation plan for identified problems. |
| `/azure-cloud-development:az-cost-optimize` | Analyze Azure resources used in the app (IaC files and/or resources in a target rg) and optimize costs - creating GitHub issues for identified optimizations. |

### Agents

| Agent | Description |
|-------|-------------|
| `azure-principal-architect` | Provide expert Azure Principal Architect guidance using Azure Well-Architected Framework principles and Microsoft best practices. |
| `azure-saas-architect` | Provide expert Azure SaaS Architect guidance focusing on multitenant applications using Azure Well-Architected SaaS principles and Microsoft best practices. |
| `azure-logic-apps-expert` | Expert guidance for Azure Logic Apps development focusing on workflow design, integration patterns, and JSON-based Workflow Definition Language. |
| `azure-verified-modules-bicep` | Create, update, or review Azure IaC in Bicep using Azure Verified Modules (AVM). |
| `azure-verified-modules-terraform` | Create, update, or review Azure IaC in Terraform using Azure Verified Modules (AVM). |
| `terraform-azure-planning` | Act as implementation planner for your Azure Terraform Infrastructure as Code task. |
| `terraform-azure-implement` | Act as an Azure Terraform Infrastructure as Code coding specialist that creates and reviews Terraform for Azure resources. |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
