---
name: upstash-redis
description: >
  Use Redis over HTTP from serverless and edge runtimes with @upstash/redis, and
  add rate limiting with @upstash/ratelimit. Use when the user mentions Upstash
  Redis, needs Redis from a Next.js route handler or middleware, Vercel,
  Cloudflare Workers, Deno, or Bun without TCP connection pooling, or wants
  cache-aside with TTLs, a session store, counters, or a 429 rate limiter using
  fixed window, sliding window, or token bucket. DO NOT use for self-hosted or
  TCP Redis clients (ioredis, node-redis), Redis Cluster administration, or
  vector similarity search.
license: MIT
compatibility: "@upstash/redis 1.x, @upstash/ratelimit 2.x, Node.js 18+ or any runtime with global fetch"
metadata:
  author: Upstash
---

# Upstash Redis Skill

This skill covers the three things serverless apps most often need Redis for:
caching, sessions, and rate limiting. The client talks to Redis over HTTP, so
it works where a long-lived TCP connection does not (edge middleware, short
lived functions). Follow the steps in order; each ends with a checkpoint.

## Requirements and limitations

- An Upstash Redis database (hosted service; usage-based pricing with a free
  tier). Credentials are a REST URL and token from the database page.
- Environment variables `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Every command is an HTTP request. Batch with `pipeline()` or `MGET`/`MSET`
  when you issue many commands per request; avoid `KEYS *` in production.
- Values are serialized automatically (objects, arrays, numbers round-trip).
  Do not `JSON.stringify` before `set` or `parseInt` after `get`.

## Step 1 — Install and create one client per module

```bash
npm install @upstash/redis @upstash/ratelimit
```

```ts
// lib/redis.ts
import { Redis } from "@upstash/redis";

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
export const redis = Redis.fromEnv();
```

Create the client at module scope, not inside the request handler, so
ephemeral caches and pipelines can be reused across invocations.

> **Checkpoint**: `await redis.ping()` returns `"PONG"`.

## Step 2 — Cache-aside with TTL

```ts
import { redis } from "@/lib/redis";

type User = { id: string; name: string; plan: "free" | "pro" };

export async function getUser(userId: string): Promise<User | null> {
  const key = `user:${userId}`;
  const cached = await redis.get<User>(key);
  if (cached) return cached;

  const user = await db.users.findById(userId); // your data source
  if (user) await redis.set(key, user, { ex: 3600 }); // 1 hour TTL
  return user;
}

export async function updateUser(userId: string, patch: Partial<User>) {
  const user = await db.users.update(userId, patch);
  await redis.set(`user:${userId}`, user, { ex: 3600 }); // write-through
  return user;
}

export async function deleteUser(userId: string) {
  await db.users.delete(userId);
  await redis.del(`user:${userId}`); // invalidate
}
```

Always set a TTL on cache entries; namespace keys (`user:123`, `session:abc`).

> **Checkpoint**: second call to `getUser` returns without hitting the database
> and `await redis.ttl("user:123")` is positive.

## Step 3 — Sessions with sliding expiration

```ts
import { redis } from "@/lib/redis";

const SESSION_TTL = 60 * 60 * 24; // 24 hours

export async function createSession(userId: string, data: Record<string, unknown>) {
  const sessionId = crypto.randomUUID();
  await redis.set(`session:${sessionId}`, { userId, ...data, createdAt: Date.now() }, { ex: SESSION_TTL });
  return sessionId;
}

export async function getSession<T = Record<string, unknown>>(sessionId: string) {
  const session = await redis.get<T>(`session:${sessionId}`);
  if (session) await redis.expire(`session:${sessionId}`, SESSION_TTL); // slide
  return session;
}

export async function destroySession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}
```

Store the session id in an `HttpOnly; Secure; SameSite` cookie; never put the
Redis token in client code.

> **Checkpoint**: `getSession` after `createSession` returns the object with
> `userId`; after `destroySession` it returns `null`.

## Step 4 — Rate limiting a route handler

```ts
// app/api/search/route.ts (Next.js App Router; same pattern for any fetch handler)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
  prefix: "ratelimit:search", // isolate keys per limiter
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
      },
    });
  }

  // handle the request
  return Response.json({ ok: true });
}
```

- Identifier: use the user id or API key when authenticated; fall back to IP.
- Algorithms: `Ratelimit.fixedWindow(n, "1 m")` (cheapest), `slidingWindow`
  (smooth boundaries, default choice), `tokenBucket(refill, "10 s", max)`
  (allows bursts). Windows accept `ms`, `s`, `m`, `h`, `d`.
- Tiers: create one `Ratelimit` per tier with different `prefix` values.
- Edge middleware / Cloudflare Workers with `analytics: true`: the result has a
  `pending` promise; pass it to `context.waitUntil(pending)` so background work
  finishes before the runtime exits.
- `reset` is a Unix timestamp in milliseconds.

> **Checkpoint**: the 11th request within 10 seconds returns 429 with a
> `Retry-After` header; after the window it succeeds again.

## Common pitfalls

- **Creating clients inside handlers**: the limiter's in-memory
  `ephemeralCache` only helps when the instance outlives the request.
- **Manual JSON**: `redis.set("k", JSON.stringify(v))` then `redis.get` returns
  an already-parsed object; double parsing throws.
- **No TTL on cache keys**: memory grows until eviction; always pass `{ ex }`.
- **Trusting `x-forwarded-for` blindly**: take the first hop, or use the
  platform's IP helper, when behind a proxy.
- **Forgetting `pending`** on edge runtimes with analytics or multi-region
  limiters.

## When NOT to use this skill

- Long-running servers with a TCP Redis connection already in place: keep
  ioredis/node-redis.
- Vector search or RAG: use a vector database skill instead.
- Sub-millisecond, in-process caching: use an in-memory LRU.

## References

- https://upstash.com/docs/redis/sdks/ts/overview
- https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- https://github.com/upstash/redis-js
- https://github.com/upstash/ratelimit-js
