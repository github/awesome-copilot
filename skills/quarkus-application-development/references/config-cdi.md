# Configuration and CDI (ArC)

## Configuration

Sources by precedence (high to low): system properties, environment variables, `.env` file in the working directory (loaded for packaged apps too, so do not ship it to production; put dev-only values under `%dev.`/`%test.` keys), `config/application.properties` next to the app, `application.properties` in the jar, MicroProfile defaults. Env var mapping: uppercase, non-alphanumerics become `_` (`greeting.max-length` -> `GREETING_MAX_LENGTH`).

### Profiles

`%dev.`, `%test.`, `%prod.` prefixes; `quarkus.profile=staging` or custom profiles work too. `quarkus:dev` is `dev`, tests are `test`, packaged apps are `prod`.

```properties
greeting.prefix=Hello
%dev.greeting.prefix=Dev hello
# Required in every profile (including custom ones such as staging): startup fails if API_KEY is missing
app.api-key=${API_KEY}
# Fallback only for dev and test
%dev.app.api-key=${API_KEY:dev-only-key}
%test.app.api-key=${API_KEY:dev-only-key}
```

Verified: with these settings a `@QuarkusTest` sees `Hello` (the `%dev` value is not applied in test) and `dev-only-key`.

### Secrets

Never commit real secrets. Supply them via env vars, Kubernetes secrets mounted as env/files, or a vault extension (`quarkus-vault`, `quarkus-kubernetes-config` with `quarkus.kubernetes-config.secrets`). Set no default in `%prod` so a missing secret fails fast. Property expressions that point at other keys are fine; keep credentials out of logs.

### `@ConfigMapping` vs `@ConfigProperty`

```java
@ConfigMapping(prefix = "greeting")
public interface GreetingConfig {
    String prefix();
    @WithDefault("10") int maxLength();     // greeting.max-length
    Optional<String> suffix();
    List<String> tags();                    // greeting.tags=a,b
}
```

Verified: injected with `@Inject GreetingConfig config`, `maxLength()` returned the value from `greeting.max-length`, `suffix()` was empty, `tags()` was `[a, b]`. Nested groups are nested interfaces; `Map<String,...>` is supported. Add `@Valid`-style constraints with hibernate-validator on mapping methods when present; startup fails on violations.

- Use `@ConfigMapping` for any group of related properties (typed, validated at startup, documented in one place).
- Use `@ConfigProperty(name = "app.api-key") String key;` for a single value or when you need `defaultValue`. Also works on constructor params.
- Unknown properties under a mapped prefix can fail startup; keep that validation enabled to catch typos.
- Build-time vs run-time: `quarkus.*` build-time properties (marked in the config reference) are fixed at package time. Check the extension's guide before assuming an env var override works in the container.

## CDI with ArC

ArC is a build-time CDI Lite-style implementation, not full CDI: no portable extensions (use build-compatible extensions or Quarkus build steps), no decorators on all paths, and some features are different.

- **Build-time resolution**: injection points are validated at build; missing or ambiguous beans fail the build, not runtime.
- **Unused bean removal**: beans with no injection point, no observer, no producer use, and not annotated `@Unremovable` are removed. If you look them up with `Arc.container().instance(...)` or `CDI.current().select(...)` by dynamic type, add `@io.quarkus.arc.Unremovable`. Disable globally with `quarkus.arc.remove-unused-beans=none` only as a last resort.
- **Scopes**: `@ApplicationScoped` is lazy and proxied (supports interceptors, mocking, circular deps); default choice. `@Singleton` is not proxied (no client proxy, so no lazy init through the proxy and `@InjectMock` is not applicable): use it for stateless holders only. `@RequestScoped` per HTTP request; `@Dependent` is the default pseudo-scope (new instance per injection point).
- **No private injection**: use package-private fields or constructors. Quarkus recommends against private injected fields because they force reflection-based access. Prefer constructor injection (`@Inject` optional with a single constructor).
- **Proxy pitfalls (verified)**: `@ApplicationScoped` beans are called through a subclass proxy; reading a public field of such a bean from outside returns the proxy's own (default) value. Expose state with methods. Avoid `final` on bean classes and methods and private no-arg constructors on normal-scoped beans.
- **Startup logic**: `@Startup` on a bean, or `void onStart(@Observes StartupEvent e)`. Eager beans must not do slow blocking I/O on the main thread without care.
- **Interceptors**: define an `@InterceptorBinding` annotation and an `@Interceptor` with `@Priority`; ArC applies them at build time to bean classes only (not to arbitrary objects). ArC supports intercepted self-invocation, so a bean calling its own intercepted method (`@Transactional`, `@Retry`, `@CacheResult`) still triggers the interceptor.
- **Producers/events**: `@Produces` and `@Observes` work as usual. `@Priority` only orders synchronous `@Observes` methods; it does not make them async. Asynchronous observers use `@ObservesAsync` and are notified only by `Event.fireAsync(...)` (which returns a `CompletionStage`); `Event.fire(...)` notifies only synchronous observers.
- **Testing**: `@InjectMock` (`quarkus-junit-mockito`; `quarkus-junit5-mockito` on old versions) works for normal-scoped beans. See `quarkus-dev-services-and-testing`.
- **Debugging**: the Dev UI (`/q/dev-ui`) ArC page lists beans, removed beans and observers.

Logging: JBoss Logging (`org.jboss.logging.Logger`) or `@Inject Logger`, configured with `quarkus.log.*`; do not add Logback/Log4j directly.
