---
name: microsoft-foundry
description: "Use this skill to work with Microsoft Foundry (Azure AI Foundry) and tools from Foundry MCP server: deploy AI models, manage hosted agent and prompt agent (create, deploy, invoke, run, troubleshoot Foundry Agents), manage RBAC permissions and role assignments, manage quotas and capacity, create Foundry resources. USE FOR: Microsoft Foundry, AI Foundry, hosted agent, create agent, deploy agent, debug agent, invoke agent, run agent, agent chat, evaluate agent, agent monitoring, deploy model, model catalog, knowledge index, create Foundry project, new Foundry project, set up Foundry, onboard to Foundry, create Foundry resource, create AI Services, AIServices kind, register resource provider, enable Cognitive Services, setup AI Services account, create resource group for Foundry, RBAC, role assignment, quota, capacity, TPM, deployment failure, QuotaExceeded. DO NOT USE FOR: Azure Functions (use azure-functions), App Service (use azure-create-app), generic Azure resource creation (use azure-create-app)."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.1"
---

# Microsoft Foundry Skill

This skill helps developers work with Microsoft Foundry resources, covering model discovery and deployment, complete dev lifecycle of AI agent, evaluation workflows, and troubleshooting.

## Sub-Skills

> **MANDATORY: Before executing ANY workflow, you MUST read the corresponding sub-skill document.** Do not call MCP tools for a workflow without reading its skill document. This applies even if you already know the MCP tool parameters — the skill document contains required workflow steps, pre-checks, and validation logic that must be followed. This rule applies on every new user message that triggers a different workflow, even if the skill is already loaded.

This skill includes specialized sub-skills for specific workflows. **Use these instead of the main skill when they match your task:**

| Sub-Skill | When to Use | Reference |
|-----------|-------------|-----------|
| **deploy** | Containerize, build, push to ACR, create/update/start/stop/clone agent deployments | [deploy](foundry-agent/deploy/deploy.md) |
| **invoke** | Send messages to an agent, single or multi-turn conversations | [invoke](foundry-agent/invoke/invoke.md) |
| **troubleshoot** | View container logs, query telemetry, diagnose failures | [troubleshoot](foundry-agent/troubleshoot/troubleshoot.md) |
| **create** | Create new hosted agent applications. Supports Microsoft Agent Framework, LangGraph, or custom frameworks in Python or C#. Downloads starter samples from foundry-samples repo. | [create](foundry-agent/create/create.md) |
| **project/create** | Creating a new Azure AI Foundry project for hosting agents and models. Use when onboarding to Foundry or setting up new infrastructure. | [project/create/create-foundry-project.md](project/create/create-foundry-project.md) |
| **resource/create** | Creating Azure AI Services multi-service resource (Foundry resource) using Azure CLI. Use when manually provisioning AI Services resources with granular control. | [resource/create/create-foundry-resource.md](resource/create/create-foundry-resource.md) |
| **models/deploy-model** | Unified model deployment with intelligent routing. Handles quick preset deployments, fully customized deployments (version/SKU/capacity/RAI), and capacity discovery across regions. Routes to sub-skills: `preset` (quick deploy), `customize` (full control), `capacity` (find availability). | [models/deploy-model/SKILL.md](models/deploy-model/SKILL.md) |
| **quota** | Managing quotas and capacity for Microsoft Foundry resources. Use when checking quota usage, troubleshooting deployment failures due to insufficient quota, requesting quota increases, or planning capacity. | [quota/quota.md](quota/quota.md) |
| **rbac** | Managing RBAC permissions, role assignments, managed identities, and service principals for Microsoft Foundry resources. Use for access control, auditing permissions, and CI/CD setup. | [rbac/rbac.md](rbac/rbac.md) |

> 💡 **Tip:** For a complete onboarding flow: `project/create` → agent workflows (`deploy` → `invoke`).

> 💡 **Model Deployment:** Use `models/deploy-model` for all deployment scenarios — it intelligently routes between quick preset deployment, customized deployment with full control, and capacity discovery across regions.

## Agent Development Lifecycle

Match user intent to the correct workflow. Read each sub-skill in order before executing.

| User Intent | Workflow (read in order) |
|-------------|------------------------|
| Create a new agent from scratch | [create](foundry-agent/create/create.md) → [deploy](foundry-agent/deploy/deploy.md) → [invoke](foundry-agent/invoke/invoke.md) |
| Deploy an agent (code already exists) | deploy → invoke |
| Update/redeploy an agent after code changes | deploy → invoke |
| Invoke/test/chat with an agent | invoke |
| Troubleshoot an agent issue | invoke → troubleshoot |
| Fix a broken agent (troubleshoot + redeploy) | invoke → troubleshoot → apply fixes → deploy → invoke |
| Start/stop agent container | deploy |

## Agent: Project Context Resolution

Agent skills should run this step **only when they need configuration values they don't already have**. If a value (e.g., project endpoint, agent name) is already known from the user's message or a previous skill in the same session, skip resolution for that value.

### Step 1: Detect azd Project

If any required configuration value is missing, check if `azure.yaml` exists in the project root (workspace root or user-specified project path). If found, run `azd env get-values` to load environment variables.

### Step 2: Resolve Common Configuration

Match missing values against the azd environment:

| azd Variable | Resolves To | Used By |
|-------------|-------------|---------|
| `AZURE_AI_PROJECT_ENDPOINT` or `AZURE_AIPROJECT_ENDPOINT` | Project endpoint | deploy, invoke, troubleshoot |
| `AZURE_CONTAINER_REGISTRY_NAME` or `AZURE_CONTAINER_REGISTRY_ENDPOINT` | ACR registry name / image URL prefix | deploy |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription | troubleshoot |

### Step 3: Collect Missing Values

Use the `ask_user` or `askQuestions` tool **only for values not resolved** from the user's message, session context, or azd environment. Common values skills may need:
- **Project endpoint** — AI Foundry project endpoint URL
- **Agent name** — Name of the target agent

> 💡 **Tip:** If the user provides a project endpoint or agent name in their initial message, extract it directly — do not ask again.

## Agent: Agent Types

All agent skills support two agent types:

| Type | Kind | Description |
|------|------|-------------|
| **Prompt** | `"prompt"` | LLM-based agents backed by a model deployment |
| **Hosted** | `"hosted"` | Container-based agents running custom code |

Use `agent_get` MCP tool to determine an agent's type when needed.

## Tool Usage Conventions

- Use the `ask_user` or `askQuestions` tool whenever collecting information from the user
- Use the `task` or `runSubagent` tool to delegate long-running or independent sub-tasks (e.g., env var scanning, status polling, Dockerfile generation)
- Prefer Azure MCP tools over direct CLI commands when available
- Reference official Microsoft documentation URLs instead of embedding CLI command syntax

## Additional Resources

- [Foundry Hosted Agents](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/hosted-agents?view=foundry)
- [Foundry Agent Runtime Components](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/runtime-components?view=foundry)
- [Foundry Samples](https://github.com/azure-ai-foundry/foundry-samples)

## SDK Quick Reference

- [Python](references/sdk/foundry-sdk-py.md)