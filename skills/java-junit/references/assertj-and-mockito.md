# AssertJ and Mockito patterns

All snippets compile and pass on JDK 21 (AssertJ 3.27.7, Mockito 5.23.0, JUnit 5.14.4 and 6.0.3), except where marked.

## AssertJ

Use only if the project already depends on `org.assertj:assertj-core` (or the user agrees). Import statically from `org.assertj.core.api.Assertions`.

```java
// collections
assertThat(people).hasSize(2).extracting(Person::name).containsExactly("Ann", "Bob");
assertThat(people).extracting(Person::name, Person::age)
    .containsExactlyInAnyOrder(tuple("Bob", 25), tuple("Ann", 30));
assertThat(people).filteredOn(p -> p.age() > 26).singleElement();
assertThat(people).allSatisfy(p -> assertThat(p.age()).isPositive());
assertThat(Map.of("k", 1)).containsOnly(entry("k", 1));

// object graphs (records and POJOs without equals)
assertThat(actual).usingRecursiveComparison().isEqualTo(expected);

// exceptions
assertThatThrownBy(() -> Integer.parseInt("x"))
    .isInstanceOf(NumberFormatException.class)
    .hasMessageContaining("\"x\"");
assertThatExceptionOfType(IllegalStateException.class)
    .isThrownBy(() -> service.run())
    .withMessage("boom")
    .withCauseInstanceOf(RuntimeException.class);
assertThatCode(() -> parse("1")).doesNotThrowAnyException();

// optionals
assertThat(Optional.of("x")).contains("x");
assertThat(Optional.empty()).isEmpty();
```

Prefer `containsExactly` (order matters) or `containsExactlyInAnyOrder` over `contains`, which passes with extra elements. `extracting` gives readable diffs on failure.

### Soft assertions (report all failures)

```java
SoftAssertions.assertSoftly(s -> {
    s.assertThat(result.status()).isEqualTo(200);
    s.assertThat(result.body()).contains("ok");
});
```

or per class with the JUnit extension (bundled in `assertj-core`):

```java
@ExtendWith(SoftAssertionsExtension.class)
class ResultTest {
    @InjectSoftAssertions SoftAssertions softly;   // org.assertj.core.api.junit.jupiter
    @Test void t() { softly.assertThat(1).isEqualTo(1); }
}
```

Jupiter equivalent: `assertAll(() -> ..., () -> ...)`.

AssertJ 4 was only at milestone releases when this was written; stay on 3.x unless the project already uses 4.

## Mockito

Dependency: `org.mockito:mockito-junit-jupiter` (brings `mockito-core`).

```java
@ExtendWith(MockitoExtension.class)
class OrdersTest {
    @Mock Orders.Repo repo;
    @Mock Orders.Notifier notifier;
    @Captor ArgumentCaptor<String> message;

    @Test
    void place_should_saveAndNotify() {
        var orders = new Orders(repo, notifier, FIXED_CLOCK);   // construct explicitly; prefer over @InjectMocks
        var result = orders.place("book");

        verify(repo).save(result);
        verify(notifier).send(message.capture());
        assertThat(message.getValue()).startsWith("placed book");
    }

    @Test
    void require_should_throw_when_missing() {
        when(repo.find(7L)).thenReturn(Optional.empty());
        ...
    }
}
```

- **Strictness**: `MockitoExtension` uses strict stubs. Verified: a stub that is never used fails the test with `UnnecessaryStubbingException`. Argument mismatches on a stubbed method are also reported (`PotentialStubbingProblem`). Per class/nested class opt-out: `@MockitoSettings(strictness = Strictness.LENIENT)`; per stub: `lenient().when(...)`.
- **Stubbing**: `when(x.m()).thenReturn(v)`; for `void` or to throw: `doThrow(...).when(x).m()`. Prefer returning values over verifying calls.
- **Verification**: verify side effects that are the behavior (a message sent, an entity saved). Use `verify(x, never()).m()` for "must not happen". Avoid `verifyNoMoreInteractions` as a default; it couples tests to implementation.
- **Captors**: `@Captor ArgumentCaptor<T>` or `ArgumentCaptor.forClass(T.class)`; assert on `getValue()`/`getAllValues()`.
- **Argument matchers**: if one argument uses a matcher (`any()`, `eq()`), all must.
- **Do not mock**: records/value objects, collections, `String`, types you own that are simple data, the class under test, `java.time.Clock` (use `Clock.fixed`). Prefer an in-memory fake repository over a mock when the test would otherwise stub several calls.
- **Mock only what you own at the boundary**; wrap third-party types in your own interface and mock that.

### Inline mock maker and the JDK 21+ agent warning

Mockito 5 uses the inline mock maker by default. On JDK 21+ without an agent, Mockito self-attaches and the build prints:

```
Mockito is currently self-attaching to enable the inline-mock-maker. This will no longer work in future releases of the JDK. ...
WARNING: A Java agent has been loaded dynamically (.../byte-buddy-agent-....jar)
WARNING: Dynamic loading of agents will be disallowed by default in a future release
```

For **Mockito 5.14.0+ only**, fix by registering `mockito-core` as an agent (verified: warnings gone on JDK 21). The agent entry point was introduced in [Mockito 5.14.0](https://github.com/mockito/mockito/releases/tag/v5.14.0); earlier 5.x jars lack the `Premain-Class` manifest entry, so using them with `-javaagent` aborts the test JVM.

Before applying either snippet below, check the resolved `mockito-core` version (`./mvnw dependency:tree -Dincludes=org.mockito:mockito-core` or `./gradlew dependencyInsight --dependency mockito-core --configuration testRuntimeClasspath`). Preserve the project's BOM/version-catalog management and ask before upgrading. If the version is below 5.14.0 and no upgrade is approved, do not use these snippets; follow that version's documented instrumentation setup.

Maven (`maven-dependency-plugin` `properties` goal exposes `${org.mockito:mockito-core:jar}`; keep `@{argLine}` when JaCoCo is used):

```xml
<plugin>
  <artifactId>maven-dependency-plugin</artifactId>
  <executions>
    <execution><goals><goal>properties</goal></goals></execution>
  </executions>
</plugin>
<plugin>
  <artifactId>maven-surefire-plugin</artifactId>
  <configuration>
    <argLine>@{argLine} -javaagent:${org.mockito:mockito-core:jar}</argLine>
  </configuration>
</plugin>
```

(Without JaCoCo, drop `@{argLine}`; with a literal `@{argLine}` and no JaCoCo `prepare-agent`, Maven leaves it unresolved and the JVM fails to start.) Add the same `argLine` to Failsafe if integration tests use Mockito.

Gradle (Kotlin DSL):

```kotlin
val mockitoAgent: Configuration by configurations.creating
dependencies {
    testImplementation("org.mockito:mockito-junit-jupiter:5.23.0")
    mockitoAgent("org.mockito:mockito-core:5.23.0") { isTransitive = false }
}
tasks.test { jvmArgs("-javaagent:${mockitoAgent.asPath}") }
```

Keep the two Mockito versions identical (or use a BOM/version catalog). On JDK 25, ByteBuddy may still print a `sun.misc.Unsafe` "terminally deprecated" warning; it is harmless noise from the dependency (seen with byte-buddy 1.18.3). Do not "fix" it with `--add-opens` flags unless a test actually fails.

## Parameterized and nested tests

```java
@ParameterizedTest
@NullAndEmptySource
@ValueSource(strings = {" ", "\t"})
void rejectsBlank(String item) { ... }

@ParameterizedTest(name = "sign({0}) = {1}")
@CsvSource({"-5,-1", "0,0", "9,1"})
void sign(int in, int out) { ... }

@ParameterizedTest
@MethodSource("pairs")
void viaMethodSource(int in, int out) { ... }
static Stream<Arguments> pairs() { return Stream.of(Arguments.of(-2, -1), Arguments.of(2, 1)); }
```

`@Nested` classes see the outer class's mocks and `@BeforeEach`. Maven reports each nested class as its own test class (`OrdersTest$Evens`) and the outer class may show `Tests run: 0`; that is expected, check the total.
