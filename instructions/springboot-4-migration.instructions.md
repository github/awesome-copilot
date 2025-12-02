---
description: "Comprehensive guide for migrating Spring Boot applications from 3.x to 4.0, focusing on Gradle Kotlin DSL and version catalogs"
applyTo: "**/*.java, **/*.kt, **/build.gradle.kts, **/build.gradle, **/settings.gradle.kts, **/gradle/libs.versions.toml, **/*.properties, **/*.yml, **/*.yaml"
---

# Spring Boot 3.x to 4.0 Migration Guide

## Project Context

This guide provides comprehensive GitHub Copilot instructions for upgrading Spring Boot projects from version 3.x to 4.0, with emphasis on Gradle Kotlin DSL, version catalogs (`libs.versions.toml`), and Kotlin-specific considerations.

**Key architectural changes in Spring Boot 4.0:**
- Modular dependency structure with focused, smaller modules
- Spring Framework 7.x required
- Jakarta EE 11 (Servlet 6.1 baseline)
- Jackson 3.x migration (package namespace changes)
- Kotlin 2.2+ requirement
- Comprehensive property reorganization

## System Requirements

### Minimum Versions

- **Java**: 17+ (prefer latest LTS: Java 21 or 25)
- **Kotlin**: 2.2.0 or later
- **Spring Framework**: 7.x (managed by Spring Boot 4.0)
- **Jakarta EE**: 11 (Servlet 6.1 baseline)
- **GraalVM** (for native images): 25+
- **Gradle**: 8.5+ (for Kotlin DSL and version catalog support)
- **Gradle CycloneDX Plugin**: 3.0.0+

### Verify Compatibility

```bash
# Check current versions
./gradlew --version
./gradlew dependencies --configuration runtimeClasspath
```

## Pre-Migration Steps

### 1. Upgrade to Latest Spring Boot 3.5.x

Before migrating to 4.0, upgrade to the latest 3.5.x release:

```kotlin
// libs.versions.toml
[versions]
springBoot = "3.5.6" # Latest 3.x before migrating to 4.0
```

### 2. Clean Up Deprecations

Remove all deprecated API usage from Spring Boot 3.x. These will be compilation errors in 4.0:

```bash
# Build and review warnings
./gradlew clean build --warning-mode all
```

### 3. Review Dependency Changes

Compare your dependencies against:
- [Spring Boot 3.5.x Dependency Versions](https://docs.spring.io/spring-boot/3.5/appendix/dependency-versions/coordinates.html)
- [Spring Boot 4.0.x Dependency Versions](https://docs.spring.io/spring-boot/4.0/appendix/dependency-versions/coordinates.html)

## Module Restructuring and Starter Changes

### Critical: Modular Architecture

Spring Boot 4.0 introduces **smaller, focused modules** replacing large monolithic jars. This requires dependency updates in most projects.

**Important for Library Authors:** Due to the modularization effort and package reorganization, **supporting both Spring Boot 3 and Spring Boot 4 within the same artifact is strongly discouraged**. Library authors should publish separate artifacts for each major version to avoid runtime conflicts and ensure clean dependency management.

### Migration Strategy: Choose One Approach

#### Option 1: Technology-Specific Starters (Recommended for Production)

Most technologies covered by Spring Boot now have **dedicated test starter companions**. This provides fine-grained control.

**Complete Starter Reference:** For comprehensive tables of all available starters (Core, Web, Database, Spring Data, Messaging, Security, Templating, Production-Ready, etc.) and their test companions, refer to the [official Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide#starters).

**libs.versions.toml:**
```toml
[versions]
springBoot = "4.0.0"

[libraries]
# Core starters with dedicated test modules
spring-boot-starter-web = { module = "org.springframework.boot:spring-boot-starter-webmvc", version.ref = "springBoot" }
spring-boot-starter-webmvc-test = { module = "org.springframework.boot:spring-boot-starter-webmvc-test", version.ref = "springBoot" }

spring-boot-starter-data-jpa = { module = "org.springframework.boot:spring-boot-starter-data-jpa", version.ref = "springBoot" }
spring-boot-starter-data-jpa-test = { module = "org.springframework.boot:spring-boot-starter-data-jpa-test", version.ref = "springBoot" }

spring-boot-starter-security = { module = "org.springframework.boot:spring-boot-starter-security", version.ref = "springBoot" }
spring-boot-starter-security-test = { module = "org.springframework.boot:spring-boot-starter-security-test", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    implementation(libs.spring.boot.starter.webmvc)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.security)

    testImplementation(libs.spring.boot.starter.webmvc.test)
    testImplementation(libs.spring.boot.starter.data.jpa.test)
    testImplementation(libs.spring.boot.starter.security.test)
}
```

#### Option 2: Classic Starters (Quick Migration, Deprecated)

For rapid migration, use **classic starters** that bundle all auto-configuration (like Spring Boot 3.x):

**libs.versions.toml:**
```toml
[libraries]
spring-boot-starter-classic = { module = "org.springframework.boot:spring-boot-starter-classic", version.ref = "springBoot" }
spring-boot-starter-test-classic = { module = "org.springframework.boot:spring-boot-starter-test-classic", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    implementation(libs.spring.boot.starter.classic)
    testImplementation(libs.spring.boot.starter.test.classic)
}
```

**Warning**: Classic starters are **deprecated** and will be removed in future releases. Plan migration to technology-specific starters.

#### Option 3: Direct Module Dependencies (Advanced)

For explicit control over transitive dependencies:

**libs.versions.toml:**
```toml
[libraries]
spring-boot-webmvc = { module = "org.springframework.boot:spring-boot-webmvc", version.ref = "springBoot" }
spring-boot-webmvc-test = { module = "org.springframework.boot:spring-boot-webmvc-test", version.ref = "springBoot" }
```

### Renamed Starters (Breaking Changes)

Update these starter names in your `libs.versions.toml`:

| Spring Boot 3.x | Spring Boot 4.0 | Notes |
|----------------|-----------------|-------|
| `spring-boot-starter-web` | `spring-boot-starter-webmvc` | Explicit naming |
| `spring-boot-starter-web-services` | `spring-boot-starter-webservices` | Hyphen removed |
| `spring-boot-starter-aop` | `spring-boot-starter-aspectj` | Only needed if using `org.aspectj.lang.annotation` |
| `spring-boot-starter-oauth2-authorization-server` | `spring-boot-starter-security-oauth2-authorization-server` | Security namespace |
| `spring-boot-starter-oauth2-client` | `spring-boot-starter-security-oauth2-client` | Security namespace |
| `spring-boot-starter-oauth2-resource-server` | `spring-boot-starter-security-oauth2-resource-server` | Security namespace |

**Migration Example (libs.versions.toml):**
```toml
[libraries]
# Old (Spring Boot 3.x)
# spring-boot-starter-web = { module = "org.springframework.boot:spring-boot-starter-web", version.ref = "springBoot" }
# spring-boot-starter-oauth2-client = { module = "org.springframework.boot:spring-boot-starter-oauth2-client", version.ref = "springBoot" }

# New (Spring Boot 4.0)
spring-boot-starter-webmvc = { module = "org.springframework.boot:spring-boot-starter-webmvc", version.ref = "springBoot" }
spring-boot-starter-security-oauth2-client = { module = "org.springframework.boot:spring-boot-starter-security-oauth2-client", version.ref = "springBoot" }
```

### AspectJ Starter Clarification

Only include `spring-boot-starter-aspectj` if you're **actually using AspectJ annotations**:

```kotlin
// Only needed if code uses org.aspectj.lang.annotation package
import org.aspectj.lang.annotation.Aspect
import org.aspectj.lang.annotation.Before

@Aspect
class MyAspect {
    @Before("execution(* com.example..*(..))")
    fun beforeAdvice() { }
}
```

If not using AspectJ, remove the dependency.

## Removed Features and Alternatives

### Embedded Servers

#### Undertow Removed

**Undertow is completely removed** - not compatible with Servlet 6.1 baseline.

**Migration:**
- Use **Tomcat** (default) or **Jetty**
- Do **not** deploy Spring Boot 4.0 apps to non-Servlet 6.1 containers

**libs.versions.toml:**
```toml
[libraries]
# Remove Undertow
# spring-boot-starter-undertow = { module = "org.springframework.boot:spring-boot-starter-undertow", version.ref = "springBoot" }

# Use Tomcat (default) or Jetty
spring-boot-starter-jetty = { module = "org.springframework.boot:spring-boot-starter-jetty", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    implementation(libs.spring.boot.starter.webmvc) {
        exclude(group = "org.springframework.boot", module = "spring-boot-starter-tomcat")
    }
    implementation(libs.spring.boot.starter.jetty) // Alternative to Tomcat
}
```

### Session Management

#### Spring Session Hazelcast and MongoDB Removed

**Maintained by respective teams**, no longer in Spring Boot dependency management.

**Migration (libs.versions.toml):**
```toml
[versions]
hazelcast-spring-session = "3.x.x" # Check Hazelcast documentation
mongodb-spring-session = "4.x.x"   # Check MongoDB documentation

[libraries]
# Explicit versions required
spring-session-hazelcast = { module = "com.hazelcast:spring-session-hazelcast", version.ref = "hazelcast-spring-session" }
spring-session-mongodb = { module = "org.springframework.session:spring-session-data-mongodb", version.ref = "mongodb-spring-session" }
```

### Reactive Messaging

#### Pulsar Reactive Removed

Spring Pulsar dropped Reactor support - reactive Pulsar client removed.

**Migration:**
- Use imperative Pulsar client
- Or migrate to alternative reactive messaging (Kafka, RabbitMQ)

### Testing

#### Spock Framework Removed

**Spock does not yet support Groovy 5** (required for Spring Boot 4.0).

**Migration:**
- Use JUnit 5 with Kotlin
- Or wait for Spock Groovy 5 compatibility

### Build Features

#### Executable Jar Launch Scripts Removed

Embedded launch scripts for "fully executable" jars removed (Unix-specific, limited use).

**build.gradle.kts (remove):**
```kotlin
// Remove this configuration
tasks.bootJar {
    launchScript() // No longer supported
}
```

**Alternatives:**
- Use `java -jar app.jar` directly
- Use Gradle Application Plugin for native launchers
- Use systemd service files

#### Classic Uber-Jar Loader Removed

The classic uber-jar loader has been removed. Remove any loader implementation configuration from your build.

**Maven (pom.xml) - remove:**
```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <loaderImplementation>CLASSIC</loaderImplementation> <!-- REMOVE THIS -->
            </configuration>
        </plugin>
    </plugins>
</build>
```

**Gradle (build.gradle.kts) - remove:**
```kotlin
tasks.bootJar {
    loaderImplementation = org.springframework.boot.loader.tools.LoaderImplementation.CLASSIC // REMOVE THIS
}
```

## Jackson 3 Migration

### Major Breaking Change: Package Namespace

Jackson 3 changes **group ID and package names**:

| Component | Old (Jackson 2) | New (Jackson 3) |
|-----------|----------------|-----------------|
| Group ID | `com.fasterxml.jackson` | `tools.jackson` |
| Packages | `com.fasterxml.jackson.*` | `tools.jackson.*` |
| Exception | `jackson-annotations` | Still uses `com.fasterxml.jackson.core` group |

**libs.versions.toml:**
```toml
[versions]
jackson = "3.0.1" # Managed by Spring Boot 4.0

[libraries]
# Jackson 3 uses new group ID
jackson-databind = { module = "tools.jackson.core:jackson-databind", version.ref = "jackson" }
jackson-module-kotlin = { module = "tools.jackson.module:jackson-module-kotlin", version.ref = "jackson" }

# Exception: annotations still use old group
jackson-annotations = { module = "com.fasterxml.jackson.core:jackson-annotations", version.ref = "jackson" }
```

### Class and Annotation Renames

Update imports and annotations:

| Spring Boot 3.x | Spring Boot 4.0 |
|----------------|-----------------|
| `Jackson2ObjectMapperBuilderCustomizer` | `JsonMapperBuilderCustomizer` |
| `JsonObjectSerializer` | `ObjectValueSerializer` |
| `JsonValueDeserializer` | `ObjectValueDeserializer` |
| `@JsonComponent` | `@JacksonComponent` |
| `@JsonMixin` | `@JacksonMixin` |

**Migration Example:**
```kotlin
// Old (Spring Boot 3.x)
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer
import org.springframework.boot.jackson.JsonComponent

@JsonComponent
class CustomSerializer : JsonSerializer<MyType>() { }

@Configuration
class JacksonConfig {
    @Bean
    fun customizer(): Jackson2ObjectMapperBuilderCustomizer {
        return Jackson2ObjectMapperBuilderCustomizer { builder ->
            builder.simpleDateFormat("yyyy-MM-dd")
        }
    }
}

// New (Spring Boot 4.0)
import tools.jackson.databind.ObjectMapper
import org.springframework.boot.autoconfigure.jackson.JsonMapperBuilderCustomizer
import org.springframework.boot.jackson.JacksonComponent

@JacksonComponent
class CustomSerializer : JsonSerializer<MyType>() { }

@Configuration
class JacksonConfig {
    @Bean
    fun customizer(): JsonMapperBuilderCustomizer {
        return JsonMapperBuilderCustomizer { builder ->
            builder.simpleDateFormat("yyyy-MM-dd")
        }
    }
}
```

### Configuration Property Changes

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  jackson:
    read:
      enums-using-to-string: true
    write:
      dates-as-timestamps: false

# New (Spring Boot 4.0)
spring:
  jackson:
    json:
      read:
        enums-using-to-string: true
      write:
        dates-as-timestamps: false
```

### Jackson 2 Compatibility Module (Temporary)

For gradual migration, use the **temporary compatibility module** (deprecated, will be removed):

**libs.versions.toml:**
```toml
[libraries]
spring-boot-jackson2 = { module = "org.springframework.boot:spring-boot-jackson2", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    implementation(libs.spring.boot.jackson2)
}
```

**application.yml:**
```yaml
spring:
  jackson:
    use-jackson2-defaults: true # Use Jackson 2 behavior
```

**Properties under `spring.jackson2.*` namespace** when using compatibility module.

**Plan migration away from this module** - it will be removed in future versions.

## Core Framework Changes

### Nullability Annotations: JSpecify

Spring Boot 4.0 adds **JSpecify nullability annotations** throughout the codebase.

**Impact:**
- Kotlin null-safety may flag new warnings/errors
- Null checkers (SpotBugs, NullAway) may report new issues
- **RestClient methods like `body()` are now explicitly marked as nullable** - always check for null or use `Objects.requireNonNull()`

**Migration for Kotlin:**
```kotlin
// Explicit nullable types may be required
fun processUser(id: String?): User? {
    return userRepository.findById(id) // May now be explicitly nullable
}

// RestClient body() can return null
val body: String? = restClient.get()
    .uri("https://api.example.com/data")
    .retrieve()
    .body(String::class.java) // Nullable - handle appropriately

if (body != null) {
    println(body.length)
}
```

**Actuator endpoint parameters:**
- Cannot use `javax.annotations.NonNull` or `org.springframework.lang.Nullable`
- Use `org.jspecify.annotations.Nullable` instead

**libs.versions.toml:**
```toml
[libraries]
jspecify = { module = "org.jspecify:jspecify", version = "1.0.0" }
```

### Package Relocations

#### BootstrapRegistry

**Old import:**
```kotlin
import org.springframework.boot.BootstrapRegistry
```

**New import:**
```kotlin
import org.springframework.boot.bootstrap.BootstrapRegistry
```

#### EnvironmentPostProcessor

**Old import:**
```kotlin
import org.springframework.boot.env.EnvironmentPostProcessor
```

**New import:**
```kotlin
import org.springframework.boot.EnvironmentPostProcessor
```

**Update `META-INF/spring.factories`:**
```properties
# Old
org.springframework.boot.env.EnvironmentPostProcessor=com.example.MyPostProcessor

# New
org.springframework.boot.EnvironmentPostProcessor=com.example.MyPostProcessor
```

**Note:** Deprecated form still available temporarily but will be removed.

#### Entity Scan

**Old import:**
```kotlin
import org.springframework.boot.autoconfigure.domain.EntityScan
```

**New import:**
```kotlin
import org.springframework.boot.persistence.autoconfigure.EntityScan
```

### Logging Changes

#### Logback Default Charset

Log files now default to **UTF-8** (harmonized with Log4j2):

**logback-spring.xml (explicit configuration):**
```xml
<configuration>
    <appender name="FILE" class="ch.qos.logback.core.FileAppender">
        <file>app.log</file>
        <encoder>
            <charset>UTF-8</charset> <!-- Now default -->
            <pattern>%d{yyyy-MM-dd HH:mm:ss} - %msg%n</pattern>
        </encoder>
    </appender>
</configuration>
```

**Console logging:** Uses `Console#charset()` if available (Java 17+), otherwise falls back to UTF-8. This provides better platform compatibility while maintaining consistent encoding.

### DevTools Changes

#### Live Reload Disabled by Default

**application.yml:**
```yaml
spring:
  devtools:
    livereload:
      enabled: true # Must explicitly enable in 4.0
```

**libs.versions.toml:**
```toml
[libraries]
spring-boot-devtools = { module = "org.springframework.boot:spring-boot-devtools", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    developmentOnly(libs.spring.boot.devtools)
}
```

### PropertyMapper API Behavioral Change

**Breaking change:** No longer calls adapter/predicate methods by default when source is `null`.

**Migration pattern:**
```kotlin
// Old behavior (Spring Boot 3.x)
map.from(source::method).to(destination::method)
// Calls destination.method(null) if source returns null

// New behavior (Spring Boot 4.0)
map.from(source::method).to(destination::method)
// Skips call if source returns null

// Explicit null handling (new)
map.from(source::method).always().to(destination::method)
// Always calls destination.method(value), even if null
```

**Removed method:** `alwaysApplyingNotNull()` - use `always()` instead.

**Migration example:** Review [Spring Boot commit 239f384ac0](https://github.com/spring-projects/spring-boot/commit/239f384ac0893d151b89f204886874c6adb00001) to see how Spring Boot itself adapted to the new API.

## Dependency and Build Changes

### Gradle Plugin Updates

**build.gradle.kts:**
```kotlin
plugins {
    kotlin("jvm") version "2.2.0" // Minimum 2.2.0
    kotlin("plugin.spring") version "2.2.0"
    id("org.springframework.boot") version "4.0.0"
    id("io.spring.dependency-management") version "1.1.7"
    id("org.cyclonedx.bom") version "3.0.0" // Minimum 3.0.0
}
```

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

## Configuration Property Changes

### MongoDB Property Restructuring

**Major reorganization:** Non-Spring Data properties moved to `spring.mongodb.*`:

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/mydb
      database: mydb
      host: localhost
      port: 27017
      username: user
      password: pass
      authentication-database: admin
      replica-set-name: rs0
      additional-hosts:
        - host1:27017
        - host2:27017
      ssl:
        enabled: true
        bundle: my-bundle
      representation:
        uuid: STANDARD

management:
  health:
    mongo:
      enabled: true
  metrics:
    mongo:
      command:
        enabled: true
      connectionpool:
        enabled: true

# New (Spring Boot 4.0)
spring:
  mongodb:
    uri: mongodb://localhost:27017/mydb
    database: mydb
    host: localhost
    port: 27017
    username: user
    password: pass
    authentication-database: admin
    replica-set-name: rs0
    additional-hosts:
      - host1:27017
      - host2:27017
    ssl:
      enabled: true
      bundle: my-bundle
    representation:
      uuid: STANDARD # Explicit configuration now required

  data:
    mongodb:
      # Spring Data-specific properties remain here
      auto-index-creation: true
      field-naming-strategy: org.springframework.data.mapping.model.SnakeCaseFieldNamingStrategy
      gridfs:
        bucket: fs
        database: gridfs-db
      repositories:
        type: auto
      representation:
        big-decimal: DECIMAL128 # Explicit configuration now required

management:
  health:
    mongodb: # Renamed from "mongo"
      enabled: true
  metrics:
    mongodb: # Renamed from "mongo"
      command:
        enabled: true
      connectionpool:
        enabled: true
```

**Key changes:**
- **UUID representation**: **MANDATORY** - No default provided, must explicitly configure `spring.mongodb.representation.uuid` (e.g., `STANDARD`, `JAVA_LEGACY`, `PYTHON_LEGACY`, `C_SHARP_LEGACY`)
- **BigDecimal representation**: **MANDATORY** - No default provided, must explicitly configure `spring.data.mongodb.representation.big-decimal` (e.g., `DECIMAL128`, `STRING`)
- **Management properties**: `mongo` → `mongodb`
- **Failure to configure these will result in runtime errors when persisting UUID or BigDecimal values**

### Spring Session Property Renames

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  session:
    redis:
      namespace: myapp:session
      flush-mode: on-save
    mongodb:
      collection-name: sessions

# New (Spring Boot 4.0)
spring:
  session:
    data:
      redis:
        namespace: myapp:session
        flush-mode: on-save
      mongodb:
        collection-name: sessions
```

### Persistence Module Property Change

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  dao:
    exceptiontranslation:
      enabled: true

# New (Spring Boot 4.0)
spring:
  persistence:
    exceptiontranslation:
      enabled: true
```

## Web Framework Changes

### Static Resource Locations

`PathRequest#toStaticResources()` now includes `/fonts/**` by default.

**Security configuration (exclude fonts if needed):**
```kotlin
import org.springframework.boot.autoconfigure.security.servlet.PathRequest
import org.springframework.boot.autoconfigure.security.StaticResourceLocation

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            authorizeHttpRequests {
                // Exclude fonts if needed
                authorize(PathRequest.toStaticResources()
                    .atCommonLocations()
                    .excluding(StaticResourceLocation.FONTS), permitAll)
                authorize(anyRequest, authenticated)
            }
        }
        return http.build()
    }
}
```

### HttpMessageConverters Deprecation

`HttpMessageConverters` deprecated due to framework improvements (conflated client/server converters).

**Migration:**
```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.autoconfigure.http.HttpMessageConverters
import org.springframework.context.annotation.Bean

@Configuration
class WebConfig {
    @Bean
    fun customConverters(): HttpMessageConverters {
        return HttpMessageConverters(MyCustomConverter())
    }
}

// New (Spring Boot 4.0)
import org.springframework.boot.autoconfigure.http.client.ClientHttpMessageConvertersCustomizer
import org.springframework.boot.autoconfigure.http.server.ServerHttpMessageConvertersCustomizer

@Configuration
class WebConfig {

    // Separate client and server converters
    @Bean
    fun clientConvertersCustomizer(): ClientHttpMessageConvertersCustomizer {
        return ClientHttpMessageConvertersCustomizer { converters ->
            converters.add(MyCustomClientConverter())
        }
    }

    @Bean
    fun serverConvertersCustomizer(): ServerHttpMessageConvertersCustomizer {
        return ServerHttpMessageConvertersCustomizer { converters ->
            converters.add(MyCustomServerConverter())
        }
    }
}
```

### Jersey and Jackson 3 Incompatibility

**Jersey 4.0 limitation:** Spring Boot 4.0 supports Jersey 4.0, which **does not yet support Jackson 3**.

**Solution:** Use `spring-boot-jackson2` compatibility module **either in place of or alongside** `spring-boot-jackson`:

**libs.versions.toml:**
```toml
[libraries]
spring-boot-starter-jersey = { module = "org.springframework.boot:spring-boot-starter-jersey", version.ref = "springBoot" }
spring-boot-jackson2 = { module = "org.springframework.boot:spring-boot-jackson2", version.ref = "springBoot" }
# Optional: Keep Jackson 3 for non-Jersey parts of application
spring-boot-jackson = { module = "org.springframework.boot:spring-boot-jackson", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    implementation(libs.spring.boot.starter.jersey)
    implementation(libs.spring.boot.jackson2) // Required for Jersey JSON processing
    // Optional: Use Jackson 3 elsewhere in application
    // implementation(libs.spring.boot.jackson)
}
```

**Note:** If using only Jersey in your application, you can replace Jackson 3 entirely with Jackson 2 compatibility module.

## Messaging Framework Changes

### Kafka Streams Customizer Replacement

**Deprecated `StreamBuilderFactoryBeanCustomizer` → `StreamsBuilderFactoryBeanConfigurer`:**

```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.autoconfigure.kafka.StreamsBuilderFactoryBeanCustomizer

@Configuration
class KafkaStreamsConfig {
    @Bean
    fun streamsCustomizer(): StreamBuilderFactoryBeanCustomizer {
        return StreamBuilderFactoryBeanCustomizer { factoryBean ->
            factoryBean.setKafkaStreamsCustomizer { streams ->
                // Custom config
            }
        }
    }
}

// New (Spring Boot 4.0)
import org.springframework.kafka.config.StreamsBuilderFactoryBeanConfigurer

@Configuration
class KafkaStreamsConfig {
    @Bean
    fun streamsConfigurer(): StreamsBuilderFactoryBeanConfigurer {
        return StreamsBuilderFactoryBeanConfigurer { factoryBean ->
            factoryBean.setKafkaStreamsCustomizer { streams ->
                // Custom config
            }
        }
    }
}
```

**Note:** New configurer implements `Ordered` with default value `0`.

### Kafka Retry Property Change

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  kafka:
    retry:
      topic:
        backoff:
          random: true

# New (Spring Boot 4.0)
spring:
  kafka:
    retry:
      topic:
        backoff:
          jitter: 0.5 # More flexible than boolean
```

### RabbitMQ Retry Customizer Split

**Spring AMQP moved from Spring Retry → Spring Framework core retry**, with customizer split:

```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.autoconfigure.amqp.RabbitRetryTemplateCustomizer

@Configuration
class RabbitConfig {
    @Bean
    fun retryCustomizer(): RabbitRetryTemplateCustomizer {
        return RabbitRetryTemplateCustomizer { template ->
            // Applies to both RabbitTemplate and listeners
        }
    }
}

// New (Spring Boot 4.0)
import org.springframework.boot.autoconfigure.amqp.RabbitTemplateRetrySettingsCustomizer
import org.springframework.boot.autoconfigure.amqp.RabbitListenerRetrySettingsCustomizer

@Configuration
class RabbitConfig {

    // For RabbitTemplate operations
    @Bean
    fun templateRetryCustomizer(): RabbitTemplateRetrySettingsCustomizer {
        return RabbitTemplateRetrySettingsCustomizer { settings ->
            settings.maxAttempts = 5
        }
    }

    // For message listeners
    @Bean
    fun listenerRetryCustomizer(): RabbitListenerRetrySettingsCustomizer {
        return RabbitListenerRetrySettingsCustomizer { settings ->
            settings.maxAttempts = 3
        }
    }
}
```

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

### @SpringBootTest Changes

`@SpringBootTest` no longer provides **MockMVC**, **WebTestClient**, or **TestRestTemplate** automatically.

#### MockMVC Configuration

```kotlin
// Old (Spring Boot 3.x)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc // Available automatically
}

// New (Spring Boot 4.0)
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.autoconfigure.web.servlet.HtmlUnit

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc // Explicit annotation required
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
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient

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
import org.springframework.boot.test.autoconfigure.web.client.AutoConfigureTestRestTemplate
import org.springframework.boot.test.web.client.TestRestTemplate

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate // Required in 4.0
class RestApiTest {
    @Autowired
    private lateinit var testRestTemplate: TestRestTemplate
}

// New recommended approach
import org.springframework.boot.test.autoconfigure.web.client.AutoConfigureRestTestClient
import org.springframework.boot.resttestclient.RestTestClient

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient // New annotation
class RestApiTest {
    @Autowired
    private lateinit var restTestClient: RestTestClient

    @Test
    fun testEndpoint() {
        val response = restTestClient.get()
            .uri("/api/users")
            .retrieve()
            .toEntity<List<User>>()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    }
}
```

**TestRestTemplate package change (if still using):**

**IMPORTANT:** If continuing to use `TestRestTemplate`, you must:
1. Add the `spring-boot-resttestclient` test dependency
2. **Update the package import** (class moved to new package)

**libs.versions.toml:**
```toml
[libraries]
spring-boot-resttestclient = { module = "org.springframework.boot:spring-boot-resttestclient", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    testImplementation(libs.spring.boot.resttestclient)
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

## Production-Ready Features and Modules

### Health, Metrics, and Observability Modules

Spring Boot 4.0 modularizes production-ready features into focused modules:

**libs.versions.toml:**
```toml
[libraries]
# Health monitoring
spring-boot-health = { module = "org.springframework.boot:spring-boot-health", version.ref = "springBoot" }

# Micrometer metrics
spring-boot-micrometer-metrics = { module = "org.springframework.boot:spring-boot-micrometer-metrics", version.ref = "springBoot" }
spring-boot-micrometer-metrics-test = { module = "org.springframework.boot:spring-boot-micrometer-metrics-test", version.ref = "springBoot" }

# Micrometer observation
spring-boot-micrometer-observation = { module = "org.springframework.boot:spring-boot-micrometer-observation", version.ref = "springBoot" }

# Distributed tracing
spring-boot-micrometer-tracing = { module = "org.springframework.boot:spring-boot-micrometer-tracing", version.ref = "springBoot" }
spring-boot-micrometer-tracing-test = { module = "org.springframework.boot:spring-boot-micrometer-tracing-test", version.ref = "springBoot" }
spring-boot-micrometer-tracing-brave = { module = "org.springframework.boot:spring-boot-micrometer-tracing-brave", version.ref = "springBoot" }
spring-boot-micrometer-tracing-opentelemetry = { module = "org.springframework.boot:spring-boot-micrometer-tracing-opentelemetry", version.ref = "springBoot" }

# OpenTelemetry integration
spring-boot-opentelemetry = { module = "org.springframework.boot:spring-boot-opentelemetry", version.ref = "springBoot" }

# Zipkin reporter
spring-boot-zipkin = { module = "org.springframework.boot:spring-boot-zipkin", version.ref = "springBoot" }
```

**build.gradle.kts (example observability stack):**
```kotlin
dependencies {
    // Actuator with metrics and tracing
    implementation(libs.spring.boot.starter.actuator)
    implementation(libs.spring.boot.micrometer.observation)
    implementation(libs.spring.boot.micrometer.tracing.opentelemetry)
    implementation(libs.spring.boot.opentelemetry)

    // Test support
    testImplementation(libs.spring.boot.micrometer.metrics.test)
    testImplementation(libs.spring.boot.micrometer.tracing.test)
}
```

**Note:** Most applications using starters (e.g., `spring-boot-starter-actuator`) won't need to declare these modules directly. Use direct module dependencies for fine-grained control.

## Actuator Changes

### Health Probes Enabled by Default

Liveness and readiness probes now **enabled by default**.

**application.yml (disable if needed):**
```yaml
management:
  endpoint:
    health:
      probes:
        enabled: false # Disable if not using Kubernetes probes
```

**Automatically exposes:**
- `/actuator/health/liveness`
- `/actuator/health/readiness`

## Build Configuration

### Kotlin Compiler Configuration

**build.gradle.kts:**
```kotlin
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "2.2.0" // Minimum 2.2.0
    kotlin("plugin.spring") version "2.2.0"
    kotlin("plugin.jpa") version "2.2.0"
    id("org.springframework.boot") version "4.0.0"
    id("io.spring.dependency-management") version "1.1.7"
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21) // Or 17, 25
    }
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll(
            "-Xjsr305=strict", // Strict null-safety
            "-Xemit-jvm-type-annotations" // Emit type annotations
        )
    }
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "21" // Match Java toolchain
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

### Java Preview Features (if using Java 25)

**build.gradle.kts:**
```kotlin
tasks.withType<JavaCompile> {
    options.compilerArgs.add("--enable-preview")
}

tasks.withType<Test> {
    jvmArgs("--enable-preview")
}

tasks.withType<JavaExec> {
    jvmArgs("--enable-preview")
}
```

## Migration Checklist

### Pre-Migration

- [ ] Upgrade to latest Spring Boot 3.5.x
- [ ] Review and fix all deprecation warnings
- [ ] Document current dependency versions
- [ ] Run full test suite and verify green build
- [ ] Review [Spring Boot 3.5.x → 4.0 dependency changes](https://docs.spring.io/spring-boot/4.0/appendix/dependency-versions/coordinates.html)

### Core Migration

- [ ] Update `libs.versions.toml` with Spring Boot 4.0.0
- [ ] Update Kotlin version to 2.2.0+
- [ ] Rename starters: `spring-boot-starter-web` → `spring-boot-starter-webmvc`, etc.
- [ ] Add technology-specific test starters (or use classic starters temporarily)
- [ ] Remove Undertow dependency if present (switch to Tomcat/Jetty)
- [ ] Remove `spring-session-hazelcast` / `spring-session-mongodb` or add explicit versions

### Jackson 3 Migration

- [ ] Update imports: `com.fasterxml.jackson` → `tools.jackson`
- [ ] Update exception: `jackson-annotations` still uses `com.fasterxml.jackson.core`
- [ ] Rename: `@JsonComponent` → `@JacksonComponent`
- [ ] Rename: `Jackson2ObjectMapperBuilderCustomizer` → `JsonMapperBuilderCustomizer`
- [ ] Update properties: `spring.jackson.read.*` → `spring.jackson.json.read.*`
- [ ] Consider temporary `spring-boot-jackson2` module if needed

### Property Updates

- [ ] MongoDB: `spring.data.mongodb.*` → `spring.mongodb.*` (for non-Spring Data properties)
- [ ] Session: `spring.session.redis.*` → `spring.session.data.redis.*`
- [ ] Persistence: `spring.dao.exceptiontranslation` → `spring.persistence.exceptiontranslation`
- [ ] Kafka retry: `backoff.random` → `backoff.jitter`

### Code Updates

- [ ] Update package: `BootstrapRegistry` → `org.springframework.boot.bootstrap.BootstrapRegistry`
- [ ] Update package: `EnvironmentPostProcessor` → `org.springframework.boot.EnvironmentPostProcessor`
- [ ] Update package: `EntityScan` → `org.springframework.boot.persistence.autoconfigure.EntityScan`
- [ ] Update: `RestClient` → `Rest5Client` (Elasticsearch)
- [ ] Update: `StreamBuilderFactoryBeanCustomizer` → `StreamsBuilderFactoryBeanConfigurer` (Kafka)
- [ ] Split: `RabbitRetryTemplateCustomizer` → `RabbitTemplateRetrySettingsCustomizer` / `RabbitListenerRetrySettingsCustomizer`
- [ ] Replace: `HttpMessageConverters` → `ClientHttpMessageConvertersCustomizer` / `ServerHttpMessageConvertersCustomizer`
- [ ] Update: `PropertyMapper` usage with `.always()` if null handling needed

### Testing Updates

- [ ] Add `@ExtendWith(MockitoExtension::class)` to tests using `@Mock` / `@Captor`
- [ ] Add `@AutoConfigureMockMvc` to tests using `MockMvc`
- [ ] Add `@AutoConfigureWebTestClient` to tests using `WebTestClient`
- [ ] Migrate `TestRestTemplate` → `RestTestClient` (or add `@AutoConfigureTestRestTemplate`)
- [ ] Update: `@PropertyMapping` imports → `org.springframework.boot.test.context`

### Build Configuration

- [ ] Update Gradle to 8.5+
- [ ] Update Gradle CycloneDX plugin to 3.0.0+
- [ ] Review optional dependency inclusion in uber jars
- [ ] Remove `loaderImplementation = CLASSIC` if present
- [ ] Remove `launchScript()` configuration if present

### Verification

- [ ] Run `./gradlew clean build`
- [ ] Run full test suite
- [ ] Verify integration tests with TestContainers
- [ ] Check for new Kotlin null-safety warnings
- [ ] Test Spring Boot Actuator endpoints
- [ ] Verify health probes (`/actuator/health/liveness`, `/actuator/health/readiness`)
- [ ] Performance test with new defaults

### Post-Migration

- [ ] Review Spring Boot 4.0 release notes for additional features
- [ ] Consider adopting new Spring Framework 7.0 features
- [ ] Plan migration away from classic starters (if used)
- [ ] Plan migration away from `spring-boot-jackson2` module (if used)
- [ ] Update CI/CD pipelines for Java 17+ requirement
- [ ] Update deployment manifests (Servlet 6.1 containers)

## Common Pitfalls

1. **Classic starters**: Remember these are deprecated - plan migration to technology-specific starters
2. **Undertow**: Completely removed, no workaround - must use Tomcat or Jetty
3. **Jackson 3 packages**: Easy to miss `jackson-annotations` still using old group ID
4. **MongoDB properties**: Many moved to `spring.mongodb.*` but some remain in `spring.data.mongodb.*`
5. **Test configuration**: `@SpringBootTest` no longer auto-configures MockMVC/WebTestClient/TestRestTemplate
6. **Kotlin 2.2**: Required minimum - older versions won't work
7. **Null-safety**: JSpecify annotations may surface new warnings in Kotlin
8. **PropertyMapper**: Behavioral change with null handling - review usage
9. **Jersey + Jackson 3**: Incompatible - use `spring-boot-jackson2` module
10. **Health probes**: Now enabled by default - may affect non-Kubernetes deployments

## Performance Considerations

- **Modular starters**: Smaller JARs and faster startup with technology-specific starters
- **Spring Framework 7**: Performance improvements in core framework
- **Jackson 3**: Improved JSON processing performance
- **Virtual threads**: Consider enabling with Java 21+ (`spring.threads.virtual.enabled=true`)

## Resources

- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Spring Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/releases)
- [Spring Framework 7.0 Documentation](https://docs.spring.io/spring-framework/reference/)
- [Jackson 3 Migration Guide](https://github.com/FasterXML/jackson/wiki/Jackson-3.0-Migration-Guide)
- [Kotlin 2.2 Release Notes](https://kotlinlang.org/docs/whatsnew22.html)

---
