# Test Slices Overview

Quick reference for selecting the right Spring Boot test slice.

## Decision Matrix

| Annotation | Use When | Loads | Speed |
| ---------- | -------- | ----- | ----- |
| **None** (plain JUnit) | Testing pure business logic | Nothing | Fastest |
| `@WebMvcTest` | Controller + HTTP layer | Controllers, MVC, Jackson | Fast |
| `@DataJpaTest` | Repository queries | Repositories, JPA, DataSource | Fast |
| `@RestClientTest` | REST client code | RestTemplate/RestClient, Jackson | Fast |
| `@JsonTest` | JSON serialization | ObjectMapper only | Fastest slice |
| `@WebFluxTest` | Reactive controllers | Controllers, WebFlux | Fast |
| `@DataJdbcTest` | JDBC repositories | Repositories, JDBC | Fast |
| `@DataMongoTest` | MongoDB repositories | Repositories, MongoDB | Fast |
| `@DataRedisTest` | Redis repositories | Repositories, Redis | Fast |
| `@SpringBootTest` | Full integration | Entire application | Slow |

## Selection Guide

### Use NO Annotation (Plain Unit Test)

```java
class PriceCalculatorTest {
  private PriceCalculator calculator = new PriceCalculator();
  
  @Test
  void shouldApplyDiscount() {
    var result = calculator.applyDiscount(100, 0.1);
    assertThat(result).isEqualTo(new BigDecimal("90.00"));
  }
}
```

**When**: Pure business logic, no dependencies or simple dependencies mockable via constructor injection.

### Use @WebMvcTest

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
  @Autowired private MockMvcTester mvc;
  @MockitoBean private OrderService orderService;
}
```

**When**: Testing request mapping, validation, JSON mapping, security, filters.

**What you get**: MockMvc, ObjectMapper, Spring Security (if present), exception handlers.

### Use @DataJpaTest

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class OrderRepositoryTest {
  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18");
}
```

**When**: Testing custom JPA queries, entity mappings, transaction behavior, cascade operations.

**What you get**: Repository beans, EntityManager, TestEntityManager, transaction support.

### Use @RestClientTest

```java
@RestClientTest(WeatherService.class)
class WeatherServiceTest {
  @Autowired private WeatherService weatherService;
  @Autowired private MockRestServiceServer server;
}
```

**When**: Testing REST clients that call external APIs.

**What you get**: MockRestServiceServer to stub HTTP responses.

### Use @JsonTest

```java
@JsonTest
class OrderJsonTest {
  @Autowired private JacksonTester<Order> json;
}
```

**When**: Testing custom serializers/deserializers, complex JSON mapping.

### Use @SpringBootTest

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class OrderIntegrationTest {
  @Autowired private RestTestClient restClient;
}
```

**When**: Testing full request flow, security filters, database interactions together.

**What you get**: Full application context, embedded server (optional), real beans.

## Common Mistakes

1. **Using @SpringBootTest for everything** - Slows down your test suite unnecessarily
2. **@WebMvcTest without mocking services** - Causes context loading failures
3. **@DataJpaTest with @MockBean** - Defeats the purpose (you want real repositories)
4. **Multiple slices in one test** - Each slice is a separate test class

## Java 25 Features in Tests

### Records for Test Data

```java
record OrderRequest(String product, int quantity) {}
record OrderResponse(Long id, String status, BigDecimal total) {}
```

### Pattern Matching in Tests

```java
@Test
void shouldHandleDifferentOrderTypes() {
  var order = orderService.create(new OrderRequest("Product", 2));
  
  switch (order) {
    case PhysicalOrder po -> assertThat(po.getShippingAddress()).isNotNull();
    case DigitalOrder do_ -> assertThat(do_.getDownloadLink()).isNotNull();
    default -> throw new IllegalStateException("Unknown order type");
  }
}
```

### Text Blocks for JSON

```java
@Test
void shouldParseComplexJson() {
  var json = """
    {
      "id": 1,
      "status": "PENDING",
      "items": [
        {"product": "Laptop", "price": 999.99},
        {"product": "Mouse", "price": 29.99}
      ]
    }
    """;
  
  assertThat(mvc.post().uri("/orders")
    .contentType(APPLICATION_JSON)
    .content(json))
    .hasStatus(CREATED);
}
```

### Sequenced Collections

```java
@Test
void shouldReturnOrdersInSequence() {
  var orders = orderRepository.findAll();
  
  assertThat(orders.getFirst().getStatus()).isEqualTo("NEW");
  assertThat(orders.getLast().getStatus()).isEqualTo("COMPLETED");
  assertThat(orders.reversed().getFirst().getStatus()).isEqualTo("COMPLETED");
}
```

## Dependencies by Slice

```xml
<!-- WebMvcTest -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-webmvc-test</artifactId>
  <scope>test</scope>
</dependency>

<!-- DataJpaTest -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- RestClientTest -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-restclient-test</artifactId>
  <scope>test</scope>
</dependency>

<!-- Testcontainers -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-testcontainers</artifactId>
  <scope>test</scope>
</dependency>
```
