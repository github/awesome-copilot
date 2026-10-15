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
- **Gradle**: 8.14+ (required by the Spring Boot 4 Gradle plugin; also covers Kotlin DSL and version catalogs)
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
springBoot = "3.5.x" # Latest 3.5 patch before migrating to 4.0 (look up the current one)
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

