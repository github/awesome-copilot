---
title: '04 · Shaping the Lifecycle with Hooks'
description: 'Wire deterministic lifecycle hooks so tests, lint, and build feedback flow back into the agent automatically.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 4 — Shaping Copilot CLI's lifecycle with hooks

| [← Previous: Enhancing the test suite with remote and delegation][previous-lesson] | [Next: Adding a new feature →][next-lesson] |
|:--|--:|

The AI layer of the agent loop is **probabilistic**. It may or may not remember to run tests, lint or build after a change. Hooks are the **deterministic** layer underneath it, hosting shell commands the harness runs at defined lifecycle points regardless of what the model decides, feeding structured output back into the conversation so the next turn starts from reality rather than assumption.

## What you will learn

- How hooks fit into the agent execution loop and why they complement the already existing AI infrastructure from [Module 2][m02].
- The hook event model: which events fire when, what payloads they receive and what output they expect.
- Hook types: `command`, `http` and `prompt` - and when to reach for each.
- Scoping hooks to specific locations and tool calls.
- How to wire up a `postToolUse` hook that runs the right tests after each file edit and injects the results back into the agent's context.


## Scenario

> [!NOTE]
> **Starting state**: the AI infrastructure - instructions, custom agents, skills from [Module 2][m02], and the Playwright test scaffold from [Module 3][previous-lesson] are in place on your fork. If you're jumping in here, check out the catch-up branch that holds them:
>
> ```bash
> git checkout start-of-module-04
> ```

At the end of [Module 3][previous-lesson] you delegated the test backfill to the Copilot cloud agent. Those tests now exist, but they run only when you explicitly ask, or when CI picks them up on a push. There is nothing that automatically runs the right checks right after the agent edits a file, while it still has context on what it just changed. Hooks close that gap.

## Lifecycle hooks in Copilot CLI

### What a hook is

A hook is a JSON-declared shell command, HTTP call or prompt that the Copilot CLI harness invokes synchronously at a named point in the agent loop. Hooks run **outside the AI model** - they are not prompts and the model does not decide when or whether they fire. The harness fires them unconditionally when a trigger event occurs, collects their stdout and injects it back into the agent's context before the next turn.

Your instructions tell the model how to behave, while your hooks enforce behavior regardless of what the model does. This distinction matters. A `postToolUse` hook that runs `pytest` after every Python file edit is not a suggestion - it runs every single time.

Consider hooks for checks that are:

- **Fast:** hooks run synchronously, so a slow hook stalls the agent. *Rule of thumb - Anything over ~30 seconds belongs in CI or a delegated job, not a hook.*
- **Deterministic:** the output should be stable for the same input. A hook that flakes trains the agent (and you) to discount its output.
- **Objective:** pass/fail, lint errors, type errors. Anything requiring judgment (code review, architecture decisions) should stay in the conversation, not in a hook.

### Types of hooks

Each hook entry declares a `type` field which can either be:

- `command` - runs a shell command locally. Provide `bash` and optionally `powershell` for cross-platform support. This is the most common type.
- `http` - POSTs the event payload as JSON to a URL. Useful for audit trails, webhook-triggered CI or external governance systems without a local script. HTTPS is required by default, but you can allow HTTP for localhost by setting `COPILOT_HOOK_ALLOW_LOCALHOST=1`.
- `prompt` - auto-submits a text string or slash command into the session on `sessionStart`. Only fires on new interactive sessions (not on resume or in non-interactive `-p` mode).

## How hooks receive events and return output

The harness emits named events across the session lifecycle and your hook configuration maps event names to arrays of hook entries.

| Event | When it fires | What your hook can do |
|---|---|---|
| `sessionStart` | New or resumed session begins | Inject context (`additionalContext`) e.g., current branch, open issues |
| `sessionEnd` | Session terminates | Logging, cleanup, notifications |
| `userPromptSubmitted` | User submits a prompt | Intercept and short-circuit with a direct `response`, bypassing the model |
| `preToolUse` | Before a tool call executes | Allow, deny or modify the tool's arguments |
| `postToolUse` | After a tool call completes **successfully** | Modify the tool result seen by the LLM or append `additionalContext` |
| `postToolUseFailure` | After a tool call fails | Provide recovery guidance via `additionalContext` |
| `agentStop` | The agent finishes a turn | Block the turn from closing, e.g., force another turn with a `reason` |
| `subagentStart` | A subagent is spawned | Inject context into the subagent's prompt |
| `subagentStop` | A subagent completes | Block and force another subagent turn |
| `permissionRequest` | CLI prompts the user for tool approval | Programmatically allow or deny |

For the test-and-lint feedback loop in this module, the events that matter most are:

- `postToolUse` - to run checks after each file edit and feed results back to the agent loop
- `agentStop` - to optionally block the agent from finishing a turn if checks are red).

### Reading hook input and writing hook output

Every hook entry of type `command` receives the full event payload as **JSON on stdin**. Your script reads it with `INPUT=$(cat)` and extracts fields with `jq`. The exact schema is event-specific, but all payloads share the common fields `sessionId`, `timestamp` and `cwd`.

For `postToolUse` - the event you'll use most for validation in this module - the payload is:

```typescript
{
  sessionId: string;
  timestamp: number;
  cwd: string;
  toolName: string;
  toolArgs: unknown;        // the exact args the tool was called with (e.g., { path: "...", new_str: "..." } for edit)
  toolResult: {
    resultType: "success";
    textResultForLlm: string;
  };
}
```

Your script communicates back to the harness by writing a single JSON object to **stdout**. For `postToolUse`, the schema is:

```typescript
{
  modifiedResult?: {
    resultType: "success";
    textResultForLlm: string;   // replaces the tool result the LLM sees
  };
  additionalContext?: string;   // appended to what the LLM sees
}
```

For `agentStop`, the output schema is different:

```typescript
{
  decision: "allow" | "block";
  reason?: string;   // required when decision is "block" — becomes the prompt for the forced next turn
}
```

A `"block"` decision tells the harness to open another agent turn automatically, with `reason` as the injected prompt. This is how you will implement *"if tests are red, the agent must address them before it can stop."*

### Exit codes and fail-open vs. fail-closed

Exit codes are how a command hook communicates its own health back to the harness, separate from the JSON it writes to stdout. Every command hook produces an exit code, and the harness uses it to decide whether to treat the hook as successful, warn or fail, before it ever looks at the hook's output.

| Exit code | Meaning |
|---|---|
| `0` | Success - stdout parsed as hook output if present |
| `2` | Warning - `stderr` surfaced, run continues |
| Other non-zero | Hook failure logged, run continues (fail-open) |

Most hook failures are **fail-open** - a crash, timeout or non-zero exit is logged and the agent continues. `preToolUse` is the deliberate exception. Because it sits in front of every tool call as a security gate, a command hook that crashes, times out or exits non-zero (other than exit 2) **denies the tool call.** Here, the harness refuses to let a broken guard silently become no guard at all. 

> [!NOTE]
> HTTP `preToolUse` hooks behave differently. If the request fails, either due to network error, timeout or non-2xx, the harness treats the hook as if it never ran and the normal permission flow decides instead. 
>
> A broken local script is a bug you control and can fix, but a network outage is not, and it shouldn't silently block every tool call the agent tries to make.

### Scoping hooks with `matcher`

Every hook entry can include a `matcher` field - a regular expression matched against the tool name. Without a matcher, the hook fires for every tool call in that event, but with one, it fires only when the tool name matches.

For a `postToolUse` hook that should only fire when the agent edits or creates a file:

```json
{
  "type": "command",
  "matcher": "edit|create",
  "bash": ".github/hooks/scripts/test-router.sh",
  "timeoutSec": 60
}
```

### Hook configuration files

Hooks are declared in JSON files and require no explicit registration step. All you need to do is drop a correctly structured file in the right directory and restart Copilot CLI - it loads on startup.

The harness loads hooks from four sources, in order. Hooks from all sources for the same event are **merged** (not overwritten):

1. **Policy hooks:** Machine-wide hooks installed by enterprise IT administrators. They load before everything else, cannot be disabled by `disableAllHooks` and end users cannot modify or override them.
2. **User hooks:** `~/.copilot/hooks/*.json` (or `%USERPROFILE%\.copilot\hooks\` on Windows). Personal hooks stored on your local machine, not version-controlled and not shared with teammates. This is ideal for desktop notifications, personal audit logging or any preference you don't want to impose on the team.
3. **Repository hooks:** `.github/hooks/*.json`. Checked into source control so every team member gets them automatically on clone. This is also the **only** source the cloud agent loads since user files and plugins do not exist in the cloud sandbox.
4. **Plugin hooks:** Declared inside each installed Copilot CLI plugin's own directory and loaded automatically alongside other sources when a plugin is installed.

Every hook file must declare `"version": 1` at the top level:

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [],
    "agentStop": []
  }
}
```

> [!NOTE]
> When running Copilot CLI in non-interactive prompt mode, repository hooks are **disabled by default**. Enable them with `GITHUB_COPILOT_PROMPT_MODE_REPO_HOOKS=true` if you need hooks to fire in CI or scripted runs.

## Exercise 1: Wire up `after-edit` hooks for AssetTrack

AssetTrack's checks span four different stacks - .NET, Java, Python, TypeScript, so "run the tests" means a different command depending on which file the agent just touched and that's an easy step to forget mid-session. That's exactly the kind of deterministic, no-judgment-required work you read about above, so instead of relying on the model to remember, you'll build:

- a `postToolUse` hook that:
  - inspects which file was just edited, 
  - routes to the right test runner for that stack, 
  - feeds the output back as `additionalContext` so the next agent turn begins with the actual test result. 
  
- A second hook - `agentStop`, that blocks the agent from finishing a turn if any stack's checks are red.

1. Return to your codespace and open a terminal.

2. Create the directory for the hook scripts:

    ```bash
    mkdir -p .github/hooks/scripts
    ```

3. Download `.github/hooks/scripts/test-router.sh`, which reads the edited file path from the `postToolUse` payload, runs the right test runner for that stack and emits the result as `additionalContext`. The same script also handles `agentStop` by looking at changed files and blocking only when the relevant stack's tests fail:

    ```bash
    curl -o .github/hooks/scripts/test-router.sh \
      https://raw.githubusercontent.com/github-samples/advanced-copilot-cli/main/assets/04/.github/hooks/scripts/test-router.sh
    ```

4. Make the script executable:

    ```bash
    chmod +x .github/hooks/scripts/test-router.sh
    ```

5. Create the hook configuration file `.github/hooks/hooks.json` and paste in the following content. This declares the `postToolUse` and `agentStop` hooks, both of which call the same script you just downloaded:

    ```json
    {
      "version": 1,
      "hooks": {
        "postToolUse": [
          {
            "type": "command",
            "matcher": "edit|create",
            "bash": ".github/hooks/scripts/test-router.sh",
            "timeoutSec": 60
          }
        ],
        "agentStop": [
          {
            "type": "command",
            "bash": ".github/hooks/scripts/test-router.sh",
            "timeoutSec": 90
          }
        ]
      }
    }
    ```

## Exercise 2: Verify the hooks load

1. Restart Copilot CLI to pick up the new configuration, then load the environment customizations with: 

    ```text
    /env
    ```

    You should see your `postToolUse` and `agentStop` entries listed under Hooks.

2. Test the hook script in isolation before relying on it in a session. From the repository root, pipe a synthetic payload and confirm the output is valid JSON:

    ```bash
    echo "{\"toolName\":\"edit\",\"toolArgs\":{\"path\":\"$PWD/services/reporting-svc/app/main.py\",\"old_str\":\"\",\"new_str\":\"\"},\"toolResult\":{\"resultType\":\"success\",\"textResultForLlm\":\"edited\"}}" \
      | .github/hooks/scripts/test-router.sh | jq .
    ```

    pytest runs and the script emits one JSON object:

    ```text
    {
      "additionalContext": "Hook check for services/reporting-svc/app/main.py passed.\nStack: Python\nCommand: cd services/reporting-svc && pytest\nExit code: 0\n..."
    }
    ```

    The `additionalContext` value is what matters: it contains the command exit code, and last 40 lines of test output. That output is exactly what the harness appends to the tool result before the model reads it on its next turn.

3. Test the `agentStop` path before making any stack changes. The hook files themselves do not map to a test stack, so it should allow the turn to finish:

    ```bash
    echo '{}' | .github/hooks/scripts/test-router.sh | jq .
    ```

    Expected output:

    ```json
    {
      "decision": "allow"
    }
    ```

4. The hook infrastructure is ready. Commit the hook config and script on this branch. 

    *Create a new branch called add-lifecycle-hooks, commit the `.github/hooks/` directory with a message explaining what the hooks do and why, then push and open a PR.*

> [!NOTE]
> The PR at this point contains only the hook infrastructure. The code changes in the next exercise are temporary. You will revert them before merging.

## Exercise 3: Close the feedback loop on a real change

With hooks wired up, prove the loop end-to-end: a change goes in, the `postToolUse` hook fires and reports results, and if the `agentStop` gate catches a failure, the agent addresses it before finishing the turn.

1. Start a new Copilot CLI session (or run `/new` to reset context). Confirm the hooks are active with `/env`.

2. Ask Copilot to add a small testable method. Pick the stack that matches your background. 

    *For Java:*

    ```text
    In AssignmentService, add a private helper method isOverdue(LocalDate dueDate) that returns true if dueDate is before today. Add a unit test for it in AssignmentServiceTest — no public API changes.
    ```

    *For C# (.NET):*

    ```text
    In the assets service, add a private helper method IsWarrantyExpiring(DateTime expiryDate) that returns true if expiryDate is within 30 days from today. Add a unit test for it — no public API changes.
    ```

    *Or for Python:*

    ```text
    In the reporting service, add a helper function days_until_expiry(expiry_date: date) -> int that returns the number of days until a warranty expires. Add a pytest test for it.
    ```

    Watch the agent's tool calls. After the `edit` or `create` call that writes the test file, the agent's next turn should include the hook output in its visible context.

3. Confirm the test output surfaced - ask the agent directly:

    ```text
    What did the test run report?
    ```

    The agent should be able to quote or summarize the test output from the `additionalContext` the hook injected.

4. Now deliberately break the assertion to trigger the `agentStop` gate. Ask Copilot to introduce a broken test, (purely for demonstration purposes):

    ```text
    Change the assertion in the test you just added so it asserts the wrong expected value — make it definitely fail.
    ```

5. Watch what happens when the agent tries to finish its turn. The `agentStop` path in `test-router.sh` runs, detects the test failure and returns `"decision": "block"` with the failing command output in the reason. 

    The harness opens a new agent turn automatically with that reason as the prompt. The agent should propose a fix without you typing anything. *If the agent reports green tests but the gate still blocks, ask it to quote the block reason - the command, exit code and output in that reason can be treated as the source of truth.*

6. Confirm the loop closes - the agent fixes the assertion, the tests pass on the next `postToolUse` hook fire and the `agentStop` path returns `"decision": "allow"`.

7. Revert the example changes so the branch stays clean for the PR, then confirm tests are green:

    ```text
    Revert the method and test you added, then confirm all tests pass.
    ```

## Summary

You've now:

- Explored hooks as the deterministic enforcement layer underneath the probabilistic model layer - they run unconditionally, feed structured output back via stdin/stdout JSON contracts and can block or modify agent actions.
- Authored a `postToolUse` hook scoped to file edits that dispatches to the right test runner per stack and injects results as `additionalContext`.
- Wired an `agentStop` gate that blocks the agent from finishing a turn while tests are red and forces a self-correction loop.

Next, you'll put all of the infrastructure to work by adding a real **new feature** (barcode / QR support) from `/plan` through to merged PR in [Module 5][next-lesson].

## Resources

- [Using hooks in Copilot CLI][use-hooks]
- [Hooks reference][hooks-reference]
- [Community hook patterns on Awesome GitHub Copilot][awesome-copilot-hooks]

---

| [← Previous: Enhancing the test suite with remote and delegation][previous-lesson] | [Next: Adding a new feature →][next-lesson] |
|:--|--:|

[previous-lesson]: ../03-test-suite-remote-delegation/
[next-lesson]: ../05-add-feature-barcode/
[m02]: ../02-building-ai-infrastructure/
[test-router-script]: https://github.com/github-samples/advanced-copilot-cli/blob/main/assets/04/.github/hooks/scripts/test-router.sh
[use-hooks]: https://docs.github.com/copilot/how-tos/copilot-cli/customize-copilot/use-hooks
[hooks-reference]: https://docs.github.com/copilot/reference/hooks-reference
[awesome-copilot-hooks]: https://awesome-copilot.github.com/learning-hub/automating-with-hooks/
