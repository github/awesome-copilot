# TypeScript SDK Annotation Patterns

Add feedback to spans, traces, documents, and sessions using the TypeScript client.

## Client Setup

```typescript
<<<<<<< HEAD
import { createClient } from "@arizeai/phoenix-client";
=======
import { createClient } from "phoenix-client";
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
const client = createClient();  // Default: http://localhost:6006
```

## Span Annotations

Add feedback to individual spans:

```typescript
<<<<<<< HEAD
import { addSpanAnnotation } from "@arizeai/phoenix-client/spans";
=======
import { addSpanAnnotation } from "phoenix-client";
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

await addSpanAnnotation({
  client,
  spanAnnotation: {
    spanId: "abc123",
    name: "quality",
    annotatorKind: "HUMAN",
    label: "high_quality",
    score: 0.95,
    explanation: "Accurate and well-formatted",
    metadata: { reviewer: "alice" }
  },
  sync: true
});
```

<<<<<<< HEAD
## Span Notes

Notes are a special type of annotation for free-form text — useful for open coding, where reviewers leave qualitative observations on a span before any rubric exists. Later, those notes can be aggregated and distilled into structured labels or scores.

Notes are **append-only**: each call auto-generates a UUIDv4 identifier, so multiple notes naturally accumulate on the same span. Structured annotations are keyed by `(name, spanId, identifier)` — you can have many same-named annotations on one span by supplying distinct identifiers (e.g. one per reviewer); writing the same `(name, spanId, identifier)` overwrites the existing entry.

```typescript
import { addSpanNote } from "@arizeai/phoenix-client/spans";

await addSpanNote({
  client,
  spanNote: {
    spanId: "abc123",
    note: "This span shows unexpected behavior, needs review"
  }
});
```

=======
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
## Document Annotations

Rate individual documents in RETRIEVER spans:

```typescript
<<<<<<< HEAD
import { addDocumentAnnotation } from "@arizeai/phoenix-client/spans";
=======
import { addDocumentAnnotation } from "phoenix-client";
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

await addDocumentAnnotation({
  client,
  documentAnnotation: {
    spanId: "retriever_span",
    documentPosition: 0,  // 0-based index
    name: "relevance",
    annotatorKind: "LLM",
    label: "relevant",
    score: 0.95
  }
});
```

## Trace Annotations

Feedback on entire traces:

```typescript
<<<<<<< HEAD
import { addTraceAnnotation } from "@arizeai/phoenix-client/traces";
=======
import { addTraceAnnotation } from "phoenix-client";
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

await addTraceAnnotation({
  client,
  traceAnnotation: {
    traceId: "trace_abc",
    name: "correctness",
    annotatorKind: "HUMAN",
    label: "correct",
    score: 1.0
  }
});
```

<<<<<<< HEAD
## Trace Notes

Notes on entire traces (multiple notes allowed per trace):

```typescript
import { addTraceNote } from "@arizeai/phoenix-client/traces";

await addTraceNote({
  client,
  traceNote: {
    traceId: "abc123def456",
    note: "Needs follow-up — unexpected tool call sequence"
  }
});
```

=======
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
## Session Annotations

Feedback on multi-turn conversations:

```typescript
<<<<<<< HEAD
import { addSessionAnnotation } from "@arizeai/phoenix-client/sessions";
=======
import { addSessionAnnotation } from "phoenix-client";
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

await addSessionAnnotation({
  client,
  sessionAnnotation: {
    sessionId: "session_xyz",
    name: "user_satisfaction",
    annotatorKind: "HUMAN",
    label: "satisfied",
    score: 0.85
  }
});
```

## RAG Pipeline Example

```typescript
<<<<<<< HEAD
import { createClient } from "@arizeai/phoenix-client";
import { logDocumentAnnotations, addSpanAnnotation } from "@arizeai/phoenix-client/spans";
import { addTraceAnnotation } from "@arizeai/phoenix-client/traces";
=======
import { createClient, logDocumentAnnotations, addSpanAnnotation, addTraceAnnotation } from "phoenix-client";
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

const client = createClient();

// Document relevance (batch)
await logDocumentAnnotations({
  client,
  documentAnnotations: [
    { spanId: "retriever_span", documentPosition: 0, name: "relevance",
      annotatorKind: "LLM", label: "relevant", score: 0.95 },
    { spanId: "retriever_span", documentPosition: 1, name: "relevance",
      annotatorKind: "LLM", label: "relevant", score: 0.80 }
  ]
});

// LLM response quality
await addSpanAnnotation({
  client,
  spanAnnotation: {
    spanId: "llm_span",
    name: "faithfulness",
    annotatorKind: "LLM",
    label: "faithful",
    score: 0.90
  }
});

// Overall trace quality
await addTraceAnnotation({
  client,
  traceAnnotation: {
    traceId: "trace_123",
    name: "correctness",
    annotatorKind: "HUMAN",
    label: "correct",
    score: 1.0
  }
});
```

## API Reference

- [TypeScript Client API](https://arize-ai.github.io/phoenix/)
