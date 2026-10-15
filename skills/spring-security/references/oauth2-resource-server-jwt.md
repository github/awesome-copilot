# OAuth2 resource server with JWT

Dependency: `spring-boot-starter-oauth2-resource-server` (Boot 3.x) or `spring-boot-starter-security-oauth2-resource-server` (Boot 4.x; test companion `spring-boot-starter-security-oauth2-resource-server-test`).

## Minimal configuration

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://issuer.example.com/realms/demo   # discovers JWKS, validates iss
          # or: jwk-set-uri: https://issuer.example.com/.well-known/jwks.json
          audiences: my-api                                    # validates aud (Boot 3.x+)
```

```java
http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
```

Use `issuer-uri` whenever possible: it validates the issuer and the signature. Keys and secrets come from the identity provider or environment variables, never from the repository.

## Custom JwtDecoder

```java
@Bean
JwtDecoder jwtDecoder(OAuth2TokenValidator<Jwt> validator) {
    NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation("https://issuer.example.com/realms/demo");
    decoder.setJwtValidator(validator);
    return decoder;
}

@Bean
OAuth2TokenValidator<Jwt> validator() {
    return new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefaultWithIssuer("https://issuer.example.com/realms/demo"),
        new JwtClaimValidator<List<String>>("aud", aud -> aud != null && aud.contains("my-api")));
}
```

Always validate expiry (default), issuer, and audience. Do not accept `alg: none` or symmetric keys unless deliberately designed.

## Mapping roles and scopes

By default `scope`/`scp` claims map to `SCOPE_*` authorities. For roles in a custom claim:

```java
@Bean
JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
        Collection<GrantedAuthority> authorities = new ArrayList<>(scopes.convert(jwt));
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (roles != null) roles.forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
        return authorities;
    });
    return converter;
}
```

Register it: `.oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(converter)))`. Provider-specific claim locations (for example Keycloak `realm_access.roles`) need explicit extraction.

## Opaque tokens

Use `.oauth2ResourceServer(o -> o.opaqueToken(Customizer.withDefaults()))` with `spring.security.oauth2.resourceserver.opaquetoken.introspection-uri`, `client-id`, and `client-secret` (from environment) when tokens are not JWTs.

## Notes

- Stateless: pair with `SessionCreationPolicy.STATELESS`.
- 401 vs 403: missing/invalid token gives 401 with `WWW-Authenticate`; valid token lacking authority gives 403.
- Short token lifetimes; never log tokens.
