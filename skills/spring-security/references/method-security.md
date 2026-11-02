# Method security

Enable with `@EnableMethodSecurity` on a `@Configuration` class (replaces `@EnableGlobalMethodSecurity`). `@PreAuthorize`, `@PostAuthorize`, `@PreFilter`, `@PostFilter` are on by default; `@Secured` and JSR-250 need `securedEnabled = true` / `jsr250Enabled = true`.

```java
@Service
class DocumentService {

    @PreAuthorize("hasRole('ADMIN') or #owner == authentication.name")
    List<Document> findByOwner(String owner) { ... }

    @PreAuthorize("hasAuthority('SCOPE_documents.write')")
    void save(Document d) { ... }

    @PostAuthorize("returnObject.owner == authentication.name")
    Document load(Long id) { ... }
}
```

Guidance:

- `hasRole('ADMIN')` checks authority `ROLE_ADMIN`; `hasAuthority('SCOPE_x')` checks the exact string. JWT scopes become `SCOPE_` authorities by default.
- Put annotations on service-layer methods (or controllers), never on private methods or on self-invoked calls: they rely on proxies and are bypassed.
- Prefer a custom bean for complex rules: `@PreAuthorize("@documentAuth.canEdit(#id, authentication)")`.
- Meta-annotations keep rules readable: `@Target(METHOD) @Retention(RUNTIME) @PreAuthorize("hasRole('ADMIN')") @interface IsAdmin {}`.
- Method security complements, not replaces, URL rules: keep a deny-by-default filter chain.
- Test with `@WithMockUser` (see [testing](testing-security.md)); a missing proxy shows up as a test passing with no authentication.
