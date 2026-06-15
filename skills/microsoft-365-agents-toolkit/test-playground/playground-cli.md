# Automated Testing with playground-cli

Run programmatic integration tests against your bot using `@microsoft/m365agentsplayground-cli` — a headless, browser-free API that drives bot conversations via code. Use this for CI pipelines, multi-turn conversation testing, and verifying bot behavior without manual interaction.

## Installation

```bash
npm install --save-dev @microsoft/m365agentsplayground-cli
```

## Quick Start (TypeScript)

```typescript
import { TestClient } from "@microsoft/m365agentsplayground-cli";
import { expect } from "chai";

describe("MyBot", () => {
  let client: TestClient;

  before(async () => {
    client = new TestClient({
      botEndpoint: "http://localhost:3978/api/messages",
      timeout: 15000,
      deliveryMode: "expectReplies",
    });
    await client.start();
  });

  after(async () => {
    await client.stop();
  });

  beforeEach(() => {
    client.newConversation(); // isolate each test
  });

  it("should greet the user", async () => {
    const [response] = await client.sendMessage("Hello");
    expect(response.text).to.include("Hello");
  });

  it("should return a card for /help", async () => {
    const responses = await client.sendMessage("/help");
    const cardResponse = responses.find((r) => r.attachments?.length);
    expect(cardResponse).to.exist;
  });
});
```

### BotResponse fields

| Field | Type | Description |
|---|---|---|
| `text` | `string` | Plain text content |
| `attachments` | `Attachment[]` | Adaptive Cards, Hero Cards, etc. |
| `suggestedActions` | `object` | Suggested action buttons |
| `type` | `string` | Activity type (`message`, `typing`, etc.) |

### ConversationServer (HTTP API)

For non-Node test runners (Python, curl, any language):

```typescript
import { createConversationServer } from "@microsoft/m365agentsplayground-cli";

const server = createConversationServer({ port: 9000 });
// server keeps running; call server.close() in teardown
```

```bash
# Verify health
curl http://localhost:9000/health
# → {"status":"ok"}
```

**POST /run-conversation**

```json
{
  "config": {
    "botEndpoint": "http://localhost:3978/api/messages",
    "timeout": 30000,
    "deliveryMode": "expectReplies",
    "personas": {
      "alice": { "id": "user-alice", "name": "Alice", "email": "alice@example.com" }
    }
  },
  "scenario": "smoke-test",
  "input": {
    "turns": [
      { "test_id": "t1", "prompt": "Hello" },
      { "test_id": "t2", "prompt": "What can you do?", "turn_type": "chat" },
      { "test_id": "t3", "prompt": "", "turn_type": "install" },
      { "test_id": "t4", "prompt": "<html>Order shipped</html>", "turn_type": "sendEmail", "persona": "alice" }
    ]
  }
}
```

**Response:**

```json
{
  "turns": [
    { "test_id": "t1", "status": "Completed", "actual_response": "Hello! I'm your assistant..." },
    { "test_id": "t2", "status": "Completed", "actual_response": "I can help you with..." },
    { "test_id": "t3", "status": "Completed", "actual_response": "Welcome! I'm installed..." },
    { "test_id": "t4", "status": "TimedOut",   "actual_response": "" }
  ]
}
```

Turn statuses: `Completed` | `TimedOut` | `Errored` | `Skipped` (skipped = previous turn failed)

## Turn Types

| `turn_type` | Simulates |
|---|---|
| `"chat"` | Normal user message (default) |
| `"sendEmail"` | Email notification received |
| `"mentionInWord"` | @mention in Word document |
| `"install"` | Bot installation event |
| `"userAdded"` | Member added to conversation |
| `"botAdded"` | Bot added to team |
| `"channelCreated"` | New channel created |
| `"teamRenamed"` | Team renamed |

## Key Configuration Notes

| Setting | When to use |
|---|---|
| `deliveryMode: "expectReplies"` | Required for `@microsoft/teams-ai` and `teams.ts` bots |
| `timeout: 30000` | Increase for bots calling external APIs or LLMs |
| `streamingSettleDelayMs: 2000` | Increase only if LLM pauses > 800ms between stream chunks |
| `personas` | Required for testing notification bots with specific `from` identity |

## Common Pitfalls

- **No `await client.start()`** → `sendMessage()` throws immediately
- **`deliveryMode` missing for teams-ai bots** → `sendMessage()` returns `[]`
- **No `client.newConversation()` between tests** → bot state bleeds between test cases
- **ConversationServer not started before HTTP tests** → connection refused; verify `/health` first
- **Parallel tests sharing one `TestClient`** → mixed-up responses; use separate instances

## References

- Manual interactive testing → [playground.md](playground.md)
- npm package → [`@microsoft/m365agentsplayground-cli`](https://www.npmjs.com/package/@microsoft/m365agentsplayground-cli)
