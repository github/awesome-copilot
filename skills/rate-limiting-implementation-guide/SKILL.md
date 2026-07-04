---
name: rate-limiting-implementation-guide
description: 'Implement rate limiting for APIs with the right algorithm, storage backend, and HTTP semantics. Use when the user asks to add rate limiting or throttling to an API, protect endpoints from abuse or brute force, return 429 responses correctly, or choose between token bucket, sliding window, and fixed window strategies.'
license: MIT
---

# Rate Limiting Implementation Guide

Add correct, production-ready rate limiting to an API: pick the algorithm, pick where state lives, and return standard HTTP responses.

## When to Use This Skill

Use this skill when you need to:
- Protect public endpoints from abuse, scraping, or brute-force login attempts
- Enforce per-plan quotas (free vs. paid tiers)
- Return proper `429 Too Many Requests` responses with rate-limit headers
- Choose between in-process and Redis-backed limiters for multi-instance deployments

## Decision Steps

1. **Scope the key**: per IP (anonymous abuse), per API key/user (quotas), per endpoint (login brute force). Combine when needed.
2. **Pick the algorithm**:
   - *Token bucket* - default choice; allows short bursts, smooth average rate
   - *Sliding window counter* - accurate limits without burst allowance
   - *Fixed window* - simplest, acceptable when boundary bursts (2x at window edges) are tolerable
3. **Pick the store**: in-memory only for single instance; Redis (atomic Lua/INCR) for multiple instances; API gateway (NGINX, Kong, cloud-native) when infra-level is preferred.
4. **Implement standard responses**: `429` status, `Retry-After`, and `RateLimit-*` headers (IETF draft) or `X-RateLimit-*`.
5. **Exempt health checks and internal traffic**; log limit hits with the key that triggered them.

## Usage Examples

### Example 1: Express + Redis (multi-instance safe)

```javascript
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();

app.use("/api/", rateLimit({
  windowMs: 60_000,
  limit: 100,                      // 100 req/min per key
  standardHeaders: "draft-7",      // RateLimit-* headers
  keyGenerator: (req) => req.get("x-api-key") ?? req.ip,
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) }),
}));
```

### Example 2: ASP.NET Core built-in limiter

```csharp
builder.Services.AddRateLimiter(o => o.AddTokenBucketLimiter("api", opt => {
    opt.TokenLimit = 100;
    opt.TokensPerPeriod = 100;
    opt.ReplenishmentPeriod = TimeSpan.FromMinutes(1);
    opt.QueueLimit = 0;
}));
app.UseRateLimiter();
app.MapGet("/orders", GetOrders).RequireRateLimiting("api");
```

### Example 3: Stricter limit for login endpoints

```javascript
app.use("/auth/login", rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,                        // 5 attempts / 15 min per IP+username
  keyGenerator: (req) => `${req.ip}:${req.body?.username ?? ""}`,
  message: { error: "Too many login attempts. Try again later." },
}));
```

## Guidelines

1. **Fail open on limiter outages** - if Redis is down, let traffic through and alert; do not take the API down with the limiter.
2. **Always send Retry-After on 429** - well-behaved clients and SDKs rely on it for backoff.
3. **Rate limit before expensive work** - the middleware must run before auth-heavy DB lookups when keying by IP.
4. **Layer limits** - a coarse infra-level limit (gateway) plus fine per-user application limits catch different abuse patterns.
5. **Document limits publicly** - include limits and headers in the OpenAPI spec / API docs.

## Limitations

- Client IP keying is unreliable behind proxies; require correct `trust proxy` / `X-Forwarded-For` configuration first.
- Distributed limiters are approximate under high concurrency; do not use them for billing-grade metering.
