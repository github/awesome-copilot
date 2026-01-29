---
applyTo: "**.py, pyproject.toml, setup.py"
description: "This file provides guidance on building Python applications using GitHub Copilot SDK."
name: "GitHub Copilot SDK Python Instructions"
---

## Core Principles

- The SDK is in technical preview and may have breaking changes
- Requires Python 3.9 or later
- Requires GitHub Copilot CLI installed and in PATH
- Uses async/await patterns throughout (asyncio)
- Supports both async context managers and manual lifecycle management
- Type hints provided for better IDE support

## Installation

Always install via pip:

```bash
pip install copilot-sdk
# or with poetry
poetry add copilot-sdk
# or with uv
uv add copilot-sdk
```

## Client Initialization

### Basic Client Setup

```python
from copilot import CopilotClient
import asyncio

async def main():
    async with CopilotClient() as client:
        # Use client...
        pass

asyncio.run(main())
```

### Client Configuration Options

When creating a CopilotClient, use a dict with these keys:

- `cli_path` - Path to CLI executable (default: "copilot" from PATH or COPILOT_CLI_PATH env var)
- `cli_url` - URL of existing CLI server (e.g., "localhost:8080"). When provided, client won't spawn a process
- `port` - Server port (default: 0 for random)
- `use_stdio` - Use stdio transport instead of TCP (default: True)
- `log_level` - Log level (default: "info")
- `auto_start` - Auto-start server (default: True)
- `auto_restart` - Auto-restart on crash (default: True)
- `cwd` - Working directory for the CLI process (default: os.getcwd())
- `env` - Environment variables for the CLI process (dict)

### Manual Server Control

For explicit control:

```python
from copilot import CopilotClient
import asyncio

async def main():
    client = CopilotClient({"auto_start": False})
    await client.start()
    # Use client...
    await client.stop()

asyncio.run(main())
```

Use `force_stop()` when `stop()` takes too long.

## Session Management

### Creating Sessions

Use a dict for SessionConfig:

```python
session = await client.create_session({
    "model": "gpt-5",
    "streaming": True,
    "tools": [...],
    "system_message": { ... },
    "available_tools": ["tool1", "tool2"],
    "excluded_tools": ["tool3"],
    "provider": { ... }
})
```

### Session Config Options

- `session_id` - Custom session ID (str)
- `model` - Model name ("gpt-5", "claude-sonnet-4.5", etc.)
- `tools` - Custom tools exposed to the CLI (list[Tool])
- `system_message` - System message customization (dict)
- `available_tools` - Allowlist of tool names (list[str])
- `excluded_tools` - Blocklist of tool names (list[str])
- `provider` - Custom API provider configuration (BYOK) (ProviderConfig)
- `streaming` - Enable streaming response chunks (bool)
- `mcp_servers` - MCP server configurations (list)
- `custom_agents` - Custom agent configurations (list)
- `config_dir` - Config directory override (str)
- `skill_directories` - Skill directories (list[str])
- `disabled_skills` - Disabled skills (list[str])
- `on_permission_request` - Permission request handler (callable)

### Resuming Sessions

```python
session = await client.resume_session("session-id", {
    "tools": [my_new_tool]
})
```

### Session Operations

- `session.session_id` - Get session identifier (str)
- `await session.send({"prompt": "...", "attachments": [...]})` - Send message, returns str (message ID)
- `await session.send_and_wait({"prompt": "..."}, timeout=60.0)` - Send and wait for idle, returns SessionEvent | None
- `await session.abort()` - Abort current processing
- `await session.get_messages()` - Get all events/messages, returns list[SessionEvent]
- `await session.destroy()` - Clean up session

## Event Handling

### Event Subscription Pattern

ALWAYS use asyncio events or futures for waiting on session events:

```python
import asyncio

done = asyncio.Event()

def handler(event):
    if event.type == "assistant.message":
        print(event.data.content)
    elif event.type == "session.idle":
        done.set()

session.on(handler)
await session.send({"prompt": "..."})
await done.wait()
```

### Unsubscribing from Events

The `on()` method returns a function that unsubscribes:

```python
unsubscribe = session.on(lambda event: print(event.type))
# Later...
unsubscribe()
```

### Event Types

Use attribute access for event type checking:

```python
def handler(event):
    if event.type == "user.message":
        # Handle user message
        pass
    elif event.type == "assistant.message":
        print(event.data.content)
    elif event.type == "tool.executionStart":
        # Tool execution started
        pass
    elif event.type == "tool.executionComplete":
        # Tool execution completed
        pass
    elif event.type == "session.start":
        # Session started
        pass
    elif event.type == "session.idle":
        # Session is idle (processing complete)
        pass
    elif event.type == "session.error":
        print(f"Error: {event.data.message}")

session.on(handler)
```

## Streaming Responses

### Enabling Streaming

Set `streaming: True` in SessionConfig:

```python
session = await client.create_session({
    "model": "gpt-5",
    "streaming": True
})
```

### Handling Streaming Events

Handle both delta events (incremental) and final events:

```python
import asyncio

done = asyncio.Event()

def handler(event):
    if event.type == "assistant.message.delta":
        # Incremental text chunk
        print(event.data.delta_content, end="", flush=True)
    elif event.type == "assistant.reasoning.delta":
        # Incremental reasoning chunk (model-dependent)
        print(event.data.delta_content, end="", flush=True)
    elif event.type == "assistant.message":
        # Final complete message
        print("\n--- Final ---")
        print(event.data.content)
    elif event.type == "assistant.reasoning":
        # Final reasoning content
        print("--- Reasoning ---")
        print(event.data.content)
    elif event.type == "session.idle":
        done.set()

session.on(handler)
await session.send({"prompt": "Tell me a story"})
await done.wait()
```

Note: Final events (`assistant.message`, `assistant.reasoning`) are ALWAYS sent regardless of streaming setting.

## Custom Tools

### Defining Tools with define_tool

Use `define_tool` for tool definitions:

```python
from copilot import define_tool

async def fetch_issue(issue_id: str):
    # Fetch issue from tracker
    return {"id": issue_id, "status": "open"}

session = await client.create_session({
    "model": "gpt-5",
    "tools": [
        define_tool(
            name="lookup_issue",
            description="Fetch issue details from tracker",
            parameters={
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "Issue ID"}
                },
                "required": ["id"]
            },
            handler=lambda args, inv: fetch_issue(args["id"])
        )
    ]
})
```

### Using Pydantic for Parameters

The SDK works well with Pydantic models:

```python
from pydantic import BaseModel, Field

class WeatherArgs(BaseModel):
    location: str = Field(description="City name")
    units: str = Field(default="fahrenheit", description="Temperature units")

async def get_weather(args: WeatherArgs, inv):
    return {"temperature": 72, "units": args.units}

session = await client.create_session({
    "tools": [
        define_tool(
            name="get_weather",
            description="Get weather for a location",
            parameters=WeatherArgs.model_json_schema(),
            handler=lambda args, inv: get_weather(WeatherArgs(**args), inv)
        )
    ]
})
```

### Tool Return Types

- Return any JSON-serializable value (automatically wrapped)
- Or return a ToolResult dict for full control:

```python
{
    "text_result_for_llm": str,  # Result shown to LLM
    "result_type": "success" | "failure",
    "error": str,  # Optional: Internal error (not shown to LLM)
    "tool_telemetry": dict  # Optional: Telemetry data
}
```

### Tool Handler Signature

Tool handlers receive two arguments:

- `args` (dict) - The tool arguments passed by the LLM
- `invocation` (ToolInvocation) - Metadata about the invocation
  - `invocation.session_id` - Session ID
  - `invocation.tool_call_id` - Tool call ID
  - `invocation.tool_name` - Tool name
  - `invocation.arguments` - Same as args parameter

### Tool Execution Flow

When Copilot invokes a tool, the client automatically:

1. Runs your handler function
2. Serializes the return value
3. Responds to the CLI

## System Message Customization

### Append Mode (Default - Preserves Guardrails)

```python
session = await client.create_session({
    "model": "gpt-5",
    "system_message": {
        "mode": "append",
        "content": """
<workflow_rules>
- Always check for security vulnerabilities
- Suggest performance improvements when applicable
</workflow_rules>
"""
    }
})
```

### Replace Mode (Full Control - Removes Guardrails)

```python
session = await client.create_session({
    "model": "gpt-5",
    "system_message": {
        "mode": "replace",
        "content": "You are a helpful assistant."
    }
})
```

## File Attachments

Attach files to messages:

```python
await session.send({
    "prompt": "Analyze this file",
    "attachments": [
        {
            "type": "file",
            "path": "/path/to/file.py",
            "display_name": "My File"
        }
    ]
})
```

## Message Delivery Modes

Use the `mode` key in message options:

- `"enqueue"` - Queue message for processing
- `"immediate"` - Process message immediately

```python
await session.send({
    "prompt": "...",
    "mode": "enqueue"
})
```

## Multiple Sessions

Sessions are independent and can run concurrently:

```python
session1 = await client.create_session({"model": "gpt-5"})
session2 = await client.create_session({"model": "claude-sonnet-4.5"})

await asyncio.gather(
    session1.send({"prompt": "Hello from session 1"}),
    session2.send({"prompt": "Hello from session 2"})
)
```

## Bring Your Own Key (BYOK)

Use custom API providers via `provider`:

```python
session = await client.create_session({
    "provider": {
        "type": "openai",
        "base_url": "https://api.openai.com/v1",
        "api_key": "your-api-key"
    }
})
```

## Session Lifecycle Management

### Listing Sessions

```python
sessions = await client.list_sessions()
for metadata in sessions:
    print(f"{metadata.session_id}: {metadata.summary}")
```

### Deleting Sessions

```python
await client.delete_session(session_id)
```

### Getting Last Session ID

```python
last_id = await client.get_last_session_id()
if last_id:
    session = await client.resume_session(last_id)
```

### Checking Connection State

```python
state = client.get_state()
# Returns: "disconnected" | "connecting" | "connected" | "error"
```

## Error Handling

### Standard Exception Handling

```python
try:
    session = await client.create_session()
    await session.send({"prompt": "Hello"})
except Exception as e:
    print(f"Error: {e}")
```

### Session Error Events

Monitor `session.error` event type for runtime errors:

```python
def handler(event):
    if event.type == "session.error":
        print(f"Session Error: {event.data.message}")

session.on(handler)
```

## Connectivity Testing

Use ping to verify server connectivity:

```python
response = await client.ping("health check")
print(f"Server responded at {response['timestamp']}")
```

## Resource Cleanup

### Automatic Cleanup with Context Managers

ALWAYS use async context managers for automatic cleanup:

```python
async with CopilotClient() as client:
    async with await client.create_session() as session:
        # Use session...
        await session.send({"prompt": "Hello"})
    # Session automatically destroyed
# Client automatically stopped
```

### Manual Cleanup with Try-Finally

```python
client = CopilotClient()
try:
    await client.start()
    session = await client.create_session()
    try:
        # Use session...
        pass
    finally:
        await session.destroy()
finally:
    await client.stop()
```

## Best Practices

1. **Always use async context managers** (`async with`) for automatic cleanup
2. **Use asyncio.Event or asyncio.Future** to wait for session.idle event
3. **Handle session.error** events for robust error handling
4. **Use if/elif chains** for event type checking
5. **Enable streaming** for better UX in interactive scenarios
6. **Use define_tool** for tool definitions
7. **Use Pydantic models** for type-safe parameter validation
8. **Dispose event subscriptions** when no longer needed
9. **Use system_message with mode: "append"** to preserve safety guardrails
10. **Handle both delta and final events** when streaming is enabled
11. **Use type hints** for better IDE support and code clarity

## Common Patterns

### Simple Query-Response

```python
from copilot import CopilotClient
import asyncio

async def main():
    async with CopilotClient() as client:
        async with await client.create_session({"model": "gpt-5"}) as session:
            done = asyncio.Event()

            def handler(event):
                if event.type == "assistant.message":
                    print(event.data.content)
                elif event.type == "session.idle":
                    done.set()

            session.on(handler)
            await session.send({"prompt": "What is 2+2?"})
            await done.wait()

asyncio.run(main())
```

### Multi-Turn Conversation

```python
async def send_and_wait(session, prompt: str):
    done = asyncio.Event()
    result = []

    def handler(event):
        if event.type == "assistant.message":
            result.append(event.data.content)
            print(event.data.content)
        elif event.type == "session.idle":
            done.set()
        elif event.type == "session.error":
            result.append(None)
            done.set()

    unsubscribe = session.on(handler)
    await session.send({"prompt": prompt})
    await done.wait()
    unsubscribe()

    return result[0] if result else None

async with await client.create_session() as session:
    await send_and_wait(session, "What is the capital of France?")
    await send_and_wait(session, "What is its population?")
```

### SendAndWait Helper

```python
# Use built-in send_and_wait for simpler synchronous interaction
async with await client.create_session() as session:
    response = await session.send_and_wait(
        {"prompt": "What is 2+2?"},
        timeout=60.0
    )

    if response and response.type == "assistant.message":
        print(response.data.content)
```

### Tool with Dataclass Return Type

```python
from dataclasses import dataclass, asdict
from copilot import define_tool

@dataclass
class UserInfo:
    id: str
    name: str
    email: str
    role: str

async def get_user(args, inv) -> dict:
    user = UserInfo(
        id=args["user_id"],
        name="John Doe",
        email="john@example.com",
        role="Developer"
    )
    return asdict(user)

session = await client.create_session({
    "tools": [
        define_tool(
            name="get_user",
            description="Retrieve user information",
            parameters={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "User ID"}
                },
                "required": ["user_id"]
            },
            handler=get_user
        )
    ]
})
```

### Streaming with Progress

```python
import asyncio

current_message = []
done = asyncio.Event()

def handler(event):
    if event.type == "assistant.message.delta":
        current_message.append(event.data.delta_content)
        print(event.data.delta_content, end="", flush=True)
    elif event.type == "assistant.message":
        print(f"\n\n=== Complete ===")
        print(f"Total length: {len(event.data.content)} chars")
    elif event.type == "session.idle":
        done.set()

unsubscribe = session.on(handler)
await session.send({"prompt": "Write a long story"})
await done.wait()
unsubscribe()
```

### Error Recovery

```python
def handler(event):
    if event.type == "session.error":
        print(f"Session error: {event.data.message}")
        # Optionally retry or handle error

session.on(handler)

try:
    await session.send({"prompt": "risky operation"})
except Exception as e:
    # Handle send errors
    print(f"Failed to send: {e}")
```

### Using TypedDict for Type Safety

```python
from typing import TypedDict, List

class MessageOptions(TypedDict, total=False):
    prompt: str
    attachments: List[dict]
    mode: str

class SessionConfig(TypedDict, total=False):
    model: str
    streaming: bool
    tools: List

# Usage with type hints
options: MessageOptions = {
    "prompt": "Hello",
    "mode": "enqueue"
}
await session.send(options)

config: SessionConfig = {
    "model": "gpt-5",
    "streaming": True
}
session = await client.create_session(config)
```

### Async Generator for Streaming

```python
from typing import AsyncGenerator

async def stream_response(session, prompt: str) -> AsyncGenerator[str, None]:
    """Stream response chunks as an async generator."""
    queue = asyncio.Queue()
    done = asyncio.Event()

    def handler(event):
        if event.type == "assistant.message.delta":
            queue.put_nowait(event.data.delta_content)
        elif event.type == "session.idle":
            done.set()

    unsubscribe = session.on(handler)
    await session.send({"prompt": prompt})

    while not done.is_set():
        try:
            chunk = await asyncio.wait_for(queue.get(), timeout=0.1)
            yield chunk
        except asyncio.TimeoutError:
            continue

    # Drain remaining items
    while not queue.empty():
        yield queue.get_nowait()

    unsubscribe()

# Usage
async for chunk in stream_response(session, "Tell me a story"):
    print(chunk, end="", flush=True)
```

### Decorator Pattern for Tools

```python
from typing import Callable, Any
from copilot import define_tool

def copilot_tool(
    name: str,
    description: str,
    parameters: dict
) -> Callable:
    """Decorator to convert a function into a Copilot tool."""
    def decorator(func: Callable) -> Any:
        return define_tool(
            name=name,
            description=description,
            parameters=parameters,
            handler=lambda args, inv: func(**args)
        )
    return decorator

@copilot_tool(
    name="calculate",
    description="Perform a calculation",
    parameters={
        "type": "object",
        "properties": {
            "expression": {"type": "string", "description": "Math expression"}
        },
        "required": ["expression"]
    }
)
def calculate(expression: str) -> float:
    return eval(expression)

session = await client.create_session({"tools": [calculate]})
```

## Python-Specific Features

### Async Context Manager Protocol

The SDK implements `__aenter__` and `__aexit__`:

```python
class CopilotClient:
    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()
        return False

class CopilotSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.destroy()
        return False
```

### Dataclass Support

Event data is available as attributes:

```python
def handler(event):
    # Access event attributes directly
    print(event.type)
    print(event.data.content)  # For assistant.message
    print(event.data.delta_content)  # For assistant.message.delta
```
