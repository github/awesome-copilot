# middleware-handlers-ts

## purpose

Bridges Slack Bolt middleware chains and Teams SDK handler patterns for cross-platform bots targeting Slack, Teams, or both.

## rules

1. Slack Bolt uses an explicit middleware chain: `app.use((args) => { ... await next(); })` for global middleware, and per-listener middleware as extra arguments to `app.message()`, `app.action()`, etc. Teams SDK v2 uses `app.on()` route handlers that execute in registration order with no explicit `next()` call. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Slack's `next()` function must be called to pass control to the next middleware. In Teams, all matching handlers for a route execute — there is no `next()` to call. To short-circuit (prevent later handlers), return early or use a guard pattern.
3. Slack global middleware (`app.use()`) runs on EVERY request before any listener. In Teams, register a `app.on('message', ...)` handler FIRST (before other message handlers) to achieve the same effect. Handler registration order determines execution order.
4. Slack listener middleware (per-handler) like `app.message(authMiddleware, actualHandler)` has no direct Teams equivalent. Refactor as: (a) a shared guard function called at the top of each handler, (b) a wrapper/decorator function that wraps handlers, or (c) a first-registered catch-all handler that sets context.
5. Slack's `ack()` (acknowledge within 3 seconds) has NO equivalent in Teams. Teams does not require acknowledgement — the Bot Framework handles the HTTP response automatically. Remove all `ack()` calls and restructure code that splits work into "before ack" and "after ack" phases.
6. Slack's `say()` (post to the conversation where the event occurred) maps directly to Teams' `send()`. Both send a message to the current conversation. Slack's `respond()` (respond to the original webhook URL) maps to `send()` for new messages or `ctx.updateActivity()` for updating the original message. The webhook URL pattern does not exist in Teams.
7. Slack's `context` object (custom properties attached via middleware) → Teams uses the activity object and handler arguments directly. For shared state across handlers, use `app.state` or closure-scoped variables.
8. Slack error middleware (`app.error(async (error) => { ... })`) → Teams error handling via try/catch in individual handlers or a global `app.on('error', ...)` handler. The error shape differs significantly: Slack provides a destructured object `{ error, context, body }` where `context` contains bot/team metadata and `body` contains the full event payload, while Teams provides the raw `Error` object plus the activity context via handler arguments. For Teams → Slack: wrap the raw Error with context/body metadata to match Slack's shape.
9. The Java Slack SDK's formal middleware chain (`Middleware` interface with `apply(req, resp, chain)` → `chain.next(req, resp)`) is structurally identical to Express middleware. When converting Java middleware, first understand the intent, then rewrite as a Teams guard function or wrapper.
10. Slack's authorization middleware (built-in, validates tokens per workspace in multi-tenant apps) is replaced by Bot Framework JWT validation (automatic) and Azure AD authentication. Remove custom authorization middleware entirely.

## patterns

### Slack global middleware → Teams first-registered handler

**Slack (before):**

```typescript
import { App, NextFn } from '@slack/bolt';

const app = new App({ token: '...', signingSecret: '...' });

// Global middleware: runs on every request
app.use(async ({ next, logger, body }) => {
  logger.info(`Request type: ${body.type}`);
  const start = Date.now();
  await next();
  logger.info(`Completed in ${Date.now() - start}ms`);
});

// Global auth middleware
app.use(async ({ next, context, client }) => {
  const authResult = await client.auth.test();
  context.botUserId = authResult.user_id;
  await next();
});

app.message(/hello/i, async ({ say }) => {
  await say('Hi there!');
});
```

**Teams (after):**

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import pino from 'pino';

const log = pino({ name: 'my-bot' });

const app = new App({
  logger: new ConsoleLogger('my-bot', { level: 'info' }),
});

// No global middleware API — use first-registered handlers instead.
// Logging is built into the Teams SDK via ConsoleLogger.
// Auth is handled automatically by Bot Framework JWT validation.

// For cross-cutting concerns, use a wrapper function:
function withLogging<T extends (...args: any[]) => Promise<void>>(
  handler: T,
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    try {
      await handler(...args);
    } finally {
      log.info(`Handler completed in ${Date.now() - start}ms`);
    }
  }) as T;
}

app.message(
  /hello/i,
  withLogging(async ({ send }) => {
    await send('Hi there!');
  }),
);
```

### Slack listener middleware (per-handler auth) → Teams guard function

**Slack (before):**

```typescript
// Listener middleware: only this handler requires admin check
async function requireAdmin({ message, client, next }: any) {
  const userInfo = await client.users.info({ user: message.user });
  if (userInfo.user?.is_admin) {
    await next(); // allow handler to proceed
  }
  // Not calling next() short-circuits the chain
}

app.message(/^!admin/, requireAdmin, async ({ message, say }) => {
  await say(`Admin command received from <@${message.user}>`);
});
```

**Teams (after):**

```typescript
// Guard function: replaces listener middleware
async function isAdmin(aadObjectId: string): Promise<boolean> {
  // Check admin status via Graph API or custom logic
  const adminIds = new Set([process.env.ADMIN_AAD_ID]);
  return adminIds.has(aadObjectId);
}

app.message(/^!admin/, async ({ activity, send }) => {
  // Guard at the top of the handler (replaces middleware chain)
  if (!(await isAdmin(activity.from.aadObjectId ?? ''))) {
    await send('You must be an admin to use this command.');
    return; // Early return replaces "not calling next()"
  }

  await send(`Admin command received from ${activity.from.name}`);
});
```

### Java SDK middleware chain → Teams handler wrapper

**Java (before):**

```java
// Formal middleware interface
public class LoggingMiddleware implements Middleware {
    @Override
    public Response apply(Request req, Response resp, MiddlewareChain chain) throws Exception {
        long start = System.currentTimeMillis();
        logger.info("Processing: {}", req.getRequestType());
        Response result = chain.next(req);
        logger.info("Completed in {}ms", System.currentTimeMillis() - start);
        return result;
    }
}

public class RateLimitMiddleware implements Middleware {
    private final RateLimiter limiter;

    @Override
    public Response apply(Request req, Response resp, MiddlewareChain chain) throws Exception {
        if (!limiter.tryAcquire(req.getContext().getTeamId())) {
            return Response.builder().statusCode(429).body("Rate limited").build();
        }
        return chain.next(req);
    }
}

// Registration
app.use(new LoggingMiddleware());
app.use(new RateLimitMiddleware(limiter));
```

**Teams TypeScript (after):**

```typescript
// Middleware becomes wrapper functions (no formal chain)
import pino from 'pino';

const log = pino({ name: 'my-bot' });

// Rate limiter as a guard utility
class RateLimiter {
  private counts = new Map<string, { count: number; resetAt: number }>();

  tryAcquire(key: string, limit = 10, windowMs = 60_000): boolean {
    const now = Date.now();
    const entry = this.counts.get(key);
    if (!entry || now > entry.resetAt) {
      this.counts.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }
}

const limiter = new RateLimiter();

// Handler wrapper that combines logging + rate limiting
type MessageHandler = (ctx: any) => Promise<void>;

function withMiddleware(handler: MessageHandler): MessageHandler {
  return async (ctx) => {
    const start = Date.now();
    const tenantId = ctx.activity.channelData?.tenant?.id ?? 'unknown';

    // Rate limiting (replaces RateLimitMiddleware)
    if (!limiter.tryAcquire(tenantId)) {
      await ctx.send('Rate limited. Please try again later.');
      return;
    }

    // Logging (replaces LoggingMiddleware)
    log.info({ type: ctx.activity.type }, 'Processing');
    try {
      await handler(ctx);
    } finally {
      log.info(`Completed in ${Date.now() - start}ms`);
    }
  };
}

// Apply to handlers
app.message(/^!deploy/, withMiddleware(async ({ send }) => {
  await send('Deploying...');
}));
```

### Removing ack() and restructuring pre/post-ack logic

**Slack (before):**

```typescript
app.command('/deploy', async ({ ack, respond, command }) => {
  // Must ack within 3 seconds
  await ack('Starting deployment...');

  // Slow work happens AFTER ack (Slack already got the 200 OK)
  const result = await runDeployment(command.text);
  await respond(`Deployment ${result.status}: ${result.url}`);
});
```

**Teams (after):**

```typescript
app.message(/^\/deploy\s*(.*)/i, async ({ send, activity }) => {
  // No ack() needed — Teams handles the HTTP response
  // Send an immediate response (replaces ack with message)
  await send('Starting deployment...');

  // Slow work — just do it inline, no pre/post-ack split needed
  const target = activity.text?.match(/^\/deploy\s*(.*)/i)?.[1] ?? '';
  const result = await runDeployment(target);
  await send(`Deployment ${result.status}: ${result.url}`);
});
```

### say() → send() and error handling differences

**Slack (before):**

```typescript
// say() posts to the conversation where the event occurred
app.message(/help/i, async ({ say, message }) => {
  await say(`Hey <@${message.user}>, here's what I can do...`);
});

// Global error handler — receives { error, context, body }
app.error(async ({ error, context, body }) => {
  console.error(`Error in team ${context.teamId}:`, error.message);
  console.error('Event body:', body.type);
  // context has botUserId, teamId, etc. set by middleware
  // body has the full Slack event payload
});
```

**Teams (after):**

```typescript
// send() is the Teams equivalent of say() — posts to the current conversation
app.message(/help/i, async ({ send, activity }) => {
  await send(`Hey ${activity.from.name}, here's what I can do...`);
});

// Global error handler — receives the raw Error + activity context
app.on('error', async ({ error, activity }) => {
  // Teams provides the raw Error object, not { error, context, body }
  console.error(`Error in tenant ${activity?.conversation?.tenantId}:`, (error as Error).message);
  console.error('Activity type:', activity?.type);
  // No context bag — use activity properties directly
  // No body — the activity IS the event payload
});
```

### Reverse direction (Teams → Slack)

For Teams → Slack, convert handler wrappers/guards back to formal middleware chains with `next()`. Add `ack()` calls where required. Key reverse mappings:
- Wrapper/decorator functions → `app.use(async ({ next, ... }) => { ... await next(); })` for global middleware
- Guard functions at top of handler → listener middleware: `app.message(guardMiddleware, actualHandler)`
- Early `return` for short-circuit → omit `await next()` to stop the chain
- `send()` for interim status → `ack('status message')` for immediate acknowledgement within 3 seconds
- `ctx.updateActivity()` → `respond({ replace_original: true, ... })`
- `app.on('error', ...)` → `app.error(async ({ error, context, body }) => { ... })`
- Handler registration order → explicit `app.use()` registration order for middleware chain
- Closure-scoped state / `app.state` → `context` object properties set by middleware (e.g., `context.botUserId`)
- Inline sequential work → split into pre-`ack()` (fast) and post-`ack()` (slow) phases where needed
- Bot Framework JWT validation (automatic, remove) → add `signingSecret` to Bolt config for request verification

## pitfalls

- **Looking for `next()`**: Teams has no middleware chain with `next()`. Every registered handler for a matching route runs. Stop thinking in chains and think in "ordered handler list."
- **Porting `ack()` as an empty response**: `ack()` is a Slack-specific 3-second HTTP response requirement. Teams has no equivalent. Remove it entirely — don't replace it with an empty `send()`.
- **Porting `respond()` URL-based replies**: Slack's `respond()` uses a `response_url` webhook. Teams has no response URL concept. Replace with `send()` for new messages or `ctx.updateActivity()` for updating existing messages.
- **Middleware that sets `context` properties**: Slack middleware often attaches custom data to `context` (e.g., `context.botUserId`). In Teams, use the handler's arguments directly (`activity.recipient.id` for bot ID) or closure-scoped state. There is no mutable `context` bag.
- **Authorization middleware being ported**: Slack's built-in `authorize` function (multi-tenant token lookup) and custom auth middleware should NOT be ported. Bot Framework JWT validation is automatic. Remove all token verification middleware.
- **Pre/post `ack()` split logic**: Slack apps commonly split handlers into "before ack" (fast, returns 200) and "after ack" (slow, async work). In Teams, this split is unnecessary — just do the work sequentially. Send an interim status message if the user needs feedback while waiting.
- **Java `MiddlewareChain.next()` return value**: Java middleware can inspect the Response returned by `chain.next()` and modify it. Teams handlers don't return responses to a chain — they call `send()` directly. Post-processing middleware must become wrapper functions.

## references

- https://slack.dev/bolt-js/concepts/global-middleware -- Slack Bolt global middleware
- https://slack.dev/bolt-js/concepts/listener-middleware -- Slack listener middleware
- https://api.slack.com/interactivity/handling#acknowledgment_response -- Slack ack() requirement
- https://github.com/microsoft/teams.ts -- Teams SDK v2 handler patterns
- https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication -- Bot Framework auth (replaces Slack signing secret)

## instructions

Use this expert when bridging Slack middleware patterns and Teams handler patterns in either direction. The key conceptual shift is: Slack uses a formal middleware chain with `next()` and `ack()`, while Teams uses ordered route handlers with no chain, no acknowledgement requirement, and automatic authentication. For Slack → Teams: replace global middleware with first-registered handlers or wrappers, replace listener middleware with guards, remove `ack()`, remove authorization middleware. For Teams → Slack: convert wrappers/guards back to formal middleware chains with `next()`, add `ack()` calls, add signing secret verification. Pair with `events-activities-ts.md` for the event/route mapping and `../teams/runtime.routing-handlers-ts.md` for Teams handler registration patterns.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack Bolt middleware and Teams SDK v2 handler patterns bidirectionally. Cover: global middleware (app.use with next()) <-> first-registered handlers, listener middleware <-> guard functions, ack() addition/removal strategy, respond() <-> send()/updateActivity(), Java Middleware interface <-> TypeScript wrapper functions, authorization middleware bridging, context property migration, error handling middleware, and pre/post-ack logic restructuring. Include 4 worked examples covering both directions."
