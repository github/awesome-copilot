# type-mapping-ts

## purpose

Cross-language type system mapping reference — translating type concepts from JavaScript, Ruby, and Java into idiomatic TypeScript types, covering primitives, nullability, generics, collections, enums, and structural patterns.

## rules

1. Map primitive types using the canonical table below. TypeScript uses lowercase for primitives (`string`, `number`, `boolean`) — never use the wrapper types (`String`, `Number`, `Boolean`).
2. Nullable types: Java `@Nullable T` and Ruby's implicit nil-ability both map to `T | null`. For optional parameters/properties, use `T | undefined` (or the `?` optional marker). Distinguish between "explicitly null" and "not provided".
3. Generic type parameters use the same `<T>` syntax across Java and TypeScript. Ruby has no generics — infer types from usage patterns and add explicit generic parameters during conversion.
4. Collection types: Java `List<T>` → `T[]`, Java `Map<K,V>` → `Map<K,V>` or `Record<string, V>`, Java `Set<T>` → `Set<T>`. Ruby `Array` → `T[]`, Ruby `Hash` → `Record<string, T>` or `Map`.
5. Union types (`A | B`) are TypeScript's killer feature with no direct Java or Ruby equivalent. Use them liberally to replace: Java method overloading, Ruby duck-typed parameters that accept multiple types, and stringly-typed fields.
6. Discriminated unions replace Java's visitor pattern and Ruby's case-when on class type. Add a `type` or `kind` literal field to each variant for exhaustive narrowing.
7. TypeScript `unknown` is safer than `any`. Use `unknown` for values from external sources (API responses, user input, parsed JSON) and narrow with type guards. Reserve `any` for temporary migration scaffolding.
8. Ruby symbols (`:name`) and Java string constants (`public static final String`) both map to string literal types: `type Role = 'admin' | 'user' | 'guest'`.
9. Java `void` maps to TypeScript `void`. Ruby methods that return `nil` implicitly map to `void` return type (or `T | undefined` if the nil return is meaningful).
10. Tuple types (`[string, number]`) are useful when converting Ruby methods that return multiple values (`return name, age`) or Java `Pair<A, B>` / `Map.Entry<K, V>`.
11. Use `readonly` modifier for properties that were `final` in Java or `freeze`-d in Ruby. Use `Readonly<T>` utility type for deeply immutable objects.
12. Index signatures (`[key: string]: T`) replace Java's `Map<String, Object>` and Ruby's open hashes when the key set is not known at compile time.

## patterns

### Primitive type mapping table

| Concept | Java | Ruby | JavaScript | TypeScript |
|---|---|---|---|---|
| String | `String` | `String` | `string` | `string` |
| Integer | `int` / `Integer` | `Integer` / `Fixnum` | `number` | `number` |
| Float | `double` / `Double` / `float` | `Float` | `number` | `number` |
| Big integer | `BigInteger` / `long` | `Bignum` | `bigint` | `bigint` |
| Boolean | `boolean` / `Boolean` | `TrueClass`/`FalseClass` | `boolean` | `boolean` |
| Null | `null` | `nil` | `null` | `null` |
| Undefined | N/A | N/A | `undefined` | `undefined` |
| Void | `void` | implicit nil | `undefined` | `void` |
| Any/Object | `Object` | `Object` | `any` | `unknown` (preferred) or `any` |
| Byte array | `byte[]` | `String` (binary) | `Uint8Array` | `Uint8Array` or `Buffer` |
| Date/Time | `LocalDateTime` / `Instant` | `Time` / `DateTime` | `Date` | `Date` or `Temporal` (stage 3) |
| Regex | `Pattern` | `Regexp` | `RegExp` | `RegExp` |
| Symbol | N/A | `Symbol` (`:name`) | `symbol` / string | string literal type |

### Collection type mapping table

| Concept | Java | Ruby | TypeScript |
|---|---|---|---|
| Ordered list | `List<T>` / `ArrayList<T>` | `Array` | `T[]` or `Array<T>` |
| Fixed-size tuple | `Pair<A,B>` / `record` (Java 16+) | `[a, b]` array | `[A, B]` tuple |
| Key-value map (string keys) | `Map<String, V>` | `Hash` | `Record<string, V>` |
| Key-value map (any keys) | `Map<K, V>` | `Hash` | `Map<K, V>` |
| Unique set | `Set<T>` / `HashSet<T>` | `Set` | `Set<T>` |
| Queue | `Queue<T>` / `Deque<T>` | `Array` (push/shift) | `T[]` (push/shift) |
| Immutable list | `List.of()` / `Collections.unmodifiable` | `freeze` | `readonly T[]` or `ReadonlyArray<T>` |
| Immutable map | `Map.of()` | `freeze` | `Readonly<Record<string, V>>` |

### Nullability pattern mapping

```typescript
// Java Optional<T> → TypeScript
// Java:  Optional<User> findUser(String id)
// Ruby:  def find_user(id) → User or nil
// TS:
function findUser(id: string): User | null {
  const user = db.get(id);
  return user ?? null;
}

// Java Optional chain → TypeScript optional chaining
// Java:  user.flatMap(u -> u.getAddress()).map(a -> a.getCity()).orElse("Unknown")
// Ruby:  user&.address&.city || "Unknown"
// TS:
const city = user?.address?.city ?? 'Unknown';

// Java @Nullable parameter → TypeScript optional parameter
// Java:  void send(String msg, @Nullable String channel)
// Ruby:  def send(msg, channel = nil)
// TS:
function send(msg: string, channel?: string): void {
  const target = channel ?? '#general';
  // ...
}
```

### Discriminated union (replaces Java visitor / Ruby case-when on type)

```java
// --- Java (before) ---
// Visitor pattern with 3 message types
public interface MessageVisitor {
    void visit(TextMessage msg);
    void visit(CardMessage msg);
    void visit(FileMessage msg);
}

public abstract class Message {
    public abstract void accept(MessageVisitor visitor);
}
```

```ruby
# --- Ruby (before) ---
# Case-when on class type
case message
when TextMessage
  handle_text(message)
when CardMessage
  handle_card(message)
when FileMessage
  handle_file(message)
end
```

```typescript
// --- TypeScript (after) ---
// Discriminated union replaces both patterns
interface TextMessage {
  kind: 'text';
  content: string;
}

interface CardMessage {
  kind: 'card';
  cardJson: Record<string, unknown>;
}

interface FileMessage {
  kind: 'file';
  url: string;
  mimeType: string;
}

type Message = TextMessage | CardMessage | FileMessage;

function handleMessage(msg: Message): void {
  switch (msg.kind) {
    case 'text':
      console.log(msg.content); // TS narrows to TextMessage
      break;
    case 'card':
      renderCard(msg.cardJson); // TS narrows to CardMessage
      break;
    case 'file':
      downloadFile(msg.url);   // TS narrows to FileMessage
      break;
  }
  // Exhaustive — adding a new variant causes a compile error
}
```

### Generics mapping

```java
// --- Java (before) ---
public class Repository<T extends Entity> {
    private final Map<String, T> store = new HashMap<>();

    public Optional<T> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    public List<T> findAll(Predicate<T> filter) {
        return store.values().stream()
            .filter(filter)
            .collect(Collectors.toList());
    }
}
```

```typescript
// --- TypeScript (after) ---
interface Entity {
  id: string;
}

class Repository<T extends Entity> {
  private readonly store = new Map<string, T>();

  findById(id: string): T | null {
    return this.store.get(id) ?? null;
  }

  findAll(filter: (item: T) => boolean): T[] {
    return [...this.store.values()].filter(filter);
  }
}
```

## pitfalls

- **`number` covers both int and float**: TypeScript has no integer type. If integer precision matters (IDs, counters), document the expectation or use `bigint` for very large values.
- **`null` vs `undefined` confusion**: Pick a convention. Recommendation: `undefined` for "optional/missing" (function params, object properties), `null` for "explicitly empty" (API responses, database NULLs).
- **Wrapper types**: Never use `String`, `Number`, `Boolean` as types in TypeScript. Always use lowercase `string`, `number`, `boolean`.
- **Java `int` overflow**: Java `int` is 32-bit; TypeScript `number` is 64-bit float. Values above `Number.MAX_SAFE_INTEGER` (2^53-1) lose precision. Use `bigint` if the Java code relies on exact large integer arithmetic.
- **Ruby's open type system**: Ruby allows adding methods to any object at runtime. TypeScript's type system is closed at compile time. Methods discovered via `method_missing` or `define_method` must be predefined in interfaces.
- **Enum pitfalls**: TypeScript numeric enums have reverse mapping (`Priority[1] === 'HIGH'`), which is usually unexpected. Prefer string literal unions or `as const` objects.
- **Generic variance**: Java has `? extends T` (covariant) and `? super T` (contravariant). TypeScript uses structural subtyping and generally infers variance. Explicit variance annotations (`in`/`out` modifiers) exist but are rarely needed.
- **Date handling**: Java's `java.time` and Ruby's `Time`/`DateTime` are far richer than JS `Date`. For serious date work, use `date-fns` or `luxon` rather than relying on the built-in `Date`.

## references

- https://www.typescriptlang.org/docs/handbook/2/everyday-types.html -- basic types
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html -- type narrowing and guards
- https://www.typescriptlang.org/docs/handbook/2/generics.html -- generics
- https://www.typescriptlang.org/docs/handbook/utility-types.html -- Readonly, Partial, Pick, etc.
- https://www.typescriptlang.org/docs/handbook/2/types-from-types.html -- advanced type construction

## instructions

Use this expert as a cross-language type reference when converting from any source language to TypeScript. Consult the primitive and collection mapping tables first, then use the nullability and generics patterns for complex type scenarios. This expert is a dependency of all three language-specific conversion experts — they reference it for type translation questions. Pair with the appropriate language expert (`js-to-ts-ts.md`, `ruby-to-ts-ts.md`, or `java-to-ts-ts.md`) for language-specific idiom conversion beyond types.

## research

Deep Research prompt:

"Write a micro expert for cross-language type mapping to TypeScript. Cover: primitive type mapping from Java/Ruby/JS to TS, collection type mapping (List, Map, Set, Queue), nullability patterns (Optional, nil, null/undefined), generic type parameter translation, discriminated unions replacing visitor/case-when patterns, enum mapping strategies, and common type system pitfalls when converting from statically-typed (Java) and dynamically-typed (Ruby/JS) languages."
