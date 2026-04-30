# Ralph Loop: Autonomous AI Task Loops

Build autonomous coding loops where an AI agent picks tasks, implements them, validates against backpressure (tests, builds), commits, and repeats — each iteration in a fresh context window.

> **Runnable example:** [recipe/RalphLoop.java](recipe/RalphLoop.java)
>
> ```bash
> jbang recipe/RalphLoop.java
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

```java
///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.events.*;
import com.github.copilot.sdk.json.*;
import java.nio.file.*;

public class SimpleRalphLoop {
    public static void main(String[] args) throws Exception {
        String promptFile = args.length > 0 ? args[0] : "PROMPT.md";
        int maxIterations = args.length > 1 ? Integer.parseInt(args[1]) : 50;

        try (var client = new CopilotClient()) {
            client.start().get();

            String prompt = Files.readString(Path.of(promptFile));

            for (int i = 1; i <= maxIterations; i++) {
                System.out.printf("%n=== Iteration %d/%d ===%n", i, maxIterations);

                // Fresh session each iteration — context isolation is the point
                var session = client.createSession(
                    new SessionConfig()
                        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                        .setModel("gpt-5.1-codex-mini")
                        .setWorkingDirectory(System.getProperty("user.dir"))
                ).get();

                try {
                    session.sendAndWait(new MessageOptions().setPrompt(prompt)).get();
                } finally {
                    session.close();
                }

                System.out.printf("Iteration %d complete.%n", i);
            }
        }
    }
}
```

This is all you need to get started. The prompt file tells the agent what to do; the agent reads project files, does work, commits, and exits. The loop restarts with a clean slate.

## Ideal Version

The full Ralph pattern with planning and building modes, matching the [Ralph Playbook](https://github.com/ClaytonFarr/ralph-playbook) architecture:

```java
///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.events.*;
import com.github.copilot.sdk.json.*;
import java.nio.file.*;
import java.util.Arrays;

public class RalphLoop {
    public static void main(String[] args) throws Exception {
        // Parse CLI args: jbang RalphLoop.java [plan] [max_iterations]
        boolean planMode = Arrays.asList(args).contains("plan");
        String mode = planMode ? "plan" : "build";
        int maxIterations = Arrays.stream(args)
            .filter(a -> a.matches("\\d+"))
            .findFirst()
            .map(Integer::parseInt)
            .orElse(50);

        String promptFile = planMode ? "PROMPT_plan.md" : "PROMPT_build.md";
        System.out.printf("Mode: %s | Prompt: %s%n", mode, promptFile);

        try (var client = new CopilotClient()) {
            client.start().get();

            String prompt = Files.readString(Path.of(promptFile));

            for (int i = 1; i <= maxIterations; i++) {
                System.out.printf("%n=== Iteration %d/%d ===%n", i, maxIterations);

                var session = client.createSession(
                    new SessionConfig()
                        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                        .setModel("gpt-5.1-codex-mini")
                        .setWorkingDirectory(System.getProperty("user.dir"))
                ).get();

                // Log tool usage for visibility
                session.on(ToolExecutionStartEvent.class,
                    ev -> System.out.printf("  ⚙ %s%n", ev.getData().toolName()));

                try {
                    session.sendAndWait(new MessageOptions().setPrompt(prompt)).get();
                } finally {
                    session.close();
                }

                System.out.printf("Iteration %d complete.%n", i);
            }
        }
    }
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

mvn compile

## Validation

- Tests: `mvn test`
- Typecheck: `mvn compile`
- Lint: `mvn checkstyle:check`
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
9. **Set `workingDirectory`**: Pin the session to your project root so tool operations resolve paths correctly
10. **Auto-approve permissions**: Use `PermissionHandler.APPROVE_ALL` to allow tool calls without interrupting the loop

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
