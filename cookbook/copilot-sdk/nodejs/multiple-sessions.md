# Working with Multiple Sessions

Manage multiple independent conversations simultaneously.

> **Runnable example:** [recipe/multiple-sessions.ts](recipe/multiple-sessions.ts)
>
> ```bash
> cd recipe && npm install
> npx tsx multiple-sessions.ts
> # or: npm run multiple-sessions
> ```

## Example scenario

You need to run multiple conversations in parallel, each with its own context and history.

## Node.js

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
await client.start();

// Create multiple independent sessions
const session1 = await client.createSession({ model: "gpt-5" });
const session2 = await client.createSession({ model: "gpt-5" });
const session3 = await client.createSession({ model: "claude-sonnet-4.5" });

// Each session maintains its own conversation history
await session1.sendAndWait({ prompt: "You are helping with a Python project" });
await session2.sendAndWait({ prompt: "You are helping with a TypeScript project" });
await session3.sendAndWait({ prompt: "You are helping with a Go project" });

// Follow-up messages stay in their respective contexts
await session1.sendAndWait({ prompt: "How do I create a virtual environment?" });
await session2.sendAndWait({ prompt: "How do I set up tsconfig?" });
await session3.sendAndWait({ prompt: "How do I initialize a module?" });

// Clean up all sessions
await session1.destroy();
await session2.destroy();
await session3.destroy();
await client.stop();
```

## Custom session IDs

Use custom IDs for easier tracking:

```typescript
const session = await client.createSession({
    sessionId: "user-123-chat",
    model: "gpt-5",
});

console.log(session.sessionId); // "user-123-chat"
```

## Listing sessions

```typescript
const sessions = await client.listSessions();
console.log(sessions);
// [{ sessionId: "user-123-chat", ... }, ...]
```

## Deleting sessions

```typescript
// Delete a specific session
await client.deleteSession("user-123-chat");
```

## Use cases

- **Multi-user applications**: One session per user
- **Multi-task workflows**: Separate sessions for different tasks
- **A/B testing**: Compare responses from different models
