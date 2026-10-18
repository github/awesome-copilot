# Java 21 to Java 25 Upgrade Guide

These instructions help GitHub Copilot assist developers in upgrading Java projects from JDK 21 to JDK 25, focusing on new language features, API changes, and best practices.

## Language Features and API Changes in JDK 22-25

### Pattern Matching Enhancements (JEP 455/488/507 - Preview in 23-25, still preview in 25)

**Primitive Types in Patterns, instanceof, and switch**

When working with pattern matching:
- Suggest using primitive type patterns in switch expressions and instanceof checks
- Example upgrade from traditional switch:
```java
// Old approach (Java 21)
String s = switch (x.getStatus()) {
    case 0 -> "okay";
    case 1 -> "warning";
    case 2 -> "error";
    default -> "unknown status: " + x.getStatus();
};

// New approach (Java 25 Preview)
String s = switch (x.getStatus()) {
    case 0 -> "okay";
    case 1 -> "warning";
    case 2 -> "error";
    case int i -> "unknown status: " + i;
};
```

- Enable preview features with `--enable-preview` flag
- Suggest guard patterns for more complex conditions:
```java
switch (x.getYearlyFlights()) {
    case 0 -> noCard();
    case int i when i >= 100 -> issueGoldCard();
    case int i -> issueBasicCard(i); // handle 1-99 range
}
```

### Class-File API (JEP 466/484 - Second Preview in 23, Standard in 24)

**Replacing ASM with Standard API**

When detecting bytecode manipulation or class file processing:
- Suggest migrating from ASM library to the standard Class-File API
- Use `java.lang.classfile` package instead of `org.objectweb.asm`
- Example migration pattern:
```java
// Old ASM approach
ClassReader reader = new ClassReader(classBytes);
ClassWriter writer = new ClassWriter(reader, 0);
// ... ASM manipulation

// New Class-File API approach
ClassModel classModel = ClassFile.of().parse(classBytes);
byte[] newBytes = ClassFile.of().transformClass(classModel,
    ClassTransform.transformingMethods(methodTransform));
```

### Markdown Documentation Comments (JEP 467 - Standard in 23)

**JavaDoc Modernization**

When working with JavaDoc comments:
- Suggest converting HTML-heavy JavaDoc to Markdown syntax
- Use `///` for Markdown documentation comments
- Example conversion:
```java
// Old HTML JavaDoc
/**
 * Returns the <b>absolute</b> value of an {@code int} value.
 * <p>
 * If the argument is not negative, return the argument.
 * If the argument is negative, return the negation of the argument.
 * 
 * @param a the argument whose absolute value is to be determined
 * @return the absolute value of the argument
 */

// New Markdown JavaDoc  
/// Returns the **absolute** value of an `int` value.
///
/// If the argument is not negative, return the argument.
/// If the argument is negative, return the negation of the argument.
/// 
/// @param a the argument whose absolute value is to be determined
/// @return the absolute value of the argument
```

### Derived Record Creation (JEP 468 - Not delivered)

**Record Enhancement**

JEP 468 (`with` expressions for records) did not ship in JDK 22-25 and is not available, even with `--enable-preview`.
- Keep using explicit `withX` copy methods (or a copy-constructor style) until the feature is delivered
- Example pattern:
```java
public record Person(String name, int age, String email) {
    public Person withAge(int newAge) {
        return new Person(name, newAge, email);
    }
}

Person updated = person.withAge(30);
```

### Stream Gatherers (JEP 473/485 - Second Preview in 23, Standard in 24)

**Enhanced Stream Processing**

When working with complex stream operations:
- Suggest using `Stream.gather()` for custom intermediate operations
- Import `java.util.stream.Gatherers` for built-in gatherers
- Example usage:
```java
// Custom windowing operations
List<List<String>> windows = stream
    .gather(Gatherers.windowSliding(3))
    .toList();

// Running sum: fold takes an initial-value supplier and emits a single result
Optional<Integer> total = numbers.stream()
    .gather(Gatherers.fold(() -> 0, (sum, element) -> sum + element))
    .findFirst();

// Running totals for every element
List<Integer> running = numbers.stream()
    .gather(Gatherers.scan(() -> 0, (sum, element) -> sum + element))
    .toList();
```

## Migration Warnings and Deprecations

### sun.misc.Unsafe Memory Access Methods (JEP 471 - Deprecated in 23)

When detecting `sun.misc.Unsafe` usage:
- Warn about deprecated memory-access methods
- Suggest migration to standard alternatives:
```java
// Deprecated: sun.misc.Unsafe memory access
Unsafe unsafe = Unsafe.getUnsafe();
unsafe.getInt(object, offset);

// Preferred: VarHandle API
VarHandle vh = MethodHandles.lookup()
    .findVarHandle(MyClass.class, "fieldName", int.class);
int value = (int) vh.get(object);

// Or for off-heap: Foreign Function & Memory API
MemorySegment segment = MemorySegment.ofArray(new int[10]);
int value = segment.get(ValueLayout.JAVA_INT, offset);
```

### JNI Usage Warnings (JEP 472 - Warnings in 24)

When detecting JNI usage:
- Warn about upcoming restrictions on JNI usage
- Suggest adding `--enable-native-access` flag for applications using JNI
- Recommend migration to Foreign Function & Memory API where possible
- Grant native access explicitly: `--enable-native-access=ALL-UNNAMED` (classpath) or `--enable-native-access=com.example.app` (module), or `Enable-Native-Access: ALL-UNNAMED` in an executable JAR manifest

## Garbage Collection Updates

### ZGC Generational Mode (JEP 474 - Default in 23, JEP 490 - Non-generational removed in 24)

When configuring garbage collection:
- ZGC uses generational mode by default since JDK 23, and non-generational mode was removed in JDK 24
- Remove `-XX:-ZGenerational` from JVM flags (and `-XX:+ZGenerational`, which is now redundant):
```bash
# Generational mode is the only mode in JDK 24+ (non-generational ZGC was removed)
-XX:+UseZGC

# -XX:-ZGenerational / -XX:+ZGenerational are obsolete; remove them from launch scripts
```

### G1 Improvements (JEP 475 - Implemented in 24)

When using G1GC:
- No code changes required - internal JVM optimization
- May see improved compilation performance with C2 compiler

## Vector API (JEP 469/508 - Still incubating in 25)

When working with numerical computations:
- Suggest Vector API for SIMD operations (still incubating)
- Add `--add-modules jdk.incubator.vector`
- Example usage:
```java
import jdk.incubator.vector.*;

// Traditional scalar computation
for (int i = 0; i < a.length; i++) {
    c[i] = a[i] + b[i];
}

// Vectorized computation
var species = IntVector.SPECIES_PREFERRED;
int i = 0;
for (; i < species.loopBound(a.length); i += species.length()) {
    var va = IntVector.fromArray(species, a, i);
    var vb = IntVector.fromArray(species, b, i);
    va.add(vb).intoArray(c, i);
}
for (; i < a.length; i++) { // scalar tail
    c[i] = a[i] + b[i];
}
```

## Compilation and Build Configuration

### Preview Features

For projects using preview features:
- Add `--enable-preview` to compiler arguments
- Add `--enable-preview` to runtime arguments
- Maven configuration:
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <release>25</release>
        <compilerArgs>
            <arg>--enable-preview</arg>
        </compilerArgs>
    </configuration>
</plugin>

<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <argLine>--enable-preview</argLine>
    </configuration>
</plugin>
```

- Gradle configuration:
```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

tasks.withType<JavaCompile> {
    options.compilerArgs.add("--enable-preview")
}

tasks.withType<Test> {
    jvmArgs("--enable-preview")
}
```

## Migration Strategy

### Step-by-Step Upgrade Process

1. **Update Build Tools**: Ensure Maven/Gradle supports JDK 25
2. **Update Dependencies**: Check for JDK 25 compatibility
3. **Handle Warnings**: Address deprecation warnings from JEPs 471/472
4. **Enable Preview Features**: If using pattern matching or other preview features
5. **Test Thoroughly**: Especially for applications using JNI or sun.misc.Unsafe
6. **Performance Testing**: Verify GC behavior with new ZGC defaults

### Code Review Checklist

When reviewing code for Java 25 upgrade:
- [ ] Replace ASM usage with Class-File API
- [ ] Convert complex HTML JavaDoc to Markdown
- [ ] Use primitive patterns in switch expressions where applicable
- [ ] Replace sun.misc.Unsafe with VarHandle or FFM API
- [ ] Add native-access permissions for JNI usage
- [ ] Use Stream gatherers for complex stream operations
- [ ] Update build configuration for preview features

### Testing Considerations

- Test with `--enable-preview` flag for preview features
- Verify JNI applications work with native access warnings
- Performance test with new ZGC generational mode
- Validate JavaDoc generation with Markdown comments

## Common Pitfalls

1. **Preview Feature Dependencies**: Don't use preview features in library code without clear documentation
2. **Native Access**: Applications using JNI directly or indirectly may need `--enable-native-access` configuration
3. **Unsafe Migration**: Don't delay migrating from sun.misc.Unsafe - deprecation warnings indicate future removal
4. **Pattern Matching Scope**: Primitive patterns work with all primitive types, not just int
5. **Record Enhancement**: Derived record creation (`with` expressions) is not available in any JDK 25 mode; use explicit `withX` copy methods

## Performance Considerations

- ZGC generational mode may improve performance for most workloads
- Class-File API reduces ASM-related overhead
- Stream gatherers provide better performance for complex stream operations
- G1GC improvements reduce JIT compilation overhead

Remember to test thoroughly in staging environments before deploying Java 25 upgrades to production systems.
