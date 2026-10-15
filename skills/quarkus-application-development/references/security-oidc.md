# Security: OIDC, roles, JWT

Extension: `quarkus-oidc` (bearer token for services, authorization code flow for web apps). Ask the user before adding it. Alternative for self-issued tokens: `quarkus-smallrye-jwt` (`mp.jwt.verify.publickey.location`, `mp.jwt.verify.issuer`).

## Keycloak Dev Service (verified on 3.40.1 and 3.27.6)

With `quarkus-oidc` and no `quarkus.oidc.auth-server-url`, dev/test mode starts Keycloak and imports a `quarkus` realm with users `alice` (admin, user) and `bob` (user), client `quarkus-app`. First start is slow (about 50 s with image pull). Customize roles:

```properties
quarkus.keycloak.devservices.roles.alice=admin,user
quarkus.keycloak.devservices.roles.bob=user
```

Dev UI (`/q/dev-ui`, OpenID Connect card) can log in and obtain tokens. For production set `%prod.quarkus.oidc.auth-server-url=${OIDC_URL}`, `%prod.quarkus.oidc.client-id`, and `credentials.secret` from env/secret store; never in git.

## Bearer (service) and web-app modes

- Default `quarkus.oidc.application-type=service`: expects `Authorization: Bearer <jwt>`.
- Browser app: `quarkus.oidc.application-type=web-app` (session cookie, redirect to IdP). Pair with `quarkus.http.auth.permission.*` for path rules.

## Authorization

```java
@Path("/secure")
public class SecuredResource {
    @Inject SecurityIdentity identity;

    @GET @Path("/me") @Authenticated
    public String me() { return identity.getPrincipal().getName(); }

    @GET @Path("/admin") @RolesAllowed("admin")
    public String admin() { return "admin ok"; }
}
```

Verified results: no token gives 401; a token for `alice` gets 200 on `/secure/admin`; `bob` gets 403 there and 200 on `/secure/me`.

- Secure by default: `quarkus.security.jaxrs.deny-unannotated-endpoints=true` (not verified here).
- Fine-grained checks: `@PermissionsAllowed("read")` with a `SecurityIdentity` permission checker, or `@PermissionChecker` methods (`quarkus-security`); or inject `SecurityIdentity` and check `identity.hasRole(...)`. Not verified here.
- JWT claims: inject `org.eclipse.microprofile.jwt.JsonWebToken` (with `quarkus-oidc`, `@Inject JsonWebToken jwt; jwt.getClaim("email")`). Default role lookup: a `groups` claim wins if present; otherwise Keycloak's `realm_access/roles`, and `resource_access/<quarkus.oidc.client-id>/roles` when a client id is configured (a token with non-empty `groups` uses those even if realm roles exist). Override with `quarkus.oidc.roles.role-claim-path`.
- Calling downstream services with the user's token: `quarkus-rest-client-oidc-token-propagation`; with the service's own identity: `quarkus-rest-client-oidc-filter`. Not verified here.

## Testing

- Unit-style: `@TestSecurity(user = "u", roles = "admin")` with `quarkus-test-security` (verified: 200 for admin, 403 for another role).
- Real tokens against the Dev Service: `quarkus-test-keycloak-server` provides `io.quarkus.test.keycloak.client.KeycloakTestClient`; `given().auth().oauth2(new KeycloakTestClient().getAccessToken("alice"))` (verified). Also see `quarkus-dev-services-and-testing`.
- Keycloak container requires Docker; tests relying on it should be run where containers exist.
