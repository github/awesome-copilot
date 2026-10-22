# OIDC login and OAuth2 client

Dependency: `spring-boot-starter-oauth2-client` (Boot 3.x) or `spring-boot-starter-security-oauth2-client` (Boot 4.x; test companion `spring-boot-starter-security-oauth2-client-test`).

## Login with an OIDC provider

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          keycloak:
            client-id: ${OIDC_CLIENT_ID}
            client-secret: ${OIDC_CLIENT_SECRET}
            scope: openid,profile,email
        provider:
          keycloak:
            issuer-uri: https://issuer.example.com/realms/demo
```

```java
http
    .authorizeHttpRequests(a -> a.anyRequest().authenticated())
    .oauth2Login(Customizer.withDefaults())
    .logout(l -> l.logoutSuccessHandler(oidcLogoutHandler));
```

- Client id/secret come from environment variables or a secret store; never hard-code or print them.
- Common providers (Google, GitHub, Facebook) need only `client-id`/`client-secret`; Okta and other OIDC providers also need the `issuer-uri`.
- Use `OidcClientInitiatedLogoutSuccessHandler` for RP-initiated logout.
- Authorization Code with PKCE is the default for public clients; do not use the implicit or password grants.

## Mapping authorities

Customize with a `GrantedAuthoritiesMapper` bean or an `OAuth2UserService`/`OidcUserService` to turn provider claims (groups, roles) into `ROLE_*` authorities.

## Calling other APIs (OAuth2 client)

- Servlet apps: configure `OAuth2AuthorizedClientManager` and use `RestClient` with an `OAuth2ClientHttpRequestInterceptor`, or `WebClient` with `ServletOAuth2AuthorizedClientExchangeFilterFunction` (`ServerOAuth2AuthorizedClientExchangeFilterFunction` is for WebFlux only).
- Service-to-service uses `authorization-grant-type: client_credentials`.
- Check the Spring Security reference for the exact `RestClient` support available in your version.

## Sessions and BFF

OIDC login produces an HTTP session; keep CSRF enabled and configure cookies (`SameSite`, `Secure`, `HttpOnly`) as described in [web protections](csrf-cors-sessions-headers.md).
