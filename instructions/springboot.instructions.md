---
description: 'Guidelines for building Spring Boot base applications'
applyTo: '**/*.java'
---

# Spring Boot Development

Apply these instructions only when the project uses Spring Boot. For Kotlin projects, see `kotlin-springboot`.

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

- Use `application.properties` or `application.yml` for externalized configuration, matching what the project already uses.
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
- Validate request bodies and parameters using Bean Validation (`@Valid`, `@NotNull`, `@Size`, etc.) annotations and handle `MethodArgumentNotValidException` in a `@RestControllerAdvice`

## Build and Verification

- After adding or modifying code, verify the project continues to build successfully.
- If the project uses Maven, run `./mvnw verify` (use the wrapper). `package` skips Failsafe integration tests (`*IT`).
- If the project uses Gradle, run `./gradlew build` (or `gradlew.bat build` on Windows).
- Ensure all tests pass as part of the build.
- Use `package` or `test` only as focused, faster commands, not as the verification gate.

## Useful Commands

| Gradle Command            | Maven Command                     | Description                                   |
|:--------------------------|:----------------------------------|:----------------------------------------------|
| `./gradlew bootRun`       |`./mvnw spring-boot:run`           | Run the application.                          |
| `./gradlew build`         |`./mvnw verify`                    | Build and run all tests.                      |
| `./gradlew test`          |`./mvnw test`                      | Run tests.                                    |
| `./gradlew bootJar`       |`./mvnw spring-boot:repackage`     | Package the application as a JAR.             |
| `./gradlew bootBuildImage`|`./mvnw spring-boot:build-image`   | Package the application as a container image. |
