# Tooling, diagnosis, migrations, versions

## SQL logging and statistics

Prefer logger categories to `hibernate.show_sql` (which prints to stdout, unformatted, without parameters). Add these elements inside the existing Logback `logback.xml` `<configuration>` (keep its appender and root logger):

```xml
<logger name="org.hibernate.SQL" level="DEBUG"/>
<logger name="org.hibernate.orm.jdbc.bind" level="TRACE"/>
```

`org.hibernate.orm.jdbc.bind` is for Hibernate 6+; on Hibernate 5 use `org.hibernate.type.descriptor.sql.BasicBinder`. For Log4j2, configure the same categories with `<Logger name="..." level="..."/>` elements inside `<Loggers>` in `log4j2.xml`; bare category properties in `hibernate.properties` do not configure either backend.

Statistics and slow-query log:

```properties
hibernate.generate_statistics=true
hibernate.session.events.log.LOG_QUERIES_SLOWER_THAN_MS=25
```

For total SQL statement-count assertions in N+1 regression tests, compare `sessionFactory.getStatistics().getPrepareStatementCount()` before and after the use case, or use a datasource proxy (e.g. datasource-proxy, p6spy). `getQueryExecutionCount()` counts executed ORM queries, not secondary SELECTs issued to initialize lazy associations; `getEntityFetchCount()` and `getCollectionFetchCount()` are useful supplemental diagnostics, not total statement counts. Keep logging at DEBUG/TRACE only in dev/test; statistics have overhead.

Use `EXPLAIN (ANALYZE)` on the real database for slow SQL; indexes on foreign keys are your responsibility (Hibernate does not create them for FKs on most databases).

## Testing persistence code

- Test against the production database engine via Testcontainers (`java-testcontainers`), not H2 with a compatibility mode.
- Flush and clear in tests (`em.flush(); em.clear();`) before asserting reads, otherwise you only test the first-level cache.
- Run the real migrations in tests, and use `hibernate.hbm2ddl.auto=validate` to catch mapping/schema drift.
- Add a statement-count assertion for list endpoints to prevent N+1 regressions.

## Connection pool sizing

- Hibernate uses the pool for each transaction; pool size bounds concurrent DB work, not request count. Start small (roughly `cores * 2 + effective spindles` rule of thumb, typically 10-20 per application instance) and tune with measurements.
- Total connections across instances must stay below the database `max_connections`.
- Long transactions, OSIV, and remote calls in transactions are the usual cause of pool exhaustion, not too few connections.
- Set connection timeout, max lifetime (below DB/proxy idle limits), and leak detection (HikariCP `leakDetectionThreshold`) in dev.
- Use the pool's `autoCommit=false` and `hibernate.connection.provider_disables_autocommit=true` to delay connection acquisition until the first statement, when your pool supports it.

## Schema management

- Production: Flyway or Liquibase migrations, versioned and reviewed; `hibernate.hbm2ddl.auto` set to `validate` or `none`.
- `update`/`create`/`create-drop` only for prototypes and throwaway tests; `update` never drops or renames and can silently diverge from environments.
- Jakarta Persistence schema generation (`jakarta.persistence.schema-generation.*`) can emit a script to diff against; do not apply it blindly.
- Keep migrations compatible with the old release for zero-downtime (expand/contract). Sequence `INCREMENT BY` must match `allocationSize`.
- Name constraints and indexes explicitly in migrations; add indexes on foreign keys and on filter/sort columns.

## Hibernate version differences (detect first)

| Topic | Hibernate 5.x | Hibernate 6.x | Hibernate 7.x |
| --- | --- | --- | --- |
| Namespace | `javax.persistence` (5.5+ also offers `hibernate-core-jakarta`) | `jakarta.persistence` | `jakarta.persistence` |
| Jakarta Persistence | 2.2 | 3.0 (6.0-6.1), 3.1 (6.2+) | 3.2 |
| Java baseline | 8+ | 11+ | 17+ |
| Query engine | HQL parser (ANTLR 2) | Rewritten (semantic query model, ANTLR 4); stricter HQL; more SQL features | Continues 6 architecture; more HQL features, stricter validation |
| Fetch-join duplicates | Need `DISTINCT` | Auto de-duplicated | Same as 6 |
| Pagination + collection fetch warning | `HHH000104` | `HHH90003004` | Same as 6 |
| Id generation | Legacy `hibernate.id.new_generator_mappings` | Sequence-first `AUTO`; `@GenericGenerator` deprecated from 6.5 | Prefer standard annotations and `@UuidGenerator`/`@IdGeneratorType` |
| Metamodel generator | `hibernate-jpamodelgen` | `hibernate-jpamodelgen` (`hibernate-processor` is the successor, introduced in 7.0) | `hibernate-processor` |
| Hibernate Reactive/other | n/a | Separate artifacts | Separate artifacts |

Migration notes (5 -> 6): fix `javax` -> `jakarta` imports (`javax-to-jakarta-migration` skill), review HQL for stricter parsing, re-check generated sequence names and `allocationSize`, re-check `@Type`/custom type usages and `AttributeConverter`s, `Query.getResultList` behavior and `@Where`/`@Filter` use. Read the official migration guides: <https://docs.hibernate.org/orm/6.0/migration-guide/> and the matching guide for 7. Hibernate 8 is in beta at the time of writing; do not assume its APIs.

Version-specific APIs mentioned elsewhere in this skill (entity-graph hint vs `setEntityGraph`, `KeyedPage`, UUID styles) should be checked against the project's Hibernate version before use.

## Tools

- Metamodel/typed Criteria: `hibernate-jpamodelgen` for Hibernate 6.x (`hibernate-processor` first appears in 7.0.0.Alpha1 on Maven Central), `hibernate-processor` for Hibernate 7 (`org.hibernate.orm:hibernate-processor`, `provided`/annotation-processor scope; `hibernate-jpamodelgen` 7.x is only a Maven relocation to it).
- JDK 23+ no longer runs annotation processors found only on the classpath: with a plain `provided` dependency `Entity_` classes are not generated. Set `<proc>full</proc>` on `maven-compiler-plugin` (or list the processor in `annotationProcessorPaths`; Gradle: `annotationProcessor`).
- Bytecode enhancement (lazy basic attributes, dirty tracking, lazy to-one inverse): Hibernate Maven/Gradle plugin; test carefully.
- Validation: Jakarta Bean Validation integrates with persist/update and does not replace DB constraints.
