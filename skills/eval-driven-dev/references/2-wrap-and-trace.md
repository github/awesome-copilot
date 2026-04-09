# Step 2: Instrument with `wrap` and capture a reference trace

> For the full `wrap()` API, the `Runnable` class, and CLI commands, see `wrap-api.md`.

**Why this step**: You need to see the actual data flowing through the app before you can build anything. This step adds `wrap()` calls to mark data boundaries, implements a `Runnable` class, captures a reference trace with `pixie trace`, and verifies all eval criteria can be evaluated.

This step consolidates three things: (1) data-flow analysis, (2) instrumentation, and (3) writing the runnable.

---

## 2a. Data-flow analysis and `wrap` instrumentation

Starting from LLM call sites, trace backwards and forwards through the code to find:

- **Entry input**: what the user sends in (via the entry point)
- **Dependency input**: data from external systems (databases, APIs, caches)
- **App output**: data going out to users or external systems
- **Intermediate state**: internal decisions relevant to evaluation (routing, tool calls)

For each data point found, **immediately add a `wrap()` call** in the application code:

```python
import pixie

# External dependency data — value form (result of a DB/API call)
profile = pixie.wrap(db.get_profile(user_id), purpose="input", name="customer_profile",
    description="Customer profile fetched from database")

# External dependency data — function form (for lazy evaluation / avoiding the call)
history = pixie.wrap(redis.get_history, purpose="input", name="conversation_history",
    description="Conversation history from Redis")(session_id)

# App output — what the user receives
response = pixie.wrap(response_text, purpose="output", name="response",
    description="The assistant's response to the user")

# Intermediate state — internal decision relevant to evaluation
selected_agent = pixie.wrap(selected_agent, purpose="state", name="routing_decision",
    description="Which agent was selected to handle this request")
```

### Rules for wrapping

1. **Wrap at the data boundary** — where data enters or exits the application, not deep inside utility functions
2. **Names must be unique** across the entire application (they are used as registry keys and dataset field names)
3. **Use `lower_snake_case`** for names
4. **Don't wrap LLM call arguments or responses** — those are already captured by OpenInference auto-instrumentation
5. **Don't change the function's interface** — `wrap()` is purely additive, returns the same type

### Value vs. function wrapping

```python
# Value form: wrap a data value (result already computed)
profile = pixie.wrap(db.get_profile(user_id), purpose="input", name="customer_profile")

# Function form: wrap the callable itself — in eval mode the original function
# is NOT called; the registry value is returned instead.
profile = pixie.wrap(db.get_profile, purpose="input", name="customer_profile")(user_id)
```

Use function form when you want to prevent the external call from happening in eval mode (e.g., the call is expensive, has side-effects, or you simply want a clean injection point). In tracing mode, the function is called normally and the result is logged.

### Coverage check

After adding `wrap()` calls, go through each eval criterion from `pixie_qa/02-eval-criteria.md` and verify that every required data point has a corresponding wrap call. If a criterion needs data that isn't captured, add the wrap now — don't defer.

## 2b. Implement the Runnable class

The `Runnable` class replaces the plain function from older versions of the skill. It exposes three lifecycle methods:

- **`setup()`** — async, called once before any `run()` call; initialize shared resources here (e.g., an async HTTP client, a DB connection, pre-loaded configuration). Optional — has a default no-op.
- **`run(args)`** — async, called **concurrently** for each dataset entry (up to 4 in parallel); invoke the app's real entry point with `args` (a validated Pydantic model built from `entry_kwargs`). **Must be concurrency-safe** — see below.
- **`teardown()`** — async, called once after all `run()` calls; clean up resources. Optional — has a default no-op.

**Import resolution**: The project root is automatically added to `sys.path` when your runnable is loaded, so you can use normal `import` statements (e.g., `from app import service`) — no `sys.path` manipulation needed.

Place the class in `pixie_qa/scripts/run_app.py`:

```python
# pixie_qa/scripts/run_app.py
from __future__ import annotations
from pydantic import BaseModel
import pixie


class AppArgs(BaseModel):
    user_message: str


class AppRunnable(pixie.Runnable[AppArgs]):
    """Runnable that drives the application for tracing and evaluation.

    wrap(purpose="input") calls in the app inject dependency data from the
    test registry automatically.  wrap(purpose="output"/"state") calls
    capture data for evaluation.  No manual mocking needed.
    """

    @classmethod
    def create(cls) -> AppRunnable:
        return cls()

    async def run(self, args: AppArgs) -> None:
        from myapp import handle_request
        await handle_request(args.user_message)
```

**For web servers**, initialize an async HTTP client in `setup()` and use it in `run()`:

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

**For FastAPI/Starlette apps** (in-process testing without starting a server), use `httpx.ASGITransport` to run the ASGI app directly. This is faster and avoids port management:

```python
import asyncio
import httpx
from pydantic import BaseModel
import pixie


class AppArgs(BaseModel):
    user_message: str


class AppRunnable(pixie.Runnable[AppArgs]):
    _client: httpx.AsyncClient
    _sem: asyncio.Semaphore

    @classmethod
    def create(cls) -> AppRunnable:
        inst = cls()
        inst._sem = asyncio.Semaphore(1)  # serialise if app uses shared mutable state
        return inst

    async def setup(self) -> None:
        from myapp.main import app  # your FastAPI/Starlette app instance

        # ASGITransport runs the app in-process — no server needed
        transport = httpx.ASGITransport(app=app)
        self._client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async def run(self, args: AppArgs) -> None:
        async with self._sem:
            await self._client.post("/chat", json={"message": args.user_message})

    async def teardown(self) -> None:
        await self._client.aclose()
```

Choose the right pattern:

- **Direct function call**: when the app exposes a simple async function (no web framework)
- **`httpx.AsyncClient` with `base_url`**: when you need to test against a running HTTP server
- **`httpx.ASGITransport`**: when the app is FastAPI/Starlette — fastest, no server needed, most reliable for eval

**Rules**:

- The `run()` method receives a Pydantic model whose fields are populated from the dataset's `entry_kwargs`. Define a `BaseModel` subclass with the fields your app needs.
- All lifecycle methods (`setup`, `run`, `teardown`) are **async**.
- `run()` must call the app through its real entry point — never bypass request handling.
- Place the file at `pixie_qa/scripts/run_app.py` — name the class `AppRunnable` (or anything descriptive).
- The dataset's `"runnable"` field references the class: `"pixie_qa/scripts/run_app.py:AppRunnable"`.

**Concurrency**: `run()` is called concurrently for multiple dataset entries (up to 4 in parallel). If the app uses shared mutable state — SQLite, file-based DBs, global caches — you must synchronise access:

```python
import asyncio

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

- **SQLite**: `sqlite3` connections are not safe for concurrent async writes. Use `Semaphore(1)` to serialise, or switch to `aiosqlite` with WAL mode.
- **Global mutable state**: module-level dicts/lists modified in `run()` need a lock.
- **Rate-limited external APIs**: add a semaphore to avoid 429 errors.

## 2c. Capture the reference trace with `pixie trace`

Use the `pixie trace` CLI command to run your `Runnable` and capture a trace file. Pass the entry input as a JSON file:

```bash
# Create a JSON file with entry kwargs
echo '{"user_message": "a realistic sample input"}' > pixie_qa/sample-input.json

pixie trace --runnable pixie_qa/scripts/run_app.py:AppRunnable \
  --input pixie_qa/sample-input.json \
  --output pixie_qa/reference-trace.jsonl
```

The `--input` flag takes a **file path** to a JSON file (not inline JSON). The JSON object keys become the kwargs passed to the Pydantic model.

The command calls `AppRunnable.create()`, then `setup()`, then `run(args)` once with the given input, then `teardown()`. The resulting trace is written to the output file.

The JSONL trace file will contain one line per `wrap()` event and one line per LLM span:

```jsonl
{"type": "kwargs", "value": {"user_message": "What are your hours?"}}
{"type": "wrap", "name": "customer_profile", "purpose": "input", "data": {...}, ...}
{"type": "llm_span", "request_model": "gpt-4o", "input_messages": [...], ...}
{"type": "wrap", "name": "response", "purpose": "output", "data": "Our hours are...", ...}
```

## 2d. Verify wrap coverage with `pixie format`

Run `pixie format` on the trace file to see the data in dataset-entry format. This shows you both the data shapes and what a real app output looks like:

```bash
pixie format --input reference-trace.jsonl --output dataset-sample.json
```

The output is a formatted dataset entry template — it contains:

- `entry_kwargs`: the exact keys/values for the runnable arguments
- `eval_input`: the data for all dependencies (from `wrap(purpose="input")` calls)
- `eval_output`: the **actual app output** captured from the trace (this is the real output — use it to understand what the app produces, not as a dataset `eval_output` field)

For each eval criterion from `pixie_qa/02-eval-criteria.md`, verify the format output contains the data needed to evaluate it. If a data point is missing, go back and add the `wrap()` call.

---

## Output

- `pixie_qa/scripts/run_app.py` — the `Runnable` class
- `pixie_qa/reference-trace.jsonl` — the reference trace with all expected wrap events
