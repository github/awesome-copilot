# Runnable Example: FastAPI / Web Server

**When the app is a web server** (FastAPI, Flask, Starlette) and you need to exercise the full HTTP request pipeline.

**Approach**: Use `httpx.AsyncClient` with `ASGITransport` to run the ASGI app in-process. This is the fastest and most reliable approach — no subprocess, no port management.

```python
# pixie_qa/run_app.py
import httpx
from pydantic import BaseModel
import pixie


class AppArgs(BaseModel):
    user_message: str


class AppRunnable(pixie.Runnable[AppArgs]):
    """Drives a FastAPI app via in-process ASGI transport."""

    _client: httpx.AsyncClient

    @classmethod
    def create(cls) -> "AppRunnable":
        return cls()

    async def setup(self) -> None:
        from myapp.main import app  # your FastAPI/Starlette app instance

        transport = httpx.ASGITransport(app=app)
        self._client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async def run(self, args: AppArgs) -> None:
        await self._client.post("/chat", json={"message": args.user_message})

    async def teardown(self) -> None:
        await self._client.aclose()
```

## ASGITransport skips lifespan events

`httpx.ASGITransport` does **not** trigger ASGI lifespan events (`startup` / `shutdown`). If the app initializes resources in its lifespan (database connections, caches, service clients), you must replicate that initialization manually in `setup()`:

```python
async def setup(self) -> None:
    # Manually replicate what the app's lifespan does
    from myapp.db import get_connection, init_db, seed_data
    import myapp.main as app_module

    conn = get_connection()
    init_db(conn)
    seed_data(conn)
    app_module.db_conn = conn  # set the module-level global the app expects

    transport = httpx.ASGITransport(app=app_module.app)
    self._client = httpx.AsyncClient(transport=transport, base_url="http://test")

async def teardown(self) -> None:
    await self._client.aclose()
    # Clean up the manually-initialized resources
    import myapp.main as app_module
    if hasattr(app_module, "db_conn") and app_module.db_conn:
        app_module.db_conn.close()
```

## Concurrency with shared mutable state

If the app uses shared mutable state (in-memory SQLite, file-based DB, global caches), add a semaphore to serialise access:

```python
import asyncio

class AppRunnable(pixie.Runnable[AppArgs]):
    _client: httpx.AsyncClient
    _sem: asyncio.Semaphore

    @classmethod
    def create(cls) -> "AppRunnable":
        inst = cls()
        inst._sem = asyncio.Semaphore(1)
        return inst

    async def setup(self) -> None:
        from myapp.main import app
        transport = httpx.ASGITransport(app=app)
        self._client = httpx.AsyncClient(transport=transport, base_url="http://test")

    async def run(self, args: AppArgs) -> None:
        async with self._sem:
            await self._client.post("/chat", json={"message": args.user_message})

    async def teardown(self) -> None:
        await self._client.aclose()
```

Only use the semaphore when needed — if the app uses per-session state keyed by unique IDs (call_sid, session_id), concurrent calls are naturally isolated and no lock is needed.

## Alternative: External server with httpx

When the app can't be imported directly (complex startup, `uvicorn.run()` in `__main__`), start it as a subprocess and hit it with HTTP:

```python
class AppRunnable(pixie.Runnable[AppArgs]):
    _client: httpx.AsyncClient

    @classmethod
    def create(cls) -> "AppRunnable":
        return cls()

    async def setup(self) -> None:
        # Assumes the server is already running (started via run-with-timeout.sh)
        self._client = httpx.AsyncClient(base_url="http://localhost:8000")

    async def run(self, args: AppArgs) -> None:
        await self._client.post("/chat", json={"message": args.user_message})

    async def teardown(self) -> None:
        await self._client.aclose()
```

Start the server before running `pixie trace` or `pixie test`:

```bash
bash resources/run-with-timeout.sh 120 uv run python -m myapp.server
sleep 3  # wait for readiness
```
