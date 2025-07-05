---
applyTo: '*'
description: 'Quarkus development standards and instructions'
---

- Instructions for high-quality Quarkus applications with Java 17 or later.

## Project Context

- Latest Quarkus version: 3.x
- Java version: 17 or later
- Use Maven or Gradle for build management.
- Focus on clean architecture, maintainability, and performance.

## Development Standards

  - Write clear and concise comments for each class, method, and complex logic.
  - Use Javadoc for public APIs and methods to ensure clarity for consumers.
  - Maintain a consistent coding style across the project, adhering to Java conventions.
  - Adhere to the Quarkus coding standards and best practices for optimal performance and maintainability.
  - Follow Jarkarta EE and MicroProfile conventions, ensuring clarity in package organization.
  - Use Java 17 or later features where appropriate, such as records and sealed classes.


## Naming Conventions
  - Use PascalCase for class names (e.g., `ProductService`, `ProductResource`).
  - Use camelCase for method and variable names (e.g., `findProductById`, `isProductAvailable`).
  - Use ALL_CAPS for constants (e.g., `DEFAULT_PAGE_SIZE`).

##  Quarkus
  - Leverage Quarkus Dev Mode for faster development cycles.
  - Implement build-time optimizations using Quarkus extensions and best practices.
  - Configure native builds with GraalVM for optimal performance (e.g., use the quarkus-maven-plugin).
  - Use quarkus logging capabilities (JBoss, SL4J or JUL) for consistent logging practices.

### Quarkus-Specific Patterns
- Use `@ApplicationScoped` for singleton beans instead of `@Singleton`
- Use `@Inject` for dependency injection
- Prefer Panache repositories over traditional JPA repositories
- Use `@Transactional` on service methods that modify data
- Apply `@Path` with descriptive REST endpoint paths
- Use `@Consumes(MediaType.APPLICATION_JSON)` and `@Produces(MediaType.APPLICATION_JSON)` for REST resources

### REST Resources
- Always use JAX-RS annotations (`@Path`, `@GET`, `@POST`, etc.)
- Return proper HTTP status codes (200, 201, 400, 404, 500)
- Use `Response` class for complex responses
- Include proper error handling with try-catch blocks
- Validate input parameters using Bean Validation annotations
- Implement rate limiting for public endpoints

### Data Access
- Prefer Panache entities (extend `PanacheEntity`) over traditional JPA
- Use Panache repositories (`PanacheRepository<T>`) for complex queries
- Always use `@Transactional` for data modifications
- Use named queries for complex database operations
- Implement proper pagination for list endpoints


### Configuration
- Use `application.properties` or `application.yaml` for simple configuration
- Use `@ConfigProperty` for type-safe configuration classes
- Prefer environment variables for sensitive data
- Use profiles for different environments (dev, test, prod)


### Testing
- Use `@QuarkusTest` for integration tests
- Use JUnit 5 for unit tests
- Use `@QuarkusIntegrationTest` for native build tests
- Mock external dependencies using `@QuarkusTestResource`
- Use RestAssured for REST endpoint testing (`@QuarkusTestResource`)
- Use `@Transactional` for tests that modify the database
- Use test-containers for database integration tests

### Don't use these patterns:
- Don't use field injection in tests (use constructor injection)
- Don't hardcode configuration values
- Don't ignore exceptions


## Development Workflow

### When creating new features:
1. Create entity with proper validation
2. Create repository with custom queries
3. Create service with business logic
4. Create REST resource with proper endpoints
5. Write comprehensive tests
6. Add proper error handling
7. Update documentation

## Security Considerations

### When implementing security:
- Use Quarkus Security extensions (e.g., `quarkus-smallrye-jwt`, `quarkus-oidc`).
- Implement role-based access control (RBAC) using MicroProfile JWT or OIDC.
- Validate all input parameters
