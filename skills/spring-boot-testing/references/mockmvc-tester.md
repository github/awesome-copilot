# MockMvcTester

AssertJ-style testing for Spring MVC controllers (Spring Boot 3.2+).

## Overview

MockMvcTester provides fluent, AssertJ-style assertions for web layer testing. More readable and type-safe than traditional MockMvc.

**Recommended Pattern**: Convert JSON to real objects and assert with AssertJ:

```java
assertThat(mvc.get().uri("/orders/1"))
  .hasStatus(HttpStatus.OK)
  .bodyJson()
  .convertTo(OrderResponse.class)
  .satisfies(response -> {
    assertThat(response.getTotalToPay()).isEqualTo(expectedAmount);
    assertThat(response.getItems()).isNotEmpty();
  });
```

## Basic Usage

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
  
  @Autowired
  private MockMvcTester mvc;
  
  @MockitoBean
  private OrderService orderService;
}
```

## Recommended: Object Conversion Pattern

### Single Object Response

```java
@Test
void shouldGetOrder() {
  given(orderService.findById(1L)).willReturn(new Order(1L, "PENDING", 99.99));
  
  assertThat(mvc.get().uri("/orders/1"))
    .hasStatus(HttpStatus.OK)
    .bodyJson()
    .convertTo(OrderResponse.class)
    .satisfies(response -> {
      assertThat(response.getId()).isEqualTo(1L);
      assertThat(response.getStatus()).isEqualTo("PENDING");
      assertThat(response.getTotalToPay()).isEqualTo(new BigDecimal("99.99"));
    });
}
```

### List Response

```java
@Test
void shouldGetAllOrders() {
  given(orderService.findAll()).willReturn(Arrays.asList(
    new Order(1L, "PENDING"),
    new Order(2L, "COMPLETED")
  ));
  
  assertThat(mvc.get().uri("/orders"))
    .hasStatus(HttpStatus.OK)
    .bodyJson()
    .convertTo(new TypeReference<List<OrderResponse>>() {})
    .satisfies(orders -> {
      assertThat(orders).hasSize(2);
      assertThat(orders.get(0).getStatus()).isEqualTo("PENDING");
      assertThat(orders.get(1).getStatus()).isEqualTo("COMPLETED");
    });
}
```

### Nested Objects

```java
@Test
void shouldGetOrderWithCustomer() {
  assertThat(mvc.get().uri("/orders/1"))
    .hasStatus(HttpStatus.OK)
    .bodyJson()
    .convertTo(OrderResponse.class)
    .satisfies(response -> {
      assertThat(response.getCustomer()).isNotNull();
      assertThat(response.getCustomer().getName()).isEqualTo("John Doe");
      assertThat(response.getCustomer().getAddress().getCity()).isEqualTo("Berlin");
    });
}
```

### Complex Assertions

```java
@Test
void shouldCalculateOrderTotal() {
  assertThat(mvc.get().uri("/orders/1/calculate"))
    .hasStatus(HttpStatus.OK)
    .bodyJson()
    .convertTo(CalculationResponse.class)
    .satisfies(calc -> {
      assertThat(calc.getSubtotal()).isEqualTo(new BigDecimal("100.00"));
      assertThat(calc.getTax()).isEqualTo(new BigDecimal("19.00"));
      assertThat(calc.getTotalToPay()).isEqualTo(new BigDecimal("119.00"));
      assertThat(calc.getItems()).allMatch(item -> item.getPrice().compareTo(BigDecimal.ZERO) > 0);
    });
}
```

## HTTP Methods

### POST with Request Body

```java
@Test
void shouldCreateOrder() {
  given(orderService.create(any())).willReturn(1L);
  
  assertThat(mvc.post().uri("/orders")
    .contentType(MediaType.APPLICATION_JSON)
    .content("{\"product\": \"Laptop\", \"quantity\": 2}"))
    .hasStatus(HttpStatus.CREATED)
    .hasHeader("Location", "/orders/1");
}
```

### PUT Request

```java
@Test
void shouldUpdateOrder() {
  assertThat(mvc.put().uri("/orders/1")
    .contentType(MediaType.APPLICATION_JSON)
    .content("{\"status\": \"COMPLETED\"}"))
    .hasStatus(HttpStatus.OK);
}
```

### DELETE Request

```java
@Test
void shouldDeleteOrder() {
  assertThat(mvc.delete().uri("/orders/1"))
    .hasStatus(HttpStatus.NO_CONTENT);
}
```

## Status Assertions

```java
assertThat(mvc.get().uri("/orders/1"))
  .hasStatusOk()                    // 200
  .hasStatus(HttpStatus.OK)         // 200
  .hasStatus2xxSuccessful()         // 2xx
  .hasStatusBadRequest()            // 400
  .hasStatusNotFound()              // 404
  .hasStatusUnauthorized()          // 401
  .hasStatusForbidden()             // 403
  .hasStatus(HttpStatus.CREATED);   // 201
```

## Content Type Assertions

```java
assertThat(mvc.get().uri("/orders/1"))
  .hasContentType(MediaType.APPLICATION_JSON)
  .hasContentTypeCompatibleWith(MediaType.APPLICATION_JSON);
```

## Header Assertions

```java
assertThat(mvc.post().uri("/orders"))
  .hasHeader("Location", "/orders/123")
  .hasHeader("X-Request-Id", matchesPattern("[a-z0-9-]+"));
```

## Alternative: JSON Path (Use Sparingly)

Only use when you cannot convert to a typed object:

```java
assertThat(mvc.get().uri("/orders/1"))
  .hasStatusOk()
  .bodyJson()
  .extractingPath("$.customer.address.city")
  .asString()
  .isEqualTo("Berlin");
```

## Request Parameters

```java
// Query parameters
assertThat(mvc.get().uri("/orders?status=PENDING&page=0"))
  .hasStatusOk();

// Path parameters
assertThat(mvc.get().uri("/orders/{id}", 1L))
  .hasStatusOk();

// Headers
assertThat(mvc.get().uri("/orders/1")
  .header("X-Api-Key", "secret"))
  .hasStatusOk();
```

## Request Body with JacksonTester

```java
@Autowired
private JacksonTester<OrderRequest> json;

@Test
void shouldCreateOrder() {
  OrderRequest request = new OrderRequest("Laptop", 2);
  
  assertThat(mvc.post().uri("/orders")
    .contentType(MediaType.APPLICATION_JSON)
    .content(json.write(request).getJson()))
    .hasStatus(HttpStatus.CREATED);
}
```

## Error Responses

```java
@Test
void shouldReturnValidationErrors() {
  given(orderService.findById(999L))
    .willThrow(new OrderNotFoundException(999L));
  
  assertThat(mvc.get().uri("/orders/999"))
    .hasStatus(HttpStatus.NOT_FOUND)
    .bodyJson()
    .convertTo(ErrorResponse.class)
    .satisfies(error -> {
      assertThat(error.getMessage()).isEqualTo("Order 999 not found");
      assertThat(error.getCode()).isEqualTo("ORDER_NOT_FOUND");
    });
}
```

## Validation Error Testing

```java
@Test
void shouldRejectInvalidOrder() {
  OrderRequest invalidRequest = new OrderRequest("", -1);
  
  assertThat(mvc.post().uri("/orders")
    .contentType(MediaType.APPLICATION_JSON)
    .content(json.write(invalidRequest).getJson()))
    .hasStatus(HttpStatus.BAD_REQUEST)
    .bodyJson()
    .convertTo(ValidationErrorResponse.class)
    .satisfies(errors -> {
      assertThat(errors.getFieldErrors()).hasSize(2);
      assertThat(errors.getFieldErrors())
        .extracting("field")
        .contains("product", "quantity");
    });
}
```

## Comparison: MockMvcTester vs Classic MockMvc

| Feature | MockMvcTester | Classic MockMvc |
| ------- | ------------- | --------------- |
| Style | AssertJ fluent | MockMvc matchers |
| Readability | High | Medium |
| Type Safety | Better | Less |
| IDE Support | Excellent | Good |
| Object Conversion | Native | Manual |

## Migration from Classic MockMvc

### Before (Classic)

```java
mvc.perform(get("/orders/1"))
  .andExpect(status().isOk())
  .andExpect(jsonPath("$.status").value("PENDING"))
  .andExpect(jsonPath("$.totalToPay").value(99.99));
```

### After (Tester with Object Conversion)

```java
assertThat(mvc.get().uri("/orders/1"))
  .hasStatus(HttpStatus.OK)
  .bodyJson()
  .convertTo(OrderResponse.class)
  .satisfies(response -> {
    assertThat(response.getStatus()).isEqualTo("PENDING");
    assertThat(response.getTotalToPay()).isEqualTo(new BigDecimal("99.99"));
  });
```

## Key Points

1. **Prefer `convertTo()` over `extractingPath()`** - Type-safe, refactorable
2. **Use `satisfies()` for multiple assertions** - Keeps tests readable
3. **Import static `org.assertj.core.api.Assertions.assertThat`**
4. **Works with generics via `TypeReference`** - For `List<T>` responses
5. **IDE refactoring friendly** - Rename fields, IDE updates tests
