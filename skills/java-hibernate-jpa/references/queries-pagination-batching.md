# Queries, pagination, batching

## Pagination

### Offset pagination

```java
List<Order> orders = em.createQuery("select o from Order o order by o.createdAt desc, o.id desc", Order.class)
    .setFirstResult(page * size)
    .setMaxResults(size)
    .getResultList();
```

- Always include a deterministic `ORDER BY` with a unique tiebreaker (`id`).
- Large offsets are slow (the DB scans and discards rows). Use keyset pagination for deep paging.

### Collection fetch join + pagination (HHH000104)

```java
// anti-pattern
em.createQuery("select o from Order o join fetch o.lines", Order.class)
  .setMaxResults(20).getResultList();
```

Hibernate logs `HHH000104: firstResult/maxResults specified with collection fetch; applying in memory` (Hibernate 6: `HHH90003004`). It loads **every** matching row and paginates in the JVM: memory and latency explode.

Fix (two queries):

```java
List<Long> ids = em.createQuery("select o.id from Order o where exists (select 1 from o.lines) order by o.createdAt desc, o.id desc", Long.class)
    .setMaxResults(20).getResultList();

List<Order> orders = em.createQuery(
    "select distinct o from Order o join fetch o.lines where o.id in :ids order by o.createdAt desc, o.id desc",
    Order.class).setParameter("ids", ids).getResultList();
```

The `exists` filter matches the inner `join fetch`, which drops orders without lines; use `left join fetch` and drop the filter to keep them. Alternatives: fetch only to-one associations in the paged query and rely on `@BatchSize`/`default_batch_fetch_size` for collections; or use a DTO projection. Fetch joins on `@ManyToOne` are safe with pagination.

### Keyset (seek) pagination

```java
List<Order> next = em.createQuery("""
    select o from Order o
    where (o.createdAt < :ts or (o.createdAt = :ts and o.id < :id))
    order by o.createdAt desc, o.id desc
    """, Order.class)
  .setParameter("ts", lastTs).setParameter("id", lastId)
  .setMaxResults(size).getResultList();
```

Needs an index on the sort columns (`created_at desc, id desc`), constant time per page, stable under inserts; no "jump to page N". Return an opaque cursor made from the last row's sort values. Hibernate 6.5+/7 also has `KeyedPage`/`KeyedResultList` APIs on `SelectionQuery`; check the docs of your version.

### Total counts

A separate `count` query per page is costly; skip it when the UI can use "has next" (fetch `size + 1` rows).

## JDBC batching (inserts and updates)

Enable JDBC batching with a positive batch size:

```properties
hibernate.jdbc.batch_size=50
```

Hibernate can batch inserts with sequence, UUID, or assigned identifiers. `IDENTITY` prevents JDBC batching of entity **inserts** because Hibernate must execute each insert to obtain its generated id; it does not prevent batching updates. Do not change an existing identifier strategy solely to enable batching without considering its other tradeoffs.

Optional tuning (measure against the actual database and driver):

```properties
hibernate.order_inserts=true
hibernate.order_updates=true
hibernate.jdbc.batch_versioned_data=true
```

Ordering statements may group compatible operations, and PostgreSQL `reWriteBatchedInserts=true` / MySQL `rewriteBatchedStatements=true` may improve driver throughput; neither ordering nor driver rewrite flags are prerequisites for Hibernate JDBC batching. Check the dialect, driver, and Hibernate version before changing settings.

Write pattern for large loads:

```java
for (int i = 0; i < items.size(); i++) {
    em.persist(items.get(i));
    if ((i + 1) % batchSize == 0) {
        em.flush();
        em.clear();      // release memory and dirty-checking cost
    }
}
```

Keep `batchSize` equal to `hibernate.jdbc.batch_size`. Commit per chunk (own transaction) if partial progress is acceptable.

Entities referenced after `clear()` are detached; reload or use `getReference`.

## Bulk operations and StatelessSession

- Updates over many rows: set-based `update Order o set o.status = :s where ...` (bypasses lifecycle callbacks, `@Version` unless `versioned`, and cascades; Hibernate invalidates the affected second-level cache regions itself, but managed entities in the current persistence context become stale, so flush before and clear or refresh afterwards).
- Pure ETL/import: `StatelessSession` (no persistence context, no dirty checking, no cascade) with `insert`/`update`.
  - Hibernate 6: it bypasses the second-level cache and uses `hibernate.jdbc.batch_size` for JDBC batching.
  - Hibernate 7: it uses the second-level cache by default (disable per session if unwanted), and `hibernate.jdbc.batch_size` has no effect on it; set the batch size with `StatelessSession.setJdbcBatchSize(n)` and prefer the bulk operations `insertMultiple`/`updateMultiple`/`upsertMultiple`/`deleteMultiple`.
  - Confirm the API for your exact version.
- Streaming reads: `query.getResultStream()`/`scroll` with `hibernate.jdbc.fetch_size`; close the stream and clear the context periodically. Many drivers (PostgreSQL) only stream inside a transaction with autocommit off and a fetch size set.

## Query hygiene

- Bind parameters; never concatenate user input into JPQL/native SQL.
- `IN` lists: large lists blow up the SQL cache; Hibernate pads parameters with `hibernate.query.in_clause_parameter_padding=true`, and databases cap parameter counts, so chunk (e.g. 500-1000).
- `hibernate.query.fail_on_pagination_over_collection_fetch=true` only throws when Hibernate would really paginate in memory. Hibernate 7.4+ only (the 7.4 query language guide: "Prior to Hibernate 7.4, limits didn't play well with many-valued fetch joins"; on 7.0-7.3 pagination over a collection fetch join stays in memory on every dialect, so this guard is useful there). Verified in the 7.4 source (`SqmQueryImpl`/`AbstractSqmSelectionQuery`): when the dialect supports `LIMIT`/`OFFSET` in a subquery (`supportsOffsetInSubquery`, true for PostgreSQL, MySQL, H2...), Hibernate 7.4+ pushes the pagination into a derived table, so `join fetch` + `setMaxResults` (and Spring Data `Pageable` on such a query) is paginated by the database and the setting never fires. It fires only for dialects without that support, or when in-memory limiting is forced; the old `HHH000104` warning is then logged otherwise. Do not use it as a guard on 7.4+ with such dialects: check the generated SQL for `limit`/`fetch first`, and still prefer the two-step (ids first, then fetch) pattern for portability.
- `@QueryHints(readOnly)`/`setHint("org.hibernate.readOnly", true)` for read paths that load entities but never modify them.
- Prefer JPQL/HQL or Criteria for portability; use native SQL for database-specific features (window functions, `SKIP LOCKED`, upserts), mapped to DTOs.
- `existsBy`-style checks: `select 1 ... fetch first 1 rows only` / `count(*) > 0` instead of loading entities.
- Check generated SQL for `select *`-like entity loads where only 2 columns are needed: use projections.
