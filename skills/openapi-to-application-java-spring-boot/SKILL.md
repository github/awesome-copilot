---
name: openapi-to-application-java-spring-boot
description: 'Generate a Spring Boot (Java) application from an OpenAPI 3 specification using the spec-first approach: openapi-generator (Maven or Gradle) produces API interfaces and DTOs, you implement controllers, services, persistence, security and tests. Use when asked to build, scaffold or implement a Spring Boot API from an OpenAPI/Swagger file.'
---

# Spring Boot application from an OpenAPI spec

Spec-first: the OpenAPI file is the source of truth. Generate **interfaces and DTOs only** at build time (never commit generated code), then hand-write the implementation. Verified with Spring Boot 4.0.8 and 4.1.1, openapi-generator 7.26.0 (Maven plugin, Gradle Groovy and Kotlin DSL), JDK 21+.

## Step 0: Detect and gather

- Existing `pom.xml` / `build.gradle(.kts)`: keep its build tool and Spring Boot version, **never upgrade implicitly**, add the generator to it. Otherwise create the project with the `create-spring-boot-java-project` skill (dependencies: `web`, `validation`, `actuator`; add `data-jpa`, `postgresql`, `security` only if needed).
- Get the spec (file, URL or pasted) and save it as `src/main/resources/openapi/<name>.yaml`. Accept 3.0.x and 3.1.x; Swagger 2.0 must be converted first.
- Ask only what the spec does not answer: persistence (in-memory vs database), authentication, package name.

## Step 1: Review the spec

Check unique `operationId`s (they become method names), `tags` (they become one interface each), reusable `components/schemas`, `required` lists, validation constraints (`minLength`, `maximum`, `pattern`), error responses and `securitySchemes`. Flag gaps and fix the spec rather than the generated code.

## Step 2: Configure the generator

Pin the version in a property; check the latest on Maven Central or the [generator docs](https://openapi-generator.tech/docs/generators/spring) before changing it.

Maven (`pom.xml`, in `<build><plugins>`, before `spring-boot-maven-plugin`):

```xml
<plugin>
  <groupId>org.openapitools</groupId>
  <artifactId>openapi-generator-maven-plugin</artifactId>
  <version>${openapi-generator.version}</version> <!-- 7.26.0 -->
  <executions>
    <execution>
      <goals><goal>generate</goal></goals>
      <configuration>
        <inputSpec>${project.basedir}/src/main/resources/openapi/petstore.yaml</inputSpec>
        <generatorName>spring</generatorName>
        <apiPackage>com.example.petstore.api</apiPackage>
        <modelPackage>com.example.petstore.api.model</modelPackage>
        <generateSupportingFiles>false</generateSupportingFiles>
        <configOptions>
          <interfaceOnly>true</interfaceOnly>
          <requestMappingMode>api_interface</requestMappingMode>
          <useSpringBoot4>true</useSpringBoot4>
          <useJackson3>true</useJackson3>
          <useSpringBuiltInValidation>true</useSpringBuiltInValidation>
          <useTags>true</useTags>
          <skipDefaultInterface>true</skipDefaultInterface>
          <openApiNullable>false</openApiNullable>
          <documentationProvider>none</documentationProvider>
          <annotationLibrary>none</annotationLibrary>
        </configOptions>
      </configuration>
    </execution>
  </executions>
</plugin>
```

Gradle (Groovy DSL; plugin `id 'org.openapi.generator' version '7.26.0'`):

```groovy
openApiGenerate {
  generatorName = 'spring'
  inputSpec = "$projectDir/src/main/resources/openapi/petstore.yaml".toString()
  outputDir = layout.buildDirectory.dir('generated/openapi').get().asFile.path
  apiPackage = 'com.example.petstore.api'
  modelPackage = 'com.example.petstore.api.model'
  generateApiTests = false
  generateModelTests = false
  generateSupportingFiles = false
  configOptions = [interfaceOnly: 'true', requestMappingMode: 'api_interface', useSpringBoot4: 'true', useJackson3: 'true', useSpringBuiltInValidation: 'true', useTags: 'true',
    skipDefaultInterface: 'true', openApiNullable: 'false', documentationProvider: 'none', annotationLibrary: 'none']
}
sourceSets.main.java.srcDir layout.buildDirectory.dir('generated/openapi/src/main/java')
tasks.named('compileJava') { dependsOn 'openApiGenerate' }
```

Gradle (Kotlin DSL; plugin `id("org.openapi.generator") version "7.26.0"`, resolved from the Gradle plugin portal, so keep `gradlePluginPortal()` in `pluginManagement`):

```kotlin
openApiGenerate {
    generatorName.set("spring")
    inputSpec.set("$projectDir/src/main/resources/openapi/petstore.yaml")
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.path)
    apiPackage.set("com.example.petstore.api")
    modelPackage.set("com.example.petstore.api.model")
    generateApiTests.set(false)
    generateModelTests.set(false)
    generateSupportingFiles.set(false)
    configOptions.set(mapOf("interfaceOnly" to "true", "requestMappingMode" to "api_interface", "useSpringBoot4" to "true", "useJackson3" to "true", "useSpringBuiltInValidation" to "true", "useTags" to "true",
        "skipDefaultInterface" to "true", "openApiNullable" to "false", "documentationProvider" to "none", "annotationLibrary" to "none"))
}
sourceSets.main { java.srcDir(layout.buildDirectory.dir("generated/openapi/src/main/java")) }
tasks.compileJava { dependsOn("openApiGenerate") }
```

Option notes:

- **Spring Boot 3.x**: drop `useSpringBoot4` and `useJackson3` (`useSpringBoot3=true` is the default). Boot 4 needs both options; Jackson 3 is only allowed with `useSpringBoot4`.
- **Request-parameter validation:** for Boot 3.2+/4 (Framework 6.1+), keep `useSpringBuiltInValidation=true` in all build-tool configurations. It omits type-level `@Validated` from generated API interfaces so MVC handles constrained query/path parameters through `HandlerMethodValidationException`. For Boot 3.0/3.1, leave this option `false` to retain AOP validation and explicitly map request-parameter `ConstraintViolationException` to HTTP 400 with the spec's error body. Do not blanket-map service-layer constraint violations to 400. Never patch generated interfaces to change validation behavior.
- **Base paths:** `requestMappingMode=api_interface` puts the class-level base-path mapping on the interface when no controller is generated. For `servers: [{url: /v1}]` and path `/pets`, verify `/v1/pets`; do not add the same `/v1` prefix again through controller mappings, `server.servlet.context-path` or proxy rewriting.
- `interfaceOnly=true` generates `<Tag>Api` interfaces (with `@RequestMapping`/validation annotations) and models. `delegatePattern=true` (instead) generates controllers calling a `<Tag>ApiDelegate` you implement; prefer `interfaceOnly`, it is simpler. If you use `delegatePattern` (verified on Boot 4.1.1): drop `skipDefaultInterface` (it breaks the generated delegate, compile errors); generate only `ApiUtil.java` as supporting file, otherwise the default delegate methods fail with `cannot find symbol ApiUtil` and a full set of supporting files adds an `OpenApiGeneratorApplication` main class (`Unable to find a single main class` in `bootJar`): Maven `<supportingFilesToGenerate>ApiUtil.java</supportingFilesToGenerate>` instead of `<generateSupportingFiles>false</generateSupportingFiles>`, Gradle `globalProperties = [apis: '', models: '', supportingFiles: 'ApiUtil.java']`. The generated `<Tag>ApiController` is a `@Controller` in `apiPackage`: it must be under the `@SpringBootApplication` package (e.g. `com.example.demo.api`), otherwise it is not scanned and the endpoints return 404.
- `documentationProvider=none` and `annotationLibrary=none` avoid pulling springdoc/swagger annotations into the generated code. Serving the spec/Swagger UI is optional: add `org.springdoc:springdoc-openapi-starter-webmvc-ui` (3.x line for Boot 4, 2.8.x for Boot 3) only if requested; verified with springdoc 3.1.1 on Boot 4.1.1 (`/v3/api-docs` returns OpenAPI 3.1 JSON, `/swagger-ui/index.html` returns 200).
- `openApiNullable=false` avoids the `jackson-databind-nullable` dependency; keep it `true` only if the spec has PATCH semantics with nullable fields.
- Generated models use `jakarta.validation`: `spring-boot-starter-validation` must be on the classpath. Required properties become constructor arguments **in generated order**; read the generated class in `target/generated-sources/openapi` (or `build/generated/openapi`) before calling constructors.
- Use `<importMappings>`/`<typeMappings>` only when a schema must map to an existing class.

## Step 3: Implement

- One `@RestController` per generated `<Tag>Api` interface, `implements` it, no extra mapping annotations (they are inherited from the interface). Keep controllers thin; put logic in `@Service` classes and return DTOs, not entities. Map entities to generated DTOs explicitly (a MapStruct mapper if the project already uses it).
- Persistence: in-memory only when asked; otherwise Spring Data JPA entities and repositories separate from the generated DTOs, PostgreSQL via Docker Compose for dev, and schema handling per the schema management rule of the `java-hibernate-jpa` skill (Flyway or Liquibase for production). See the `java-springboot` skill.
- Errors: use `@RestControllerAdvice` to preserve each operation's declared error status, media type and response schema, including validation failures. Handle `MethodArgumentNotValidException` for request bodies and, on Boot 3.2+/4, `HandlerMethodValidationException` for query/path parameters; override the corresponding handlers when extending `ResponseEntityExceptionHandler`. Return RFC 9457 `ProblemDetail` only when the spec declares it; otherwise return the declared error DTO instead of Spring's default validation response. If error responses are missing or ambiguous, ask before changing the contract rather than imposing Problem Details or a blanket 400/404/409 policy.
- Security: map `securitySchemes` with the `spring-security` skill (JWT resource server, API key filter, method security). Do not generate `useSpringSecurityPreAuthorize` unless scopes are declared.
- Never edit generated sources; change the spec or the generator options and rebuild.

## Step 4: Test and verify

- Follow the `spring-boot-testing` skill: `@WebMvcTest` slices per controller (mock the service), `@SpringBootTest` + MockMvc for the happy path and one validation failure per write operation, Testcontainers with `@ServiceConnection` for database code (see `java-testcontainers`).
- Cover every operation in the spec: success, not found, invalid input. Test invalid constrained query/path parameters as well as invalid request bodies. For error responses, including validation failures, assert the declared status, content type and body schema, not just the status code. Optionally assert the spec itself stays valid in CI with `openapi-generator validate -i <spec>` or by letting the build fail on generation errors.
- Run `./mvnw verify` or `./gradlew build`, then start the app and `curl` one endpoint plus `/actuator/health`. Include an endpoint from a spec with a non-root server URL and assert its full path, so a missing or duplicated base prefix is caught.
- Report: spec issues found, generator version and options, files written, anything deferred.
