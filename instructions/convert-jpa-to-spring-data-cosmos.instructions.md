---
description: 'Step-by-step guide for converting Spring Boot JPA applications to use Azure Cosmos DB with Spring Data Cosmos'
applyTo: '**/*.java,**/pom.xml,**/build.gradle,**/application*.properties'
---

# Convert Spring JPA project to Spring Data Cosmos

This generalized guide applies to any JPA to Spring Data Cosmos DB conversion project.

## High-level plan

1. Swap build dependencies (remove JPA, add Cosmos + Identity).
2. Add `cosmos` profile and properties.
3. Add Cosmos config with proper Azure identity authentication.
4. Transform entities (ids → `String`, add `@Container` and `@PartitionKey`, remove JPA mappings, adjust relationships).
5. Convert repositories (`JpaRepository` → `CosmosRepository`).
6. **Create service layer** for relationship management and template compatibility.
7. **CRITICAL**: Update ALL test files to work with String IDs and Cosmos repositories.
8. Seed data via `CommandLineRunner`.
9. **CRITICAL**: Test runtime functionality and fix template compatibility issues.

## Step-by-step

### Step 1 — Build dependencies

- **Maven** (`pom.xml`):
  - Remove dependency `spring-boot-starter-data-jpa`
  - Remove database-specific dependencies (H2, MySQL, PostgreSQL) unless needed elsewhere
  - Add `com.azure:azure-spring-data-cosmos:5.17.0` (or latest compatible version)
  - Add `com.azure:azure-identity:1.15.4` (required for DefaultAzureCredential)
- **Gradle**: Apply same dependency changes for Gradle syntax
- Remove testcontainers and JPA-specific test dependencies

### Step 2 — Properties and Configuration

- Create `src/main/resources/application-cosmos.properties`:
  ```properties
  azure.cosmos.uri=${COSMOS_URI:https://localhost:8081}
  azure.cosmos.database=${COSMOS_DATABASE:petclinic}
  azure.cosmos.populate-query-metrics=false
  azure.cosmos.enable-multiple-write-locations=false
  ```
- Update `src/main/resources/application.properties`:
  ```properties
  spring.profiles.active=cosmos
  ```

### Step 3 — Configuration class with Azure Identity

- Create `src/main/java/<rootpkg>/config/CosmosConfiguration.java`:
  ```java
  @Configuration
  @EnableCosmosRepositories(basePackages = "<rootpkg>")
  public class CosmosConfiguration extends AbstractCosmosConfiguration {

    @Value("${azure.cosmos.uri}")
    private String uri;

    @Value("${azure.cosmos.database}")
    private String dbName;

    @Bean
    public CosmosClientBuilder getCosmosClientBuilder() {
      return new CosmosClientBuilder().endpoint(uri).credential(new DefaultAzureCredentialBuilder().build());
    }

    @Override
    protected String getDatabaseName() {
      return dbName;
    }

    @Bean
    public CosmosConfig cosmosConfig() {
      return CosmosConfig.builder().enableQueryMetrics(false).build();
    }
  }

  ```
- **IMPORTANT**: Use `DefaultAzureCredentialBuilder().build()` instead of key-based authentication for production security

### Step 4 — Entity transformation

- Target all classes with JPA annotations (`@Entity`, `@MappedSuperclass`, `@Embeddable`)
- **Base entity changes**:
  - Change `id` field type from `Integer` to `String`
  - Add `@Id` and `@GeneratedValue` annotations
  - Add `@PartitionKey` field (typically `String partitionKey`)
  - Remove all `jakarta.persistence` imports
- **CRITICAL - Cosmos DB Serialization Requirements**:
  - **Remove ALL `@JsonIgnore` annotations** from fields that need to be persisted to Cosmos DB
  - **Authentication entities (User, Authority) MUST be fully serializable** - no `@JsonIgnore` on password, authorities, or other persisted fields
  - **Use `@JsonProperty` instead of `@JsonIgnore`** when you need to control JSON field names but still persist the data
  - **Common authentication serialization errors**: `Cannot pass null or empty values to constructor` usually means `@JsonIgnore` is blocking required field serialization
- **Entity-specific changes**:
  - Replace `@Entity` with `@Container(containerName = "<plural-entity-name>")`
  - Remove `@Table`, `@Column`, `@JoinColumn`, etc.
  - Remove relationship annotations (`@OneToMany`, `@ManyToOne`, `@ManyToMany`)
  - For relationships:
    - Embed collections for one-to-many (e.g., `List<Pet> pets` in Owner)
    - Use reference IDs for many-to-one (e.g., `String ownerId` in Pet)
    - **For complex relationships**: Store IDs but add transient properties for templates
  - Add constructor to set partition key: `setPartitionKey("entityType")`
- **CRITICAL - Authentication Entity Pattern**:
  - **For User entities with Spring Security**: Store authorities as `Set<String>` instead of `Set<Authority>` objects
  - **Example User entity transformation**:
    ```java
    @Container(containerName = "users")
    public class User {

      @Id
      private String id;

      @PartitionKey
      private String partitionKey = "user";

      private String login;
      private String password; // NO @JsonIgnore - must be serializable

      @JsonProperty("authorities") // Use @JsonProperty, not @JsonIgnore
      private Set<String> authorities = new HashSet<>(); // Store as strings

      // Add transient property for Spring Security compatibility if needed
      // @JsonIgnore - ONLY for transient properties not persisted to Cosmos
      private Set<Authority> authorityObjects = new HashSet<>();

      // Conversion methods between string authorities and Authority objects
      public void setAuthorityObjects(Set<Authority> authorities) {
        this.authorityObjects = authorities;
        this.authorities = authorities.stream().map(Authority::getName).collect(Collectors.toSet());
      }
    }

    ```
- **CRITICAL - Template Compatibility for Relationship Changes**:
  - **When converting relationships to ID references, preserve template access**
  - **Example**: If entity had `List<Specialty> specialties` → convert to:
    - Storage: `List<String> specialtyIds` (persisted to Cosmos)
    - Template: `@JsonIgnore private List<Specialty> specialties = new ArrayList<>()` (transient)
    - Add getters/setters for both properties
  - **Update entity method logic**: `getNrOfSpecialties()` should use the transient list
- **CRITICAL - Template Compatibility for Thymeleaf/JSP Applications**:
  - **Identify template property access**: Search for `${entity.relationshipProperty}` in `.html` files
  - **For each relationship property accessed in templates**:
    - **Storage**: Keep ID-based storage (e.g., `List<String> specialtyIds`)
    - **Template Access**: Add transient property with `@JsonIgnore` (e.g., `private List<Specialty> specialties = new ArrayList<>()`)
    - **Example**:

      ```java
      // Stored in Cosmos (persisted)
      private List<String> specialtyIds = new ArrayList<>();

      // For template access (transient)
      @JsonIgnore
      private List<Specialty> specialties = new ArrayList<>();

      // Getters/setters for both properties
      public List<String> getSpecialtyIds() {
        return specialtyIds;
      }

      public List<Specialty> getSpecialties() {
        return specialties;
      }

      ```

    - **Update count methods**: `getNrOfSpecialties()` should use transient list, not ID list
- **CRITICAL - Method Signature Conflicts**:
  - **When converting ID types from Integer to String, check for method signature conflicts**
  - **Common conflict**: `getPet(String name)` vs `getPet(String id)` - both have same signature
  - **Solution**: Rename methods to be specific:
    - `getPet(String id)` for ID-based lookup
    - `getPetByName(String name)` for name-based lookup
    - `getPetByName(String name, boolean ignoreNew)` for conditional name-based lookup
  - **Update ALL callers** of renamed methods in controllers and tests
- **Method updates for entities**:
  - Update `addVisit(Integer petId, Visit visit)` to `addVisit(String petId, Visit visit)`
  - Ensure all ID comparison logic uses `.equals()` instead of `==`

### Step 5 — Repository conversion

- Change all repository interfaces:
  - From: `extends JpaRepository<Entity, Integer>`
  - To: `extends CosmosRepository<Entity, String>`
- **Query method updates**:
  - Remove pagination parameters from custom queries
  - Change `Page<Entity> findByX(String param, Pageable pageable)` to `List<Entity> findByX(String param)`
  - Update `@Query` annotations to use Cosmos SQL syntax
  - **Replace custom method names**: `findPetTypes()` → `findAllOrderByName()`
  - **Update ALL references** to changed method names in controllers and formatters

### Step 6 — **Create service layer** for relationship management and template compatibility

- **CRITICAL**: Create service classes to bridge Cosmos document storage with existing template expectations
- **Purpose**: Handle relationship population and maintain template compatibility
- **Service pattern for each entity with relationships**:
  ```java
  @Service
  public class EntityService {

    private final EntityRepository entityRepository;
    private final RelatedRepository relatedRepository;

    public EntityService(EntityRepository entityRepository, RelatedRepository relatedRepository) {
      this.entityRepository = entityRepository;
      this.relatedRepository = relatedRepository;
    }

    public List<Entity> findAll() {
      List<Entity> entities = entityRepository.findAll();
      entities.forEach(this::populateRelationships);
      return entities;
    }

    public Optional<Entity> findById(String id) {
      Optional<Entity> entityOpt = entityRepository.findById(id);
      if (entityOpt.isPresent()) {
        Entity entity = entityOpt.get();
        populateRelationships(entity);
        return Optional.of(entity);
      }
      return Optional.empty();
    }

    private void populateRelationships(Entity entity) {
      if (entity.getRelatedIds() != null && !entity.getRelatedIds().isEmpty()) {
        List<Related> related = entity
          .getRelatedIds()
          .stream()
          .map(relatedRepository::findById)
          .filter(Optional::isPresent)
          .map(Optional::get)
          .collect(Collectors.toList());
        // Set transient property for template access
        entity.setRelated(related);
      }
    }
  }

  ```

### Step 6.5 — **Spring Security Integration** (CRITICAL for Authentication)

- **UserDetailsService Integration Pattern**:
  ```java
  @Service
  @Transactional
  public class DomainUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final AuthorityRepository authorityRepository;

    @Override
    public UserDetails loadUserByUsername(String login) {
      log.debug("Authenticating user: {}", login);

      return userRepository
        .findOneByLogin(login)
        .map(user -> createSpringSecurityUser(login, user))
        .orElseThrow(() -> new UsernameNotFoundException("User " + login + " was not found"));
    }

    private org.springframework.security.core.userdetails.User createSpringSecurityUser(String lowercaseLogin, User user) {
      if (!user.isActivated()) {
        throw new UserNotActivatedException("User " + lowercaseLogin + " was not activated");
      }

      // Convert string authorities back to GrantedAuthority objects
      List<GrantedAuthority> grantedAuthorities = user
        .getAuthorities()
        .stream()
        .map(SimpleGrantedAuthority::new)
        .collect(Collectors.toList());

      return new org.springframework.security.core.userdetails.User(user.getLogin(), user.getPassword(), grantedAuthorities);
    }
  }

  ```
- **Key Authentication Requirements**:
  - User entity must be fully serializable (no `@JsonIgnore` on password/authorities)
  - Store authorities as `Set<String>` for Cosmos DB compatibility
  - Convert between string authorities and `GrantedAuthority` objects in UserDetailsService
  - Add comprehensive debugging logs to trace authentication flow
  - Handle activated/deactivated user states appropriately

#### **Template Relationship Population Pattern**

Each service method that returns entities for template rendering MUST populate transient properties:

```java
private void populateRelationships(Entity entity) {
  // For each relationship used in templates
  if (entity.getRelatedIds() != null && !entity.getRelatedIds().isEmpty()) {
    List<Related> relatedObjects = entity
      .getRelatedIds()
      .stream()
      .map(relatedRepository::findById)
      .filter(Optional::isPresent)
      .map(Optional::get)
      .collect(Collectors.toList());
    entity.setRelated(relatedObjects); // Set transient property
  }
}

```

#### **Critical Service Usage in Controllers**

- **Replace ALL direct repository calls** with service calls in controllers
- **Never return entities from repositories directly** to templates without relationship population
- **Update controllers** to use service layer instead of repositories directly
- **Controller pattern change**:

  ```java
  // OLD: Direct repository usage
  @Autowired
  private EntityRepository entityRepository;

  // NEW: Service layer usage
  @Autowired
  private EntityService entityService;
  // Update method calls
  // OLD: entityRepository.findAll()
  // NEW: entityService.findAll()

  ```

### Step 7 — Data seeding

- Create `@Component` implementing `CommandLineRunner`:
  ```java
  @Component
  public class DataSeeder implements CommandLineRunner {

    @Override
    public void run(String... args) throws Exception {
      if (ownerRepository.count() > 0) {
        return; // Data already exists
      }
      // Seed comprehensive test data with String IDs
      // Use meaningful ID patterns: "owner-1", "pet-1", "pettype-1", etc.
    }
  }

  ```
- **CRITICAL - BigDecimal Reflection Issues with JDK 17+**:
  - **If using BigDecimal fields**, you may encounter reflection errors during seeding
  - **Error pattern**: `Unable to make field private final java.math.BigInteger java.math.BigDecimal.intVal accessible`
  - **Solutions**:
    1. Use `Double` or `String` instead of `BigDecimal` for monetary values
    2. Add JVM argument: `--add-opens java.base/java.math=ALL-UNNAMED`
    3. Wrap BigDecimal operations in try-catch and handle gracefully
  - **The application will start successfully even if seeding fails** - check logs for seeding errors

### Step 8 — Test file conversion (CRITICAL SECTION)

**This step is often overlooked but essential for successful conversion**

#### A. **COMPILATION CHECK STRATEGY**

- **After each major change, run `mvn test-compile` to catch issues early**
- **Fix compilation errors systematically before proceeding**
- **Don't rely on IDE - Maven compilation reveals all issues**

#### B. **Search and Update ALL test files systematically**

**Use search tools to find and update every occurrence:**

- Search for: `int.*TEST.*ID` → Replace with: `String.*TEST.*ID = "test-xyz-1"`
- Search for: `setId\(\d+\)` → Replace with: `setId("test-id-X")`
- Search for: `findById\(\d+\)` → Replace with: `findById("test-id-X")`
- Search for: `\.findPetTypes\(\)` → Replace with: `.findAllOrderByName()`
- Search for: `\.findByLastNameStartingWith\(.*,.*Pageable` → Remove pagination parameter

#### C. Update test annotations and imports

- Replace `@DataJpaTest` with `@SpringBootTest` or appropriate slice test
- Remove `@AutoConfigureTestDatabase` annotations
- Remove `@Transactional` from tests (unless single-partition operations)
- Remove imports from `org.springframework.orm` package

#### D. Fix entity ID usage in ALL test files

**Critical files that MUST be updated (search entire test directory):**

- `*ControllerTests.java` - Path variables, entity creation, mock setup
- `*ServiceTests.java` - Repository interactions, entity IDs
- `EntityUtils.java` - Utility methods for ID handling
- `*FormatterTests.java` - Repository method calls
- `*ValidatorTests.java` - Entity creation with String IDs
- Integration test classes - Test data setup

#### E. **Fix Controller and Service classes affected by repository changes**

- **Update controllers that call repository methods with changed signatures**
- **Update formatters/converters that use repository methods**
- **Common files to check**:
  - `PetTypeFormatter.java` - often calls `findPetTypes()` method
  - `*Controller.java` - may have pagination logic to remove
  - Service classes that use repository methods

#### F. Update repository mocking in tests

- Remove pagination from repository mocks:
  - `given(repository.findByX(param, pageable)).willReturn(pageResult)`
  - → `given(repository.findByX(param)).willReturn(listResult)`
- Update method names in mocks:
  - `given(petTypeRepository.findPetTypes()).willReturn(types)`
  - → `given(petTypeRepository.findAllOrderByName()).willReturn(types)`

#### G. Fix utility classes used by tests

- Update `EntityUtils.java` or similar:
  - Remove JPA-specific exception imports (`ObjectRetrievalFailureException`)
  - Change method signatures from `int id` to `String id`
  - Update ID comparison logic: `entity.getId() == entityId` → `entity.getId().equals(entityId)`
  - Replace JPA exceptions with standard exceptions (`IllegalArgumentException`)

#### H. Update assertions for String IDs

- Change ID assertions:
  - `assertThat(entity.getId()).isNotZero()` → `assertThat(entity.getId()).isNotEmpty()`
  - `assertThat(entity.getId()).isEqualTo(1)` → `assertThat(entity.getId()).isEqualTo("test-id-1")`
  - JSON path assertions: `jsonPath("$.id").value(1)` → `jsonPath("$.id").value("test-id-1")`

### Step 8 — Test file conversion (CRITICAL SECTION)

**This step is often overlooked but essential for successful conversion**

#### A. **COMPILATION CHECK STRATEGY**

- **After each major change, run `mvn test-compile` to catch issues early**
- **Fix compilation errors systematically before proceeding**
- **Don't rely on IDE - Maven compilation reveals all issues**

#### B. **Search and Update ALL test files systematically**

**Use search tools to find and update every occurrence:**

- Search for: `setId\(\d+\)` → Replace with: `setId("test-id-X")`
- Search for: `findById\(\d+\)` → Replace with: `findById("test-id-X")`
- Search for: `\.findPetTypes\(\)` → Replace with: `.findAllOrderByName()`
- Search for: `\.findByLastNameStartingWith\(.*,.*Pageable` → Remove pagination parameter

#### C. Update test annotations and imports

- Replace `@DataJpaTest` with `@SpringBootTest` or appropriate slice test
- Remove `@AutoConfigureTestDatabase` annotations
- Remove `@Transactional` from tests (unless single-partition operations)
- Remove imports from `org.springframework.orm` package

#### D. Fix entity ID usage in ALL test files

**Critical files that MUST be updated (search entire test directory):**

- `*ControllerTests.java` - Path variables, entity creation, mock setup
- `*ServiceTests.java` - Repository interactions, entity IDs
- `EntityUtils.java` - Utility methods for ID handling
- `*FormatterTests.java` - Repository method calls
- `*ValidatorTests.java` - Entity creation with String IDs
- Integration test classes - Test data setup

#### E. **Fix Controller and Service classes affected by repository changes**

- **Update controllers that call repository methods with changed signatures**
- **Update formatters/converters that use repository methods**
- **Common files to check**:
  - `PetTypeFormatter.java` - often calls `findPetTypes()` method
  - `*Controller.java` - may have pagination logic to remove
  - Service classes that use repository methods

#### F. Update repository mocking in tests

- Remove pagination from repository mocks:
  - `given(repository.findByX(param, pageable)).willReturn(pageResult)`
  - → `given(repository.findByX(param)).willReturn(listResult)`
- Update method names in mocks:
  - `given(petTypeRepository.findPetTypes()).willReturn(types)`
  - → `given(petTypeRepository.findAllOrderByName()).willReturn(types)`

#### G. Fix utility classes used by tests

- Update `EntityUtils.java` or similar:
  - Remove JPA-specific exception imports (`ObjectRetrievalFailureException`)
  - Change method signatures from `int id` to `String id`
  - Update ID comparison logic: `entity.getId() == entityId` → `entity.getId().equals(entityId)`
  - Replace JPA exceptions with standard exceptions (`IllegalArgumentException`)

#### H. Update assertions for String IDs

- Change ID assertions:
  - `assertThat(entity.getId()).isNotZero()` → `assertThat(entity.getId()).isNotEmpty()`
  - `assertThat(entity.getId()).isEqualTo(1)` → `assertThat(entity.getId()).isEqualTo("test-id-1")`
  - JSON path assertions: `jsonPath("$.id").value(1)` → `jsonPath("$.id").value("test-id-1")`

### Step 9 — **Runtime Testing and Template Compatibility**

#### **CRITICAL**: Test the running application after compilation success

- **Start the application**: `mvn spring-boot:run`
- **Navigate through all pages** in the web interface to identify runtime errors
- **Common runtime issues after conversion**:
  - Templates trying to access properties that no longer exist (e.g., `vet.specialties`)
  - Service layer not populating transient relationship properties
  - Controllers not using service layer for relationship loading

#### **Template compatibility fixes**:

- **If templates access relationship properties** (e.g., `entity.relatedObjects`):
  - Ensure transient properties exist on entities with proper getters/setters
  - Verify service layer populates these transient properties
  - Update `getNrOfXXX()` methods to use transient lists instead of ID lists
- **Check for SpEL (Spring Expression Language) errors** in logs:
  - `Property or field 'xxx' cannot be found` → Add missing transient property
  - `EL1008E` errors → Service layer not populating relationships

#### **Service layer verification**:

- **Ensure all controllers use service layer** instead of direct repository access
- **Verify service methods populate relationships** before returning entities
- **Test all CRUD operations** through the web interface

### Step 9.5 — **Template Runtime Validation** (CRITICAL)

#### **Systematic Template Testing Process**

After successful compilation and application startup:

1. **Navigate to EVERY page** in the application systematically
2. **Test each template that displays entity data**:
   - List pages (e.g., `/vets`, `/owners`)
   - Detail pages (e.g., `/owners/{id}`, `/vets/{id}`)
   - Forms and edit pages
3. **Look for specific template errors**:
   - `Property or field 'relationshipName' cannot be found on object of type 'EntityName'`
   - `EL1008E` Spring Expression Language errors
   - Empty or missing data where relationships should appear

#### **Template Error Resolution Checklist**

When encountering template errors:

- [ ] **Identify the missing property** from error message
- [ ] **Check if property exists as transient field** in entity
- [ ] **Verify service layer populates the property** before returning entity
- [ ] **Ensure controller uses service layer**, not direct repository access
- [ ] **Test the specific page again** after fixes

#### **Common Template Error Patterns**

- `Property or field 'specialties' cannot be found` → Add `@JsonIgnore private List<Specialty> specialties` to Vet entity
- `Property or field 'pets' cannot be found` → Add `@JsonIgnore private List<Pet> pets` to Owner entity
- Empty relationship data displayed → Service not populating transient properties

### Step 10 — **Systematic Error Resolution Process**

#### When compilation fails:

1. **Run `mvn compile` first** - fix main source issues before tests
2. **Run `mvn test-compile`** - systematically fix each test compilation error
3. **Focus on most frequent error patterns**:
   - `int cannot be converted to String` → Change test constants and entity setters
   - `method X cannot be applied to given types` → Remove pagination parameters
   - `cannot find symbol: method Y()` → Update to new repository method names
   - Method signature conflicts → Rename conflicting methods

### Step 10 — **Systematic Error Resolution Process**

#### When compilation fails:

1. **Run `mvn compile` first** - fix main source issues before tests
2. **Run `mvn test-compile`** - systematically fix each test compilation error
3. **Focus on most frequent error patterns**:
   - `int cannot be converted to String` → Change test constants and entity setters
   - `method X cannot be applied to given types` → Remove pagination parameters
   - `cannot find symbol: method Y()` → Update to new repository method names
   - Method signature conflicts → Rename conflicting methods
#### When runtime fails:

1. **Check application logs** for specific error messages
2. **Look for template/SpEL errors**:
   - `Property or field 'xxx' cannot be found` → Add transient property to entity
   - Missing relationship data → Service layer not populating relationships
3. **Verify service layer usage** in controllers
4. **Test navigation through all application pages**

#### Common error patterns and solutions:

- **`method findByLastNameStartingWith cannot be applied`** → Remove `Pageable` parameter
- **`cannot find symbol: method findPetTypes()`** → Change to `findAllOrderByName()`
- **`incompatible types: int cannot be converted to String`** → Update test ID constants
- **`method getPet(String) is already defined`** → Rename one method (e.g., `getPetByName`)
- **`cannot find symbol: method isNotZero()`** → Change to `isNotEmpty()` for String IDs
- **`Property or field 'specialties' cannot be found`** → Add transient property and populate in service
- **`ClassCastException: reactor.core.publisher.BlockingIterable cannot be cast to java.util.List`** → Fix repository `findAllWithEagerRelationships()` method to use StreamSupport
- **`Unable to make field...BigDecimal.intVal accessible`** → Replace BigDecimal with Double throughout application
- **Health check database failure** → Remove 'db' from health check readiness configuration

#### **Template-Specific Runtime Errors**

- **`Property or field 'XXX' cannot be found on object of type 'YYY'`**:

  - Root cause: Template accessing relationship property that was converted to ID storage
  - Solution: Add transient property to entity + populate in service layer
  - Prevention: Always check template usage before converting relationships

- **`EL1008E` Spring Expression Language errors**:

  - Root cause: Service layer not populating transient properties
  - Solution: Verify `populateRelationships()` methods are called and working
  - Prevention: Test all template navigation after service layer implementation

- **Empty/null relationship data in templates**:
  - Root cause: Controller bypassing service layer or service not populating relationships
  - Solution: Ensure all controller methods use service layer for entity retrieval
  - Prevention: Never return repository results directly to templates

### Step 11 — Validation checklist

After conversion, verify:

- [ ] **Main application compiles**: `mvn compile` succeeds
- [ ] **All test files compile**: `mvn test-compile` succeeds
- [ ] **No compilation errors**: Address every single compilation error
- [ ] **Application starts successfully**: `mvn spring-boot:run` without errors
- [ ] **All web pages load**: Navigate through all application pages without runtime errors
- [ ] **Service layer populates relationships**: Transient properties are correctly set
- [ ] **All template pages render without errors**: Navigate through entire application
- [ ] **Relationship data displays correctly**: Lists, counts, and related objects show properly
- [ ] **No SpEL template errors in logs**: Check application logs during navigation
- [ ] **Transient properties are @JsonIgnore annotated**: Prevents JSON serialization issues
- [ ] **Service layer used consistently**: No direct repository access in controllers for template rendering
- [ ] No remaining `jakarta.persistence` imports
- [ ] All entity IDs are `String` type consistently
- [ ] All repository interfaces extend `CosmosRepository<Entity, String>`
- [ ] Configuration uses `DefaultAzureCredential` for authentication
- [ ] Data seeding component exists and works
- [ ] Test files use String IDs consistently
- [ ] Repository mocks updated for Cosmos methods
- [ ] **No method signature conflicts** in entity classes
- [ ] **All renamed methods updated** in callers (controllers, tests, formatters)

### Common pitfalls to avoid

1. **Not checking compilation frequently** - Run `mvn test-compile` after each major change
2. **Method signature conflicts** - Method overloading issues when converting ID types
3. **Forgetting to update method callers** - When renaming methods, update ALL callers
4. **Missing repository method renames** - Custom repository methods must be updated everywhere called
5. **Using key-based authentication** - Use `DefaultAzureCredential` instead
6. **Mixing Integer and String IDs** - Be consistent with String IDs everywhere, especially in tests
7. **Not updating controller pagination logic** - Remove pagination from controllers when repositories change
8. **Leaving JPA-specific test annotations** - Replace with Cosmos-compatible alternatives
9. **Incomplete test file updates** - Search entire test directory, not just obvious files
10. **Skipping runtime testing** - Always test the running application, not just compilation
11. **Missing service layer** - Don't access repositories directly from controllers
12. **Forgetting transient properties** - Templates may need access to relationship data
13. **Not testing template navigation** - Compilation success doesn't mean templates work
14. **Missing transient properties for templates** - Templates need object access, not just IDs
15. **Service layer bypassing** - Controllers must use services, never direct repository access
16. **Incomplete relationship population** - Service methods must populate ALL transient properties used by templates
17. **Forgetting @JsonIgnore on transient properties** - Prevents serialization issues
18. **@JsonIgnore on persisted fields** - **CRITICAL**: Never use `@JsonIgnore` on fields that need to be stored in Cosmos DB
19. **Authentication serialization errors** - User/Authority entities must be fully serializable without `@JsonIgnore` blocking required fields
20. **BigDecimal reflection issues** - Use alternative data types or JVM arguments for JDK 17+ compatibility
21. **Repository reactive type casting** - Don't cast `findAll()` directly to `List`, use `StreamSupport.stream().collect(Collectors.toList())`
22. **Health check database references** - Remove database dependencies from Spring Boot health checks after JPA removal
23. **Collection type mismatches** - Update service methods to handle String vs object collections consistently

### Debugging compilation issues systematically

If compilation fails after conversion:

1. **Start with main compilation**: `mvn compile` - fix entity and controller issues first
2. **Then test compilation**: `mvn test-compile` - fix each error systematically
3. **Check for remaining `jakarta.persistence` imports** throughout codebase
4. **Verify all test constants use String IDs** - search for `int.*TEST.*ID`
5. **Ensure repository method signatures match** new Cosmos interface
6. **Check for mixed Integer/String ID usage** in entity relationships and tests
7. **Validate all mocking uses correct method names** (`findAllOrderByName()` not `findPetTypes()`)
8. **Look for method signature conflicts** - resolve by renaming conflicting methods
9. **Verify assertion methods work with String IDs** (`isNotEmpty()` not `isNotZero()`)

### Debugging runtime issues systematically

If runtime fails after successful compilation:

1. **Check application startup logs** for initialization errors
2. **Navigate through all pages** to identify template/controller issues
3. **Look for SpEL template errors** in logs:
   - `Property or field 'xxx' cannot be found` → Missing transient property
   - `EL1008E` → Service layer not populating relationships
4. **Verify service layer is being used** instead of direct repository access
5. **Check that transient properties are populated** in service methods
6. **Test all CRUD operations** through the web interface
7. **Verify data seeding worked correctly** and relationships are maintained
8. **Authentication-specific debugging**:
   - `Cannot pass null or empty values to constructor` → Check for `@JsonIgnore` on required fields
   - `BadCredentialsException` → Verify User entity serialization and password field accessibility
   - Check logs for "DomainUserDetailsService" debugging output to trace authentication flow

### **Pro Tips for Success**

- **Compile early and often** - Don't let errors accumulate
- **Use global search and replace** - Find all occurrences of patterns to update
- **Be systematic** - Fix one type of error across all files before moving to next
- **Test method renames carefully** - Ensure all callers are updated
- **Use meaningful String IDs** - "owner-1", "pet-1" instead of random strings
- **Check controller classes** - They often call repository methods that change signatures
- **Always test runtime** - Compilation success doesn't guarantee functional templates
- **Service layer is critical** - Bridge between document storage and template expectations

### **Authentication Troubleshooting Guide** (CRITICAL)

#### **Common Authentication Serialization Errors**:

1. **`Cannot pass null or empty values to constructor`**:

   - **Root Cause**: `@JsonIgnore` preventing required field serialization to Cosmos DB
   - **Solution**: Remove `@JsonIgnore` from all persisted fields (password, authorities, etc.)
   - **Verification**: Check User entity has no `@JsonIgnore` on stored fields

2. **`BadCredentialsException` during login**:

   - **Root Cause**: Password field not accessible during authentication
   - **Solution**: Ensure password field is serializable and accessible in UserDetailsService
   - **Verification**: Add debug logs in `loadUserByUsername` method

3. **Authorities not loading correctly**:

   - **Root Cause**: Authority objects stored as complex entities instead of strings
   - **Solution**: Store authorities as `Set<String>` and convert to `GrantedAuthority` in UserDetailsService
   - **Pattern**:

     ```java
     // In User entity - stored in Cosmos
     @JsonProperty("authorities")
     private Set<String> authorities = new HashSet<>();

     // In UserDetailsService - convert for Spring Security
     List<GrantedAuthority> grantedAuthorities = user
       .getAuthorities()
       .stream()
       .map(SimpleGrantedAuthority::new)
       .collect(Collectors.toList());

     ```

4. **User entity not found during authentication**:
   - **Root Cause**: Repository query methods not working with String IDs
   - **Solution**: Update repository `findOneByLogin` method to work with Cosmos DB
   - **Verification**: Test repository methods independently

#### **Authentication Debugging Checklist**:

- [ ] User entity fully serializable (no `@JsonIgnore` on persisted fields)
- [ ] Password field accessible and not null
- [ ] Authorities stored as `Set<String>`
- [ ] UserDetailsService converts string authorities to `GrantedAuthority`
- [ ] Repository methods work with String IDs
- [ ] Debug logging enabled in authentication service
- [ ] User activation status checked appropriately
- [ ] Test login with known credentials (admin/admin)

### **Common Runtime Issues and Solutions**

#### **Issue 1: Repository Reactive Type Casting Errors**

**Error**: `ClassCastException: reactor.core.publisher.BlockingIterable cannot be cast to java.util.List`

**Root Cause**: Cosmos repositories return reactive types (`Iterable`) but legacy JPA code expects `List`

**Solution**: Convert reactive types properly in repository methods:

```java
// WRONG - Direct casting fails
default List<Entity> customFindMethod() {
    return (List<Entity>) this.findAll(); // ClassCastException!
}

// CORRECT - Convert Iterable to List
default List<Entity> customFindMethod() {
    return StreamSupport.stream(this.findAll().spliterator(), false)
            .collect(Collectors.toList());
}
```

**Files to Check**:

- All repository interfaces with custom default methods
- Any method that returns `List<Entity>` from Cosmos repository calls
- Import `java.util.stream.StreamSupport` and `java.util.stream.Collectors`

#### **Issue 2: BigDecimal Reflection Issues in Java 17+**

**Error**: `Unable to make field private final java.math.BigInteger java.math.BigDecimal.intVal accessible`

**Root Cause**: Java 17+ module system restricts reflection access to BigDecimal internal fields during serialization

**Solutions**:

1. **Replace with Double for simple cases**:

   ```java
   // Before: BigDecimal fields
   private BigDecimal amount;

   // After: Double fields (if precision requirements allow)
   private Double amount;

   ```

2. **Use String for high precision requirements**:

   ```java
   // Store as String, convert as needed
   private String amount; // Store "1500.00"

   public BigDecimal getAmountAsBigDecimal() {
     return new BigDecimal(amount);
   }

   ```

3. **Add JVM argument** (if BigDecimal must be kept):
   ```
   --add-opens java.base/java.math=ALL-UNNAMED
   ```

#### **Issue 3: Health Check Database Dependencies**

**Error**: Application fails health checks looking for removed database components

**Root Cause**: Spring Boot health checks still reference JPA/database dependencies after removal

**Solution**: Update health check configuration:

```yaml
# In application.yml - Remove database from health checks
management:
  health:
    readiness:
      include: 'ping,diskSpace' # Remove 'db' if present
```

**Files to Check**:

- All `application*.yml` configuration files
- Remove any database-specific health indicators
- Check actuator endpoint configurations

#### **Issue 4: Collection Type Mismatches in Services**

**Error**: Type mismatch errors when converting entity relationships to String-based storage

**Root Cause**: Service methods expecting different collection types after entity conversion

**Solution**: Update service methods to handle new entity structure:

```java
// Before: Entity relationships
public Set<RelatedEntity> getRelatedEntities() {
    return entity.getRelatedEntities(); // Direct entity references
}

// After: String-based relationships with conversion
public Set<RelatedEntity> getRelatedEntities() {
    return entity.getRelatedEntityIds()
        .stream()
        .map(relatedRepository::findById)
        .filter(Optional::isPresent)
        .map(Optional::get)
        .collect(Collectors.toSet());
}

### **Enhanced Error Resolution Process**

#### **Common Error Patterns and Solutions**:

1. **Reactive Type Casting Errors**:
   - **Pattern**: `cannot be cast to java.util.List`
   - **Fix**: Use `StreamSupport.stream().collect(Collectors.toList())`
   - **Files**: Repository interfaces with custom default methods

2. **BigDecimal Serialization Errors**:
   - **Pattern**: `Unable to make field...BigDecimal.intVal accessible`
   - **Fix**: Replace with Double, String, or add JVM module opens
   - **Files**: Entity classes, DTOs, data initialization classes

3. **Health Check Database Errors**:
   - **Pattern**: Health check fails looking for database
   - **Fix**: Remove database references from health check configuration
   - **Files**: application.yml configuration files

4. **Collection Type Conversion Errors**:
   - **Pattern**: Type mismatch in entity relationship handling
   - **Fix**: Update service methods to handle String-based entity references
   - **Files**: Service classes, DTOs, entity relationship methods

#### **Enhanced Validation Checklist**:
- [ ] **Repository reactive casting handled**: No ClassCastException on collection returns
- [ ] **BigDecimal compatibility resolved**: Java 17+ serialization works
- [ ] **Health checks updated**: No database dependencies in health configuration
- [ ] **Service layer collection handling**: String-based entity references work correctly
- [ ] **Data seeding completes**: "Data seeding completed" message appears in logs
- [ ] **Application starts fully**: Both frontend and backend accessible
- [ ] **Authentication works**: Can sign in without serialization errors
- [ ] **CRUD operations functional**: All entity operations work through UI

## **Quick Reference: Common Post-Migration Fixes**

### **Top Runtime Issues to Check**

1. **Repository Collection Casting**:
   ```java
   // Fix any repository methods that return collections:
   default List<Entity> customFindMethod() {
       return StreamSupport.stream(this.findAll().spliterator(), false)
               .collect(Collectors.toList());
   }

2. **BigDecimal Compatibility (Java 17+)**:

   ```java
   // Replace BigDecimal fields with alternatives:
   private Double amount; // Or String for high precision

   ```

3. **Health Check Configuration**:
   ```yaml
   # Remove database dependencies from health checks:
   management:
     health:
       readiness:
         include: 'ping,diskSpace'
   ```

### **Authentication Conversion Patterns**

- **Remove `@JsonIgnore` from fields that need Cosmos DB persistence**
- **Store complex objects as simple types** (e.g., authorities as `Set<String>`)
- **Convert between simple and complex types** in service/repository layers

### **Template/UI Compatibility Patterns**

- **Add transient properties** with `@JsonIgnore` for UI access to related data
- **Use service layer** to populate transient relationships before rendering
- **Never return repository results directly** to templates without relationship population
