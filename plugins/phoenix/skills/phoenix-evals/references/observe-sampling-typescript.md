# Observe: Sampling Strategies (TypeScript)

How to efficiently sample production traces for review.

## Strategies

### 1. Failure-Focused (Highest Priority)

Use server-side filters to fetch only what you need:

```typescript
import { getSpans } from "@arizeai/phoenix-client/spans";

// Server-side filter — only ERROR spans are returned
const { spans: errors } = await getSpans({
  project: { projectName: "my-project" },
  statusCode: "ERROR",
  limit: 100,
});

// Fetch only LLM spans
const { spans: llmSpans } = await getSpans({
  project: { projectName: "my-project" },
  spanKind: "LLM",
  limit: 100,
});

// Filter by span name
const { spans: chatSpans } = await getSpans({
  project: { projectName: "my-project" },
  name: "chat_completion",
  limit: 100,
});
```

### 2. Outliers

```typescript
const { spans } = await getSpans({
  project: { projectName: "my-project" },
  limit: 200,
});
const latency = (s: (typeof spans)[number]) =>
  new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
const sorted = [...spans].sort((a, b) => latency(b) - latency(a));
const slowResponses = sorted.slice(0, 50);
```

### 3. Stratified (Coverage)

```typescript
// Sample equally from each category
function stratifiedSample<T>(items: T[], groupBy: (item: T) => string, perGroup: number): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupBy(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.values()].flatMap((g) => g.slice(0, perGroup));
}

const { spans } = await getSpans({
  project: { projectName: "my-project" },
  limit: 500,
});
const byQueryType = stratifiedSample(spans, (s) => s.attributes?.["metadata.query_type"] ?? "unknown", 20);
```

### 4. Metric-Guided

```typescript
import { getSpanAnnotations } from "@arizeai/phoenix-client/spans";

// Fetch annotations for your spans, then filter by label
const { annotations } = await getSpanAnnotations({
  project: { projectName: "my-project" },
  spanIds: spans.map((s) => s.context.span_id),
  includeAnnotationNames: ["hallucination"],
});

const flaggedSpanIds = new Set(
  annotations.filter((a) => a.result?.label === "hallucinated").map((a) => a.span_id)
);
const flagged = spans.filter((s) => flaggedSpanIds.has(s.context.span_id));
```

## Trace-Level Sampling

When you need whole requests (all spans in a trace), use `getTraces`:

```typescript
import { getTraces } from "@arizeai/phoenix-client/traces";

// Recent traces with full span trees
const { traces } = await getTraces({
  project: { projectName: "my-project" },
  limit: 100,
  includeSpans: true,
});

// Filter by session (e.g., multi-turn conversations)
const { traces: sessionTraces } = await getTraces({
  project: { projectName: "my-project" },
  sessionId: "user-session-abc",
  includeSpans: true,
});

// Time-windowed sampling
const { traces: recentTraces } = await getTraces({
  project: { projectName: "my-project" },
  startTime: new Date(Date.now() - 60 * 60 * 1000), // last hour
  limit: 50,
  includeSpans: true,
});
```

## Building a Review Queue

```typescript
// Combine server-side filters into a review queue
const { spans: errorSpans } = await getSpans({
  project: { projectName: "my-project" },
  statusCode: "ERROR",
  limit: 30,
});
const { spans: allSpans } = await getSpans({
  project: { projectName: "my-project" },
  limit: 100,
});
const random = allSpans.sort(() => Math.random() - 0.5).slice(0, 30);

const combined = [...errorSpans, ...random];
const unique = [...new Map(combined.map((s) => [s.context.span_id, s])).values()];
const reviewQueue = unique.slice(0, 100);
```

## Sample Size Guidelines

| Purpose | Size |
| ------- | ---- |
| Initial exploration | 50-100 |
| Error analysis | 100+ (until saturation) |
| Golden dataset | 100-500 |
| Judge calibration | 100+ per class |

**Saturation:** Stop when new traces show the same failure patterns.
