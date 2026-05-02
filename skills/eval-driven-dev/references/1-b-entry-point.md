# Step 1b: Entry Point & Execution Flow

Identify how the application starts and how a real user invokes it. Use the **capability inventory** from `pixie_qa/00-project-analysis.md` to prioritize — focus on the entry point(s) that exercise the most valuable and frequently-used capabilities, not just the first one you find.

---

## What to investigate

### 1. How the software runs

What is the entry point? How do you start it? Is it a CLI, a server, a library function? What are the required arguments, config files, or environment variables?

Look for:

- `if __name__ == "__main__"` blocks
- Framework entry points (FastAPI `app`, Flask `app`, Django `manage.py`)
- CLI entry points in `pyproject.toml` (`[project.scripts]`)
- Docker/compose configs that reveal startup commands

### 2. The real user entry point

How does a real user or client invoke the app? This is what the eval must exercise — not an inner function that bypasses the request pipeline.

- **Web server**: Which HTTP endpoints accept user input? What methods (GET/POST)? What request body shape?
- **CLI**: What command-line arguments does the user provide?
- **Library/function**: What function does the caller import and call? What arguments?

### 3. Environment and configuration

- What env vars does the app require? (service endpoints, database URLs, feature flags)
- What config files does it read?
- What has sensible defaults vs. what must be explicitly set?

---

## Output: `pixie_qa/01-entry-point.md`

Write your findings to this file. Keep it focused — only entry point and execution flow.

### Template

```markdown
# Entry Point & Execution Flow

## How to run

<Command to start the app, required env vars, config files>

## Entry point

- **File**: <e.g., app.py, main.py>
- **Type**: <FastAPI server / CLI / standalone function / etc.>
- **Framework**: <FastAPI, Flask, Django, none>

## User-facing endpoints / interface

<For each way a user interacts with the app:>

- **Endpoint / command**: <e.g., POST /chat, python main.py --query "...">
- **Input format**: <request body shape, CLI args, function params>
- **Output format**: <response shape, stdout format, return type>

## Environment requirements

| Variable | Purpose | Required? | Default |
| -------- | ------- | --------- | ------- |
| ...      | ...     | ...       | ...     |
```
