# Fetching, N+1, lazy loading, projections

## N+1 queries

**Symptom**: one query loads N parents, then one extra query per parent when a lazy association is touched (in code, in a JSON serializer, in `toString`).

**Detect**: enable SQL logging/statistics (`tooling-and-versions.md`) and assert the statement count in an integration test; look for repeated identical SELECTs differing only by id.

```java
// anti-pattern: 1 + N
List<Order> orders = em.createQuery("select o from Order o", Order.class).getResultList();
orders.forEach(o -> o.getLines().size());
```

### Fix 1: JOIN FETCH (query-specific)

```java
List<Order> orders = em.createQuery(
    "select o from Order o left join fetch o.lines", Order.class)
  .getResultList();
```

- Fetch many-to-one/one-to-one freely. Fetch **at most one collection** per query: two bag collections in one query throw `MultipleBagFetchException` (and joining several collections multiplies rows). Fetch the second collection in a second query on the same session; the persistence context stitches them together.
- Hibernate 6+ de-duplicates root entities of fetch joins automatically, so `DISTINCT` is no longer needed for that; on Hibernate 5 add `DISTINCT` (consider the `hibernate.query.passDistinctThrough` hint to keep it out of SQL).
- Do not paginate a collection fetch join (see `queries-pagination-batching.md`).

### Fix 2: Entity graph (reusable fetch plan)

```java
EntityGraph<Order> g = em.createEntityGraph(Order.class);
g.addAttributeNodes("customer");
g.addSubgraph("lines").addAttributeNodes("product");

List<Order> orders = em.createQuery("select o from Order o", Order.class)
  .setHint("jakarta.persistence.fetchgraph", g)   // Hibernate 7: prefer query.setEntityGraph(g, GraphSemantic.FETCH)
  .getResultList();
```

`@NamedEntityGraph` declares graphs on the entity. Fetch graph (`fetchgraph`) treats unlisted attributes as lazy; load graph (`loadgraph`) keeps mapping defaults.

### Fix 3: Batch fetching (when you cannot know the access pattern)

Loads lazy associations of many parents with one `IN (...)` query instead of N queries.

```java
@OneToMany(mappedBy = "order")
@BatchSize(size = 25)
private List<OrderLine> lines;
```

Global default: `hibernate.default_batch_fetch_size=16` (values of 8-32 are typical). Turns N+1 into 1 + N/size. It also helps lazy `@ManyToOne` proxies. Not as precise as JOIN FETCH, but a good safety net.

### Fix 4: Subselect fetching

`@Fetch(FetchMode.SUBSELECT)` loads the collection for all parents of the original query in one extra query. Good for small result sets of a single known query; can be heavy if the original query is expensive.

### Fix 5: Projection that avoids entities

If the caller needs a flat view, select exactly the columns (below).

## Lazy vs eager

- Defaults: `@ManyToOne`, `@OneToOne` EAGER; `@OneToMany`, `@ManyToMany`, `@ElementCollection` LAZY; `@Basic` EAGER (`@Lob` and `@Basic(fetch = LAZY)` need bytecode enhancement to be really lazy).
- `FetchType.EAGER` in a mapping applies to **every** load: `em.find` joins it, but JPQL/criteria queries ignore it for the initial SQL and load eager associations with follow-up selects (a hidden N+1). Set `LAZY` in the mapping and fetch per use case.
- Lazy `@OneToOne` on the **inverse** side (`mappedBy`) is normally loaded eagerly because Hibernate must query to detect null; it can be a lazy proxy only with `optional = false` (the row is guaranteed to exist) or bytecode enhancement. Prefer a unidirectional owning side; `@MapsId` on the owning side does not by itself solve null detection for an optional inverse side.
- Hibernate proxies: use `Hibernate.initialize(x)`, `Hibernate.isInitialized(x)`, and `em.getReference` (id-only reference to set a foreign key without a SELECT).

## LazyInitializationException

Cause: a lazy association or proxy is accessed after the session closed (typically while serializing an entity in a controller).

Fixes, best first:

1. Load what the use case needs inside the transaction (JOIN FETCH / entity graph / projection) and map to a DTO **inside** the transactional service method.
2. Initialize explicitly in the service (`Hibernate.initialize`), only when the small count is known.
3. Avoid `hibernate.enable_lazy_load_no_trans=true`: it opens a new connection per lazy load outside any transaction and hides N+1.

## Open session in view (OSIV)

OSIV keeps the persistence context (and a database connection) open until the HTTP response is written, so lazy loading "works" in controllers and serializers.

Tradeoffs:
- Pros: no `LazyInitializationException` in the view layer.
- Cons: connection held during rendering and any remote call (pool starvation), queries issued from the view layer escape transaction/service design, hidden N+1, and with auto-commit-less modes extra statements outside the transaction.
- Recommendation: disable OSIV where the framework enables it by default, return DTOs, and define fetch plans in the service layer. If kept, monitor connection hold time. Enabling/disabling is framework configuration (see `java-springboot` for Spring's `spring.jpa.open-in-view`).

## DTO projections

Use them for read models, lists, reports. They skip dirty checking and snapshot memory.

```java
public record OrderSummary(Long id, String customerName, BigDecimal total) {}

List<OrderSummary> rows = em.createQuery(
    "select new com.acme.OrderSummary(o.id, c.name, o.total) from Order o join o.customer c",
    OrderSummary.class).getResultList();
```

- JPQL constructor expressions (`select new ...`) require the fully-qualified class name; alternatively select columns into `Tuple`.
- Java records work as projection types with constructor expressions.
- Native queries: `@SqlResultSetMapping` with `@ConstructorResult`, or `Tuple`.
- Projections cannot be lazily loaded later; include everything the caller needs.
- Entities are still right for write paths: load, change, let dirty checking flush.
