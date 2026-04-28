# Runnable Example: Standalone Function (No Server)

**When the app is a plain Python function or module** — no web framework, no server, no infrastructure.

**Approach**: Import and call the function directly from `run()`. This is the simplest case.

```python
# pixie_qa/run_app.py
from pydantic import BaseModel
import pixie


class AppArgs(BaseModel):
    question: str


class AppRunnable(pixie.Runnable[AppArgs]):
    """Drives a standalone function for tracing and evaluation."""

    @classmethod
    def create(cls) -> "AppRunnable":
        return cls()

    async def run(self, args: AppArgs) -> None:
        from myapp.agent import answer_question
        await answer_question(args.question)
```

If the function is synchronous, wrap it with `asyncio.to_thread`:

```python
import asyncio

async def run(self, args: AppArgs) -> None:
    from myapp.agent import answer_question
    await asyncio.to_thread(answer_question, args.question)
```

If the function depends on an external service (e.g., a vector store), the `wrap(purpose="input")` calls you added in Step 2a handle it automatically — the registry injects test data in eval mode.

### When to use `setup()` / `teardown()`

Most standalone functions don't need lifecycle methods. Use them only when the function requires a shared resource (e.g., a pre-loaded embedding model, a database connection):

```python
class AppRunnable(pixie.Runnable[AppArgs]):
    _model: SomeModel

    @classmethod
    def create(cls) -> "AppRunnable":
        return cls()

    async def setup(self) -> None:
        from myapp.models import load_model
        self._model = load_model()

    async def run(self, args: AppArgs) -> None:
        from myapp.agent import answer_question
        await answer_question(args.question, model=self._model)
```
