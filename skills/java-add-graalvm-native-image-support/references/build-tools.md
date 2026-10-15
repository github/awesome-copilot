# Build tool setup (Maven and Gradle)

Use the GraalVM Native Build Tools plugin for plain Java projects. Quarkus and Micronaut projects get native support (or an equivalent) from their own plugins; do not add it again there. Spring Boot with Maven and `spring-boot-starter-parent` inherits its version and configuration through the parent's `native` profile (`pluginManagement`), but you must still declare `native-maven-plugin` and `spring-boot-maven-plugin` in `<build><plugins>` if absent (no version needed); Spring Boot with Gradle, or Maven with a custom parent, needs the plugin applied explicitly (see `spring-boot.md`).

## Versions

Do not hard-code a version from memory. Resolve the current release at run time and pin it:

- Maven Central: `org.graalvm.buildtools:native-maven-plugin` (search.maven.org or `https://repo.maven.apache.org/maven2/org/graalvm/buildtools/native-maven-plugin/maven-metadata.xml`)
- Gradle Plugin Portal: `org.graalvm.buildtools.native`
- Release notes: https://graalvm.github.io/native-build-tools/latest/index.html

Below, `NBT_VERSION` stands for the version you resolved. Replace it with the real number in the file.

## Maven

Put it in a `native` profile so normal builds are unaffected:

```xml
<profiles>
  <profile>
    <id>native</id>
    <build>
      <plugins>
        <plugin>
          <groupId>org.graalvm.buildtools</groupId>
          <artifactId>native-maven-plugin</artifactId>
          <version>NBT_VERSION</version>
          <extensions>true</extensions>
          <executions>
            <execution>
              <id>build-native</id>
              <goals>
                <goal>compile-no-fork</goal>
              </goals>
              <phase>package</phase>
            </execution>
            <execution>
              <id>test-native</id>
              <goals>
                <goal>test</goal>
              </goals>
              <phase>test</phase>
            </execution>
          </executions>
          <configuration>
            <imageName>${project.artifactId}</imageName>
            <mainClass>com.example.Main</mainClass>
            <buildArgs>
              <buildArg>--no-fallback</buildArg>
            </buildArgs>
          </configuration>
        </plugin>
      </plugins>
    </build>
  </profile>
</profiles>
```

Set `mainClass` to the project's real entry point (or rely on the jar plugin's configured main class). Build: `./mvnw -Pnative native:compile`; run tests natively: `./mvnw -Pnative test`. The executable lands in `target/`.

## Gradle

Groovy DSL:

```groovy
plugins {
  id 'application'
  id 'org.graalvm.buildtools.native' version 'NBT_VERSION'
}

graalvmNative {
  binaries {
    main {
      imageName = project.name
      mainClass = application.mainClass
      buildArgs.add('--no-fallback')
    }
  }
}
```

Kotlin DSL:

```kotlin
plugins {
  application
  id("org.graalvm.buildtools.native") version "NBT_VERSION"
}

graalvmNative {
  binaries {
    named("main") {
      imageName.set(project.name)
      mainClass.set(application.mainClass)
      buildArgs.add("--no-fallback")
    }
  }
}
```

Build: `./gradlew nativeCompile`; run: `./gradlew nativeRun`; test: `./gradlew nativeTest`. The executable lands in `build/native/nativeCompile/`.

Gradle toolchains: to select GraalVM via a toolchain, set `javaLauncher` in `graalvmNative.binaries.main` using `javaToolchains.launcherFor { languageVersion = JavaLanguageVersion.of(<java-version>); vendor = JvmVendorSpec.GRAAL_VM }`. Otherwise make sure `JAVA_HOME` points to a GraalVM JDK.

## `--no-fallback`

Fallback images (which bundle a JVM launcher) are deprecated and removed in recent GraalVM releases, so the flag is the default behavior there. Keep it for older toolchains so failures are not hidden.

## Useful build arguments

| Argument | Purpose |
|---|---|
| `-Ob` | quick build mode for development |
| `--initialize-at-run-time=<class-or-package>` | defer class initialization |
| `--initialize-at-build-time=<class-or-package>` | initialize during the build (only when safe) |
| `-H:+ReportExceptionStackTraces` | fuller build errors |
| `--gc=G1` | G1 GC (Linux, Oracle GraalVM) for throughput; default serial GC |
| `-march=native` | tune for the build CPU only; avoid for distributed binaries (use `-march=compatibility`) |
