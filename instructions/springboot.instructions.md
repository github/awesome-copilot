---
description: 'Guidelines for building Spring Boot base applications'
applyTo: '**/*.java, **/*.kt'
---

# Spring Boot Development

## General Instructions

- Make only high confidence suggestions when reviewing code changes.
- Write code with good maintainability practices, including comments on why certain design decisions were made.
- Handle edge cases and write clear exception handling.
- For libraries or external dependencies, mention their usage and purpose in comments.

## Spring Boot Instructions

### Dependency Injection

- Use constructor injection for all required dependencies.
- Declare dependency fields as `private final`.

### Configuration

- Use YAML files (`application.yml`) for externalized configuration.
- Environment Profiles: Use Spring profiles for different environments (dev, test, prod)
- Configuration Properties: Use @ConfigurationProperties for type-safe configuration binding
- Secrets Management: Externalize secrets using environment variables or secret management systems

### Code Organization

- Package Structure: Organize by feature/domain rather than by layer
- Separation of Concerns: Keep controllers thin, services focused, and repositories simple
- Utility Classes: Make utility classes final with private constructors

### Service Layer

- Place business logic in `@Service`-annotated classes.
- Services should be stateless and testable.
- Inject repositories via the constructor.
- Service method signatures should use domain IDs or DTOs, not expose repository entities directly unless necessary.

### Logging

- Use SLF4J for all logging (`private static final Logger logger = LoggerFactory.getLogger(MyClass.class);`).
- Do not use concrete implementations (Logback, Log4j2) or `System.out.println()` directly.
- Use parameterized logging: `logger.info("User {} logged in", userId);`.

### Security & Input Handling

- Use parameterized queries | Always use Spring Data JPA or `NamedParameterJdbcTemplate` to prevent SQL injection.
- Validate request bodies and parameters using JSR-380 (`@NotNull`, `@Size`, etc.) annotations and `BindingResult`

## Build and Verification

- After adding or modifying code, verify the project continues to build successfully.
- If the project uses Maven, run `mvn clean install`.
- If the project uses Gradle, run `./gradlew build` (or `gradlew.bat build` on Windows).
- Ensure all tests pass as part of the build.
