# Reactive vs blocking, Mutiny, messaging

## Threading model

Quarkus REST picks the execution thread from the method signature (verified on 3.40.1 with a thread-name check):

| Method | Runs on |
|---|---|
| returns plain type, no annotation (Quarkus REST default, imperative) | worker thread (`executor-thread-N`) |
| `@Blocking` | worker thread |
| `@NonBlocking` | event loop (`vert.x-eventloop-thread-N`) |
| returns `Uni`/`Multi`/`CompletionStage` | event loop |
| `@RunOnVirtualThread` | virtual thread (`Thread.currentThread().isVirtual()` is true) |

(Thread names contain `eventloop`, not `event-loop`.) Annotations: `io.smallrye.common.annotation.Blocking`, `NonBlocking`, `RunOnVirtualThread`. Behaviour of defaults differs across extensions (Reactive Messaging, gRPC, scheduler), so annotate explicitly when it matters.

**Event loop pitfalls**: never call blocking JDBC/Panache ORM, `Thread.sleep`, `Uni.await().indefinitely()` or file/HTTP blocking clients on the event loop; Vert.x logs "blocked thread" warnings and Quarkus throws `IllegalStateException` for blocking Panache calls on I/O threads. Move work with `@Blocking`, `@RunOnVirtualThread`, or `Uni...runSubscriptionOn(Infrastructure.getDefaultWorkerPool())`.

**Virtual threads**: `@RunOnVirtualThread` needs Java 21+. Beware of pinning (`synchronized` blocks around blocking calls) and thread-local reliance; use for blocking I/O heavy endpoints, not CPU work.

## Mutiny gotchas

- Nothing runs until subscribed; returning a `Uni` from a resource subscribes it. Avoid `await().indefinitely()` outside tests or `@Blocking` code.
- `Uni.createFrom().item(supplier)` runs the supplier on the subscribing thread (the event loop for REST), so keep it non-blocking (verified).

## SmallRye Reactive Messaging with Kafka

Extension: `quarkus-messaging-kafka`. Ask the user before adding it. Dev Services starts a Kafka broker in dev/test when `kafka.bootstrap.servers` is not set (verified on 3.40.1 and 3.27.6: a round trip worked with Docker).

```properties
mp.messaging.outgoing.words-out.topic=words
mp.messaging.incoming.words-in.topic=words
mp.messaging.incoming.words-in.auto.offset.reset=earliest
# prod
%prod.kafka.bootstrap.servers=${KAFKA_BOOTSTRAP_SERVERS}
```

```java
@ApplicationScoped
public class Words {
    @Channel("words-out") Emitter<String> emitter;
    void onStart(@Observes StartupEvent e) { emitter.send("hello"); }

    @Incoming("words-in")
    public void sink(String w) { /* process */ }
}
```

- Channel names link config (`mp.messaging.{incoming|outgoing}.<channel>.*`) to code. The connector ID is `smallrye-kafka`; it is inferred automatically only when it is the single messaging connector on the classpath (with AMQP or another connector also installed, set `mp.messaging.<direction>.<channel>.connector=smallrye-kafka` explicitly). Serializers are inferred for common types; set `value.serializer`/`value.deserializer` for custom classes, or use the JSON serde Quarkus generates for Jackson-serializable types (not verified here; test it).
- Default thread follows the method signature: a synchronous method such as `void sink(String)` already runs on a worker thread, while async signatures (`Uni`, `CompletionStage`, `Multi`) default to the event loop. `@Transactional` implies blocking. Add `@Blocking` to async-signature methods that do blocking work (JDBC, Panache), and `@NonBlocking` to force the event loop.
- Acknowledgement: payload methods are auto-acked on return; use `Message<T>` and `msg.ack()`/`nack()` for control. Add a dead-letter/failure strategy (`failure-strategy=dead-letter-queue`) for production.
- Different channel names mapped to the same `topic` go through Kafka (verified round trip). The same channel name used for `@Outgoing` and `@Incoming` in one app is an in-memory link and never reaches the broker.
- Verify in tests with `Awaitility` waiting on a collected list (verified); for broker-free tests add the test dependency `io.smallrye.reactive:smallrye-reactive-messaging-in-memory` and switch channels with `InMemoryConnector` (see the Quarkus Kafka/messaging guides; not verified here).
- AMQP: `quarkus-messaging-amqp` (`mp.messaging.*.connector=smallrye-amqp`); the AMQP Dev Service starts an ActiveMQ Artemis broker. Not verified here.
