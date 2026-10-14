## Dependency and Build Changes

### Gradle Plugin Updates

**build.gradle.kts:**
```kotlin
plugins {
    kotlin("jvm") version "2.2.0" // Minimum 2.2.0
    kotlin("plugin.spring") version "2.2.0"
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
    id("org.cyclonedx.bom") version "3.0.0" // Minimum 3.0.0
}
```

Verified: Boot 3.5.16 -> 4.1.1 with Kotlin 2.2.0 builds (Groovy and Kotlin DSL, Gradle 9.8.1). Boot 4.1 itself manages Kotlin 2.3.21 (Boot 3.5 managed 1.9.25), so with the dependency-management/BOM the Kotlin plugin version should ideally follow it. Run Gradle on JDK 21 or 25: the Kotlin 1.9 compiler fails with `IllegalArgumentException: 27` under JDK 27.

### Optional Dependencies in Gradle

Optional dependencies are **no longer included in uber jars by default**.

**build.gradle.kts (include optionals explicitly):**
```kotlin
tasks.bootJar {
    includeOptional = true // If needed
}
```

### Spring Retry → Spring Framework Core Retry

Spring Boot 4.0 removes dependency management for **Spring Retry** (portfolio migrating to Spring Framework 7.0 core retry).

**Migration Option 1: Use Spring Framework Core Retry (Recommended)**

```kotlin
// Use built-in Spring Framework retry
import org.springframework.core.retry.RetryTemplate
import org.springframework.core.retry.support.RetryTemplateBuilder

@Configuration
class RetryConfig {
    @Bean
    fun retryTemplate(): RetryTemplate {
        return RetryTemplateBuilder()
            .maxAttempts(3)
            .fixedBackoff(1000)
            .build()
    }
}
```

**Migration Option 2: Explicit Spring Retry Version (Temporary)**

**libs.versions.toml:**
```toml
[versions]
spring-retry = "2.0.5" # Explicit version required

[libraries]
spring-retry = { module = "org.springframework.retry:spring-retry", version.ref = "spring-retry" }
```

**Plan migration to Spring Framework core retry.**

### Spring Authorization Server

Now part of Spring Security - explicit version management removed.

**libs.versions.toml (before - Spring Boot 3.x):**
```toml
[versions]
spring-authorization-server = "1.3.0" # No longer works

[libraries]
spring-security-oauth2-authorization-server = { module = "org.springframework.security:spring-security-oauth2-authorization-server", version.ref = "spring-authorization-server" }
```

**Migration (Spring Boot 4.0):**
```toml
[versions]
spring-security = "7.0.0" # Use Spring Security version instead

[libraries]
# Managed by spring-security.version property, not separate
spring-security-oauth2-authorization-server = { module = "org.springframework.security:spring-security-oauth2-authorization-server", version.ref = "spring-security" }
```

Or rely on Spring Boot dependency management (recommended):
```kotlin
dependencies {
    implementation("org.springframework.security:spring-security-oauth2-authorization-server")
    // Version managed by Spring Boot 4.0
}
```

### Elasticsearch Client Changes

#### Low-Level Client Replacement

**Deprecated low-level `RestClient` → new `Rest5Client`:**

**Note:** Higher-level clients (`ElasticsearchClient` and Spring Data's `ReactiveElasticsearchClient`) **remain unchanged** and have been updated internally to use the new low-level client.

**Imports:**
```kotlin
// Old (Spring Boot 3.x)
import org.elasticsearch.client.RestClient
import org.elasticsearch.client.RestClientBuilder
import org.springframework.boot.autoconfigure.elasticsearch.RestClientBuilderCustomizer

// New (Spring Boot 4.0)
import co.elastic.clients.transport.rest_client.Rest5Client
import co.elastic.clients.transport.rest_client.Rest5ClientBuilder
import org.springframework.boot.autoconfigure.elasticsearch.Rest5ClientBuilderCustomizer
```

**Configuration:**
```kotlin
@Configuration
class ElasticsearchConfig {

    // Old
    // @Bean
    // fun restClientCustomizer(): RestClientBuilderCustomizer {
    //     return RestClientBuilderCustomizer { builder ->
    //         builder.setRequestConfigCallback { config ->
    //             config.setConnectTimeout(5000)
    //         }
    //     }
    // }

    // New
    @Bean
    fun rest5ClientCustomizer(): Rest5ClientBuilderCustomizer {
        return Rest5ClientBuilderCustomizer { builder ->
            builder.setRequestConfigCallback { config ->
                config.setConnectTimeout(5000)
            }
        }
    }
}
```

**Dependency Consolidation:**

Sniffer now included in `co.elastic.clients:elasticsearch-java` module.

**libs.versions.toml:**
```toml
[libraries]
# Remove these - no longer managed
# elasticsearch-rest-client = { module = "org.elasticsearch.client:elasticsearch-rest-client", version = "..." }
# elasticsearch-rest-client-sniffer = { module = "org.elasticsearch.client:elasticsearch-rest-client-sniffer", version = "..." }

# Use single dependency (includes sniffer)
elasticsearch-java = { module = "co.elastic.clients:elasticsearch-java", version = "8.x.x" }
```

### Hibernate Dependency Changes

**libs.versions.toml:**
```toml
[libraries]
# Renamed module (hibernate-jpamodelgen replaced by hibernate-processor)
hibernate-processor = { module = "org.hibernate.orm:hibernate-processor", version.ref = "hibernate" }

# These artifacts are NO LONGER PUBLISHED by Hibernate:
# hibernate-proxool - discontinued by Hibernate project
# hibernate-vibur - discontinued by Hibernate project
# Remove any dependencies on these modules
```

**Note:** `hibernate-jpamodelgen` artifact still exists but is deprecated. Use `hibernate-processor` going forward.

