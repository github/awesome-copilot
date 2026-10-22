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

