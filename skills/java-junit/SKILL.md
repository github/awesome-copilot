---
name: java-junit
description: 'Write, review and fix Java unit tests with JUnit 5 and JUnit 6 (Jupiter), AssertJ and Mockito: assertions, parameterized and nested tests, mocking rules, deterministic time and randomness, Surefire vs Failsafe, JaCoCo coverage, optional PIT mutation testing, and guardrails for agents (never skip or delete failing tests). Use when adding, refactoring or debugging tests in Maven or Gradle projects. Framework-neutral.'
---

# Java Testing with JUnit 5/6, AssertJ and Mockito

Framework-neutral guidance for fast, deterministic unit tests. For Spring slices use `spring-boot-testing` (if installed); for real databases/brokers in Docker use `java-testcontainers`; for failures you cannot explain, `java-debugging`.

## First: detect, don't impose

1. Read `pom.xml`/`build.gradle*`: JUnit version (`junit-jupiter`, `junit-bom`, or inherited from a Spring Boot BOM), assertion library, Mockito, Surefire/Failsafe versions, Java release.
2. Copy the conventions already in `src/test/java` (naming, assertion library, static imports, mocking style). Do not introduce AssertJ, Mockito or JaCoCo into a project that lacks them without asking.
3. Never bump the JUnit major version implicitly; upgrading is its own task (see `java-upgrade` if installed).

## JUnit 5 vs JUnit 6

| | JUnit 5 (last 5.14.x) | JUnit 6 (6.0 released; 6.1.x current) |
| --- | --- | --- |
| Java baseline | 8 | **17** (verified in the published Gradle module metadata) |
| Versioning | Platform 1.x, Jupiter 5.x, Vintage 5.x | One version number for Platform, Jupiter and Vintage |
| API | `org.junit.jupiter.api.*` | Same packages; the Jupiter tests in this skill compile and pass unchanged on 5.14.4 and 6.0.3 |
| Removed in 6.0 | | `MethodOrderer.Alphanumeric`, the deprecated two-argument `InvocationInterceptor.interceptDynamicTest(Invocation, ExtensionContext)` overload (the three-argument one remains), `junit.jupiter.tempdir.scope`, `@CsvFileSource(lineSeparator)` |
| CSV | univocity-parsers | FastCSV: stricter parsing (no characters after a closing quote); header-field options now apply to headers |
| Other | | `junit-jupiter-migrationsupport` deprecated; invalid enum-style config values now fail discovery; `@Nested` class order deterministic but non-obvious |

Source: JUnit 6.0.0 release notes (<https://docs.junit.org/6.0.0/release-notes.html>). Read the notes for the target version (<https://docs.junit.org/current/release-notes/>) and prefer them over this table. JUnit 4 tests need the Vintage engine; do not mix `org.junit.Test` and `org.junit.jupiter.api.Test` in one class.

Dependencies (same for 5 and 6; verified with Maven and Gradle): import `org.junit:junit-bom`, then declare `org.junit.jupiter:junit-jupiter` (aggregates api, params, engine) with `test` scope. Gradle 9 additionally **requires** `testRuntimeOnly("org.junit.platform:junit-platform-launcher")` (verified: without it the test executor fails with "Failed to load JUnit Platform") and `tasks.test { useJUnitPlatform() }`. Maven needs Surefire 3.x (verified with 3.6.0).

## Assertions

Match the project's library. Plain Jupiter rules: expected value first, lazy `Supplier` messages, `assertAll`, `assertThrowsExactly`, timeouts. (The separate `instructions/java-junit5-assertions.instructions.md` resource has the longer version but is not installed with this skill.) If the project uses AssertJ, prefer it for collections, strings and exceptions; patterns (soft assertions, `assertThatThrownBy`, `extracting`, `containsExactly`, `usingRecursiveComparison`) are in `references/assertj-and-mockito.md`.

- Assert on outcomes and state, not on how many times internals were called.
- Compare values; avoid bare `assertNotNull`.
- Never catch `AssertionError`/`Exception` to make a test pass.

## Mocking (Mockito)

- Mock **collaborators across a boundary** (repository, HTTP client, clock, message sender). Do **not** mock value objects, records, collections, `String`, or the class under test; use real instances or simple fakes.
- Prefer a hand-written fake over a mock when the interaction is stateful.
- Use `@ExtendWith(MockitoExtension.class)` with `@Mock`/`@InjectMocks`/`@Captor`. Strict stubs are the default there, so an unused stub fails the test (`UnnecessaryStubbingException`). Fix the test; relax with `@MockitoSettings(strictness = Strictness.LENIENT)` only for a justified shared setup.
- Mockito 5 uses the inline mock maker by default. On JDK 21+ it may self-attach and print a dynamic-agent warning. With **Mockito 5.14.0+**, register `mockito-core` as a `-javaagent` instead (setup for Maven and Gradle in `references/assertj-and-mockito.md`, verified on JDK 21 and 25). Check the resolved version first: earlier 5.x jars lack `Premain-Class` and cannot be used as the agent. Ask before upgrading; otherwise use the instrumentation setup documented for the installed version.
- Mockito 5 requires Java 11+. Its default inline mock maker does not work on GraalVM native image, where the subclass mock maker is appropriate (Mockito 5.0.0 release notes, <https://github.com/mockito/mockito/releases/tag/v5.0.0>).
- Avoid `mockStatic`/`mockConstruction`; wrap the static call behind an interface.

## Determinism

- Time: inject `java.time.Clock` (`Clock.fixed(...)`) and call `Instant.now(clock)`; avoid `Instant.now()`/`LocalDate.now()` in code under test.
- Randomness: inject a `Random`/`RandomGenerator` with a fixed seed; log the seed if generated.
- Do not depend on default locale, time zone, file encoding, network, or wall-clock sleeps. Set them explicitly (newer 6.x releases add built-in locale/time-zone/system-property extensions; check the release notes of your version, otherwise use try/finally).

## Unit vs integration tests

| | Unit (`*Test`) | Integration (`*IT`) |
| --- | --- | --- |
| Maven | Surefire, `mvn test` | Failsafe, `mvn verify` |
| Gradle | `test` task | separate `integrationTest` task (JVM Test Suite) wired into `check` |
| Speed | milliseconds, no I/O | may use Docker/DB |

Surefire defaults pick `*Test`, `Test*`, `*Tests`, `*TestCase`; Failsafe picks `*IT`, `IT*`, `*ITCase`. Failsafe needs the `integration-test` and `verify` goals bound and is run by `mvn verify`, not `mvn test`. Alternatively split by `@Tag`. For databases and brokers see `java-testcontainers`; for Spring slices see `spring-boot-testing`. Full build snippets: `references/build-setup.md`.

## Coverage and mutation testing (optional)

- JaCoCo: add only if the project uses it or the user asks. With Surefire/Failsafe use `<argLine>@{argLine} ...</argLine>` so the JaCoCo agent is not overwritten.
- Coverage is a smell detector, not a goal; never add assertion-free tests to raise a number, and do not add a coverage gate the project lacks.
- PIT (mutation testing) is slow; run it on changed classes only if the project already uses it or the user asks (see `references/build-setup.md`, which records a verified pitest-maven + JUnit 5 plugin run).

## Agent guardrails

1. **Never** delete, comment out, `@Disabled`, weaken (looser assertion, wider tolerance, swallowed exception) or skip a failing test to get green. Find the cause.
2. Decide which side is wrong, the test or the production code. If the fix changes **production behavior**, stop and ask the user first; if the test encodes an obviously stale expectation, say so and propose the change.
3. Do not add `-DskipTests`, `-Dmaven.test.skip`, `-x test` or `failIfNoTests=false` to make a build pass.
4. Do not mock the class under test or assert on mock internals to "prove" correctness.
5. Run the narrowest test first, then the full build:
   - Maven: `mvn -q -Dtest=OrdersTest test` (one method: `-Dtest='OrdersTest#place_should_saveAndNotify_when_itemValid'`), then `mvn verify`.
   - Gradle: `./gradlew test --tests 'demo.OrdersTest'`, then `./gradlew check`.
   Prefer the project wrapper (`./mvnw`, `./gradlew`) when present.
6. Flaky test: reproduce by rerunning, then remove the nondeterminism (time, order, shared state, async waits); do not add retries.
7. New code gets new tests beside the existing ones, in the same style: happy path, boundaries, error cases.

## References

- `references/assertj-and-mockito.md`: AssertJ patterns, Mockito strictness/captors/agent setup, when not to mock.
- `references/build-setup.md`: Maven and Gradle (Kotlin DSL) setups for JUnit 5/6, Failsafe split, JaCoCo, PIT.
