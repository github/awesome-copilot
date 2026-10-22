# Spring Boot 3 vs 4 (when generating or editing code)

Detect the project's Spring Boot major first (see [versions.md](versions.md)); apply only the section that matches. Verify against the [Spring Boot 4.0 migration guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide).

## Baselines

| | Boot 3.x | Boot 4.x |
|--|----------|----------|
| Spring Framework | 6.x | 7.x |
| Java | 17+ | 17+ (25 recommended) |
| Jakarta EE | 10 | 11 |
| Jackson | 2 (`com.fasterxml.jackson.databind`) | 3 (`tools.jackson.databind`) |
| Testcontainers | 1.x | 2.x |

## Things that commonly break in Boot 4

1. **Modular starters.** Web is `spring-boot-starter-webmvc` (not `-web`), and each technology has a matching test starter (`spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`...). Generate with start.spring.io rather than guessing artifact names.
2. **Jackson 3.** Only API classes move (`tools.jackson.databind.ObjectMapper`); annotations stay in `com.fasterxml.jackson.annotation`.
3. **Test annotations moved**, for example `@WebMvcTest` is now `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`. `@MockitoBean` / `@MockitoSpyBean` replace `@MockBean` / `@SpyBean` (deprecated since 3.4 and removed in Boot 4; use the new ones everywhere Boot 3.4+ allows). See the `spring-boot-testing` skill.
4. **Testcontainers 2.x.** Artifacts are prefixed (`testcontainers-postgresql`, `testcontainers-junit-jupiter`) and classes moved (`org.testcontainers.postgresql.PostgreSQLContainer`). With Boot 3 keep the 1.x names.
5. **Main class for AOT/native.** If `process-aot` cannot find the main class, set `<start-class>` (Maven property) to the fully qualified `@SpringBootApplication` class.
6. **Make the generated `TestcontainersConfiguration` public** if tests live in sub-packages.

## Boot 3 projects

Stay on Boot 3 when the project is on Boot 3 (start.spring.io cannot generate new 3.x projects, see [versions.md](versions.md)): use `spring-boot-starter-web`, `org.testcontainers.containers.PostgreSQLContainer` (Testcontainers 1.x), `@MockBean`, Jackson 2. Do not migrate unless asked; Boot 3.5 → 4.0 is a separate, deliberate upgrade.
