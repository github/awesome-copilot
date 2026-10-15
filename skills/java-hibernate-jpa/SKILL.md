---
name: java-hibernate-jpa
description: 'Diagnose and fix Hibernate ORM / Jakarta Persistence problems in plain Java: N+1 queries, lazy loading errors, identifier generation, entity equals/hashCode, cascades, pagination, batching, locking, caching, Lombok on entities, and Hibernate 6/7 differences. Use when reviewing or writing JPA entities, mappings, and queries. Framework-neutral.'
---

# Hibernate ORM and Jakarta Persistence

Problem -> anti-pattern -> fix library for entity mapping and querying. Framework-neutral: it covers `EntityManager`/`Session` behavior, JPQL/HQL, and mapping annotations. If the project uses Spring Boot and the `java-springboot` and `spring-boot-testing` skills are installed, use them for Spring Data repositories, transaction wiring, and `@DataJpaTest`; for Panache and reactive persistence see the Quarkus skills. Integration tests against a real database: `java-testcontainers`.

## First: detect the stack

1. Read `pom.xml`/`build.gradle` (or the dependency tree) for `hibernate-core` and the persistence API: `jakarta.persistence` (Hibernate 6+/Jakarta EE 9+) vs `javax.persistence` (Hibernate 5, see `javax-to-jakarta-migration`).
2. Note the Hibernate major version; behavior differs (see `references/tooling-and-versions.md`). Hibernate 6.0-6.1 implement Jakarta Persistence 3.0, 6.2+ implement 3.1, 7.x implements 3.2, and Hibernate 7 needs Java 17+.
3. Note the database and whether the schema is managed by Flyway/Liquibase.
4. Turn on SQL logging and statistics in a test (see `references/tooling-and-versions.md`) before "optimizing" anything: measure statement counts.

## Quick decision table

| Symptom | Likely cause | Go to |
| --- | --- | --- |
| Many similar SELECTs for one request | N+1 on lazy association | `references/fetching-and-n-plus-one.md` |
| `LazyInitializationException` | Lazy access outside session | `references/fetching-and-n-plus-one.md` |
| `HHH000104` / `HHH90003004` warning, big memory use | Pagination with collection fetch join | `references/queries-pagination-batching.md` |
| Inserts slow, no JDBC batching | `IDENTITY` ids or batching not configured | `references/identifiers-and-entity-design.md`, `references/queries-pagination-batching.md` |
| Duplicate rows / lost children / `Set` anomalies | Bad `equals`/`hashCode` or cascade misuse | `references/identifiers-and-entity-design.md`, `references/associations-and-cascade.md` |
| Lost updates, deadlocks | Missing locking strategy | `references/locking-transactions-caching.md` |
| Stale or surprising data with caches | Second-level/query cache misuse | `references/locking-transactions-caching.md` |
| Schema drift, `ddl-auto` in prod | No migration tool | `references/tooling-and-versions.md` |

## Top rules (apply during review)

1. Associations: `@ManyToOne`/`@OneToOne` default to EAGER; declare `fetch = FetchType.LAZY` explicitly. `@OneToMany`/`@ManyToMany` are LAZY by default and should stay so. Choose fetching **per query** (JOIN FETCH, entity graph), not by making mappings EAGER.
2. Prefer `@ManyToOne` owning side plus a bidirectional `@OneToMany(mappedBy=...)` only when needed; keep both sides in sync through helper methods.
3. `Set` or `List` for collections? Use `Set` for `@ManyToMany`; a unidirectional `@OneToMany` with `@JoinColumn` or `List` without an order has costly update patterns.
4. Never use `CascadeType.REMOVE`/`ALL` on `@ManyToOne` or `@ManyToMany`. Use `orphanRemoval` only on a true parent-owned child collection.
5. Ids: `SEQUENCE` (pooled optimizer, `allocationSize` matching the DB increment) for generated numeric ids; `IDENTITY` disables JDBC insert batching; use UUIDs (time-ordered preferred) when ids must be generated client-side.
6. Entities: no Lombok `@Data`/`@EqualsAndHashCode`/`@ToString` over associations; implement `equals`/`hashCode` deliberately.
7. Return DTOs/projections from read endpoints rather than entities; never expose entities (lazy proxies) directly in an API.
8. Paginate with a stable `ORDER BY` including a unique tiebreaker; never combine `setMaxResults` with a collection `JOIN FETCH`.
9. Keep transactions short, at the service boundary; no remote calls or user interaction inside one.
10. Write and flush in batches for bulk work and clear the persistence context periodically.
11. Verify behavior with statement counts in tests against the real database engine.
12. Follow the schema management rule below.

## Schema management rule

This is the single rule other skills refer to by name:

- **Prototype/local:** `hibernate.hbm2ddl.auto=update` (or `create-drop` for throwaway tests) is acceptable.
- **Production (default):** versioned migrations with Flyway or Liquibase, and `hibernate.hbm2ddl.auto=validate` (or `none`). Add them when the user wants versioned migrations or the app is headed to production.
- **Externally managed schema:** `none` (or `validate`); do not add a migration tool.

## Review focus

Check statement counts for N+1, explicit `LAZY` on to-one associations, sequence-based ids with matching `allocationSize`, and `equals`/`hashCode` stable across transient to persistent. Version-dependent details (Hibernate 5/6/7): `references/tooling-and-versions.md`.

## References

- `references/fetching-and-n-plus-one.md`: N+1 detection and fixes, lazy vs eager, `LazyInitializationException`, open-session-in-view, DTO projections.
- `references/identifiers-and-entity-design.md`: id generation, `equals`/`hashCode`, Lombok, records vs entities, enums and converters, value types.
- `references/associations-and-cascade.md`: bidirectional helpers, cascade, `orphanRemoval`, collection choice, `@ManyToMany`.
- `references/queries-pagination-batching.md`: pagination (offset, keyset, in-memory warning), bulk operations, JDBC batching, `StatelessSession`.
- `references/locking-transactions-caching.md`: optimistic/pessimistic locking, transaction boundaries, flush modes, second-level cache.
- `references/tooling-and-versions.md`: SQL logging, statistics, tests, connection pool sizing, migrations, Hibernate 5/6/7 differences.

Canonical docs: Hibernate ORM user guide <https://docs.hibernate.org/orm/current/userguide/html_single/> and Jakarta Persistence <https://jakarta.ee/specifications/persistence/>. Deep background articles: <https://vladmihalcea.com/>.

Upgrading (fetch the page for the target version; prefer it over this skill): migration guides <https://hibernate.org/orm/documentation/migrate/> (6.6: <https://docs.hibernate.org/orm/6.6/migration-guide/>, 7.0: <https://docs.hibernate.org/orm/7.0/migration-guide/>), release notes <https://hibernate.org/orm/releases/>.
