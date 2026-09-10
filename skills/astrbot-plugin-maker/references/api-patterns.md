# Python API patterns

Verified against the source baseline in [sources](sources.md). The generated
[main template](../assets/main.py.template) is the smallest complete example.
The snippets below belong inside an existing `Star` subclass unless noted.

## Entrypoint, commands, and configuration

Import `filter` from `astrbot.api.event`; Python's built-in `filter` is unrelated.
Handlers are methods beginning with `self, event`. A command decorator takes a
command name without the wake prefix; spaces need a command group or an explicit
argument parser. Typed command arguments are parsed by the framework:

```python
@filter.command("add")
async def add(self, event: AstrMessageEvent, a: int, b: int):
    """Add two integers."""
    yield event.plain_result(str(a + b))
```

Use `filter.permission_type(filter.PermissionType.ADMIN)` for an admin-only
command. Platform and group/private filters are in the receive-events guide.
Check a hook's particular signature: `on_llm_request`, `on_llm_response`, and
other LLM lifecycle hooks use coroutine callbacks, not `yield` command handlers.

`_conf_schema.json` is AstrBot's setting-definition mapping, **not JSON Schema**:

```json
{
  "api_key": {
    "type": "string",
    "description": "API key for the configured service",
    "default": "",
    "secret": true
  }
}
```

When that file exists, accept `config: AstrBotConfig` in the constructor and keep
`self.config = config`. The runtime manages the saved configuration under its data
directory. Read this injected config, and use `save_config()` only when the plugin
intentionally changes a setting. `secret: true` masks the WebUI field; it does not
encrypt the stored value. Never print the whole config.

For an `object` setting, nested definitions are under `items`. For a configurable
provider, the documented `_special: "select_provider"` picker returns an ID.
Consult the guide for template lists, file uploads, or custom Pages rather than
inventing JSON Schema keywords.

## Async resource lifecycle

Keep registration/lightweight assignments in `__init__`. Add lifecycle methods only
when the plugin owns resources. This example reuses an HTTP session across calls:

```python
# Module imports: import httpx
async def initialize(self):
    self.http = httpx.AsyncClient(timeout=15.0)

async def terminate(self):
    await self.http.aclose()
```

If initialization can fail partway, initialize attributes to `None` and close only
resources actually created. For a recurring job, retain its task, cancel it, and
await its completion during termination (handling `asyncio.CancelledError`).
Do not swallow cancellation in a broad retry loop. Repeated reloads must not
duplicate timers, sessions, or message sends.

## Persistent data and session identity

For files in the verified runtime:

```python
from astrbot.api.star import StarTools

# Resolve after the runtime has established the plugin's metadata/name.
data_dir = StarTools.get_data_dir(self.name)
```

It creates an absolute directory under `data/plugin_data/<plugin_name>`.
Do not derive durable storage from `Path(__file__).parent` or `Path("data")`.
For an older version, verify the helper or use the official
`get_astrbot_data_path()` pattern. Simple plugin KV methods
`put_kv_data`, `get_kv_data`, and `delete_kv_data` are async and documented for
AstrBot 4.9.2+.

Store `event.unified_msg_origin` for a later reply, and scope conversational data to
that UMO when isolation is required. It includes the configured platform identity
and message type; a bare group ID can collide across bots/platforms.

## Sending messages

A command can `yield event.plain_result(text)` or a
`yield event.chain_result(components)`. Build components from
`astrbot.api.message_components`, for example `Plain` or `Image.fromURL(url)`.

For a coroutine hook, send explicitly with `await event.send(...)`. For a later
proactive message, use:

```python
from astrbot.api.event import MessageChain

sent = await self.context.send_message(
    saved_umo, MessageChain().message("The requested job has finished.")
)
```

Handle `sent == False` and adapter errors. Verify proactive-message support on the
selected adapter; SDK construction alone cannot demonstrate delivery.

## LLM calls and tools

For the current session's configured provider:

```python
provider_id = await self.context.get_current_chat_provider_id(
    umo=event.unified_msg_origin
)
response = await self.context.llm_generate(
    chat_provider_id=provider_id,
    prompt="Summarize the supplied text.",
)
yield event.plain_result(response.completion_text)
```

Handle an unavailable provider and provider errors. This direct call returns data
to the plugin. When the feature requires the ordinary conversation pipeline,
inspect `event.request_llm(...)` and its conversation/history semantics instead of
assuming direct calls automatically persist chat history.

A tool with arguments needs the framework's docstring schema:

```python
@filter.llm_tool(name="lookup_item")
async def lookup_item(self, event: AstrMessageEvent, item_id: str):
    """Look up an item.

    Args:
        item_id(string): The item identifier.
    """
    return await self.lookup_service(item_id)
```

This snippet requires the plugin's actual `lookup_service` implementation.
Type annotations alone do not define the tool's parameter schema.
Do not pass an invented `parameters=` argument to this decorator. If explicit
schema control is required, use the documented `FunctionTool` +
`context.add_llm_tools()` route. Avoid new uses of the deprecated
`context.register_llm_tool()`.
