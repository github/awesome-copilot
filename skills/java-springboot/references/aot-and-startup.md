# AOT, CDS and startup

Start with measurement, not flags: record startup time (`Started ... in N seconds` log, or `spring.main.log-startup-info=true`) and memory on the target hardware before and after each change, with several runs (single timings are noisy: observed differences between runs of the same configuration were larger than some of the gains). Do not change JVM or Spring flags without a stated goal (startup, memory, image size). Verified on Boot 4.1.1, Maven, JDK 26 runtime (`--release 25`); JDK 21 and 25 were not available for these runs.

## Spring AOT (build-time processing)

Spring AOT turns bean definitions and reflection/proxy hints into generated code. It is required for GraalVM native images and optional on the JVM.

```bash
./mvnw -DskipTests package spring-boot:process-aot    # Gradle: ./gradlew processAot
```

Verified: on the sample app (JPA, Flyway, Kafka, cache, validation, springdoc) `process-aot` succeeded and generated sources under `target/spring-aot/main/sources/` (for example `DemoApplication__BeanDefinitions.java`). Notes:

- AOT evaluates conditions and bean definitions at build time: profiles and properties that change the bean graph (`@Profile`, `@ConditionalOnProperty`) are fixed at build time. Do not rely on runtime-only conditions.
- `process-aot` starts the application context without connecting your beans to real services; if it fails, the usual causes are beans with runtime-only side effects in constructors or an ambiguous main class (set `<start-class>` in Maven, see `create-spring-boot-java-project` `references/spring-boot-4.md`).
- Custom reflection/resources: register hints with `@ImportRuntimeHints` and `RuntimeHintsRegistrar`, or `@RegisterReflectionForBinding` for DTOs serialized by Jackson.
- Using the generated code on the JVM requires running with `-Dspring.aot.enabled=true` and packaging the AOT output; that path was not verified here and gives modest gains, so prefer CDS/AOT cache below for JVM startup.

## Native image

For a native executable use the `java-add-graalvm-native-image-support` skill (build tool detection, native build, error iteration) and the native Dockerfiles of `create-spring-boot-java-project` (`references/docker.md`). Trade-offs: much faster startup and lower memory, but slower builds, closed-world assumptions (reflection hints), and some libraries need extra hints. Not verified in this skill.

## Class Data Sharing (CDS) / Application CDS

Spring Boot supports CDS through the extracted jar layout (`-Djarmode=tools`). Verified sequence on Boot 4.1.1 (the training run needs the app's dependencies, here a PostgreSQL):

```bash
./mvnw -DskipTests package
java -Djarmode=tools -jar target/app.jar extract --destination extracted
cd extracted
# training run: create the archive on exit (the app exits right after context refresh)
java -XX:ArchiveClassesAtExit=app.jsa -Dspring.context.exit=onRefresh -jar app.jar
# production run
java -XX:SharedArchiveFile=app.jsa -jar app.jar
```

Verified: `app.jsa` (about 50 MB for the sample app) was created and used without errors. The `[warning][cds] Skipping ... Failed verification` and `NoClassDefFoundError` preload warnings in the training run concern optional classes whose libraries are not on the classpath (reactor, Apache HttpClient, Log4j) and are harmless. The archive is tied to the exact JVM and jar: regenerate it in the build or image build for each version, and run the training with the same JDK as production.

JDK 19+ can also create the archive automatically at the first run (`-XX:+AutoCreateSharedArchive -XX:SharedArchiveFile=app.jsa`; verified that the file is created).

**JDK 25+ one-step AOT cache** ([JEP 514](https://openjdk.org/jeps/514)): `java -XX:AOTCacheOutput=app.aot -Dspring.context.exit=onRefresh -jar app.jar`, then `java -XX:AOTCache=app.aot -jar app.jar`. Verified on JDK 26 (about 160 MB cache, used without errors). JDK 24 introduced AOT caches ([JEP 483](https://openjdk.org/jeps/483)) but requires separate `AOTMode=record` and `AOTMode=create` steps; it does not recognize `AOTCacheOutput`. Check `java -version` before choosing the command, and keep CDS as the fallback for older JDKs. Same rule: one cache per JDK build and jar.

In containers, create the archive during `docker build` (a `RUN` training step in the final stage) rather than at container start.

## Lazy initialization

```properties
spring.main.lazy-initialization=true
```

- Defers bean creation to first use, which lowers startup time and memory at start but moves failures and the first-request latency to runtime: misconfigured beans no longer fail fast, and health checks may pass on a half-working app. Use it for dev/test or short-lived processes; avoid it as a production default. Set `@Lazy(false)` on beans that must start eagerly (schedulers, listeners).
- Measured on the sample app: no consistent startup gain over several runs; do not promise one.

## Other cheap wins

- Remove unused starters and auto-configurations; `--debug` prints the condition evaluation report to find what starts.
- `spring.jpa.open-in-view=false` and `spring.main.banner-mode=off` cost nothing.
- Set `-XX:TieredStopAtLevel=1` only for short-lived CLI-style jobs; it hurts steady-state throughput.
- Container memory: let the JVM size heap from container limits (`-XX:MaxRAMPercentage`); do not hard-code `-Xmx` equal to the limit.
- Virtual threads do not change startup (`references/messaging-caching.md`).
