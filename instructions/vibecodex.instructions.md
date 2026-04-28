---
description: "Production architecture standards for AI-assisted coding: 54 principles for FastAPI, Next.js 15 & Go 1.22+. Covers Router→Service→Repository, ACL middleware, bulkhead isolation, single-writer, and more."
applyTo: "**/*.py, **/*.ts, **/*.tsx, **/*.go"
---

# vibecodex — Production Architecture Standards

> 54 numbered principles (A1–F10) for vibe-coders building full-stack AI-assisted apps with FastAPI, Next.js 15, and Go 1.22+.
> Source: [github.com/yerdaulet-damir/vibecodex](https://github.com/yerdaulet-damir/vibecodex)

---

## How to use

Copy the files below into your repo root. Your AI coding agent will load them automatically.

| File / folder | What it does |
|---|---|
| `CLAUDE.md` | Architecture rules loaded by Claude Code on every session |
| `.cursor/rules/fastapi.mdc` | FastAPI coding standards for Cursor |
| `.cursor/rules/nextjs.mdc` | Next.js 15 coding standards for Cursor |
| `.cursor/rules/go.mdc` | Go 1.22+ coding standards for Cursor |
| `.claude/skills/` | 8 reusable skills: `debug-backend`, `new-feature`, `add-provider`, `split-monolith`, and Next.js / Go variants |
| `scripts/lint-arch.sh` | Architecture lint — 6 grep checks, catches violations statically |

---

## Part A — Safe Decomposition (FastAPI)

**A1. Router → Service → Repository — no layer skipping**
```
router.py  →  service.py  →  repository.py  →  ORM model
```
- Routers: HTTP binding only — no business logic, no DB access
- Services: business logic only — no `db.query()` calls directly
- Repositories: all DB access, scoped by `user_id` always

**A2. One public function per module** — avoid god files; split by bounded context.

**A3. ACL middleware, not per-route checks** — attach `current_user` in a single FastAPI dependency; do not repeat auth checks inside services.

**A4. Bulkhead isolation** — wrap every external call (OpenAI, S3, payment) in a dedicated adapter class; never call `httpx.get()` inline in a service.

**A5. Single-writer per aggregate** — one service owns each DB table; other services call it via its public API, never write directly.

**A6. Fail loud in dev, fail safe in prod** — `DEBUG=True` raises unhandled exceptions; `DEBUG=False` catches and returns structured error responses.

**A7. Pydantic v2 schemas at every boundary** — request body, response body, config, env vars. No raw `dict` in/out.

**A8. Alembic for every schema change** — no `Base.metadata.create_all()` in production; migrations must be reversible.

---

## Part B — Next.js 15 Standards

**B1. App Router only** — no `pages/` directory in new projects.

**B2. `"use client"` only when necessary** — default to Server Components; add `"use client"` only for state, effects, or browser APIs.

**B3. `fetchApi()` wrapper, never raw `fetch`** — centralizes auth headers, error handling, and base URL.

**B4. Loading + error + empty states** — every data-fetching component must handle all three states explicitly.

**B5. Design tokens, no hardcoded hex** — use semantic CSS variables (`--color-surface`, `--color-text-primary`).

**B6. kebab-case routes, PascalCase components, camelCase hooks** — consistent naming prevents import confusion.

---

## Part C — Go 1.22+ Standards

**C1. `errors.As` + sentinel errors** — typed error hierarchy; never compare error strings.

**C2. Context propagation** — every function that touches I/O takes `ctx context.Context` as first arg.

**C3. Table-driven tests** — standard Go test pattern; use `t.Run` sub-tests for each case.

**C4. `slog` structured logging** — `log.Printf` banned; always include `requestID`, `userID` in log fields.

**C5. Graceful shutdown** — `os.Signal` channel + `http.Server.Shutdown(ctx)` with a timeout.

---

## Part D — Security Rules (all stacks)

**D1. Every authenticated endpoint uses `get_current_user_id`** dependency (FastAPI) or middleware-injected `userID` (Go); no route bypasses auth.

**D2. All DB queries scoped by `user_id`** — multi-tenancy invariant; grep for `.filter(` missing `user_id`.

**D3. No secrets in code** — env vars via `pydantic-settings` / `os.Getenv`; no hardcoded `sk-*`, `API_KEY=`, `PASSWORD=`.

**D4. Rate limiting on public endpoints** — Redis fixed-window counter; 429 response with `Retry-After`.

**D5. HOLD → DEDUCT / REFUND atomic pattern** — for any paid operation: reserve balance first (`FOR UPDATE`), deduct only after success, refund on failure.

---

## Part E — Testing

**E1. Test-first for billing, auth, and wallet** — no critical-path code without a failing test that preceded it.

**E2. Bug-first discipline** — every bug fix starts with a reproducing test; fix makes it green.

**E3. Repository tests use an in-memory SQLite fixture** — fast, no Docker dependency for unit tests.

**E4. Adapter tests mock the external HTTP call** — use `respx` (Python) or `httptest` (Go); never hit the real API in CI.

---

## Part F — Architecture Lint

Run `scripts/lint-arch.sh` before committing. It checks:

1. No `db.query` / `session.exec` in `routers/`
2. No `import httpx` in `services/` (must go through adapters)
3. No hardcoded `sk-` or `API_KEY=` strings
4. All router files import `get_current_user_id`
5. All repository queries contain `.filter(` or `.where(`
6. No `console.log` in `.tsx` files

---

## Reference implementation

- **FastAPI** — `reference/app/` — Router/Service/Repository with 11 passing tests
- **Next.js 15** — `examples/nextjs/` — App Router + `fetchApi` + design tokens
- **Go 1.22+** — `examples/go/` — `net/http` + `slog` + graceful shutdown

MIT licensed. Copy freely.
