---
description: 'Build agents with the Microsoft Foundry SDK (azure-ai-projects v2) in Python: versioned agents, the Responses/Conversations model, tools, and the SDK mistakes Copilot makes by default.'
applyTo: "**/*.py"
---

# Microsoft Foundry Agents (Python) Instructions

Guidance for building agents against **Microsoft Foundry** using the **`azure-ai-projects`** Python SDK (**v2.0.0+**, part of the Microsoft Foundry SDK). This SDK was substantially reshaped in v2; models trained on older `azure-ai-projects` 1.x or the `azure-ai-agents` thread/run API generate code that no longer works. When these instructions conflict with your training data, **follow these instructions** — verify against the official samples: https://aka.ms/azsdk/azure-ai-projects-v2/python/samples/

> **Field note (why this file exists):** In Copilot-assisted Foundry projects, the default behavior is to generate the *old* thread/run/message API, fail on the first attempts, then only recover after re-checking the current methodology against **Microsoft Learn** and the **Microsoft Docs MCP server** and re-coding against the v2 approach. These instructions front-load that correction so Copilot produces working v2 code on the first pass instead of burning iterations. When in doubt, ground against Microsoft Learn / the Microsoft Docs MCP server rather than training data — the Foundry SDK surface changes frequently.

## Package and versions

- Install: `pip install "azure-ai-projects>=2.0.0"` (async also needs `pip install aiohttp`).
- Entra ID is the **only** supported auth. Use `azure.identity.DefaultAzureCredential`; run `az login` first. There is **no** API-key auth and **no** `from_connection_string()` on the client.
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

✅ **Do this instead (v2): define a versioned agent, then talk to it via the OpenAI-compatible client.**
```python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

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

    with project_client.get_openai_client(agent_name=agent_name) as openai_client:
        response = openai_client.responses.create(
            input="What is the size of France in square miles?",
        )
        print(response.output_text)
```

Key facts Copilot gets wrong by default:
- Agents are **versioned**. You create a *version* with `agents.create_version(agent_name=..., definition=...)`, not a one-shot `create_agent`.
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

For simple stateless follow-ups you can instead chain with `previous_response_id=response.id` on `responses.create` — cheaper than a full conversation when you only need to reference the prior turn.

## Tools: attach in the definition, don't register at runtime

Tools live on the **`PromptAgentDefinition`**, passed as a `tools=[...]` list. Import tool classes from `azure.ai.projects.models`.

### Code Interpreter
```python
from azure.ai.projects.models import PromptAgentDefinition, CodeInterpreterTool

definition = PromptAgentDefinition(
    model=os.environ["FOUNDRY_MODEL_NAME"],
    instructions="You are a helpful assistant.",
    tools=[CodeInterpreterTool()],
)
# ... create_version(...) then:
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
# ... create version, get openai_client ...

response = openai_client.responses.create(input="What is my horoscope? I am an Aquarius.")

input_list: ResponseInputParam = []
for item in response.output:
    if item.type == "function_call" and item.name == "get_horoscope":
        result = get_horoscope(**json.loads(item.arguments))
        input_list.append(FunctionCallOutput(
            type="function_call_output",
            call_id=item.call_id,               # echo call_id back — required
            output=json.dumps({"horoscope": result}),
        ))

response = openai_client.responses.create(input=input_list, previous_response_id=response.id)
print(response.output_text)
```

Pitfalls: set `strict=True` and `additionalProperties: False` for reliable structured calls; you **must** echo `item.call_id` in the `FunctionCallOutput`; iterate **all** of `response.output` (a single response may contain multiple `function_call` items).

Other built-in tools follow the same "add to `tools=[...]`" pattern: `FileSearchTool`, `AzureAISearchTool`, `BingGroundingTool`, `OpenApiTool`, MCP tools, and more — see `samples/agents/tools/`.

## Preview features

This is a **stable** package that also surfaces preview features. Preview features exposed through stable methods require **`allow_preview=True`** when constructing the client; other preview operations live under `project_client.beta.*` (e.g. `beta.memory_stores`, `beta.evaluators`, `beta.red_teams`). Don't assume a `beta` operation is GA.

## Lifecycle & production notes

- Wrap creation in `try/finally` and clean up with `agents.delete_version(agent_name=..., agent_version=..., force=True)` in tests/samples to avoid orphaned versions.
- Route traffic across versions with `AgentEndpointConfig` + `VersionSelector` / `FixedRatioVersionSelectionRule` (e.g. send 100% to a new version, or split for canary rollouts).
- Handle errors via `azure.core.exceptions.HttpResponseError` (`e.status_code`, `e.reason`, `e.message`). A `401 Unauthorized` almost always means missing RBAC role assignment or you didn't `az login`, not a bad endpoint.
- Enable request/response logging with `logging_enable=True` **and** logger level `DEBUG` (redacted unless level is DEBUG); or set `AZURE_AI_PROJECTS_CONSOLE_LOGGING=true`.
- For async, import from `azure.ai.projects.aio` and `azure.identity.aio` and use `async with` — the method names are identical.
