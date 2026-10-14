# Sessions, CSRF, CORS, headers

## Session vs stateless

- Browser apps: default session-based (`IF_REQUIRED`), session fixation protection is on. Limit concurrent sessions via `sessionManagement(s -> s.maximumSessions(1))` if required. Use Spring Session (Redis/JDBC) for multi-instance deployments.
- Token APIs: `SessionCreationPolicy.STATELESS`; no `JSESSIONID`, no cookie auth.
- Cookies: `server.servlet.session.cookie.secure=true`, `http-only=true`, `same-site=lax` (or `strict`).

## CSRF

- Keep CSRF **enabled** for any app that authenticates with cookies/sessions (form login, OIDC login).
- Disable only for stateless bearer-token APIs: `csrf(csrf -> csrf.disable())`, or ignore specific paths with `csrf.ignoringRequestMatchers("/webhooks/**")` (and authenticate those another way, e.g. HMAC signature).
- SPA with cookie session: `csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())`; since Security 6 the token is deferred and BREACH-protected, so use `CsrfTokenRequestAttributeHandler` (SPA setups often need `SpaCsrfTokenRequestHandler` from the reference docs) and send `X-XSRF-TOKEN`.
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
