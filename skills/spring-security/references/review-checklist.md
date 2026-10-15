# Security review checklist (common mistakes)

- [ ] Lambda DSL and `requestMatchers` only; no `WebSecurityConfigurerAdapter`, `authorizeRequests`, `antMatchers`, `and()`.
- [ ] Deny by default (`anyRequest().authenticated()`), specific matchers first, narrow `permitAll`.
- [ ] CSRF stays on for cookie-authenticated apps; CORS lists explicit origins (no `*` with credentials).
- [ ] JWT issuer, audience and expiry validated; roles/scopes mapped intentionally.
- [ ] Actuator limited and secured (no public `env`, `heapdump`, `threaddump`, `shutdown`, `loggers`).
- [ ] `@PreAuthorize` only on proxied, non-self-invoked methods; `@EnableMethodSecurity` present.
- [ ] Tests cover 401, 403, success, and CSRF for new endpoints.
