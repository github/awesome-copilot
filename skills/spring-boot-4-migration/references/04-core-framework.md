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
    val nonNullId = id ?: return null // findById now requires a non-null ID
    return userRepository.findById(nonNullId).orElse(null) // Optional<User> -> User?
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

**Removed method:** `alwaysApplyingNotNull()` - remove this configuration: Boot 4 skips null source values by default. Do not replace it with `always()`, which explicitly passes nulls through; reserve `always()` for mappings that intentionally accept null.

**Migration example:** Review [Spring Boot commit 239f384ac0](https://github.com/spring-projects/spring-boot/commit/239f384ac0893d151b89f204886874c6adb00001) to see how Spring Boot itself adapted to the new API.
