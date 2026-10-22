# Logging, static analysis, packaging and CI

Verified with Maven 3.10.0 and Gradle 9.8.1 on JDK 21.0.12 and 25.0.4 unless marked unverified.

## Logging: SLF4J + one backend

```xml
<dependency><groupId>org.slf4j</groupId><artifactId>slf4j-api</artifactId><version>2.0.20</version></dependency>
<dependency><groupId>ch.qos.logback</groupId><artifactId>logback-classic</artifactId><version>1.6.5</version><scope>runtime</scope></dependency>
```

```java
private static final Logger log = LoggerFactory.getLogger(Main.class);

log.info("order {} placed for {}", orderId, customerId);     // placeholders, no concatenation
log.warn("payment failed for order {}", orderId, exception); // exception last: full stack trace
log.atInfo().addKeyValue("area", area).log("computed");     // SLF4J 2 fluent API (verified)
```

- Libraries depend only on `slf4j-api`; the application chooses the backend. Exactly one backend on the runtime classpath (otherwise SLF4J warns about multiple bindings).
- Minimal `src/main/resources/logback.xml` (verified): a `ConsoleAppender` with pattern `%d{HH:mm:ss.SSS} %-5level [%thread] %logger{36} requestId=%X{requestId} - %msg %kvp%n`, `<logger name="your.package" level="DEBUG"/>`, root level `INFO`. `%X{requestId}` renders the MDC request ID and `%kvp` renders fluent `addKeyValue` fields; `%msg` alone renders neither. Without a config file Logback logs at DEBUG to the console.
- Guard expensive argument construction with a lambda (`log.atDebug().log(() -> ...)`) or `isDebugEnabled`. Levels: ERROR = needs attention now, WARN = unexpected but handled, INFO = business events, DEBUG/TRACE = diagnostics.
- Never log secrets, tokens, full request bodies or personal data; use MDC (`MDC.put("requestId", id)` ... `finally MDC.remove`) for correlation. Do not use `System.out` for diagnostics in application code.
- Do not log an exception and also rethrow it (duplicate noise); log at the place that handles it.

## Compiler warnings: `-Xlint`

Maven:

```xml
<plugin>
  <artifactId>maven-compiler-plugin</artifactId>
  <version>3.16.0</version>
  <configuration>
    <release>21</release>
    <compilerArgs><arg>-Xlint:all</arg><arg>-Werror</arg></compilerArgs>
  </configuration>
</plugin>
```

Gradle: `tasks.withType<JavaCompile>().configureEach { options.release = 21; options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror")) }`.

`-Werror` turns warnings into build failures; verified as clean for the sample project on 21 and 25, but on an existing codebase it can fail on hundreds of warnings. Introduce `-Xlint:all` first and add `-Werror` only when the project is clean and the user agrees.

## Spotless (formatting)

Maven (verified 3.10.4; `spotless:check` fails on violations, `spotless:apply` fixes):

```xml
<plugin>
  <groupId>com.diffplug.spotless</groupId>
  <artifactId>spotless-maven-plugin</artifactId>
  <version>3.10.4</version>
  <configuration>
    <java><googleJavaFormat/><removeUnusedImports/></java>
  </configuration>
</plugin>
```

Gradle (verified 8.10.4): `plugins { id("com.diffplug.spotless") version "8.10.4" }` and `spotless { java { googleJavaFormat(); removeUnusedImports() } }`; run `./gradlew spotlessCheck` / `spotlessApply`.

Format style is a team decision: google-java-format uses 2-space indentation. If the project already has `.editorconfig`/Eclipse/IntelliJ formatting, configure Spotless to match instead (or do not add it). Apply `spotless:apply` to touched files only, never as a drive-by reformat of the repo. Works the same on JDK 21 and 25.

## Error Prone (bug patterns at compile time)

Maven, verified with `error_prone_core` 2.50.0 on JDK 21 and 25 (it caught `String.equals(Integer)` as `EqualsIncompatibleType`):

```xml
<plugin>
  <artifactId>maven-compiler-plugin</artifactId>
  <version>3.16.0</version>
  <configuration>
    <release>21</release>
    <compilerArgs>
      <arg>-XDcompilePolicy=simple</arg>
      <arg>-XDaddTypeAnnotationsToSymbol=true</arg>   <!-- required on JDK 21; accepted on 25 -->
      <arg>--should-stop=ifError=FLOW</arg>
      <arg>-Xplugin:ErrorProne -XepDisableWarningsInGeneratedCode</arg>
    </compilerArgs>
    <annotationProcessorPaths>
      <path>
        <groupId>com.google.errorprone</groupId>
        <artifactId>error_prone_core</artifactId>
        <version>2.50.0</version>
      </path>
    </annotationProcessorPaths>
  </configuration>
</plugin>
```

and `.mvn/jvm.config` (JDK 16+ strong encapsulation; one flag per line):

```
--add-exports jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED
--add-exports jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED
--add-exports jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED
--add-exports jdk.compiler/com.sun.tools.javac.model=ALL-UNNAMED
--add-exports jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED
--add-exports jdk.compiler/com.sun.tools.javac.processing=ALL-UNNAMED
--add-exports jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED
--add-exports jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED
--add-opens jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED
--add-opens jdk.compiler/com.sun.tools.javac.comp=ALL-UNNAMED
```

Without `-XDaddTypeAnnotationsToSymbol=true` on JDK 21 the compiler fails with "-XDaddTypeAnnotationsToSymbol=true is required by Error Prone on JDK 21" (verified). Error Prone warnings appear as `[BugPattern]` compiler warnings and become errors under `-Werror`; suppress a specific finding with `@SuppressWarnings("BugPattern")` plus a comment, not a global disable.

Gradle (verified with `net.ltgt.errorprone` 5.1.1, which adds the JVM flags itself):

```kotlin
plugins { java; id("net.ltgt.errorprone") version "5.1.1" }
dependencies { errorprone("com.google.errorprone:error_prone_core:2.50.0") }
```

## Checkstyle and SpotBugs (unverified here)

Run them only if the project configures them (`maven-checkstyle-plugin`, `spotbugs-maven-plugin`, Gradle `checkstyle`/`com.github.spotbugs`). Use the project's existing rule files; do not create a new ruleset or suppress findings wholesale. SpotBugs analyses bytecode, so check its JDK support before upgrading Java. They overlap with Error Prone; adding all three is rarely justified.

## Packaging

Executable jar needs dependencies. For a plain app (verified: the jar alone fails with `NoClassDefFoundError` for SLF4J):

```bash
mvn -B package dependency:copy-dependencies -DincludeScope=runtime -DoutputDirectory=target/lib
java -cp 'target/app.jar:target/lib/*' demo.Main
```

or use a shade/assembly plugin (or Gradle `application` + `installDist`) to produce a distributable. Set `Main-Class` in the jar manifest (`maven-jar-plugin` `<archive><manifest><mainClass>`).

**jlink** (verified, JDK 21): build a trimmed runtime:

```bash
MODS=$(jdeps --ignore-missing-deps --multi-release 21 --print-module-deps --class-path 'target/lib/*' target/app.jar)
jlink --add-modules "$MODS,jdk.unsupported" --strip-debug --no-header-files --no-man-pages --output target/rt
target/rt/bin/java -cp 'target/app.jar:target/lib/*' demo.Main
```

`jdeps` misses modules used by reflection or `ServiceLoader`; if the app fails with `NoClassDefFoundError`/missing provider, add modules (e.g. `java.sql`, `java.xml`, `jdk.crypto.ec`) explicitly. Runtime size was 44 MB for `java.base` only.

**jpackage** (verified on macOS with `--type app-image`): the `--input` directory must contain only the jar and its dependencies, not the output directory (using `target` as input recursed until "File name too long"):

```bash
mkdir target/in && cp target/app.jar target/lib/*.jar target/in/
jpackage --type app-image --name devapp --input target/in --main-jar app.jar \
  --main-class demo.Main --runtime-image target/rt --dest target/app
```

Native installers (`dmg`, `pkg`, `msi`, `deb`, `rpm`) need platform tooling and signing and were not tested; each must be built on its own OS.

## GitHub Actions CI (unverified: not executed)

`actions/setup-java` v6 and `actions/checkout` v7 were the latest major release tags as of 2026-10 (checked through the GitHub API); verify the current majors, and pin to a full commit SHA if the repository's policy requires it.

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java: [21, 25]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: ${{ matrix.java }}
          cache: maven            # or gradle
      - run: ./mvnw -B verify     # or ./gradlew build
```

Match the matrix to the Java releases the project supports (and the build's release setting); one JDK is fine for an application. For Gradle also consider `gradle/actions/setup-gradle`. Keep `permissions` minimal, never print secrets, and do not edit existing workflows without asking.
