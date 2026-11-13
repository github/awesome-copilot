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
springBoot = "4.0.x" # Target 4.0 patch release

[libraries]
# Core starters with dedicated test modules
spring-boot-starter-webmvc = { module = "org.springframework.boot:spring-boot-starter-webmvc", version.ref = "springBoot" }
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

#### Option 2: Classic Starters (Quick Migration, Temporary)

The classic starters restore the Boot 3 *module granularity*, not the Boot 3 starters. Verified on Boot 4.x with a migrated JPA + security + web project:

- `spring-boot-starter-classic` = `spring-boot-starter` + `spring-boot-autoconfigure-classic`: all auto-configuration modules, but without their library dependencies.
- `spring-boot-starter-test-classic` = `spring-boot-starter-test` + all the `*-test` modules (webmvc, data-jpa, security, ...).
- You still declare the technology starters (`spring-boot-starter-webmvc`, `-data-jpa`, `-security`, ...): with only the classic starters the build fails on missing `jakarta.persistence`, Spring Security and Jackson classes.
- They do **not** bring back the old packages or `@MockBean`: the test/auto-configuration imports must still be migrated (see the testing reference).
- `spring-boot-starter-web` itself still resolves in Boot 4.x as a deprecated alias of `spring-boot-starter-webmvc`.

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
    implementation(libs.spring.boot.starter.webmvc) // technology starters are still required
    testImplementation(libs.spring.boot.starter.test.classic)
}
```

**Note**: the Spring Boot migration guide recommends eventually migrating away from the classic starters (whether and when they are removed is not stated there). Plan migration to technology-specific starters.

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

