# Testing Spring Security

Dependencies: `org.springframework.security:spring-security-test` (test scope, version managed by Boot). With Boot 4, use the modular test starters (`spring-boot-starter-webmvc-test`, `spring-boot-starter-security-test`).

`@WebMvcTest` package: Boot 3.x `org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest`; Boot 4.x `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`. Replace `@MockBean` with `@MockitoBean` (Spring Framework 6.2+/7).

## Slice test (stateless API configuration)

These tests use the stateless resource-server configuration (`SecurityConfig`: `csrf.disable()`, `SessionCreationPolicy.STATELESS`), so no CSRF token is needed. Mock `JwtDecoder` (`org.springframework.security.oauth2.jwt.JwtDecoder`) so the filter chain can initialize without production issuer configuration or an external identity provider. `@WithMockUser` supplies authentication for authorization assertions; it does not provide a decoder or test JWT decoding.

```java
@WebMvcTest(AccountController.class)
@Import(SecurityConfig.class)   // the slice does not pick up your config unless imported
class AccountControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean AccountService service;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test void anonymousGets401() throws Exception {
        mvc.perform(get("/accounts")).andExpect(status().isUnauthorized());
    }

    @Test @WithMockUser(roles = "USER")
    void userGets403OnAdmin() throws Exception {
        mvc.perform(get("/admin/accounts")).andExpect(status().isForbidden());
    }

    @Test @WithMockUser(roles = "ADMIN")
    void adminOk() throws Exception {
        mvc.perform(get("/admin/accounts")).andExpect(status().isOk());
    }

    @Test @WithMockUser
    void postWithoutCsrfTokenIsAllowed() throws Exception {
        mvc.perform(post("/accounts")).andExpect(status().isCreated());
    }
}
```

## CSRF test (session/browser configuration)

CSRF applies whenever the browser attaches credentials automatically (session cookies, HTTP Basic, client certificates); it does not apply to explicit bearer tokens sent in headers. Test it against a separate configuration that keeps CSRF enabled (the default), never against the stateless `SecurityConfig` above:

```java
@Configuration
@EnableWebSecurity
class BrowserSecurityConfig {
    @Bean
    SecurityFilterChain browser(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(a -> a.anyRequest().authenticated())
            .formLogin(Customizer.withDefaults()); // CSRF protection stays enabled
        return http.build();
    }
}

@WebMvcTest(AccountController.class)
@Import(BrowserSecurityConfig.class)   // not SecurityConfig
class AccountControllerCsrfTest {

    @Autowired MockMvc mvc;
    @MockitoBean AccountService service;

    @Test @WithMockUser
    void postNeedsCsrf() throws Exception {
        mvc.perform(post("/accounts")).andExpect(status().isForbidden());
        mvc.perform(post("/accounts").with(csrf())).andExpect(status().isCreated());
    }
}
```

## Post processors

- JWT resource server: `mvc.perform(get("/api/me").with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_read"))))` or `jwt().jwt(j -> j.claim("roles", List.of("admin")))`.
- OIDC login: `.with(oidcLogin().idToken(t -> t.claim("email", "a@b.c")))`; OAuth2 login: `oauth2Login()`.
- Opaque token: `opaqueToken()`; basic auth: `httpBasic("user", "pw")`; arbitrary user: `user("u").roles("X")`.
- Method security: `@WithMockUser(roles = "ADMIN")` on service tests, or `@WithUserDetails` to load a real user.
- Full-stack tests: `@SpringBootTest @AutoConfigureMockMvc` (Boot 4 package `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`). With `MockMvcTester` (AssertJ), use `.with(...)` similarly.
- Test the denied paths as much as the allowed ones; failing to authenticate is the most important behavior.
