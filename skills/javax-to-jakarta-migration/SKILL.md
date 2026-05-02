---
name: javax-to-jakarta-migration
description: "Migrate Java code from javax.* to jakarta.* namespace. Use when upgrading to Tomcat 11, Jakarta EE 10, or when javax imports are detected in the codebase."
argument-hint: "File, package, or module to migrate"
---

# javax → jakarta Migration Skill

## When to Use
- Upgrading to Tomcat 11 / Jakarta EE 10+
- Code review detects `javax.*` imports
- Migrating an existing project to the jakarta namespace

## Procedure

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
Replace dependency coordinates:

| Old | New |
|-----|-----|
| `javax.servlet:javax.servlet-api` | `jakarta.servlet:jakarta.servlet-api:6.0.0` |
| `javax.persistence:javax.persistence-api` | `jakarta.persistence:jakarta.persistence-api:3.1.0` |
| `javax.validation:validation-api` | `jakarta.validation:jakarta.validation-api:3.0.2` |
| `javax.annotation:javax.annotation-api` | `jakarta.annotation:jakarta.annotation-api:2.1.1` |

### Step 3 — Update web.xml (if present)
```xml
<!-- Old namespace -->
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee" version="4.0">

<!-- New namespace -->
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee" version="6.0">
```

### Step 4 — Update Java Source Files
Replace all `javax.` imports with `jakarta.` equivalents in `.java` files.

### Step 5 — Verify
1. Run `mvn clean compile` or `gradlew build` — fix any compilation errors
2. Run `mvn test` or `gradlew test` — ensure all tests pass
3. Search for any remaining `javax.*` imports (excluding JDK packages)

### Output
Provide a migration summary listing all files changed, imports replaced, and any manual steps required.
