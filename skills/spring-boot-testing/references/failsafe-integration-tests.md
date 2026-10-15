# Failsafe: running `*IT` integration tests (Maven)

## The gotcha

Surefire runs `*Test`, `Test*`, `*Tests`, `*TestCase`. Classes named `*IT` / `IT*` / `*ITCase` are run by **maven-failsafe-plugin**. If Failsafe is only declared in `<pluginManagement>` (or not at all), it is never bound to the lifecycle: `*IT` classes compile but **silently never run**, and `./mvnw test` or `./mvnw package` still reports success.

Spring Boot's parent POM configures Failsafe in `<pluginManagement>` (with the `integration-test` and `verify` goals) but does **not** activate it.

## Fix

Declare the plugin in `<build><plugins>` and bind the goals:

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-failsafe-plugin</artifactId>
      <executions>
        <execution>
          <goals>
            <goal>integration-test</goal>
            <goal>verify</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

The version is managed by `spring-boot-starter-parent`; if the project does not use it, pin one explicitly.

## Run and verify

```bash
./mvnw verify
```

`verify` runs `integration-test` and then `verify` (which fails the build on IT failures). Do not use `./mvnw test` or `package` for ITs, and do not use `integration-test` alone: failures would not fail the build.

Confirm they ran: the output must contain a `failsafe:<version>:integration-test` line (Maven 3.10 prints `--- failsafe:3.5.6:integration-test (default)`; older Maven prints `maven-failsafe-plugin:...`) and `Tests run: N` for your `*IT` classes (also look in `target/failsafe-reports/`). If N is 0 or the plugin line is missing, the binding is absent.

## Alternatives

- Name integration tests `*Test` and run them with Surefire (simplest; no split).
- Gradle has no such issue: put them in `test`, or define a separate suite (JVM Test Suite plugin, verified with Boot 4.1; sources in `src/integrationTest/java`, a failing test fails `./gradlew build`):

```groovy
plugins { id 'jvm-test-suite' }

testing {
    suites {
        integrationTest(JvmTestSuite) {
            useJUnitJupiter()
            dependencies {
                implementation project()
                implementation 'org.springframework.boot:spring-boot-starter-webmvc-test'
            }
            targets { all { testTask.configure { shouldRunAfter(test) } } }
        }
    }
}

tasks.named('check') { dependsOn testing.suites.integrationTest }
```
