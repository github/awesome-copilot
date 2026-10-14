# Security review checklist (common mistakes)

- [ ] No `WebSecurityConfigurerAdapter`, `authorizeRequests`, `antMatchers`, `mvcMatchers`, `and()` chaining; lambda DSL and `requestMatchers` used.
- [ ] Deny by default: chain ends with `anyRequest().authenticated()` (or `denyAll()`); no accidental `permitAll()` on `/**`.
- [ ] Matcher order: specific before general; `permitAll` rules are narrow.
- [ ] Authorization enforced on the server (method security or URL rules), not only hidden in the UI.
- [ ] Cookie-authenticated apps keep CSRF enabled; `csrf.disable()` only for stateless bearer APIs.
- [ ] CORS lists explicit origins; no `*` with credentials; CORS configured through Spring Security.
- [ ] JWT: issuer, audience, expiry validated; roles/scopes mapped intentionally; algorithm not `none`.
- [ ] No secrets, keys, client secrets, or tokens in the repo, logs, or error messages; `.env` files never read or printed by tooling.
- [ ] Passwords hashed with `DelegatingPasswordEncoder`/bcrypt/Argon2; no `NoOpPasswordEncoder`, no in-memory default users outside tests.
- [ ] Actuator limited and secured; no public `env`, `heapdump`, `threaddump`, `shutdown`, `loggers`.
- [ ] `@PreAuthorize` only on proxied (public, non-self-invoked) methods; `@EnableMethodSecurity` present.
- [ ] Security headers not disabled; HSTS behind HTTPS; session cookie `Secure`/`HttpOnly`/`SameSite`.
- [ ] Error responses do not leak stack traces or user existence.
- [ ] Tests cover 401, 403, success, and CSRF for the new endpoints.
- [ ] Dependencies are up to date with the supported Security line; no known-vulnerable versions pinned.
