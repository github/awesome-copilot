## Migration Checklist

### Pre-Migration

- [ ] Upgrade to latest Spring Boot 3.5.x
- [ ] Review and fix all deprecation warnings
- [ ] Document current dependency versions
- [ ] Run full test suite and verify green build
- [ ] Review [Spring Boot 3.5.x → 4.0 dependency changes](https://docs.spring.io/spring-boot/4.0/appendix/dependency-versions/coordinates.html)

### Core Migration

- [ ] Update `libs.versions.toml` with the selected current Spring Boot 4.0.x patch
- [ ] Update Kotlin version to 2.2.0+
- [ ] Rename starters: `spring-boot-starter-web` → `spring-boot-starter-webmvc`, etc.
- [ ] Add technology-specific test starters (or use classic starters temporarily)
- [ ] Remove Undertow dependency if present (switch to Tomcat/Jetty)
- [ ] Remove `spring-session-hazelcast` / `spring-session-mongodb` or add explicit versions

### Jackson 3 Migration

- [ ] Update imports: `com.fasterxml.jackson` → `tools.jackson`
- [ ] Update exception: `jackson-annotations` still uses `com.fasterxml.jackson.core`
- [ ] Rename: `@JsonComponent` → `@JacksonComponent`
- [ ] Rename: `Jackson2ObjectMapperBuilderCustomizer` → `JsonMapperBuilderCustomizer`
- [ ] Review Boot 3 `spring.jackson.parser.*` / `spring.jackson.generator.*` settings against Jackson 3's `spring.jackson.json.read.*` / `spring.jackson.json.write.*` features; verify each feature name and behavior rather than mechanically replacing prefixes
- [ ] Review databind settings separately: `spring.jackson.deserialization.*` / `spring.jackson.serialization.*` may move to `spring.jackson.datatype.enum.*` or `spring.jackson.datatype.datetime.*` (see `03-jackson-3.md`)
- [ ] Consider temporary `spring-boot-jackson2` module if needed

### Property Updates

- [ ] MongoDB: `spring.data.mongodb.*` → `spring.mongodb.*` (for non-Spring Data properties)
- [ ] Session: `spring.session.redis.*` → `spring.session.data.redis.*`
- [ ] Persistence: `spring.dao.exceptiontranslation` → `spring.persistence.exceptiontranslation`
- [ ] Kafka retry: `backoff.random` → `backoff.jitter`

### Code Updates

- [ ] Update package: `BootstrapRegistry` → `org.springframework.boot.bootstrap.BootstrapRegistry`
- [ ] Update package: `EnvironmentPostProcessor` → `org.springframework.boot.EnvironmentPostProcessor`
- [ ] Update package: `EntityScan` → `org.springframework.boot.persistence.autoconfigure.EntityScan`
- [ ] Update: `RestClient` → `Rest5Client` (Elasticsearch)
- [ ] Update: `StreamsBuilderFactoryBeanCustomizer` → `StreamsBuilderFactoryBeanConfigurer` (Kafka)
- [ ] Split: `RabbitRetryTemplateCustomizer` → `RabbitTemplateRetrySettingsCustomizer` / `RabbitListenerRetrySettingsCustomizer`
- [ ] Replace: `HttpMessageConverters` → `ClientHttpMessageConvertersCustomizer` / `ServerHttpMessageConvertersCustomizer`
- [ ] Update: `PropertyMapper` usage with `.always()` if null handling needed

### Testing Updates

- [ ] Add `@ExtendWith(MockitoExtension::class)` to tests using `@Mock` / `@Captor`
- [ ] Add `@AutoConfigureMockMvc` to tests using `MockMvc`
- [ ] Add `@AutoConfigureWebTestClient` to tests using `WebTestClient`
- [ ] Migrate `TestRestTemplate` → `RestTestClient` (or add `@AutoConfigureTestRestTemplate`)
- [ ] Update: `@PropertyMapping` imports → `org.springframework.boot.test.context`

### Build Configuration

- [ ] Update Gradle to 8.14+
- [ ] Update Gradle CycloneDX plugin to 3.0.0+
- [ ] Review optional dependency inclusion in uber jars
- [ ] Remove `loaderImplementation = CLASSIC` if present
- [ ] Remove `launchScript()` configuration if present

### Verification

- [ ] Run `./gradlew clean build`
- [ ] Run full test suite
- [ ] Verify integration tests with TestContainers
- [ ] Check for new Kotlin null-safety warnings
- [ ] Test Spring Boot Actuator endpoints
- [ ] Verify health probes (`/actuator/health/liveness`, `/actuator/health/readiness`)
- [ ] Performance test with new defaults

### Post-Migration

- [ ] Review Spring Boot 4.0 release notes for additional features
- [ ] Consider adopting new Spring Framework 7.0 features
- [ ] Plan migration away from classic starters (if used)
- [ ] Plan migration away from `spring-boot-jackson2` module (if used)
- [ ] Update CI/CD pipelines for Java 17+ requirement
- [ ] Update deployment manifests (Servlet 6.1 containers)

## Common Pitfalls

1. **Classic starters**: Remember these are deprecated - plan migration to technology-specific starters
2. **Undertow**: Completely removed, no workaround - must use Tomcat or Jetty
3. **Jackson 3 packages**: Easy to miss `jackson-annotations` still using old group ID
4. **MongoDB properties**: Many moved to `spring.mongodb.*` but some remain in `spring.data.mongodb.*`
5. **Test configuration**: `@SpringBootTest` no longer auto-configures MockMVC/WebTestClient/TestRestTemplate
6. **Kotlin 2.2**: Required minimum - older versions won't work
7. **Null-safety**: JSpecify annotations may surface new warnings in Kotlin
8. **PropertyMapper**: Behavioral change with null handling - review usage
9. **Jersey + Jackson 3**: Incompatible - use `spring-boot-jackson2` module
10. **Health probes**: Now enabled by default - may affect non-Kubernetes deployments

## Performance Considerations

- **Modular starters**: Smaller JARs and faster startup with technology-specific starters
- **Spring Framework 7**: Performance improvements in core framework
- **Jackson 3**: Improved JSON processing performance
- **Virtual threads**: Consider enabling with Java 21+ (`spring.threads.virtual.enabled=true`)

## Resources

- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Spring Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/releases)
- [Spring Framework 7.0 Documentation](https://docs.spring.io/spring-framework/reference/)
- [Jackson 3 Migration Guide](https://github.com/FasterXML/jackson/blob/main/jackson3/MIGRATING_TO_JACKSON_3.md)
- [Kotlin 2.2 Release Notes](https://kotlinlang.org/docs/whatsnew22.html)

---
