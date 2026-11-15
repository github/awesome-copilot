# Worked example: reviewing a coding-agent plan for rate limiting

**This is an illustrative walkthrough, not a recorded session.** The plan and the repository
are representative of what an agent produces for this kind of change; the findings are the
ones this skill is designed to surface. Use it as a shape to follow, not as evidence of
measured performance.

The repository is a small Express API; the plan was produced by an agent before it edited
anything.

## The requirement

> Add rate limiting to the login endpoint. Five failed attempts per IP per minute, then 429.
> Do not change the login request or response shape.

## The repository, as it actually is

```
src/auth/middleware.ts      exports requireAuth, and loginHandler
src/auth/routes.ts          POST /login → loginHandler
src/limits/inhouse.ts       exports tokenBucket(ip, limit, windowMs)  ← already in the repo
test/auth.test.ts           3 tests, none for 429
package.json                no rate-limiting dependency
```

## The plan Copilot proposed

```
1. Add the express-rate-limit dependency.
2. Update src/middleware/auth.ts to wrap loginHandler with the limiter.
3. Set the limiter to 5 requests per minute per IP.
4. Return 429 with a JSON body when the limit is hit.
5. Run the test suite.
```

## The review

**1. The file to edit does not exist** — plan step 2, `src/middleware/auth.ts`
Evidence: the file is `src/auth/middleware.ts`; there is no `src/middleware/` directory.
Impact: the agent creates a duplicate module, and the real `loginHandler` keeps running unlimited.
Fix: name the existing path, and state that it is edited in place.

**2. A dependency is added for something the repository already has** — plan step 1
Evidence: `src/limits/inhouse.ts` exports `tokenBucket(ip, limit, windowMs)`; the same module is
already used by the upload route.
Impact: two rate-limiting mechanisms, two config surfaces, one more package to audit.
Fix: reuse `tokenBucket`; drop the new dependency.

**3. The limit counts requests, not failed attempts** — plan step 3
Evidence: the requirement says five **failed** attempts; step 3 limits all requests.
Impact: a user who logs in successfully five times gets a 429 on the sixth.
Fix: count only failures, and reset the bucket on a successful login.

**4. No verification for the 429 path** — plan step 5
Evidence: `test/auth.test.ts` has no test that expects 429; step 5 only runs the existing suite.
Impact: nothing proves the limit works or that unlimited requests still pass.
Fix: add two tests — six failures produce 429; five successes do not.

## The retake note

```text
Re-plan before editing. Do not start implementing until you have posted the revised plan.

Scope lock
- src/auth/middleware.ts, src/limits/inhouse.ts, test/auth.test.ts
- Everything else: read only. No new dependency.

Must not change
- The login request and response shape (the requirement rules it out)
- The three existing tests in test/auth.test.ts

Required additions to the plan
- Reuse tokenBucket() instead of adding express-rate-limit
- Count failed attempts only; clear the bucket after a successful login
- Verification: two new tests, one for 429 after five failures, one for five successes
- Rollback: delete the two tests and revert the middleware change; no data involved

Acceptance criteria
Write these before re-planning:
- Does a sixth failed login from the same IP in one minute return 429?
- Does a sixth successful login in one minute still return 200?
- Is the response body on 200 unchanged from the previous version?
- Does src/auth/middleware.ts appear in the diff, and src/middleware/auth.ts not appear?

Checks to run before you touch a file
- [ ] Every file you will modify exists
- [ ] No file you will create is imported before it exists
- [ ] No file outside the scope list is modified
- [ ] The two new tests are listed in the plan, and they can fail
- [ ] The tree still boots after each step
```

## What the retake note is expected to change

The agent re-plans: it dropped the dependency, edited `src/auth/middleware.ts`, added a failure
counter around `loginHandler`, and wrote the two tests. The diff was 41 lines across three files.

Two things in the original plan were wrong about the repository — the path and the existing
helper — and neither could be seen from the plan alone. Reading two files was enough to catch
all four findings.

---

Use this example as a shape, not a template. The value is in the first two findings: they are
cheap to check and they change the plan.
