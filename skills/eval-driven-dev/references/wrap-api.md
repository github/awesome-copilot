# Wrap API Reference

> Auto-generated from pixie source code docstrings.
> Do not edit by hand — regenerate from the upstream [pixie-qa](https://github.com/yiouli/pixie-qa) source repository.

`pixie.wrap` — data-oriented observation API.

`wrap()` observes a data value or callable at a named point in the
processing pipeline. Its behavior depends on the active mode:

- **No-op** (tracing disabled, no eval registry): returns `data` unchanged.
- **Tracing** (during `pixie trace`): writes to the trace file and emits an
  OTel event (via span event if a span is active, or via OTel logger
  otherwise) and returns `data` unchanged (or wraps a callable so the
  event fires on call).
- **Eval** (eval registry active): injects dependency data for
  `purpose="input"`, captures output/state for `purpose="output"`/
  `purpose="state"`.

---

## CLI Commands

| Command                                                                                   | Description                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pixie trace --runnable <filepath:ClassName> --input <kwargs.json> --output <file.jsonl>` | Run the Runnable once with kwargs from the JSON file and write a trace file. `--input` is a **file path** (not inline JSON).                  |
| `pixie format <file.jsonl>`                                                               | Convert a trace file to a formatted dataset entry template. Shows `entry_kwargs`, `eval_input`, and `eval_output` (the real captured output). |
| `pixie trace filter <file.jsonl> --purpose input`                                         | Print only wrap events matching the given purposes. Outputs one JSON line per matching event.                                                 |

---

## Classes

### `pixie.Runnable`

```python
class pixie.Runnable(Protocol[T]):
    @classmethod
    def create(cls) -> Runnable[Any]: ...
    async def setup(self) -> None: ...
    async def run(self, args: T) -> None: ...
    async def teardown(self) -> None: ...
```

Protocol for structured runnables used by the dataset runner. `T` is a
`pydantic.BaseModel` subclass whose fields match the `entry_kwargs` keys
in the dataset JSON.

Lifecycle:

1. `create()` — class method to construct and return a runnable instance.
2. `setup()` — **async**, called **once** before the first `run()` call.
   Initialize shared resources here (e.g., `TestClient`, database connections).
   Optional — has a default no-op implementation.
3. `run(args)` — **async**, called **concurrently for each dataset entry**
   (up to 4 entries in parallel). `args` is a validated Pydantic model
   built from `entry_kwargs`. Invoke the application's real entry point.
4. `teardown()` — **async**, called **once** after the last `run()` call.
   Release any resources acquired in `setup()`.
   Optional — has a default no-op implementation.

`setup()` and `teardown()` have default no-op implementations;
you only need to override them when shared resources are required.

**Concurrency**: `run()` is called concurrently via `asyncio.gather`. Your
implementation **must be concurrency-safe**. If it uses shared mutable state
(e.g., a SQLite connection, an in-memory cache, a file handle), protect it
with `asyncio.Semaphore` or `asyncio.Lock`:

```python
class AppRunnable(pixie.Runnable[AppArgs]):
    _sem: asyncio.Semaphore

    @classmethod
    def create(cls) -> AppRunnable:
        inst = cls()
        inst._sem = asyncio.Semaphore(1)  # serialise DB access
        return inst

    async def run(self, args: AppArgs) -> None:
        async with self._sem:
            await call_app(args.message)
```

Common concurrency pitfalls:

- **SQLite**: not safe for concurrent writes — use `Semaphore(1)` or `aiosqlite` with WAL mode.
- **Global mutable state**: module-level dicts/lists modified in `run()` need protection.
- **Rate-limited APIs**: add a semaphore to avoid 429 errors.

**Import resolution**: The project root directory (where `pixie test` / `pixie trace`
is invoked) is automatically added to `sys.path` before loading runnables and
evaluators. This means your runnable can use normal `import` statements to
reference project modules (e.g., `from app import service`).

**Example**:

```python
# pixie_qa/scripts/run_app.py
from __future__ import annotations
from pydantic import BaseModel
import pixie

class AppArgs(BaseModel):
    user_message: str

class AppRunnable(pixie.Runnable[AppArgs]):
    @classmethod
    def create(cls) -> AppRunnable:
        return cls()

    async def run(self, args: AppArgs) -> None:
        from myapp import handle_request
        await handle_request(args.user_message)
```

**Web server example** (using an async HTTP client):

```python
import httpx
from pydantic import BaseModel
import pixie

class AppArgs(BaseModel):
    user_message: str

class AppRunnable(pixie.Runnable[AppArgs]):
    _client: httpx.AsyncClient

    @classmethod
    def create(cls) -> AppRunnable:
        return cls()

    async def setup(self) -> None:
        self._client = httpx.AsyncClient(base_url="http://localhost:8000")

    async def run(self, args: AppArgs) -> None:
        await self._client.post("/chat", json={"message": args.user_message})

    async def teardown(self) -> None:
        await self._client.aclose()
```

---

## Functions

### `pixie.wrap`

```python
pixie.wrap(data: 'T', *, purpose: "Literal['input', 'output', 'state']", name: 'str', description: 'str | None' = None) -> 'T'
```

Observe a data value or data-provider callable at a point in the processing pipeline.

`data` can be either a plain value or a callable that produces a value.
In both cases the return type is `T` — the caller gets back exactly the
same type it passed in when in no-op or tracing modes.

In eval mode with `purpose="input"`, the returned value (or callable) is
replaced with the deserialized registry value. When `data` is callable
the returned wrapper ignores the original function and returns the injected
value on every call; in all other modes the returned callable wraps the
original and adds tracing or capture behaviour.

Args:
data: A data value or a data-provider callable.
purpose: Classification of the data point: - "input": data from external dependencies (DB records, API responses) - "output": data going out to external systems or users - "state": intermediate state for evaluation (routing decisions, etc.)
name: Unique identifier for this data point. Used as the key in the
eval registry and in trace logs.
description: Optional human-readable description of what this data is.

Returns:
The original data unchanged (tracing / no-op modes), or the
registry value (eval mode with purpose="input"). When `data`
is callable the return value is also callable.

---

## Error Types

### `WrapRegistryMissError`

```python
WrapRegistryMissError(name: 'str') -> 'None'
```

Raised when a wrap(purpose="input") name is not found in the eval registry.

### `WrapTypeMismatchError`

```python
WrapTypeMismatchError(name: 'str', expected_type: 'type', actual_type: 'type') -> 'None'
```

Raised when deserialized registry value doesn't match expected type.

---

## Trace File Utilities

Pydantic model for wrap log entries and JSONL loading utilities.

`WrapLogEntry` is the typed representation of a single `wrap()` event
as recorded in a JSONL trace file. Multiple places in the codebase load
these objects — the `pixie trace filter` CLI, the dataset loader, and
the verification scripts — so they share this single model.

### `pixie.WrapLogEntry`

```python
pixie.WrapLogEntry(*, type: str = 'wrap', name: str, purpose: str, data: Any, description: str | None = None, trace_id: str | None = None, span_id: str | None = None) -> None
```

A single wrap() event as logged to a JSONL trace file.

Attributes:
type: Always `"wrap"` for wrap events.
name: The wrap point name (matches `wrap(name=...)`).
purpose: One of `"input"`, `"output"`, `"state"`.
data: The serialized data (jsonpickle string).
description: Optional human-readable description.
trace_id: OTel trace ID (if available).
span_id: OTel span ID (if available).

### `pixie.load_wrap_log_entries`

```python
pixie.load_wrap_log_entries(jsonl_path: 'str | Path') -> 'list[WrapLogEntry]'
```

Load all wrap log entries from a JSONL file.

Skips non-wrap lines (e.g. `type=llm_span`) and malformed lines.

Args:
jsonl_path: Path to a JSONL trace file.

Returns:
List of :class:`WrapLogEntry` objects.

### `pixie.filter_by_purpose`

```python
pixie.filter_by_purpose(entries: 'list[WrapLogEntry]', purposes: 'set[str]') -> 'list[WrapLogEntry]'
```

Filter wrap log entries by purpose.

Args:
entries: List of wrap log entries.
purposes: Set of purpose values to include.

Returns:
Filtered list.
