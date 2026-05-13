---
name: arize-annotation
description: Creates and manages annotation configs (categorical, continuous, freeform label schemas) and annotation queues (human review workflows) on Arize. Applies human annotations to project spans via the Python SDK. Use when the user mentions annotation config, annotation queue, label schema, human feedback, bulk annotate spans, update_annotations, labeling queue, annotate record, or human review.
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI and a configured Arize profile.
---

# Arize Annotation Skill

> **`SPACE`** — All `--space` flags and the `ARIZE_SPACE` env var accept a space **name** (e.g., `my-workspace`) or a base64 space **ID** (e.g., `U3BhY2U6...`). Find yours with `ax spaces list`.

This skill covers **annotation configs** (the label schema) and **annotation queues** (human review workflows), as well as programmatically annotating project spans via the Python SDK.

**Direction:** Human labeling in Arize attaches values defined by configs to **spans**, **dataset examples**, **experiment-related records**, and **queue items** in the product UI. This skill covers: `ax annotation-configs`, `ax annotation-queues`, and bulk span updates with `ArizeClient.spans.update_annotations`.

---

## Prerequisites

Proceed directly with the task — run the `ax` command you need. Do NOT check versions, env vars, or profiles upfront.

If an `ax` command fails, troubleshoot based on the error:
- `command not found` or version error → see references/ax-setup.md
- `401 Unauthorized` / missing API key → run `ax profiles show` to inspect the current profile. If the profile is missing or the API key is wrong, follow references/ax-profiles.md to create/update it. If the user doesn't have their key, direct them to https://app.arize.com/admin > API Keys
- Space unknown → run `ax spaces list` to pick by name, or ask the user
- **Security:** Never read `.env` files or search the filesystem for credentials. Use `ax profiles` for Arize credentials and `ax ai-integrations` for LLM provider keys. If credentials are not available through these channels, ask the user.

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
| **Annotation queue items** | `ax annotation-queues` CLI (below) and/or the Arize UI; configs must exist |

Always ensure the relevant **annotation config** exists in the space before expecting labels to persist.

---

## Basic CRUD: Annotation Configs

### List

```bash
ax annotation-configs list --space SPACE
ax annotation-configs list --space SPACE -o json
ax annotation-configs list --space SPACE --limit 20
```

### Create — Categorical

Categorical configs present a fixed set of labels for reviewers to choose from.

```bash
ax annotation-configs create \
  --name "Correctness" \
  --space SPACE \
  --type categorical \
  --value correct \
  --value incorrect \
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
  --space SPACE \
  --type continuous \
  --min-score 0 \
  --max-score 10 \
  --optimization-direction maximize
```

### Create — Freeform

Freeform configs collect open-ended text feedback. No additional flags needed beyond name, space, and type.

```bash
ax annotation-configs create \
  --name "Reviewer Notes" \
  --space SPACE \
  --type freeform
```

### Get

```bash
ax annotation-configs get NAME_OR_ID
ax annotation-configs get NAME_OR_ID -o json
ax annotation-configs get NAME_OR_ID --space SPACE   # required when using name instead of ID
```

### Delete

```bash
ax annotation-configs delete NAME_OR_ID
ax annotation-configs delete NAME_OR_ID --space SPACE   # required when using name instead of ID
ax annotation-configs delete NAME_OR_ID --force   # skip confirmation
```

**Note:** Deletion is irreversible. Any annotation queue associations to this config are also removed in the product (queues may remain; fix associations in the Arize UI if needed).

---

## Annotation Queues: `ax annotation-queues`

Annotation queues route records (spans, dataset examples, experiment runs) to human reviewers. Each queue is linked to one or more annotation configs that define what labels reviewers can apply.

### List / Get

```bash
ax annotation-queues list --space SPACE
ax annotation-queues list --space SPACE -o json

ax annotation-queues get NAME_OR_ID --space SPACE
ax annotation-queues get NAME_OR_ID --space SPACE -o json
```

### Create

At least one `--annotation-config-id` is required.

```bash
ax annotation-queues create \
  --name "Correctness Review" \
  --space SPACE \
  --annotation-config-id CONFIG_ID \
  --annotator-email reviewer@example.com \
  --instructions "Label each response as correct or incorrect." \
  --assignment-method all   # or: random
```

Repeat `--annotation-config-id` and `--annotator-email` to attach multiple configs or reviewers.

### Update

List flags (`--annotation-config-id`, `--annotator-email`) **fully replace** existing values when provided — pass all desired values, not just the new ones.

```bash
ax annotation-queues update NAME_OR_ID --space SPACE --name "New Name"
ax annotation-queues update NAME_OR_ID --space SPACE --instructions "Updated instructions"
ax annotation-queues update NAME_OR_ID --space SPACE \
  --annotation-config-id CONFIG_ID_A \
  --annotation-config-id CONFIG_ID_B
```

### Delete

```bash
ax annotation-queues delete NAME_OR_ID --space SPACE
ax annotation-queues delete NAME_OR_ID --space SPACE --force   # skip confirmation
```

### List Records

```bash
ax annotation-queues list-records NAME_OR_ID --space SPACE
ax annotation-queues list-records NAME_OR_ID --space SPACE --limit 50 -o json
```

### Submit an Annotation for a Record

Annotations are upserted by config name — call once per annotation config. Supply at least one of `--score`, `--label`, or `--text`.

```bash
ax annotation-queues annotate-record NAME_OR_ID RECORD_ID \
  --annotation-name "Correctness" \
  --label "correct" \
  --space SPACE

ax annotation-queues annotate-record NAME_OR_ID RECORD_ID \
  --annotation-name "Quality Score" \
  --score 8.5 \
  --text "Response was accurate but slightly verbose." \
  --space SPACE
```

### Assign a Record

Assign users to review a specific record:

```bash
ax annotation-queues assign-record NAME_OR_ID RECORD_ID --space SPACE
```

### Delete Records

```bash
ax annotation-queues delete-records NAME_OR_ID --space SPACE
```

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
    space_id=os.environ["ARIZE_SPACE"],
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
| `Annotation config not found` | `ax annotation-configs list --space SPACE` (or use `ax annotation-configs get NAME_OR_ID --space SPACE`) |
| `409 Conflict on create` | Name already exists in the space. Use a different name or get the existing config ID. |
| Queue not found | `ax annotation-queues list --space SPACE`; verify the queue name or ID |
| Record not appearing in queue | Ensure the annotation config linked to the queue exists; check `ax annotation-configs list --space SPACE` |
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
