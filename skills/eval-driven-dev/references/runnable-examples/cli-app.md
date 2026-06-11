# Runnable Example: CLI Application

**When the app is invoked from the command line** (e.g., `python -m myapp`, a CLI tool with argparse/click).

**Approach**: Use `asyncio.create_subprocess_exec` to invoke the CLI and capture output.

```python
# pixie_qa/run_app.py
import asyncio
import sys

from pydantic import BaseModel
import pixie


class AppArgs(BaseModel):
    query: str


class AppRunnable(pixie.Runnable[AppArgs]):
    """Drives a CLI application via subprocess."""

    @classmethod
    def create(cls) -> "AppRunnable":
        return cls()

    async def run(self, args: AppArgs) -> None:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "myapp", "--query", args.query,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode != 0:
            raise RuntimeError(f"App failed (exit {proc.returncode}): {stderr.decode()}")
```

## When the CLI needs patched dependencies

If the CLI reads from external services, create a wrapper entry point that patches dependencies before running the real CLI:

```python
# pixie_qa/patched_app.py
"""Entry point that patches external deps before running the real CLI."""
import myapp.config as config
config.redis_url = "mock://localhost"

from myapp.main import main
main()
```

Then point your Runnable at the wrapper:

```python
async def run(self, args: AppArgs) -> None:
    proc = await asyncio.create_subprocess_exec(
        sys.executable, "-m", "pixie_qa.patched_app", "--query", args.query,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
```

**Note**: For CLI apps, `wrap(purpose="input")` injection only works when the app runs in the same process. If using subprocess, you may need to pass test data via environment variables or config files instead.
