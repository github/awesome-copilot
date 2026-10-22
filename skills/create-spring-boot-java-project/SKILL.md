---
name: create-spring-boot-java-project
description: 'Create a new Spring Boot Java project (Maven or Gradle) from start.spring.io with sensible defaults for configuration, PostgreSQL, logging, security, testing and Docker. Use when asked to scaffold, bootstrap or generate a Spring Boot application. Detects existing project versions and never upgrades implicitly.'
---

# Create a Spring Boot Java project

Scaffold a Spring Boot application with [start.spring.io](https://start.spring.io), then apply a small set of opinionated defaults. Out of scope for now: front-ends (Vue/React/Angular), cloud deployment (Azure), Git setup, CRaC and AOT images.

## Step 0: Detect before you create

- If the working directory already contains a `pom.xml` or `build.gradle(.kts)`, this is an **existing project**: do not regenerate it. Read its Spring Boot, Java and test-framework versions and follow them. **Never upgrade versions implicitly**; propose an upgrade and wait for the user's decision.
- Check the tools: `java -version` (JDK matching the chosen Java version), `docker --version` (needed for Testcontainers and Compose). On the default path (current Boot via start.spring.io) Maven/Gradle need not be installed: the generated wrapper is used. The Boot 3.5 fallback needs Maven or Gradle installed once to create the wrapper (see [versions.md](references/versions.md)).
- Ask only for what is missing: project name, group id, package, build tool (default **Maven**), dependencies (default: web, actuator, validation, devtools; add `data-jpa`, `postgresql`, `security`, `docker-compose`, `testcontainers` when a database or auth is needed).

## Step 1: Resolve versions

Follow [references/versions.md](references/versions.md): query `https://start.spring.io/metadata/client` at run time for the latest stable Spring Boot release, fall back to the documented pinned values if offline. Do not hardcode `latest` anywhere.

## Step 2: Generate the project

Use the start.spring.io HTTP API with explicit, pinned parameters (no piped installers). Replace the values in capitals.

Maven:

```bash
curl -fsS https://start.spring.io/starter.zip \
  -d type=maven-project -d language=java -d packaging=jar \
  -d bootVersion=BOOT_VERSION -d javaVersion=JAVA_VERSION \
  -d groupId=com.example -d artifactId=demo -d name=demo \
  -d packageName=com.example.demo -d baseDir=demo \
  -d dependencies=web,actuator,validation,devtools \
  -o demo.zip && unzip -q demo.zip && rm demo.zip
```

Gradle: same command with `-d type=gradle-project` (Groovy DSL) or `-d type=gradle-project-kotlin` (Kotlin DSL; the language stays `java`).

Inspect the result (`ls demo`, read the build file) and make sure the wrapper (`mvnw` or `gradlew`) is executable. Add `-d dependencies=...,data-jpa,postgresql,docker-compose,testcontainers` for a database project.

## Step 3: Apply the defaults

| Area | What to do | Reference |
|------|-----------|-----------|
| Boot 3 vs 4 differences | Starter names, Jackson 3, test modules | [references/spring-boot-4.md](references/spring-boot-4.md) |
| Configuration | `application.properties` or `.yml` (match the project), profiles, `@ConfigurationProperties`, secrets via environment | [references/configuration.md](references/configuration.md) |
| Database | PostgreSQL, Hibernate settings, Compose for dev, Testcontainers for tests | [references/database.md](references/database.md) |
| Logging | SLF4J, parameterized messages, levels, structured logging | [references/logging.md](references/logging.md) |
| Security | Spring Security basics, secure defaults, Problem Details | [references/security.md](references/security.md) |
| Docker | JVM image and GraalVM native image Dockerfiles | [references/docker.md](references/docker.md) |
| Testing | See the `spring-boot-testing` skill (slices, Testcontainers, Failsafe) | `skills/spring-boot-testing` |
| Best practices | See the `java-springboot` skill and `instructions/springboot.instructions.md` | `skills/java-springboot` |

Keep dotfiles minimal: a `.gitignore` covering `target/`, `build/`, `.gradle/`, IDE folders and `.env`; never commit `.env` (commit a `.env.sample`).

## Step 4: Verify

1. Build and test: `./mvnw verify` (Maven) or `./gradlew build` (Gradle).
2. Run: `./mvnw spring-boot:run` or `./gradlew bootRun`, then `curl -fsS localhost:8080/actuator/health` must return `{"status":"UP"}`.
3. Report the chosen versions and anything that was skipped or deferred.

## Provenance

Adapted from the Apache-2.0 skill [jdubois/dr-jskill](https://github.com/jdubois/dr-jskill); see [references/PROVENANCE.md](references/PROVENANCE.md).
