# Axial Coding

Group open-ended observations into structured failure taxonomies. Axial coding turns notes, trace observations, or open-coding output into named categories with counts, supporting downstream work like eval design and fix prioritization. It works well after [open coding](open-coding.md), but can start from any set of open-ended observations.

**Reach for this whenever** the user has observations and needs structure — e.g., "what categories of failures do we have", "what should I build evals for", "how do I prioritize fixes", "group these notes", "MECE breakdown", or any framing that asks for categories or counts grounded in real traces rather than invented top-down.

## Choosing the unit

Open-coding notes are usually **trace-level** (see [open-coding.md#choosing-the-unit](open-coding.md#choosing-the-unit)) — examples below lead with `px trace` and fall back to `px span` for span-level notes. **An axial label can live at a different level than the note that informed it** — that's a feature: a trace-level note "answered shipping when asked returns" can produce a span-level annotation on the retrieval span once a pattern reveals retrieval as the consistent culprit. Re-attribution at axial coding time is what axial coding *is*. Session-level rollups go through REST `/v1/projects/{id}/session_annotations` (no CLI write path).

## Process

1. **Gather** — Collect open-coding notes from the entities you reviewed (trace-level by default)
2. **Pattern** — Group notes with common themes
3. **Name** — Create actionable category names
4. **Attribute** — Decide what level each category lives at; an axial label can move from the note's level to the component the pattern implicates
5. **Quantify** — Count failures per category

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

## Reading

### 1. Gather — extract open-coding notes

Open-coding notes are stored as annotations with `name="note"` and are only returned when `--include-notes` is passed. Use `--include-annotations` instead and you will get structured annotations but **not** notes — the server excludes notes from the annotations array.

```bash
# Trace-level notes (default for open coding)
px trace list --include-notes --format raw --no-progress | jq '
  [ .[] | select((.notes // []) | length > 0) ]
  | map({ trace_id: .traceId, notes: [ .notes[].result.explanation ] })
'

# Span-level notes (when open coding dropped to span for mechanical failures)
px span list --include-notes --format raw --no-progress | jq '
  [ .[] | select((.notes // []) | length > 0) ]
  | map({ span_id: .context.span_id, notes: [ .notes[].result.explanation ] })
'
```

### 2. Group — synthesize categories

Review the note text collected above. Manually identify recurring themes and draft candidate category names. Aim for MECE coverage: each note should fit exactly one category.

### 3. Record — write axial-coding annotations

Write one annotation per entity using `px trace annotate` or `px span annotate`. The level can differ from where the source note lives — see the **Recording** section below.

### 4. Quantify — count per category

After recording, use `--include-annotations` to count how many entities carry each label. Examples below show span-level counts; for trace-level annotations, swap `px span list` for `px trace list` (the `.annotations[]` shape is the same).

```bash
px span list --include-annotations --format raw --no-progress | jq '
  [ .[] | .annotations[]? | select(.name == "failure_category" and .result.label != null) ]
  | group_by(.result.label)
  | map({ label: .[0].result.label, count: length })
  | sort_by(-.count)
'
```

Filter to a specific annotation name to check coverage:

```bash
px span list --include-annotations --format raw --no-progress | jq '
  [ .[] | select((.annotations // []) | any(.name == "failure_category")) ]
  | length
'
```

## Recording

Use the matching annotate command for the level the **label** belongs at — which may differ from where the source note lives (see [Choosing the unit](#choosing-the-unit)):

```bash
# Trace-level label (most common — the trace as a whole exhibits the failure)
px trace annotate <trace-id> \
  --name failure_category \
  --label answered_off_topic \
  --explanation "asked about returns; answer covered shipping" \
  --annotator-kind HUMAN

# Span-level label (when the pattern implicates a specific component)
px span annotate <span-id> \
  --name failure_category \
  --label retrieval_off_topic \
  --explanation "retrieved shipping docs for a returns query" \
  --annotator-kind HUMAN
```

Accepted flags: `--name`, `--label`, `--score`, `--explanation`, `--annotator-kind` (`HUMAN`, `LLM`, `CODE`). There are no `--identifier` or `--sync` flags on these commands.

### Bulk recording

Axial coding categorizes the entities you took notes on during open coding. Do **not** filter by `--status-code ERROR` — that captures only spans where Python raised, which excludes most failure modes (hallucination, wrong tone, retrieval miss). See [open-coding.md](open-coding.md#inspection) for the full reasoning.

```bash
# Bulk-annotate traces that already have open-coding notes
px trace list --include-notes --format raw --no-progress \
  | jq -r '.[] | select((.notes // []) | length > 0) | .traceId' \
  | while read tid; do
      px trace annotate "$tid" \
        --name failure_category \
        --label answered_off_topic \
        --annotator-kind HUMAN
    done
```

The same pattern works for span-level notes — swap `px trace` for `px span` and `.traceId` for `.context.span_id`.

Aside: for Node-based bulk scripts, `@arizeai/phoenix-client` exposes `addSpanAnnotation`, `addSpanNote`, and `addTraceNote`. (No `addTraceAnnotation` is exported today; use the REST endpoint or `px trace annotate` for trace-level annotations.)

Aside: `px api graphql` rejects mutations — it cannot write annotations.

## Agent Failure Taxonomy

```yaml
agent_failures:
  planning: [wrong_plan, incomplete_plan]
  tool_selection: [wrong_tool, missed_tool, unnecessary_call]
  tool_execution: [wrong_parameters, type_error]
  state_management: [lost_context, stuck_in_loop]
  error_recovery: [no_fallback, wrong_fallback]
```

### Transition Matrix — jq sketch

To find where failures occur between agent states, identify the last non-error span before each first-error span within a trace. Note: OTel leaves most spans at `status_code == "UNSET"` and only sets `"OK"` when code explicitly does so — match `!= "ERROR"` rather than `== "OK"` so the matrix works on typical OTel data.

```bash
px span list --format raw --no-progress | jq '
  group_by(.context.trace_id)
  | map(
      sort_by(.start_time)
      | { trace_id: .[0].context.trace_id,
          last_non_error: map(select(.status_code != "ERROR")) | last | .name,
          first_err:      map(select(.status_code == "ERROR")) | first | .name }
    )
  | [ .[] | select(.first_err != null) ]
  | group_by([.last_non_error, .first_err])
  | map({ transition: "\(.[0].last_non_error) → \(.[0].first_err)", count: length })
  | sort_by(-.count)
'
```

Use the output to tally which state-to-state transitions are most failure-prone and add them to your taxonomy.

## What Makes a Good Category

A useful category is:
- **Named for the cause**, not the symptom ("wrong_tool_selected", not "bad_output")
- **Tied to a fix** — if you can't name a remediation, the category is too vague
- **Grounded in data** — emerged from actual note text, not assumed upfront

## Principles

- **MECE** - Each failure fits ONE category
- **Actionable** - Categories suggest fixes
- **Bottom-up** - Let categories emerge from data
