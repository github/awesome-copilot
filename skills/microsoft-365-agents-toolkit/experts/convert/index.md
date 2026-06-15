# convert-router

## purpose

Route language-conversion tasks to the minimal set of micro-expert files. Each expert covers rewriting source code from one language into idiomatic TypeScript.

## task clusters

### JS → TypeScript
When: converting JavaScript files to TypeScript, adding types, modernizing imports, enabling strict mode
Read:
- `js-to-ts-ts.md`
Depends on: `type-mapping-ts.md` (type system reference)

### Ruby → TypeScript
When: rewriting Ruby code in TypeScript, translating Ruby idioms, converting gems to npm
Read:
- `ruby-to-ts-ts.md`
- `dependency-mapping-ts.md`
Depends on: `type-mapping-ts.md` (type system reference)

### Java → TypeScript
When: rewriting Java code in TypeScript, translating Java OOP patterns, Lombok annotations, CompletableFuture async, converting Maven/Gradle deps to npm
Read:
- `java-to-ts-ts.md`
- `json-serialization-ts.md`
- `dependency-mapping-ts.md`
Depends on: `type-mapping-ts.md` (type system reference)

### Kotlin → TypeScript
When: rewriting Kotlin code in TypeScript, trailing lambdas, SAM conversions, `it` implicit parameter, string templates, `trimIndent()`, null-safety operators (`?.`, `!!`, `?:`), `when` expressions, extension functions, data classes, companion objects, sealed classes, `::class.java` references
Read:
- `kotlin-to-ts-ts.md`
- `java-to-ts-ts.md` (Kotlin uses Java SDK types)
- `dependency-mapping-ts.md`
Depends on: `type-mapping-ts.md` (type system reference)

### JSON serialization conversion
When: converting Gson/Jackson serialization to TypeScript JSON + Zod, polymorphic deserialization, @SerializedName mapping
Read:
- `json-serialization-ts.md`
Depends on: `type-mapping-ts.md` (type system reference)

### Bulk/large-scale conversion
When: converting 50+ source files, planning phased conversion, tracking progress across many files
Read:
- `bulk-conversion-strategy-ts.md`
Depends on: The appropriate language-specific expert

### Cross-language dependency mapping
When: finding npm equivalents for gems, Maven artifacts, or pip packages
Read:
- `dependency-mapping-ts.md`

### Cross-language type mapping
When: translating type systems between languages, mapping nullable/generic/enum patterns to TypeScript
Read:
- `type-mapping-ts.md`

### Composite: Full language conversion
When: complete end-to-end source rewrite from any supported language to TypeScript
Read:
- The appropriate language-specific expert (`js-to-ts-ts.md`, `ruby-to-ts-ts.md`, `java-to-ts-ts.md`, or `kotlin-to-ts-ts.md`)
- `json-serialization-ts.md` (if Java source with Gson/Jackson)
- `bulk-conversion-strategy-ts.md` (if 50+ source files)
- `dependency-mapping-ts.md`
- `type-mapping-ts.md`
Cross-domain deps: If also bridging platforms, pair with `../bridge/index.md` for Slack↔Teams or AWS↔Azure concerns.

## combining rule

If a request involves **language conversion** and **platform bridging**, read the language-specific expert here first (to rewrite the source), then route through `../bridge/index.md` for platform-specific mapping.

## file inventory

`bulk-conversion-strategy-ts.md` | `dependency-mapping-ts.md` | `java-to-ts-ts.md` | `js-to-ts-ts.md` | `json-serialization-ts.md` | `kotlin-to-ts-ts.md` | `ruby-to-ts-ts.md` | `type-mapping-ts.md`

<!-- Updated 2026-02-11: Added json-serialization-ts.md and bulk-conversion-strategy-ts.md for Java SDK conversion support -->
<!-- Updated 2026-02-11: Added kotlin-to-ts-ts.md for Kotlin-specific syntax (trailing lambdas, it, string templates, null-safety, when, extension functions, data class, sealed class) -->
