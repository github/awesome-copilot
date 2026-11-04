# Data access (Spring Data JPA, Spring Data JDBC)

For mapping problems (N+1 theory, equals/hashCode, cascades, locking, batching) use the `java-hibernate-jpa` skill; for PostgreSQL defaults and Docker Compose use `create-spring-boot-java-project` (`references/database.md`); for `@DataJpaTest` and Testcontainers use `spring-boot-testing`. This file covers the Spring layer on top. Verified with Spring Data JPA on Boot 4.1.1 and Boot 3.5.16 (same code).

## Repositories

```java
public interface OrderRepository extends JpaRepository<PurchaseOrder, Long> {

	interface CustomerView { Long getId(); String getCustomer(); }   // interface projection

	Page<CustomerView> findByStatus(PurchaseOrder.Status status, Pageable pageable);

	@Query("select new com.example.demo.OrderSummary(o.id, o.customer, o.total) from PurchaseOrder o where o.customer = :customer")
	Page<OrderSummary> summaries(String customer, Pageable pageable);   // record DTO

	@EntityGraph(attributePaths = "items")
	Optional<PurchaseOrder> findWithItemsById(Long id);                 // fetches the collection in one query
}
```

- Derived queries for simple lookups; `@Query` (JPQL) once the method name gets long; `@Query(nativeQuery = true)` only when JPQL cannot express it. Named parameters (`:customer`) bind by name when compiled with `-parameters` (the Boot parent POM and Gradle plugin enable it; verified without `@Param`).
- **Projections:** return interface projections (closed: only getters for the needed columns) or record DTOs (`select new ...` with the fully qualified name) for read endpoints.
- **Pagination:** `Page<T>` runs an extra `count` query; use `Slice<T>` when the total is not needed. Always sort on a stable, unique column (`Sort.by("id")`); cap the page size from user input (`Math.min(size, 100)`). Never combine pagination with a collection `JOIN FETCH` (in-memory paging; see `java-hibernate-jpa`).
- **N+1:** fix per query with `@EntityGraph` or `JOIN FETCH`, keep associations `LAZY`, and assert statement counts in a test (`hibernate.generate_statistics`).
- `spring.jpa.open-in-view=false`; load what the response needs inside the transaction and map to DTOs there.
- **Boot 4:** JPA slice classes moved: `org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest`, `org.springframework.boot.jpa.test.autoconfigure.TestEntityManager`, `org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase` (Boot 3: `org.springframework.boot.test.autoconfigure.orm.jpa.*` and `...autoconfigure.jdbc.*`). Starter: `spring-boot-starter-data-jpa` (+ `spring-boot-starter-data-jpa-test` for tests).

## Transactions

- `@Transactional` on **service** methods (the use-case boundary), not on controllers or repositories. Reads: `@Transactional(readOnly = true)`.
- Keep transactions short: no HTTP calls, messaging sends or file I/O inside; publish events after commit with `@TransactionalEventListener(phase = AFTER_COMMIT)` or an outbox (`references/messaging-caching.md`).
- Spring rolls back on unchecked exceptions only; use `rollbackFor` for checked ones. Self-invocation bypasses the proxy.
- Services return DTOs, so lazy associations are never touched after the transaction ends.

## Auditing

```java
@Configuration(proxyBeanMethods = false)
@EnableJpaAuditing
class JpaAuditingConfig {}   // not on the @SpringBootApplication class

@Entity @EntityListeners(AuditingEntityListener.class)
class PurchaseOrder {
	@CreatedDate Instant createdAt;
	@LastModifiedDate Instant lastModifiedAt;
}
```

`@DataJpaTest` does not scan `@Configuration` classes: `@Import(JpaAuditingConfig.class)` in the test, otherwise `createdAt` stays `null` (verified). For `@CreatedBy`/`@LastModifiedBy` provide an `AuditorAware<String>` bean (usually from the security context; see `spring-security`).

## Schema management

Follow the schema management rule of `java-hibernate-jpa` (prototype: `update`; production: Flyway/Liquibase with `ddl-auto=validate`; externally managed: `none`). With Spring Boot:

- **Boot 4:** add `spring-boot-starter-flyway` (and `org.flywaydb:flyway-database-postgresql` for PostgreSQL) or `spring-boot-starter-liquibase`; the auto-configuration lives in the starter. **Boot 3:** `org.flywaydb:flyway-core` (+ `flyway-database-postgresql`) or `liquibase-core`.
- Migrations in `src/main/resources/db/migration/V1__init.sql`; never edit an applied migration, add a new version. Each migration is one reviewable unit; use `ddl-auto=validate` so entity/schema drift fails at startup (verified: a Flyway-created schema passes `validate` for the entities above).
- Add them only when the user wants versioned migrations or the app is headed to production; do not add Flyway to a project whose schema is managed elsewhere.

## Spring Data JDBC (alternative)

Choose it for simple aggregates without lazy loading, sessions or dirty tracking: aggregate roots are loaded and saved as a whole, and there is no persistence context. Starter `spring-boot-starter-data-jdbc` (do not put it next to `data-jpa` in the same module unless you configure repository scanning explicitly: both would try to claim repositories).

```java
public record Book(@Id Long id, String title, @MappedCollection(idColumn = "book") Set<Chapter> chapters) {
	public record Chapter(String name) {}
}

public interface BookRepository extends ListCrudRepository<Book, Long>, PagingAndSortingRepository<Book, Long> {
	List<Book> findByTitleStartingWith(String prefix);
}
```

- You own the schema (`schema.sql` with `spring.sql.init.mode=always`, or Flyway/Liquibase as above); there is no `ddl-auto`.
- `null` id means insert; the saved copy carries the generated id (`repo.save` returns it: use the return value with records).
- Boot 4 test slice: `org.springframework.boot.data.jdbc.test.autoconfigure.DataJdbcTest` (verified with a Testcontainers PostgreSQL, `@AutoConfigureTestDatabase(replace = NONE)`).
- Not a drop-in for JPA: no `@EntityGraph`, no lazy associations, references between aggregates are by id.
