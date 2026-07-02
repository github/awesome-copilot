# rate-limiting-resilience-ts

## purpose

Bridges Slack and Teams rate limiting patterns, retry logic, and resilience strategies for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack 429 + `Retry-After` header → same pattern for Bot Framework and Graph API.** Both platforms return HTTP 429 with a `Retry-After` header (seconds) when throttled. The retry pattern is identical: wait the specified duration, then retry. The difference is in the rate limits themselves. [learn.microsoft.com -- Graph throttling](https://learn.microsoft.com/en-us/graph/throttling)
2. **Slack Bolt retry config → manual retry with exponential backoff + jitter.** Slack Bolt has built-in retry (`retryConfig: { retries: 3 }`). The Teams SDK does not have built-in retry. Implement exponential backoff with jitter: `delay = min(baseDelay * 2^attempt + random(0, jitter), maxDelay)`. [learn.microsoft.com -- Retry guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/retry-service-specific)
3. **Teams Bot Framework rate limits: ~1 msg/sec per conversation, ~30 msg/min per conversation.** These are soft limits that vary by channel type (1:1 vs group vs channel). Exceeding them results in 429 responses. Slack's rate limits are per-method (e.g., `chat.postMessage` at ~1/sec per token). Teams limits are per-conversation, not per-method. [learn.microsoft.com -- Bot rate limiting](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/rate-limit)
4. **Graph API has separate throttling from Bot Framework.** Graph API rate limits are per-app and per-tenant, varying by API. Common limits: 10,000 requests/10 minutes per app, with lower limits for specific APIs (e.g., channel messages). Graph 429s include `Retry-After` headers. These are independent of Bot Framework message rate limits. [learn.microsoft.com -- Graph throttling](https://learn.microsoft.com/en-us/graph/throttling)
5. **Proactive broadcast to many conversations needs a send queue.** Sending the same message to 500 users at once will hit rate limits. Implement a queue with concurrency control: process N messages concurrently, respect per-conversation limits, and handle 429s with retry. Use `p-limit`, `p-queue`, or a custom queue. [npmjs.com/p-queue](https://www.npmjs.com/package/p-queue)
6. **Circuit breaker pattern (`opossum`) protects against cascading failures.** When an external service (your database, a third-party API) is down, the bot should fail fast instead of timing out on every request. Use `opossum` to wrap external calls: after N failures, the circuit opens and rejects immediately for a cooldown period. [npmjs.com/opossum](https://www.npmjs.com/package/opossum)
7. **Slack `slack_api_error` with `response.headers['retry-after']` → same extraction pattern for Teams.** The error handling pattern is similar: catch HTTP errors, check for 429 status, extract `Retry-After`, and schedule retry. The API client libraries differ but the logic is identical. [learn.microsoft.com -- Graph error handling](https://learn.microsoft.com/en-us/graph/errors)
8. **Bot Framework Connector API has a separate 30-second timeout.** Beyond rate limits, the Bot Framework Connector API has a response timeout. If the bot doesn't respond to an invoke within ~3-10 seconds (depending on activity type), the Connector may retry or time out. This is separate from rate limiting but can compound issues under load. [learn.microsoft.com -- Bot Framework](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-overview)
9. **Graph API batch requests reduce API call volume.** Instead of N individual Graph API calls, batch up to 20 requests in a single `POST /$batch` call. This counts as fewer requests against rate limits and reduces network overhead. Useful for bulk channel operations, user lookups, or file operations. [learn.microsoft.com -- JSON batching](https://learn.microsoft.com/en-us/graph/json-batching)
10. **Log and monitor throttling events.** Unlike Slack where Bolt logs retries automatically, Teams throttling must be explicitly logged. Track: 429 count, average retry delay, circuit breaker state, queue depth. Use Application Insights custom metrics or console logging. Throttling spikes indicate you're approaching platform limits. [learn.microsoft.com -- App Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, Slack Bolt provides built-in `retryConfig`. Map custom Teams retry plugins to Bolt's retry configuration. Slack rate limits are per-method-per-token (not per-conversation like Teams). The `p-queue` and circuit breaker patterns apply equally in both directions. For Graph API batch requests, there is no Slack equivalent — individual API calls are needed but Bolt's built-in retry handles 429s automatically.

## patterns

### Exponential backoff wrapper

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  // Built-in retry handling
  retryConfig: {
    retries: 3,
    factor: 2, // exponential backoff
  },
});

// Bolt automatically retries on 429
app.message(/hello/i, async ({ say }) => {
  await say("Hello!"); // auto-retried on rate limit
});
```

**Teams (after) — manual retry wrapper:**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const logger = new ConsoleLogger("my-bot", { level: "info" });

const app = new App({
  logger,
});

// Exponential backoff with jitter — replaces Bolt's retryConfig
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterMs?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    jitterMs = 500,
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.statusCode ?? err?.response?.status ?? err?.code;
      const isRetryable = status === 429 || status === 503 || status === 502;

      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }

      // Use Retry-After header if available, otherwise exponential backoff
      const retryAfterSec = err?.response?.headers?.["retry-after"];
      let delay: number;

      if (retryAfterSec) {
        delay = parseInt(retryAfterSec, 10) * 1000;
      } else {
        delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      }

      // Add jitter to prevent thundering herd
      delay += Math.random() * jitterMs;

      logger.warn(
        `Rate limited (attempt ${attempt + 1}/${maxRetries}). ` +
        `Retrying in ${Math.round(delay)}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("withRetry: unreachable");
}

// Usage: wrap any API call that might be rate limited
app.message(/hello/i, async ({ send }) => {
  await withRetry(() => send("Hello!"));
});

app.start(3978);
```

### Rate-limited proactive broadcast

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Broadcast to all channels — Bolt retries handle 429s
app.command("/broadcast", async ({ ack, command, client }) => {
  await ack();
  const channels = await client.conversations.list({ types: "public_channel" });

  for (const channel of channels.channels ?? []) {
    try {
      await client.chat.postMessage({
        channel: channel.id!,
        text: command.text,
      });
    } catch (err: any) {
      if (err.data?.error === "ratelimited") {
        const retryAfter = parseInt(err.data.response_metadata?.retry_after ?? "1", 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        await client.chat.postMessage({ channel: channel.id!, text: command.text });
      }
    }
  }
});
```

**Teams (after) — queued broadcast with concurrency control:**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import PQueue from "p-queue";

const logger = new ConsoleLogger("my-bot", { level: "info" });
const app = new App({ logger });

// Store conversation references at install time
const conversationRefs = new Map<string, {
  conversationId: string;
  serviceUrl: string;
}>();

app.on("install.add", async ({ activity }) => {
  const convId = activity.conversation?.id ?? "";
  conversationRefs.set(convId, {
    conversationId: convId,
    serviceUrl: (activity as any).serviceUrl,
  });
});

// Rate-limited broadcast queue
// Concurrency: 5 simultaneous sends, 200ms between each
const sendQueue = new PQueue({
  concurrency: 5,
  interval: 200,
  intervalCap: 1, // 1 task per interval per concurrency slot
});

app.message(/^\/?broadcast (.+)$/i, async ({ send, activity }) => {
  const text = activity.text?.replace(/^\/?broadcast\s+/i, "") ?? "";
  const targets = Array.from(conversationRefs.values());

  await send(`Broadcasting to ${targets.length} conversations...`);

  let sent = 0;
  let failed = 0;

  const promises = targets.map((ref) =>
    sendQueue.add(async () => {
      try {
        await withRetry(() => app.send(ref.conversationId, text));
        sent++;
      } catch (err) {
        failed++;
        logger.error(`Failed to send to ${ref.conversationId}:`, err);
      }
    })
  );

  await Promise.all(promises);
  await send(`Broadcast complete: ${sent} sent, ${failed} failed.`);
});

// withRetry from previous pattern
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.statusCode ?? err?.response?.status;
      if (status !== 429 || attempt === 2) throw err;
      const retryAfter = parseInt(err?.response?.headers?.["retry-after"] ?? "2", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000 + Math.random() * 500));
    }
  }
  throw new Error("unreachable");
}

app.start(3978);
```

### Circuit breaker for downstream services

```typescript
import CircuitBreaker from "opossum";

// Wrap an external API call with a circuit breaker
const fetchUserData = new CircuitBreaker(
  async (userId: string) => {
    const response = await fetch(`https://api.internal.com/users/${userId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    timeout: 5000,       // If the function takes longer than 5s, trigger a failure
    errorThresholdPercentage: 50, // Open circuit when 50% of requests fail
    resetTimeout: 30_000, // After 30s, try again (half-open)
    volumeThreshold: 5,  // Minimum 5 requests before evaluating threshold
  }
);

// Circuit events for monitoring
fetchUserData.on("open", () => logger.warn("Circuit OPEN — failing fast"));
fetchUserData.on("halfOpen", () => logger.info("Circuit HALF-OPEN — testing"));
fetchUserData.on("close", () => logger.info("Circuit CLOSED — normal operation"));

// Usage in a handler
app.message(/^\/?user (.+)$/i, async ({ send, activity }) => {
  const userId = activity.text?.match(/user\s+(\S+)/)?.[1] ?? "";
  try {
    const user = await fetchUserData.fire(userId);
    await send(`User: ${user.name} (${user.email})`);
  } catch (err: any) {
    if (err.message === "Breaker is open") {
      await send("The user service is temporarily unavailable. Please try again later.");
    } else {
      await send(`Error fetching user: ${err.message}`);
    }
  }
});
```

### Best practice: retry utility + p-queue broadcast (Y17)

**Always build a retry utility with exponential backoff and jitter.** Apply it to all outbound API calls. For proactive broadcasts, combine with `p-queue` concurrency control.

```typescript
// Production retry utility — apply to all outbound calls
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      const retryAfter = err?.response?.headers?.["retry-after"];
      const baseDelay = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * 2 ** attempt;
      const jitter = Math.random() * 1000;
      await new Promise(r => setTimeout(r, baseDelay + jitter));
    }
  }
  throw new Error("Unreachable");
}

// Proactive broadcast with concurrency control
import PQueue from "p-queue";

const broadcastQueue = new PQueue({ concurrency: 5, interval: 200, intervalCap: 1 });

async function broadcastToAll(
  conversationIds: string[],
  message: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;

  const promises = conversationIds.map(convId =>
    broadcastQueue.add(async () => {
      try {
        await withRetry(() => app.send(convId, message));
        sent++;
      } catch {
        failed++;
      }
    })
  );

  await Promise.all(promises);
  return { sent, failed };
}
```

**Key rules:**
- **Always add jitter.** Without it, multiple bot instances retry simultaneously (thundering herd).
- **Set a max queue depth.** Unbounded queues accumulate thousands of items in memory.
- **Treat 503 the same as 429.** Both are retryable with backoff.

**Don't:** Retry without jitter, or use Bolt's `retryConfig` and assume it covers Graph API calls (it only covers Slack API calls).

**Reverse (Teams → Slack):** Configure Bolt's built-in `retryConfig: { retries: 3, factor: 2 }` for Slack API calls. The `p-queue` pattern applies equally for Slack broadcasts.

### Rate limit comparison table

| Aspect | Slack | Teams Bot Framework | Teams Graph API |
|---|---|---|---|
| Rate limit scope | Per-method per-token | Per-conversation | Per-app per-tenant |
| Message send limit | ~1/sec per token | ~1/sec per conversation | N/A (use Bot Framework) |
| Throttle response | HTTP 429 + `Retry-After` | HTTP 429 + `Retry-After` | HTTP 429 + `Retry-After` |
| Built-in retry (SDK) | Bolt `retryConfig` | None (manual) | None (manual) |
| Batch API | N/A | N/A | `POST /$batch` (up to 20) |
| Burst limit | ~30/min per token | ~30/min per conversation | Varies by API |

## pitfalls

- **No built-in retry in Teams SDK**: Slack Bolt's `retryConfig` automatically retries rate-limited requests. The Teams SDK has no equivalent. You must implement retry logic yourself or use a library wrapper.
- **Per-conversation vs per-token limits**: Slack rate limits are per-method-per-token (global). Teams Bot Framework limits are per-conversation. Sending to 100 different conversations simultaneously is fine; sending 100 messages to the same conversation will be throttled.
- **Graph API and Bot Framework throttling are independent**: A bot can be rate-limited on Graph API calls (user lookups, channel operations) while Bot Framework message sends are fine, or vice versa. Implement retry logic for both independently.
- **Thundering herd on retry**: Without jitter, all rate-limited requests retry at exactly the same time, causing another burst. Always add random jitter to retry delays.
- **Queue depth unbounded**: Using `p-queue` without a size limit can accumulate thousands of pending messages in memory. Set a maximum queue size and reject new items when full (with a user-facing error).
- **Circuit breaker not covering all dependencies**: The circuit breaker should wrap every external dependency (database, third-party API, Graph API) — not just one. A bot with an unprotected dependency can still cascade-fail.
- **Forgetting to handle 503 Service Unavailable**: In addition to 429, Bot Framework may return 503 during outages. Treat 503 the same as 429 (retryable with backoff).

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/rate-limit
- https://learn.microsoft.com/en-us/graph/throttling
- https://learn.microsoft.com/en-us/graph/json-batching
- https://learn.microsoft.com/en-us/azure/architecture/best-practices/retry-service-specific
- https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs
- https://www.npmjs.com/package/p-queue
- https://www.npmjs.com/package/opossum
- https://github.com/microsoft/teams.ts
- https://api.slack.com/docs/rate-limits — Slack rate limits

## instructions

Use this expert when adding cross-platform support in either direction for rate limiting and resilience. It covers: Slack Bolt `retryConfig` bridged to Teams manual exponential backoff + jitter, Teams Bot Framework per-conversation rate limits, Graph API per-app throttling, proactive broadcast with send queue concurrency control, circuit breaker pattern with `opossum`, Graph API batch requests, monitoring throttling events, and reverse mapping from custom Teams retry logic back to Bolt's built-in retry configuration. Pair with `../teams/runtime.proactive-messaging-ts.md` for proactive send infrastructure, `../teams/graph.usergraph-appgraph-ts.md` for Graph API patterns, and `scheduling-deferred-send-ts.md` for rate-limited scheduled sends.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack and Teams rate limiting patterns, retry logic, and resilience strategies in either direction. Cover: Bolt retryConfig vs manual exponential backoff + jitter, Teams Bot Framework per-conversation rate limits (1 msg/sec, 30 msg/min), Graph API per-app throttling, proactive broadcast send queues with concurrency control, circuit breaker pattern with opossum, Graph API $batch for reducing call volume, 429/503 retry handling, monitoring, and reverse mapping from Teams retry patterns back to Slack Bolt's built-in retry configuration. Include TypeScript code examples and a comparison table."
