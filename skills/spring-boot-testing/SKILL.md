---
name: spring-boot-testing
description: 'Expert Spring Boot testing specialist that selects the best testing techniques for your situation: test slices, Testcontainers with @ServiceConnection, Failsafe integration tests, MockitoBean, JUnit and AssertJ. Written for Spring Boot 4 with notes for Boot 3.'
---

# Spring Boot Testing

This skill provides expert guidance for testing Spring Boot applications with modern patterns and best practices. Examples target Spring Boot 4; see the compatibility note below for Boot 3.

## Compatibility: detect first

Read the project's Spring Boot version and test dependencies before writing tests, and do not upgrade them implicitly.

| | Spring Boot 3.x | Spring Boot 4.x |
|--|-----------------|-----------------|
| JUnit | 5 (Jupiter) | 6 by default (same `org.junit.jupiter.api` annotations; JUnit 5 tests keep working) |
| Mock beans | `@MockitoBean` / `@MockitoSpyBean` from 3.4 (Spring Framework 6.2); `@MockBean` / `@SpyBean` are deprecated | `@MockitoBean` replaces `@MockBean` (do not use the old ones) |
| Test starters | `spring-boot-starter-test` covers everything | modular: add `spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`, ... |
| Slice imports | `org.springframework.boot.test.autoconfigure...` | moved, e.g. `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest` |
| Testcontainers | 1.x names | 2.x names (`testcontainers-postgresql`) |

Details: [references/sb4-migration.md](references/sb4-migration.md), [references/mockitobean.md](references/mockitobean.md).

## Core Principles

1. **Test Pyramid**: Unit (fast) > Slice (focused) > Integration (complete)
2. **Right Tool**: Use the narrowest slice that gives you confidence
3. **AssertJ Style**: Fluent, readable assertions over verbose matchers
4. **Modern APIs**: Prefer MockMvcTester and RestTestClient over legacy alternatives

## Which Test Slice?

| Scenario | Annotation | Reference |
|----------|------------|-----------|
| Controller + HTTP semantics | `@WebMvcTest` | [references/webmvctest.md](references/webmvctest.md) |
| Repository + JPA queries | `@DataJpaTest` | [references/datajpatest.md](references/datajpatest.md) |
| REST client + external APIs | `@RestClientTest` | [references/restclienttest.md](references/restclienttest.md) |
| JSON (de)serialization | `@JsonTest` | [references/test-slices-overview.md](references/test-slices-overview.md) |
| Full application | `@SpringBootTest` | [references/test-slices-overview.md](references/test-slices-overview.md) |

## Test Slices Reference

- [references/test-slices-overview.md](references/test-slices-overview.md) - Decision matrix and comparison
- [references/webmvctest.md](references/webmvctest.md) - Web layer with MockMvc
- [references/datajpatest.md](references/datajpatest.md) - Data layer with Testcontainers
- [references/restclienttest.md](references/restclienttest.md) - REST client testing

## Testing Tools Reference

- [references/mockmvc-tester.md](references/mockmvc-tester.md) - AssertJ-style MockMvc (3.2+)
- [references/mockmvc-classic.md](references/mockmvc-classic.md) - Traditional MockMvc (pre-3.2)
- [references/resttestclient.md](references/resttestclient.md) - Spring Boot 4+ REST client
- [references/mockitobean.md](references/mockitobean.md) - Mocking dependencies

## Assertion Libraries

- [references/assertj-basics.md](references/assertj-basics.md) - Scalars, strings, booleans, dates
- [references/assertj-collections.md](references/assertj-collections.md) - Lists, Sets, Maps, arrays

## Testcontainers and integration tests

- [references/testcontainers-jdbc.md](references/testcontainers-jdbc.md) - `@ServiceConnection` quickstart, PostgreSQL, MySQL, etc.
- [references/failsafe-integration-tests.md](references/failsafe-integration-tests.md) - `*IT` classes silently skipped unless Failsafe is bound; run `./mvnw verify`

> **Maven gotcha:** Failsafe declared only in `<pluginManagement>` means `*IT` tests never run. Declare it in `<build><plugins>` with the `integration-test` and `verify` goals and run `./mvnw verify`.

## Test Data Generation

- [references/instancio.md](references/instancio.md) - Generate complex test objects (3+ properties)

## Performance & Migration

- [references/context-caching.md](references/context-caching.md) - Speed up test suites
- [references/sb4-migration.md](references/sb4-migration.md) - Spring Boot 4.0 changes

## Quick Decision Tree

```
Testing a controller endpoint?
  Yes → @WebMvcTest with MockMvcTester

Testing repository queries?
  Yes → @DataJpaTest with Testcontainers (real DB)

Testing business logic in service?
  Yes → Plain JUnit + Mockito (no Spring context)

Testing external API client?
  Yes → @RestClientTest with MockRestServiceServer

Testing JSON mapping?
  Yes → @JsonTest

Need full integration test?
  Yes → @SpringBootTest with minimal context config
```

## Spring Boot 4 Highlights

- **RestTestClient**: Modern alternative to TestRestTemplate
- **@MockitoBean**: Replaces @MockBean (deprecated)
- **MockMvcTester**: AssertJ-style assertions for web tests
- **Modular starters**: Technology-specific test starters
- **Context pausing**: Automatic pausing of cached contexts (Spring Framework 7)

## Testing Best Practices

### Code Complexity Assessment

When a method or class is too complex to test effectively:

1. **Analyze complexity** - If you need more than 5-7 test cases to cover a single method, it's likely too complex
2. **Recommend refactoring** - Suggest breaking the code into smaller, focused functions
3. **User decision** - If the user agrees to refactor, help identify extraction points
4. **Proceed if needed** - If the user decides to continue with the complex code, implement tests despite the difficulty

**Example of refactoring recommendation:**
```java
// Before: Complex method hard to test
public Order processOrder(OrderRequest request) {
  // Validation, discount calculation, payment, inventory, notification...
  // 50+ lines of mixed concerns
}

// After: Refactored into testable units
public Order processOrder(OrderRequest request) {
  validateOrder(request);
  var order = createOrder(request);
  applyDiscount(order);
  processPayment(order);
  updateInventory(order);
  sendNotification(order);
  return order;
}
```

### Avoid Code Redundancy

Create helper methods for commonly used objects and mock setup to enhance readability and maintainability.

### Test Organization with @DisplayName

Use descriptive display names to clarify test intent:

```java
@Test
@DisplayName("Should calculate discount for VIP customer")
void shouldCalculateDiscountForVip() { }

@Test
@DisplayName("Should reject order when customer has insufficient credit")
void shouldRejectOrderForInsufficientCredit() { }
```

### Test Coverage Order

Always structure tests in this order:

1. **Main scenario** - The happy path, most common use case
2. **Other paths** - Alternative valid scenarios, edge cases
3. **Exceptions/Errors** - Invalid inputs, error conditions, failure modes

### Test Production Scenarios

Write tests with real production scenarios in mind. This makes tests more relatable and helps understand code behavior in actual production cases.

### Test Coverage Goals

Aim for 80% code coverage as a practical balance between quality and effort. Higher coverage is beneficial but not the only goal.

Use Jacoco maven plugin for coverage reporting and tracking.


**Coverage Rules:**
- 80+% coverage minimum
- Focus on meaningful assertions, not just execution

**What to Prioritize:**
1. Business-critical paths (payment processing, order validation)
2. Complex algorithms (pricing, discount calculations)
3. Error handling (exceptions, edge cases)
4. Integration points (external APIs, databases)

## Dependencies (Spring Boot 4)

See also: <https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html> and <https://docs.spring.io/spring-boot/reference/features/dev-services.html>.

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>

<!-- For WebMvc tests -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-webmvc-test</artifactId>
  <scope>test</scope>
</dependency>

<!-- For Testcontainers -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-testcontainers</artifactId>
  <scope>test</scope>
</dependency>
```
