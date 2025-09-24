---
applyTo: ["*"]
description: "Comprehensive best practices for adopting new Java 17 features since the release of Java 11."
---

# Java 11 to Java 17 Upgrade Guide

## Project Context

This guide provides comprehensive GitHub Copilot instructions for upgrading Java projects from JDK 11 to JDK 17, covering major language features, API changes, and migration patterns based on 47 JEPs integrated between these versions.

## Language Features and API Changes

### JEP 395: Records (Java 16)

**Migration Pattern**: Convert data classes to records

```java
// Old: Traditional data class
public class Person {
    private final String name;
    private final int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String name() { return name; }
    public int age() { return age; }

    @Override
    public boolean equals(Object obj) { /* boilerplate */ }
    @Override
    public int hashCode() { /* boilerplate */ }
    @Override
    public String toString() { /* boilerplate */ }
}

// New: Record (Java 16+)
public record Person(String name, int age) {
    // Compact constructor for validation
    public Person {
        if (age < 0) throw new IllegalArgumentException("Age cannot be negative");
    }

    // Custom methods can be added
    public boolean isAdult() {
        return age >= 18;
    }
}
```

### JEP 409: Sealed Classes (Java 17)

**Migration Pattern**: Use sealed classes for restricted inheritance

```java
// New: Sealed class hierarchy
public sealed class Shape
    permits Circle, Rectangle, Triangle {

    public abstract double area();
}

public final class Circle extends Shape {
    private final double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}

public final class Rectangle extends Shape {
    private final double width, height;

    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }

    @Override
    public double area() {
        return width * height;
    }
}

public non-sealed class Triangle extends Shape {
    // Non-sealed allows further inheritance
    private final double base, height;

    public Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }

    @Override
    public double area() {
        return 0.5 * base * height;
    }
}
```

### JEP 394: Pattern Matching for instanceof (Java 16)

**Migration Pattern**: Simplify instanceof checks

```java
// Old: Traditional instanceof with casting
public String processObject(Object obj) {
    if (obj instanceof String) {
        String str = (String) obj;
        return str.toUpperCase();
    } else if (obj instanceof Integer) {
        Integer num = (Integer) obj;
        return "Number: " + num;
    } else if (obj instanceof List<?>) {
        List<?> list = (List<?>) obj;
        return "List with " + list.size() + " elements";
    }
    return "Unknown type";
}

// New: Pattern matching for instanceof (Java 16+)
public String processObject(Object obj) {
    if (obj instanceof String str) {
        return str.toUpperCase();
    } else if (obj instanceof Integer num) {
        return "Number: " + num;
    } else if (obj instanceof List<?> list) {
        return "List with " + list.size() + " elements";
    }
    return "Unknown type";
}

// Works great with sealed classes
public String describeShape(Shape shape) {
    if (shape instanceof Circle circle) {
        return "Circle with radius " + circle.radius();
    } else if (shape instanceof Rectangle rect) {
        return "Rectangle " + rect.width() + "x" + rect.height();
    } else if (shape instanceof Triangle triangle) {
        return "Triangle with base " + triangle.base();
    }
    return "Unknown shape";
}
```

### JEP 361: Switch Expressions (Java 14)

**Migration Pattern**: Convert switch statements to expressions

```java
// Old: Traditional switch statement
public String getDayType(DayOfWeek day) {
    String result;
    switch (day) {
        case MONDAY:
        case TUESDAY:
        case WEDNESDAY:
        case THURSDAY:
        case FRIDAY:
            result = "Workday";
            break;
        case SATURDAY:
        case SUNDAY:
            result = "Weekend";
            break;
        default:
            throw new IllegalArgumentException("Unknown day: " + day);
    }
    return result;
}

// New: Switch expression (Java 14+)
public String getDayType(DayOfWeek day) {
    return switch (day) {
        case MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY -> "Workday";
        case SATURDAY, SUNDAY -> "Weekend";
    };
}

// With yield for complex logic
public int calculateScore(Grade grade) {
    return switch (grade) {
        case A -> 100;
        case B -> 85;
        case C -> 70;
        case D -> {
            System.out.println("Consider improvement");
            yield 55;
        }
        case F -> {
            System.out.println("Needs retake");
            yield 0;
        }
    };
}
```

### JEP 406: Pattern Matching for switch (Preview in Java 17)

**Migration Pattern**: Enhanced switch with patterns (Preview feature)

```java
// Requires --enable-preview flag
public String formatValue(Object obj) {
    return switch (obj) {
        case String s -> "String: " + s;
        case Integer i -> "Integer: " + i;
        case null -> "null value";
        case default -> "Unknown: " + obj.getClass().getSimpleName();
    };
}

// With guarded patterns
public String categorizeNumber(Object obj) {
    return switch (obj) {
        case Integer i when i < 0 -> "Negative integer";
        case Integer i when i == 0 -> "Zero";
        case Integer i when i > 0 -> "Positive integer";
        case Double d when d.isNaN() -> "Not a number";
        case Number n -> "Other number: " + n;
        case null -> "null";
        case default -> "Not a number";
    };
}
```

### JEP 378: Text Blocks (Java 15)

**Migration Pattern**: Use text blocks for multi-line strings

```java
// Old: Concatenated strings
String html = "<html>\n" +
              "  <body>\n" +
              "    <h1>Hello World</h1>\n" +
              "    <p>Welcome to Java 17!</p>\n" +
              "  </body>\n" +
              "</html>";

String sql = "SELECT p.id, p.name, p.email, " +
             "       a.street, a.city, a.state " +
             "FROM person p " +
             "JOIN address a ON p.address_id = a.id " +
             "WHERE p.active = true " +
             "ORDER BY p.name";

// New: Text blocks (Java 15+)
String html = """
              <html>
                <body>
                  <h1>Hello World</h1>
                  <p>Welcome to Java 17!</p>
                </body>
              </html>
              """;

String sql = """
             SELECT p.id, p.name, p.email,
                    a.street, a.city, a.state
             FROM person p
             JOIN address a ON p.address_id = a.id
             WHERE p.active = true
             ORDER BY p.name
             """;

// With string interpolation methods
String json = """
              {
                "name": "%s",
                "age": %d,
                "city": "%s"
              }
              """.formatted(name, age, city);
```

### JEP 358: Helpful NullPointerExceptions (Java 14)

**Migration Guidance**: Better NPE debugging (enabled by default in Java 17)

```java
// Old NPE message: "Exception in thread 'main' java.lang.NullPointerException"
// New NPE message shows exactly what was null:
// "Cannot invoke 'String.length()' because the return value of 'Person.getName()' is null"

public class PersonProcessor {
    public void processPersons(List<Person> persons) {
        // This will show exactly which person.getName() returned null
        persons.stream()
            .mapToInt(person -> person.getName().length())  // Clear NPE if getName() returns null
            .sum();
    }

    // Better error messages help with complex expressions
    public void complexExample(Map<String, List<Person>> groups) {
        // NPE will show exactly which part of the chain is null
        int totalNameLength = groups.get("admins")
                                  .get(0)
                                  .getName()
                                  .length();
    }
}
```

### JEP 371: Hidden Classes (Java 15)

**Migration Pattern**: Use for framework and proxy generation

```java
// For frameworks creating dynamic proxies
public class DynamicProxyExample {
    public static <T> T createProxy(Class<T> interfaceClass, InvocationHandler handler) {
        // Hidden classes provide better encapsulation for dynamically generated classes
        MethodHandles.Lookup lookup = MethodHandles.lookup();

        // Framework code would use hidden classes for better isolation
        // This is typically handled by frameworks, not application code
        return interfaceClass.cast(
            Proxy.newProxyInstance(
                interfaceClass.getClassLoader(),
                new Class<?>[]{interfaceClass},
                handler
            )
        );
    }
}
```

### JEP 334: JVM Constants API (Java 12)

**Migration Pattern**: Use for compile-time constants

```java
import java.lang.constant.*;

// For advanced metaprogramming and tooling
public class ConstantExample {
    // Use dynamic constants for computed values
    public static final DynamicConstantDesc<String> COMPUTED_CONSTANT =
        DynamicConstantDesc.of(
            ConstantDescs.BSM_INVOKE,
            "computeValue",
            ConstantDescs.CD_String
        );

    // Primarily used by compiler and framework developers
    public static String computeValue() {
        return "Computed at runtime, cached as constant";
    }
}
```

### JEP 415: Context-Specific Deserialization Filters (Java 17)

**Migration Pattern**: Enhanced security for object deserialization

```java
import java.io.*;

public class SecureDeserialization {
    // Set up deserialization filters for security
    public static void setupSerializationFilters() {
        // Global filter
        ObjectInputFilter globalFilter = ObjectInputFilter.Config.createFilter(
            "java.base/*;java.util.*;!*"
        );
        ObjectInputFilter.Config.setSerialFilter(globalFilter);
    }

    public <T> T deserializeSecurely(byte[] data, Class<T> expectedType) throws IOException, ClassNotFoundException {
        try (ByteArrayInputStream bis = new ByteArrayInputStream(data);
             ObjectInputStream ois = new ObjectInputStream(bis)) {

            // Context-specific filter
            ObjectInputFilter contextFilter = ObjectInputFilter.Config.createFilter(
                expectedType.getName() + ";java.lang.*;!*"
            );
            ois.setObjectInputFilter(contextFilter);

            return expectedType.cast(ois.readObject());
        }
    }
}
```

### JEP 356: Enhanced Pseudo-Random Number Generators (Java 17)

**Migration Pattern**: Use new random generator interfaces

```java
import java.util.random.*;

// Old: Limited Random class
Random oldRandom = new Random();
int oldValue = oldRandom.nextInt(100);

// New: Enhanced random generators (Java 17+)
RandomGenerator generator = RandomGeneratorFactory
    .of("Xoshiro256PlusPlus")
    .create(System.nanoTime());

RandomGenerator.SplittableGenerator splittableGenerator =
    RandomGeneratorFactory.of("L64X128MixRandom").create();

// Better for parallel processing
splittableGenerator.splits(4)
    .parallel()
    .mapToInt(rng -> rng.nextInt(1000))
    .forEach(System.out::println);

// Streamable random values
generator.ints(10, 1, 101)
    .forEach(System.out::println);
```

## I/O and Networking Improvements

### JEP 380: Unix-Domain Socket Channels (Java 16)

**Migration Pattern**: Use Unix domain sockets for local IPC

```java
import java.net.UnixDomainSocketAddress;
import java.nio.channels.*;

// Old: TCP sockets for local communication
// ServerSocketChannel server = ServerSocketChannel.open();
// server.bind(new InetSocketAddress("localhost", 8080));

// New: Unix domain sockets (Java 16+)
public class UnixSocketExample {
    public void createUnixDomainServer() throws IOException {
        Path socketPath = Path.of("/tmp/my-app.socket");
        UnixDomainSocketAddress address = UnixDomainSocketAddress.of(socketPath);

        try (ServerSocketChannel server = ServerSocketChannel.open(StandardProtocolFamily.UNIX)) {
            server.bind(address);

            while (true) {
                try (SocketChannel client = server.accept()) {
                    // Handle client connection
                    handleClient(client);
                }
            }
        }
    }

    public void connectToUnixSocket() throws IOException {
        Path socketPath = Path.of("/tmp/my-app.socket");
        UnixDomainSocketAddress address = UnixDomainSocketAddress.of(socketPath);

        try (SocketChannel client = SocketChannel.open(address)) {
            // Communicate with server
            ByteBuffer buffer = ByteBuffer.allocate(1024);
            client.read(buffer);
        }
    }

    private void handleClient(SocketChannel client) throws IOException {
        ByteBuffer buffer = ByteBuffer.allocate(1024);
        int bytesRead = client.read(buffer);
        // Process client data
    }
}
```

### JEP 352: Non-Volatile Mapped Byte Buffers (Java 14)

**Migration Pattern**: Use for persistent memory operations

```java
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.StandardOpenOption;

public class PersistentMemoryExample {
    public void usePersistentMemory() throws IOException {
        Path nvmFile = Path.of("/mnt/pmem/data.bin");

        try (FileChannel channel = FileChannel.open(nvmFile,
                StandardOpenOption.READ,
                StandardOpenOption.WRITE,
                StandardOpenOption.CREATE)) {

            // Map as persistent memory
            MappedByteBuffer buffer = channel.map(
                FileChannel.MapMode.READ_WRITE, 0, 1024,
                ExtendedMapMode.READ_WRITE_SYNC
            );

            // Write data that persists across crashes
            buffer.putLong(0, System.currentTimeMillis());
            buffer.putInt(8, 12345);

            // Force write to persistent storage
            buffer.force();
        }
    }
}
```

## Build System Configuration

### Maven Configuration

```xml
<properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <maven.compiler.release>17</maven.compiler.release>
</properties>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.11.0</version>
            <configuration>
                <release>17</release>
                <!-- Enable preview features if using JEP 406 -->
                <compilerArgs>
                    <arg>--enable-preview</arg>
                </compilerArgs>
            </configuration>
        </plugin>

        <!-- For running tests with preview features -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>3.0.0</version>
            <configuration>
                <argLine>--enable-preview</argLine>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### Gradle Configuration

```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

tasks.withType<JavaCompile> {
    options.release.set(17)
    // Enable preview features if needed
    options.compilerArgs.addAll(listOf("--enable-preview"))
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Enable preview features for tests
    jvmArgs("--enable-preview")
}
```

## Deprecations and Removals

### JEP 411: Deprecate the Security Manager for Removal

**Migration Pattern**: Remove Security Manager dependencies

```java
// Old: Using Security Manager
SecurityManager sm = System.getSecurityManager();
if (sm != null) {
    sm.checkPermission(new RuntimePermission("shutdownHooks"));
}

// New: Alternative security approaches
// Use application-level security, containers, or process isolation
// Most applications don't need Security Manager functionality
```

### JEP 398: Deprecate the Applet API for Removal

**Migration Pattern**: Migrate from Applets to modern web technologies

```java
// Old: Java Applet (deprecated)
public class MyApplet extends Applet {
    @Override
    public void start() {
        // Applet code
    }
}

// New: Modern alternatives
// 1. Convert to standalone Java application
public class MyApplication extends JFrame {
    public MyApplication() {
        setTitle("My Application");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        // Application code
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            new MyApplication().setVisible(true);
        });
    }
}

// 2. Use Java Web Start alternative (jlink)
// 3. Convert to web application using modern frameworks
```

### JEP 372: Remove the Nashorn JavaScript Engine

**Migration Pattern**: Use alternative JavaScript engines

```java
// Old: Nashorn (removed in Java 17)
// ScriptEngine engine = new ScriptEngineManager().getEngineByName("nashorn");

// New: Alternative approaches
// 1. Use GraalVM JavaScript engine
ScriptEngine engine = new ScriptEngineManager().getEngineByName("graal.js");

// 2. Use external JavaScript execution
ProcessBuilder pb = new ProcessBuilder("node", "script.js");
Process process = pb.start();

// 3. Use web-based approach or embedded browser
```

## JVM and Performance Improvements

### JEP 377: ZGC - A Scalable Low-Latency Garbage Collector (Java 15)

**Migration Pattern**: Enable ZGC for low-latency applications

```bash
# Enable ZGC
-XX:+UseZGC
-XX:+UnlockExperimentalVMOptions  # Not needed in Java 17

# Monitor ZGC performance
-XX:+LogVMOutput
-XX:LogFile=gc.log
```

### JEP 379: Shenandoah - A Low-Pause-Time Garbage Collector (Java 15)

**Migration Pattern**: Enable Shenandoah for consistent latency

```bash
# Enable Shenandoah
-XX:+UseShenandoahGC
-XX:+UnlockExperimentalVMOptions  # Not needed in Java 17

# Shenandoah tuning
-XX:ShenandoahGCHeuristics=adaptive
```

### JEP 341: Default CDS Archives (Java 12) & JEP 350: Dynamic CDS Archives (Java 13)

**Migration Pattern**: Improved startup performance

```bash
# CDS is enabled by default, but you can create custom archives
# Create custom CDS archive
java -XX:DumpLoadedClassList=classes.lst -cp myapp.jar com.example.Main
java -Xshare:dump -XX:SharedClassListFile=classes.lst -XX:SharedArchiveFile=myapp.jsa -cp myapp.jar

# Use custom CDS archive
java -XX:SharedArchiveFile=myapp.jsa -cp myapp.jar com.example.Main
```

## Testing and Migration Strategy

### Phase 1: Foundation (Weeks 1-2)

1. **Update build system**

   - Modify Maven/Gradle configuration for Java 17
   - Update CI/CD pipelines
   - Verify dependency compatibility

2. **Address removals and deprecations**
   - Remove Nashorn JavaScript engine usage
   - Replace deprecated Applet APIs
   - Update Security Manager usage

### Phase 2: Language Features (Weeks 3-4)

1. **Implement Records**

   - Convert data classes to records
   - Add validation in compact constructors
   - Test serialization compatibility

2. **Add Pattern Matching**
   - Convert instanceof chains
   - Implement type-safe casting patterns

### Phase 3: Advanced Features (Weeks 5-6)

1. **Switch Expressions**

   - Convert switch statements to expressions
   - Use new arrow syntax
   - Implement complex yield logic

2. **Text Blocks**
   - Replace concatenated multi-line strings
   - Update SQL and HTML generation
   - Use formatting methods

### Phase 4: Sealed Classes (Weeks 7-8)

1. **Design sealed hierarchies**

   - Identify inheritance restrictions
   - Implement sealed class patterns
   - Combine with pattern matching

2. **Testing and validation**
   - Comprehensive test coverage
   - Performance benchmarking
   - Compatibility verification

## Performance Considerations

### Records vs Traditional Classes

- Records are more memory efficient
- Faster creation and equality checks
- Automatic serialization support
- Consider for data transfer objects

### Pattern Matching Performance

- Eliminates redundant type checks
- Reduces casting overhead
- Better JVM optimization opportunities
- Use with sealed classes for exhaustiveness

### Switch Expressions Optimization

- More efficient bytecode generation
- Better constant folding
- Improved branch prediction
- Use for complex conditional logic

## Best Practices

1. **Use Records for Data Classes**

   - Immutable data containers
   - API data transfer objects
   - Configuration objects

2. **Apply Pattern Matching Strategically**

   - Replace instanceof chains
   - Use with sealed classes
   - Combine with switch expressions

3. **Adopt Text Blocks for Multi-line Content**

   - SQL queries
   - JSON templates
   - HTML content
   - Configuration files

4. **Design with Sealed Classes**

   - Domain modeling
   - State machines
   - Algebraic data types
   - API evolution control

5. **Leverage Enhanced Random Generators**
   - Parallel processing scenarios
   - High-quality random numbers
   - Statistical applications
   - Gaming and simulation

This comprehensive guide enables GitHub Copilot to provide contextually appropriate suggestions when upgrading Java 11 projects to Java 17, focusing on language enhancements, API improvements, and modern Java development practices.
