# Open Coding

Free-form note-writing against sampled traces, before any taxonomy exists. After you pick a sample of traces, read each one and write a short, specific observation of what went wrong. These raw notes feed [axial coding](axial-coding.md), where they get grouped into named failure categories — and ultimately into eval targets or fix priorities.

**Reach for this whenever** the user wants to look at traces or spans without a fixed taxonomy yet — e.g., "what's going wrong with this agent", "I just instrumented my app, where do I start", "review these traces", "what kinds of mistakes is the model making", "help me make sense of these outputs", or any framing that needs grounded observations before categories.

## Choosing the unit

Open coding has two scopes that don't have to match:

- **Review scope** — the **trace**. Read input → tool calls → retrieved context → output as one story.
- **Recording scope** — **default to the trace**. The honest observation is usually trace-shaped ("asked X, got Y; the answer didn't address the question"), and forcing localization to a span at this stage commits to causal attribution you don't yet have data to support — that's axial coding's job.

  Drop to a **span** only when one of:
  - The span, read in isolation, is still wrong: an exception fired, a tool returned an error response, the output is malformed.
  - You already know the domain well enough to attribute the failure on sight without inferring across spans.

Session-level findings are axial-coding rollup targets, not open-coding notes — Phoenix has REST `/v1/projects/{id}/session_annotations` but no session `add-note` path.

## Process

1. **Inspect** — fetch a trace from your sample
2. **Read** — look at input, output, exceptions, tool calls, retrieved context
3. **Note** — write one specific sentence describing what went wrong (or skip if correct)
4. **Record** — attach the note to the trace with `px trace add-note` (default), or to a span with `px span add-note` for in-isolation/mechanical failures
5. **Iterate** — move to the next trace; repeat until the sample is exhausted or saturation hits

## Inspection

Use `px` to read trace and span context before writing a note. Open coding reviews by **trace** — read input → tool calls → retrieved context → output as a unit. Record on the trace by default; drill to a specific span only when the failure is mechanical (exception, error response, malformed output) or you can attribute on sight (see [Choosing the unit](#choosing-the-unit)).

> **Don't filter the sample by `--status-code ERROR`.** OTel's `status_code` only flips to `ERROR` when an instrumentor catches a raised Python exception (network failure, 5xx, parse error). Hallucinations, wrong tone, retrieval misses, and bad tool selection all complete cleanly and arrive as `OK` or `UNSET`. Sampling for open coding by `--status-code ERROR` excludes the population this workflow exists to surface.

```bash
# Sample recent traces — the unit of inspection in open coding
px trace list --limit 100 --format raw --no-progress | jq '
  .[] | {trace_id: .traceId, root: .rootSpan.name, status,
         input: .rootSpan.attributes["input.value"],
         output: .rootSpan.attributes["output.value"]}
'

# Trace-level context — all spans in one trace, ordered by start_time
px trace get <trace-id> --format raw | jq '
  .spans | sort_by(.start_time) | map({span_id: .context.span_id, name, status_code,
    input: .attributes["input.value"],
    output: .attributes["output.value"]})
'

# Drill to one span (px span get does not exist; filter via span list)
px span list --trace-id <trace-id> --format raw --no-progress \
  | jq '.[] | select(.context.span_id == "<span-id>")'

# Check existing notes on traces (default) or spans you are about to review
# Notes are stored as annotations with name="note"; use --include-notes (not --include-annotations)
px trace list --include-notes --limit 10 --format raw --no-progress | jq '
  .[] | select((.notes // []) | length > 0)
  | {trace_id: .traceId, notes: [.notes[] | .result.explanation]}
'
# Same shape on spans — swap px trace for px span and use .context.span_id
```

Always pipe through `jq` with `--format raw --no-progress` when scripting.

## Recording Notes

Default write path is `px trace add-note <trace-id> --text "..."` — most observations are trace-shaped and shouldn't pre-commit to localization. Drop to `px span add-note <span-id>` when the failure is in-isolation wrong (exception, error response, malformed output) or you already know the failure structure on sight.

```bash
# Trace-level note (default)
px trace add-note <trace-id> --text "Asked about returns; final answer covered shipping policy instead"

# Span-level note (mechanical or attributable-on-sight failures)
px span add-note <span-id> --text "Tool call returned 500 — vendor API unreachable"

# Interactive loop — walk traces, write a trace-level note per failing trace
px trace list --last-n-minutes 60 --limit 50 --format raw --no-progress \
  | jq -r '.[].traceId' \
  | while read tid; do
      echo "── trace $tid ──"
      px trace get "$tid" --format raw | jq '
        {input: .rootSpan.attributes["input.value"],
         output: .rootSpan.attributes["output.value"],
         spans: (.spans | sort_by(.start_time) | map({name, status_code}))}
      '
      read -p "Note for $tid (blank to skip): " note
      [ -z "$note" ] && continue
      px trace add-note "$tid" --text "$note"
    done
```

Bulk auto-tagging by status code (e.g. `px span list --status-code ERROR | xargs ... add-note "error"`) is **not open coding** — open coding is manual, observation-grounded, and ranges over all failure modes, not just spans where Python raised. Skip the bulk-by-status-code shortcut; it produces fewer, less informative notes than walking traces.

**Fallback write paths (one-line asides):**

- `POST /v1/trace_notes` and `POST /v1/span_notes` — accept one `{data: {trace_id|span_id, note}}` per request; use for scripted writes outside the CLI.
- `@arizeai/phoenix-client` `addTraceNote` and `addSpanNote` wrap the same endpoints.
- `px api graphql` rejects mutations with `"Only queries are permitted."` — use `px trace/span add-note` or the REST endpoints instead.

## What Makes a Good Note

| Weak note            | Why it's weak             | Good note                                                                  | Why it's strong                             |
| -------------------- | ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| "Wrong answer"       | No observable detail      | "Said the store closes at 6pm but policy is 9pm"                           | Quotes observed vs. correct value           |
| "Bad tone"           | Vague judgment            | "Used first-name greeting for an enterprise support ticket"                | Specifies the context mismatch              |
| "Hallucination"      | Labels before observing   | "Cited a product feature ('auto-renew') that does not exist in the schema" | Describes what was fabricated               |
| "Retrieval issue"    | Category, not observation | "Retrieved docs about shipping when the question was about returns"        | States what was retrieved vs. needed        |
| "Model confused"     | Opaque                    | "Answered in Spanish when the user wrote in English"                       | Observable and reproducible                 |

Write what you saw, not the category you think it belongs to — categorization happens in [axial coding](axial-coding.md). Short prefixes like `TONE:` or `FACTUAL:` are a personal shorthand, not a repo convention.

## Saturation

Stop writing notes when observations stop being new. Signals:

- **Repeats** — the last 10–15 traces produced notes that describe failures you've already seen.
- **Paraphrase convergence** — you catch yourself writing minor variations of earlier notes.
- **Skips outnumber notes** — most recent traces are correct and need no note.

At saturation, move on to [axial coding](axial-coding.md) to group what you have. Continuing past saturation adds traces but not insight. You do not need to annotate every trace — annotating correct ones dilutes signal.

## Principles

- **Free-form over structured** — do not pre-commit to a taxonomy during open coding; categories emerge in axial coding.
- **Specific over general** — quote or paraphrase the observed failure; vague labels ("bad response") carry no signal.
- **Context before labeling** — inspect input, output, and retrieved context before writing any note.
- **Iterate before categorizing** — work through the full sample first; resist grouping while still collecting.
- **Skip is valid** — a correct span needs no note; annotating everything dilutes signal.
