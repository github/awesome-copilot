---
name: arize-annotation
description: "INVOKE THIS SKILL when creating, managing, or using annotation configs on Arize (categorical, continuous, freeform), or applying human annotations to project spans via the Python SDK. Configs are the label schema for human feedback on spans and other surfaces in the Arize UI. Triggers: annotation config, label schema, human feedback schema, bulk annotate spans, update_annotations."
---

# Arize Annotation Skill

This skill focuses on **annotation configs** — the schema for human feedback — and on **programmatically annotating project spans** via the Python SDK. Human review in the Arize UI (including annotation queues, datasets, and experiments) still depends on these configs; there is no `ax` CLI for queues yet.

**Direction:** Human labeling in Arize attaches values defined by configs to **spans**, **dataset examples**, **experiment-related records**, and **queue items** in the product UI. What is documented here: `ax annotation-configs` and bulk span updates with `ArizeClient.spans.update_annotations`.

---

## Prerequisites

Proceed directly with the task — run the `ax` command you need. Do NOT check versions, env vars, or profiles upfront.

If an `ax` command fails, troubleshoot based on the error:
- `command not found` or version error → see references/ax-setup.md
- `401 Unauthorized` / missing API key → run `ax profiles show` to inspect the current profile. If the profile is missing or the API key is wrong: check `.env` for `ARIZE_API_KEY` and use it to create/update the profile via references/ax-profiles.md. If `.env` has no key either, ask the user for their Arize API key (https://app.arize.com/admin > API Keys)
- Space ID unknown → check `.env` for `ARIZE_SPACE_ID`, or run `ax spaces list -o json`, or ask the user

---

## Concepts

### What is an Annotation Config?

An **annotation config** defines the schema for a single type of human feedback label. Before anyone can annotate a span, dataset record, experiment output, or queue item, a config must exist for that label in the space.

| Field | Description |
|-------|-------------|
| **Name** | Descriptive identifier (e.g. `Correctness`, `Helpfulness`). Must be unique within the space. |
| **Type** | `categorical` (pick from a list), `continuous` (numeric range), or `freeform` (free text). |
| **Values** | For categorical: array of `{"label": str, "score": number}` pairs. |
| **Min/Max Score** | For continuous: numeric bounds. |
| **Optimization Direction** | Whether higher scores are better (`maximize`) or worse (`minimize`). Used to render trends in the UI. |

### Where labels get applied (surfaces)

| Surface | Typical path |
|---------|----------------|
| **Project spans** | Python SDK `spans.update_annotations` (below) and/or the Arize UI |
| **Dataset examples** | Arize UI (human labeling flows); configs must exist in the space |
| **Experiment outputs** | Often reviewed alongside datasets or traces in the UI — see arize-experiment, arize-dataset |
| **Annotation queue items** | Arize UI; configs must exist — no `ax` queue commands documented here yet |

Always ensure the relevant **annotation config** exists in the space before expecting labels to persist.

---

## Basic CRUD: Annotation Configs

### List

```bash
ax annotation-configs list --space-id SPACE_ID
ax annotation-configs list --space-id SPACE_ID -o json
ax annotation-configs list --space-id SPACE_ID --limit 20
```

### Create — Categorical

Categorical configs present a fixed set of labels for reviewers to choose from.

```bash
ax annotation-configs create \
  --name "Correctness" \
  --space-id SPACE_ID \
  --type categorical \
  --values '[{"label": "correct", "score": 1}, {"label": "incorrect", "score": 0}]' \
  --optimization-direction maximize
```

Common binary label pairs:
- `correct` / `incorrect`
- `helpful` / `unhelpful`
- `safe` / `unsafe`
- `relevant` / `irrelevant`
- `pass` / `fail`

### Create — Continuous

Continuous configs let reviewers enter a numeric score within a defined range.

```bash
ax annotation-configs create \
  --name "Quality Score" \
  --space-id SPACE_ID \
  --type continuous \
  --minimum-score 0 \
  --maximum-score 10 \
  --optimization-direction maximize
```

### Create — Freeform

Freeform configs collect open-ended text feedback. No additional flags needed beyond name, space, and type.

```bash
ax annotation-configs create \
  --name "Reviewer Notes" \
  --space-id SPACE_ID \
  --type freeform
```

### Get

```bash
ax annotation-configs get ANNOTATION_CONFIG_ID
ax annotation-configs get ANNOTATION_CONFIG_ID -o json
```

### Delete

```bash
ax annotation-configs delete ANNOTATION_CONFIG_ID
ax annotation-configs delete ANNOTATION_CONFIG_ID --force   # skip confirmation
```

**Note:** Deletion is irreversible. Any annotation queue associations to this config are also removed in the product (queues may remain; fix associations in the Arize UI if needed).

---

## Applying Annotations to Spans (Python SDK)

Use the Python SDK to bulk-apply annotations to **project spans** when you already have labels (e.g., from a review export or an external labeling tool).

```python
import pandas as pd
from arize import ArizeClient

import os

client = ArizeClient(api_key=os.environ["ARIZE_API_KEY"])

# Build a DataFrame with annotation columns
# Required: context.span_id + at least one annotation.<name>.label or annotation.<name>.score
annotations_df = pd.DataFrame([
    {
        "context.span_id": "span_001",
        "annotation.Correctness.label": "correct",
        "annotation.Correctness.updated_by": "reviewer@example.com",
    },
    {
        "context.span_id": "span_002",
        "annotation.Correctness.label": "incorrect",
        "annotation.Correctness.updated_by": "reviewer@example.com",
    },
])

response = client.spans.update_annotations(
    space_id=os.environ["ARIZE_SPACE_ID"],
    project_name="your-project",
    dataframe=annotations_df,
    validate=True,
)
```

**DataFrame column schema:**

| Column | Required | Description |
|--------|----------|-------------|
| `context.span_id` | yes | The span to annotate |
| `annotation.<name>.label` | one of | Categorical or freeform label |
| `annotation.<name>.score` | one of | Numeric score |
| `annotation.<name>.updated_by` | no | Annotator identifier (email or name) |
| `annotation.<name>.updated_at` | no | Timestamp in milliseconds since epoch |
| `annotation.notes` | no | Freeform notes on the span |

**Limitation:** Annotations apply only to spans within 31 days prior to submission.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ax: command not found` | See references/ax-setup.md |
| `401 Unauthorized` | API key may not have access to this space. Verify at https://app.arize.com/admin > API Keys |
| `Annotation config not found` | `ax annotation-configs list --space-id SPACE_ID` |
| `409 Conflict on create` | Name already exists in the space. Use a different name or get the existing config ID. |
| Human review / queues in UI | Use the Arize app; ensure configs exist — no `ax` annotation-queue CLI yet |
| Span SDK errors or missing spans | Confirm `project_name`, `space_id`, and span IDs; use arize-trace to export spans |

---

## Related Skills

- **arize-trace**: Export spans to find span IDs and time ranges
- **arize-dataset**: Find dataset IDs and example IDs
- **arize-evaluator**: Automated LLM-as-judge alongside human annotation
- **arize-experiment**: Experiments tied to datasets and evaluation workflows
- **arize-link**: Deep links to annotation configs and queues in the Arize UI

---

## Save Credentials for Future Use

See references/ax-profiles.md § Save Credentials for Future Use.
