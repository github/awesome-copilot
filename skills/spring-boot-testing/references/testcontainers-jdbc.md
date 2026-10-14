# Testcontainers JDBC

Testing JPA repositories with real databases using Testcontainers.

## Overview

Testcontainers provides real database instances in Docker containers for integration testing. More reliable than H2 for production parity.

## Quickstart: `@ServiceConnection` (PostgreSQL)

Check the project's versions first. Testcontainers 2.x (Spring Boot 4) and 1.x (Spring Boot 3) differ in artifact and package names:

| | Testcontainers 2.x (Boot 4) | Testcontainers 1.x (Boot 3.1+) |
|--|-----------------------------|--------------------------------|
| PostgreSQL artifact | `testcontainers-postgresql` | `postgresql` |
| JUnit 5 integration | `testcontainers-junit-jupiter` | `junit-jupiter` |
| Container class | `org.testcontainers.postgresql.PostgreSQLContainer` | `org.testcontainers.containers.PostgreSQLContainer` |

`@ServiceConnection` (Spring Boot 3.1+) replaces `@DynamicPropertySource` boilerplate. Versions of these artifacts are managed by the Spring Boot BOM.

### Dependencies (Boot 4 / Testcontainers 2.x)

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-testcontainers</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers-postgresql</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers-junit-jupiter</artifactId>
  <scope>test</scope>
</dependency>
```

### Option A: shared configuration (recommended, reusable across tests)

```java
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration { // public: tests in sub-packages import it

  @Bean
  @ServiceConnection
  PostgreSQLContainer postgresContainer() {
    return new PostgreSQLContainer("postgres:18-alpine");
  }
}

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class OrderIT { }
```

Starting the app against the same container for local development: `SpringApplication.from(Application::main).with(TestcontainersConfiguration.class).run(args)`.

### Option B: per-class container

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class OrderRepositoryPostgresTest {
  
  @Container
  @ServiceConnection
  static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18");
  
  @Autowired
  private OrderRepository orderRepository;
  
  @Autowired
  private TestEntityManager entityManager;
}
```

Note: `Order` is a reserved word in SQL; an entity named `Order` needs `@Table(name = "orders")` or PostgreSQL fails with `syntax error at or near "order"` (verified).

## MySQL Setup

```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers-mysql</artifactId>
  <scope>test</scope>
</dependency>
```

```java
import org.testcontainers.mysql.MySQLContainer; // 2.x

@Container
@ServiceConnection
static MySQLContainer mysql = new MySQLContainer("mysql:8.4");
```

Testcontainers 1.x (Boot 3) variant: `org.testcontainers.containers.MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4")` with the `mysql` artifact.

## Multiple Databases

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class MultiDatabaseTest {
  
  @Container
  @ServiceConnection(name = "primary")
  static PostgreSQLContainer primaryDb = new PostgreSQLContainer("postgres:18");
  
  @Container
  @ServiceConnection(name = "analytics")
  static PostgreSQLContainer analyticsDb = new PostgreSQLContainer("postgres:18");
}
```

## Container Reuse (Speed Optimization)

Cross-run reuse is local-dev only. Opt in with `testcontainers.reuse.enable=true` in `~/.testcontainers.properties`. `@Container` does not give cross-run reuse because the extension stops the container after the tests. Start the container manually, without extension-managed shutdown:

```java
@ServiceConnection
static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18")
  .withReuse(true);

static {
  postgres.start();
}
```

For the generic lifecycle, singleton and reuse rules, use the `java-testcontainers` skill.

## Database Initialization

### With SQL Scripts

```java
@Container
@ServiceConnection
static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18")
  .withInitScript("schema.sql");
```

### With Flyway

```java
@SpringBootTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class MigrationTest {
  
  @Container
  @ServiceConnection
  static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18");
  
  @Autowired
  private Flyway flyway;
  
  @Test
  void shouldApplyMigrations() {
    flyway.migrate();
    // Test code
  }
}
```

## Advanced Configuration

### Custom Database/Schema

```java
@Container
@ServiceConnection
static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18")
  .withDatabaseName("testdb")
  .withUsername("testuser")
  .withPassword("testpass")
  .withInitScript("init-schema.sql");
```

### Wait Strategies

```java
@Container
static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18")
  .waitingFor(Wait.forLogMessage(".*database system is ready.*", 1));
```

## Test Example

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class OrderRepositoryTest {
  
  @Container
  @ServiceConnection
  static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18");
  
  @Autowired
  private OrderRepository orderRepository;
  
  @Autowired
  private TestEntityManager entityManager;
  
  @Test
  void shouldFindOrdersByStatus() {
    // Given
    entityManager.persist(new Order("PENDING"));
    entityManager.persist(new Order("COMPLETED"));
    entityManager.flush();
    
    // When
    List<Order> pending = orderRepository.findByStatus("PENDING");
    
    // Then
    assertThat(pending).hasSize(1);
    assertThat(pending.get(0).getStatus()).isEqualTo("PENDING");
  }
  
  @Test
  void shouldSupportPostgresSpecificFeatures() {
    // Can use Postgres-specific features like:
    // - JSONB columns
    // - Array types
    // - Full-text search
  }
}
```

## @DynamicPropertySource Alternative

If not using @ServiceConnection:

```java
@SpringBootTest
@Testcontainers
class OrderServiceTest {
  
  @Container
  static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18");
  
  @DynamicPropertySource
  static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }
}
```

## Supported Databases

Container classes (2.x) live in `org.testcontainers.<module>` and are non-generic (e.g. `org.testcontainers.mysql.MySQLContainer`).

| Database | Container Class | Maven Artifact |
| -------- | --------------- | -------------- |
| PostgreSQL | PostgreSQLContainer | testcontainers-postgresql |
| MySQL | MySQLContainer | testcontainers-mysql |
| MariaDB | MariaDBContainer | testcontainers-mariadb |
| SQL Server | MSSQLServerContainer | testcontainers-mssqlserver |
| Oracle | OracleContainer | testcontainers-oracle-free |
| MongoDB | MongoDBContainer | testcontainers-mongodb |

## Running `*IT` classes

Integration tests named `*IT` run in Maven's Failsafe, not Surefire; see [failsafe-integration-tests.md](failsafe-integration-tests.md) or they will silently not run.

## Best Practices

1. Use @ServiceConnection when possible (Spring Boot 3.1+)
2. Enable container reuse for faster local builds
3. Use specific versions (postgres:18) not latest
4. Keep container config in static field
5. Use @DataJpaTest with AutoConfigureTestDatabase.Replace.NONE
