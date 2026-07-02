# kotlin-to-ts-ts

## purpose

Rewriting Kotlin source code as idiomatic TypeScript — covering Kotlin-specific syntax (trailing lambdas, null-safety operators, string templates, `it`, `when`, extension functions) that the Java-to-TS expert does not address.

## rules

1. Kotlin string templates (`"Hello $name"`, `"text ${expr}"`) map directly to TypeScript template literals (`` `Hello ${name}` ``, `` `text ${expr}` ``). Multi-line strings with `.trimIndent()` become TS template literals with no call needed — TS template literals already preserve literal indentation.
2. Kotlin trailing lambda syntax (`app.command("/echo") { req, ctx -> ... }`) maps to a callback argument: `app.command("/echo", async (req, ctx) => { ... })`. The lambda body `{ ... }` becomes `async (...) => { ... }` when the target API is async.
3. Kotlin SAM (Single Abstract Method) conversions — where a lambda replaces a single-method interface — map to TypeScript function arguments directly. `app.event(handler)` where `handler` is a lambda becomes `app.on("event", async (ctx) => { ... })`.
4. Kotlin `it` (implicit single-parameter lambda) must be given an explicit name in TS. `list.filter { it.isActive }` becomes `list.filter((item) => item.isActive)`. Choose a meaningful name from context (`req`, `ctx`, `msg`, `user`, etc.).
5. Kotlin null-safety operator `?.` maps to TS optional chaining `?.`. Kotlin `!!` (non-null assertion) maps to TS `!` (non-null assertion). Kotlin elvis `?:` maps to TS nullish coalescing `??`. Examples: `user?.name` → `user?.name`, `value!!` → `value!`, `name ?: "default"` → `name ?? "default"`.
6. Kotlin `when` expressions map to TS `switch` statements or chained ternaries. `when` with no subject (boolean conditions) maps to `if/else if`. `when` with a subject (value matching) maps to `switch`. If used as an expression (assigned to a variable), prefer chained ternaries or an IIFE wrapping a `switch`.
7. Kotlin `val` maps to `const` (for locals) or `readonly` (for class fields). Kotlin `var` maps to `let`. Never use `var` in the TS output — always `const` or `let`.
8. Kotlin `fun` at package level (top-level functions) maps to TS exported functions: `export function myFn() { ... }`. Kotlin does not require a wrapping class for top-level functions, and neither does TS.
9. Kotlin extension functions (`fun String.toSlug(): String`) have no direct TS equivalent. Convert to a standalone utility function: `function toSlug(s: string): string`. If the extension is on a project type, consider adding a method to the class instead.
10. Kotlin `data class` maps to a TypeScript `interface` (for pure data) or a `class` with constructor shorthand (if methods are needed). `data class User(val name: String, val email: String)` → `interface User { readonly name: string; readonly email: string; }`. Destructuring `val (name, email) = user` → `const { name, email } = user`.
11. Kotlin `object` declarations (singletons) map to a plain TS module-level `const` object or a namespace. `object Config { val port = 3000 }` → `const Config = { port: 3000 } as const`. Kotlin `companion object` maps to `static` members on the class or module-level constants.
12. Kotlin `sealed class` / `sealed interface` maps to TS discriminated union types. `sealed class Result` with subclasses `Success` and `Error` → `type Result = { kind: 'success'; value: T } | { kind: 'error'; error: string }`.
13. Kotlin scope functions (`let`, `run`, `apply`, `also`, `with`) should be inlined rather than translated literally. `user?.let { sendEmail(it) }` → `if (user) sendEmail(user)`. `config.apply { port = 3000; host = "localhost" }` → direct property assignments.
14. Kotlin `listOf()`, `mapOf()`, `mutableListOf()`, `mutableMapOf()` map to TS array/object literals: `listOf("a", "b")` → `["a", "b"]`, `mapOf("key" to "value")` → `{ key: "value" }` or `new Map([["key", "value"]])`.
15. Kotlin `for (item in list)` maps to `for (const item of list)`. Kotlin ranges `for (i in 0 until n)` → `for (let i = 0; i < n; i++)`. Kotlin `for (i in 0..n)` (inclusive) → `for (let i = 0; i <= n; i++)`.
16. Kotlin type casts: `as` (unsafe cast) → TS `as` (type assertion). `as?` (safe cast) → TS has no direct equivalent; use a type guard function or conditional check.
17. Kotlin `::class.java` / `SomeClass::class.java` (class references for reflection) should be removed. In the Slack Bolt SDK, `app.event(AppMentionEvent::class.java) { ... }` becomes a string-based route: `app.on("message", async (ctx) => { ... })` in Teams.

## patterns

### Trailing lambda + ack pattern (Slack Bolt → Teams)

```kotlin
// --- Before (Kotlin) ---
app.command("/echo") { req, ctx ->
    val text = "You said ${req.payload.text} at <#${req.payload.channelId}|${req.payload.channelName}>"
    ctx.respond { it.text(text) }
    ctx.ack()
}
```

```typescript
// --- After (TypeScript, Teams SDK) ---
app.on('message', async ({ activity, send }) => {
  const text = `You said ${activity.text}`;
  await send(text);
});
```

### Null-safety chain

```kotlin
// --- Before (Kotlin) ---
val hash = event.event.view?.hash
val name = user?.profile?.displayName ?: "Unknown"
val id = data!!.userId
```

```typescript
// --- After (TypeScript) ---
const hash = event.event.view?.hash;
const name = user?.profile?.displayName ?? 'Unknown';
const id = data!.userId;
```

### String templates + trimIndent

```kotlin
// --- Before (Kotlin) ---
val view = """
{
  "type": "home",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "Hello ${user.name}! Updated: ${ZonedDateTime.now()}"
      }
    }
  ]
}
""".trimIndent()
```

```typescript
// --- After (TypeScript) ---
const view = {
  type: 'home' as const,
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Hello ${user.name}! Updated: ${new Date().toISOString()}`,
      },
    },
  ],
};
// Prefer a typed object over a JSON string when the target SDK accepts objects.
// If a raw string is truly needed:
const viewJson = JSON.stringify(view);
```

### When expression → switch

```kotlin
// --- Before (Kotlin) ---
val response = when (action) {
    "approve" -> "Approved!"
    "reject" -> "Rejected."
    "defer" -> "Deferred to next week."
    else -> "Unknown action: $action"
}
```

```typescript
// --- After (TypeScript) ---
let response: string;
switch (action) {
  case 'approve':
    response = 'Approved!';
    break;
  case 'reject':
    response = 'Rejected.';
    break;
  case 'defer':
    response = 'Deferred to next week.';
    break;
  default:
    response = `Unknown action: ${action}`;
}
```

### Scope function inlining

```kotlin
// --- Before (Kotlin) ---
val result = config.apply {
    port = 3000
    host = "localhost"
}

user?.let { ctx.say("Hello ${it.name}") }

val mapped = items.map { it.name to it.value }.toMap()
```

```typescript
// --- After (TypeScript) ---
const config = { port: 3000, host: 'localhost' };

if (user) {
  await send(`Hello ${user.name}`);
}

const mapped = Object.fromEntries(items.map((item) => [item.name, item.value]));
```

### Object declaration / companion object

```kotlin
// --- Before (Kotlin) ---
class ResourceLoader {
    companion object {
        fun loadAppConfig(name: String = "appConfig.json"): AppConfig {
            // ...
        }
    }
}
// Usage: ResourceLoader.loadAppConfig()
```

```typescript
// --- After (TypeScript) ---
// Companion object → module-level function (no class wrapper needed)
export function loadAppConfig(name = 'appConfig.json'): AppConfig {
  // ...
}
// Usage: loadAppConfig()
```

## pitfalls

- **Forgetting to name `it`**: Every Kotlin `it` reference must get an explicit TS parameter name. Blindly searching for `it` will produce false positives on English words — search for `{ it.` and `{ it ->` patterns.
- **`trimIndent()` on JSON strings**: Kotlin examples often build JSON as `.trimIndent()` multiline strings. In TS, prefer a typed object literal instead of a string. If the target API needs a string, use `JSON.stringify(obj)` for safety over manual template literals.
- **`!!` overuse**: Kotlin's `!!` means "throw if null". TS's `!` is only a compile-time assertion — it does NOT throw at runtime. If the Kotlin code relies on `!!` for runtime safety, add an explicit null check instead.
- **`as?` safe cast**: Kotlin's `as?` returns `null` if the cast fails. TS's `as` never fails at runtime (it's a compile-time assertion). Translate `as?` to a type guard check, not a bare `as`.
- **Trailing lambda position**: Kotlin allows the last lambda argument to be outside the parentheses. In TS, ALL arguments go inside the parentheses. `app.command("/echo") { req, ctx -> }` → `app.command("/echo", async (req, ctx) => { })`.
- **`listOf()` / `mapOf()` immutability**: Kotlin's `listOf()` returns an immutable list. TS arrays are mutable by default. If immutability matters, use `as const` or `ReadonlyArray<T>`.
- **Class reference syntax**: `SomeClass::class.java` in Kotlin (used for event type registration in Slack Bolt) has no TS equivalent. Replace with the string event name expected by the target SDK.
- **Extension functions on primitives**: Kotlin can extend `String`, `Int`, etc. TS cannot extend primitive types. Always convert to standalone functions.
- **Destructuring data classes**: Kotlin `val (a, b) = pair` uses `componentN()` functions. TS destructuring uses property names: `const { first, second } = pair`. The names must match.

## references

- https://kotlinlang.org/docs/basic-syntax.html — Kotlin syntax reference
- https://kotlinlang.org/docs/null-safety.html — Kotlin null-safety operators
- https://kotlinlang.org/docs/lambdas.html — Kotlin lambda syntax and SAM conversions
- https://kotlinlang.org/docs/scope-functions.html — let, run, apply, also, with
- https://kotlinlang.org/docs/data-classes.html — Data classes
- https://kotlinlang.org/docs/extensions.html — Extension functions
- https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html — TS template literals
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html — TS type narrowing and guards

## instructions

Use this expert when the source code is Kotlin (`.kt` files). It handles Kotlin-specific syntax that the `java-to-ts-ts.md` expert does not cover: trailing lambdas, `it` implicit parameters, string templates, `trimIndent()`, null-safety operators (`?.`, `!!`, `?:`), `when` expressions, scope functions, extension functions, `data class`, `object`/`companion object`, sealed classes, and `::class.java` references. For Java SDK types, generics, collections, and Lombok patterns, pair with `java-to-ts-ts.md`. For type system mapping, pair with `type-mapping-ts.md`.

## research

Deep Research prompt:

"Write a micro expert on converting Kotlin to TypeScript. Cover: string templates to template literals, trailing lambda syntax to callback arguments, SAM conversions, it implicit parameter, null-safety operators (?. !! ?:) to optional chaining/nullish coalescing/non-null assertion, when expressions to switch, val/var to const/let, extension functions to utility functions, data class to interface, object declarations to module constants, sealed class to discriminated unions, scope functions (let/run/apply/also/with) inlining, and class reference syntax removal. Include 4-5 worked side-by-side examples."
