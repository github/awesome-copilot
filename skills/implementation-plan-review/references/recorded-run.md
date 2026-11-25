# Recorded run: reviewing a real agent plan

Provenance, so you can judge it:

- **Repo** a scratch Express app called `rate-demo`: `src/auth/middleware.js` (the login handler),
  `src/auth/routes.js` (`POST /login`), `src/limits/inhouse.js` (an in-house fixed-window
  `tokenBucket`), `test/auth.test.js` (three tests). It is not published; every repository fact
  this review relies on is quoted below, so each claim can be checked against the quote.

  The two facts that carry the review:

  ```
  src/limits/inhouse.js:2    const buckets = new Map();
                             // resetBucket() is exported but called nowhere in src/ or test/
  src/                       // no app entry file, therefore no `app.set('trust proxy', ...)`
  ```
- **Plan** written by a real agent in one headless call (DeepSeek model, Claude Code CLI, no
  file edits). Prompt used, verbatim:

  > In this repository, write an implementation plan for this task. Do not edit any files.
  > Reply with the plan only.
  > Task: "Add rate limiting to the login endpoint: after 5 failed attempts from the same IP
  > within one minute, return 429. Do not change the login request or response shape."
  > Format: a numbered list, at most 10 steps. Each step: the file path and what you would do there.

- **Review** produced by following this skill's six checks against that plan and the repo.
- **Date** 2026-11-15.

## The plan (verbatim, de-wrapped)

1. `src/limits/inhouse.js` — add a read-only `peekBucket(key)`: return `{ used, resetAt }` for a
   live entry, `null` when absent or expired, without mutating the counter. Keep fixed-window
   semantics.
2. `src/auth/middleware.js` — import `tokenBucket` and `peekBucket`; add
   `LOGIN_MAX_FAILURES = 5`, `LOGIN_WINDOW_MS = 60_000`, and `loginKey(req)` returning
   `` `login:${req.ip ?? req.socket?.remoteAddress ?? 'unknown'}` ``. (Behind a proxy, `req.ip`
   needs `trust proxy`; there is no app entry file here.)
3. `src/auth/middleware.js` — at the top of `loginHandler`, `peekBucket(loginKey(req))`; if
   `used >= LOGIN_MAX_FAILURES`, return `res.status(429).json({ error: 'too many login attempts' })`.
   This blocks all attempts from that IP, including ones that would succeed.
4. `src/auth/middleware.js` — in the wrong-password branch, call
   `tokenBucket(loginKey(req), LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS)`, then return the unchanged
   `401`. Do not increment for `400`s or successful logins; do not alter the bodies.
5. `src/auth/routes.js` — no change: the limiter lives inside `loginHandler`.
6. `test/auth.test.js` — clear buckets between tests; cover five `401`s, then `429` on the sixth,
   a blocked correct password, a different IP still working, and recovery after expiry. Assert
   the existing bodies are unchanged.
7. Run `npm test`.

## The review

**1. The bucket map grows without bound** — step 1, `src/limits/inhouse.js:2`
Evidence: `buckets` is a module-level `Map`; entries are written per key and never removed —
`resetBucket` is exported but called nowhere in `src/` or `test/`.
Impact: one entry per client IP for the life of the process, on a public login endpoint.
Fix: delete the entry when its window has expired, and say so in the plan.

**2. An unknown IP becomes one shared bucket** — step 2, the `?? 'unknown'` fallback
Evidence: no app entry file sets `trust proxy`; a harness or proxy can leave `req.ip` undefined.
Impact: every client without an IP shares `login:unknown` — five failures lock out everyone.
Fix: skip limiting when the IP is unknown instead of using a shared key.

**3. Per-process counters make the limit 5 × workers** — step 1 note
Evidence: the plan records "the store is per-process" and the repo has no entry file pinning a
single worker.
Impact: the effective limit multiplies by the worker count; the plan states the caveat but not
the consequence.
Fix: state the deployment assumption and the resulting number, or share the counter.

**4. The 200 body is never compared before and after** — step 6
Evidence: current tests assert `statusCode` and `/^s_/` only; the new tests cover `401`→`429`,
the blocked success, and another IP, but not the full success body.
Impact: step 4 edits a branch inside `loginHandler`; a body change would pass review.
Fix: one test that pins the full 200 body to the previous version.

Standards, one line each: **Logic** holds — the counter advances only on credential failures.
**Completeness** has two holes — unbounded map, shared-key fallback. **Feasibility** holds —
every step names a real file and a real function. **Verifiability** is incomplete — the 200 body
is not pinned.

## The retake note

```text
Re-plan before editing. Do not start implementing until you have posted the revised plan.

Scope lock
- src/limits/inhouse.js, src/auth/middleware.js, test/auth.test.js
- src/auth/routes.js: read only, explicitly unchanged. No new dependency.

Must not change
- The 200/400/401 bodies of the login handler, byte for byte.
- tokenBucket(key, limit, windowMs): signature and existing callers.

Required additions to the plan
- Expiry: delete the bucket entry when its window passes.
- Unknown IP: no shared fallback; skip limiting and record why.
- Deployment assumption: how many processes hold counters, and the resulting per-IP limit.
- Verification: a test that fails now (five failures then 429), and one that pins the 200 body.
- Rollback: revert the two source files; no stored state.

Acceptance criteria (one observation each)
- Does a sixth failed login from the same IP within a minute return 429?
- Is the 429 body exactly {"error":"too many login attempts"}?
- Does a correct login from a different IP still return 200?
- Is the 200 body byte-identical to the previous version?
- After the window expires, does the same IP get 401 again instead of 429?
- After the window passes, does `buckets.has(key)` return false for that key?

Checks to run before you touch a file
- [ ] Every file you will modify exists
- [ ] No file you will create is imported before it exists
- [ ] No file outside the scope list is modified
- [ ] Both new tests are listed, and both can fail
- [ ] The tree still boots after each step
```

## What this run shows

The plan was competent: it reused the in-house limiter, kept the response contract, and noticed
the `trust proxy` gap. Three of the four findings are about what the plan **left out** — the
usual case for a plan from a capable agent.
