# AssertJ Collections

AssertJ assertions for collections: `List`, `Set`, `Map`, arrays, and streams.

## When to Use This Reference

- The value under test is a `List`, `Set`, `Map`, array, or `Stream`
- You need to assert on multiple elements, their order, or specific fields within them
- You are using `extracting()`, `filteredOn()`, `containsExactly()`, or similar collection methods
- Asserting a single scalar or single object → use [assertj-basics.md](assertj-basics.md) instead

## Basic Collection Checks

```java
List<Order> orders = orderService.findAll();

assertThat(orders).isNotEmpty();
assertThat(orders).isEmpty();
assertThat(orders).hasSize(3);
assertThat(orders).hasSizeGreaterThan(0);
assertThat(orders).hasSizeLessThanOrEqualTo(10);
```

## Containment Assertions

```java
// Contains (any order, allows extras)
assertThat(orders).contains(order1, order2);

// Contains exactly these elements in this order (no extras)
assertThat(statuses).containsExactly("NEW", "PENDING", "COMPLETED");

// Contains exactly these elements in any order (no extras)
assertThat(statuses).containsExactlyInAnyOrder("COMPLETED", "NEW", "PENDING");

// Contains any of these elements (at least one match required)
assertThat(statuses).containsAnyOf("NEW", "CANCELLED");

// Does not contain
assertThat(statuses).doesNotContain("DELETED");
```

## Extracting Fields

Extract a single field from each element before asserting:

```java
assertThat(orders)
  .extracting(Order::getStatus)
  .containsExactly("NEW", "PENDING", "COMPLETED");
```

Extract multiple fields as tuples:

```java
assertThat(orders)
  .extracting(Order::getId, Order::getStatus)
  .containsExactly(
    tuple(1L, "NEW"),
    tuple(2L, "PENDING"),
    tuple(3L, "COMPLETED")
  );
```

## Filtering Before Asserting

```java
assertThat(orders)
  .filteredOn(order -> order.getStatus().equals("PENDING"))
  .hasSize(2)
  .extracting(Order::getId)
  .containsExactlyInAnyOrder(1L, 3L);

// Filter by field value
assertThat(orders)
  .filteredOn("status", "PENDING")
  .hasSize(2);
```

## Predicate Checks

```java
assertThat(orders).allMatch(o -> o.getTotal().compareTo(BigDecimal.ZERO) > 0);
assertThat(orders).anyMatch(o -> o.getStatus().equals("COMPLETED"));
assertThat(orders).noneMatch(o -> o.getStatus().equals("DELETED"));

// With description for failure messages
assertThat(orders)
  .allSatisfy(o -> assertThat(o.getId()).isPositive());
```

## Per-Element Ordered Assertions

Assert each element in order with individual conditions:

```java
assertThat(orders).satisfiesExactly(
  first  -> assertThat(first.getStatus()).isEqualTo("NEW"),
  second -> assertThat(second.getStatus()).isEqualTo("PENDING"),
  third  -> {
    assertThat(third.getStatus()).isEqualTo("COMPLETED");
    assertThat(third.getTotal()).isGreaterThan(BigDecimal.ZERO);
  }
);
```

## Nested / Flat Collections

```java
// flatExtracting: flatten one level of nested collections
assertThat(orders)
  .flatExtracting(Order::getItems)
  .extracting(OrderItem::getProduct)
  .contains("Laptop", "Mouse");
```

## Recursive Field Comparison

Compare elements by fields instead of object identity:

```java
assertThat(orders)
  .usingRecursiveFieldByFieldElementComparator()
  .containsExactlyInAnyOrder(expectedOrder1, expectedOrder2);

// Ignore specific fields (e.g. generated IDs or timestamps)
assertThat(orders)
  .usingRecursiveFieldByFieldElementComparatorIgnoringFields("id", "createdAt")
  .containsExactly(expectedOrder1, expectedOrder2);
```

## Map Assertions

```java
Map<String, Integer> stockByProduct = inventoryService.getStock();

assertThat(stockByProduct)
  .isNotEmpty()
  .hasSize(3)
  .containsKey("Laptop")
  .doesNotContainKey("Fax Machine")
  .containsEntry("Laptop", 10)
  .containsEntries(entry("Laptop", 10), entry("Mouse", 50));

assertThat(stockByProduct)
  .hasEntrySatisfying("Laptop", qty -> assertThat(qty).isGreaterThan(0));
```

## Array Assertions

```java
String[] roles = user.getRoles();

assertThat(roles).hasSize(2);
assertThat(roles).contains("ADMIN");
assertThat(roles).containsExactlyInAnyOrder("USER", "ADMIN");
```

## Set Assertions

```java
Set<String> tags = product.getTags();

assertThat(tags).contains("electronics", "sale");
assertThat(tags).doesNotContain("expired");
assertThat(tags).hasSizeGreaterThanOrEqualTo(1);
```

## Static Import

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.assertj.core.api.Assertions.entry;
```

## Key Points

1. **`containsExactly` vs `containsExactlyInAnyOrder`** — use the former when order matters
2. **`extracting()` before containment checks** — avoids implementing `equals()` on domain objects
3. **`filteredOn()` + `extracting()`** — compose to assert a subset of a collection precisely
4. **`satisfiesExactly()`** — use when each element needs different assertions
5. **`usingRecursiveFieldByFieldElementComparator()`** — preferred over `equals()` for DTOs and records
