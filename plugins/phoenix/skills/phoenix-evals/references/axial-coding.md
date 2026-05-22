# Axial Coding

Group open-ended notes into structured failure taxonomies.

## Process

1. **Gather** - Collect open coding notes
2. **Pattern** - Group notes with common themes
3. **Name** - Create actionable category names
4. **Quantify** - Count failures per category

## Example Taxonomy

```yaml
failure_taxonomy:
  content_quality:
    hallucination: [invented_facts, fictional_citations]
    incompleteness: [partial_answer, missing_key_info]
    inaccuracy: [wrong_numbers, wrong_dates]
  
  communication:
    tone_mismatch: [too_casual, too_formal]
    clarity: [ambiguous, jargon_heavy]
  
  context:
    user_context: [ignored_preferences, misunderstood_intent]
    retrieved_context: [ignored_documents, wrong_context]
  
  safety:
    missing_disclaimers: [legal, medical, financial]
```

## Add Annotation (Python)

```python
from phoenix.client import Client

client = Client()
client.spans.add_span_annotation(
    span_id="abc123",
    annotation_name="failure_category",
    label="hallucination",
    explanation="invented a feature that doesn't exist",
    annotator_kind="HUMAN",
    sync=True,
)
```

## Add Annotation (TypeScript)

```typescript
import { addSpanAnnotation } from "@arizeai/phoenix-client/spans";

await addSpanAnnotation({
  spanAnnotation: {
    spanId: "abc123",
    name: "failure_category",
    label: "hallucination",
    explanation: "invented a feature that doesn't exist",
    annotatorKind: "HUMAN",
  }
});
```

## Agent Failure Taxonomy

```yaml
agent_failures:
  planning: [wrong_plan, incomplete_plan]
  tool_selection: [wrong_tool, missed_tool, unnecessary_call]
  tool_execution: [wrong_parameters, type_error]
  state_management: [lost_context, stuck_in_loop]
  error_recovery: [no_fallback, wrong_fallback]
```

## Transition Matrix (Agents)

Shows where failures occur between states:

```python
def build_transition_matrix(conversations, states):
    matrix = defaultdict(lambda: defaultdict(int))
    for conv in conversations:
        if conv["failed"]:
            last_success = find_last_success(conv)
            first_failure = find_first_failure(conv)
            matrix[last_success][first_failure] += 1
    return pd.DataFrame(matrix).fillna(0)
```

## Principles

- **MECE** - Each failure fits ONE category
- **Actionable** - Categories suggest fixes
- **Bottom-up** - Let categories emerge from data
