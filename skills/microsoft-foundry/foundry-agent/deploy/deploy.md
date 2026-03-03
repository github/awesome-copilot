# Foundry Agent Deploy

Create and manage agent deployments in Azure AI Foundry. For hosted agents, this includes the full workflow from containerizing the project to starting the agent container.

## Quick Reference

| Property | Value |
|----------|-------|
| Agent types | Prompt (LLM-based), Hosted (ACA based), Hosted (vNext) |
| MCP server | `foundry-mcp` |
| Key MCP tools | `agent_update`, `agent_container_control`, `agent_container_status_get` |
| CLI tools | `docker`, `az acr` (hosted agents only) |
| Container protocols | `a2a`, `responses`, `mcp` |
| Supported languages | .NET, Node.js, Python, Go, Java |

## When to Use This Skill

USE FOR: deploy agent to foundry, push agent to foundry, ship my agent, build and deploy container agent, deploy hosted agent, create hosted agent, deploy prompt agent, start agent container, stop agent container, ACR build, container image for agent, docker build for foundry, redeploy agent, update agent deployment, clone agent, delete agent, azd deploy hosted agent, azd ai agent, azd up for agent, deploy agent with azd.

> ⚠️ **DO NOT manually run** `azd up`, `azd deploy`, `az acr build`, `docker build`, `agent_update`, or `agent_container_control` **without reading this skill first.** This skill orchestrates the full deployment pipeline: project scan → env var collection → Dockerfile generation → image build → agent creation → container startup → verification. Running CLI commands or calling MCP tools individually skips critical steps (env var confirmation, schema validation, status polling).

## MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `agent_definition_schema_get` | Get JSON schema for agent definitions | `projectEndpoint` (required), `schemaType` (`prompt`, `hosted`, `tools`, `all`) |
| `agent_update` | Create, update, or clone an agent | `projectEndpoint`, `agentName` (required); `agentDefinition` (JSON), `isCloneRequest`, `cloneTargetAgentName`, `modelName`, `creationOptions` (JSON with `description` and `metadata`) |
| `agent_get` | List all agents or get a specific agent | `projectEndpoint` (required), `agentName` (optional) |
| `agent_delete` | Delete an agent with container cleanup | `projectEndpoint`, `agentName` (required) |
| `agent_container_control` | Start or stop a hosted agent container | `projectEndpoint`, `agentName`, `action` (`start`/`stop`) (required); `agentVersion`, `minReplicas`, `maxReplicas` |
| `agent_container_status_get` | Check container running status | `projectEndpoint`, `agentName` (required); `agentVersion` |

## Workflow: Hosted Agent Deployment
There are two types of hosted agent - ACA based and vNext. There is only one change in the deployment flow for vNext which is indicated in the steps below. You must use vNext experience only when user explicitly asks you to deploy the agent to vNext (or v2, or v-next, or similar words). For all other cases, use the ACA based deployment flow.


### Step 1: Detect and Scan Project

Get the project path from the project context (see Common: Project Context Resolution). Detect the project type by checking for these files:

| Project Type | Detection Files |
|--------------|-----------------|
| .NET | `*.csproj`, `*.fsproj` |
| Node.js | `package.json` |
| Python | `requirements.txt`, `pyproject.toml`, `setup.py` |
| Go | `go.mod` |
| Java (Maven) | `pom.xml` |
| Java (Gradle) | `build.gradle` |

Delegate an environment variable scan to a sub-agent. Provide the project path and project type. Search source files for these patterns:

| Project Type | Patterns to Search |
|--------------|--------------------|
| .NET (`*.cs`) | `Environment.GetEnvironmentVariable("...")`, `configuration["..."]`, `configuration.GetValue<T>("...")` |
| Node.js (`*.js`, `*.ts`, `*.mjs`) | `process.env.VAR_NAME`, `process.env["..."]` |
| Python (`*.py`) | `os.environ["..."]`, `os.environ.get("...")`, `os.getenv("...")` |
| Go (`*.go`) | `os.Getenv("...")`, `os.LookupEnv("...")` |
| Java (`*.java`) | `System.getenv("...")`, `@Value("${...}")` |

Classification: if followed by a throw/error → required; if followed by a fallback value → optional with default; otherwise → assume required, ask user.

### Step 2: Collect and Confirm Environment Variables

> ⚠️ **Warning:** Environment variables are included in the agent payload and are difficult to change after deployment.

Use azd environment values from the project context to pre-fill discovered variables. Merge with any user-provided values. Present all variables to the user for confirmation with variable name, value, and source (`azd`, `project default`, or `user`). Mask sensitive values.

Loop until the user confirms or cancels:
- `yes` → Proceed
- `VAR_NAME=new_value` → Update the value, show updated table, ask again
- `cancel` → Abort deployment

### Step 3: Generate Dockerfile and Build Image

Delegate Dockerfile creation to a sub-agent. Guidelines:
- Use official base image for the detected language and runtime version
- Use multi-stage builds for compiled languages
- Use Alpine or slim variants for smaller images
- Always target `linux/amd64` platform
- Expose the correct port (usually 8088)

> 💡 **Tip:** Reference [Hosted Agents Foundry Samples](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents) for containerized agent examples.

Also generate `docker-compose.yml` and `.env` files for local development.

**IMPORTANT**: You MUST always generate image tag as current timestamp (e.g., `myagent:202401011230`) to ensure uniqueness and avoid conflicts with existing images in ACR. DO NOT use static tags like `latest` or `v1`.

Collect ACR details from project context. Let the user choose the build method:

**Cloud Build (ACR Tasks) (Recommended)** — no local Docker required:
```bash
az acr build --registry <acr-name> --image <repository>:<tag> --platform linux/amd64 --source-acr-auth-id "[caller]" --file Dockerfile .
```

**Local Docker Build:**
```bash
docker build --platform linux/amd64 -t <image>:<tag> -f Dockerfile .
az acr login --name <acr-name>
docker tag <image>:<tag> <acr-name>.azurecr.io/<repository>:<tag>
docker push <acr-name>.azurecr.io/<repository>:<tag>
```

> 💡 **Tip:** Prefer Cloud Build if Docker is not available locally. On Windows with WSL, prefix Docker commands with `wsl -e` if `docker info` fails but `wsl -e docker info` succeeds.

### Step 4: Collect Agent Configuration

Use the project endpoint and ACR name from the project context. Ask the user only for values not already resolved:
- **Agent name** — Unique name for the agent
- **Model deployment** — Model deployment name (e.g., `gpt-4o`)

### Step 5: Get Agent Definition Schema

Use `agent_definition_schema_get` with `schemaType: hosted` to retrieve the current schema and validate required fields.

### Step 6: Create the Agent

> **VNext Experience:** You MUST pass `enableVnextExperience = true` in the `metadata` field of `creationOptions`. This is required for vNext deployments.

Use `agent_update` with the agent definition:

For ACA one:
```json
{
  "kind": "hosted",
  "image": "<acr-name>.azurecr.io/<repository>:<tag>",
  "cpu": "<cpu-cores>",
  "memory": "<memory>",
  "container_protocol_versions": [
    { "protocol": "<protocol>", "version": "<version>" }
  ],
  "environment_variables": { "<var>": "<value>" }
}
```

For vNext one:
```json
{
   "agentDefinition": {
    "kind": "hosted",
    "image": "<acr-name>.azurecr.io/<repository>:<tag>",
    "cpu": "<cpu-cores>",
    "memory": "<memory>",
    "container_protocol_versions": [
      { "protocol": "<protocol>", "version": "<version>" }
    ],
    "environment_variables": { "<var>": "<value>" }
  },
  "creationOptions": {
    "metadata": {
      "enableVnextExperience": "true"
    }
  }
}
```

### Step 7: Start Agent Container

Use `agent_container_control` with `action: start` to start the container.

### Step 8: Verify Agent Status

Delegate status polling to a sub-agent. Provide the project endpoint, agent name, and instruct it to use `agent_container_status_get` repeatedly until the status is `Running` or `Failed`.

**Container status values:**
- `Starting` — Container is initializing
- `Running` — Container is active and ready ✅
- `Stopped` — Container has been stopped
- `Failed` — Container failed to start ❌

### Step 9: Test the Agent

Read and follow the [invoke skill](../invoke/invoke.md) to send a test message and verify the agent responds correctly. DO NOT SKIP reading the invoke skill — it contains important information about how to format messages for hosted agents for vNext experience.

## Workflow: Prompt Agent Deployment

### Step 1: Collect Agent Configuration

Use the project endpoint from the project context (see Common: Project Context Resolution). Ask the user only for values not already resolved:
- **Agent name** — Unique name for the agent
- **Model deployment** — Model deployment name (e.g., `gpt-4o`)
- **Instructions** — System prompt (optional)
- **Temperature** — Response randomness 0-2 (optional, default varies by model)
- **Tools** — Tool configurations (optional)

### Step 2: Get Agent Definition Schema

Use `agent_definition_schema_get` with `schemaType: prompt` to retrieve the current schema.

### Step 3: Create the Agent

Use `agent_update` with the agent definition:

```json
{
  "kind": "prompt",
  "model": "<model-deployment>",
  "instructions": "<system-prompt>",
  "temperature": 0.7
}
```

### Step 4: Test the Agent

Read and follow the [invoke skill](../invoke/invoke.md) to send a test message and verify the agent responds correctly.

## Display Agent Information
Once deployment is done for either hosted or prompt agent, display the agent's details in a nicely formatted table.

Below the table you MUST also display a Playground link for direct access to the agent in Azure AI Foundry:

[Open in Playground](https://ai.azure.com/nextgen/r/{encodedSubId},{resourceGroup},,{accountName},{projectName}/build/agents/{agentName}/build?version={agentVersion})

To calculate the encodedSubId, you need to take subscription id and convert it into its 16-byte GUID, then encode it as URL-safe base64 without padding (= characters trimmed). You can use the following Python code to do this conversion:

```
python -c "import base64,uuid;print(base64.urlsafe_b64encode(uuid.UUID('<SUBSCRIPTION_ID>').bytes).rstrip(b'=').decode())"
```

## Document Deployment Context

After a successful deployment, persist the following to a `.env` or config file in the repo so future conversations (e.g., evaluation, monitoring) can pick them up automatically:

| Variable | Purpose | Example |
|----------|---------|---------|
| `AZURE_AI_PROJECT_ENDPOINT` | Foundry project endpoint | `https://<account>.services.ai.azure.com/api/projects/<project>` |
| `AZURE_AI_AGENT_NAME` | Deployed agent name | `my-support-agent` |
| `AZURE_AI_AGENT_VERSION` | Current agent version | `1` |
| `AZURE_CONTAINER_REGISTRY` | ACR resource (hosted agents) | `myregistry.azurecr.io` |

If a `.env` file already exists, read it first and merge — do not overwrite existing values without confirmation.

## After Deployment

After a successful deployment, ask the user: *"Would you like to set up evaluation and monitoring for this agent?"*

- **Evaluation & optimization** → follow the [observe skill](../observe/observe.md) to configure evaluators, run batch evaluations, and optimize the agent.
- **Production trace analysis** → follow the [trace skill](../trace/trace.md) to search conversations, diagnose failures, and analyze latency using App Insights.

## Agent Definition Schemas

### Prompt Agent

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `kind` | string | ✅ | Must be `"prompt"` |
| `model` | string | ✅ | Model deployment name (e.g., `gpt-4o`) |
| `instructions` | string | | System message for the model |
| `temperature` | number | | Response randomness (0-2) |
| `top_p` | number | | Nucleus sampling (0-1) |
| `tools` | array | | Tools the model may call |
| `tool_choice` | string/object | | Tool selection strategy |
| `rai_config` | object | | Responsible AI configuration |

### Hosted Agent

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `kind` | string | ✅ | Must be `"hosted"` |
| `image` | string | ✅ | Container image URL |
| `cpu` | string | ✅ | CPU allocation (e.g., `"0.5"`, `"1"`, `"2"`) |
| `memory` | string | ✅ | Memory allocation (e.g., `"1Gi"`, `"2Gi"`) |
| `container_protocol_versions` | array | ✅ | Protocol and version pairs |
| `environment_variables` | object | | Key-value pairs for container env vars |
| `tools` | array | | Tool configurations |
| `rai_config` | object | | Responsible AI configuration |

> **Reminder:** Always pass `creationOptions.metadata.enableVnextExperience: "true"` when creating vNext hosted agents.

### Container Protocols

| Protocol | Description |
|----------|-------------|
| `a2a` | Agent-to-Agent protocol |
| `responses` | OpenAI Responses API |
| `mcp` | Model Context Protocol |

## Agent Management Operations

### Clone an Agent

Use `agent_update` with `isCloneRequest: true` and `cloneTargetAgentName` to create a copy. For prompt agents, optionally override the model with `modelName`.

### Delete an Agent

Use `agent_delete` — automatically cleans up containers for hosted agents.

### List Agents

Use `agent_get` without `agentName` to list all agents, or with `agentName` to get a specific agent's details.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Project type not detected | No known project files found | Ask user to specify project type manually |
| Docker not running | Docker Desktop not started or not installed | Start Docker Desktop, or use Cloud Build (ACR Tasks) instead |
| ACR login failed | Not authenticated to Azure | Run `az login` first, then `az acr login --name <acr-name>` |
| Build/push failed | Dockerfile errors or insufficient ACR permissions | Check Dockerfile syntax, verify Contributor or AcrPush role on registry |
| Agent creation failed | Invalid definition or missing required fields | Use `agent_definition_schema_get` to verify schema, check all required fields |
| Container start failed | Image not accessible or invalid configuration | Verify ACR image path, check cpu/memory values, confirm ACR permissions |
| Container status: Failed | Runtime error in container | Check container logs, verify environment variables, ensure image runs correctly |
| Permission denied | Insufficient Foundry project permissions | Verify Azure AI Owner or Contributor role on the project |
| Schema fetch failed | Invalid project endpoint | Verify project endpoint URL format: `https://<resource>.services.ai.azure.com/api/projects/<project>` |

## Non-Interactive / YOLO Mode

When running in non-interactive mode (e.g., `nonInteractive: true` or YOLO mode), the skill skips user confirmation prompts and uses sensible defaults:

- **Environment variables** — Uses values resolved from `azd env get-values` and project defaults without prompting for confirmation
- **Agent name** — Must be provided in the initial user message or derived sensibly from the project context; if missing, the skill fails with an error instead of prompting
- **Container lifecycle** — Automatically starts the container and polls for `Running` status without user confirmation

> ⚠️ **Warning:** In non-interactive mode, ensure all required values (project endpoint, agent name, ACR image) are provided upfront in the user message or available via `azd env get-values`. Missing values will cause the deployment to fail rather than prompt.

## Additional Resources

- [Foundry Hosted Agents](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/hosted-agents?view=foundry)
- [Foundry Agent Runtime Components](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/runtime-components?view=foundry)
- [Foundry Samples](https://github.com/microsoft-foundry/foundry-samples/)
