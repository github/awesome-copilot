# AssertJ Basics

Fluent assertions for readable, maintainable tests.

## Basic Assertions

### Object Equality

```java
assertThat(order.getStatus()).isEqualTo("PENDING");
assertThat(order.getId()).isNotEqualTo(0);
assertThat(order).isEqualTo(expectedOrder);
assertThat(order).isNotNull();
assertThat(nullOrder).isNull();
```

### String Assertions

```java
assertThat(order.getDescription())
  .isEqualTo("Test Order")
  .startsWith("Test")
  .endsWith("Order")
  .contains("Test")
  .hasSize(10)
  .matches("[A-Za-z ]+");
```

### Number Assertions

```java
assertThat(order.getAmount())
  .isEqualTo(99.99)
  .isGreaterThan(50)
  .isLessThan(100)
  .isBetween(50, 100)
  .isPositive()
  .isNotZero();
```

### Boolean Assertions

```java
assertThat(order.isActive()).isTrue();
assertThat(order.isDeleted()).isFalse();
```

## Date/Time Assertions

```java
assertThat(order.getCreatedAt())
  .isEqualTo(LocalDateTime.of(2024, 1, 15, 10, 30))
  .isBefore(LocalDateTime.now())
  .isAfter(LocalDateTime.of(2024, 1, 1))
  .isCloseTo(LocalDateTime.now(), within(5, ChronoUnit.SECONDS));
```

## Optional Assertions

```java
Optional<Order> maybeOrder = orderService.findById(1L);

assertThat(maybeOrder)
  .isPresent()
  .hasValueSatisfying(order -> {
    assertThat(order.getId()).isEqualTo(1L);
  });

assertThat(orderService.findById(999L)).isEmpty();
```

## Exception Assertions

### JUnit 5 Exception Handling

```java
@Test
void shouldThrowException() {
  OrderService service = new OrderService();
  
  assertThatThrownBy(() -> service.findById(999L))
    .isInstanceOf(OrderNotFoundException.class)
    .hasMessage("Order 999 not found")
    .hasMessageContaining("999");
}
```

### AssertJ Exception Handling

```java
@Test
void shouldThrowExceptionWithCause() {
  assertThatExceptionOfType(OrderProcessingException.class)
    .isThrownBy(() -> service.processOrder(invalidOrder))
    .withCauseInstanceOf(ValidationException.class);
}
```

## Custom Assertions

Create domain-specific assertions for reusable test code:

```java
public class OrderAssert extends AbstractAssert<OrderAssert, Order> {
  
  public static OrderAssert assertThat(Order actual) {
    return new OrderAssert(actual);
  }
  
  private OrderAssert(Order actual) {
    super(actual, OrderAssert.class);
  }
  
  public OrderAssert isPending() {
    isNotNull();
    if (!"PENDING".equals(actual.getStatus())) {
      failWithMessage("Expected order status to be PENDING but was %s", actual.getStatus());
    }
    return this;
  }
  
  public OrderAssert hasTotal(BigDecimal expected) {
    isNotNull();
    if (!expected.equals(actual.getTotal())) {
      failWithMessage("Expected total %s but was %s", expected, actual.getTotal());
    }
    return this;
  }
}
```

Usage:

```java
OrderAssert.assertThat(order)
  .isPending()
  .hasTotal(new BigDecimal("99.99"));
```

## Soft Assertions

Collect multiple failures before failing:

```java
@Test
void shouldValidateOrder() {
  Order order = orderService.findById(1L);
  
  SoftAssertions.assertSoftly(softly -> {
    softly.assertThat(order.getId()).isEqualTo(1L);
    softly.assertThat(order.getStatus()).isEqualTo("PENDING");
    softly.assertThat(order.getItems()).isNotEmpty();
  });
}
```

## Satisfies Pattern

```java
assertThat(order)
  .satisfies(o -> {
    assertThat(o.getId()).isPositive();
    assertThat(o.getStatus()).isNotBlank();
    assertThat(o.getCreatedAt()).isNotNull();
  });
```

## Using with Spring

```java
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class OrderServiceTest {
  
  @Autowired
  private OrderService orderService;
  
  @Test
  void shouldCreateOrder() {
    Order order = orderService.create(new OrderRequest("Product", 2));
    
    assertThat(order)
      .isNotNull()
      .extracting(Order::getId, Order::getStatus)
      .containsExactly(1L, "PENDING");
  }
}
```

## Static Import

Always use static import for clean assertions:

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
```

## Key Benefits

1. **Readable**: Sentence-like structure
2. **Type-safe**: IDE autocomplete works
3. **Rich API**: Many built-in assertions
4. **Extensible**: Custom assertions for your domain
5. **Better Errors**: Clear failure messages
