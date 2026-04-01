# Production: Continuous Evaluation

Capability vs regression evals and the ongoing feedback loop.

## Two Types of Evals

| Type | Pass Rate Target | Purpose | Update |
| ---- | ---------------- | ------- | ------ |
| **Capability** | 50-80% | Measure improvement | Add harder cases |
| **Regression** | 95-100% | Catch breakage | Add fixed bugs |

## Saturation

When capability evals hit >95% pass rate, they're saturated:
1. Graduate passing cases to regression suite
2. Add new challenging cases to capability suite

## Feedback Loop

```
Production → Sample traffic → Run evaluators → Find failures
    ↑                                              ↓
Deploy  ←  Run CI evals  ←  Create test cases  ←  Error analysis
```

## Implementation

Build a continuous monitoring loop:

1. **Sample recent traces** at regular intervals (e.g., 100 traces per hour)
2. **Run evaluators** on sampled traces
3. **Log results** to Phoenix for tracking
4. **Queue concerning results** for human review
5. **Create test cases** from recurring failure patterns

### Python

```python
from phoenix.client import Client
from datetime import datetime, timedelta

client = Client()

# 1. Sample recent spans (includes full attributes for evaluation)
spans_df = client.spans.get_spans_dataframe(
    project_identifier="my-app",
    start_time=datetime.now() - timedelta(hours=1),
    root_spans_only=True,
    limit=100,
)

# 2. Run evaluators
from phoenix.evals import evaluate_dataframe

results_df = evaluate_dataframe(
    dataframe=spans_df,
    evaluators=[quality_eval, safety_eval],
)

# 3. Upload results as annotations
from phoenix.evals.utils import to_annotation_dataframe

annotations_df = to_annotation_dataframe(results_df)
client.spans.log_span_annotations_dataframe(dataframe=annotations_df)
```

### TypeScript

```typescript
import { getSpans } from "@arizeai/phoenix-client/spans";
import { logSpanAnnotations } from "@arizeai/phoenix-client/spans";

// 1. Sample recent spans
const { spans } = await getSpans({
  project: { projectName: "my-app" },
  startTime: new Date(Date.now() - 60 * 60 * 1000),
  parentId: null, // root spans only
  limit: 100,
});

// 2. Run evaluators (user-defined)
const results = await Promise.all(
  spans.map(async (span) => ({
    spanId: span.context.span_id,
    ...await runEvaluators(span, [qualityEval, safetyEval]),
  }))
);

// 3. Upload results as annotations
await logSpanAnnotations({
  spanAnnotations: results.map((r) => ({
    spanId: r.spanId,
    name: "quality",
    score: r.qualityScore,
    label: r.qualityLabel,
    annotatorKind: "LLM" as const,
  })),
});
```

For trace-level monitoring (e.g., agent workflows), use `get_traces`/`getTraces` to identify traces:

```python
# Python: identify slow traces
traces = client.traces.get_traces(
    project_identifier="my-app",
    start_time=datetime.now() - timedelta(hours=1),
    sort="latency_ms",
    order="desc",
    limit=50,
)
```

```typescript
// TypeScript: identify slow traces
import { getTraces } from "@arizeai/phoenix-client/traces";

const { traces } = await getTraces({
  project: { projectName: "my-app" },
  startTime: new Date(Date.now() - 60 * 60 * 1000),
  limit: 50,
});
```

## Alerting

| Condition | Severity | Action |
| --------- | -------- | ------ |
| Regression < 98% | Critical | Page oncall |
| Capability declining | Warning | Slack notify |
| Capability > 95% for 7d | Info | Schedule review |

## Key Principles

- **Two suites** - Capability + Regression always
- **Graduate cases** - Move consistent passes to regression
- **Track trends** - Monitor over time, not just snapshots
