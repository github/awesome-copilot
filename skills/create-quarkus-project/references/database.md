# Database

Extensions: `hibernate-orm-panache`, `jdbc-postgresql` (or another JDBC driver). Optional: `flyway` or `liquibase`.

"Panache Next" (a unified blocking/reactive API) was renamed Quarkus Data in 3.37: the artifact is `quarkus-data-hibernate` (previously `quarkus-hibernate-panache-next`, and earlier `quarkus-hibernate-panache`). Its extension metadata in 3.40.1 says `status: experimental`, so keep `hibernate-orm-panache` (stable) unless the user asks for Quarkus Data. Not compiled here: only the artifact metadata and the 3.37/4.0 migration guides were checked.

## Dev Services

With no `quarkus.datasource.jdbc.url` configured, dev and test modes start a PostgreSQL container automatically (Docker/Podman required). Do not set the URL in `%dev`/`%test`. Tuning:

```properties
quarkus.datasource.db-kind=postgresql
%dev.quarkus.datasource.devservices.image-name=postgres:17
%dev.quarkus.datasource.devservices.reuse=true
```

Without `image-name`, 3.40 starts `postgres:18`; pin the image to match production. `reuse` only takes effect when the Testcontainers user file `~/.testcontainers.properties` contains `testcontainers.reuse.enable=true` (otherwise Quarkus logs "Reuse was requested but the environment does not support the reuse of containers").

Production settings go in `%prod.`:

```properties
%prod.quarkus.datasource.jdbc.url=${DB_URL}
%prod.quarkus.datasource.username=${DB_USER}
%prod.quarkus.datasource.password=${DB_PASSWORD}
```

## Hibernate ORM

```properties
%dev.quarkus.hibernate-orm.schema-management.strategy=drop-and-create
%prod.quarkus.hibernate-orm.schema-management.strategy=none
```

(`quarkus.hibernate-orm.database.generation` is the deprecated old name: 3.40 logs a deprecation warning for it. `schema-management.strategy` was verified on 3.27.6 and 3.40.1; for older releases check the Hibernate ORM guide.)

Panache repository:

```java
@Entity
public class Product { @Id @GeneratedValue Long id; String name; }

@ApplicationScoped
public class ProductRepository implements PanacheRepository<Product> {}
```

Put `@Transactional` on methods that write. Use `find(...).page(Page.of(0, 20))` for pagination.

## Migrations

For production use Flyway (`quarkus-flyway`) or Liquibase (`quarkus-liquibase`):

```properties
quarkus.flyway.migrate-at-start=true
```

When adopting Flyway or Liquibase, remove every Hibernate schema-recreation override (such as the `%dev` `drop-and-create` above) and set `quarkus.hibernate-orm.schema-management.strategy=none` (or `validate`) so the migration tool alone manages the schema; otherwise Hibernate can drop and recreate the migrated tables.

With PostgreSQL, Flyway also needs the database-specific module `org.flywaydb:flyway-database-postgresql` (managed by the Quarkus BOM) next to `quarkus-flyway`; without it startup fails because Flyway cannot handle PostgreSQL.

Place scripts in `src/main/resources/db/migration` (`V1__init.sql`). Flyway also gets a Dev Services-provided datasource automatically.
