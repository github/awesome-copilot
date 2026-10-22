# Modern Java idioms by release

Snippets in this file compiled and ran on JDK 21 and 25 (`-Xlint:all -Werror`) unless marked. Use a feature only if the project's configured release supports it; do not raise the release to use one.

## Records, sealed types, pattern matching (17 / 21)

```java
public sealed interface Shape permits Circle, Rect, Group {}

public record Circle(double r) implements Shape {
    public Circle {                                   // compact constructor: validate
        if (r <= 0) throw new IllegalArgumentException("r must be > 0");
    }
}
public record Rect(double w, double h) implements Shape {}
public record Group(List<Shape> items) implements Shape {
    public Group { items = List.copyOf(items); }      // defensive immutable copy
}

static double area(Shape s) {
    return switch (s) {                                // exhaustive: no default, compiler checks
        case Circle(double r) -> Math.PI * r * r;     // record pattern (21)
        case Rect(double w, double h) -> w * h;
        case Group(List<Shape> items) -> items.stream().mapToDouble(Main::area).sum();
    };
}

static String describe(Object o) {
    return switch (o) {
        case null -> "null";
        case Integer i when i > 10 -> "big int " + i; // guard
        case Integer i -> "int " + i;
        case String str -> "string " + str.length();
        default -> "other";
    };
}
```

- Records are shallowly immutable: copy mutable components (`List.copyOf`). They are good DTOs/value types, not JPA entities (see `java-hibernate-jpa`).
- Prefer a sealed hierarchy and an exhaustive `switch` without `default`, so adding a subtype breaks compilation where handling is missing.
- Pre-21 (17): `if (o instanceof String s && !s.isBlank()) {...}` and arrow-form switch expressions work; `case Integer i ->` patterns in `switch` do not.

## Text blocks (15)

```java
String json = """
    {
      "name": "demo"
    }
    """;
```

Indentation is stripped relative to the closing delimiter; use `.formatted(...)` for values; never build SQL/JSON by concatenating untrusted input.

## Virtual threads (21, final)

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<Integer>> futures = new ArrayList<>();
    for (int i = 0; i < 1_000; i++) {
        int n = i;
        futures.add(executor.submit(() -> { Thread.sleep(Duration.ofMillis(10)); return n; }));
    }
    for (var f : futures) f.get();
}
Thread.ofVirtual().name("worker-", 0).start(task);   // single thread
```

Verified: 1,000 tasks, each sleeping 10 ms, run through `newVirtualThreadPerTaskExecutor` on JDK 21 and 25; `Thread.currentThread().isVirtual()` is true inside tasks.

- Use for blocking I/O workloads (HTTP, JDBC); no benefit for CPU-bound work.
- Do not pool them or cache them; create one per task. Limit concurrency to a downstream resource with a `Semaphore`, not a pool size.
- Avoid heavy `ThreadLocal` state per task. On JDK 21-23 a virtual thread blocked inside `synchronized` pins its carrier; JEP 491 (JDK 24) removes most of this pinning. Use `ReentrantLock` on 21 for long blocking critical sections.
- Frameworks may switch to virtual threads by configuration (e.g. a Spring Boot property); that is framework territory, not this skill.

## Structured concurrency and scoped values

- `ScopedValue`: preview on 21, **final in 25** (verified: compiles and runs on 25 without `--enable-preview`, rejected on 21 as a preview API).
- `StructuredTaskScope`: **preview** on 25 and on 27 (verified: "is a preview API and is disabled by default"). Its API changed between 21 and 25 (25 uses `StructuredTaskScope.open()`). Do not use without explicit user approval to enable `--enable-preview` for compile and run; Maven needs `<compilerArgs>--enable-preview</compilerArgs>` and Surefire `argLine`.

## SequencedCollection (21)

```java
static <T> Optional<T> last(SequencedCollection<T> c) {
    return c.isEmpty() ? Optional.empty() : Optional.ofNullable(c.getLast()); // Null-permitting collections
}
```

`getFirst/getLast/addFirst/removeLast/reversed()` are available on `List`, `Deque`, `LinkedHashSet`, `SortedSet`; `getFirst()` on an empty list throws `NoSuchElementException`. `SequencedCollection` implementations may permit null elements (for example, `LinkedList` and `LinkedHashSet`), so use `Optional.ofNullable` when the result can be null.

## Later features

| Feature | Status (verified on JDK 25 / 27 unless noted) |
| --- | --- |
| Unnamed variables `_` | Final in 22; on 21 the compiler says "unnamed variables are a preview feature" |
| `Stream.gather` / `Gatherers.windowFixed(2)` | Works on 25 and 27; not present on 21 |
| Instance `void main()` (compact source file) | Works without flags on 25 and 27 |
| `import module java.base;` | Works without flags on 25 and 27 |
| `ScopedValue` | Works without flags on 25 and 27 |
| `StructuredTaskScope` | Preview on 25 and 27 |

Verify the status of any other feature with `java <File>.java` on the target JDK before recommending it; JEP statuses change every six months.

## Collection and API pitfalls

- `stream().toList()` (16+) returns an unmodifiable list; `Collectors.toList()` makes no guarantee.
- `Map.of`/`List.of` reject nulls and `Map.of` has undefined iteration order; use `LinkedHashMap` when order matters.
- Do not use `finalize`, `Thread.stop`, `new Integer(...)`, `Date`/`Calendar`, `SecurityManager`.
