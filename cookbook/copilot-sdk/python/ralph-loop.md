# Ralph Loop: Autonomous AI Task Loops

Build autonomous coding loops where an AI agent picks tasks, implements them, validates against backpressure (tests, builds), commits, and repeats — each iteration in a fresh context window.

> **Runnable example:** [recipe/ralph_loop.py](recipe/ralph_loop.py)
>
> From the repository root, install dependencies and run:
>
> ```bash
> pip install -r cookbook/copilot-sdk/python/recipe/requirements.txt
> python cookbook/copilot-sdk/python/recipe/ralph_loop.py
> ```
>
> Make sure `PROMPT_build.md` and `PROMPT_plan.md` exist in your current working directory before running the loop.

## What is a Ralph Loop?

A [Ralph loop](https://ghuntley.com/ralph/) is an autonomous development workflow where an AI agent iterates through tasks in isolated context windows. The key insight: **state lives on disk, not in the model's context**. Each iteration starts fresh, reads the current state from files, does one task, writes results back to disk, and exits.

```
┌─────────────────────────────────────────────────┐
│                   loop.sh                       │
│  while true:                                    │
│    ┌─────────────────────────────────────────┐  │
│    │  Fresh session (isolated context)       │  │
│    │                                         │  │
│    │  1. Read PROMPT.md + AGENTS.md          │  │
│    │  2. Study specs/* and code              │  │
│    │  3. Pick next task from plan            │  │
│    │  4. Implement + run tests               │  │
│    │  5. Update plan, commit, exit           │  │
│    └─────────────────────────────────────────┘  │
│    ↻ next iteration (fresh context)             │
└─────────────────────────────────────────────────┘
```

**Core principles:**

- **Fresh context per iteration**: Each loop creates a new session — no context accumulation, always in the "smart zone"
- **Disk as shared state**: `IMPLEMENTATION_PLAN.md` persists between iterations and acts as the coordination mechanism
- **Backpressure steers quality**: Tests, builds, and lints reject bad work — the agent must fix issues before committing
- **Two modes**: PLANNING (gap analysis → generate plan) and BUILDING (implement from plan)

## Simple Version

The minimal Ralph loop — the SDK equivalent of `while :; do cat PROMPT.md | copilot ; done`:

```python
import asyncio
from pathlib import Path
from copilot import CopilotClient, MessageOptions, SessionConfig


async def ralph_loop(prompt_file: str, max_iterations: int = 50):
    client = CopilotClient()
    await client.start()

    try:
        prompt = Path(prompt_file).read_text()

        for i in range(1, max_iterations + 1):
            print(f"\n=== Iteration {i}/{max_iterations} ===")

            # Fresh session each iteration — context isolation is the point
            session = await client.create_session(
                SessionConfig(model="gpt-5.1-codex-mini")
            )
            try:
                await session.send_and_wait(
                    MessageOptions(prompt=prompt), timeout=600
                )
            finally:
                await session.destroy()

            print(f"Iteration {i} complete.")
    finally:
        await client.stop()


# Usage: point at your PROMPT.md
asyncio.run(ralph_loop("PROMPT.md", 20))
```

This is all you need to get started. The prompt file tells the agent what to do; the agent reads project files, does work, commits, and exits. The loop restarts with a clean slate.

## Ideal Version

The full Ralph pattern with planning and building modes, matching the [Ralph Playbook](https://github.com/ClaytonFarr/ralph-playbook) architecture:

```python
import asyncio
import sys
from pathlib import Path

from copilot import CopilotClient, MessageOptions, SessionConfig


async def ralph_loop(mode: str = "build", max_iterations: int = 50):
    prompt_file = "PROMPT_plan.md" if mode == "plan" else "PROMPT_build.md"
    client = CopilotClient()
    await client.start()

    print("━" * 40)
    print(f"Mode:   {mode}")
    print(f"Prompt: {prompt_file}")
    print(f"Max:    {max_iterations} iterations")
    print("━" * 40)

    try:
        prompt = Path(prompt_file).read_text()

        for i in range(1, max_iterations + 1):
            print(f"\n=== Iteration {i}/{max_iterations} ===")

            session = await client.create_session(SessionConfig(
                model="gpt-5.1-codex-mini",
                # Pin the agent to the project directory
                working_directory=str(Path.cwd()),
                # Auto-approve tool calls for unattended operation
                on_permission_request=lambda _req, _ctx: {
                    "kind": "approved", "rules": []
                },
            ))

            # Log tool usage for visibility
            def log_tool_event(event):
                if event.type.value == "tool.execution_start":
                    print(f"  ⚙ {event.data.tool_name}")

            session.on(log_tool_event)

            try:
                await session.send_and_wait(
                    MessageOptions(prompt=prompt), timeout=600
                )
            finally:
                await session.destroy()

            print(f"\nIteration {i} complete.")

        print(f"\nReached max iterations: {max_iterations}")
    finally:
        await client.stop()


if __name__ == "__main__":
    args = sys.argv[1:]
    mode = "plan" if "plan" in args else "build"
    max_iter = next((int(a) for a in args if a.isdigit()), 50)
    asyncio.run(ralph_loop(mode, max_iter))
```

### Required Project Files

The ideal version expects this file structure in your project:

```
project-root/
├── PROMPT_plan.md              # Planning mode instructions
├── PROMPT_build.md             # Building mode instructions
├── AGENTS.md                   # Operational guide (build/test commands)
├── IMPLEMENTATION_PLAN.md      # Task list (generated by planning mode)
├── specs/                      # Requirement specs (one per topic)
│   ├── auth.md
│   └── data-pipeline.md
└── src/                        # Your source code
```

### Example `PROMPT_plan.md`

```markdown
0a. Study `specs/*` to learn the application specifications.
0b. Study IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study `src/` to understand existing code and shared utilities.

1. Compare specs against code (gap analysis). Create or update
   IMPLEMENTATION_PLAN.md as a prioritized bullet-point list of tasks
   yet to be implemented. Do NOT implement anything.

IMPORTANT: Do NOT assume functionality is missing — search the
codebase first to confirm. Prefer updating existing utilities over
creating ad-hoc copies.
```

### Example `PROMPT_build.md`

```markdown
0a. Study `specs/*` to learn the application specifications.
0b. Study IMPLEMENTATION_PLAN.md.
0c. Study `src/` for reference.

1. Choose the most important item from IMPLEMENTATION_PLAN.md. Before
   making changes, search the codebase (don't assume not implemented).
2. After implementing, run the tests. If functionality is missing, add it.
3. When you discover issues, update IMPLEMENTATION_PLAN.md immediately.
4. When tests pass, update IMPLEMENTATION_PLAN.md, then `git add -A`
   then `git commit` with a descriptive message.

5. When authoring documentation, capture the why.
6. Implement completely. No placeholders or stubs.
7. Keep IMPLEMENTATION_PLAN.md current — future iterations depend on it.
```

### Example `AGENTS.md`

Keep this brief (~60 lines). It's loaded every iteration, so bloat wastes context.

```markdown
## Build & Run

python -m pytest

## Validation

- Tests: `pytest`
- Typecheck: `mypy src/`
- Lint: `ruff check src/`
```

## Best Practices

1. **Fresh context per iteration**: Never accumulate context across iterations — that's the whole point
2. **Disk is your database**: `IMPLEMENTATION_PLAN.md` is shared state between isolated sessions
3. **Backpressure is essential**: Tests, builds, lints in `AGENTS.md` — the agent must pass them before committing
4. **Start with PLANNING mode**: Generate the plan first, then switch to BUILDING
5. **Observe and tune**: Watch early iterations, add guardrails to prompts when the agent fails in specific ways
6. **The plan is disposable**: If the agent goes off track, delete `IMPLEMENTATION_PLAN.md` and re-plan
7. **Keep `AGENTS.md` brief**: It's loaded every iteration — operational info only, no progress notes
8. **Use a sandbox**: The agent runs autonomously with full tool access — isolate it
9. **Set `working_directory`**: Pin the session to your project root so tool operations resolve paths correctly
10. **Auto-approve permissions**: Use `on_permission_request` to allow tool calls without interrupting the loop

## When to Use a Ralph Loop

**Good for:**

- Implementing features from specs with test-driven validation
- Large refactors broken into many small tasks
- Unattended, long-running development with clear requirements
- Any work where backpressure (tests/builds) can verify correctness

**Not good for:**

- Tasks requiring human judgment mid-loop
- One-shot operations that don't benefit from iteration
- Vague requirements without testable acceptance criteria
- Exploratory prototyping where direction isn't clear

## See Also

- [Error Handling](error-handling.md) — timeout patterns and graceful shutdown for long-running sessions
- [Persisting Sessions](persisting-sessions.md) — save and resume sessions across restarts
