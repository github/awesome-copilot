# Axial Coding

Group open-ended observations into structured failure taxonomies. Axial coding turns notes, trace observations, or open-coding output into named categories with counts, supporting downstream work like eval design and fix prioritization. It works well after [open coding](open-coding.md), but can start from any set of open-ended observations.

**Reach for this whenever** the user has observations and needs structure — e.g., "what categories of failures do we have", "what should I build evals for", "how do I prioritize fixes", "group these notes", "MECE breakdown", or any framing that asks for categories or counts grounded in real traces rather than invented top-down.

## Coding annotation identifier (reuse the open-coding value)

Reuse the **coding annotation identifier** chosen in open coding — every `annotate` call below passes `--identifier "$CODING_ANNOTATION_IDENTIFIER"` explicitly. In a fresh shell or fresh agent invocation, set `CODING_ANNOTATION_IDENTIFIER` to the same value (recoverable from the wrap-up UI URL or by listing `.px/coding/*.jsonl`); don't mint a new id. See [open-coding.md#coding-annotation-identifier-pick-this-first](open-coding.md#coding-annotation-identifier-pick-this-first) for the rationale and the sanitization rule.

> **Workflow term vs. server annotation name.** The skill calls this value the **coding annotation identifier**; the server annotation NAME used for the UI filter stays `coding_session_id` for data compatibility. Don't try to rename the server-side key.

```bash
CODING_ANNOTATION_IDENTIFIER="coding-run:chatbot-context-loss-2026-05-06"
SLUG=$(echo -n "$CODING_ANNOTATION_IDENTIFIER" | sed 's/[^a-zA-Z0-9_-]/-/g')
NOTES_SIDECAR=".px/coding/${SLUG}.jsonl"
AXIAL_SIDECAR=".px/coding/${SLUG}-axial.jsonl"
```

## Choosing the unit

Open coding's diagnostic in [open-coding.md#choosing-the-unit-of-analysis](open-coding.md#choosing-the-unit-of-analysis) commits to a unit (trace, span, or session). Axial coding inherits that unit by default — if open coding ran at the session level, axial labels will too; same for trace and span.

**An axial label can live at a different level than the note that informed it** — that's a feature, and it works in every direction:

- *Trace → span*: a trace-level note "answered shipping when asked about returns" can produce a span-level annotation on the retrieval span once a pattern reveals retrieval as the consistent culprit.
- *Trace → session*: a batch of trace-level notes describing single-turn confusion can produce a session-level annotation once you see the pattern is "the agent doesn't track the user's stated context across turns."
- *Session → trace*: a session-level note about cross-turn drift may, on closer reading, attribute to one specific turn where the agent dropped the thread; a trace-level annotation can name that turn.

Whichever level you write the axial label on, write the matching `coding_session_id` UI-filter annotation on the same entity (see [UI-filter annotation](#ui-filter-annotation) below) so the UI link picks it up.

## Process

1. **Set the coding annotation identifier** — set `CODING_ANNOTATION_IDENTIFIER` to the value used in open coding and re-derive `SLUG`, `NOTES_SIDECAR`, `AXIAL_SIDECAR` (see [Coding annotation identifier](#coding-annotation-identifier-reuse-the-open-coding-value))
2. **Gather** — read open-coding notes from `$NOTES_SIDECAR` (at the unit committed in open coding); no server round-trip
3. **Pattern** — group notes with common themes
4. **Name** — create actionable category names
5. **Attribute** — decide what level each category lives at; an axial label can move up (trace → session) or down (trace → span) from the source note's level to the level the pattern actually implicates
6. **Record** — `px {trace,span,session} annotate ... --name axial_coding_category --label <cat> --identifier "$CODING_ANNOTATION_IDENTIFIER"`, add/update one JSONL sidecar row for the label, then write the matching `coding_session_id` UI-filter annotation
7. **Quantify** — count failures per category from `$AXIAL_SIDECAR`

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

### 1. Gather — read this run's open-coding notes from the sidecar

Open-coding wrote one JSONL line per note to `$NOTES_SIDECAR` (`.px/coding/${SLUG}.jsonl`). Read it directly — no server round-trip is needed. Each line has `entity_kind`, `entity_id`, `note`, `identifier`, and `ts`. If the same `(entity_kind, entity_id)` appears more than once, use the newest `ts` as the current note.

**Missing-file behavior.** An absent `$NOTES_SIDECAR` means open coding hasn't run for this coding annotation identifier in this CWD — stop and run open coding first, do not silently treat it as zero notes.

**Malformed lines.** Each line is independently parseable JSON. If `jq` reports a parse error, fix or drop that line manually; do not edit other lines.

**Notes outside this run.** The sidecar only carries notes this CWD wrote. To pull notes another reviewer or earlier run wrote, fetch them via `px {trace,span,session} list --include-notes` (embeds notes into row output) — the workflow's sidecar is intentionally per-CWD-per-coding-identifier.

### 2. Group — synthesize categories

Review the note text collected above. Manually identify recurring themes and draft candidate category names. Aim for MECE coverage: each note should fit exactly one category.

### 3. Record — write axial-coding labels

Write one annotation per entity using `px {trace,span,session} annotate`, passing `--identifier "$CODING_ANNOTATION_IDENTIFIER"` explicitly on every call, and record one JSONL row in `$AXIAL_SIDECAR` so [Quantify](#4-quantify--count-per-category-from-the-axial-sidecar) below can count without a server round-trip. The level can differ from where the source note lives — see [Recording](#recording) below.

### 4. Quantify — count per category from the axial sidecar

Counts come from `$AXIAL_SIDECAR` (populated by [Record](#3-record--write-axial-coding-labels)). No server query, no project-wide history mixed in — the sidecar holds exactly the labels this run wrote. Count the current rows by `axial_label`; if an entity appears more than once, use the newest `ts`.

Same missing-file and malformed-line rules as `$NOTES_SIDECAR`: a missing axial sidecar means no labels have been written yet (run [Record](#3-record--write-axial-coding-labels)); malformed lines are line-local — fix or drop, don't edit neighbors.

## Recording

Use the matching annotate command for the level the **label** belongs at — which may differ from where the source note lives (see [Choosing the unit](#choosing-the-unit)). Every call carries `--identifier "$CODING_ANNOTATION_IDENTIFIER"` and `--format raw --no-progress`, and is paired with a JSONL row in `$AXIAL_SIDECAR`.

**Axial sidecar JSONL line shape (one per `annotate`):**

```json
{"entity_kind":"trace","entity_id":"<trace-id>","annotation_name":"axial_coding_category","axial_label":"<label>","explanation":"<optional explanation>","identifier":"<original identifier value, unsanitized>","ts":"<ISO-8601 UTC>"}
```

Fields:
- `entity_kind` — `"trace"`, `"span"`, or `"session"` (matches the `annotate` subcommand)
- `entity_id` — the entity argument passed to `annotate`
- `annotation_name` — always `"axial_coding_category"` for axial labels (the workflow's reserved annotation name)
- `axial_label` — the `--label` value, verbatim; this is what [Quantify](#4-quantify--count-per-category-from-the-axial-sidecar) groups on
- `explanation` — optional, but include it when the `annotate` call used `--explanation`
- `identifier` — the **original** `$CODING_ANNOTATION_IDENTIFIER` value, unsanitized; the sanitized form lives only in the filename
- `ts` — ISO-8601 UTC timestamp of the local append

If you revise a label for the same entity under the same coding annotation identifier, either replace that row or append a newer row. When duplicate `(entity_kind, entity_id, annotation_name)` rows exist, the newest `ts` is the current label. This matches the server upsert behavior of `annotate --identifier`.

Minimal trace example:

```bash
px trace annotate <trace-id> \
  --name axial_coding_category \
  --label answered_off_topic \
  --explanation "asked about returns; answer covered shipping" \
  --annotator-kind HUMAN \
  --identifier "$CODING_ANNOTATION_IDENTIFIER" \
  --format raw --no-progress
```

Then add a matching JSONL row to `$AXIAL_SIDECAR` using the line shape above. For span or session labels, change `entity_kind`, `entity_id`, and the `px` subcommand accordingly.

Accepted flags: `--name`, `--label`, `--score`, `--explanation`, `--annotator-kind` (`HUMAN`, `LLM`, `CODE`), `--identifier`. There is no `--sync` flag — the CLI passes `sync=true` itself.

### UI-filter annotation

Write a `coding_session_id` annotation at the same level as the axial label — see [open-coding.md#ui-filter-annotation](open-coding.md#ui-filter-annotation) for why the Phoenix UI filter requires a name-based annotation rather than the bare `--identifier`. If open coding already wrote `coding_session_id` on the same entity, this call upserts (idempotent). The annotation NAME `coding_session_id` is unchanged; only the workflow's spoken term is "coding annotation identifier".

```bash
# Same level as the axial label above
px trace annotate <trace-id> \
  --name coding_session_id \
  --label "$CODING_ANNOTATION_IDENTIFIER" \
  --identifier "$CODING_ANNOTATION_IDENTIFIER"
# or px span annotate / px session annotate at matching levels
```

### Recording discipline

Axial coding categorizes the entities you took notes on during open coding. Use `$NOTES_SIDECAR` as the source of candidate entities and write labels only after reading the note text and surrounding trace/span/session context. Do **not** filter by `--status-code ERROR` — that captures only spans where Python raised, which excludes most failure modes (hallucination, wrong tone, retrieval miss). See [open-coding.md](open-coding.md#inspection) for the full reasoning.

**Fallback paths:** REST `POST /v1/{trace,span,session}_annotations` and `@arizeai/phoenix-client`'s `addSpanAnnotation` / `addSessionAnnotation` (no `addTraceAnnotation` is exported today — use REST or `px trace annotate`). The GraphQL endpoint rejects mutations.

## Wrapping up

After axial coding finishes, share the Phoenix UI link with the user. The link points to the project's traces table filtered by the `coding_session_id` annotation — `annotations['coding_session_id'].label == '<coding-annotation-id>'`. The UI route `/projects/:projectId` expects an encoded GraphQL node ID, not a project name — resolve it via `px project get`:

```bash
project_id=$(px project get "$PHOENIX_PROJECT" --format raw --no-progress | jq -r '.id')
encoded=$(python3 -c 'import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))' \
  "annotations['coding_session_id'].label == '$CODING_ANNOTATION_IDENTIFIER'")
echo "Phoenix UI: $PHOENIX_HOST/projects/$project_id/traces?filterCondition=$encoded"
```

If the user wants to discard everything this run produced (open-coding notes, axial-coding labels, and `coding_session_id` annotations on the server, plus the local sidecars), three identifier-bound deletes handle the server side and one `rm` handles the local sidecars. **Confirm before running** — destructive. Each `px <entity>-annotations delete` call requires `--all` to authorize the unbounded sweep; `--identifier` only narrows. Set `PHOENIX_CLI_DANGEROUSLY_ENABLE_DELETES=true` first if not already exported:

```bash
for kind in trace span session; do
  px "$kind-annotations" delete \
    --identifier "$CODING_ANNOTATION_IDENTIFIER" \
    --all -y \
    --format raw --no-progress
done
rm -f "$NOTES_SIDECAR" "$AXIAL_SIDECAR"
```

Each `px <entity>-annotations delete` call removes notes, axial-coding labels, and `coding_session_id` annotations together because they share the underlying annotation table; the `rm` clears the local sidecars.

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

- **One coding annotation identifier per run** — every `annotate` call and every sidecar line carries `$CODING_ANNOTATION_IDENTIFIER`, the same value open coding used; never mint a new id mid-run.
- **Pass `--identifier` explicitly** — every `px` call gets `--identifier "$CODING_ANNOTATION_IDENTIFIER"`; do not rely on inherited env vars.
- **Sidecar reads, server writes** — Gather and Quantify read `$NOTES_SIDECAR` and `$AXIAL_SIDECAR` locally; Record writes to the server and updates the sidecar. If an entity appears more than once, the newest `ts` wins.
- **MECE** — Each failure fits ONE category.
- **Actionable** — Categories suggest fixes.
- **Bottom-up** — Let categories emerge from data.
- **UI-filter annotation always paired** — never write `axial_coding_category` without writing the matching `coding_session_id` annotation; the UI link depends on it.
