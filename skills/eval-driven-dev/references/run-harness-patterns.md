# Running the App from Its Entry Point — Examples by App Type

This reference shows concrete examples of how to write the utility function from Step 3 — the function that runs the full application end-to-end with external dependencies mocked. Each example demonstrates what an "entry point" looks like for a different kind of application and how to invoke it.

For `enable_storage()` and `observe` API details, see `references/pixie-api.md` (Instrumentation API section).

## What entry point to use

Look at how a real user or client invokes the app, and do the same thing in your utility function:

| App type                                           | Entry point example     | How to invoke it                                     |
| -------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| **Web server** (FastAPI, Flask)                    | HTTP/WebSocket endpoint | `TestClient`, `httpx`, or subprocess + HTTP requests |
| **CLI application**                                | Command-line invocation | `subprocess.run()`                                   |
| **Standalone function** (no server, no middleware) | Python function         | Import and call directly                             |

**Do NOT call an inner function** like `agent.respond()` directly just because it's simpler. Between the entry point and that inner function, the app does request handling, state management, prompt assembly, routing — all of which is under test. When you call an inner function, you skip all of that and end up reimplementing it in your test. Now your test is testing test code, not app code.

Mock only external dependencies (databases, speech services, third-party APIs) — everything you identified and planned in Step 1.

---

## Example: FastAPI / Web Server with External Services

**When your app is a web server** (FastAPI, Flask, etc.) with external service dependencies (Redis, Twilio, speech services, databases). **This is the most common case** — most production apps are web servers.

**Approach**: Mock external dependencies, then drive the app through its HTTP/WebSocket interface. Two sub-approaches:

- **Subprocess approach**: Launch the patched server as a subprocess, wait for health, then send HTTP/WebSocket requests with `httpx`. Best when the app has complex startup or uses `uvicorn.run()`.
- **In-process approach**: Use FastAPI's `TestClient` (or `httpx.AsyncClient` with `ASGITransport`) to drive the app in-process. Simpler — no subprocess management, no ports. Best when you can import the `app` object directly.

Both approaches exercise the full request pipeline: routing → middleware → state management → business logic → response assembly.

### Step 1: Identify pluggable interfaces and write mock backends

Look for abstract base classes, protocols, or constructor-injected backends in the codebase. These are the app's testability seams — the places where external services can be swapped out. Create mock implementations that satisfy the interface but don't call external services.

```python
# pixie_qa/scripts/mock_backends.py
from myapp.services.transcription import TranscriptionBackend
from myapp.services.voice_synthesis import SynthesisBackend

class MockTranscriptionBackend(TranscriptionBackend):
    """Decodes UTF-8 text instead of calling real STT service."""
    async def transcribe_chunk(self, audio_data: bytes) -> str | None:
        try:
            return audio_data.decode("utf-8")
        except UnicodeDecodeError:
            return None

class MockSynthesisBackend(SynthesisBackend):
    """Encodes text as bytes instead of calling real TTS service."""
    async def synthesize(self, text: str) -> bytes:
        return text.encode("utf-8")
```

### Step 2: Write the patched server launcher

Monkey-patch the app's module-level dependencies before starting the server:

```python
# pixie_qa/scripts/demo_server.py
import uvicorn
from pixie_qa.scripts.mock_backends import (
    MockTranscriptionBackend,
    MockSynthesisBackend,
)

# Patch module-level backends BEFORE uvicorn imports the ASGI app
import myapp.app as the_app
the_app.transcription_backend = MockTranscriptionBackend()
the_app.synthesis_backend = MockSynthesisBackend()

if __name__ == "__main__":
    uvicorn.run(the_app.app, host="127.0.0.1", port=8000)
```

### Step 3: Write the utility function

Launch the server subprocess, wait for health, send real requests, collect responses:

```python
# pixie_qa/scripts/run_app.py
import subprocess
import sys
import time
import httpx

BASE_URL = "http://127.0.0.1:8000"

def wait_for_server(timeout: float = 30.0) -> None:
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = httpx.get(f"{BASE_URL}/health", timeout=2)
            if resp.status_code == 200:
                return
        except httpx.ConnectError:
            pass
        time.sleep(0.5)
    raise TimeoutError(f"Server did not start within {timeout}s")

def main() -> None:
    # Launch patched server
    server = subprocess.Popen(
        [sys.executable, "-m", "pixie_qa.scripts.demo_server"],
    )
    try:
        wait_for_server()
        # Drive the app with real inputs
        resp = httpx.post(f"{BASE_URL}/api/chat", json={
            "message": "What are your business hours?"
        })
        print(resp.json())
    finally:
        server.terminate()
        server.wait()

if __name__ == "__main__":
    main()
```

**Run**: `uv run python -m pixie_qa.scripts.run_app`

### Alternative: In-process with TestClient (simpler)

If the app's `app` object can be imported directly, skip the subprocess and use FastAPI's `TestClient`:

```python
# pixie_qa/scripts/run_app.py
from unittest.mock import patch
from fastapi.testclient import TestClient
from pixie import enable_storage, observe

from pixie_qa.scripts.mock_backends import (
    MockTranscriptionBackend,
    MockSynthesisBackend,
)

@observe
def run_app(eval_input: dict) -> dict:
    """Run the voice agent through its real FastAPI app layer."""
    enable_storage()
    # Patch external dependencies before importing the app
    with patch("myapp.app.transcription_backend", MockTranscriptionBackend()), \
         patch("myapp.app.synthesis_backend", MockSynthesisBackend()), \
         patch("myapp.app.call_state_store", MockCallStateStore()):

        from myapp.app import app
        client = TestClient(app)

        # Drive through the real HTTP/WebSocket endpoints
        resp = client.post("/api/chat", json={
            "message": eval_input["user_message"],
            "call_sid": eval_input.get("call_sid", "test-call-001"),
        })
        return {"response": resp.json()["response"]}
```

This approach is simpler (no subprocess, no port management) and equally valid. Both approaches exercise the full request pipeline.

**Run**: `uv run python -m pixie_qa.scripts.run_app`

---

## Example: CLI / Command-Line App

**When your app is invoked from the command line** (e.g., `python -m myapp`, a CLI tool).

**Approach**: Invoke the app's entry point via `subprocess.run()`, capture stdout/stderr, parse results.

```python
# pixie_qa/scripts/run_app.py
import subprocess
import sys
import json

def run_app(user_input: str) -> str:
    """Run the CLI app with the given input and return its output."""
    result = subprocess.run(
        [sys.executable, "-m", "myapp", "--query", user_input],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"App failed: {result.stderr}")
    return result.stdout.strip()

def main() -> None:
    inputs = [
        "What are your business hours?",
        "How do I reset my password?",
        "Tell me about your return policy",
    ]
    for user_input in inputs:
        output = run_app(user_input)
        print(f"Input: {user_input}")
        print(f"Output: {output}")
        print("---")

if __name__ == "__main__":
    main()
```

If the CLI app needs external dependencies mocked, create a wrapper script that patches them before invoking the entry point:

```python
# pixie_qa/scripts/patched_app.py
"""Entry point that patches DB/cache before running the real app."""
import myapp.config as config
config.redis_url = "mock://localhost"  # or use a mock implementation

from myapp.main import main
main()
```

**Run**: `uv run python -m pixie_qa.scripts.run_app`

---

## Example: Standalone Function (No Infrastructure)

**When your app is a single function or module** with no server, no database, no external services.

**Approach**: Import the function directly and call it. This is the simplest case.

```python
# pixie_qa/scripts/run_app.py
from pixie import enable_storage, observe

# Enable trace capture
enable_storage()

from myapp.agent import answer_question

@observe
def run_agent(question: str) -> str:
    """Wrapper that captures traces for the agent call."""
    return answer_question(question)

def main() -> None:
    inputs = [
        "What are your business hours?",
        "How do I reset my password?",
        "Tell me about your return policy",
    ]
    for q in inputs:
        result = run_agent(q)
        print(f"Q: {q}")
        print(f"A: {result}")
        print("---")

if __name__ == "__main__":
    main()
```

If the function depends on something that needs mocking (e.g., a vector store client), patch it before calling:

```python
from unittest.mock import MagicMock
import myapp.retriever as retriever

# Mock the vector store with a simple keyword search
retriever.vector_client = MagicMock()
retriever.vector_client.search.return_value = [
    {"text": "Business hours: Mon-Fri 9am-5pm", "score": 0.95}
]
```

**Run**: `uv run python -m pixie_qa.scripts.run_app`

---

## Key Rules

1. **Always call through the real entry point** — the same way a real user or client would
2. **Mock only external dependencies** — the ones you identified in Step 1
3. **Use `uv run python -m <module>`** to run scripts — never `python <path>`
4. **Add `enable_storage()` and `@observe`** in the utility function so traces are captured
5. **After running, verify traces**: `uv run pixie trace list` then `uv run pixie trace show <trace_id> --verbose`
