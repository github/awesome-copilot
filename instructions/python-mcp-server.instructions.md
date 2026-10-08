---
description: 'Instructions for building Model Context Protocol (MCP) servers using the Python SDK v2'
applyTo: '**/*.py, **/pyproject.toml, **/requirements.txt'
---

# Python MCP Server Development

These instructions apply to the [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) v2 and the MCP specification revision [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28).

## Instructions

- Use **uv** for project management: `uv init --app --no-package mcp-server-demo` and `uv add "mcp[cli]>=2,<3"`.
- Import the server class from `mcp.server`: `from mcp.server import MCPServer`.
- Do not use `FastMCP` or `mcp.server.fastmcp`. SDK v2 removed this import path.
- Import `Context`, `Image`, `Audio`, `Resolve`, `Elicit`, and the prompt message classes from `mcp.server.mcpserver`.
- Use the `@mcp.tool()`, `@mcp.resource()`, and `@mcp.prompt()` decorators for registration.
- Add type hints to all parameters. The SDK makes the schemas from the type hints and validates the arguments.
- Use Pydantic models, TypedDicts, or dataclasses for structured output.
- A tool returns structured output when its return type is compatible.
- For stdio transport, use `mcp.run()` or `mcp.run(transport="stdio")`.
- For HTTP servers, use `mcp.run(transport="streamable-http")`, or mount `mcp.streamable_http_app()` in Starlette or FastAPI.
- Give transport options (`host`, `port`, `json_response`, `stateless_http`, `transport_security`) to `run()`, not to `MCPServer(...)`.
- When you mount the server, give the same options to `streamable_http_app()`. This method has no `port` option.
- Give the server name as the first `MCPServer` argument. Give all other constructor arguments as keyword arguments.
- Set `version` on `MCPServer`. If you do not set it, the server reports an empty version.
- The SDK v2 types use snake_case fields, for example `read_only_hint`, `structured_content`, and `is_error`.
- Add a `ctx: Context` parameter to a tool, resource, or prompt to get the request context.
- Report progress with `await ctx.report_progress(progress, total, message)`.
- Get user input with a `Resolve(fn)` parameter. Return `Elicit(message, Model)` from `fn`. This works with clients of all protocol revisions.
- Do not use `ctx.elicit()`. It fails on a 2026-07-28 connection.
- Log with the standard `logging` module. Protocol logging (`ctx.info()` and similar methods) is deprecated.
- Do not use sampling (`ctx.session.create_message()`). It is deprecated. Call the LLM provider API directly.
- Do not use roots (`ctx.session.list_roots()`). It is deprecated. Get paths from tool parameters or the server configuration.
- Configure icons with `Icon(src="https://...", mime_type="image/png")` from `mcp.types`. Server, tools, resources, and prompts accept `icons=[...]`.
- Use the `Image` class to return images: `return Image(data=png_bytes, format="png")` or `return Image(path=file_path)`.
- Define resource templates with RFC 6570 URI templates: `@mcp.resource("greeting://{name}")`.
- Add completion support with the `@mcp.completion()` decorator.
- Use a lifespan context manager for startup and shutdown of shared resources. For stdio and HTTP, the lifespan runs one time for the server. Each in-memory `Client(mcp)` runs it again.
- Get the lifespan object in tools from `ctx.request_context.lifespan_context`. Use `Context[AppContext]` for a typed result.
- Raise `ToolError` (from `mcp.server.mcpserver.exceptions`) for an error that the model must read.
- Do not raise `MCPError` for a tool failure. The client gets a protocol error, not a tool result with `is_error`. Many hosts do not show this error to the model.
- Send list change notifications with `await ctx.notify_tools_changed()`. Do not use `ctx.session.send_tool_list_changed()`. A 2026-07-28 connection drops it.
- On the 2026-07-28 revision, Streamable HTTP requests have no session. `stateless_http=True` changes only how the server serves clients of earlier revisions.
- `json_response=True` sends one JSON body for each request. In this mode, the server cannot send progress notifications during the request.
- Test servers with `uv run mcp dev server.py` (MCP Inspector) or `uv run mcp install server.py` (Claude Desktop).
- Write tests with the in-memory client: `async with Client(mcp) as client:` (`from mcp import Client`).
- Mount more than one server in Starlette with different paths: `Mount("/path", app=mcp.streamable_http_app())`. The lifespan of the host app must enter `mcp.session_manager.run()` for each server.
- For browser clients, configure CORS. Allow the `Mcp-*` request headers. Expose the `Mcp-Session-Id` response header.
- If you do not set `transport_security`, the SDK checks the `Host` and `Origin` headers only when the host is `127.0.0.1`, `localhost`, or `::1`. For all other hosts, set `transport_security=TransportSecuritySettings(allowed_hosts=[...], allowed_origins=[...])` (from `mcp.server.transport_security`).
- For more than one worker, set `request_state_security=RequestStateSecurity(keys=[...])` on `MCPServer`.
- Use the low-level `Server` class (from `mcp.server`) only when `MCPServer` does not give sufficient control.

## Best Practices

- Give each tool function one responsibility.
- Write clear docstrings. They become the tool descriptions.
- Use descriptive parameter names with type hints.
- Validate inputs with Pydantic `Field` descriptions.
- Use async functions for I/O-bound operations. The SDK runs sync functions on a worker thread.
- Log to stderr. Do not use `print()` in a stdio server, because stdout is the protocol channel.
- Use environment variables for configuration.
- Be careful when a tool gives access to the file system or the network.

## Common Patterns

### Basic Server Setup (stdio)

```python
from mcp.server import MCPServer

mcp = MCPServer("My Server", version="0.1.0")

@mcp.tool()
def calculate(a: int, b: int, op: str) -> int:
    """Perform calculation"""
    if op == "add":
        return a + b
    return a - b

if __name__ == "__main__":
    mcp.run()  # stdio by default
```

### HTTP Server

```python
from mcp.server import MCPServer

mcp = MCPServer("My HTTP Server", version="0.1.0")

@mcp.tool()
def hello(name: str = "World") -> str:
    """Greet someone"""
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="127.0.0.1", port=8000)
```

### Tool with Structured Output

```python
from pydantic import BaseModel, Field

class WeatherData(BaseModel):
    temperature: float = Field(description="Temperature in Celsius")
    condition: str
    humidity: float

@mcp.tool()
def get_weather(city: str) -> WeatherData:
    """Get weather for a city"""
    return WeatherData(
        temperature=22.5,
        condition="sunny",
        humidity=65.0
    )
```

### Dynamic Resource

```python
@mcp.resource("users://{user_id}")
def get_user(user_id: str) -> str:
    """Get user profile data"""
    return f"User {user_id} profile data"
```

### Tool with Context

```python
import logging

from mcp.server.mcpserver import Context

logger = logging.getLogger(__name__)

@mcp.tool()
async def process_data(data: str, ctx: Context) -> str:
    """Process data with progress reports"""
    logger.info("Processing: %s", data)
    await ctx.report_progress(0.5, 1.0, "Halfway done")
    return f"Processed: {data}"
```

### Tool with User Input

```python
from typing import Annotated

from pydantic import BaseModel

from mcp.server.mcpserver import AcceptedElicitation, Elicit, ElicitationResult, Resolve

class Quantity(BaseModel):
    copies: int

async def ask_quantity() -> Elicit[Quantity]:
    """Ask the user how many copies to reserve."""
    return Elicit("How many copies?", Quantity)

@mcp.tool()
async def reserve(
    title: str,
    quantity: Annotated[ElicitationResult[Quantity], Resolve(ask_quantity)],
) -> str:
    """Reserve copies of a book"""
    if isinstance(quantity, AcceptedElicitation):
        return f"Reserved {quantity.data.copies} of {title!r}."
    return "Nothing reserved."
```

### Lifespan Management

```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

from mcp.server import MCPServer
from mcp.server.mcpserver import Context

@dataclass
class AppContext:
    db: Database  # Your database client

@asynccontextmanager
async def app_lifespan(server: MCPServer) -> AsyncIterator[AppContext]:
    db = await Database.connect()
    try:
        yield AppContext(db=db)
    finally:
        await db.disconnect()

mcp = MCPServer("My App", version="0.1.0", lifespan=app_lifespan)

@mcp.tool()
def query(sql: str, ctx: Context[AppContext]) -> str:
    """Query database"""
    db = ctx.request_context.lifespan_context.db
    return db.execute(sql)
```

### Prompt with Messages

```python
from mcp.server.mcpserver import AssistantMessage, Message, UserMessage

@mcp.prompt(title="Code Review")
def review_code(code: str) -> list[Message]:
    """Create code review prompt"""
    return [
        UserMessage("Review this code:"),
        UserMessage(code),
        AssistantMessage("I'll review the code for you.")
    ]
```

### Error Handling

```python
from mcp.server.mcpserver.exceptions import ToolError

@mcp.tool()
async def risky_operation(input: str) -> str:
    """Operation that might fail"""
    if not input:
        raise ToolError("Input must not be empty.")
    result = await perform_operation(input)  # Your operation
    return f"Success: {result}"
```

### In-Memory Test

```python
import pytest

from mcp import Client

from server import mcp  # The HTTP Server example

@pytest.mark.anyio
async def test_hello():
    async with Client(mcp) as client:
        result = await client.call_tool("hello", {"name": "MCP"})
        assert result.structured_content == {"result": "Hello, MCP!"}
```
