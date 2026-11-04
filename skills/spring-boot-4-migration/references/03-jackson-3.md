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
jackson = "3.1.5" # Managed by Spring Boot 4.x; use the version from your Boot BOM

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
| `JsonObjectDeserializer` | `ObjectValueDeserializer` |
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
import tools.jackson.databind.ValueSerializer

@JacksonComponent
class CustomSerializer : ValueSerializer<MyType>() { }

@Configuration
class JacksonConfig {
    @Bean
    fun customizer(): JsonMapperBuilderCustomizer {
        return JsonMapperBuilderCustomizer { builder ->
            builder.defaultDateFormat(SimpleDateFormat("yyyy-MM-dd"))
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
    deserialization:
      read-enums-using-to-string: true
    serialization:
      write-dates-as-timestamps: false

# New (Spring Boot 4.0)
spring:
  jackson:
    datatype:
      enum:
        read-enums-using-to-string: true
      datetime:
        write-dates-as-timestamps: false
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

**application.yml (select the Jackson 2 mapper for MVC and imperative HTTP clients):**
```yaml
spring:
  http:
    converters:
      preferred-json-mapper: jackson2
```

For WebFlux and reactive HTTP clients, use `spring.http.codecs.preferred-json-mapper=jackson2` instead. Configure both properties if the application uses both converter and codec stacks.

Configure the compatibility mapper under `spring.jackson2.*`. Verify that its Jackson 2 modules and custom serializers are applied to HTTP request/response bodies.

This is different from `spring.jackson.use-jackson2-defaults=true`: that property keeps the Jackson 3 `JsonMapper` but aligns its defaults with Jackson 2 behavior. It does not select the Jackson 2 compatibility mapper or make Jackson 2 modules work with Jackson 3.

**Plan migration away from this module** - it will be removed in future versions.
