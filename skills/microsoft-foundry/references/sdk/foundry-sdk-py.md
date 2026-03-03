# Microsoft Foundry - Python SDK Guide

Python-specific implementations for working with Microsoft Foundry.

## Prerequisites

```bash
pip install azure-ai-projects azure-identity azure-ai-inference openai azure-ai-evaluation python-dotenv
```

### Environment Variables

```bash
PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
MODEL_DEPLOYMENT_NAME=gpt-4o
AZURE_AI_SEARCH_CONNECTION_NAME=my-search-connection
AI_SEARCH_INDEX_NAME=my-index
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

## Model Discovery and Deployment (MCP)

```python
foundry_models_list()                              # All models
foundry_models_list(publisher="OpenAI")             # Filter by publisher
foundry_models_list(search_for_free_playground=True) # Free playground models

foundry_models_deploy(
    resource_group="my-rg", deployment="gpt-4o-deployment",
    model_name="gpt-4o", model_format="OpenAI",
    azure_ai_services="my-foundry-resource",
    model_version="2024-05-13", sku_capacity=10, scale_type="Standard"
)
```

## RAG Agent with Azure AI Search

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
import os
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
from azure.ai.agents.models import (
    AzureAISearchToolDefinition, AzureAISearchToolResource,
    AISearchIndexResource, AzureAISearchQueryType,
)

project_client = AIProjectClient(
    endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
    credential=DefaultAzureCredential(),
)

azs_connection = project_client.connections.get(
    os.environ["AZURE_AI_SEARCH_CONNECTION_NAME"]
)

agent = project_client.agents.create_agent(
    model=os.environ["FOUNDRY_MODEL_DEPLOYMENT_NAME"],
    name="RAGAgent",
    instructions="You are a helpful assistant. Use the knowledge base to answer. "
        "Provide citations as: `[message_idx:search_idx†source]`.",
    tools=[AzureAISearchToolDefinition(
        azure_ai_search=AzureAISearchToolResource(indexes=[
            AISearchIndexResource(
                index_connection_id=azs_connection.id,
                index_name=os.environ["AI_SEARCH_INDEX_NAME"],
                query_type=AzureAISearchQueryType.HYBRID,
            ),
        ])
    )],
)
```

### Querying a RAG Agent (Streaming)

```python
openai_client = project_client.get_openai_client()

stream = openai_client.responses.create(
    stream=True, tool_choice="required", input="Your question here",
    extra_body={"agent": {"name": agent.name, "type": "agent_reference"}},
)
for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="", flush=True)
    elif event.type == "response.output_item.done":
        if event.item.type == "message" and event.item.content[-1].type == "output_text":
            for ann in event.item.content[-1].annotations:
                if ann.type == "url_citation":
                    print(f"\nCitation: {ann.url}")
```

## Creating Agents

### Basic Agent

```python
agent = project_client.agents.create_agent(
    model=os.environ["MODEL_DEPLOYMENT_NAME"],
    name="my-agent",
    instructions="You are a helpful assistant.",
)
```

### Agent with Custom Function Tools

```python
from azure.ai.agents.models import FunctionTool, ToolSet

def get_weather(location: str, unit: str = "celsius") -> str:
    """Get the current weather for a location."""
    return f"Sunny and 22°{unit[0].upper()} in {location}"

functions = FunctionTool([get_weather])
toolset = ToolSet()
toolset.add(functions)

agent = project_client.agents.create_agent(
    model=os.environ["MODEL_DEPLOYMENT_NAME"],
    name="function-agent",
    instructions="You are a helpful assistant with tool access.",
    toolset=toolset,
)
```

### Agent with Web Search

```python
from azure.ai.projects.models import (
    PromptAgentDefinition, WebSearchPreviewTool, ApproximateLocation,
)

agent = project_client.agents.create_version(
    agent_name="WebSearchAgent",
    definition=PromptAgentDefinition(
        model=os.environ["MODEL_DEPLOYMENT_NAME"],
        instructions="Search the web for current information. Provide sources.",
        tools=[
            WebSearchPreviewTool(
                user_location=ApproximateLocation(
                    country="US", city="Seattle", region="Washington"
                )
            )
        ],
    ),
)
```

> 💡 **Tip:** `WebSearchPreviewTool` requires no external resource or connection. For Bing Grounding (which requires a dedicated Bing resource and project connection), see [Bing Grounding reference](../../foundry-agent/create/references/tool-bing-grounding.md).

### Interacting with Agents

```python
from azure.ai.agents.models import ListSortOrder

thread = project_client.agents.threads.create()
project_client.agents.messages.create(thread_id=thread.id, role="user", content="Hello")

run = project_client.agents.runs.create_and_process(thread_id=thread.id, agent_id=agent.id)
if run.status == "failed":
    print(f"Run failed: {run.last_error}")

messages = project_client.agents.messages.list(thread_id=thread.id, order=ListSortOrder.ASCENDING)
for msg in messages:
    if msg.text_messages:
        print(f"{msg.role}: {msg.text_messages[-1].text.value}")

project_client.agents.delete_agent(agent.id)
```

## Agent Evaluation

### Single Response Evaluation (MCP)

```python
foundry_agents_query_and_evaluate(
    agent_id="<agent-id>", query="What's the weather?",
    endpoint="https://my-foundry.services.ai.azure.com/api/projects/my-project",
    azure_openai_endpoint="https://my-openai.openai.azure.com",
    azure_openai_deployment="gpt-4o",
    evaluators="intent_resolution,task_adherence,tool_call_accuracy"
)

foundry_agents_evaluate(
    query="What's the weather?", response="Sunny and 22°C.",
    evaluator="intent_resolution",
    azure_openai_endpoint="https://my-openai.openai.azure.com",
    azure_openai_deployment="gpt-4o"
)
```

### Batch Evaluation

```python
from azure.ai.evaluation import AIAgentConverter, IntentResolutionEvaluator, evaluate

converter = AIAgentConverter(project_client)
converter.prepare_evaluation_data(thread_ids=["t1", "t2", "t3"], filename="eval_data.jsonl")

result = evaluate(
    data="eval_data.jsonl",
    evaluators={
        "intent_resolution": IntentResolutionEvaluator(
            azure_openai_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            azure_openai_deployment=os.environ["AZURE_OPENAI_DEPLOYMENT"]
        ),
    },
    output_path="./eval_results"
)
print(f"Results: {result['studio_url']}")
```

> 💡 **Tip:** Continuous evaluation requires project managed identity with **Azure AI User** role and Application Insights connected to the project.

## Knowledge Index Operations (MCP)

```python
foundry_knowledge_index_list(endpoint="<project-endpoint>")
foundry_knowledge_index_schema(endpoint="<project-endpoint>", index="my-index")
```

## Best Practices

1. **Never hardcode credentials** — use environment variables and `python-dotenv`
2. **Check `run.status`** and handle `HttpResponseError` exceptions
3. **Reuse `AIProjectClient`** instances — don't create new ones per request
4. **Use type hints** in custom functions for better tool integration
5. **Use context managers** for agent cleanup

## Error Handling

```python
from azure.core.exceptions import HttpResponseError

try:
    agent = project_client.agents.create_agent(
        model=os.environ["MODEL_DEPLOYMENT_NAME"],
        name="my-agent", instructions="You are helpful."
    )
except HttpResponseError as e:
    if e.status_code == 429:
        print("Rate limited — wait and retry with exponential backoff.")
    elif e.status_code == 401:
        print("Authentication failed — check credentials.")
    else:
        print(f"Error: {e.message}")
```

### Context Manager for Agent Cleanup

```python
from contextlib import contextmanager

@contextmanager
def temporary_agent(project_client, **kwargs):
    agent = project_client.agents.create_agent(**kwargs)
    try:
        yield agent
    finally:
        project_client.agents.delete_agent(agent.id)
```
