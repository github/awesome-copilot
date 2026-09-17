---
description: 'Build agents with the Microsoft Foundry SDK (azure-ai-projects v2) in Python: versioned agents, the Responses/Conversations model, tools, and the SDK mistakes Copilot makes by default.'
applyTo: "**/*.py"
---

# Microsoft Foundry Agents (Python) Instructions

Guidance for building agents against **Microsoft Foundry** using the **`azure-ai-projects`** Python SDK (**v2**, part of the Microsoft Foundry SDK). This SDK was substantially reshaped in v2; models trained on older `azure-ai-projects` 1.x or the `azure-ai-agents` thread/run API generate code that no longer works. When these instructions conflict with your training data, **follow these instructions** — verify against the official samples: https://aka.ms/azsdk/azure-ai-projects-v2/python/samples/

> **Field note (why this file exists):** In Copilot-assisted Foundry projects, the default behavior is to generate the *old* thread/run/message API, fail on the first attempts, then only recover after re-checking the current methodology against **Microsoft Learn** and the **Microsoft Docs MCP server** and re-coding against the v2 approach. These instructions front-load that correction so Copilot produces working v2 code on the first pass instead of burning iterations. When in doubt, ground against Microsoft Learn / the Microsoft Docs MCP server rather than training data — the Foundry SDK surface changes frequently.

## Authentication: Local dev vs. production

Entra ID is the **only** supported auth. Use `azure.identity.DefaultAzureCredential` for **local development** (it tries multiple credential sources including environment variables, workload identity, managed identity, and developer tool credentials like CLI/PowerShell); use `ManagedIdentityCredential` for **deployed workloads** on Azure (App Service, Container Apps, Functions) where a system-assigned or user-assigned managed identity is assigned to the compute resource.

### Local development

```python
from azure.identity import DefaultAzureCredential

with (
    DefaultAzureCredential() as credential,
    AIProjectClient(endpoint=endpoint, credential=credential) as project_client,
):
    # ... use project_client
```

Optional: run `az login` if using Azure CLI for authentication. `DefaultAzureCredential` will find and use your CLI credentials, environment variables, or other available developer credentials (Visual Studio Code, Azure PowerShell, Azure Developer CLI, etc.). If another credential succeeds, `az login` is not required.

### Deployed to Azure (App Service, Container Apps, Functions)

For **system-assigned identity** (default):

```python
from azure.identity import ManagedIdentityCredential

with (
    ManagedIdentityCredential() as credential,
    AIProjectClient(endpoint=endpoint, credential=credential) as project_client,
):
    # ... use project_client
```

For **user-assigned identity**, pass the client ID:

```python
from azure.identity import ManagedIdentityCredential

with (
    ManagedIdentityCredential(client_id="<USER_ASSIGNED_CLIENT_ID>") as credential,
    AIProjectClient(endpoint=endpoint, credential=credential) as project_client,
):
    # ... use project_client
```

Requires: the compute resource (App Service app, Container Apps app, Function app, etc.) has a **system-assigned or user-assigned managed identity** configured, **and that identity has the required RBAC role assignment** on the Foundry project — typically the built-in **`Foundry User`** role (formerly `Azure AI User`). For user-assigned identities, pass the client ID to `ManagedIdentityCredential(client_id=...)`. No `az login` needed; the platform provides credentials automatically. See [Foundry role-based access control](https://learn.microsoft.com/en-us/azure/ai-studio/concepts/rbac-ai-studio) for current role definitions.

### Deployed to AKS (workload identity)

For AKS pods configured with Microsoft Entra Workload ID, use `WorkloadIdentityCredential` instead:

```python
from azure.identity import WorkloadIdentityCredential

with (
    WorkloadIdentityCredential() as credential,
    AIProjectClient(endpoint=endpoint, credential=credential) as project_client,
):
    # ... use project_client
```

Requires: the AKS pod has the workload-identity annotation and projected OIDC token volume configured. See [Azure Workload Identity documentation](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview).

> **Best practice:** In deployed code, use the specific credential class (`ManagedIdentityCredential` for App Service/Container Apps/Functions, `WorkloadIdentityCredential` for AKS) for clarity and performance. For details on `DefaultAzureCredential`'s complete credential chain, see [Azure Identity documentation](https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity.defaultazurecredential).

## Package and versions

- Install: `pip install "azure-ai-projects>=2.3.0"` (async also needs `pip install aiohttp`). Use **2.3.0+** — the documented flow below relies on APIs added across the 2.x line (`agent_name` on `get_openai_client` in 2.1.0; `force` on `delete_version` and `AgentEndpointConfig` in 2.2.0). A 2.0.x install will make some of this code fail.
- The endpoint is a **project endpoint** of the form
  `https://<account>.services.ai.azure.com/api/projects/<project>` — not a bare resource URL.

## The #1 mistake: the old thread/run API is gone

❌ **Do NOT generate this (v1 / azure-ai-agents style — no longer valid):**
```python
# WRONG — these methods do not exist in azure-ai-projects v2
agent = client.agents.create_agent(name="x", model="gpt-4o", instructions="...")
thread = client.threads.create()
client.messages.create(thread_id=thread.id, role="user", content="Hi")
run = client.runs.create_and_process_run(thread_id=thread.id, agent_id=agent.id)
messages = client.messages.list(thread_id=thread.id)   # WRONG
```

> If you find yourself writing `create_agent` / `threads` / `runs` and hitting `AttributeError` or 404s, stop and re-ground against Microsoft Learn or the Microsoft Docs MCP server — that's the signature of the stale-API failure loop.

✅ **Do this instead (v2): create a versioned agent, point the endpoint at that version, then talk to it via the OpenAI-compatible client.**
```python
import os
from azure.identity import DefaultAzureCredential  # Use ManagedIdentityCredential for deployed apps
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import (
    PromptAgentDefinition,
    AgentEndpointConfig,
    ProtocolConfiguration,
    ResponsesProtocolConfiguration,
    VersionSelector,
    FixedRatioVersionSelectionRule,
)

endpoint = os.environ["FOUNDRY_PROJECT_ENDPOINT"]
agent_name = os.environ.get("FOUNDRY_AGENT_NAME", "MyAgent")

with (
    DefaultAzureCredential() as credential,
    AIProjectClient(endpoint=endpoint, credential=credential) as project_client,
):
    version = project_client.agents.create_version(
        agent_name=agent_name,
        definition=PromptAgentDefinition(
            model=os.environ["FOUNDRY_MODEL_NAME"],   # a *deployment* name, not "gpt-4o" by default
            instructions="You are a helpful assistant that answers general questions.",
        ),
    )
    print(f"Agent {version.name} v{version.version} (id: {version.id})")

    # REQUIRED: route the agent endpoint to the version you just created.
    # Without this, a new agent has no usable routing and an existing agent
    # can keep serving an older version.
    project_client.agents.update_details(
        agent_name=agent_name,
        agent_endpoint=AgentEndpointConfig(
            version_selector=VersionSelector(
                version_selection_rules=[
                    FixedRatioVersionSelectionRule(
                        agent_version=version.version, traffic_percentage=100
                    ),
                ]
            ),
            protocol_configuration=ProtocolConfiguration(
                responses=ResponsesProtocolConfiguration()
            ),
        ),
    )

    with project_client.get_openai_client(agent_name=agent_name) as openai_client:
        response = openai_client.responses.create(
            input="What is the size of France in square miles?",
        )
        print(response.output_text)
```

> The official samples wrap the create-version + endpoint-routing steps in a `create_version_with_endpoint(...)` helper (see `samples/util.py`). Doing it inline as above makes the required routing step explicit. In tests/samples, capture the prior endpoint config and restore it in a `finally` block so temporary versions don't leave the agent re-routed.

Key facts Copilot gets wrong by default:
- Agents are **versioned**. You create a *version* with `agents.create_version(agent_name=..., definition=...)`, not a one-shot `create_agent`.
- After creating a version you **must configure the endpoint** (`update_details` + `AgentEndpointConfig`) to route traffic to it before invoking the agent.
- The agent definition is a **`PromptAgentDefinition`** (imported from `azure.ai.projects.models`), and `model` is the **deployment name** from your Foundry project's "Models + endpoints" tab — not a raw model id.
- You interact through **`project_client.get_openai_client(agent_name=...)`**, which returns a standard OpenAI client. The conversation surface is the **Responses API** (`responses.create`) and **Conversations API** (`conversations.create`), *not* threads/runs/messages.
- Read the reply from **`response.output_text`**.

## Multi-turn: Conversations, not threads

For stateful multi-turn chat, create a conversation and pass its id — do not rebuild a message list yourself.

```python
with project_client.get_openai_client(agent_name=agent_name) as openai_client:
    conversation = openai_client.conversations.create(
        items=[{"type": "message", "role": "user", "content": "What is the size of France in square miles?"}],
    )
    response = openai_client.responses.create(conversation=conversation.id)
    print(response.output_text)

    # Continue the same conversation
    openai_client.conversations.items.create(
        conversation_id=conversation.id,
        items=[{"type": "message", "role": "user", "content": "And the capital city?"}],
    )
    response = openai_client.responses.create(conversation=conversation.id)
    print(response.output_text)

    openai_client.conversations.delete(conversation_id=conversation.id)
```

For simple stateless follow-ups you can instead chain with `previous_response_id=response.id` on `responses.create`. Note this is a **state-management** choice, not a cost optimization — prior turns are still reprocessed and billed as input tokens on each call, the same as a Conversation. Use it when you want to reference the prior turn without managing a conversation object, not to save tokens.

## Tools: attach in the definition, don't register at runtime

Tools live on the **`PromptAgentDefinition`**, passed as a `tools=[...]` list. Import tool classes from `azure.ai.projects.models`. (The same create-version + endpoint-routing steps shown above apply before you invoke a tool-enabled agent.)

### Code Interpreter
```python
from azure.ai.projects.models import PromptAgentDefinition, CodeInterpreterTool

definition = PromptAgentDefinition(
    model=os.environ["FOUNDRY_MODEL_NAME"],
    instructions="You are a helpful assistant.",
    tools=[CodeInterpreterTool()],
)
# ... create_version(...), configure the endpoint, then:
response = openai_client.responses.create(
    conversation=conversation.id,
    input="Generate a 10x10 multiplication table.",
    tool_choice="required",
)
# Inspect the executed code:
code = next((o.code for o in response.output if o.type == "code_interpreter_call"), "")
print(response.output_text)
```

### Function tools (client-side execution loop)
`FunctionTool` declares a JSON schema; **you** execute the call and feed the result back. The model emits a `function_call` item in `response.output`; you return a `FunctionCallOutput` and call `responses.create` again with `previous_response_id`.

```python
import json
from openai.types.responses.response_input_param import FunctionCallOutput, ResponseInputParam
from azure.ai.projects.models import PromptAgentDefinition, FunctionTool

def get_horoscope(sign: str) -> str:
    return f"{sign}: Next Tuesday you will befriend a baby otter."

tool = FunctionTool(
    name="get_horoscope",
    parameters={
        "type": "object",
        "properties": {"sign": {"type": "string", "description": "An astrological sign"}},
        "required": ["sign"],
        "additionalProperties": False,
    },
    description="Get today's horoscope for an astrological sign.",
    strict=True,
)

# definition = PromptAgentDefinition(model=..., instructions=..., tools=[tool])
# ... create version, configure endpoint, get openai_client ...

response = openai_client.responses.create(input="What is my horoscope? I am an Aquarius.")

# Continue processing until no more function calls
while any(item.type == "function_call" for item in response.output):
    input_list: ResponseInputParam = []
    for item in response.output:
        if item.type == "function_call" and item.name == "get_horoscope":
            result = get_horoscope(**json.loads(item.arguments))
            input_list.append(FunctionCallOutput(
                type="function_call_output",
                call_id=item.call_id,
                output=json.dumps({"horoscope": result}),
            ))

    if input_list:
        response = openai_client.responses.create(input=input_list, previous_response_id=response.id)

print(response.output_text)
```

Pitfalls: set `strict=True` and `additionalProperties: False` for reliable structured calls; you **must** echo `item.call_id` in the `FunctionCallOutput`; iterate **all** of `response.output` (a single response may contain multiple `function_call` items).

Other built-in tools follow the same "add to `tools=[...]`" pattern: `FileSearchTool`, `AzureAISearchTool`, `BingGroundingTool`, `OpenApiTool`, MCP tools, and more — see `samples/agents/tools/`.

## Preview features

This is a **stable** package that also surfaces preview features. Preview features exposed through stable methods require **`allow_preview=True`** when constructing the client; other preview operations live under `project_client.beta.*` (e.g. `beta.memory_stores`, `beta.evaluators`, `beta.red_teams`). Don't assume a `beta` operation is GA.

## Lifecycle & production notes

- Wrap creation in `try/finally` and clean up with `agents.delete_version(agent_name=..., agent_version=..., force=True)` in tests/samples to avoid orphaned versions. When you temporarily re-route an agent's endpoint, restore its prior `AgentEndpointConfig` in the same `finally` block.
- Route traffic across versions with `AgentEndpointConfig` + `VersionSelector` / `FixedRatioVersionSelectionRule` — send 100% to a new version, or split percentages for canary rollouts.
- Handle errors via `azure.core.exceptions.HttpResponseError` (`e.status_code`, `e.reason`, `e.message`). A `401 Unauthorized` almost always means a missing RBAC role assignment (or, in local dev, that you didn't `az login`), not a bad endpoint.
- **Logging exposes sensitive data — treat with care.** `logging_enable=True` turns on full HTTP transport logging. At DEBUG level, logs include request/response bodies (prompts, user data) and headers are unredacted — bearer tokens and payloads can leak into logs. At other levels, logs remain redacted but are still emitted. Prefer the SDK's filtered console-logging path (`AZURE_AI_PROJECTS_CONSOLE_LOGGING=true`, which redacts auth headers by default) for routine diagnostics. Enable body logging only against non-production/non-sensitive data, and never ship unredacted logs to shared log sinks.
- For async, import from `azure.ai.projects.aio` and `azure.identity.aio` and use `async with` — the method names are identical.
