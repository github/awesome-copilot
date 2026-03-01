# Python Guide

Use this reference when the user explicitly asks for Python.

## Prerequisites

- Python 3.8+
- GitHub Copilot CLI installed and authenticated (`copilot --version`)

## Install

```bash
pip install github-copilot-sdk
```

## Quick Start

```python
import asyncio
from copilot import CopilotClient

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({"model": "gpt-4.1"})
    response = await session.send_and_wait({"prompt": "What is 2 + 2?"})

    print(response.data.content)
    await client.stop()

asyncio.run(main())
```

## Streaming Responses

Enable real-time output for better UX:

```python
import asyncio
import sys
from copilot import CopilotClient
from copilot.generated.session_events import SessionEventType

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({
        "model": "gpt-4.1",
        "streaming": True,
    })

    def handle_event(event):
        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            sys.stdout.write(event.data.delta_content)
            sys.stdout.flush()
        if event.type == SessionEventType.SESSION_IDLE:
            print()

    session.on(handle_event)
    await session.send_and_wait({"prompt": "Tell me a short joke"})
    await client.stop()

asyncio.run(main())
```

## Custom Tools (Pydantic)

Define tools that Copilot can invoke during reasoning. When you define a tool, you tell Copilot:
1. **What the tool does** (description)
2. **What parameters it needs** (schema)
3. **What code to run** (handler)

```python
import asyncio
import random
import sys
from copilot import CopilotClient
from copilot.tools import define_tool
from copilot.generated.session_events import SessionEventType
from pydantic import BaseModel, Field

class GetWeatherParams(BaseModel):
    city: str = Field(description="The name of the city to get weather for")

@define_tool(description="Get the current weather for a city")
async def get_weather(params: GetWeatherParams) -> dict:
    city = params.city
    conditions = ["sunny", "cloudy", "rainy", "partly cloudy"]
    temp = random.randint(50, 80)
    condition = random.choice(conditions)
    return {"city": city, "temperature": f"{temp}°F", "condition": condition}

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({
        "model": "gpt-4.1",
        "streaming": True,
        "tools": [get_weather],
    })

    def handle_event(event):
        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            sys.stdout.write(event.data.delta_content)
            sys.stdout.flush()

    session.on(handle_event)

    await session.send_and_wait({
        "prompt": "What's the weather like in Seattle and Tokyo?"
    })

    await client.stop()

asyncio.run(main())
```

## Interactive CLI Assistant

Build a complete interactive assistant:

```python
import asyncio
import random
import sys
from copilot import CopilotClient
from copilot.tools import define_tool
from copilot.generated.session_events import SessionEventType
from pydantic import BaseModel, Field

class GetWeatherParams(BaseModel):
    city: str = Field(description="The name of the city to get weather for")

@define_tool(description="Get the current weather for a city")
async def get_weather(params: GetWeatherParams) -> dict:
    conditions = ["sunny", "cloudy", "rainy", "partly cloudy"]
    temp = random.randint(50, 80)
    condition = random.choice(conditions)
    return {"city": params.city, "temperature": f"{temp}°F", "condition": condition}

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({
        "model": "gpt-4.1",
        "streaming": True,
        "tools": [get_weather],
    })

    def handle_event(event):
        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            sys.stdout.write(event.data.delta_content)
            sys.stdout.flush()

    session.on(handle_event)

    print("Weather Assistant (type 'exit' to quit)")
    print("Try: 'What's the weather in Paris?'\n")

    while True:
        try:
            user_input = input("You: ")
        except EOFError:
            break

        if user_input.lower() == "exit":
            break

        sys.stdout.write("Assistant: ")
        await session.send_and_wait({"prompt": user_input})
        print("\n")

    await client.stop()

asyncio.run(main())
```

## MCP Server Integration

Connect to MCP (Model Context Protocol) servers for pre-built tools. Connect to GitHub's MCP server for repository, issue, and PR access:

```python
session = await client.create_session({
    "model": "gpt-4.1",
    "mcp_servers": {
        "github": {
            "type": "http",
            "url": "https://api.githubcopilot.com/mcp/",
        },
    },
})
```

## Custom Agents

Define specialized AI personas for specific tasks:

```python
session = await client.create_session({
    "model": "gpt-4.1",
    "custom_agents": [{
        "name": "pr-reviewer",
        "display_name": "PR Reviewer",
        "description": "Reviews pull requests for best practices",
        "prompt": "You are an expert code reviewer. Focus on security, performance, and maintainability.",
    }],
})
```

## System Message

Customize the AI's behavior and personality:

```python
session = await client.create_session({
    "model": "gpt-4.1",
    "system_message": {
        "content": "You are a helpful assistant for our engineering team. Always be concise.",
    },
})
```

## External CLI Server

Run the CLI in server mode separately and connect the SDK to it. Useful for debugging, resource sharing, or custom environments.

### Start CLI in Server Mode

```bash
copilot --server --port 4321
```

### Connect SDK to External Server

```python
client = CopilotClient({
    "cli_url": "localhost:4321"
})
await client.start()

session = await client.create_session({"model": "gpt-4.1"})
```

## Samples

- Python: https://github.com/github/copilot-sdk/tree/main/python/samples
