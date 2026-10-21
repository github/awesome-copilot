# Production: Overview

CI/CD evals vs production monitoring - complementary approaches.

## Two Evaluation Modes

| Aspect | CI/CD Evals | Production Monitoring |
| ------ | ----------- | -------------------- |
| **When** | Pre-deployment | Post-deployment, ongoing |
| **Data** | Fixed dataset | Sampled traffic |
| **Goal** | Prevent regression | Detect drift |
| **Response** | Block deploy | Alert & analyze |

## CI/CD Evaluations

```python
# Fast, deterministic checks
ci_evaluators = [
    has_required_format,
    no_pii_leak,
    safety_check,
    regression_test_suite,
]

# Small but representative dataset (~100 examples)
run_experiment(ci_dataset, task, ci_evaluators)
```

Set thresholds: regression=0.95, safety=1.0, format=0.98.

## Production Monitoring

### Python

```python
from phoenix.client import Client
from datetime import datetime, timedelta

client = Client()

# Sample recent traces (last hour)
traces = client.traces.get_traces(
    project_identifier="my-app",
    start_time=datetime.now() - timedelta(hours=1),
    include_spans=True,
    limit=100,
)

# Run evaluators on sampled traffic
for trace in traces:
    results = run_evaluators_async(trace, production_evaluators)
    if any(r["score"] < 0.5 for r in results):
        alert_on_failure(trace, results)
```

### TypeScript

```typescript
import { getTraces } from "@arizeai/phoenix-client/traces";
import { getSpans } from "@arizeai/phoenix-client/spans";

// Sample recent traces (last hour)
const { traces } = await getTraces({
  project: { projectName: "my-app" },
  startTime: new Date(Date.now() - 60 * 60 * 1000),
  includeSpans: true,
  limit: 100,
});

// Or sample spans directly for evaluation
const { spans } = await getSpans({
  project: { projectName: "my-app" },
  startTime: new Date(Date.now() - 60 * 60 * 1000),
  limit: 100,
});

// Run evaluators on sampled traffic
for (const span of spans) {
  const results = await runEvaluators(span, productionEvaluators);
  if (results.some((r) => r.score < 0.5)) {
    await alertOnFailure(span, results);
  }
}
```

Prioritize: errors → negative feedback → random sample.

## Feedback Loop

```
Production finds failure → Error analysis → Add to CI dataset → Prevents future regression
```
