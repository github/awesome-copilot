# Step 2b: Implement the Runnable

> For the full `Runnable` protocol and `wrap()` API, see `wrap-api.md`.

**Goal**: Write a Runnable class that lets the eval harness invoke the application exactly as a real user would.

---

## The core idea

The Runnable is how `pixie test` and `pixie trace` run your application. Think of it as a programmatic stand-in for a real user: it starts the app, sends it a request, and lets the app do its thing. The eval harness calls `run()` for each test case, passing in the user's input parameters. The app processes those parameters through its real code — real routing, real prompt assembly, real LLM calls, real response formatting — and the harness observes what happens via the `wrap()` instrumentation from Step 2a.

**This means the Runnable should be simple.** It just wires up the app's real entry point to the harness interface. If your Runnable is getting complicated — if you're building custom logic, reimplementing app behavior, or replacing components — something is wrong.

## Four requirements

### 1. Run the real production code

The Runnable calls the app's actual entry point — the same function, class, or endpoint a real user would trigger. It does not reimplement, shortcut, or substitute any part of the application.

This includes the LLM. The app's LLM calls must go through the real code path — do not mock, fake, or replace application components. The whole point of eval-based testing is that LLM outputs are non-deterministic, so you use evaluators (not assertions) to score them. If you replace any component with a fake, you've eliminated the real behavior and the eval measures nothing.

**If the app won't run due to missing environment variables or configuration that you cannot resolve, stop and ask the user to fix the environment setup.** Do not work around it by mocking components.

### 2. Represent start-up args with a Pydantic BaseModel

The `run()` method receives a Pydantic `BaseModel` whose fields are populated from the dataset's `input_data`. Define a subclass with the fields the app needs:

```python
from pydantic import BaseModel

class AppArgs(BaseModel):
    user_message: str
    # Add more fields as the app's entry point requires.
    # These map 1:1 to the dataset input_data keys.
```

**The fields must reflect what a real user actually provides.** Read `pixie_qa/00-project-analysis.md` — the "Realistic input characteristics" section describes the complexity, scale, and variety of real inputs. Design the model to accept inputs at that level of realism, not simplified toy versions.

Understand the boundary between user-provided parameters and world data:

- **User-provided parameters** (fields on the BaseModel): what a real user types or configures — prompts, queries, configuration flags, URLs, schema definitions.
- **World data** (handled by `wrap(purpose="input")` in Step 2a): content the app fetches from external sources during execution — web pages, database records, API responses. This is NOT part of the BaseModel.

| App type             | BaseModel fields (user provides)      | World data (wrap provides)                                         |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Web scraper          | URL + prompt + schema definition      | The HTML page content                                              |
| Research agent       | Research question + scope constraints | Source documents, search results                                   |
| Customer support bot | Customer's spoken message             | Customer profile from CRM, conversation history from session store |
| Code review tool     | PR URL + review criteria              | The actual diff, file contents, CI results                         |

If a field ends up holding data the app would normally fetch itself, it probably belongs in a `wrap(purpose="input")` call instead of on the BaseModel.

### 3. Be concurrency-safe

`run()` is called concurrently for multiple dataset entries (up to 4 in parallel). If the app uses shared mutable state — SQLite, file-based DBs, global caches — protect access with `asyncio.Semaphore`:

```python
import asyncio

class AppRunnable(pixie.Runnable[AppArgs]):
    _sem: asyncio.Semaphore

    @classmethod
    def create(cls) -> "AppRunnable":
        inst = cls()
        inst._sem = asyncio.Semaphore(1)
        return inst

    async def run(self, args: AppArgs) -> None:
        async with self._sem:
            await call_app(args.message)
```

Only add the semaphore when the app actually has shared mutable state. If the app uses per-request state (keyed by unique IDs) or is inherently stateless, concurrent calls are naturally isolated.

### 4. Adhere to the Runnable interface

```python
class AppRunnable(pixie.Runnable[AppArgs]):
    @classmethod
    def create(cls) -> "AppRunnable": ...     # construct instance
    async def setup(self) -> None: ...        # once, before first run()
    async def run(self, args: AppArgs) -> None: ...  # per dataset entry, concurrent
    async def teardown(self) -> None: ...     # once, after last run()
```

- `create()` — class method, returns a new instance. Use a quoted return type (`-> "AppRunnable"`) to avoid forward reference errors.
- `setup()` — optional async; initialize shared resources (HTTP clients, DB connections, servers).
- `run(args)` — async; called per dataset entry. Invoke the app's real entry point here.
- `teardown()` — optional async; clean up resources from `setup()`.

## Minimal example

```python
# pixie_qa/run_app.py
from pydantic import BaseModel
import pixie


class AppArgs(BaseModel):
    user_message: str


class AppRunnable(pixie.Runnable[AppArgs]):
    """Drives the application for tracing and evaluation."""

    @classmethod
    def create(cls) -> "AppRunnable":
        return cls()

    async def run(self, args: AppArgs) -> None:
        from myapp import handle_request
        await handle_request(args.user_message)
```

That's it. The Runnable imports the app's real entry point and calls it. No custom logic, no component replacement, no clever workarounds.

## Architecture-specific examples

Based on how the application runs, read the corresponding example file:

| App type                            | Entry point             | Example file                                               |
| ----------------------------------- | ----------------------- | ---------------------------------------------------------- |
| **Standalone function** (no server) | Python function         | Read `references/runnable-examples/standalone-function.md` |
| **Web server** (FastAPI, Flask)     | HTTP/WebSocket endpoint | Read `references/runnable-examples/fastapi-web-server.md`  |
| **CLI application**                 | Command-line invocation | Read `references/runnable-examples/cli-app.md`             |

Read **only** the example file that matches your app type.

## File placement

- Place the file at `pixie_qa/run_app.py`.
- The dataset's `"runnable"` field references: `"pixie_qa/run_app.py:AppRunnable"`.
- The project root is automatically on `sys.path`, so use normal imports (`from app import service`).

## Technical note

Do NOT use `from __future__ import annotations` in runnable files — it breaks Pydantic's model resolution for nested models. Use quoted return types where needed instead.

---

## Output

`pixie_qa/run_app.py` — the Runnable class.
