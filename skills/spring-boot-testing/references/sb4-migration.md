# Spring Boot 4.0 Migration

Key testing changes when migrating from Spring Boot 3.x to 4.0. For the full migration workflow (annotations, packages, `@SpringBootTest` changes, `TestRestTemplate`), use the `spring-boot-4-migration` skill (`references/08-testing.md`).

## Dependency Changes

### Modular Test Starters

Spring Boot 4.0 introduces modular test starters:

**Before (3.x):**

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>
```

**After (4.0) - WebMvc Testing:**

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-webmvc-test</artifactId>
  <scope>test</scope>
</dependency>
```

**After (4.0) - REST Client Testing:**

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-restclient-test</artifactId>
  <scope>test</scope>
</dependency>
```

## Annotation Migration

`@MockBean`/`@SpyBean` are replaced by `@MockitoBean`/`@MockitoSpyBean`; see `spring-boot-4-migration` (`references/08-testing.md`) for the package changes.

## New Testing Features

### RestTestClient

Replaces TestRestTemplate (deprecated):

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class OrderIntegrationTest {
  
  @Autowired
  private RestTestClient restClient;
  
  @Test
  void shouldCreateOrder() {
    restClient
      .post()
      .uri("/orders")
      .body(new OrderRequest("Product", 2))
      .exchange()
      .expectStatus()
      .isCreated()
      .expectHeader()
      .location("/orders/1");
  }
}
```

## JUnit 6 Support

Spring Boot 4.0 uses JUnit 6 by default:

- JUnit 4 is deprecated (use JUnit Vintage temporarily)
- All JUnit 5 features still work
- Remove JUnit 4 dependencies for clean migration

## Testcontainers 2.0

Module naming changed:

**Before (1.x):**

```xml
<artifactId>postgresql</artifactId>
```

**After (2.0):**

```xml
<artifactId>testcontainers-postgresql</artifactId>
```

## Non-Singleton Bean Mocking

Spring Framework 7 allows mocking prototype-scoped beans:

```java
@Component
@Scope("prototype")
public class OrderProcessor { }

@SpringBootTest
class OrderServiceTest {
  @MockitoBean
  private OrderProcessor orderProcessor; // Now works!
}
```

## SpringExtension Context Changes

Extension context is now test-method scoped by default.

If tests fail with @Nested classes:

```java
@SpringExtensionConfig(useTestClassScopedExtensionContext = true)
@SpringBootTest
class OrderTest {
  // Use old behavior
}
```

## Migration Checklist

- [ ] Replace @MockBean with @MockitoBean
- [ ] Replace @SpyBean with @MockitoSpyBean
- [ ] Update Testcontainers dependencies to 2.0 naming
- [ ] Add modular test starters as needed
- [ ] Migrate TestRestTemplate to RestTestClient
- [ ] Remove JUnit 4 dependencies
- [ ] Update custom TestExecutionListener implementations
- [ ] Test @Nested class behavior

## Backward Compatibility

The classic starters (for example `spring-boot-starter-test-classic`) are a temporary aid that restores the Boot 3 module granularity only. They do not restore old packages or `@MockBean`/`@SpyBean`, and you still declare the technology starters. See the `spring-boot-4-migration` skill (`references/02-starters-and-removed-features.md`).
