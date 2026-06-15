# java-to-ts-ts

## purpose

Rewriting Java source code as idiomatic TypeScript — mapping Java's class-based OOP, generics, annotations, collections, and concurrency patterns to their TypeScript equivalents.

## rules

1. Java class hierarchies map to TypeScript interfaces + classes. Prefer interfaces over abstract classes for defining contracts. Java `implements Interface` maps directly to TypeScript `implements Interface`. Java `extends AbstractClass` maps to TypeScript `extends BaseClass`.
2. Java generics map to TypeScript generics with the same `<T>` syntax. Key difference: Java generics are erased at runtime; TypeScript generics are erased at compile time. Both are structural at their core. Java bounded wildcards (`? extends T`) map to TS constrained generics (`<U extends T>`). Java `? super T` has no direct TS equivalent — use a union or contravariant generic.
3. Java annotations (`@Override`, `@Deprecated`, `@JsonProperty`) have no built-in TS equivalent. Map to: TS decorators (experimental, stage 3), JSDoc comments, or runtime metadata patterns. For simple markers like `@Override`, simply remove them — TS enforces override correctness with the `override` keyword.
4. Java `Optional<T>` maps to `T | null` or `T | undefined`. `Optional.of(x)` → just `x`, `Optional.empty()` → `null`, `Optional.isPresent()` → `!= null`, `Optional.map(fn)` → optional chaining + nullish coalescing (`x?.transform() ?? default`).
5. Java checked exceptions do not exist in TypeScript. Remove `throws` declarations from method signatures. Convert `try/catch` blocks but let unexpected errors propagate naturally. Document thrown errors in JSDoc if important for callers.
6. Java `final` maps to `readonly` for class fields and `const` for local variables. Java `final` on method parameters has no TS equivalent (parameters are already effectively final by convention).
7. Java `static` methods and fields map directly to TypeScript `static`. Java static utility classes (e.g., `Collections`, `Math`) often map better to standalone exported functions rather than a class with all-static members.
8. Java `enum` maps to TypeScript `enum` for simple cases, but prefer string literal unions for most use cases. Java enums with methods and fields → TypeScript `as const` object + associated functions or a class hierarchy.
9. Java `Stream` API maps to TypeScript array methods. `stream().filter().map().collect(Collectors.toList())` becomes `.filter().map()`. `Collectors.toMap()` → `reduce()` or `Object.fromEntries()`. `Collectors.groupingBy()` → `Object.groupBy()` or `reduce()`.
10. Java `synchronized` / `volatile` / `Lock` have no TypeScript equivalent (JS is single-threaded). Remove synchronization primitives entirely. If the Java code uses threads for parallelism, redesign around `Promise.all()`, async/await, or worker threads.
11. Java `Map<K,V>` maps to `Map<K,V>` (JS built-in) or `Record<string, V>` for string-keyed maps. `List<T>` → `T[]` or `Array<T>`. `Set<T>` → `Set<T>`. Java `HashMap`/`TreeMap` distinctions are irrelevant — JS `Map` has insertion-order iteration.
12. Java getter/setter pairs (`getName()`/`setName()`) should be simplified to direct property access in TS. Only use `get`/`set` accessors if validation or side effects are needed.
13. Java `StringBuilder` / string concatenation in loops → template literals or `Array.join()`. TS strings are immutable like Java strings, but template literals handle most interpolation needs.
14. Java package structure (`com.example.app.service`) does NOT map to deeply nested TS folders. Flatten to a pragmatic folder structure: `src/services/`, `src/models/`, etc. Use barrel files (`index.ts`) for clean re-exports.
15. **Lombok `@Data`** generates getters, setters, `equals()`, `hashCode()`, `toString()`, and a required-args constructor. In TypeScript, replace with a plain `interface` (for data-only types) or a `class` with `public` constructor parameters. Remove all generated method equivalents — TS doesn't need them.
16. **Lombok `@Builder`** generates a fluent builder class. Replace with a TypeScript options interface: `new Foo({ bar, baz })` or a factory function. The builder pattern is unnecessary when constructors accept named parameters via object destructuring.
17. **Lombok `@Getter`/`@Setter`** on individual fields → direct `public` property access in TS. If the field was `@Getter` only (read-only), use `readonly`. If `@Setter` has custom logic, use a TS `set` accessor.
18. **Lombok `@AllArgsConstructor`/`@NoArgsConstructor`/`@RequiredArgsConstructor`** → TypeScript constructor with explicit parameters. `@NoArgsConstructor` on a data class → all properties optional or have defaults. `@RequiredArgsConstructor` → constructor with only `final` fields as parameters.
19. **Lombok `@Slf4j`** generates a `private static final Logger log` field. Replace with a module-level logger: `import pino from 'pino'; const log = pino({ name: 'MyClass' });` or accept a logger via constructor injection.
20. **Lombok `@Value`** (immutable `@Data`) → TypeScript `interface` with all `readonly` fields, or use `Readonly<T>` utility type.
21. **`CompletableFuture<T>`** maps to `Promise<T>`. `thenApply(fn)` → `.then(fn)`, `thenCompose(fn)` → `.then(fn)` (Promise auto-flattens), `exceptionally(fn)` → `.catch(fn)`, `thenAccept(fn)` → `.then(fn)` (when return is void).
22. **`CompletableFuture.allOf()`** → `Promise.all()`. `CompletableFuture.anyOf()` → `Promise.race()`. `CompletableFuture.supplyAsync(fn, executor)` → just call the async function directly (no executor needed in single-threaded JS).
23. **`CompletableFuture` chains** should be rewritten as `async/await` for readability. A chain of `.thenApply().thenCompose().exceptionally()` becomes a simple `try { const a = await step1(); const b = await step2(a); } catch (e) { ... }`.
24. **`@FunctionalInterface`** annotations → TypeScript function type aliases. `@FunctionalInterface interface Handler<T> { void handle(T t); }` becomes `type Handler<T> = (t: T) => void`.

## patterns

### Java class hierarchy → TypeScript interfaces + classes

```java
// --- Before (Java) ---
public interface MessageHandler {
    void handle(Message message);
    boolean canHandle(String type);
}

public abstract class BaseHandler implements MessageHandler {
    protected final Logger logger;

    public BaseHandler(Logger logger) {
        this.logger = logger;
    }

    @Override
    public boolean canHandle(String type) {
        return getSupportedTypes().contains(type);
    }

    protected abstract Set<String> getSupportedTypes();
}

public class SlashCommandHandler extends BaseHandler {
    private final CommandRegistry registry;

    public SlashCommandHandler(Logger logger, CommandRegistry registry) {
        super(logger);
        this.registry = registry;
    }

    @Override
    public void handle(Message message) {
        String command = message.getText().split(" ")[0];
        registry.execute(command, message);
    }

    @Override
    protected Set<String> getSupportedTypes() {
        return Set.of("slash_command", "block_actions");
    }
}
```

```typescript
// --- After (TypeScript) ---
interface MessageHandler {
  handle(message: Message): void;
  canHandle(type: string): boolean;
}

abstract class BaseHandler implements MessageHandler {
  constructor(protected readonly logger: Logger) {}

  canHandle(type: string): boolean {
    return this.getSupportedTypes().has(type);
  }

  abstract handle(message: Message): void;
  protected abstract getSupportedTypes(): Set<string>;
}

class SlashCommandHandler extends BaseHandler {
  constructor(
    logger: Logger,
    private readonly registry: CommandRegistry,
  ) {
    super(logger);
  }

  handle(message: Message): void {
    const command = message.text.split(' ')[0];
    this.registry.execute(command, message);
  }

  protected getSupportedTypes(): Set<string> {
    return new Set(['slash_command', 'block_actions']);
  }
}
```

### Java Stream API → TypeScript array methods

```java
// --- Before (Java) ---
import java.util.stream.Collectors;

List<UserDTO> activeUsers = users.stream()
    .filter(u -> u.isActive())
    .filter(u -> !u.getRole().equals(Role.GUEST))
    .sorted(Comparator.comparing(User::getName))
    .map(u -> new UserDTO(u.getName(), u.getEmail()))
    .collect(Collectors.toList());

Map<String, List<User>> byDepartment = users.stream()
    .collect(Collectors.groupingBy(User::getDepartment));

Optional<User> admin = users.stream()
    .filter(u -> u.getRole().equals(Role.ADMIN))
    .findFirst();
```

```typescript
// --- After (TypeScript) ---
interface UserDTO {
  name: string;
  email: string;
}

const activeUsers: UserDTO[] = users
  .filter((u) => u.active)
  .filter((u) => u.role !== 'guest')
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((u) => ({ name: u.name, email: u.email }));

const byDepartment: Record<string, User[]> = Object.groupBy(
  users,
  (u) => u.department,
) as Record<string, User[]>;

const admin: User | undefined = users.find((u) => u.role === 'admin');
```

### Java enum with behavior → TypeScript const object + functions

```java
// --- Before (Java) ---
public enum Priority {
    HIGH(1, "High Priority"),
    MEDIUM(2, "Medium Priority"),
    LOW(3, "Low Priority");

    private final int level;
    private final String label;

    Priority(int level, String label) {
        this.level = level;
        this.label = label;
    }

    public int getLevel() { return level; }
    public String getLabel() { return label; }

    public boolean isUrgent() {
        return this == HIGH;
    }
}
```

```typescript
// --- After (TypeScript) ---
const Priority = {
  HIGH: { level: 1, label: 'High Priority' },
  MEDIUM: { level: 2, label: 'Medium Priority' },
  LOW: { level: 3, label: 'Low Priority' },
} as const;

type PriorityKey = keyof typeof Priority;
type PriorityValue = (typeof Priority)[PriorityKey];

function isUrgent(priority: PriorityValue): boolean {
  return priority === Priority.HIGH;
}
```

### Lombok @Data/@Builder → TypeScript interface + options constructor

```java
// --- Before (Java with Lombok) ---
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

@Data
@Builder
@Slf4j
public class SlackMessage {
    private final String channel;
    private final String text;
    private final String threadTs;
    private final boolean unfurlLinks;
    private final List<Attachment> attachments;

    public void send(WebClient client) {
        log.info("Sending message to {}", channel);
        client.chatPostMessage(r -> r
            .channel(channel)
            .text(text)
            .threadTs(threadTs)
            .unfurlLinks(unfurlLinks)
            .attachments(attachments));
    }
}

// Usage with builder:
SlackMessage msg = SlackMessage.builder()
    .channel("#general")
    .text("Hello!")
    .unfurlLinks(false)
    .build();
msg.send(client);
```

```typescript
// --- After (TypeScript) ---
import pino from 'pino';

const log = pino({ name: 'SlackMessage' });

interface SlackMessageOptions {
  channel: string;
  text: string;
  threadTs?: string;
  unfurlLinks?: boolean;
  attachments?: Attachment[];
}

// Interface replaces @Data — no getters/setters/equals/hashCode/toString needed
// Options object replaces @Builder — named params via destructuring
class SlackMessage {
  readonly channel: string;
  readonly text: string;
  readonly threadTs?: string;
  readonly unfurlLinks: boolean;
  readonly attachments: Attachment[];

  constructor({
    channel,
    text,
    threadTs,
    unfurlLinks = false,
    attachments = [],
  }: SlackMessageOptions) {
    this.channel = channel;
    this.text = text;
    this.threadTs = threadTs;
    this.unfurlLinks = unfurlLinks;
    this.attachments = attachments;
  }

  send(client: WebClient): void {
    log.info(`Sending message to ${this.channel}`);
    client.chat.postMessage({
      channel: this.channel,
      text: this.text,
      thread_ts: this.threadTs,
      unfurl_links: this.unfurlLinks,
      attachments: this.attachments,
    });
  }
}

// Usage — options object replaces builder chain:
const msg = new SlackMessage({
  channel: '#general',
  text: 'Hello!',
  unfurlLinks: false,
});
msg.send(client);
```

### CompletableFuture chain → async/await

```java
// --- Before (Java) ---
import java.util.concurrent.CompletableFuture;

public class AsyncSlackClient {
    private final MethodsClient client;
    private final ExecutorService executor;

    public CompletableFuture<String> fetchAndNotify(String userId, String channel) {
        return CompletableFuture.supplyAsync(() -> client.usersInfo(r -> r.user(userId)), executor)
            .thenApply(response -> response.getUser().getRealName())
            .thenCompose(name -> CompletableFuture.supplyAsync(
                () -> client.chatPostMessage(r -> r.channel(channel).text("Hello " + name)),
                executor
            ))
            .thenApply(response -> response.getTs())
            .exceptionally(ex -> {
                log.error("Failed: {}", ex.getMessage());
                return null;
            });
    }

    public CompletableFuture<List<String>> fetchMultipleUsers(List<String> userIds) {
        List<CompletableFuture<String>> futures = userIds.stream()
            .map(id -> CompletableFuture.supplyAsync(
                () -> client.usersInfo(r -> r.user(id)).getUser().getRealName(),
                executor
            ))
            .collect(Collectors.toList());

        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .thenApply(v -> futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList()));
    }
}
```

```typescript
// --- After (TypeScript) ---
class AsyncSlackClient {
  constructor(private readonly client: WebClient) {}

  // CompletableFuture chain → simple async/await
  async fetchAndNotify(userId: string, channel: string): Promise<string | null> {
    try {
      const userResponse = await this.client.users.info({ user: userId });
      const name = userResponse.user?.real_name ?? 'Unknown';
      const msgResponse = await this.client.chat.postMessage({
        channel,
        text: `Hello ${name}`,
      });
      return msgResponse.ts ?? null;
    } catch (err) {
      log.error(`Failed: ${(err as Error).message}`);
      return null;
    }
  }

  // CompletableFuture.allOf → Promise.all
  async fetchMultipleUsers(userIds: string[]): Promise<string[]> {
    const results = await Promise.all(
      userIds.map(async (id) => {
        const response = await this.client.users.info({ user: id });
        return response.user?.real_name ?? 'Unknown';
      }),
    );
    return results;
  }
}
```

### @FunctionalInterface → TypeScript function types

```java
// --- Before (Java) ---
@FunctionalInterface
public interface BoltEventHandler<E extends Event> {
    Response apply(EventsApiPayload<E> payload, EventContext context) throws Exception;
}

@FunctionalInterface
public interface Middleware {
    Response apply(Request req, Response resp, MiddlewareChain chain) throws Exception;
}

// Usage:
app.event(AppMentionEvent.class, (payload, ctx) -> {
    ctx.say("Hello!");
    return ctx.ack();
});
```

```typescript
// --- After (TypeScript) ---
// @FunctionalInterface → type alias for the function signature
type BoltEventHandler<E extends Event> = (
  payload: EventsApiPayload<E>,
  context: EventContext,
) => Promise<Response>;

type Middleware = (
  req: Request,
  resp: Response,
  chain: MiddlewareChain,
) => Promise<Response>;

// Usage — identical lambda syntax:
app.event(AppMentionEvent, async (payload, ctx) => {
  await ctx.say('Hello!');
  return ctx.ack();
});
```

## pitfalls

- **Null vs undefined**: Java has one null; TypeScript has `null` AND `undefined`. Decide on a convention early. Recommendation: use `undefined` for "not provided" (optional params), `null` for "explicitly empty" (API responses).
- **No method overloading at runtime**: Java allows multiple methods with the same name but different signatures. TypeScript supports overload signatures but only one implementation. Merge overloads into a single function with union parameter types.
- **Access modifiers are compile-time only**: TypeScript's `private`/`protected` are erased at runtime (unlike Java). For true runtime privacy, use `#privateField` (ES2022 private fields).
- **No runtime type checking**: Java's `instanceof` checks actual class identity. TypeScript's `instanceof` works for classes but NOT for interfaces (they're erased). Use discriminated unions or type guard functions instead.
- **Collections are not auto-imported**: Java's `List`, `Map`, `Set` are imports from `java.util`. TypeScript's `Array`, `Map`, `Set` are global built-ins — no import needed. But helper methods like `Object.groupBy()` may need a polyfill.
- **Checked exceptions disappear**: Java forces callers to handle checked exceptions. TypeScript has no mechanism for this. Document important error conditions in JSDoc comments.
- **Java `equals()` vs TS `===`**: Java objects use `.equals()` for value comparison. TS `===` compares references for objects. Use deep-equal libraries or compare relevant fields explicitly.
- **Thread safety patterns are dead code**: Remove all `synchronized`, `volatile`, `Lock`, `Atomic*` patterns. JS is single-threaded. Keeping them adds confusion with zero benefit.
- **Builder pattern is often unnecessary**: Java builders exist because constructors can't have named parameters. TypeScript objects with optional properties serve the same purpose more concisely.
- **Over-engineering inheritance**: Java projects often have deep class hierarchies. In TypeScript, prefer composition and interfaces. Flatten hierarchies where possible — if a class exists only to share one method, use a utility function instead.
- **Lombok `@Data` on mutable classes**: If the Java class was mutable (setters used), decide whether TS version should be mutable too. Often the answer is no — make properties `readonly` and create new instances instead of mutating.
- **Lombok `@Builder.Default`**: Default values in Lombok builders (`@Builder.Default private boolean unfurlLinks = true`) must become explicit defaults in the TS constructor destructuring: `{ unfurlLinks = true }: Options`.
- **`CompletableFuture.join()` blocks the thread**: There is NO blocking equivalent in JS. `await` is non-blocking. Code that uses `join()` for synchronous access must be redesigned to be fully async.
- **`ExecutorService` thread pools**: Remove entirely. JS is single-threaded. `Promise.all()` provides concurrency for I/O-bound work without thread management. For CPU-bound work, use worker threads only if profiling shows a bottleneck.
- **`@FunctionalInterface` with checked exceptions**: Java functional interfaces can declare `throws Exception`. TypeScript function types cannot. Async functions that reject should document their error types in JSDoc but cannot enforce catching at the type level.

## references

- https://www.typescriptlang.org/docs/handbook/2/classes.html -- TS classes and inheritance
- https://www.typescriptlang.org/docs/handbook/2/generics.html -- TS generics
- https://www.typescriptlang.org/docs/handbook/decorators.html -- TS decorators (annotation equivalent)
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map -- JS Map (HashMap equivalent)
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise -- Promise (Future equivalent)

## instructions

Use this expert when rewriting Java source code in TypeScript. Start by identifying the Java patterns in use (class hierarchies, generics, annotations, Lombok annotations, Stream API, CompletableFuture chains, functional interfaces, concurrency, Optional) and map each to its TS equivalent. Focus on simplification: flatten unnecessary class hierarchies, replace Lombok @Data/@Builder with interfaces and options objects, remove builder patterns in favor of typed options objects, rewrite CompletableFuture chains as async/await, convert @FunctionalInterface to type aliases, eliminate synchronization code, and convert getters/setters to direct property access. Pair with `dependency-mapping-ts.md` for Maven/Gradle → npm equivalents, `type-mapping-ts.md` for cross-language type reference, and `json-serialization-ts.md` for Gson/Jackson serialization conversion.

## research

Deep Research prompt:

"Write a micro expert on converting Java to TypeScript. Cover: class hierarchies to interfaces/classes, generics mapping, annotations to decorators, Stream API to array methods, Optional to nullable types, checked exceptions removal, synchronized/volatile removal, enum with behavior to const objects, getter/setter simplification, builder pattern elimination, and package structure flattening. Include 3 worked examples."
