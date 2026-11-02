This is the canonical testing migration reference. For Boot 4 test-writing patterns (Testcontainers 2.0, RestTestClient, JUnit 6), see the `spring-boot-testing` skill (`references/sb4-migration.md`).

## Testing Framework Changes

### Mockito Integration Removed

`MockitoTestExecutionListener` removed (deprecated in 3.4).

**Migration to MockitoExtension:**
```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.test.context.SpringBootTest
import org.mockito.Mock
import org.mockito.Captor

@SpringBootTest
class MyServiceTest {
    @Mock
    private lateinit var repository: MyRepository

    @Captor
    private lateinit var captor: ArgumentCaptor<String>
}

// New (Spring Boot 4.0)
import org.springframework.boot.test.context.SpringBootTest
import org.mockito.Mock
import org.mockito.Captor
import org.mockito.junit.jupiter.MockitoExtension
import org.junit.jupiter.api.extension.ExtendWith

@SpringBootTest
@ExtendWith(MockitoExtension::class) // Explicit extension required
class MyServiceTest {
    @Mock
    private lateinit var repository: MyRepository

    @Captor
    private lateinit var captor: ArgumentCaptor<String>
}
```

### @MockBean and @SpyBean removed

Replace `org.springframework.boot.test.mock.mockito.MockBean`/`SpyBean` with `org.springframework.test.context.bean.override.mockito.MockitoBean`/`MockitoSpyBean` (Spring Framework 6.2+, so this can be done on Boot 3.5 first). Slice and `@AutoConfigure*` annotations moved to per-technology packages, for example `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`/`AutoConfigureMockMvc` and `org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest`; each needs its `spring-boot-starter-*-test` dependency.

### @SpringBootTest Changes

`@SpringBootTest` no longer provides **WebTestClient** or **TestRestTemplate** automatically. **MockMVC** already required `@AutoConfigureMockMvc` on Boot 3; only its package changed.

#### MockMVC Configuration

```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class ControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc
}

// New (Spring Boot 4.0)
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc.HtmlUnit

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc // New package
class ControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc
}

// HtmlUnit configuration moved to annotation attribute
@AutoConfigureMockMvc(
    htmlUnit = HtmlUnit(webClient = false, webDriver = false)
)
```

#### WebTestClient Configuration

```kotlin
// Old (Spring Boot 3.x)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WebFluxTest {
    @Autowired
    private lateinit var webTestClient: WebTestClient // Available automatically
}

// New (Spring Boot 4.0)
import org.springframework.boot.webtestclient.autoconfigure.AutoConfigureWebTestClient

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient // Explicit annotation required
class WebFluxTest {
    @Autowired
    private lateinit var webTestClient: WebTestClient
}
```

#### TestRestTemplate → RestTestClient (Recommended)

**Spring Boot 4.0 introduces `RestTestClient`** as modern replacement for `TestRestTemplate`.

```kotlin
// Old approach (still works with annotation)
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate
import org.springframework.boot.resttestclient.TestRestTemplate

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate // Required in 4.0
class RestApiTest {
    @Autowired
    private lateinit var testRestTemplate: TestRestTemplate
}

// New recommended approach
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient
import org.springframework.test.web.servlet.client.RestTestClient

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient // New annotation
class RestApiTest {
    @Autowired
    private lateinit var restTestClient: RestTestClient

    @Test
    fun testEndpoint() {
        restTestClient.get()
            .uri("/api/users")
            .exchange()
            .expectStatus().isOk()
            .expectBodyList(User::class.java)
    }
}
```

**TestRestTemplate package change (if still using):**

**IMPORTANT:** If continuing to use `TestRestTemplate`, you must:
1. Add the `spring-boot-resttestclient` test dependency plus `spring-boot-starter-restclient` (verified: without it the context fails with `NoClassDefFoundError: org/springframework/boot/restclient/RestTemplateBuilder`)
2. **Update the package import** (class moved to new package)

**libs.versions.toml:**
```toml
[libraries]
spring-boot-resttestclient = { module = "org.springframework.boot:spring-boot-resttestclient", version.ref = "springBoot" }
spring-boot-starter-restclient = { module = "org.springframework.boot:spring-boot-starter-restclient", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    testImplementation(libs.spring.boot.resttestclient)
    testImplementation(libs.spring.boot.starter.restclient) // provides RestTemplateBuilder
}
```

**Update package import (required):**
```kotlin
// Old package import - will cause compilation failure
// import org.springframework.boot.test.web.client.TestRestTemplate

// New package import - required in Spring Boot 4.0
import org.springframework.boot.resttestclient.TestRestTemplate
```

### @PropertyMapping Annotation Relocation

```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.test.autoconfigure.properties.PropertyMapping
import org.springframework.boot.test.autoconfigure.properties.Skip

// New (Spring Boot 4.0)
import org.springframework.boot.test.context.PropertyMapping
import org.springframework.boot.test.context.PropertyMapping.Skip
```

