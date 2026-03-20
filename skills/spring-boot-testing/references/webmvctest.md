# @WebMvcTest

Testing Spring MVC controllers with focused slice tests.

## Basic Structure

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
  
  @Autowired
  private MockMvcTester mvc;
  
  @MockitoBean
  private OrderService orderService;
  
  @MockitoBean
  private UserService userService;
}
```

## What Gets Loaded

- The specified controller(s)
- Spring MVC infrastructure (HandlerMapping, HandlerAdapter)
- Jackson ObjectMapper (for JSON)
- Exception handlers (@ControllerAdvice)
- Spring Security filters (if on classpath)
- Validation (if on classpath)

## Testing GET Endpoints

```java
@Test
void shouldReturnOrder() {
  var order = new Order(1L, "PENDING", BigDecimal.valueOf(99.99));
  given(orderService.findById(1L)).willReturn(order);
  
  assertThat(mvc.get().uri("/orders/1"))
    .hasStatusOk()
    .hasContentType(MediaType.APPLICATION_JSON)
    .bodyJson()
    .extractingPath("$.status")
    .isEqualTo("PENDING");
}
```

## Testing POST with Request Body

### Using Text Blocks (Java 25)

```java
@Test
void shouldCreateOrder() {
  given(orderService.create(any(OrderRequest.class))).willReturn(1L);
  
  var json = """
    {
      "product": "Product A",
      "quantity": 2
    }
    """;
  
  assertThat(mvc.post().uri("/orders")
    .contentType(MediaType.APPLICATION_JSON)
    .content(json))
    .hasStatus(HttpStatus.CREATED)
    .hasHeader("Location", "/orders/1");
}
```

### Using Records

```java
record OrderRequest(String product, int quantity) {}

@Test
void shouldCreateOrderWithRecord() {
  var request = new OrderRequest("Product A", 2);
  given(orderService.create(any())).willReturn(1L);
  
  assertThat(mvc.post().uri("/orders")
    .contentType(MediaType.APPLICATION_JSON)
    .content(json.write(request).getJson()))
    .hasStatus(HttpStatus.CREATED);
}
```

## Testing Validation Errors

```java
@Test
void shouldRejectInvalidOrder() {
  var invalidJson = """
    {
      "product": "",
      "quantity": -1
    }
    """;
  
  assertThat(mvc.post().uri("/orders")
    .contentType(MediaType.APPLICATION_JSON)
    .content(invalidJson))
    .hasStatus(HttpStatus.BAD_REQUEST)
    .bodyJson()
    .hasPath("$.errors");
}
```

## Testing Query Parameters

```java
@Test
void shouldFilterOrdersByStatus() {
  assertThat(mvc.get().uri("/orders?status=PENDING"))
    .hasStatusOk();
  
  verify(orderService).findByStatus(OrderStatus.PENDING);
}
```

## Testing Path Variables

```java
@Test
void shouldCancelOrder() {
  assertThat(mvc.put().uri("/orders/123/cancel"))
    .hasStatusOk();
  
  verify(orderService).cancel(123L);
}
```

## Testing with Security

```java
@Test
@WithMockUser(roles = "ADMIN")
void adminShouldDeleteOrder() {
  assertThat(mvc.delete().uri("/orders/1"))
    .hasStatus(HttpStatus.NO_CONTENT);
}

@Test
void anonymousUserShouldBeForbidden() {
  assertThat(mvc.delete().uri("/orders/1"))
    .hasStatus(HttpStatus.UNAUTHORIZED);
}
```

## Multiple Controllers

```java
@WebMvcTest({OrderController.class, ProductController.class})
class WebLayerTest {
  // Tests multiple controllers in one slice
}
```

## Excluding Auto-Configuration

```java
@WebMvcTest(OrderController.class)
@AutoConfigureMockMvc(addFilters = false) // Skip security filters
class OrderControllerWithoutSecurityTest {
  // Tests without security filters
}
```

## Key Points

1. Always mock services with @MockitoBean
2. Use MockMvcTester for AssertJ-style assertions
3. Test HTTP semantics (status, headers, content-type)
4. Verify service method calls when side effects matter
5. Don't test business logic here - that's for unit tests
6. Leverage Java 25 text blocks for JSON payloads
