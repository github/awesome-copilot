# Associations, cascade, collections

## Bidirectional associations with helpers

The owning side holds the foreign key (`@ManyToOne`). The inverse side uses `mappedBy`. Keep both sides in sync in the domain model, otherwise the in-memory graph and the database diverge.

```java
@Entity
class Order {
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLine> lines = new ArrayList<>();

    public void addLine(OrderLine line) {
        lines.add(line);
        line.setOrder(this);
    }

    public void removeLine(OrderLine line) {
        lines.remove(line);
        line.setOrder(null);
    }

    public List<OrderLine> getLines() {
        return Collections.unmodifiableList(lines);
    }
}

@Entity
class OrderLine {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;
}
```

Rules:
- Only the `@ManyToOne` side writes the FK; changing only the inverse collection does nothing to the database.
- Expose the collection read-only (or defensively copied); initialize it once and never replace the reference (`order.setLines(new ArrayList<>())` breaks orphan removal and confuses Hibernate's collection tracking: mutate with `clear()`/`add()`).
- Prefer unidirectional `@ManyToOne` and query the many side when you never navigate parent -> children.

## Unidirectional @OneToMany anti-pattern

A `@OneToMany` without `mappedBy` and without `@JoinColumn` creates a join table and extra SQL. With `@JoinColumn` it issues an `INSERT` then an `UPDATE` for the FK. Make the relationship bidirectional (or `@ManyToOne` only).

## Cascade pitfalls

| Pitfall | Fix |
| --- | --- |
| `CascadeType.ALL`/`REMOVE` on `@ManyToOne` or `@ManyToMany`: deleting one child deletes the shared parent or related rows | Cascade only parent -> owned child. |
| `CascadeType.REMOVE` for a large collection loads and deletes row by row | Flush pending changes, execute a bulk `DELETE ... WHERE parent_id = :id`, then clear the context; alternatively use DB `ON DELETE CASCADE` with `@OnDelete(action = OnDeleteAction.CASCADE)`. |
| `CascadeType.PERSIST` on a detached child: `PersistentObjectException: detached entity passed to persist` | Use `merge` (or load the entity first); do not set a detached instance on a persist-cascaded association. |
| `CascadeType.MERGE` overwrites state with stale DTO data | Copy only allowed fields onto a managed entity. |
| `orphanRemoval = true` on a shared child | Only for exclusive, parent-owned children; removing from the collection deletes the row. |
| Replacing a collection with `setX(newList)` on an `orphanRemoval` mapping | `A collection with cascade="all-delete-orphan" was no longer referenced`; mutate in place. |

`orphanRemoval` also implies removal when the parent is removed.

## Collection type choice

- `@ManyToMany`: use `Set`. With a `List` (a bag), removing one element deletes **all** join-table rows and re-inserts the rest.
- Avoid `@ManyToMany` for anything beyond a plain link; model the join as an entity (with `@ManyToOne` on both sides) as soon as it has attributes or you query it.
- `@OneToMany` `List` with `@OrderColumn` rewrites index columns on removal from the head; use `@OrderBy` for read-time ordering instead.
- Collections with possibly thousands of rows should not be mapped at all; query them with pagination.
- Never call `collection.size()` or `contains()` on a large lazy collection to count/check; run a count/exists query (`@LazyCollection(EXTRA)` is deprecated).

## Equality in collections

`Set` semantics rely on `equals`/`hashCode` (see `identifiers-and-entity-design.md`). A `HashSet` of entities whose `hashCode` depends on the generated id will lose elements after `persist`.

## One-to-one

Prefer a shared primary key (`@MapsId`) for a true one-to-one: no extra index, lazy-loadable from the owning side, and one-query `find`. Without it, the inverse side (`mappedBy`) is usually loaded eagerly, because Hibernate must query to know whether it is null; it can be a lazy proxy only when `optional = false` guarantees the row exists, or with bytecode enhancement.

## Delete and update patterns

- Removing a parent with children: either cascade REMOVE (small, owned collections), DB-level cascade, or explicit bulk delete in order (children first).
- Bulk JPQL/HQL `update`/`delete` bypass the persistence context and version columns; flush before, and `clear()` afterwards or refresh entities.
