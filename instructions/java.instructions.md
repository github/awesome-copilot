---
description: 'Instructions for writing Java code following modern Java practices and community standards'
applyTo: '**/*.java, **/pom.xml, **/build.gradle, **/build.gradle.kts'
---

# Java Development Instructions

Follow modern Java practices and community standards when writing Java code. These instructions are based on the [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html), [Oracle Code Conventions](https://www.oracle.com/java/technologies/javase/codeconventions-introduction.html), and Effective Java (Bloch).

## General Instructions

- Write clear, readable, and idiomatic Java code
- Prefer clarity and simplicity over cleverness
- Target Java 21 LTS as the minimum baseline; note preview features from Java 22-25 when relevant
- Use strong typing; avoid raw types
- Leverage the standard library before adding external dependencies
- Follow SOLID principles
- Write self-documenting code with descriptive names
- Document all public APIs with Javadoc
- Write comments in English by default
- Avoid emoji in code and comments
- Favor composition over inheritance
- Keep methods short and focused on a single responsibility
- Return early to reduce nesting depth

## Naming Conventions

### Packages

- Use all-lowercase, reverse domain name notation (`com.example.project`)
- Use singular nouns for package names
- Avoid underscores, hyphens, or mixed case
- Name packages after the functionality they provide, not generic terms (`util`, `common`, `misc`)

### Classes and Interfaces

- Use PascalCase (UpperCamelCase) for class, interface, enum, and record names
- Name classes as nouns or noun phrases (`CustomerService`, `HttpClient`)
- Name interfaces as adjectives, capabilities, or nouns (`Serializable`, `Comparable`, `EventListener`)
- Prefix interfaces with `I` only if the project convention requires it; Java convention does not
- Use UPPER_SNAKE_CASE for enum constants (`Status.PENDING`, `Color.RED`)
- Name enum types in PascalCase (`OrderStatus`, `Priority`)

### Records

- Name records as nouns describing the data they carry (`UserProfile`, `OrderSummary`)
- Keep record components descriptive and concise

### Methods

- Use camelCase for methods
- Name methods as verbs or verb phrases (`calculateTotal`, `sendEmail`, `isValid`)
- Use `get`/`set` prefixes for JavaBean accessors; prefer direct accessor names for records
- Boolean methods start with `is`, `has`, `can`, `should`

### Variables and Fields

- Use camelCase for local variables, parameters, and instance fields
- Use descriptive names; avoid single-letter names except in very short scopes (`i`, `j` in loops)
- Avoid Hungarian notation
- Name collections as plurals (`orders`, `userNames`)

### Constants

- Use UPPER_SNAKE_CASE for `static final` constants (`MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`)
- Group related constants in a dedicated class or enum

### Type Parameters

- Use single uppercase letters: `T` (type), `E` (element), `K` (key), `V` (value), `R` (return type)
- Use descriptive names for complex bounds (`<ENTITY extends BaseEntity>`)

## Formatting and Code Style

### Braces and Indentation

- Use K&R brace style (opening brace on same line)
- Indent with 4 spaces; never use tabs
- Maximum line length of 120 characters (or match team `.editorconfig`)
- Break long lines after operators, before dot chains
- One statement per line

### Imports

- Never use wildcard imports (`import java.util.*`)
- Group imports: `java.*`, blank line, `javax.*`, blank line, third-party, blank line, project
- Remove unused imports
- Use static imports sparingly and only for frequently used constants or utility methods (`assertThat`, `Mockito.when`)

### Annotations

- Place annotations on separate lines before the annotated element
- Use `@Override` on every overriding method
- Use `@Deprecated(since = "version", forRemoval = true)` with Javadoc `@deprecated` tag
- Order: `@Override`, then framework annotations, then custom annotations

### Javadoc

- Place Javadoc comments directly before the declaration with no blank line between
- Use `/** ... */` style; single-line form for brief descriptions
- See the Documentation section for Javadoc content requirements

### Modifiers

- Follow the canonical modifier order: `public protected private abstract default static final transient volatile synchronized native strictfp`
- Prefer the most restrictive access modifier possible

## Project Setup and Structure

- Follow standard Maven layout: `src/main/java/`, `src/main/resources/`, `src/test/java/`, `src/test/resources/`
- For Gradle: use the same directory structure; prefer Kotlin DSL (`build.gradle.kts`) over Groovy DSL
- Use multi-module projects for large codebases; each module is a separate Maven module or Gradle subproject
- Organize packages by feature, not by layer (prefer `com.example.order` over `com.example.controller`)
- Keep `module-info.java` files for Java Platform Module System when building libraries
- Place constants and configuration values in dedicated configuration classes, not scattered through code
- Keep `main` method minimal; delegate to application setup classes
- Use resource bundles (`messages.properties`) for user-facing strings

## Modern Java Features

### Records

- Use records for immutable data carriers: DTOs, value objects, API responses
- Avoid records for entities with mutable state or complex behavior
- Records automatically provide `equals()`, `hashCode()`, `toString()`, and accessor methods
- Use compact constructors for validation

```java
public record UserProfile(String name, String email) {
    public UserProfile {
        Objects.requireNonNull(name, "name must not be null");
        Objects.requireNonNull(email, "email must not be null");
    }
}
```

### Sealed Classes

- Use sealed classes to define restricted type hierarchies
- Model domain-specific variants with sealed interfaces and records

```java
public sealed interface Shape permits Circle, Rectangle, Triangle {}
public record Circle(double radius) implements Shape {}
public record Rectangle(double width, double height) implements Shape {}
public record Triangle(double base, double height) implements Shape {}
```

### Pattern Matching

- Use `instanceof` pattern matching to combine type check and cast (finalized in Java 16)
- Use switch expressions with pattern matching for exhaustive type dispatch (finalized in Java 21)
- Use record patterns for destructuring (finalized in Java 21)
- Switch pattern matching and record patterns require Java 21+; on Java 21 these are final but primitive patterns in `switch` remain preview until Java 23+; if targeting an earlier LTS, use `--enable-preview` or guard with `instanceof` chains instead

```java
// Pattern matching with instanceof
if (obj instanceof String s && !s.isEmpty()) {
    process(s);
}

// Switch expression with patterns
double area = switch (shape) {
    case Circle(var r) -> Math.PI * r * r;
    case Rectangle(var w, var h) -> w * h;
    case Triangle(var b, var h) -> 0.5 * b * h;
};
```

### Text Blocks

- Use text blocks for multi-line strings (SQL, JSON, HTML templates)
- Indent text blocks to align with surrounding code
- Use `\` to suppress line breaks when needed

### Virtual Threads

- Use virtual threads for I/O-bound concurrent tasks instead of platform thread pools
- See the Concurrency section for detailed virtual thread guidance

## Null Safety and Optional

- Never return `null` from methods that return collections; return empty collections instead
- Use `Optional<T>` for method return types when absence is a valid result
- Do not use `Optional` as method parameters, fields, or collection elements
- Prefer `Optional.ofNullable()` over `Optional.of()` when the value may be null
- Chain `Optional` with `map`, `flatMap`, `filter`, `orElse`, `orElseGet`; avoid `get()` without `isPresent()`
- Use `@Nullable` and `@NonNull` annotations (JSpecify, JetBrains, or Jakarta) to document nullability at API boundaries
- Validate non-null preconditions with `Objects.requireNonNull()` at method entry points

## Error Handling

- Use checked exceptions for recoverable conditions the caller is expected to handle
- Use unchecked exceptions (`RuntimeException` subclasses) for programming errors
- Always use try-with-resources for `AutoCloseable` resources
- Use multi-catch for related exception types: `catch (IOException | SQLException e)`
- Wrap low-level exceptions with domain-specific exceptions to preserve abstraction boundaries
- Never catch `Throwable` or `Error` unless in top-level handlers
- Do not use exceptions for control flow
- Include context in exception messages: what operation failed and relevant parameters
- Create custom exception hierarchies for domain errors
- Log exceptions at the point of handling, not at every rethrow

```java
try (var reader = Files.newBufferedReader(path)) {
    return parser.parse(reader);
} catch (IOException e) {
    throw new DataLoadException("Failed to load data from " + path, e);
}
```

## Collections and Streams

- Choose the right collection: `List` for ordered elements, `Set` for uniqueness, `Map` for key-value pairs, `Deque` for stack/queue behavior
- Return unmodifiable collections from public APIs: `List.of()`, `Set.of()`, `Map.of()`, `Collections.unmodifiable*()`
- Use `List.copyOf()`, `Set.copyOf()`, `Map.copyOf()` to create defensive copies
- Use the Stream API for declarative data transformations; prefer streams over manual loops for filtering, mapping, and collecting
- Avoid side effects in stream operations
- Prefer method references over lambdas when equally readable: `list.stream().map(String::toUpperCase)`
- Use `Collectors.toUnmodifiableList()` and similar terminal operations
- Avoid parallel streams unless profiling shows a measurable benefit with large datasets
- Use `Stream.toList()` (Java 16+) for simple collection-to-list operations
- Prefer `IntStream`, `LongStream`, `DoubleStream` for primitive operations to avoid boxing
- Use `SequencedCollection` and `SequencedMap` (Java 21) for collections with defined encounter order
- Access first and last elements with `getFirst()` / `getLast()` instead of index arithmetic
- Use `reversed()` for reverse-ordered views without copying

## Concurrency

### Virtual Threads

- Prefer virtual threads for I/O-bound tasks over traditional thread pools
- Create virtual threads with `Thread.ofVirtual()` or `Executors.newVirtualThreadPerTaskExecutor()`
- Use `Executors.newVirtualThreadPerTaskExecutor()` as the default for I/O-bound work
- Avoid `synchronized` for long-running I/O operations; use `ReentrantLock` to prevent pinning
- Do not pool virtual threads; create-per-task is the intended model
- Set meaningful thread names with `Thread.ofVirtual().name("worker-", 0)`

### Structured Concurrency

- Use `StructuredTaskScope` for managing related concurrent tasks (preview feature)
- Use `ShutdownOnFailure` for fail-fast semantics
- Use `ShutdownOnSuccess` when only the first result is needed

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> user = scope.fork(() -> fetchUser(id));
    Subtask<Order> order = scope.fork(() -> fetchOrder(id));
    scope.join().throwIfFailed();
    return new UserOrder(user.get(), order.get());
}
```

### Classic Concurrency

- Use `CompletableFuture` for composable async operations
- Prefer `ExecutorService` over manually creating threads
- Use `ConcurrentHashMap` instead of `Collections.synchronizedMap()`
- Use `AtomicInteger`, `AtomicReference`, and other atomic types for lock-free updates
- Keep synchronized blocks as short as possible
- Avoid nested locking to prevent deadlocks
- Use `CountDownLatch`, `CyclicBarrier`, `Semaphore` for coordination patterns

### Thread Safety

- Document thread-safety guarantees on all public classes
- Mark immutable classes with `@Immutable` or document immutability in Javadoc
- Use `volatile` only for visibility guarantees on individual fields, not for compound operations

## API Design

### Interface Design

- Design interfaces for the minimal contract; prefer small, focused interfaces following ISP
- Use `sealed` interfaces to restrict type hierarchies where exhaustive handling is needed
- Use `@FunctionalInterface` on single-abstract-method interfaces intended as lambda targets
- Accept the most general parameter type possible; return the most specific type useful to callers

### Generics

- Use generics with bounded wildcards: `<? extends T>` for producers, `<? super T>` for consumers (PECS)
- Avoid raw types; parameterize all generic usages

### Immutability and Value Types

- Design immutable classes by default: `final` class, `private final` fields, no setters, defensive copies in constructor
- Prefer records for value types; they provide `equals()`, `hashCode()`, and `toString()` automatically
- Use the builder pattern for objects with many optional parameters
- Implement `Comparable<T>` for natural ordering; use `Comparator` for alternative orderings

### API Evolution

- Return `Optional<T>` from methods that may not find a result
- Avoid returning `null` from public APIs
- Keep APIs backward-compatible; use `@Deprecated(since, forRemoval)` for phased removal

## Logging and Monitoring

- Use SLF4J as the logging facade; bind to Logback or Log4j2 at runtime
- Use parameterized messages, not string concatenation: `log.info("Processing order {}", orderId)`
- Follow logging levels: `ERROR` for failures requiring action, `WARN` for unexpected but handled conditions, `INFO` for significant business events, `DEBUG` for diagnostic details, `TRACE` for fine-grained flow
- Use MDC (Mapped Diagnostic Context) for request correlation IDs
- Never log sensitive data (passwords, tokens, PII)
- Log at the point of handling, not at every rethrow
- Include relevant context (operation, entity ID, user) in log messages
- Use structured logging (JSON format) for production environments

## Testing

- Use JUnit 5 (`@Test`, `@ParameterizedTest`, `@Nested`, `@DisplayName`)
- Name test methods descriptively: `shouldReturnEmptyList_whenNoOrdersExist()`
- Use `@DisplayName` for human-readable test names when method names are insufficient
- Use `@Nested` classes to group related tests
- Use `@ParameterizedTest` with `@ValueSource`, `@CsvSource`, `@MethodSource` for data-driven tests
- Use Mockito for mocking: `@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks`
- Prefer AssertJ fluent assertions: `assertThat(result).isNotEmpty().hasSize(3).contains(expected)`
- Write tests that are independent, repeatable, and fast
- Use TestContainers for integration tests with databases, message brokers, and external services
- Follow Arrange-Act-Assert structure without writing the comments
- Test both happy paths and edge cases / error conditions
- Keep test classes parallel to source classes: `src/test/java/com/example/OrderServiceTest.java`

```java
@Nested
@DisplayName("OrderService.findByStatus")
class FindByStatus {
    @Test
    @DisplayName("returns matching orders when status exists")
    void shouldReturnOrders_whenStatusExists() {
        when(repository.findByStatus(Status.PENDING)).thenReturn(List.of(order));

        var result = service.findByStatus(Status.PENDING);

        assertThat(result).hasSize(1).containsExactly(order);
    }
}
```

## Performance Optimization

- Profile before optimizing; use JFR (Java Flight Recorder) and async-profiler
- Choose the right garbage collector: G1GC (default), ZGC (low latency), Shenandoah (low latency)
- Use `StringBuilder` for string concatenation in loops; single-expression concatenation is optimized by the compiler
- Preallocate collections with expected capacity: `new ArrayList<>(expectedSize)`, `new HashMap<>((int) (expectedSize / 0.75f) + 1)` when sizing for the default load factor
- Use connection pooling (HikariCP) for database connections
- Use `HttpClient` (java.net.http, Java 11+) instead of legacy `HttpURLConnection`
- Avoid boxing in hot loops; use `int` not `Integer` where possible
- Cache expensive computations with `Caffeine` or `ConcurrentHashMap.computeIfAbsent()`
- Be cautious with reflection on hot paths; prefer method handles or generated code where performance is critical

## Security Best Practices

- Validate and sanitize all external input at system boundaries
- Use parameterized queries or prepared statements to prevent SQL injection; never concatenate user input into queries
- Avoid Java serialization (`ObjectInputStream`); use JSON (Jackson, Gson) or Protocol Buffers instead
- Disable external entity processing in XML parsers to prevent XXE attacks
- Never hard-code secrets, credentials, or API keys; load from environment variables or secret management systems
- Use `java.security.SecureRandom` for cryptographic randomness, not `java.util.Random`
- Hash passwords with bcrypt, scrypt, or argon2 (via Bouncy Castle or Spring Security Crypto)
- Use TLS 1.2+ for all network communication
- Apply the principle of least privilege: do not request more permissions than needed
- Keep dependencies updated; use `mvn dependency:tree` or `gradle dependencies` to audit transitive dependencies
- Configure Content Security Policy and CORS headers in web applications
- Use OWASP Dependency-Check or Snyk for vulnerability scanning

## Documentation

- Write Javadoc for all public and protected types, methods, and fields
- Start Javadoc with a summary sentence in third-person declarative form
- Include `@param`, `@return`, `@throws` for all applicable elements
- Use `{@code}` for code references, `{@link}` for cross-references
- Add `{@snippet}` (Java 18+) for longer code examples in Javadoc
- Document thread-safety, nullability, and side effects in Javadoc
- Keep README.md up to date with build instructions and architecture overview

## Build Tools and Development Workflow

- Use Maven Wrapper (`mvnw`) or Gradle Wrapper (`gradlew`) for reproducible builds
- Lock dependency versions; avoid `LATEST` or `RELEASE` qualifiers in Maven, use a BOM or platform dependencies in Gradle
- Enforce code style with Checkstyle, enforce bug patterns with SpotBugs or Error Prone
- Format code with google-java-format or Spotless plugin
- Run `mvn verify` or `gradle check` before committing
- Use dependency management (Maven BOM, Gradle platform) to unify versions across modules
- Enable `-Xlint:all` compiler warnings and treat them as errors in CI
- Use JaCoCo for code coverage reporting

## Deployment and DevOps

- Use Jib (Maven/Gradle plugin) for containerization without a Dockerfile
- For Docker: use multi-stage builds with `eclipse-temurin` base images
- Configure JVM memory settings for containers: `-XX:MaxRAMPercentage=75.0`
- Implement health check endpoints (`/health`, `/readiness`)
- Use GraalVM Native Image for CLI tools and serverless functions where startup time matters
- Use environment variables or external configuration for environment-specific settings (12-factor app)
- Set up CI/CD pipelines that run tests, static analysis, and security scans
- Use semantic versioning for library releases

## Common Pitfalls to Avoid

- Not closing resources (use try-with-resources)
- Catching `Exception` or `Throwable` instead of specific types
- Using raw types instead of generic types
- Relying on `finalize()` for cleanup (deprecated since Java 9, deprecated for removal since Java 18)
- Swallowing exceptions with empty catch blocks
- Using `==` instead of `equals()` for object comparison
- Ignoring `hashCode()` when overriding `equals()`
- Using `double` for monetary calculations (use `BigDecimal`)
- Premature optimization without profiling
- Mutable static fields shared across threads without synchronization
- Overusing inheritance where composition would be simpler
- Blocking virtual threads with `synchronized` on I/O operations

## Quality Checklist

### Core Requirements

- [ ] **Naming**: Follows Google Java Style Guide naming conventions
- [ ] **Modern Java**: Uses records, sealed classes, pattern matching where appropriate
- [ ] **Null Safety**: `Optional` for return types, `@Nullable`/`@NonNull` annotations at boundaries
- [ ] **Error Handling**: Proper exception hierarchy, try-with-resources, meaningful messages
- [ ] **Documentation**: Javadoc on all public APIs with @param, @return, @throws

### Safety and Quality

- [ ] **Testing**: JUnit 5 tests with meaningful names, edge cases covered
- [ ] **Security**: No hardcoded secrets, parameterized queries, input validation
- [ ] **Concurrency**: Thread-safety documented, virtual threads for I/O
- [ ] **Performance**: Profiled before optimizing, appropriate GC configuration
- [ ] **Tooling**: Code passes Checkstyle, SpotBugs/Error Prone, and test suite
