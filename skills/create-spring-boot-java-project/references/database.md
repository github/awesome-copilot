# Database (PostgreSQL)

Defaults: PostgreSQL (image `postgres:18-alpine`, see [versions.md](versions.md)), Spring Data JPA, Hibernate, HikariCP. Dependencies: `data-jpa`, `postgresql`, `docker-compose`, `testcontainers`.

## Configuration

```properties
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/mydb}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:user}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:password}

spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
spring.jpa.show-sql=false
```

The driver class is detected from the URL; do not set it. The defaults above are for local development only: production credentials come from the environment (see [configuration.md](configuration.md)).

## Schema management (`ddl-auto`)

Follow the schema management rule of the `java-hibernate-jpa` skill (prototype/local, production with Flyway/Liquibase, or externally managed). The table and setup below apply it to Spring Boot.

| Value | Behaviour | Use for |
|-------|-----------|---------|
| `update` | Adds missing tables/columns, never drops | Local development / prototypes |
| `validate` | Fails at startup if schema and entities differ | Production |
| `create` / `create-drop` | Recreates schema at startup (and drops at shutdown) | Throw-away tests |
| `none` | Hibernate does nothing | Schema managed elsewhere |

Hibernate's `update` is convenient but cannot rename, drop or migrate data. For production schema evolution, **Flyway or Liquibase are optional but recommended**: add the starter: on Boot 4 `spring-boot-starter-flyway` plus `org.flywaydb:flyway-database-postgresql` (or `spring-boot-starter-liquibase`), because Boot 4 auto-configuration lives in the starter; on Boot 3 add `org.flywaydb:flyway-core` plus `flyway-database-postgresql` (or `liquibase-core`) directly. Put migrations in `src/main/resources/db/migration` (`V1__init.sql`), and set `ddl-auto=validate`. Add them when the user wants versioned migrations or the app is headed to production.

## Entities

Keep entities annotated precisely (`@Table`, `@Column(length=..., nullable=...)`, `@Index`) so generated or validated DDL is accurate. Use `GenerationType.IDENTITY` or a sequence, `Instant` for timestamps, and avoid exposing entities in the API (use DTOs/records).

## Local development: Docker Compose

With `spring-boot-docker-compose`, Spring Boot starts `compose.yaml` automatically and wires the datasource (no URL needed):

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "user", "-d", "mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Tests

Use Testcontainers with `@ServiceConnection`; see the `spring-boot-testing` skill (`references/testcontainers-jdbc.md`). Pin the image tag; never `latest`. start.spring.io generates `postgres:latest` in `compose.yaml` and `TestcontainersConfiguration`: replace both with `postgres:18-alpine` (verified).

## Performance and production

- HikariCP is the default pool; tune `spring.datasource.hikari.maximum-pool-size` and `connection-timeout`.
- Avoid N+1 queries: `JOIN FETCH` or `@EntityGraph`; use DTO projections for read models.
- Keep `open-in-view=false` and `@Transactional` on services.
- Index foreign keys and filtered/sorted columns; check plans with `EXPLAIN ANALYZE`.
