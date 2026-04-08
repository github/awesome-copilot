# Instancio

Generate complex test objects automatically. Use when entities/DTOs have 3+ properties.

## When to Use

- Objects with **3 or more properties**
- Setting up test data for repositories
- Creating DTOs for controller tests
- Avoiding repetitive builder/setter calls

## Dependency

```xml
<dependency>
  <groupId>org.instancio</groupId>
  <artifactId>instancio-junit</artifactId>
  <version>5.5.1</version>
  <scope>test</scope>
</dependency>
```

## Basic Usage

### Simple Object

```java
final var order = Instancio.create(Order.class);
// All fields populated with random data
```

### List of Objects

```java
final var orders = Instancio.ofList(Order.class).size(5).create();
// 5 orders with random data
```

## Customizing Values

### Set Specific Fields

```java
final var order = Instancio.of(Order.class)
  .set(field(Order::getStatus), "PENDING")
  .set(field(Order::getTotal), new BigDecimal("99.99"))
  .create();
```

### Supply Generated Values

```java
final var order = Instancio.of(Order.class)
  .supply(field(Order::getEmail), () -> "user" + UUID.randomUUID() + "@test.com")
  .create();
```

### Ignore Fields

```java
final var order = Instancio.of(Order.class)
  .ignore(field(Order::getId)) // Let DB generate
  .create();
```

## Complex Objects

### Nested Objects

```java
final var order = Instancio.of(Order.class)
  .set(field(Order::getCustomer), Instancio.create(Customer.class))
  .set(field(Order::getItems), Instancio.ofList(OrderItem.class).size(3).create())
  .create();
```

### All Fields Random

```java
// When you need fully random but valid data
final var randomOrder = Instancio.create(Order.class);
// Customer, items, addresses - all populated
```

## Spring Boot Integration

### Repository Test Setup

```java
@DataJpaTest
@AutoConfigureTestDatabase
@Testcontainers
class OrderRepositoryTest {
  
  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18");
  
  @Autowired
  private OrderRepository orderRepository;
  
  @Test
  void shouldFindOrdersByStatus() {
    // Given: Create 10 random orders with PENDING status
    final var orders = Instancio.ofList(Order.class)
      .size(10)
      .set(field(Order::getStatus), "PENDING")
      .create();
    
    orderRepository.saveAll(orders);
    
    // When
    final var found = orderRepository.findByStatus("PENDING");
    
    // Then
    assertThat(found).hasSize(10);
  }
}
```

### Controller Test Setup

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
  
  @Autowired
  private MockMvcTester mvc;
  
  @MockitoBean
  private OrderService orderService;
  
  @Test
  void shouldReturnOrder() {
    // Given: Random order with specific ID
    Order order = Instancio.of(Order.class)
      .set(field(Order::getId), 1L)
      .create();
    
    given(orderService.findById(1L)).willReturn(order);
    
    // When/Then
    assertThat(mvc.get().uri("/orders/1"))
      .hasStatus(HttpStatus.OK)
      .bodyJson()
      .convertTo(OrderResponse.class)
      .satisfies(response -> {
        assertThat(response.getId()).isEqualTo(1L);
      });
  }
}
```

## Patterns

### Builder Pattern Alternative

```java
// Instead of:
Order order = Order.builder()
  .id(1L)
  .status("PENDING")
  .customer(Customer.builder().name("John").build())
  .items(List.of(
    OrderItem.builder().product("A").price(10).build(),
    OrderItem.builder().product("B").price(20).build()
  ))
  .build();

// Use:
Order order = Instancio.of(Order.class)
  .set(field(Order::getId), 1L)
  .set(field(Order::getStatus), "PENDING")
  .create();
// Customer and items auto-generated
```

### Seeded Data

```java
// Consistent "random" data for reproducible tests
Order order = Instancio.of(Order.class)
  .withSeed(12345L)
  .create();
// Same data every test run with seed 12345
```

## Common Patterns

### Email Generation

```java
String email = Instancio.gen().net().email();
```

### Date Generation

```java
LocalDateTime createdAt = Instancio.gen().temporal()
  .localDateTime()
  .past()
  .create();
```

### String Patterns

```java
String phone = Instancio.gen().text().pattern("+1-###-###-####");
```

## Comparison

| Approach | Lines of Code | Maintainability |
| -------- | ------------- | --------------- |
| Manual setters | 10-20 | Low |
| Builder pattern | 5-10 | Medium |
| **Instancio** | 2-5 | **High** |

## Best Practices

1. **Use for 3+ property objects** - Not worth it for simple objects
2. **Set only what's relevant** - Let Instancio fill the rest
3. **Use with Testcontainers** - Great for database seeding
4. **Set IDs explicitly** - When testing specific scenarios
5. **Ignore auto-generated fields** - Like createdAt, updatedAt

## Links

- [Instancio Documentation](https://www.instancio.org/)
- [JUnit 5 Extension](https://www.instancio.org/user-guide/#junit-integration)
