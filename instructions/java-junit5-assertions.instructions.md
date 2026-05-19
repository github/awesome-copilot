---
description: "Standardizes JUnit 5 (Jupiter) assertions with best practices for performance, readability, and modern features (5.8+). Covers Supplier messages, assertAll, assertThrowsExactly, and performance-critical timeouts."
applyTo: "**/*Test.java, **/*IT.java, **/*Steps.java, **/*StepDefs.java"
---

# JUnit 5 Assertions Best Practices

Follow these best practices when writing, reviewing, or refactoring Java test code with JUnit Jupiter (JUnit 5). These rules focus on test accuracy, performance (lazy evaluation), and leveraging modern Jupiter features.

## 1. Imports

Prefer static imports for assertions to reduce boilerplate. Unless your team conventions dictate otherwise, prefer explicit imports over wildcard (`*`) imports.

```java
// ❌ BAD — verbose and clutters the test method
Assertions.assertEquals(expected, actual);

// ❌ BAD — wildcard import (unless standard in your team)
import static org.junit.jupiter.api.Assertions.*;

// ✅ GOOD — explicit static import
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

assertEquals(expected, actual);
```

> **Best for**: Improving readability and keeping test methods focused on logic. Always import from `org.junit.jupiter.api.Assertions`.

## 2. assertEquals — Expected Value First

`expected` is always the **first** argument, `actual` is always **second**.

```java
// ❌ BAD — swapped; failure message is misleading
assertEquals(calculator.add(1, 1), 2);

// ✅ GOOD
assertEquals(2, calculator.add(1, 1));

// ✅ GOOD — floating point: always provide a delta
assertEquals(0.3, 0.1 + 0.2, 1e-9);
```

> **Best for**: Ensuring failure logs correctly report "Expected [X] but was [Y]".

## 3. Failure Messages — Supplier vs String

Pass failure messages as a `Supplier<String>` when the message construction is expensive (e.g., string formatting or complex object inspection).

```java
// ❌ BAD — expensive message constructed even when the assertion passes
assertEquals(expected, actual, "Expected %s but got %s".formatted(expected, actual));

// ✅ GOOD — evaluated only on failure (Lazy evaluation)
assertEquals(expected, actual,
    () -> "Expected %s but got %s".formatted(expected, actual));

// ✅ GOOD — simple, constant string literal (zero overhead)
assertTrue(isActive, "User account must be active");
```

> **Best for**: Performance-critical test suites and complex diagnostic messages.

## 4. assertAll — Group Related Assertions

Use `assertAll` when checking multiple properties of the same result. All assertions run even if earlier ones fail.

```java
// ❌ BAD — stops at first failure; other properties go unchecked
assertEquals("Jane", person.firstName());
assertEquals("Doe",  person.lastName());

// ✅ GOOD
assertAll("person",
    () -> assertEquals("Jane", person.firstName()),
    () -> assertEquals("Doe",  person.lastName()),
    () -> assertEquals(30,     person.age())
);
```

> **Best for**: Comprehensive object state verification and avoiding "partial failure" ambiguity.

## 5. Exception Testing — assertThrows vs assertThrowsExactly

`assertThrows` returns the exception for further verification. Use `assertThrowsExactly` for strict type matching.

```java
// ✅ assertThrows — passes if thrown type IS-A expected type (subclasses accepted)
ArithmeticException ex = assertThrows(
    ArithmeticException.class,
    () -> calculator.divide(1, 0)
);
assertEquals("/ by zero", ex.getMessage());

// ✅ assertThrowsExactly — passes ONLY if type matches EXACTLY (JUnit 5.8+)
assertThrowsExactly(IllegalArgumentException.class, () -> {
    throw new IllegalArgumentException("invalid");
});
```

> **Best for**: `assertThrows` for general hierarchy testing; `assertThrowsExactly` when the precise implementation class is part of the API contract.

## 6. assertDoesNotThrow

Use when the absence of an exception is the explicit contract being tested.

```java
// ✅ GOOD — captures and returns the result for further assertions
int result = assertDoesNotThrow(() -> service.calculate(data));
assertEquals(100, result);
```

> **Best for**: Explicitly documenting that a specific edge case should not trigger an error.

## 7. Performance & Deadlines — assertTimeout

Use `assertTimeout` to ensure execution completes within a limit. Use `assertTimeoutPreemptively` only when hard-abortion is required.

```java
// ✅ assertTimeout — waits for completion, then checks duration
assertTimeout(Duration.ofSeconds(1), () -> service.heavyTask());

// ⚠️ assertTimeoutPreemptively — hard-aborts at deadline (Separate thread)
// Warning: ThreadLocal state (@Transactional) does NOT propagate.
assertTimeoutPreemptively(Duration.ofMillis(500), () -> service.fastTask());
```

> **Best for**: SLA verification and preventing hanging tests in CI/CD pipelines.

## 8. Type Safety — assertInstanceOf

Prefer `assertInstanceOf` (JUnit 5.8+) over `assertTrue` + `instanceof` to get automatic casting.

```java
// ❌ BAD — requires manual cast after assertion
assertTrue(result instanceof SuccessResponse);

// ✅ GOOD — returns the casted object
SuccessResponse resp = assertInstanceOf(SuccessResponse.class, result);
assertEquals(200, resp.statusCode());
```

> **Best for**: Testing polymorphic results and reducing boilerplate casting.

## 9. Collections and Arrays

Use dedicated assertions for deep comparison and informative diffs.

```java
// ✅ assertIterableEquals — element-by-element deep diff on failure
assertIterableEquals(expectedList, actualList);

// ✅ assertArrayEquals — deep comparison for arrays
assertArrayEquals(expectedArray, actualArray);
```

> **Best for**: Verifying list order and complex data structure contents.

## 10. Anti-Patterns

- **Misusing `assertTrue` for Equality:** Do not use `assertTrue(result == 42)`. Use `assertEquals(42, result)` to see both values in logs.
- **Substituting `assertNotNull` for real checks:** Don't just check for null if you can check the value. `assertEquals(expected, result)` is always better than `assertNotNull(result)`.
- **Suppressing Failures:** Never catch `AssertionError` to hide a failure.
- **Legacy Imports:** Do not mix `org.junit.Assert` (JUnit 4) with JUnit 5 tests.
