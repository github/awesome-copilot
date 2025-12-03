---
description: 'Step-by-step guide for converting Spring Boot Cassandra applications to use Azure Cosmos DB with Spring Data Cosmos'
applyTo: '**/*.java,**/pom.xml,**/build.gradle,**/application*.properties,**/application*.yml,**/application*.conf'
---

# Comprehensive Guide: Converting Spring Boot Cassandra Applications to Azure Cosmos DB

## Applicability

This guide applies to:
- ✅ Spring Boot 2.x - 3.x applications
- ✅ Reactive programming with Spring WebFlux
- ✅ Maven-based projects
- ✅ Applications using Spring Data Cassandra, Cassandra DAOs, or DataStax drivers
- ✅ Projects with or without Lombok
- ✅ UUID-based or String-based entity identifiers

This guide does NOT cover:
- ❌ Gradle-based projects (Maven commands only)
- ❌ Non-reactive/synchronous Spring applications
- ❌ Non-Spring frameworks (Jakarta EE, Micronaut, Quarkus)
- ❌ Complex Cassandra features (materialized views, UDTs, counters)
- ❌ Bulk data migration (code conversion only)

## Overview

This guide provides step-by-step instructions for converting reactive Spring Boot applications from Apache Cassandra to Azure Cosmos DB using Spring Data Cosmos. It covers all major issues encountered and their solutions, based on real-world conversion experience.

## Prerequisites

- Java 11 or higher
- Azure CLI installed and authenticated (`az login`)
- Azure Cosmos DB account with database created
- Maven 3.6+ or Gradle 6+

## Critical Lessons Learned

### Entity Constructor Issues
**Problem**: Using Lombok `@NoArgsConstructor` with manual constructors causes duplicate constructor compilation errors.
**Solution**: Choose one approach:
- Option 1: Remove `@NoArgsConstructor` and keep manual constructors
- Option 2: Remove manual constructors and rely on Lombok annotations
- **Best Practice**: For Cosmos entities with initialization logic (like setting partition keys), remove `@NoArgsConstructor` and use manual constructors only.

### Business Object Constructor Removal
**Problem**: Removing `@AllArgsConstructor` or custom constructors from business objects (Owner, Pet, Visit, Vet) breaks existing code that uses those constructors.
**Impact**: MappingUtils, DataSeeder, and test files will fail to compile.
**Solution**:
- After removing constructors, search ALL files for constructor calls: `new Owner(...)`, `new Pet(...)`, etc.
- Replace with default constructor + setter pattern:
  ```java
  // Before
  Owner owner = new Owner(id, firstName, lastName, ...);

  // After
  Owner owner = new Owner();
  owner.setId(id);
  owner.setFirstName(firstName);
  owner.setLastName(lastName);
  ```

### Data Seeder Constructor Calls
**Problem**: DataSeeder uses entity constructors with specific IDs (e.g., `new OwnerEntity("owner-1")`), but these constructors may not exist after entity conversion.
**Solution**: Update all entity instantiations in DataSeeder to use setters:
```java
// Before
OwnerEntity owner1 = new OwnerEntity("owner-1");

// After
OwnerEntity owner1 = new OwnerEntity();
owner1.setId("owner-1");
```

### Test File Updates Required
**Problem**: Test files reference old Cassandra DAOs and use UUID constructors.
**Critical Files to Update**:
1. Remove `MockReactiveResultSet.java` (Cassandra-specific)
2. Update `*ReactiveSer vicesTest.java` - replace DAO references with Cosmos repositories
3. Update `*ReactiveControllerTest.java` - replace DAO references with Cosmos repositories
4. Replace all `UUID.fromString()` with String IDs
5. Replace constructor calls: `new Owner(UUID.fromString(...))` with setter pattern

### Application Startup Patience
**Problem**: Application takes 30-45 seconds to fully start (Maven compilation + Spring Boot + Cosmos DB connection).
**Solution**:
- Use background execution: `nohup mvn spring-boot:run -Dspring-boot.run.profiles=cosmos > app.log 2>&1 &`
- Wait at least 45 seconds before checking startup status
- Monitor logs: `tail -f app.log` or `grep "Started" app.log`
- Don't interrupt the process prematurely

### Port Configuration
**Problem**: Application may not run on default port 8080.
**Solution**:
- Check actual port: `ss -tlnp | grep java`
- Test connectivity: `curl http://localhost:<port>/petclinic/api/owners`
- Common ports: 8080, 9966, 9967

## Systematic Compilation Error Resolution

During this conversion, we encountered over 100 compilation errors. Here's the systematic approach that resolved them:

### Step 1: Identify Residual Cassandra Files
**Problem**: Old Cassandra-specific files cause compilation errors after dependencies are removed.
**Solution**: Delete all Cassandra-specific files systematically:

```bash
# Identify and delete old DAOs
find . -name "*Dao.java" -o -name "*DAO.java"
# Delete: OwnerReactiveDao, PetReactiveDao, VetReactiveDao, VisitReactiveDao

# Identify and delete Cassandra mappers
find . -name "*Mapper.java" -o -name "*EntityToOwnerMapper.java"
# Delete: EntityToOwnerMapper, EntityToPetMapper, EntityToVetMapper, EntityToVisitMapper

# Identify and delete old configuration
find . -name "*CassandraConfig.java" -o -name "CassandraConfiguration.java"
# Delete: CassandraConfiguration.java

# Identify test utilities for Cassandra
find . -name "MockReactiveResultSet.java"
# Delete: MockReactiveResultSet.java (Cassandra-specific test utility)
```

### Step 2: Run Incremental Compilation Checks
**Approach**: After each major change, compile to identify remaining issues:

```bash
# After deleting old files
mvn compile 2>&1 | grep -E "(ERROR|error)" | wc -l
# Expected: Number decreases with each fix

# After updating entity constructors
mvn compile 2>&1 | grep "constructor"
# Identify constructor-related compilation errors

# After fixing business object constructors
mvn compile 2>&1 | grep -E "(new Owner|new Pet|new Vet|new Visit)"
# Identify remaining constructor calls that need fixing
```

### Step 3: Fix Constructor-Related Errors Systematically
**Pattern**: Search for all constructor calls in specific file types:

```bash
# Find all constructor calls in MappingUtils
grep -n "new Owner\|new Pet\|new Vet\|new Visit" src/main/java/**/MappingUtils.java

# Find all constructor calls in DataSeeder
grep -n "new OwnerEntity\|new PetEntity\|new VetEntity\|new VisitEntity" src/main/java/**/DataSeeder.java

# Find all constructor calls in test files
grep -rn "new Owner\|new Pet\|new Vet\|new Visit" src/test/java/
```

### Step 4: Update Tests Last
**Rationale**: Fix application code before test code to see all issues clearly:

1. First: Update test repository mocks (DAO → Cosmos Repository)
2. Second: Fix UUID → String conversions in test data
3. Third: Update constructor calls in test setup
4. Finally: Run tests to verify: `mvn test`

### Step 5: Verify Zero Compilation Errors
**Final Check**:
```bash
# Clean and full compile
mvn clean compile

# Should see: BUILD SUCCESS
# Should NOT see any ERROR messages

# Verify test compilation
mvn test-compile

# Run tests
mvn test
```

**Success Indicators**:
- `mvn compile`: BUILD SUCCESS
- `mvn test`: All tests pass (even if some are skipped)
- No ERROR messages in output
- No "cannot find symbol" errors
- No "constructor cannot be applied" errors

## Conversion Steps

### 1. Update Maven Dependencies

#### Remove Cassandra Dependencies
```xml
<!-- REMOVE these Cassandra dependencies -->
<dependency>
    <groupId>com.datastax.oss</groupId>
    <artifactId>java-driver-core</artifactId>
</dependency>
<dependency>
    <groupId>com.datastax.oss</groupId>
    <artifactId>java-driver-query-builder</artifactId>
</dependency>
```

#### Add Azure Cosmos Dependencies
```xml
<!-- Azure Spring Data Cosmos (Java 11 compatible) -->
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-spring-data-cosmos</artifactId>
    <version>3.46.0</version>
</dependency>

<!-- Azure Identity for DefaultAzureCredential authentication -->
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
    <version>1.11.4</version>
</dependency>
```

#### Critical: Add Version Management for Compatibility
Spring Boot 2.3.x has version conflicts with Azure libraries. Add this to your `<dependencyManagement>` section:

```xml
<dependencyManagement>
    <dependencies>
        <!-- Override reactor-netty version to fix compatibility with azure-spring-data-cosmos -->
        <dependency>
            <groupId>io.projectreactor.netty</groupId>
            <artifactId>reactor-netty</artifactId>
            <version>1.0.40</version>
        </dependency>
        <dependency>
            <groupId>io.projectreactor.netty</groupId>
            <artifactId>reactor-netty-http</artifactId>
            <version>1.0.40</version>
        </dependency>
        <dependency>
            <groupId>io.projectreactor.netty</groupId>
            <artifactId>reactor-netty-core</artifactId>
            <version>1.0.40</version>
        </dependency>

        <!-- Override reactor-core version to support Sinks API required by azure-identity -->
        <dependency>
            <groupId>io.projectreactor</groupId>
            <artifactId>reactor-core</artifactId>
            <version>3.4.32</version>
        </dependency>

        <!-- Override Netty versions to fix compatibility with Azure Cosmos Client -->
        <dependency>
            <groupId>io.netty</groupId>
            <artifactId>netty-bom</artifactId>
            <version>4.1.101.Final</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>

        <!-- Override netty-tcnative to match Netty version -->
        <dependency>
            <groupId>io.netty</groupId>
            <artifactId>netty-tcnative-boringssl-static</artifactId>
            <version>2.0.62.Final</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### 2. Configuration Setup

#### Create Cosmos Configuration Class
Replace your Cassandra configuration with:

```java
@Configuration
@EnableCosmosRepositories  // Required for non-reactive repositories
@EnableReactiveCosmosRepositories  // CRITICAL: Required for reactive repositories
public class CosmosConfiguration extends AbstractCosmosConfiguration {

    @Value("${azure.cosmos.uri}")
    private String uri;

    @Value("${azure.cosmos.database}")
    private String database;

    @Bean
    public CosmosClientBuilder getCosmosClientBuilder() {
        return new CosmosClientBuilder()
            .endpoint(uri)
            .credential(new DefaultAzureCredential());
    }

    @Bean
    public CosmosAsyncClient cosmosAsyncClient(CosmosClientBuilder cosmosClientBuilder) {
        return cosmosClientBuilder.buildAsyncClient();
    }

    @Bean
    public CosmosClientBuilderFactory cosmosFactory(CosmosAsyncClient cosmosAsyncClient) {
        return new CosmosClientBuilderFactory(cosmosAsyncClient);
    }

    @Bean
    public ReactiveCosmosTemplate reactiveCosmosTemplate(CosmosClientBuilderFactory cosmosClientBuilderFactory) {
        return new ReactiveCosmosTemplate(cosmosClientBuilderFactory, database);
    }

    @Override
    protected String getDatabaseName() {
        return database;
    }
}
```

**Critical Notes:**
- **BOTH annotations required**: @EnableCosmosRepositories AND @EnableReactiveCosmosRepositories
- Missing @EnableReactiveCosmosRepositories will cause "No qualifying bean" errors for reactive repositories

#### Application Properties
Add cosmos profile configuration:

```properties
# application-cosmos.properties
azure.cosmos.uri=https://your-cosmos-account.documents.azure.com:443/
azure.cosmos.database=your-database-name
```

### 3. Entity Conversion

#### Convert from Cassandra to Cosmos Annotations

**Before (Cassandra):**
```java
@Table(value = "entity_table")
public class EntityName {
    @PartitionKey
    private UUID id;

    @ClusteringColumn
    private String fieldName;

    @Column("column_name")
    private String anotherField;
}
```

**After (Cosmos):**
```java
@Container(containerName = "entities")
public class EntityName {
    @Id
    private String id;  // Changed from UUID to String

    @PartitionKey
    private String fieldName;  // Choose appropriate partition key

    private String anotherField;

    // Generate String IDs
    public EntityName() {
        this.id = UUID.randomUUID().toString();
    }
}
```

#### Key Changes:
- Replace `@Table` with `@Container(containerName = "...")`
- Change `@PartitionKey` to Cosmos partition key strategy
- Convert all IDs from `UUID` to `String`
- Remove `@Column` annotations (Cosmos uses field names)
- Remove `@ClusteringColumn` (not applicable in Cosmos)

### 4. Repository Conversion

#### Replace Cassandra Data Access Layer with Cosmos Repositories

**If your application uses DAOs or custom data access classes:**

**Before (Cassandra DAO pattern):**
```java
@Repository
public class EntityReactiveDao {
    // Custom Cassandra query methods
}
```

**After (Cosmos Repository):**
```java
@Repository
public interface EntityCosmosRepository extends ReactiveCosmosRepository<EntityName, String> {

    @Query("SELECT * FROM entities e WHERE e.fieldName = @fieldName")
    Flux<EntityName> findByFieldName(@Param("fieldName") String fieldName);

    @Query("SELECT * FROM entities e WHERE e.id = @id")
    Mono<EntityName> findEntityById(@Param("id") String id);
}
```

**If your application uses Spring Data Cassandra repositories:**

**Before:**
```java
@Repository
public interface EntityCassandraRepository extends ReactiveCassandraRepository<EntityName, UUID> {
    // Cassandra-specific methods
}
```

**After:**
```java
@Repository
public interface EntityCosmosRepository extends ReactiveCosmosRepository<EntityName, String> {
    // Convert existing methods to Cosmos queries
}
```

**If your application uses direct CqlSession or Cassandra driver:**
- Replace direct driver calls with repository pattern
- Convert CQL queries to Cosmos SQL syntax
- Implement repository interfaces as shown above

#### Key Points:
- **CRITICAL**: Use `ReactiveCosmosRepository<Entity, String>` for reactive programming (NOT CosmosRepository)
- Use `CosmosRepository<Entity, String>` for non-reactive applications
- **Repository Interface Change**: If converting from existing Cassandra repositories/DAOs, ensure all repository interfaces extend ReactiveCosmosRepository
- **Common Error**: "No qualifying bean of type ReactiveCosmosRepository" = missing @EnableReactiveCosmosRepositories
- **If using custom data access classes**: Convert to repository pattern for better integration
- **If already using Spring Data**: Change interface extension from ReactiveCassandraRepository to ReactiveCosmosRepository
- Implement custom queries with `@Query` annotation using SQL-like syntax (not CQL)
- All query parameters must use `@Param` annotation

### 5. Service Layer Updates

#### Update Service Classes for Reactive Programming (If Applicable)

**If your application has a service layer:**

**CRITICAL**: Service methods must return Flux/Mono, not Iterable/Optional

```java
@Service
public class EntityReactiveServices {
    private final EntityCosmosRepository repository;

    public EntityReactiveServices(EntityCosmosRepository repository) {
        this.repository = repository;
    }

    // CORRECT: Returns Flux<EntityName>
    public Flux<EntityName> findAll() {
        return repository.findAll();
    }

    // CORRECT: Returns Mono<EntityName>
    public Mono<EntityName> findById(String id) {
        return repository.findById(id);
    }

    // CORRECT: Returns Mono<EntityName>
    public Mono<EntityName> save(EntityName entity) {
        return repository.save(entity);
    }

    // Custom queries - MUST return Flux/Mono
    public Flux<EntityName> findByFieldName(String fieldName) {
        return repository.findByFieldName(fieldName);
    }

    // WRONG PATTERNS TO AVOID:
    // public Iterable<EntityName> findAll() - Will cause compilation errors
    // public Optional<EntityName> findById() - Will cause compilation errors
    // repository.findAll().collectList() - Unnecessary blocking
}
```

**If your application uses direct repository injection in controllers:**
- Consider adding a service layer for better separation of concerns
- Update controller dependencies to use new Cosmos repositories
- Ensure proper reactive type handling throughout the call chain

**Common Issues:**
- **Compilation Error**: "Cannot resolve method" when using Iterable return types
- **Runtime Error**: Attempting to call .collectList() or .block() unnecessarily
- **Performance**: Blocking reactive streams defeats the purpose of reactive programming

### 6. Controller Updates (If Applicable)

#### Update REST Controllers for String IDs

**If your application has REST controllers:**

**Before:**
```java
@GetMapping("/entities/{entityId}")
public Mono<EntityDto> getEntity(@PathVariable UUID entityId) {
    return entityService.findById(entityId);
}
```

**After:**
```java
@GetMapping("/entities/{entityId}")
public Mono<EntityDto> getEntity(@PathVariable String entityId) {
    return entityService.findById(entityId);
}
```

**If your application doesn't use controllers:**
- Apply the same UUID → String conversion principles to your data access layer
- Update any external APIs or interfaces that accept/return entity IDs

### 7. Data Mapping Utilities (If Applicable)

#### Update Mapping Between Domain Objects and Entities

**If your application uses mapping utilities or converters:**

```java
public class MappingUtils {

    // Convert domain object to entity
    public static EntityName toEntity(DomainObject domain) {
        EntityName entity = new EntityName();
        entity.setId(domain.getId()); // Now String instead of UUID
        entity.setFieldName(domain.getFieldName());
        entity.setAnotherField(domain.getAnotherField());
        // ... other fields
        return entity;
    }

    // Convert entity to domain object
    public static DomainObject toDomain(EntityName entity) {
        DomainObject domain = new DomainObject();
        domain.setId(entity.getId());
        domain.setFieldName(entity.getFieldName());
        domain.setAnotherField(entity.getAnotherField());
        // ... other fields
        return domain;
    }
}
```

**If your application doesn't use explicit mapping:**
- Ensure consistent ID type usage throughout your codebase
- Update any object construction or copying logic to handle String IDs

### 8. Test Updates

#### Update Test Classes

**Critical**: All test files must be updated to work with String IDs and Cosmos repositories:

```java
### 8. Test Updates

#### Update Test Classes

**CRITICAL**: All test files must be updated to work with String IDs and Cosmos repositories

**If your application has unit tests:**

```java
@ExtendWith(MockitoExtension.class)
class EntityReactiveServicesTest {

    @Mock
    private EntityCosmosRepository entityRepository; // Updated to Cosmos repository

    @InjectMocks
    private EntityReactiveServices entityService;

    @Test
    void testFindById() {
        String entityId = "test-entity-id"; // Changed from UUID to String
        EntityName mockEntity = new EntityName();
        mockEntity.setId(entityId);

        when(entityRepository.findById(entityId)).thenReturn(Mono.just(mockEntity));

        StepVerifier.create(entityService.findById(entityId))
            .expectNext(mockEntity)
            .verifyComplete();
    }
}
```

**If your application has integration tests:**
- Update test data setup to use String IDs
- Replace Cassandra test containers with Cosmos DB emulator (if available)
- Update test queries to use Cosmos SQL syntax instead of CQL

**If your application doesn't have tests:**
- Consider adding basic tests to verify the conversion works correctly
- Focus on testing ID conversion and basic CRUD operations
```

### 9. Common Issues and Solutions

#### Issue 1: NoClassDefFoundError with reactor.core.publisher.Sinks
**Problem**: Azure Identity library requires newer Reactor Core version
**Error**: `java.lang.NoClassDefFoundError: reactor/core/publisher/Sinks`
**Root Cause**: Spring Boot 2.3.x uses older reactor-core that doesn't have Sinks API
**Solution**: Add reactor-core version override in dependencyManagement (see Step 1)

#### Issue 2: NoSuchMethodError with Netty Epoll methods
**Problem**: Version mismatch between Spring Boot Netty and Azure Cosmos requirements
**Error**: `java.lang.NoSuchMethodError: 'boolean io.netty.channel.epoll.Epoll.isTcpFastOpenClientSideAvailable()'`
**Root Cause**: Spring Boot 2.3.x uses Netty 4.1.51.Final, Azure requires newer methods
**Solution**: Add netty-bom version override (see Step 1)

#### Issue 3: NoSuchMethodError with SSL Context
**Problem**: Netty TLS native library version mismatch
**Error**: `java.lang.NoSuchMethodError: 'boolean io.netty.internal.tcnative.SSLContext.setCurvesList(long, java.lang.String[])'`
**Root Cause**: netty-tcnative version incompatible with upgraded Netty
**Solution**: Add netty-tcnative-boringssl-static version override (see Step 1)

#### Issue 4: ReactiveCosmosRepository beans not created
**Problem**: Missing @EnableReactiveCosmosRepositories annotation
**Error**: `No qualifying bean of type 'ReactiveCosmosRepository' available`
**Root Cause**: Only @EnableCosmosRepositories doesn't create reactive repository beans
**Solution**: Add both @EnableCosmosRepositories and @EnableReactiveCosmosRepositories to configuration

#### Issue 5: Repository interface compilation errors
**Problem**: Using CosmosRepository instead of ReactiveCosmosRepository
**Error**: `Cannot resolve method 'findAll()' in 'CosmosRepository'`
**Root Cause**: CosmosRepository returns Iterable, not Flux
**Solution**: Change all repository interfaces to extend ReactiveCosmosRepository<Entity, String>

#### Issue 6: Service layer reactive type mismatches
**Problem**: Service methods returning Iterable/Optional instead of Flux/Mono
**Error**: `Required type: Flux<Entity> Provided: Iterable<Entity>`
**Root Cause**: Repository methods return reactive types, services must match
**Solution**: Update all service method signatures to return Flux/Mono

#### Issue 7: Authentication failures
**Problem**: DefaultAzureCredential not finding credentials
**Error**: `ManagedIdentityCredential authentication unavailable`
**Root Cause**: Running locally without Azure CLI authentication
**Solution**: Ensure Azure CLI login: `az login --use-device-code`

#### Issue 8: Partition key strategy differences
**Problem**: Cassandra clustering keys don't map directly to Cosmos partition keys
**Error**: Cross-partition queries or poor performance
**Root Cause**: Different data distribution strategies
**Solution**: Choose appropriate partition key based on query patterns, typically the most frequently queried field

#### Issue 9: UUID to String conversion issues
**Problem**: Test files and controllers still using UUID types
**Error**: `Cannot convert UUID to String` or type mismatch errors
**Root Cause**: Not all occurrences of UUID were converted to String
**Solution**: Systematically search and replace all UUID references with String

### 10. Data Seeding (If Applicable)

#### Implement Data Population

**If your application needs initial data:**

```java
@Component
public class DataSeeder implements CommandLineRunner {

    private final EntityCosmosRepository entityRepository;

    @Override
    public void run(String... args) throws Exception {
        if (entityRepository.count().block() == 0) {
            // Seed initial data
            EntityName entity = new EntityName();
            entity.setFieldName("Sample Value");
            entity.setAnotherField("Sample Data");

            entityRepository.save(entity).block();
        }
    }
}
```

**If your application has existing data migration needs:**
- Create migration scripts to export from Cassandra and import to Cosmos DB
- Consider data transformation needs (UUID to String conversion)
- Plan for any schema differences between Cassandra and Cosmos data models

**If your application doesn't need data seeding:**
- Skip this step and proceed to verification

### 11. Application Profiles

#### Update application.yml for Cosmos profile
```yaml
spring:
  profiles:
    active: cosmos

---
spring:
  profiles: cosmos

azure:
  cosmos:
    uri: ${COSMOS_URI:https://your-account.documents.azure.com:443/}
    database: ${COSMOS_DATABASE:your-database}
```

## Verification Steps

1. **Compile Check**: `mvn compile` should succeed without errors
2. **Test Check**: `mvn test` should pass with updated test cases
3. **Runtime Check**: Application should start without version conflicts
4. **Connection Check**: Application should connect to Cosmos DB successfully
5. **Data Check**: CRUD operations should work through the API
6. **UI Check**: Frontend should display data from Cosmos DB

## Best Practices

1. **ID Strategy**: Always use String IDs instead of UUIDs for Cosmos DB
2. **Partition Key**: Choose partition keys based on query patterns and data distribution
3. **Query Design**: Use @Query annotation for custom queries instead of method naming conventions
4. **Reactive Programming**: Stick to Flux/Mono patterns throughout the service layer
5. **Version Management**: Always include dependency version overrides for Spring Boot 2.x projects
6. **Testing**: Update all test files to use String IDs and mock Cosmos repositories
7. **Authentication**: Use DefaultAzureCredential for production-ready authentication

## Troubleshooting Commands

```bash
# Check dependencies and version conflicts
mvn dependency:tree | grep -E "(reactor|netty|cosmos)"

# Verify specific problematic dependencies
mvn dependency:tree | grep "reactor-core"
mvn dependency:tree | grep "reactor-netty"
mvn dependency:tree | grep "netty-tcnative"

# Test connection
curl http://localhost:8080/api/entities

# Check Azure login status
az account show

# Clean and rebuild (often fixes dependency issues)
mvn clean compile

# Run with debug logging for dependency resolution
mvn dependency:resolve -X

# Check for compilation errors specifically
mvn compile 2>&1 | grep -E "(ERROR|error)"

# Run with debug for runtime issues
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"

# Check application logs for version conflicts
grep -E "(NoSuchMethodError|NoClassDefFoundError|reactor|netty)" application.log
```

## Typical Error Sequence and Resolution

Based on real conversion experience, you'll likely encounter these errors in this order:

### **Phase 1: Compilation Errors**
1. **Missing dependencies** → Add azure-spring-data-cosmos and azure-identity
2. **Configuration class errors** → Create CosmosConfiguration (if not already present)
3. **Entity annotation errors** → Convert @Table to @Container, etc.
4. **Repository interface errors** → Change to ReactiveCosmosRepository (if using repository pattern)

### **Phase 2: Bean Creation Errors**
5. **"No qualifying bean of type ReactiveCosmosRepository"** → Add @EnableReactiveCosmosRepositories
6. **Service layer type mismatches** → Change Iterable to Flux, Optional to Mono (if using service layer)

### **Phase 3: Runtime Version Conflicts** (Most Complex)
7. **NoClassDefFoundError: reactor.core.publisher.Sinks** → Add reactor-core 3.4.32 override
8. **NoSuchMethodError: Epoll.isTcpFastOpenClientSideAvailable** → Add netty-bom 4.1.101.Final override
9. **NoSuchMethodError: SSLContext.setCurvesList** → Add netty-tcnative-boringssl-static 2.0.62.Final override

### **Phase 4: Authentication & Connection**
10. **ManagedIdentityCredential authentication unavailable** → Run `az login --use-device-code`
11. **Application starts successfully** → Connected to Cosmos DB!

**Critical**: Address these in order. Don't skip ahead - each phase must be resolved before the next appears.

## Performance Considerations

1. **Partition Strategy**: Design partition keys to distribute load evenly
2. **Query Optimization**: Use indexes and avoid cross-partition queries when possible
3. **Connection Pooling**: Cosmos client automatically manages connections
4. **Request Units**: Monitor RU consumption and adjust throughput as needed
5. **Bulk Operations**: Use batch operations for multiple document updates

This guide covers all major aspects of converting from Cassandra to Cosmos DB, including all version conflicts and authentication issues encountered in real-world scenarios.
