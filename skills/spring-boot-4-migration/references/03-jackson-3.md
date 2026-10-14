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
jackson = "3.1.5" # Managed by Spring Boot 4.1; use the version from your Boot BOM

[libraries]
# Jackson 3 uses new group ID
jackson-databind = { module = "tools.jackson.core:jackson-databind", version.ref = "jackson" }
jackson-module-kotlin = { module = "tools.jackson.module:jackson-module-kotlin", version.ref = "jackson" }

# Exception: annotations still use old group
# (its version stays 2.x, e.g. 2.22; do not reuse the Jackson 3 version; omit the version when the Boot BOM manages it)
jackson-annotations = { module = "com.fasterxml.jackson.core:jackson-annotations" }
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
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer
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

