# @RestClientTest

Testing REST clients in isolation with MockRestServiceServer.

## Overview

`@RestClientTest` auto-configures:

- RestTemplate/RestClient with mock server support
- Jackson ObjectMapper
- MockRestServiceServer

## Basic Setup

```java
@RestClientTest(WeatherService.class)
class WeatherServiceTest {
  
  @Autowired
  private WeatherService weatherService;
  
  @Autowired
  private MockRestServiceServer server;
}
```

## Testing RestTemplate

```java
@RestClientTest(WeatherService.class)
class WeatherServiceTest {
  
  @Autowired
  private WeatherService weatherService;
  
  @Autowired
  private MockRestServiceServer server;
  
  @Test
  void shouldFetchWeather() {
    // Given
    server.expect(requestTo("https://api.weather.com/v1/current"))
      .andExpect(method(HttpMethod.GET))
      .andExpect(queryParam("city", "Berlin"))
      .andRespond(withSuccess()
        .contentType(MediaType.APPLICATION_JSON)
        .body("{\"temperature\": 22, \"condition\": \"Sunny\"}"));
    
    // When
    Weather weather = weatherService.getCurrentWeather("Berlin");
    
    // Then
    assertThat(weather.getTemperature()).isEqualTo(22);
    assertThat(weather.getCondition()).isEqualTo("Sunny");
  }
}
```

## Testing RestClient (Spring 6.1+)

```java
@RestClientTest(WeatherService.class)
class WeatherServiceTest {
  
  @Autowired
  private WeatherService weatherService;
  
  @Autowired
  private MockRestServiceServer server;
  
  @Test
  void shouldFetchWeatherWithRestClient() {
    server.expect(requestTo("https://api.weather.com/v1/current"))
      .andRespond(withSuccess()
        .body("{\"temperature\": 22}"));
    
    Weather weather = weatherService.getCurrentWeather("Berlin");
    
    assertThat(weather.getTemperature()).isEqualTo(22);
  }
}
```

## Request Matching

### Exact URL

```java
server.expect(requestTo("https://api.example.com/users/1"))
  .andRespond(withSuccess());
```

### URL Pattern

```java
server.expect(requestTo(matchesPattern("https://api.example.com/users/\\d+")))
  .andRespond(withSuccess());
```

### HTTP Method

```java
server.expect(ExpectedCount.once(), 
  requestTo("https://api.example.com/users"))
  .andExpect(method(HttpMethod.POST))
  .andRespond(withCreatedEntity(URI.create("/users/1")));
```

### Request Body

```java
server.expect(requestTo("https://api.example.com/users"))
  .andExpect(content().contentType(MediaType.APPLICATION_JSON))
  .andExpect(content().json("{\"name\": \"John\"}"))
  .andRespond(withSuccess());
```

### Headers

```java
server.expect(requestTo("https://api.example.com/users"))
  .andExpect(header("Authorization", "Bearer token123"))
  .andExpect(header("X-Api-Key", "secret"))
  .andRespond(withSuccess());
```

## Response Types

### Success with Body

```java
server.expect(requestTo("/users/1"))
  .andRespond(withSuccess()
    .contentType(MediaType.APPLICATION_JSON)
    .body("{\"id\": 1, \"name\": \"John\"}"));
```

### Success from Resource

```java
server.expect(requestTo("/users/1"))
  .andRespond(withSuccess()
    .body(new ClassPathResource("user-response.json")));
```

### Created

```java
server.expect(requestTo("/users"))
  .andExpect(method(HttpMethod.POST))
  .andRespond(withCreatedEntity(URI.create("/users/1")));
```

### Error Response

```java
server.expect(requestTo("/users/999"))
  .andRespond(withResourceNotFound());

server.expect(requestTo("/users"))
  .andRespond(withServerError()
    .body("Internal Server Error"));

server.expect(requestTo("/users"))
  .andRespond(withStatus(HttpStatus.BAD_REQUEST)
    .body("{\"error\": \"Invalid input\"}"));
```

## Verifying Requests

```java
@Test
void shouldCallApi() {
  server.expect(ExpectedCount.once(), 
    requestTo("https://api.example.com/data"))
    .andRespond(withSuccess());
  
  service.fetchData();
  
  server.verify(); // Verify all expectations met
}
```

## Ignoring Extra Requests

```java
@Test
void shouldHandleMultipleCalls() {
  server.expect(ExpectedCount.manyTimes(),
    requestTo(matchesPattern("/api/.*")))
    .andRespond(withSuccess());
  
  // Multiple calls allowed
  service.callApi();
  service.callApi();
  service.callApi();
}
```

## Reset Between Tests

```java
@BeforeEach
void setUp() {
  server.reset();
}
```

## Testing Timeouts

```java
server.expect(requestTo("/slow-endpoint"))
  .andRespond(withSuccess()
    .body("{\"data\": \"test\"}")
    .delay(100, TimeUnit.MILLISECONDS));

// Test timeout handling
```

## Best Practices

1. Always verify `server.verify()` at end of test
2. Use resource files for large JSON responses
3. Match on minimal set of request attributes
4. Reset server in @BeforeEach
5. Test error responses, not just success
6. Verify request body for POST/PUT calls
