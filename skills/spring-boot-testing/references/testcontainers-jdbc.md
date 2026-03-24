# Testcontainers JDBC

Testing JPA repositories with real databases using Testcontainers.

## Overview

Testcontainers provides real database instances in Docker containers for integration testing. More reliable than H2 for production parity.

## PostgreSQL Setup

### Dependencies

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
```

### Basic Test

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class OrderRepositoryPostgresTest {
  
  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18");
  
  @Autowired
  private OrderRepository orderRepository;
  
  @Autowired
  private TestEntityManager entityManager;
}
```

## MySQL Setup

```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers-mysql</artifactId>
  <scope>test</scope>
</dependency>
```

```java
@Container
@ServiceConnection
static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");
```

## Multiple Databases

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class MultiDatabaseTest {
  
  @Container
  @ServiceConnection(name = "primary")
  static PostgreSQLContainer<?> primaryDb = new PostgreSQLContainer<>("postgres:18");
  
  @Container
  @ServiceConnection(name = "analytics")
  static PostgreSQLContainer<?> analyticsDb = new PostgreSQLContainer<>("postgres:18");
}
```

## Container Reuse (Speed Optimization)

Add to `~/.testcontainers.properties`:

```properties
testcontainers.reuse.enable=true
```

Then enable reuse in code:

```java
@Container
@ServiceConnection
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18")
  .withReuse(true);
```

## Database Initialization

### With SQL Scripts

```java
@Container
@ServiceConnection
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18")
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
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18");
  
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
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18")
  .withDatabaseName("testdb")
  .withUsername("testuser")
  .withPassword("testpass")
  .withInitScript("init-schema.sql");
```

### Wait Strategies

```java
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18")
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
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18");
  
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
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18");
  
  @DynamicPropertySource
  static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }
}
```

## Supported Databases

| Database | Container Class | Maven Artifact |
| -------- | --------------- | -------------- |
| PostgreSQL | PostgreSQLContainer | testcontainers-postgresql |
| MySQL | MySQLContainer | testcontainers-mysql |
| MariaDB | MariaDBContainer | testcontainers-mariadb |
| SQL Server | MSSQLServerContainer | testcontainers-mssqlserver |
| Oracle | OracleContainer | testcontainers-oracle-free |
| MongoDB | MongoDBContainer | testcontainers-mongodb |

## Best Practices

1. Use @ServiceConnection when possible (Spring Boot 3.1+)
2. Enable container reuse for faster local builds
3. Use specific versions (postgres:18) not latest
4. Keep container config in static field
5. Use @DataJpaTest with AutoConfigureTestDatabase.Replace.NONE
