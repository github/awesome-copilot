# Sessions, CSRF, CORS, headers

## Session vs stateless

- Browser apps: default session-based (`IF_REQUIRED`), session fixation protection is on. Limit concurrent sessions via `sessionManagement(s -> s.maximumSessions(1))` if required. Use Spring Session (Redis/JDBC) for multi-instance deployments.
- Token APIs: `SessionCreationPolicy.STATELESS`; no `JSESSIONID`, no cookie auth.
- Cookies: `server.servlet.session.cookie.secure=true`, `http-only=true`, `same-site=lax` (or `strict`).

## CSRF

- Keep CSRF **enabled** for any app that authenticates with cookies/sessions (form login, OIDC login).
- Disable only for stateless bearer-token APIs: `csrf(csrf -> csrf.disable())`, or ignore specific paths with `csrf.ignoringRequestMatchers("/webhooks/**")` (and authenticate those another way, e.g. HMAC signature).
- SPA with cookie session: use the **complete SPA configuration for the installed Spring Security version** from the [CSRF reference](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html#csrf-integration-javascript-spa). With `CookieCsrfTokenRepository.withHttpOnlyFalse()`, the setup must both materialize the deferred token so the `XSRF-TOKEN` cookie is written and accept its raw value in `X-XSRF-TOKEN` while retaining BREACH protection for rendered tokens. A plain `CsrfTokenRequestAttributeHandler` alone does not load the deferred token; do not present it as a complete SPA setup.
- Alternatively, keep session-based CSRF and expose a token-fetch endpoint such as `GET /csrf` returning the resolved `CsrfToken` (including `token` and `headerName`). Permit that endpoint before login if needed and have the client fetch it on initialization and again after login/logout clears the previous token. Send the returned token in the returned header name on unsafe requests; do not substitute a raw cookie token for the BREACH-protected response token.
- Verify the token lifecycle: missing/invalid token rejects an unsafe request with 403, and fetching a fresh token allows an otherwise authorized request before and after authentication changes.
- Never allow state-changing GET requests.

## CORS

Configure CORS in Spring Security so preflight requests are handled before authorization:

```java
http.cors(Customizer.withDefaults());

@Bean
CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(List.of("https://app.example.com"));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    c.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
    s.registerCorsConfiguration("/api/**", c);
    return s;
}
```

- Never combine `allowedOrigins("*")` with `allowCredentials(true)`.
- List explicit origins, read from configuration per environment.

## Security headers

Defaults already send `X-Content-Type-Options`, `Cache-Control` for secured responses, `X-Frame-Options: DENY`, and HSTS (over HTTPS). Tighten as needed:

```java
http.headers(h -> h
    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; frame-ancestors 'none'"))
    .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
    .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000)));
```

Do not call `headers.disable()`. Enforce HTTPS at the proxy; set `server.forward-headers-strategy` when behind one.
