# Build setup for JUnit 5/6

Versions below were used in verification runs (JDK 21 and 25, Maven 3.10.0, Gradle 9.8.1). Re-check current releases on Maven Central before pinning, and keep the project's existing versions when present.

## Maven

```xml
<properties>
  <junit.version>6.0.3</junit.version>      <!-- 5.14.4 works with the same test code; Java baseline 17 for 6.x -->
</properties>
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.junit</groupId>
      <artifactId>junit-bom</artifactId>
      <version>${junit.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
<build>
  <plugins>
    <plugin>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.6.0</version>
    </plugin>
    <plugin>
      <artifactId>maven-failsafe-plugin</artifactId>
      <version>3.6.0</version>
      <executions>
        <execution>
          <goals><goal>integration-test</goal><goal>verify</goal></goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

Switching versions for a trial run: `mvn verify -Djunit.version=5.14.4` (works because the version is a property). If a parent (e.g. Spring Boot) manages JUnit, override that property or BOM deliberately and tell the user.

Commands: `mvn test` (unit, Surefire), `mvn verify` (unit + `*IT` via Failsafe), `mvn -Dtest=FooTest#bar test`, `mvn -Dit.test=FooIT verify`.

### JaCoCo (0.8.15)

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.15</version>
  <executions>
    <execution><goals><goal>prepare-agent</goal></goals></execution>
    <execution>
      <id>report</id><phase>verify</phase><goals><goal>report</goal></goals>
    </execution>
    <!-- optional gate; only if the project already enforces one -->
    <execution>
      <id>check</id><phase>verify</phase><goals><goal>check</goal></goals>
      <configuration>
        <rules><rule><element>BUNDLE</element>
          <limits><limit><counter>LINE</counter><value>COVEREDRATIO</value><minimum>0.80</minimum></limit></limits>
        </rule></rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

If Surefire/Failsafe set `<argLine>`, it must start with `@{argLine}`, otherwise the JaCoCo agent is dropped. Conversely, a literal `@{argLine}` without a `prepare-agent` execution fails the forked JVM (`Error: could not open '{argLine}'`, verified). Report: `target/site/jacoco/index.html`.

### PIT mutation testing (verified: pitest-maven 1.30.1 + pitest-junit5-plugin 1.2.3 with JUnit 6.0.3 on JDK 21)

```xml
<plugin>
  <groupId>org.pitest</groupId>
  <artifactId>pitest-maven</artifactId>
  <version>1.30.1</version>
  <dependencies>
    <dependency>
      <groupId>org.pitest</groupId>
      <artifactId>pitest-junit5-plugin</artifactId>
      <version>1.2.3</version>
    </dependency>
  </dependencies>
  <configuration>
    <targetClasses><param>com.example.*</param></targetClasses>
  </configuration>
</plugin>
```

Run: `mvn test-compile org.pitest:pitest-maven:mutationCoverage` (report in `target/pit-reports`). PIT reads Surefire's `argLine` too; if it contains an unresolved `@{argLine}`, pass `-DargLine=-Dpit=1` for the PIT run (verified workaround). Gradle equivalent: the `info.solidsoft.pitest` plugin (not verified here).

## Gradle (Kotlin DSL)

```kotlin
plugins { java; jacoco }
repositories { mavenCentral() }

dependencies {
    testImplementation(platform("org.junit:junit-bom:6.0.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")   // required with Gradle 9
}

tasks.test {
    useJUnitPlatform()
    finalizedBy(tasks.jacocoTestReport)
}
```

Integration tests as a JVM Test Suite (verified; `src/integrationTest/java`):

```kotlin
testing {
    suites {
        register<JvmTestSuite>("integrationTest") {
            useJUnitJupiter("6.0.3") // a custom suite does not inherit the unit tests' BOM; keep the versions equal
            dependencies { implementation(project()) }
            targets.all { testTask.configure { shouldRunAfter(tasks.test) } }
        }
    }
}
tasks.check { dependsOn(testing.suites.named("integrationTest")) }
```

Commands: `./gradlew test`, `./gradlew test --tests 'demo.OrdersTest'` (also runs its nested classes), `./gradlew check`, report at `build/reports/tests/test/index.html` and `build/reports/jacoco`. Trial run on JUnit 5: `./gradlew test -PjunitVersion=5.14.4` when the version is read from a Gradle property.

Groovy DSL differs only in syntax (`testImplementation platform('org.junit:junit-bom:6.0.3')`, `jvmArgs '-javaagent:...'`).
