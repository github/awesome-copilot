---
applyTo: "**/*.ts"
---

# Cloudflare Workers + Hono + Angular SaaS

Full-stack SaaS on Cloudflare Workers with Hono API, Angular frontend, and enterprise integrations.

## Stack
CF Workers+Hono v4.12+ | Angular 21+Ionic 8+PrimeNG 21 | D1/Neon | Drizzle v1 | Zod | Clerk Core 3 | Stripe | Inngest v4 | Resend | Bun 1.3 | Playwright v1.59+ | Vitest

## TypeScript
- Strict mode, never `any` (use `unknown`), prefer `interface` over `type`
- `readonly` when not reassigned, `undefined` over `null`
- Zod as source of truth for validation
- ESLint flat config + typescript-eslint + Prettier

## Hono API
- Inline handlers for RPC type inference (never separate controller files)
- Method chaining: `app.use().get().post()` preserves types
- `hc<AppType>(BASE_URL)` for typed client
- `@hono/zod-validator` on ALL request bodies
- `app.onError()` + `app.notFound()` centralized
- Split: `app.route('/path', subApp)`
- Error: `{ error: string, code?: string, details?: unknown }`
- `createFactory<{ Bindings: Env }>()` for reusable middleware
- `GET /health` returns `{ status, version, timestamp }`

## Angular 21
- Standalone only, zoneless by default
- Signals: `signal()`, `computed()`, `effect()`, `linkedSignal()`, `resource()`
- `HttpResource` for data fetching
- Control flow: `@if`/`@for`/`@switch`/`@defer`
- kebab-case files, `providedIn: 'root'`, PrimeNG

## Drizzle v1 + D1
- `sqliteTable`, plural snake_case tables
- `$inferSelect`/`$inferInsert` for types
- Batch API (D1 doesn't support transactions)
- Prepared statements for repeated queries

## CF Workers
- `ctx.waitUntil()` for post-response work
- `ctx.passThroughOnException()` for graceful degradation
- Bindings typed via `Env` interface

## Inngest v4
- `eventType()` per-event with Zod schema
- `inngest/cloudflare` adapter for Workers
- `step.ai.infer()` offloads inference

## Testing (TDD)
- Failing test FIRST
- Playwright 6 breakpoints (375, 390, 768, 1024, 1280, 1920)
- Vitest for units
- No sleeps, `data-testid` selectors, axe-core

## Security
- HSTS, CSP (nonce-based), COOP, COEP, CORP
- Turnstile + Zod on all forms
- Clerk JWT auth, webhook sync to D1

## Quality
- Lighthouse a11y ≥95, perf ≥75
- WCAG 2.2 AA, LCP ≤2.5s, CLS ≤0.1

Source: [megabytespace/claude-skills](https://github.com/megabytespace/claude-skills)
