# Locking, transactions, caching

## Optimistic locking (default choice)

```java
@Entity
class Account {
    @Version
    private long version;
}
```

- Hibernate adds `WHERE version = ?` to updates; a concurrent change throws `OptimisticLockException` (Hibernate: `StaleObjectStateException`). Catch it at the use-case boundary, then retry or tell the user to reload.
- Use `Integer`/`Long`/`Instant` version types; never modify the version manually.
- With DTO round-trips (web forms), send the version to the client and, on submit, load the entity (`em.find`), compare the submitted version with the loaded one and reject a mismatch (e.g. HTTP 409). Never assign the client's version to a managed entity: Jakarta Persistence forbids applications from changing the version. Alternatively `merge()` a detached entity that carries its `@Version`; the provider then checks it and throws `OptimisticLockException` on a stale one, which you handle at the use-case boundary.
- `LockModeType.OPTIMISTIC_FORCE_INCREMENT` bumps the version even if only children changed, useful for aggregate roots.
- Bulk HQL updates ignore `@Version` unless you write `update versioned`.

## Pessimistic locking

Use for hot rows or queue-like tables where retries are too costly.

```java
Account a = em.find(Account.class, id, LockModeType.PESSIMISTIC_WRITE,
    Map.of("jakarta.persistence.lock.timeout", 3000));
```

- `PESSIMISTIC_WRITE` -> `SELECT ... FOR UPDATE`; `PESSIMISTIC_READ` -> shared lock (dialect dependent).
- Always set a lock timeout; always lock rows in a consistent order to avoid deadlocks; keep the transaction short.
- Work queues: `FOR UPDATE SKIP LOCKED` (via Hibernate's `SKIP_LOCKED` lock option or native SQL) lets several workers claim different rows.
- Lock timeout support varies by database; verify against the target engine.
- Locking a row via a query with `setLockMode(...)` and a fetch join may lock more rows than expected; lock the root only.

## Isolation and anomalies

Hibernate does not change isolation levels. Default `READ COMMITTED` allows non-repeatable reads across queries; the persistence context gives repeatable reads for entities loaded by id within one session. Do not assume a read-then-write check-and-act is safe: use `@Version`, a lock, or a unique constraint (and handle `ConstraintViolationException`).

## Transaction boundaries

- One use case = one transaction at the service/application layer, not in repositories or controllers, and not per entity call.
- Keep the persistence context scope = transaction scope (transaction-scoped `EntityManager`). An `EntityManager` is not thread-safe; never share it, or entities, across threads.
- No HTTP calls, message sends, or long computation inside a transaction: they hold connections and locks. Publish events after commit (outbox pattern for reliability).
- Read-only use cases: mark the transaction read-only (framework facility) or `session.setDefaultReadOnly(true)`; this skips dirty checking snapshots.
- Rollback: JPA does not define rollback-by-exception-type for a resource-local `EntityTransaction`; call `rollback()` explicitly in a `catch`/`finally`. Automatic rollback rules (for example on `RuntimeException` but not checked exceptions) come from the surrounding framework or container, such as Spring `@Transactional` or Jakarta `@Transactional`.
- After a persistence exception the session is in an undefined state: discard it, do not continue using it.
- Flush modes: `AUTO` flushes before queries that touch dirty entity tables; unexpected flushes inside loops show up in logs as updates before selects. Use `FlushModeType.COMMIT` or `em.setFlushMode` sparingly, only when you understand the stale-read risk.
- `merge` returns a managed copy: use the returned instance, not the argument. Prefer loading and modifying a managed entity over `merge` of detached state.
- `save`/`persist` on already-managed entities is unnecessary: dirty checking flushes changes at commit.

## Second-level cache basics

Levels: first-level (persistence context, always on, per session), second-level (per `SessionFactory`, opt-in, shared), query cache (opt-in, result ids).

Enable only for read-mostly data that is expensive to load, and that this application alone writes (or that tolerates staleness):

```properties
hibernate.cache.use_second_level_cache=true
# Requires hibernate-jcache and a JCache provider, e.g. Ehcache, on the classpath.
hibernate.cache.region.factory_class=jcache
```

```java
@Entity
@Cacheable
@org.hibernate.annotations.Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
class Country { ... }
```

- `shared-cache-mode` `ENABLE_SELECTIVE` (cache only `@Cacheable`) is the safest.
- Concurrency strategies: `READ_ONLY` (immutable), `NONSTRICT_READ_WRITE` (tolerates staleness), `READ_WRITE`, `TRANSACTIONAL` (JTA).
- Query cache is rarely a win: any write to a queried table invalidates its results. Avoid by default.
- Bulk HQL/JPQL DML executed through Hibernate invalidates the affected second-level and query-cache regions automatically, and native DML run through Hibernate also triggers cache cleanup (possibly all regions when query spaces are unknown). What stays stale is managed entities in the current persistence context: flush before bulk DML, then `clear()` or refresh afterwards. Writes outside Hibernate (other applications, direct JDBC) are not seen; they need a separate invalidation strategy such as `getCache().evict(...)`.
- Multi-node deployments need a distributed or invalidating provider; local-only caches serve stale data per node.
- Measure with statistics (`hibernate.generate_statistics`) before and after; if the hit ratio is low, remove it.
- Cache entities by id (`find`), collections separately (`@Cache` on the collection mapping), and keep cached entities small.
