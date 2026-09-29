---
name: protobuf-grpc-api-review
description: 'Review Protocol Buffer (.proto) and gRPC API changes for wire and JSON compatibility, safe schema evolution, rollout hazards, and RPC contract quality. Use when reviewing proto diffs, adding or changing messages and services, planning migrations, or diagnosing cross-version failures.'
---

# Protobuf and gRPC API Review

Review `.proto` and related gRPC changes as long-lived contracts. Distinguish what the wire format permits from what generated clients, JSON users, stored data, and mixed-version deployments can safely tolerate.

## Start With the Compatibility Envelope

Before deciding whether a change is safe, determine:

- the old and new schema, not only the final file
- whether payloads use binary protobuf, ProtoJSON, text format, or more than one encoding
- whether messages persist in databases, queues, logs, caches, or events
- whether clients exist outside the repository or release independently
- the protobuf syntax or edition and the generated languages/runtime versions
- whether HTTP/JSON transcoding, reflection, service config, or schema registries expose the contract
- the deployment order, rollback window, and duration of mixed-version operation

If context is missing, state the assumption and lower confidence. Do not call a change backward-compatible from the new schema alone.

## Review Workflow

### 1. Inventory Contract Changes

Compare the old and new definitions by fully qualified symbol. Record:

- message fields: number, name, type, cardinality, presence, `oneof`, defaults, and relevant options
- enums: value name, number, aliases, reservations, and zero value
- services: package, service, method, request and response types, and streaming mode
- generated API inputs: package options, outer class names, namespaces, and custom options

Ignore formatting-only changes after confirming they do not alter descriptors or generated APIs.

### 2. Evaluate Four Compatibility Dimensions

Assess each affected symbol independently:

1. **Binary wire** — can old and new readers parse both old and new bytes without corruption or loss?
2. **Named formats** — do ProtoJSON, text-format, REST-transcoded, or name-based consumers still work?
3. **Source and generated API** — will regenerated clients compile and preserve presence, enum, and accessor behavior?
4. **Behavior and operations** — do status codes, retry safety, deadlines, authorization, streaming, and resource bounds preserve the RPC contract?

Read [protobuf compatibility rules](references/protobuf-compatibility.md) for field, enum, presence, `oneof`, and serialization changes. Read [gRPC contract review](references/grpc-contract-review.md) when services, methods, or runtime behavior change.

### 3. Trace Mixed-Version Scenarios

For every non-trivial change, reason through these paths:

- old writer -> new reader
- new writer -> old reader
- old reader modifies and reserializes a new message
- rollback after new writers have emitted new values
- persisted old data read after the migration

For conditionally compatible changes, identify the exact writer constraint and the point at which it may be relaxed. A safe rollout commonly requires deploying readers before writers and retaining the old field or method until rollback is no longer needed.

### 4. Review Repository Evidence

Use the repository's own tooling when available:

- compile descriptors with the project's `protoc`, Buf, Gradle, Maven, Bazel, or language-specific task
- run configured breaking-change or lint checks
- inspect generated-code diffs only when they are committed by repository convention
- search call sites for exhaustive enum switches, presence assumptions, JSON field names, method paths, status handling, and retry configuration
- look for compatibility fixtures or descriptor baselines before proposing a new mechanism

Do not claim a check passed unless you ran it. If a required tool or baseline is unavailable, name the unverified risk.

### 5. Produce an Actionable Review

Lead with one verdict:

- **Compatible** — safe within the stated compatibility envelope
- **Rollout-dependent** — parseable, but safe only with explicit sequencing or value constraints
- **Breaking** — causes wire, named-format, source, or behavioral incompatibility
- **Insufficient context** — the old schema, encoding, consumers, or deployment model is unknown

Then provide only evidence-backed findings. For each finding include:

```text
[severity] Short title
Location: file and symbol or changed lines
Dimension: binary | JSON/text | source | behavior/operations
Change: old contract -> new contract
Impact: concrete failing mixed-version scenario
Remediation: smallest safe schema change or staged migration
```

Use **blocker** for corruption, unparsable data, tag reuse, or an unavoidable production break; **high** for likely cross-version data loss or unsafe RPC behavior; **medium** for bounded compatibility or operability risks; and **low** for maintainability issues that do not break the contract. Do not inflate style preferences into compatibility findings.

Conclude with:

- a compact compatibility matrix for changed symbols
- the rollout/rollback sequence if migration is required
- targeted tests that would prove the remaining assumptions

## Default Safety Principles

- Never reuse a field or enum number, even after deletion; reserve deleted numbers and usually names.
- Treat field-number changes and moving fields into an existing `oneof` as breaking.
- Treat type and cardinality changes as migrations, even when their binary wire types are compatible.
- Remember that adding a field or enum value can still break generated code or exhaustive consumers.
- Review ProtoJSON separately: names and unknown-field behavior make its compatibility envelope narrower than binary protobuf.
- Preserve unknown fields through read-modify-write paths when forward compatibility depends on them.
- Prefer additive evolution: add a new field or RPC, migrate readers and writers, deprecate the old contract, then remove it only after the compatibility window closes.
- Never recommend retries for a state-changing RPC without establishing idempotency or a deduplication mechanism.
- Require realistic client deadlines and cancellation-aware server work for production RPCs.

## Avoid False Positives

- Do not require every service to use streaming, retries, health checks, or HTTP transcoding.
- Do not flag a new optional field as breaking solely because old clients ignore it.
- Do not call a wire-compatible type change safe without checking value ranges and rollout order.
- Do not assume a renamed field is harmless when JSON, text format, reflection, or generated source APIs are consumers.
- Do not demand reservations for fields that never shipped; ask for release history when that distinction matters.
