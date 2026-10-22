---
name: javax-to-jakarta-migration
description: 'Migrate Java code from javax.* to jakarta.* namespace. Use only when the user explicitly asks for a javax to jakarta namespace or framework migration (for example to Tomcat 10+/11 or Jakarta EE), or when java-upgrade or spring-boot-4-migration delegates it. Finding javax imports alone does not authorize a migration.'
argument-hint: "File, package, or module to migrate"
---

# javax → jakarta Migration Skill

## When to Use
- The user explicitly asks to migrate to the jakarta namespace, Tomcat 10+/11 or Jakarta EE
- `java-upgrade` or `spring-boot-4-migration` delegates the namespace migration

Detecting `javax.*` imports alone does not authorize this migration; report them instead.

In Spring Boot projects, the Boot BOM manages Jakarta versions: do not pin the versions below, and let the Boot version decide the Jakarta EE level (Boot 4 = Jakarta EE 11, Servlet 6.1). The examples below target Jakarta EE 10 (Servlet 6.0, Tomcat 10.1+) in non-Boot projects.

## Procedure

### Step 0 — Baseline
Run `./mvnw verify` or `./gradlew build` first and record the result; do not migrate on a red baseline. Make the change in a dedicated commit/step.

### Step 1 — Scan for javax Usage
Search the codebase for all `javax.*` imports that need migration:
```
javax.servlet.*      → jakarta.servlet.*
javax.persistence.*  → jakarta.persistence.*
javax.validation.*   → jakarta.validation.*
javax.annotation.*   → jakarta.annotation.*
javax.inject.*       → jakarta.inject.*
javax.enterprise.*   → jakarta.enterprise.*
javax.faces.*        → jakarta.faces.*
javax.ws.rs.*        → jakarta.ws.rs.*
javax.el.*           → jakarta.el.*
javax.json.*         → jakarta.json.*
javax.mail.*         → jakarta.mail.*
javax.websocket.*    → jakarta.websocket.*
```

**Do NOT migrate** these (they remain in `javax.*`):
- `javax.sql.*` — part of JDK
- `javax.naming.*` — part of JDK (JNDI)
- `javax.crypto.*` — part of JDK
- `javax.net.*` — part of JDK
- `javax.security.auth.*` — part of JDK
- `javax.swing.*`, `javax.xml.parsers.*` — JDK packages

### Step 2 — Update pom.xml
Replace dependency coordinates. Choose API versions that match the target runtime; the table below is for Jakarta EE 10 (Tomcat 10.1+, Servlet 6.0):

| Target runtime | Jakarta EE | Servlet | Persistence | Validation | Annotations |
|----------------|-----------|---------|-------------|------------|-------------|
| Tomcat 10.0 | 9 | 5.0 | 3.0 | 3.0 | 2.0 |
| Tomcat 10.1 | 10 | 6.0 | 3.1 | 3.0 | 2.1 |
| Tomcat 11 | 11 | 6.1 | 3.2 | 3.1 | 3.0 |


| Old | New |
|-----|-----|
| `javax.servlet:javax.servlet-api` | `jakarta.servlet:jakarta.servlet-api:6.0.0` |
| `javax.persistence:javax.persistence-api` | `jakarta.persistence:jakarta.persistence-api:3.1.0` |
| `javax.validation:validation-api` | `jakarta.validation:jakarta.validation-api:3.0.2` |
| `javax.annotation:javax.annotation-api` | `jakarta.annotation:jakarta.annotation-api:2.1.1` |

### Step 3 — Update web.xml (if present)
The `version` must match the target Servlet level (5.0 for Tomcat 10.0, 6.0 for Tomcat 10.1, 6.1 for Tomcat 11); the example below is for Servlet 6.0:
```xml
<!-- Old namespace -->
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee" version="4.0">

<!-- New namespace -->
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee" version="6.0">
```

### Step 4 — Update Java Source Files
Replace only the Jakarta EE `javax.` imports identified in Step 1 with their `jakarta.` equivalents in `.java` files; leave JDK packages (for example `javax.sql`, `javax.crypto`) unchanged. Also check non-Java references: `persistence.xml` (`javax.persistence.*` properties), `META-INF/services`, `beans.xml`, properties/YAML, string class names and reflection.

### Step 5 — Verify
1. Run `mvn clean compile` or `gradlew build` — fix any compilation errors
2. Run `mvn test` or `gradlew test` — ensure all tests pass
3. Search for any remaining `javax.*` imports (excluding JDK packages)

### Upstream sources (read before migrating)

Fetch the page for the target version; prefer it over this skill when they conflict.

- Jakarta EE specifications: <https://jakarta.ee/specifications/>
- Eclipse Transformer (binary/bytecode transformation): <https://github.com/eclipse-transformer/transformer>
- OpenRewrite `org.openrewrite.java.migrate.jakarta.JavaxMigrationToJakarta`: <https://docs.openrewrite.org/recipes/java/migrate/jakarta/javaxmigrationtojakarta>
- Tomcat 9 to 10 migration: <https://tomcat.apache.org/migration-10.html>
- Hibernate migration guides: <https://hibernate.org/orm/documentation/migrate/>
- Spring Boot 3 upgrade (Jakarta EE 9+ baseline): <https://docs.spring.io/spring-boot/upgrading.html>

### Output
Provide a migration summary listing all files changed, imports replaced, and any manual steps required.
