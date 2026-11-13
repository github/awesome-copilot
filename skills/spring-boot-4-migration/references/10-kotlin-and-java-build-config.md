## Build Configuration

### Kotlin Compiler Configuration

**build.gradle.kts:**
```kotlin
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "2.2.0" // Minimum 2.2.0
    kotlin("plugin.spring") version "2.2.0"
    kotlin("plugin.jpa") version "2.2.0"
    id("org.springframework.boot") version "4.0.0"
    id("io.spring.dependency-management") version "1.1.7"
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21) // Or 17, 25
    }
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll(
            "-Xjsr305=strict", // Strict null-safety
            "-Xemit-jvm-type-annotations" // Emit type annotations
        )
    }
}

// Do not use kotlinOptions { jvmTarget = ... }: it is an error with Kotlin 2.2+ (verified). The Java toolchain sets the JVM target;
// to set it explicitly use kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }.

tasks.withType<Test> {
    useJUnitPlatform()
}
```

### Java Preview Features (if using Java 25)

**build.gradle.kts:**
```kotlin
tasks.withType<JavaCompile> {
    options.compilerArgs.add("--enable-preview")
}

tasks.withType<Test> {
    jvmArgs("--enable-preview")
}

tasks.withType<JavaExec> {
    jvmArgs("--enable-preview")
}
```

