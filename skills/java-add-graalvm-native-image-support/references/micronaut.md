# Micronaut native images

Micronaut performs ahead-of-time processing at compile time, so most native image metadata is generated automatically.

## Commands

- Maven: `./mvnw package -Dpackaging=native-image` (container build: `./mvnw package -Dpackaging=docker-native`)
- Gradle: `./gradlew nativeCompile` (container: `./gradlew dockerBuildNative`)
- Native tests: `./mvnw -Pgraalvm test` or `./gradlew nativeTest`, depending on the generated project

The Micronaut Maven/Gradle plugins configure the Native Build Tools plugin for you; do not add it again.

## Reflection and resources

1. **Bean introspection**: `@Introspected` for POJOs avoids reflection:

   ```java
   @Introspected
   public class MyDto {
       private String name;
       private int value;
       // getters and setters
   }
   ```

   Or `@Serdeable` for Micronaut Serialization types.

2. **Reflection**: `@ReflectionConfig(type = MyClass.class, accessType = TypeHint.AccessType.ALL_DECLARED_CONSTRUCTORS)` (both from `io.micronaut.core.annotation`; `accessType` takes `TypeHint.AccessType[]`) on a configuration class, or `@TypeHint(MyClass.class)` for the default access.
3. **Resources**: Micronaut has no resource annotation; list patterns in `META-INF/native-image/<group>/<artifact>/resource-config.json` (or the unified `reachability-metadata.json`), or use the Native Build Tools resource detection settings.
4. **Gradle build arguments** (only if needed):

   ```groovy
   graalvmNative {
       binaries {
           main {
               buildArgs.add("--initialize-at-run-time=io.netty")
           }
       }
   }
   ```

   Micronaut already sets sensible initialization defaults; add flags only for a specific failing class. Avoid `--report-unsupported-elements-at-runtime` outside diagnosis.

## Tips

- Use Micronaut's compile-time features (`@Introspected`, `@Serdeable`, `@Client` interfaces) rather than runtime reflection.
- Netty and HTTP client tuning is a runtime concern; do not change `netty.default.allocator` settings to fix native build errors.
- Prefer upgrading Micronaut modules to current releases before adding manual metadata.

Guide: https://docs.micronaut.io/latest/guide/#graal
