---
name: python-mcp-server-generator
description: 'Use this skill when the user wants to create a new Model Context Protocol (MCP) server in Python. Also use it to expose Python functions, an API, or a database to AI clients as MCP tools. The skill makes a uv project with the MCP Python SDK v2 (MCPServer), typed tools, in-memory tests, and client configuration. Do not use it for an MCP client or for a server in another language.'
compatibility: 'Requires uv, Python 3.10 or later, and network access to install packages. The MCP Inspector also requires Node.js.'
---

# Python MCP Server Generator

Create a Model Context Protocol (MCP) server in Python with the official [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) v2. SDK v2 supports the MCP specification revision [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28). The same server also serves clients that use earlier revisions.

## Workflow

Copy this checklist and track your progress:

- [ ] Step 1: Create the project.
- [ ] Step 2: Write the server.
- [ ] Step 3: Write the tests.
- [ ] Step 4: Run the tests until they pass.
- [ ] Step 5: Configure the client.

### Step 1: Create the project

Run these commands:

```bash
uv init --app --no-package project-name
cd project-name
uv add "mcp[cli]>=2,<3"
uv add --dev pytest
```

Then delete `main.py`. The server goes in `server.py`.

- Without `--no-package`, uv makes a `src/` package layout, and the tests cannot import `server.py`.
- `uv init` makes the `.gitignore` file. Do not write a different one.

### Step 2: Write the server

Start from this template:

```python
from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

mcp = MCPServer("Demo", version="0.1.0")


@mcp.tool()
def divide(a: float, b: float) -> float:
    """Divide a by b."""
    if b == 0:
        raise ToolError("b must not be zero.")
    return a / b


if __name__ == "__main__":
    mcp.run()  # stdio is the default transport
```

Then change the template for the request of the user:

1. Replace `divide` with the tools that the user needs.
2. Give each tool full type hints and a docstring. The SDK makes the input schema from the type hints. The docstring becomes the tool description.
3. Return a Pydantic model or a `TypedDict` when the client needs machine-readable data. The SDK makes the output schema from the return type.
4. Use `async def` for I/O. The SDK runs a sync tool on a worker thread.
5. Mark a read-only tool with `@mcp.tool(annotations=ToolAnnotations(read_only_hint=True))` (from `mcp.types`). Use `destructive_hint=True` for a destructive tool.
6. Add resources (`@mcp.resource("users://{user_id}")`) and prompts (`@mcp.prompt()`) only when the user asks for them.

Use stdio by default. Read [references/streamable-http.md](references/streamable-http.md) only when the user asks for a remote server or an HTTP server.

### Step 3: Write the tests

Put `test_server.py` next to `server.py`. Write a test for each tool and for each `ToolError`:

```python
import pytest

from mcp import Client

from server import mcp


@pytest.mark.anyio
async def test_divide():
    async with Client(mcp) as client:
        result = await client.call_tool("divide", {"a": 6, "b": 3})
        assert result.structured_content == {"result": 2.0}


@pytest.mark.anyio
async def test_divide_by_zero():
    async with Client(mcp) as client:
        result = await client.call_tool("divide", {"a": 1, "b": 0})
        assert result.is_error
        assert "must not be zero" in result.content[0].text
```

- The in-memory `Client` needs no subprocess and no port. It connects with the 2026-07-28 revision.
- The `mcp` package installs `anyio`, which supplies the `anyio` marker. Do not add `pytest-asyncio`.

### Step 4: Run the tests until they pass

1. Run `uv run pytest`.
2. If a test fails, read the error. Fix the server or the test.
3. Run `uv run pytest` again.
4. Continue only when all tests pass.

### Step 5: Configure the client

For VS Code, write `.vscode/mcp.json`:

```json
{
  "servers": {
    "demo": {
      "type": "stdio",
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/project", "run", "server.py"]
    }
  }
}
```

For Claude Desktop, run `uv run mcp install server.py`.

Tell the user these commands:

- `uv run server.py` starts the stdio server. The server waits for a host on stdin and prints nothing.
- `uv run mcp dev server.py` opens the MCP Inspector. The Inspector needs Node.js.

## Gotchas

SDK v2 and the 2026-07-28 revision changed many SDK v1 patterns. Do not copy SDK v1 examples.

- SDK v2 removed `FastMCP` and `mcp.server.fastmcp`. Import the server class with `from mcp.server import MCPServer`.
- Import `Context`, `Image`, `Audio`, `Resolve`, `Elicit`, `ElicitationResult`, `AcceptedElicitation`, `Message`, `UserMessage`, and `AssistantMessage` from `mcp.server.mcpserver`.
- Give the server name as the first `MCPServer` argument. Give all other constructor arguments as keyword arguments. Their positional order changed in SDK v2.
- Set `version`. If you do not set it, the server reports an empty version.
- Give the transport options (`transport`, `host`, `port`, `json_response`, `stateless_http`, `transport_security`) to `run()`, not to `MCPServer(...)`.
- The SDK v2 types use snake_case fields, for example `read_only_hint`, `structured_content`, and `is_error`.
- Raise `ToolError` for an error that the model must read. For other exceptions, the model gets only a generic error message.
- Do not raise `MCPError` for a tool failure. The client gets a protocol error, not a tool result with `is_error`. Many hosts do not show this error to the model.
- In a stdio server, stdout is the protocol channel. Do not call `print()`. Log to stderr with the `logging` module.
- Do not use `ctx.elicit()`. It fails on a 2026-07-28 connection. For user input during a tool call, annotate a parameter with `Resolve(fn)`. Return `Elicit(message, Model)` from `fn`.
- Send list change notifications with `await ctx.notify_tools_changed()`. A 2026-07-28 connection drops `ctx.session.send_tool_list_changed()`.
- For stdio and HTTP, the lifespan runs one time, when the server starts. Each in-memory `Client(mcp)` in a test runs the lifespan again. Read its object with `ctx.request_context.lifespan_context`.
- The 2026-07-28 revision deprecates these features ([SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577)). Do not add them to a new server:
  - **Sampling** (`ctx.session.create_message()`): Call the LLM provider API directly.
  - **Protocol logging** (`ctx.log()`, `ctx.info()`, and similar methods): Use the standard `logging` module.
  - **Roots** (`ctx.session.list_roots()`): Get paths from tool parameters, resource URIs, or the server configuration.
- The 2026-07-28 revision has no SSE transport. Use Streamable HTTP.
