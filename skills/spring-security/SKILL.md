---
name: spring-security
description: 'Configure, test and review Spring Security 6/7 in Spring Boot 3/4 apps: SecurityFilterChain lambda DSL, method security, OAuth2 resource server with JWT, OIDC login, CSRF/CORS, password encoding, headers, actuator protection, and MockMvc security tests. Use when adding or auditing authentication and authorization.'
---

# Spring Security

Practical guidance for Spring Security 6.x (Spring Boot 3.x) and 7.x (Spring Boot 4.x). Details per topic are in `references/`.

## Safety rules

- Never read, print, or commit secrets: `.env`, `application-*.properties` with credentials, client secrets, private keys, JWT signing keys. Reference them via environment variables or a secret manager.
- Never disable security (`permitAll()` on everything, `csrf.disable()` for browser apps) just to make a test or demo pass.

## First: detect the version

1. Find the Boot version (`pom.xml` parent/BOM, `build.gradle(.kts)`, `libs.versions.toml`) and run `./mvnw dependency:tree -Dincludes=org.springframework.security` or `./gradlew dependencies --configuration runtimeClasspath` to see the Spring Security version.
2. Boot 3.x -> Security 6.x; Boot 4.x -> Security 7.x. Do not mix guidance: in 7.x, APIs deprecated in 6.x are removed (for example `and()` chaining, `authorizeRequests`, `AntPathRequestMatcher`/`MvcRequestMatcher` style matchers; use the lambda DSL and `requestMatchers(...)`). Check the "What's New" and migration pages on docs.spring.io/spring-security when upgrading.
3. Identify the app type: servlet MVC (`SecurityFilterChain`) or WebFlux (`SecurityWebFilterChain`, `@EnableWebFluxSecurity`); browser app with sessions, or stateless API.

## Core configuration

Declare a `SecurityFilterChain` bean. `WebSecurityConfigurerAdapter` no longer exists.

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/public/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf.disable()); // only for stateless token APIs without cookies
        return http.build();
    }
}
```

Rules of thumb:

- Rules are evaluated in order; put specific matchers first and end with `anyRequest().authenticated()` (deny by default).
- Use multiple `SecurityFilterChain` beans with `securityMatcher(...)` and `@Order` when the app mixes an API and a browser UI.
- Add `@EnableMethodSecurity` and use `@PreAuthorize`/`@PostAuthorize` on services for fine-grained rules; see [method security](references/method-security.md).
- Authentication choices: [OAuth2 resource server and JWT](references/oauth2-resource-server-jwt.md), [OIDC login and OAuth2 client](references/oidc-login-oauth2-client.md).
- Session vs stateless, CSRF, CORS, headers: [web protections](references/csrf-cors-sessions-headers.md).
- Passwords and users: [password encoding](references/password-encoding.md).
- Actuator endpoints: [actuator protection](references/actuator-protection.md) (see also the `spring-observability` skill if installed).
- Tests: [testing security](references/testing-security.md).
- Review: [common mistakes checklist](references/review-checklist.md).

## Decision guide

| Situation | Approach |
|---|---|
| REST API called by SPA/mobile/services with bearer tokens | Resource server + JWT, stateless, CSRF off (no cookie auth) |
| Server-rendered app or SPA with same-site cookie session | Form login or OIDC login, sessions, CSRF on |
| SPA using BFF pattern | OIDC login in the backend, session cookie to browser, CSRF token via cookie repository |
| Internal service-to-service | Client credentials grant, resource server on the receiving side |

## Dependencies (pin through the Boot BOM, no explicit versions)

- `spring-boot-starter-security`, plus `spring-boot-starter-oauth2-resource-server` or `spring-boot-starter-oauth2-client` on Boot 3.x. Boot 4.x names: `spring-boot-starter-security-oauth2-resource-server` / `spring-boot-starter-security-oauth2-client` (the old names remain as deprecated aliases).
- Tests: add `spring-security-test` (test scope) on Boot 3.x; on Boot 4.x use `spring-boot-starter-security-test` (plus `spring-boot-starter-security-oauth2-resource-server-test` / `-client-test` when those starters are used) together with modular test starters such as `spring-boot-starter-webmvc-test`.

## Verify

Run the app's tests plus security-specific tests (401 without credentials, 403 with insufficient role, 200 with the right one, CSRF rejection on state-changing browser requests). Confirm no endpoint was accidentally left open by listing the mappings and checking each against the filter chain.

See also (prefer over this skill for the version in use): Spring Security reference <https://docs.spring.io/spring-security/reference/index.html> and migration chapter <https://docs.spring.io/spring-security/reference/migration/index.html>.
