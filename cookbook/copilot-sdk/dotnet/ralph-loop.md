# Ralph Loop: Autonomous AI Task Loops

Build autonomous coding loops where an AI agent picks tasks, implements them, validates against backpressure (tests, builds), commits, and repeats — each iteration in a fresh context window.

> **Runnable example:** [recipe/ralph-loop.cs](recipe/ralph-loop.cs)
>
> ```bash
> cd dotnet
> dotnet run recipe/ralph-loop.cs
> ```

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

```csharp
using GitHub.Copilot.SDK;

var client = new CopilotClient();
await client.StartAsync();

try
{
    var prompt = await File.ReadAllTextAsync("PROMPT.md");
    var maxIterations = 50;

    for (var i = 1; i <= maxIterations; i++)
    {
        Console.WriteLine($"\n=== Iteration {i}/{maxIterations} ===");

        // Fresh session each iteration — context isolation is the point
        var session = await client.CreateSessionAsync(
            new SessionConfig { Model = "gpt-5.1-codex-mini" });
        try
        {
            var done = new TaskCompletionSource<string>();
            session.On(evt =>
            {
                if (evt is AssistantMessageEvent msg)
                    done.TrySetResult(msg.Data.Content);
            });

            await session.SendAsync(new MessageOptions { Prompt = prompt });
            await done.Task;
        }
        finally
        {
            await session.DisposeAsync();
        }

        Console.WriteLine($"Iteration {i} complete.");
    }
}
finally
{
    await client.StopAsync();
}
```

This is all you need to get started. The prompt file tells the agent what to do; the agent reads project files, does work, commits, and exits. The loop restarts with a clean slate.

## Ideal Version

The full Ralph pattern with planning and building modes, matching the [Ralph Playbook](https://github.com/ClaytonFarr/ralph-playbook) architecture:

```csharp
using GitHub.Copilot.SDK;

// Parse args: dotnet run [plan] [max_iterations]
var mode = args.Contains("plan") ? "plan" : "build";
var maxArg = args.FirstOrDefault(a => int.TryParse(a, out _));
var maxIterations = maxArg != null ? int.Parse(maxArg) : 50;
var promptFile = mode == "plan" ? "PROMPT_plan.md" : "PROMPT_build.md";

var client = new CopilotClient();
await client.StartAsync();

Console.WriteLine(new string('━', 40));
Console.WriteLine($"Mode:   {mode}");
Console.WriteLine($"Prompt: {promptFile}");
Console.WriteLine($"Max:    {maxIterations} iterations");
Console.WriteLine(new string('━', 40));

try
{
    var prompt = await File.ReadAllTextAsync(promptFile);

    for (var i = 1; i <= maxIterations; i++)
    {
        Console.WriteLine($"\n=== Iteration {i}/{maxIterations} ===");

        // Fresh session — each task gets full context budget
        var session = await client.CreateSessionAsync(
            new SessionConfig
            {
                Model = "gpt-5.1-codex-mini",
                // Pin the agent to the project directory
                WorkingDirectory = Environment.CurrentDirectory,
                // Auto-approve tool calls for unattended operation
                OnPermissionRequest = (_, _) => Task.FromResult(
                    new PermissionRequestResult { Kind = "approved" }),
            });
        try
        {
            var done = new TaskCompletionSource<string>();
            session.On(evt =>
            {
                // Log tool usage for visibility
                if (evt is ToolExecutionStartEvent toolStart)
                    Console.WriteLine($"  ⚙ {toolStart.Data.ToolName}");
                else if (evt is AssistantMessageEvent msg)
                    done.TrySetResult(msg.Data.Content);
            });

            await session.SendAsync(new MessageOptions { Prompt = prompt });
            await done.Task;
        }
        finally
        {
            await session.DisposeAsync();
        }

        Console.WriteLine($"\nIteration {i} complete.");
    }

    Console.WriteLine($"\nReached max iterations: {maxIterations}");
}
finally
{
    await client.StopAsync();
}
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

dotnet build

## Validation

- Tests: `dotnet test`
- Build: `dotnet build --no-restore`
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
9. **Set `WorkingDirectory`**: Pin the session to your project root so tool operations resolve paths correctly
10. **Auto-approve permissions**: Use `OnPermissionRequest` to allow tool calls without interrupting the loop

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
