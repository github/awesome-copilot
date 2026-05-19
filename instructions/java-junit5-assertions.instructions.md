---
description: 'Standardizes JUnit 5 (Jupiter) assertions with best practices for performance, readability, and modern features (5.8+). Covers Supplier messages, assertAll, assertThrowsExactly, and anti-patterns.'
applyTo: ['**/*Test.java', '**/*IT.java', '**/*Steps.java', '**/*StepDefs.java']
---

# JUnit 5 — Assertions Instructions

> Applies to all Java test files using JUnit Jupiter (JUnit 5).
> **Note:** Requires JUnit Jupiter 5.8+ for `assertThrowsExactly` and `assertInstanceOf`.

---

## Table of Contents

1. Imports
2. assertEquals — Expected Value First
3. Failure Messages — Supplier vs String
4. assertAll — Group Related Assertions
5. assertThrows — Exception Testing
6. assertDoesNotThrow
7. assertTimeout
8. assertInstanceOf
9. Collections and Arrays
10. Anti-Patterns

---

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

> Import from `org.junit.jupiter.api.Assertions` — not `org.junit.Assert` (JUnit 4).

---

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

---

## 3. Failure Messages — Supplier vs String

Pass failure messages as a `Supplier<String>` when the message construction is expensive (e.g., string formatting or concatenation). For simple, constant literal messages, a plain `String` is perfectly acceptable.

```java
// ❌ BAD — expensive message constructed even when the assertion passes
assertEquals(expected, actual, "Expected %s but got %s".formatted(expected, actual));

// ✅ GOOD — evaluated only on failure (Java 17: String.formatted() inside Supplier)
assertEquals(expected, actual,
    () -> "Expected %s but got %s".formatted(expected, actual));

// ✅ GOOD — simple, constant string literal (zero overhead)
assertTrue(isActive, "User account must be active");
```

---

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

---

## 5. assertThrows — Exception Testing

`assertThrows` returns the exception — capture it to verify the message or cause.

```java
// ❌ BAD — JUnit 4 style
@Test(expected = ArithmeticException.class)
void divideByZero() { calculator.divide(1, 0); }

// ✅ GOOD
@Test
void divideByZero() {
    ArithmeticException ex = assertThrows(
        ArithmeticException.class,
        () -> calculator.divide(1, 0)
    );
    assertEquals("/ by zero", ex.getMessage());
}
```

> The executable must contain **only** the call expected to throw — no surrounding code.

**`assertThrows` vs `assertThrowsExactly`:**

```java
// assertThrows — passes if the thrown type IS-A the expected type (subclasses accepted)
assertThrows(RuntimeException.class, () -> {
    throw new IllegalArgumentException("msg");  // ✅ passes — IAE is a RuntimeException
});

// assertThrowsExactly — passes only when the type matches EXACTLY (no subclasses)
assertThrowsExactly(IllegalArgumentException.class, () -> {
    throw new IllegalArgumentException("msg");  // ✅ passes
});
assertThrowsExactly(RuntimeException.class, () -> {
    throw new IllegalArgumentException("msg");  // ❌ fails — IAE is not exactly RuntimeException
});
```

> Use `assertThrowsExactly` when the precise exception type is part of the API contract and subclass matches must be rejected.

---

## 6. assertDoesNotThrow

Use when the absence of an exception is the explicit contract.

```java
// ✅ GOOD — captures the return value too
int result = assertDoesNotThrow(() -> calculator.divide(10, 2));
assertEquals(5, result);
```

---

## 7. assertTimeout

```java
// ✅ GOOD — assertTimeout waits for completion, then checks duration
assertTimeout(Duration.ofSeconds(1), () -> service.process(data));

// ✅ assertTimeoutPreemptively — attempts to abort execution at the deadline
// ⚠️  Runs in a separate thread; @Transactional / ThreadLocal state does NOT propagate.
// ⚠️  Uses Thread.interrupt() on timeout: if the code catches and ignores InterruptedException,
//     or performs uninterruptible I/O, it may continue running in the background, leaving half-finished side effects.
assertTimeoutPreemptively(Duration.ofMillis(500), () -> service.process(data));
```

---

## 8. assertInstanceOf

Prefer `assertInstanceOf` over `assertTrue` + `instanceof`. It returns the cast reference.

```java
// ❌ BAD — no useful failure message; requires a separate cast
assertTrue(result instanceof SuccessResponse);

// ✅ GOOD
SuccessResponse response = assertInstanceOf(SuccessResponse.class, result);
assertEquals(200, response.statusCode());
```

---

## 9. Collections and Arrays

Use the dedicated assertions for collections and arrays to get deep comparison and informative failure messages.

```java
// ⚠️ LESS INFORMATIVE — valid for testing List.equals() semantics, but provides no detailed diff on failure
assertEquals(expectedList, actualList);

// ✅ GOOD — lists order matters; provides a clear element-by-element diff on failure
assertIterableEquals(expectedList, actualList);

// ✅ GOOD — lists order does not matter, AND elements have a natural semantic ordering
// (Note: For complex unordered comparisons, consider AssertJ or Hamcrest)
assertEquals(
    expectedList.stream().sorted().toList(),
    actualList.stream().sorted().toList()
);

// ✅ GOOD — array comparison
assertArrayEquals(expectedArray, actualArray);
```

---

## 10. Anti-Patterns

```java
// ❌ Team Convention Violation: Custom failure messages deviating from the standard format
// (JUnit doesn't enforce a format, but standardizing helps log parsing and readability)
assertEquals(expected, actual, "The values do not match");
// ✅ assertEquals(expected, actual, () -> "Expected %s but was %s".formatted(expected, actual));

// ❌ assertTrue for ordinary value comparisons — failure message shows no values
assertTrue(result == 42);
// ✅ assertEquals(42, result)
// ✅ GOOD exception: use assertTrue(a.equals(b)) only when explicitly testing an equals() implementation.

// ❌ assertNotNull as a substitute for a real assertion
assertNotNull(service.process(input));
// ✅ assertEquals(expected, service.process(input))

// ❌ Catching AssertionError to suppress a failure
try { assertEquals(a, b); } catch (AssertionError ignored) { }

// ❌ JUnit 4 assertion class in a JUnit 5 project
import static org.junit.Assert.assertEquals;
// ✅ import static org.junit.jupiter.api.Assertions.assertEquals;
```

---

## Quick Reference

| Assertion                                     | Use When                                          |
| --------------------------------------------- | ------------------------------------------------- |
| `assertEquals(expected, actual)`              | Values must be equal — expected **first**         |
| `assertNotEquals(unexpected, actual)`         | Value must differ from a known result             |
| `assertTrue` / `assertFalse`                  | Boolean condition                                 |
| `assertNull` / `assertNotNull`                | Reference presence                                |
| `assertAll("label", executable...)`           | Multiple properties of the same result            |
| `assertThrows(Type.class, executable)`        | Exception must be thrown (subclasses accepted)    |
| `assertThrowsExactly(Type.class, executable)` | Exception type must match exactly — no subclasses |
| `assertDoesNotThrow(executable)`              | Non-exceptional path is the contract              |
| `assertTimeout(Duration, executable)`         | Must complete within a deadline                   |
| `assertTimeoutPreemptively(...)`              | Hard-abort at deadline (separate thread)          |
| `assertInstanceOf(Type.class, obj)`           | Type check — returns cast reference               |
| `assertSame` / `assertNotSame`                | Reference identity                                |
| `assertArrayEquals`                           | Array contents                                    |
| `assertIterableEquals`                        | Iterable contents in order                        |