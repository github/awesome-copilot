# REST API (Spring MVC)

Verified on Boot 4.1.1 (Framework 7) and, where noted, Boot 3.5.16 (Framework 6.2). Security of endpoints: `spring-security`. Test slices (`@WebMvcTest`, `MockMvcTester`, `@RestClientTest`): `spring-boot-testing`.

## Starters and packages (Boot 3 vs 4)

| | Boot 3 | Boot 4 |
| --- | --- | --- |
| Web starter | `spring-boot-starter-web` | `spring-boot-starter-webmvc` (+ `spring-boot-starter-webmvc-test`) |
| `RestClient` auto-config | Boot 3.2+ only, in the web starter; unavailable on 3.0/3.1 | add `spring-boot-starter-restclient` |
| `@WebMvcTest` | `org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest` | `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest` (also `AutoConfigureMockMvc`) |
| Mock a bean | `@MockitoBean` (3.4+; `@MockBean` removed in 4) | `@MockitoBean` (`org.springframework.test.context.bean.override.mockito`) |
| JSON | Jackson 2 `ObjectMapper` | Jackson 3 `tools.jackson.databind.json.JsonMapper` bean |

Jackson 2 databind may still be on the classpath transitively (for example through Spring for Apache Kafka), which is not a reason to code against it in Boot 4. A temporary Jackson 2 bridge exists (`spring-boot-jackson2`, see the Boot 4 migration guide and `spring-boot-4-migration`).

## Controllers and validation

```java
public record CreateOrderRequest(@NotBlank String customer, @Positive BigDecimal total) {}

@RestController
@RequestMapping("/api/orders")
class OrderController {
	private final OrderService orders;
	OrderController(OrderService orders) { this.orders = orders; }

	@PostMapping
	ResponseEntity<OrderSummary> create(@Valid @RequestBody CreateOrderRequest req) {
		var created = orders.create(req);
		return ResponseEntity.created(URI.create("/api/orders/" + created.id())).body(created);
	}
}
```

- Nouns for resources, plural, HTTP verbs for actions; `201` + `Location` on create, `204` on delete, `404` via exception, not `null`.
- Request/response types are records, separate from entities. Bean Validation (`jakarta.validation.constraints.*`) goes on the record components. In Framework 6.1+ (Boot 3.2+), put constraints directly on `@RequestParam`/`@PathVariable` parameters and omit class-level `@Validated`: built-in MVC method validation raises `HandlerMethodValidationException`. Class-level `@Validated` instead enables AOP validation, which raises `ConstraintViolationException` by default and needs its own error handler. On older Framework versions, use that AOP approach and map the exception to HTTP 400 explicitly.
- Never accept unbounded input: cap `size` for pagination, limit request body size at the server/proxy.
- Return `Page<T>` only if exposing Spring Data's page JSON is acceptable; for a stable public contract return your own `record PageResponse<T>(List<T> content, long total, int page, int size)`. Pagination parameters and stable sorting: `data.md`.

## Errors: ProblemDetail (RFC 9457)

```java
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler(OrderNotFoundException.class)
	ProblemDetail notFound(OrderNotFoundException ex) {
		var pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
		pd.setTitle("Order not found");
		return pd;
	}
}
```

- Extending `ResponseEntityExceptionHandler` turns Spring MVC's own exceptions (validation `MethodArgumentNotValidException` and, in Framework 6.1+, `HandlerMethodValidationException`, malformed JSON, unsupported media type, invalid API version) into `application/problem+json` (verified: validation errors give status 400 problem details; the unknown-API-version error gives 400). Test invalid query/path parameters as well as invalid request bodies; class-level `@Validated` must not divert them to an unhandled AOP exception.
- Verified the same advice works unchanged on Boot 3.5.16. Do not return exception messages that contain internals (SQL, class names) in `detail`; log them, return a stable message, and add a custom property (`pd.setProperty("code", "ORDER_NOT_FOUND")`) for clients.
- Test with `jsonPath("$.status")`, `jsonPath("$.title")` and `content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)`.

## API versioning (Boot 4 / Framework 7 only)

Framework 7 has first-class API versioning; it does not exist in Framework 6 (verified: `@GetMapping(version = ...)` does not compile on Boot 3.5.16, use URL prefixes such as `/api/v1/...` there).

```properties
spring.mvc.apiversion.use.header=X-API-Version
spring.mvc.apiversion.default=1
spring.mvc.apiversion.supported=1,2
```

```java
@GetMapping(value = "/{id}", version = "1")  OrderSummary getV1(@PathVariable Long id) { ... }
@GetMapping(value = "/{id}", version = "2")  OrderSummary getV2(@PathVariable Long id) { ... }
```

Alternatives to the header are `...use.path-segment`, `...use.query-parameter` and `...use.media-type-parameter`. Verified: a request without the header uses the default version, and an unsupported version (`3`) returns a `400` problem detail ("Invalid API version"). Version only when a breaking change is unavoidable; additive changes do not need a new version.

## Calling other services

### RestClient (Boot 3.2+/4)

`RestClient` and `RestClientAdapter` require Framework 6.1+; Boot's builder auto-configuration starts in 3.2. On Boot 3.0/3.1, retain the project's existing `RestTemplate` rather than generating this example or implicitly upgrading dependencies.

On Boot 4 add `spring-boot-starter-restclient` (it was in the verified build, which injected the builder; Boot 3.2+: `RestClient.Builder` comes with the web starter). Inject the **builder** (`RestClient.Builder`), never create clients without it, so that observability and customizers apply (`spring-observability`). Set base URL and timeouts through properties/customizers, not per call. Prefer `RestClient` over `RestTemplate` (maintenance mode) and over `WebClient` unless you are reactive.

```java
@Bean
RestClient ratesClient(RestClient.Builder builder) {
	return builder.baseUrl("https://rates.example.com").build();
}
// usage: ratesClient.get().uri("/rates/{c}", "EUR").retrieve().body(Rate.class);
```

`retrieve()` throws `RestClientResponseException` on 4xx/5xx; map to your own exceptions at the boundary.

### HTTP interfaces (`@HttpExchange`)

```java
@HttpExchange("/rates")
public interface RatesClient {
	record Rate(String currency, double value) {}

	@GetExchange("/{currency}")
	Rate get(@PathVariable String currency);
}
```

- **Boot 4 / Framework 7:** register with `@ImportHttpServices` and configure the URL in properties (verified):
  ```java
  @Configuration(proxyBeanMethods = false)
  @ImportHttpServices(group = "rates", types = RatesClient.class)
  class HttpClientsConfig {}
  ```
  ```properties
  spring.http.serviceclient.rates.base-url=https://rates.example.com
  ```
  then inject `RatesClient` like any bean.
- **Boot 3.2+ / Framework 6.1+:** `@ImportHttpServices` does not exist (verified). Build the proxy manually:
  ```java
  var client = HttpServiceProxyFactory.builderFor(RestClientAdapter.create(restClient)).build().createClient(RatesClient.class);
  ```
  (`org.springframework.web.client.support.RestClientAdapter`, same on Boot 4.)
- **Boot 3.0/3.1 / Framework 6.0:** if WebClient is already available, HTTP interfaces can use `WebClientAdapter` with the Framework 6.0 `HttpServiceProxyFactory` API. Otherwise retain the existing `RestTemplate` setup; do not introduce `RestClientAdapter` or add WebFlux implicitly.
- **Tests (Boot 3.2+/4):** `MockRestServiceServer.bindTo(RestClient.Builder)` records and answers requests without a network (verified for both the manual and the Boot 4 setups); use WireMock only for contract-style tests with real HTTP.

## OpenAPI (springdoc)

springdoc is not Spring-Boot-managed: pick the line that matches the Boot major from the springdoc compatibility table and pin it. Verified: `org.springdoc:springdoc-openapi-starter-webmvc-ui` 3.1.1 on Boot 4.1.1 serves `/v3/api-docs` including controller paths (springdoc 2.x targets Boot 3). Expose Swagger UI (`/swagger-ui.html`) only in non-production profiles or behind authentication; allow the paths in `spring-security`. Document with `@Operation`/`@ApiResponse` sparingly; the controller signature and validation annotations already feed the schema.

## Null-safety with JSpecify (Framework 7 / Boot 4)

Spring Framework 7 and Boot 4 annotate their APIs with JSpecify (`org.jspecify.annotations`): everything is non-null unless marked `@Nullable`. In your code:

- Add `@NullMarked` in `package-info.java` (verified to compile on Boot 4.1.1 where `org.jspecify:jspecify` is already on the classpath) and mark nullable parameters, returns and fields with `org.jspecify.annotations.Nullable`.
- Replace `org.springframework.lang.Nullable`/`NonNull` (deprecated in Framework 7) with JSpecify when touching those files.
- JSpecify is documentation for tools (IDE, NullAway, Error Prone) and does **not** validate at runtime. For request validation keep using `jakarta.validation.constraints.NotNull`/`@NotBlank`. Optional: add NullAway to the build only if the project asks for it.
