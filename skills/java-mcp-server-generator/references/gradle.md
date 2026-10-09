# Gradle Projects

Use this file only when the project uses Gradle or the user asks for Gradle. The Java code and the tests do not change.

## Create the project

Make this layout. Do not write `pom.xml`:

```text
project-name/
├── settings.gradle.kts
├── build.gradle.kts
└── src/
    ├── main/java/com/example/McpServerApp.java
    └── test/java/com/example/McpServerAppTest.java
```

Write `settings.gradle.kts`:

```kotlin
rootProject.name = "mcp-server-demo"
```

Write `build.gradle.kts`:

```kotlin
plugins {
    application
}

group = "com.example"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation(platform("io.modelcontextprotocol.sdk:mcp-bom:2.0.1"))
    implementation("io.modelcontextprotocol.sdk:mcp")
    runtimeOnly("org.slf4j:slf4j-simple:2.0.17")

    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<JavaCompile> {
    options.release = 17
}

application {
    mainClass = "com.example.McpServerApp"
}

tasks.test {
    useJUnitPlatform()
}
```

## Build until the tests pass

1. If the project has no `gradlew` file, run `gradle wrapper` one time.
2. Run `./gradlew build installDist`. This command compiles the code and runs the tests. It also makes the start script `build/install/mcp-server-demo/bin/mcp-server-demo`.
3. If a test fails, read the error. Fix the server or the test.
4. Run `./gradlew build installDist` again.
5. Continue only when the build is successful.

## Configure the client

For VS Code, write `.vscode/mcp.json`:

```json
{
  "servers": {
    "demo": {
      "type": "stdio",
      "command": "/absolute/path/to/project/build/install/mcp-server-demo/bin/mcp-server-demo"
    }
  }
}
```

On Windows, use `mcp-server-demo.bat`.

## Gotchas

- Gradle 9 does not add the JUnit Platform launcher. Without `junit-platform-launcher`, the `test` task fails.
- The `application` plugin does not make an executable JAR. The JAR in `build/libs` has no `Main-Class` and no dependencies. Use the start script from `installDist`.
- Do not use `./gradlew run` as the client command. The `run` task does not send stdin to the server. Gradle also writes its own output to stdout.
