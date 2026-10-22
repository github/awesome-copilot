# Messaging, caching, scheduling, async

**Ask before adding** a broker, a cache provider or a scheduler/async setup to an existing project: each one adds infrastructure and operational cost. When the user agrees, use the Boot-managed versions (no explicit version for Spring-managed artifacts). Verified on Boot 4.1.1 (JDK 26 runtime, `--release 25`); Boot 3 differences noted where known. Tests for these: `spring-boot-testing`; tracing/metrics for them: `spring-observability`.

## Kafka (Spring for Apache Kafka)

- **Boot 4:** `spring-boot-starter-kafka` (+ `spring-boot-starter-kafka-test`). **Boot 3:** `org.springframework.kafka:spring-kafka` (no starter; version managed by the Boot BOM).
- Producer: `KafkaTemplate<String, String>`; consumer: `@KafkaListener`.

```java
@Component
class Events {
	private final KafkaTemplate<String, String> template;
	Events(KafkaTemplate<String, String> template) { this.template = template; }

	void publish(String key, String payload) { template.send("orders", key, payload); }

	@KafkaListener(topics = "orders", groupId = "demo")
	void on(String payload) { /* must be idempotent: delivery is at-least-once */ }
}
```

```properties
spring.kafka.bootstrap-servers=${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
spring.kafka.consumer.auto-offset-reset=earliest
```

- Consumers must be **idempotent** (at-least-once delivery); decide on a retry/dead-letter strategy (`DefaultErrorHandler` with `DeadLetterPublishingRecoverer`) before going to production.
- Keep payloads as versioned DTOs (records); avoid sending JPA entities.
- **Test with a real broker** through Testcontainers (verified: send then receive in a `@SpringBootTest`):

```java
import org.testcontainers.kafka.KafkaContainer;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {
	@Bean @ServiceConnection
	KafkaContainer kafkaContainer() { return new KafkaContainer(DockerImageName.parse("apache/kafka-native:4.0.0")); }
}
```

  Boot 4 uses Testcontainers 2.x (artifact `org.testcontainers:testcontainers-kafka`); Boot 3 uses 1.x (artifact `org.testcontainers:kafka`). The example uses `org.testcontainers.kafka.KafkaContainer`, available in recent 1.x releases as well as 2.x; check that the project's BOM-managed version supports `apache/kafka-native`. Do not substitute the legacy `org.testcontainers.containers.KafkaContainer`: it requires a `confluentinc/cp-kafka` image. If the project's older Testcontainers version lacks the modern class or native-image support, use the legacy class with a compatible pinned Confluent image instead, without implicitly upgrading dependencies. Pin the image tag, never `latest`. Wait with a `CountDownLatch`/Awaitility, not `Thread.sleep`.

## RabbitMQ / AMQP (not verified in this skill's builds)

`spring-boot-starter-amqp` (Boot 3 and 4), `RabbitTemplate` to send, `@RabbitListener` to consume, `@ServiceConnection` with the Testcontainers RabbitMQ module for tests. Declare queues/exchanges as `Queue`/`TopicExchange`/`Binding` beans, use `Jackson2JsonMessageConverter`-style JSON converters only after checking the Jackson major in use (Boot 4 = Jackson 3), and configure a dead-letter exchange. Check the Spring AMQP reference for the exact converter class names for your version before generating code.

## Transactional outbox

Publishing to a broker inside a database transaction is not atomic: a crash between commit and send loses the message. When messages must not be lost, write the event to an `outbox` table in the same transaction as the state change, and have a relay (scheduled poller or CDC such as Debezium) publish and mark it sent. Consumers stay idempotent. Do not implement it unless the user needs that guarantee; for events that can be lost, `@TransactionalEventListener(phase = AFTER_COMMIT)` is simpler.

## Caching with Caffeine

- Dependencies: `spring-boot-starter-cache` (Boot 4 + test starter `spring-boot-starter-cache-test`; Boot 3 the same starter name) and `com.github.ben-manes.caffeine:caffeine` (BOM-managed).

```java
@Configuration(proxyBeanMethods = false)
@EnableCaching
class CachingConfig {}   // a dedicated class, not the @SpringBootApplication class

@Service
class RateService {
	@Cacheable("rates")                                   // key = method arguments
	public Rate expensive(String currency) { ... }

	@CacheEvict(value = "rates", allEntries = true)
	public void evict() {}
}
```

```properties
spring.cache.type=caffeine
spring.cache.cache-names=rates
spring.cache.caffeine.spec=maximumSize=500,expireAfterWrite=10m
```

- Verified on Boot 4.1.1: second call is served from cache, `evict()` forces a reload. Always set `maximumSize` and an expiry; unbounded caches are memory leaks.
- Cache immutable DTOs/records, not managed JPA entities. The cache is per JVM: with several instances use a distributed cache (Redis) only if the user asks for it, and expect stale data across nodes with Caffeine.
- `@Cacheable` is proxy-based: self-invocation and `private` methods bypass it. Do not cache methods with side effects or `null` returns you do not intend to cache.
- Enabling caching in `@SpringBootApplication` breaks slice tests that do not register a `CacheManager` (verified: `@DataJpaTest` fails with "No qualifying bean of type CacheManager"), hence the dedicated `@Configuration`.
- To expose cache statistics in Micrometer call `recordStats` (Caffeine spec `recordStats`); otherwise Boot logs a warning that the cache is not recording statistics (observed).

## Scheduling

```java
@Configuration(proxyBeanMethods = false)
@EnableScheduling
class SchedulingConfig {}

@Scheduled(fixedDelayString = "${app.tick:PT10S}")   // or cron = "0 0 * * * *", zone = "UTC"
void cleanup() { ... }
```

Verified: `@Scheduled(fixedDelayString = "${...:100ms}")` runs on Boot 4.1.1. Prefer `fixedDelay` over `fixedRate` to avoid overlapping runs. `@Scheduled` runs on **every instance**: with several replicas use a lock (ShedLock) or an external scheduler; add that only after asking. Scheduled methods take no arguments and must not throw unhandled exceptions silently: log and handle.

## Async and virtual threads

```properties
spring.threads.virtual.enabled=true     # Java 21+, Boot 3.2+
```

With the property set, Boot runs Tomcat/Jetty request handling, `@Async` tasks (through the auto-configured task executor) and other Boot-managed executors on virtual threads. Verified on Boot 4.1.1: an `@Async` method reports `Thread.currentThread().isVirtual() == true`.

```java
@Configuration(proxyBeanMethods = false)
@EnableAsync
class AsyncConfig {}

@Async
public CompletableFuture<Result> compute() { ... }   // return void or CompletableFuture
```

- Needs Java 21+; on Boot 3 the property exists from 3.2. Do not enable it on Java 17.
- Virtual threads help blocking I/O workloads (JDBC, HTTP). They do not speed up CPU-bound work. Pool sizes become the bottleneck: size the HikariCP pool deliberately and consider limits on downstream calls. Before JDK 24, `synchronized` blocks around blocking calls pin the carrier thread; prefer `ReentrantLock` there.
- `@Async` is proxy-based like `@Transactional`: the caller must be another bean, and the transaction/security context does not follow into the async thread unless propagated.
- With `@Async` returning `void`, exceptions are lost unless an `AsyncUncaughtExceptionHandler` is configured.
