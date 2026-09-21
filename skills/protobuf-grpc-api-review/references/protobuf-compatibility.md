# Protobuf Compatibility Rules

Use this reference when a review changes messages, fields, enums, serialization, or generated APIs. Apply it to the actual encoding and runtimes in scope.

## Classify the Change

### Binary wire-unsafe

Treat these as breaking unless all serialized data and every reader/writer can be migrated atomically:

- changing an existing field number
- reusing a deleted or previously shipped field number
- reusing a deleted enum number
- moving fields into an existing `oneof`
- changing between types with different wire encodings, such as `string` and an integer

Never rely on an apparently unused tag having no historical data. Old binaries, logs, queues, and rollback artifacts may still contain it.

### Binary wire-safe, with other dimensions still to review

- adding a field with a new number
- removing a field while permanently reserving its number; reserve its name when name reuse is also unsafe
- adding an enum value with a new number
- moving one explicit-presence field into a new `oneof`
- changing a single-field `oneof` to an explicit-presence field
- changing a field to an extension with the same number and type

These can still break source code, business logic, JSON consumers, validation, or exhaustive enum handling.

### Binary-compatible but rollout-dependent

These pairs can parse the same wire representation but may change values or lose data. Prefer adding a new field. If a migration is unavoidable, keep writers within the old domain until every reader has upgraded and rollback is closed.

| Change | Required constraint or risk |
| --- | --- |
| `int32`, `uint32`, `int64`, `uint64`, `bool` | Old readers may truncate or reinterpret values; boolean semantics are especially risky. |
| `sint32` <-> `sint64` | Values outside the narrower range change when read as `sint32`. These are not compatible with ordinary integer encodings. |
| `fixed32` <-> `sfixed32`; `fixed64` <-> `sfixed64` | Signedness changes application meaning. |
| `string` <-> `bytes` | Bytes must remain valid UTF-8 for `string` readers. Generated APIs change. |
| embedded message <-> `bytes` | Bytes must always contain that message encoding; generated APIs change. |
| enum <-> integer types | Unknown-enum representation and generated behavior vary by language. |
| singular <-> repeated for strings, bytes, or messages | A singular reader keeps the last primitive value or merges messages; information can be lost. |
| map <-> its repeated entry message | Map readers may reorder entries and discard duplicate keys. |

Numeric repeated fields are normally packed and are not safely interchangeable with singular fields. Treat any cardinality change as a data migration rather than a cleanup.

## Deletion and Replacement Pattern

For a shipped field that must change type or meaning:

1. Add a new field with a new number and a distinct name.
2. Deploy readers that understand both fields.
3. Deploy writers that populate the new field, and dual-write if rollback requires it.
4. Backfill persisted data where needed.
5. Stop reading and writing the old field only after old binaries and rollback are gone.
6. Remove the old field and reserve its number and name.

Do not reserve the old number while the field is still declared. Do not reuse the old number for the replacement.

## Presence, Defaults, and `oneof`

- Changing implicit scalar presence to explicit `optional` presence is wire-compatible but changes generated APIs and the meaning of default values. Check merge, patch, equality, and serialization behavior.
- An implicit-presence scalar cannot distinguish "unset" from its default value. If zero, empty, or false is meaningful in an update API, use explicit presence or a field mask.
- Adding a field to a `oneof` is generally parseable, but old clients can clear an unknown member when they set a known member and reserialize. Review read-modify-write paths.
- Removing a `oneof` member makes it impossible for a new reader to know which removed member had been set. Preserve the number and plan the migration.
- Never add a required field. Older writers cannot populate it, and partial rollout or rollback becomes unsafe.
- Do not change explicit defaults in proto2; version-skewed readers can interpret the same absent field differently.

## Enums

- Keep a zero-valued `*_UNSPECIFIED` first value unless the established contract deliberately uses another zero value.
- Adding a value is binary-safe but may break exhaustive switches or older business logic. Search generated-language consumers.
- When deleting a value, reserve both its number and, where names are part of the contract, its name.
- For aliases, add the new alias after the old one. A safe rename requires staged parser and serializer rollout before removing the old name.

## ProtoJSON and Other Named Formats

Review name-based formats separately from the binary wire format:

- field and enum names can be serialized contract data, so renaming may break readers
- ProtoJSON does not preserve unknown fields, narrowing forward compatibility
- adding fields or enum values can fail older parsers that reject unknown names
- changing `json_name`, integer/string representation, bytes encoding, or `oneof` shape can alter the public JSON schema
- HTTP transcoding can expose message fields and enum names even when the internal transport is binary gRPC

Ask whether stored JSON exists. If it does, include historical payloads in compatibility tests.

## Verification Matrix

Use real generated runtimes where behavior can vary by language:

| Writer | Reader | What to assert |
| --- | --- | --- |
| old | new | Values, presence, enum handling, and validation remain correct. |
| new | old | Unknown data is tolerated and known values are not reinterpreted. |
| old | new -> modify -> serialize -> old | Unknown fields survive and known fields are not cleared. |
| new | old -> modify -> serialize -> new | New fields or `oneof` members are not silently lost. |

Also compile descriptors, run the repository's breaking-change checker, test boundary values for widened/narrowed numeric domains, and round-trip any supported JSON representation.

## Primary References

- [Proto3: Updating a Message Type](https://protobuf.dev/programming-guides/proto3/#updating)
- [Proto Best Practices](https://protobuf.dev/best-practices/dos-donts/)
- [ProtoJSON wire safety](https://protobuf.dev/programming-guides/json/#json-wire-safety)
- [Field presence](https://protobuf.dev/programming-guides/field_presence/)
