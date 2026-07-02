# json-serialization-ts

## purpose

Converting Java Gson/Jackson JSON serialization patterns to TypeScript — replacing custom serializers, `@SerializedName` annotations, polymorphic type factories, and schema validation with native `JSON.parse()`/`JSON.stringify()`, Zod schemas, and discriminated unions.

## rules

1. Java's Gson/Jackson are replaced by the built-in `JSON.parse()` and `JSON.stringify()`. No library needed for basic serialization. Add `zod` only when you need runtime schema validation (external API responses, user input).
2. Gson `@SerializedName("snake_case")` on Java fields maps to a Zod schema with `.transform()` for renaming, or simply use the snake_case keys directly in the TypeScript interface if the JSON wire format is snake_case (common in Slack APIs).
3. **Do NOT rename JSON fields to camelCase in the data layer.** If the API sends `thread_ts`, keep `thread_ts` in your interface. Only convert to camelCase at the application boundary if needed. This avoids serialization bugs and keeps types aligned with API docs.
4. Gson `TypeAdapter` / Jackson `@JsonTypeInfo` + `@JsonSubTypes` for polymorphic deserialization → TypeScript discriminated unions with a `type` field + Zod `z.discriminatedUnion()`. This is the most important pattern for Block Kit model conversion.
5. Gson `GsonBuilder().registerTypeAdapterFactory()` for a family of types → a single Zod discriminated union schema that handles all variants. No factory registration needed — Zod validates and narrows in one step.
6. Java `Date`/`Instant` serialized as epoch seconds or ISO strings → parse with `new Date(epoch * 1000)` or `new Date(isoString)`. Use `z.coerce.date()` in Zod for automatic string-to-Date conversion.
7. Gson `@Expose` / Jackson `@JsonIgnore` for selective serialization → TypeScript `Omit<T, 'field'>` utility type at the serialization boundary, or use a `toJSON()` method on classes.
8. Gson null handling (`serializeNulls()`) → JSON.stringify includes `null` by default but omits `undefined`. Use `null` (not `undefined`) for fields that must appear in the wire format.
9. Java `Map<String, Object>` deserialized as a catch-all → `z.record(z.string(), z.unknown())` for validated records, or `Record<string, unknown>` for type-only.
10. Custom Gson deserializers that inspect JSON structure to decide the concrete type → Zod `.transform()` pipelines or preprocess functions that inspect the raw JSON before validating.
11. Jackson `@JsonCreator` / `@JsonProperty` constructor deserialization → just use Zod `.parse()` which returns a plain object matching the schema. No special constructor needed.
12. Large model hierarchies (like Slack's Block Kit: 15+ block types, 20+ element types) should use **one discriminated union per hierarchy level**, not one giant union. This keeps validation fast and error messages readable.

## patterns

### Gson @SerializedName → TypeScript interface with wire-format keys

```java
// --- Before (Java with Gson) ---
public class SlackUser {
    @SerializedName("user_id")
    private String userId;

    @SerializedName("real_name")
    private String realName;

    @SerializedName("is_admin")
    private boolean isAdmin;

    @SerializedName("updated")
    private long updatedTimestamp;

    // Gson auto-deserializes: {"user_id":"U123","real_name":"Alice","is_admin":true,"updated":1700000000}
}
```

```typescript
// --- After (TypeScript) ---
// Keep snake_case keys to match the API wire format
interface SlackUser {
  user_id: string;
  real_name: string;
  is_admin: boolean;
  updated: number;
}

// Parse with no library — JSON.parse returns the right shape
const user: SlackUser = JSON.parse(responseBody);

// With Zod for runtime validation (recommended for external API data):
import { z } from 'zod';

const SlackUserSchema = z.object({
  user_id: z.string(),
  real_name: z.string(),
  is_admin: z.boolean(),
  updated: z.number(),
});

type SlackUser = z.infer<typeof SlackUserSchema>;

const user = SlackUserSchema.parse(JSON.parse(responseBody));
```

### Gson polymorphic TypeAdapter → Zod discriminated union

```java
// --- Before (Java with Gson) ---
// Custom factory for deserializing Block Kit blocks by "type" field
public class GsonLayoutBlockFactory implements JsonDeserializer<LayoutBlock> {
    @Override
    public LayoutBlock deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext ctx) {
        String type = json.getAsJsonObject().get("type").getAsString();
        switch (type) {
            case "section":  return ctx.deserialize(json, SectionBlock.class);
            case "actions":  return ctx.deserialize(json, ActionsBlock.class);
            case "divider":  return ctx.deserialize(json, DividerBlock.class);
            case "header":   return ctx.deserialize(json, HeaderBlock.class);
            case "image":    return ctx.deserialize(json, ImageBlock.class);
            case "context":  return ctx.deserialize(json, ContextBlock.class);
            case "input":    return ctx.deserialize(json, InputBlock.class);
            default:         throw new JsonParseException("Unknown block type: " + type);
        }
    }
}

// Registration:
Gson gson = new GsonBuilder()
    .registerTypeAdapter(LayoutBlock.class, new GsonLayoutBlockFactory())
    .create();

List<LayoutBlock> blocks = gson.fromJson(json, new TypeToken<List<LayoutBlock>>(){}.getType());
```

```typescript
// --- After (TypeScript with Zod) ---
import { z } from 'zod';

// Define each block variant schema
const SectionBlockSchema = z.object({
  type: z.literal('section'),
  block_id: z.string().optional(),
  text: z.object({ type: z.string(), text: z.string() }).optional(),
  fields: z.array(z.object({ type: z.string(), text: z.string() })).optional(),
  accessory: z.unknown().optional(),
});

const ActionsBlockSchema = z.object({
  type: z.literal('actions'),
  block_id: z.string().optional(),
  elements: z.array(z.unknown()),
});

const DividerBlockSchema = z.object({
  type: z.literal('divider'),
  block_id: z.string().optional(),
});

const HeaderBlockSchema = z.object({
  type: z.literal('header'),
  block_id: z.string().optional(),
  text: z.object({ type: z.literal('plain_text'), text: z.string() }),
});

const ImageBlockSchema = z.object({
  type: z.literal('image'),
  block_id: z.string().optional(),
  image_url: z.string().url(),
  alt_text: z.string(),
});

const ContextBlockSchema = z.object({
  type: z.literal('context'),
  block_id: z.string().optional(),
  elements: z.array(z.unknown()),
});

const InputBlockSchema = z.object({
  type: z.literal('input'),
  block_id: z.string().optional(),
  label: z.object({ type: z.literal('plain_text'), text: z.string() }),
  element: z.unknown(),
});

// Discriminated union replaces the entire TypeAdapter factory
const LayoutBlockSchema = z.discriminatedUnion('type', [
  SectionBlockSchema,
  ActionsBlockSchema,
  DividerBlockSchema,
  HeaderBlockSchema,
  ImageBlockSchema,
  ContextBlockSchema,
  InputBlockSchema,
]);

type LayoutBlock = z.infer<typeof LayoutBlockSchema>;

// Usage — replaces Gson.fromJson() + TypeToken
const blocks = z.array(LayoutBlockSchema).parse(JSON.parse(jsonString));
// Each block is automatically narrowed by its `type` field
```

### Gson custom date handling → Zod coerce

```java
// --- Before (Java) ---
// Custom Gson adapter for epoch seconds
GsonBuilder builder = new GsonBuilder();
builder.registerTypeAdapter(Instant.class, (JsonDeserializer<Instant>) (json, type, ctx) ->
    Instant.ofEpochSecond(json.getAsLong()));
```

```typescript
// --- After (TypeScript with Zod) ---
const TimestampSchema = z.number().transform((epoch) => new Date(epoch * 1000));

// Or for ISO string dates:
const DateStringSchema = z.string().pipe(z.coerce.date());

// In a larger schema:
const EventSchema = z.object({
  type: z.string(),
  event_ts: TimestampSchema,
  created_at: DateStringSchema.optional(),
});
```

## pitfalls

- **Over-validating internal data**: Use Zod at system boundaries (API responses, webhook payloads, user input). Don't validate data you just created yourself — that's wasteful.
- **Renaming fields to camelCase**: Resist the urge to transform `thread_ts` to `threadTs` in the data model. Keep wire-format keys to avoid serialization/deserialization bugs and stay aligned with API docs. Transform at the UI/application boundary if needed.
- **Gson lenient mode**: Gson's `setLenient(true)` accepts malformed JSON. `JSON.parse()` is strict by default. If the source data is not strict JSON (trailing commas, single quotes), clean it before parsing.
- **Losing type narrowing**: Java's polymorphic deserialization returns the base type. TypeScript's discriminated unions + Zod automatically narrow to the specific variant. Leverage this — use `switch (block.type)` and TS will infer the variant type.
- **Huge union schemas**: A single `z.discriminatedUnion()` with 30+ variants is slow to compile and produces unreadable errors. Split into hierarchical unions: `LayoutBlock`, `BlockElement`, `TextObject`, etc.
- **`null` vs missing key**: Gson distinguishes between `"field": null` and absent `"field"`. In TS, both become `undefined` with `z.optional()`. Use `z.nullable()` if you need to distinguish null from missing.
- **Generic type tokens**: Java's `TypeToken<List<LayoutBlock>>` for generic deserialization has no TS equivalent — it's not needed. `z.array(schema).parse(data)` handles generic arrays directly.
- **Circular references**: If Java models have circular references (A references B which references A), Gson handles this via lazy deserialization. Zod schemas can use `z.lazy()` for circular types, but redesign to break the cycle if possible.

## references

- https://zod.dev/ -- Zod schema validation library
- https://github.com/google/gson -- Gson (source library reference)
- https://github.com/FasterXML/jackson -- Jackson (source library reference)
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON -- JSON built-in
- https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions -- discriminated unions

## instructions

Use this expert when converting Java Gson/Jackson serialization code to TypeScript. The most critical pattern is polymorphic deserialization (TypeAdapter factories → Zod discriminated unions), which affects all Block Kit model conversion. Start by identifying all `@SerializedName` fields and custom TypeAdapter/JsonDeserializer classes, then map them to TypeScript interfaces + Zod schemas. Pair with `java-to-ts-ts.md` for general Java→TS conversion, `type-mapping-ts.md` for type system reference, and `../bridge/ui-block-kit-adaptive-cards-ts.md` if converting Block Kit models to Adaptive Cards.

## research

Deep Research prompt:

"Write a micro expert for converting Java Gson/Jackson JSON serialization to TypeScript. Cover: @SerializedName to interface fields, polymorphic TypeAdapter factories to Zod discriminated unions, custom deserializers to Zod transforms, date/timestamp handling, null semantics, TypeToken generics elimination, and large model hierarchy strategies. Include worked examples for a Block Kit-style type hierarchy with 7+ variants."
