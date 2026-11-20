# Recorded run: reviewing a real agent plan

How this was produced, so you can judge it:

- **Repository** `rate-demo` (a small Express app: `src/auth/middleware.js`, `src/auth/routes.js`,
  `src/limits/inhouse.js`, `test/auth.test.js`), commit `d8e4b0b`.
- **Plan author** an agent (DeepSeek model through the Claude Code CLI, headless, one prompt,
  no file edits). The exact prompt:

  > In this repository, write an implementation plan for this task. Do not edit any files.
  > Reply with the plan only.
  > Task: "Add rate limiting to the login endpoint: after 5 failed attempts from the same IP
  > within one minute, return 429. Do not change the login request or response shape."
  > Format: a numbered list, at most 10 steps. Each step: the file path and what you would do there.

- **Review** produced by following this skill's six checks against the plan and the repository.
- **Date** 2026-11-15.

The plan is reproduced verbatim (lightly de-wrapped). The review is what the skill produced.

---

## The plan

1. **`src/limits/inhouse.js`** — Add a read-only `peekBucket(key)` alongside the existing
   `tokenBucket`/`resetBucket`: return `{ used, resetAt }` for a live entry and `null` when the
   key is absent or the window has expired, without mutating the counter. Leave the existing
   fixed-window semantics intact (note: the store is per-process, consistent with the file's
   existing caveat).

2. **`src/auth/middleware.js`** — Import `tokenBucket` and `peekBucket`; add
   `LOGIN_MAX_FAILURES = 5`, `LOGIN_WINDOW_MS = 60_000`, and a `loginKey(req)` helper returning
   `` `login:${req.ip ?? req.socket?.remoteAddress ?? 'unknown'}` ``. (If deployed behind a proxy,
   `req.ip` requires `trust proxy` to be configured at the app level; there is no app entry file
   in this repo.)

3. **`src/auth/middleware.js`** — At the very top of `loginHandler`, before reading `req.body`,
   call `peekBucket(loginKey(req))`; if the live entry has `used >= LOGIN_MAX_FAILURES`, return
   `res.status(429).json({ error: 'too many login attempts' })` (optionally setting a
   `Retry-After` header from `resetAt`). This blocks all attempts from that IP, including ones
   that would otherwise succeed, until the window expires.

4. **`src/auth/middleware.js`** — In the existing wrong-password branch, call
   `tokenBucket(loginKey(req), LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS)` to record only credential
   failures, then return the unchanged `res.status(401).json({ ok: false })`. Do not increment
   for missing-field `400`s or successful logins; do not alter the 200/400/401 bodies.

5. **`src/auth/routes.js`** — No change needed: keep `router.post('/login', loginHandler)`. The
   limiter lives inside `loginHandler`, so the route wiring and login request/response contract
   are untouched.

6. **`test/auth.test.js`** — Import `clearAllBuckets` and clear buckets between tests (e.g.
   `beforeEach`) so cases don't leak state. Add fake requests with an explicit `ip` and cover:
   five wrong-password attempts each return `401`; the sixth request returns `429`; a correct
   password after the limit returns `429`; a different IP still reaches the normal `401`/`200`
   paths; and after `resetBucket(key)`/window expiry, attempts are accepted again. Assert the
   existing 200/400/401 body shapes are unchanged.

7. **`test/auth.test.js` / terminal** — Run `npm test` (`node --test test/`) and confirm the new
   rate-limit tests and the three existing handler tests all pass.

---

## The review

**1. The bucket map grows without bound** — plan step 1, `src/limits/inhouse.js:2`
Evidence: `buckets` is a module-level `Map`; `tokenBucket` writes an entry per key and nothing
ever deletes an expired one — `resetBucket` is only called manually.
Impact: one entry per client IP, kept for the life of the process. A public login endpoint sees
many IPs; this is a slow memory leak that only shows up under real traffic.
Fix: delete the entry when its window has expired, and state the bound in the plan.

**2. An unknown IP silently becomes one shared bucket** — plan step 2, `loginKey()` fallback
Evidence: the helper ends with `?? 'unknown'`, and `loginHandler` currently receives `req` from
Express, but the repo has no app entry file that sets `trust proxy`; a test harness or a proxy
setup can leave `req.ip` undefined.
Impact: every client without `req.ip` shares the key `login:unknown`. Five failures from anyone
lock out everyone — the opposite of the requirement's intent.
Fix: refuse to rate-limit when the IP is unknown rather than falling back to a shared key, and
say so in the plan.

**3. Per-process counters make the limit a fraction of what it says** — plan step 1 note
Evidence: the plan records "the store is per-process", and the repository has no entry file that
pins a single worker; `package.json` runs `node --test` only.
Impact: with N workers, the effective limit is 5×N per IP per minute. The plan states the caveat
but does not state the consequence or who owns it.
Fix: put the deployment assumption and the resulting number in the plan, or move the counter
somewhere shared.

**4. No verification that a successful login is still untouched** — plan step 6
Evidence: the new tests cover 401→429, the blocked success, and another IP. None asserts that a
normal successful login still returns the *same body* as before (only that it is 200 in a
non-limited path); the existing test asserts a token pattern, not the full shape.
Impact: step 4 rewrites a branch inside `loginHandler`; a body change would slip through.
Fix: assert the full 200 body shape from the previous version, in one test.

Then the four standards, one line each:

- **Logic**: holds — the counter is only advanced on credential failures, as required.
- **Completeness**: two holes — unbounded map, shared-key fallback.
- **Feasibility**: holds — every step names a real file and a real function.
- **Verifiability**: mostly — the 200 body is not compared before and after.

---

## The retake note

```text
Re-plan before editing. Do not start implementing until you have posted the revised plan.

Scope lock
- src/limits/inhouse.js, src/auth/middleware.js, test/auth.test.js
- src/auth/routes.js: read only, explicitly unchanged.
- No new dependency.

Must not change
- The 200/400/401 response bodies of the login handler, byte for byte.
- `tokenBucket(key, limit, windowMs)` signature and its existing callers.

Required additions to the plan
- Expiry: delete the bucket entry when its window has passed, so the map cannot grow forever.
- Unknown IP: do not fall back to one shared key. If the IP cannot be determined, skip
  limiting for that request and record why.
- Deployment assumption: state how many processes will hold counters, and what the real
  per-IP limit becomes with that number.
- Verification: a test that fails on the current code — five failures then a 429 — and a test
  that compares the full 200 body with the previous version.
- Rollback: revert the two source files; no stored state, no migration.

Acceptance criteria
Write these before you re-plan, one observation each:
- Does a sixth failed login from the same IP within one minute return 429?
- Is the 429 body exactly `{"error":"too many login attempts"}`?
- Does a login with correct credentials from a different IP still return 200?
- Is the 200 body byte-identical to the body produced before the change?
- After the window expires, does the same IP get 401 again instead of 429?
- Does `buckets.size` stay bounded when many distinct IPs are seen over time?

Checks to run before you touch a file
- [ ] Every file you will modify exists
- [ ] No file you will create is imported before it exists
- [ ] No file outside the scope list is modified
- [ ] The two new tests are listed, and both can fail
- [ ] The tree still boots after each step
```

---

## What this run shows

The plan was good: it reused the in-house limiter instead of adding a dependency, it kept the
response contract, and it noticed the `trust proxy` gap. Three of the four findings are about
what the plan **left out**, not about what it got wrong — which is the common case for a plan
produced by a competent agent.
