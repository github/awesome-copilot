# Protecting Actuator endpoints

Actuator endpoints can leak configuration, environment, heap contents, and allow shutdown. Treat them as admin surface.

- Expose the minimum: `management.endpoints.web.exposure.include=health,info` (add `prometheus`/`metrics` only for the scraper).
- Use `EndpointRequest` for rules (import: Boot 3.x `org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest`; Boot 4.x `org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest`; both verified to compile):

```java
@Bean
@Order(1)
SecurityFilterChain actuator(HttpSecurity http) throws Exception {
    http.securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(a -> a
            .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
            .anyRequest().hasRole("ACTUATOR_ADMIN"))
        .httpBasic(Customizer.withDefaults());
    return http.build();
}
```

- Defining any `SecurityFilterChain` makes Boot's default chain back off, and the chain above matches only Actuator requests. Always add a lower-priority catch-all chain (with your chosen authentication mechanism), otherwise every non-Actuator request matches no chain and is left unsecured:

```java
@Bean
@Order(2)
SecurityFilterChain application(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(a -> a.anyRequest().authenticated())
        .httpBasic(Customizer.withDefaults()); // or formLogin / oauth2ResourceServer / oauth2Login
    return http.build();
}
```

- Never expose `env`, `configprops`, `heapdump`, `threaddump`, `loggers`, `shutdown`, `mappings`, `beans` publicly. `heapdump` can contain secrets and personal data.
- Consider a separate management port (`management.server.port`) not reachable from the internet.
- `management.endpoint.health.show-details=when-authorized` with `show-components` and roles configured.
- Sanitization of `env`/`configprops` values is on by default, but do not rely on it.

See the `spring-observability` skill for health probes, metrics, and tracing.
