# Observe: Tracing Setup

Configure tracing to capture data for evaluation.

## Quick Setup

```python
# Python
from phoenix.otel import register

register(project_name="my-app", auto_instrument=True)
```

```typescript
// TypeScript
import { registerPhoenix } from "@arizeai/phoenix-otel";

registerPhoenix({ projectName: "my-app", autoInstrument: true });
```

## Essential Attributes

| Attribute | Why It Matters |
| --------- | -------------- |
| `input.value` | User's request |
| `output.value` | Response to evaluate |
| `retrieval.documents` | Context for faithfulness |
| `tool.name`, `tool.parameters` | Agent evaluation |
| `llm.model_name` | Track by model |

## Custom Attributes for Evals

```python
span.set_attribute("metadata.client_type", "enterprise")
span.set_attribute("metadata.query_category", "billing")
```

## Exporting for Evaluation

### Spans (Python — DataFrame)

```python
from phoenix.client import Client

# Client() works for local Phoenix (falls back to env vars or localhost:6006)
# For remote/cloud: Client(base_url="https://app.phoenix.arize.com", api_key="...")
client = Client()
spans_df = client.spans.get_spans_dataframe(
    project_identifier="my-app",  # NOT project_name= (deprecated)
    root_spans_only=True,
)

dataset = client.datasets.create_dataset(
    name="error-analysis-set",
    dataframe=spans_df[["input.value", "output.value"]],
    input_keys=["input.value"],
    output_keys=["output.value"],
)
```

### Spans (TypeScript)

```typescript
import { getSpans } from "@arizeai/phoenix-client/spans";

const { spans } = await getSpans({
  project: { projectName: "my-app" },
  parentId: null, // root spans only
  limit: 100,
});
```

### Traces (Python — structured)

Use `get_traces` when you need full trace trees (e.g., multi-turn conversations, agent workflows):

```python
from datetime import datetime, timedelta

traces = client.traces.get_traces(
    project_identifier="my-app",
    start_time=datetime.now() - timedelta(hours=24),
    include_spans=True,  # includes all spans per trace
    limit=100,
)
# Each trace has: trace_id, start_time, end_time, spans (when include_spans=True)
```

### Traces (TypeScript)

```typescript
import { getTraces } from "@arizeai/phoenix-client/traces";

const { traces } = await getTraces({
  project: { projectName: "my-app" },
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
  includeSpans: true,
  limit: 100,
});
```

## Uploading Evaluations as Annotations

### Python

```python
from phoenix.evals import evaluate_dataframe
from phoenix.evals.utils import to_annotation_dataframe

# Run evaluations
results_df = evaluate_dataframe(dataframe=spans_df, evaluators=[my_eval])

# Format results for Phoenix annotations
annotations_df = to_annotation_dataframe(results_df)

# Upload to Phoenix
client.spans.log_span_annotations_dataframe(dataframe=annotations_df)
```

### TypeScript

```typescript
import { logSpanAnnotations } from "@arizeai/phoenix-client/spans";

await logSpanAnnotations({
  spanAnnotations: [
    {
      spanId: "abc123",
      name: "quality",
      label: "good",
      score: 0.95,
      annotatorKind: "LLM",
    },
  ],
});
```

Annotations are visible in the Phoenix UI alongside your traces.

## Verify

Required attributes: `input.value`, `output.value`, `status_code`
For RAG: `retrieval.documents`
For agents: `tool.name`, `tool.parameters`
