---
description: 'Instructions for building Model Context Protocol (MCP) servers using the Python SDK'
applyTo: '**/*.py, **/pyproject.toml, **/requirements.txt'
---

# Python MCP Server Development

## Instructions

- Use **uv** for project management: `uv init mcp-server-demo` and `uv add "mcp[cli]"`
- Import FastMCP from `mcp.server.fastmcp`: `from mcp.server.fastmcp import FastMCP`
- Use `@mcp.tool()`, `@mcp.resource()`, and `@mcp.prompt()` decorators for registration
- Type hints are mandatory - they're used for schema generation and validation
- Use Pydantic models, TypedDicts, or dataclasses for structured output
- Tools automatically return structured output when return types are compatible
- For stdio transport, use `mcp.run()` or `mcp.run(transport="stdio")`
- For HTTP servers, use `mcp.run(transport="streamable-http")` or mount to Starlette/FastAPI
- Use `Context` parameter in tools/resources to access MCP capabilities: `ctx: Context`
- Send logs with `await ctx.debug()`, `await ctx.info()`, `await ctx.warning()`, `await ctx.error()`
- Report progress with `await ctx.report_progress(progress, total, message)`
- Request user input with `await ctx.elicit(message, schema)`
- Use LLM sampling with `await ctx.session.create_message(messages, max_tokens)`
- Configure icons with `Icon(src="path", mimeType="image/png")` for server, tools, resources, prompts
- Use `Image` class for automatic image handling: `return Image(data=bytes, format="png")`
- Define resource templates with URI patterns: `@mcp.resource("greeting://{name}")`
- Implement completion support by accepting partial values and returning suggestions
- Use lifespan context managers for startup/shutdown with shared resources
- Access lifespan context in tools via `ctx.request_context.lifespan_context`
- For stateless HTTP servers, set `stateless_http=True` in FastMCP initialization
- Enable JSON responses for modern clients: `json_response=True`
- Test servers with: `uv run mcp dev server.py` (Inspector) or `uv run mcp install server.py` (Claude Desktop)
- Mount multiple servers in Starlette with different paths: `Mount("/path", mcp.streamable_http_app())`
- Configure CORS for browser clients: expose `Mcp-Session-Id` header
- Use low-level Server class for maximum control when FastMCP isn't sufficient

## Best Practices

- Always use type hints - they drive schema generation and validation
- Return Pydantic models or TypedDicts for structured tool outputs
- Keep tool functions focused on single responsibilities
- Provide clear docstrings - they become tool descriptions
- Use descriptive parameter names with type hints
- Validate inputs using Pydantic Field descriptions
- Implement proper error handling with try-except blocks
- Use async functions for I/O-bound operations
- Clean up resources in lifespan context managers
- Log to stderr to avoid interfering with stdio transport (when using stdio)
- Use environment variables for configuration
- Test tools independently before LLM integration
- Consider security when exposing file system or network access
- Use structured output for machine-readable data
- Provide both content and structured data for backward compatibility

## Common Patterns

### Basic Server Setup (stdio)
```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("My Server")

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
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("My HTTP Server")

@mcp.tool()
def hello(name: str = "World") -> str:
    """Greet someone"""
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
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
from mcp.server.fastmcp import Context
from mcp.server.session import ServerSession

@mcp.tool()
async def process_data(
    data: str, 
    ctx: Context[ServerSession, None]
) -> str:
    """Process data with logging"""
    await ctx.info(f"Processing: {data}")
    await ctx.report_progress(0.5, 1.0, "Halfway done")
    return f"Processed: {data}"
```

### Tool with Sampling
```python
from mcp.server.fastmcp import Context
from mcp.server.session import ServerSession
from mcp.types import SamplingMessage, TextContent

@mcp.tool()
async def summarize(
    text: str,
    ctx: Context[ServerSession, None]
) -> str:
    """Summarize text using LLM"""
    result = await ctx.session.create_message(
        messages=[SamplingMessage(
            role="user",
            content=TextContent(type="text", text=f"Summarize: {text}")
        )],
        max_tokens=100
    )
    return result.content.text if result.content.type == "text" else ""
```

### Lifespan Management
```python
from contextlib import asynccontextmanager
from dataclasses import dataclass
from mcp.server.fastmcp import FastMCP, Context

@dataclass
class AppContext:
    db: Database

@asynccontextmanager
async def app_lifespan(server: FastMCP):
    db = await Database.connect()
    try:
        yield AppContext(db=db)
    finally:
        await db.disconnect()

mcp = FastMCP("My App", lifespan=app_lifespan)

@mcp.tool()
def query(sql: str, ctx: Context) -> str:
    """Query database"""
    db = ctx.request_context.lifespan_context.db
    return db.execute(sql)
```

### Prompt with Messages
```python
from mcp.server.fastmcp.prompts import base

@mcp.prompt(title="Code Review")
def review_code(code: str) -> list[base.Message]:
    """Create code review prompt"""
    return [
        base.UserMessage("Review this code:"),
        base.UserMessage(code),
        base.AssistantMessage("I'll review the code for you.")
    ]
```

### Error Handling
```python
@mcp.tool()
async def risky_operation(input: str) -> str:
    """Operation that might fail"""
    try:
        result = await perform_operation(input)
        return f"Success: {result}"
    except Exception as e:
        return f"Error: {str(e)}"
```
