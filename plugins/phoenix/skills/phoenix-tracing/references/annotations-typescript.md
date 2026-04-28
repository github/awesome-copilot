# TypeScript SDK Annotation Patterns

Add feedback to spans, traces, documents, and sessions using the TypeScript client.

## Client Setup

```typescript
import { createClient } from "phoenix-client";
const client = createClient();  // Default: http://localhost:6006
```

## Span Annotations

Add feedback to individual spans:

```typescript
import { addSpanAnnotation } from "phoenix-client";

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

## Document Annotations

Rate individual documents in RETRIEVER spans:

```typescript
import { addDocumentAnnotation } from "phoenix-client";

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
import { addTraceAnnotation } from "phoenix-client";

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

## Session Annotations

Feedback on multi-turn conversations:

```typescript
import { addSessionAnnotation } from "phoenix-client";

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
import { createClient, logDocumentAnnotations, addSpanAnnotation, addTraceAnnotation } from "phoenix-client";

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
