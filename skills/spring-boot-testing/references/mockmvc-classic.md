# MockMvc Classic

Traditional MockMvc API for Spring MVC controller tests (pre-Spring Boot 3.2 or legacy codebases).

## When to Use This Reference

- The project uses Spring Boot < 3.2 (no `MockMvcTester` available)
- Existing tests use `mvc.perform(...)` and you are maintaining or extending them
- You need to migrate classic MockMvc tests to `MockMvcTester` (see migration section below)
- The user explicitly asks about `ResultActions`, `andExpect()`, or Hamcrest-style web assertions

For new tests on Spring Boot 3.2+, prefer [mockmvc-tester.md](mockmvc-tester.md) instead.

## Setup

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

  @Autowired
  private MockMvc mvc;

  @MockBean
  private OrderService orderService;
}
```

## Basic GET Request

```java
@Test
void shouldReturnOrder() throws Exception {
  given(orderService.findById(1L)).willReturn(new Order(1L, "PENDING", 99.99));

  mvc.perform(get("/orders/1"))
    .andExpect(status().isOk())
    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
    .andExpect(jsonPath("$.id").value(1))
    .andExpect(jsonPath("$.status").value("PENDING"))
    .andExpect(jsonPath("$.totalToPay").value(99.99));
}
```

## POST with Request Body

```java
@Test
void shouldCreateOrder() throws Exception {
  given(orderService.create(any(OrderRequest.class))).willReturn(1L);

  mvc.perform(post("/orders")
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"product\": \"Laptop\", \"quantity\": 2}"))
    .andExpect(status().isCreated())
    .andExpect(header().string("Location", "/orders/1"));
}
```

## PUT Request

```java
@Test
void shouldUpdateOrder() throws Exception {
  mvc.perform(put("/orders/1")
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"status\": \"COMPLETED\"}"))
    .andExpect(status().isOk());
}
```

## DELETE Request

```java
@Test
void shouldDeleteOrder() throws Exception {
  mvc.perform(delete("/orders/1"))
    .andExpect(status().isNoContent());
}
```

## Status Matchers

```java
.andExpect(status().isOk())           // 200
.andExpect(status().isCreated())      // 201
.andExpect(status().isNoContent())    // 204
.andExpect(status().isBadRequest())   // 400
.andExpect(status().isUnauthorized()) // 401
.andExpect(status().isForbidden())    // 403
.andExpect(status().isNotFound())     // 404
.andExpect(status().is(422))          // arbitrary code
```

## JSON Path Assertions

```java
// Exact value
.andExpect(jsonPath("$.status").value("PENDING"))

// Existence
.andExpect(jsonPath("$.id").exists())
.andExpect(jsonPath("$.deletedAt").doesNotExist())

// Array size
.andExpect(jsonPath("$.items").isArray())
.andExpect(jsonPath("$.items", hasSize(3)))

// Nested field
.andExpect(jsonPath("$.customer.name").value("John Doe"))
.andExpect(jsonPath("$.customer.address.city").value("Berlin"))

// With Hamcrest matchers
.andExpect(jsonPath("$.total", greaterThan(0.0)))
.andExpect(jsonPath("$.description", containsString("order")))
```

## Content Assertions

```java
.andExpect(content().contentType(MediaType.APPLICATION_JSON))
.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
.andExpect(content().string(containsString("PENDING")))
.andExpect(content().json("{\"status\":\"PENDING\"}"))
```

## Header Assertions

```java
.andExpect(header().string("Location", "/orders/1"))
.andExpect(header().string("Content-Type", containsString("application/json")))
.andExpect(header().exists("X-Request-Id"))
.andExpect(header().doesNotExist("X-Deprecated"))
```

## Request Parameters and Headers

```java
// Query parameters
mvc.perform(get("/orders").param("status", "PENDING").param("page", "0"))
  .andExpect(status().isOk());

// Path variables
mvc.perform(get("/orders/{id}", 1L))
  .andExpect(status().isOk());

// Request headers
mvc.perform(get("/orders/1").header("X-Api-Key", "secret"))
  .andExpect(status().isOk());
```

## Capturing the Response

```java
@Test
void shouldReturnCreatedId() throws Exception {
  given(orderService.create(any())).willReturn(42L);

  MvcResult result = mvc.perform(post("/orders")
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"product\": \"Laptop\", \"quantity\": 1}"))
    .andExpect(status().isCreated())
    .andReturn();

  String location = result.getResponse().getHeader("Location");
  assertThat(location).isEqualTo("/orders/42");
}
```

## Chaining with andDo

```java
mvc.perform(get("/orders/1"))
  .andDo(print())              // prints request/response to console (debug)
  .andExpect(status().isOk());
```

## Static Imports

```java
import org.springframework.boot.test.mock.mockito.MockBean;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.*;
import static org.hamcrest.Matchers.*;
```

## Migration to MockMvcTester

| Classic MockMvc | MockMvcTester (recommended) |
| --- | --- |
| `@Autowired MockMvc mvc` | `@Autowired MockMvcTester mvc` |
| `mvc.perform(get("/orders/1"))` | `mvc.get().uri("/orders/1")` |
| `.andExpect(status().isOk())` | `.hasStatusOk()` |
| `.andExpect(jsonPath("$.status").value("X"))` | `.bodyJson().convertTo(T.class)` + AssertJ |
| `throws Exception` on every method | No checked exception |
| Hamcrest matchers | AssertJ fluent assertions |

See [mockmvc-tester.md](mockmvc-tester.md) for the full modern API.

## Key Points

1. **Every test method must declare `throws Exception`** — `perform()` throws checked exceptions
2. **Use `andDo(print())` during debugging** — remove before committing
3. **Prefer `jsonPath()` over `content().string()`** — more precise field-level assertions
4. **Static imports are required** — IDE can auto-add them
5. **Migrate to MockMvcTester** when upgrading to Spring Boot 3.2+ for better readability
