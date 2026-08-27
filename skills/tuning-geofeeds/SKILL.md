---
name: tuning-geofeeds
description: 'Analyzes and tunes public IP RFC 8805 geofeed CSVs for network operators, preserving evidence while producing JSON, Markdown, HTML, GeoJSON, and explicitly approved corrected feeds. Use for public prefix geolocation quality, duplicate or carved-prefix review, optional RDAP consistency evidence, or Fastah place-search enrichment; do not use for private/internal IPAM or generic CSV work.'
license: Apache-2.0
compatibility: "Requires Python 3.14+. Runs locally by default; network access is optional and limited to managed public-HTTPS acquisition, direct authoritative RIR RDAP, and host-mediated Fastah MCP."
metadata:
  author: Fastah Inc.
  version: "0.2.0"
---

# Tune public geofeeds

Use the bundled analyzer to inspect and improve an RFC 8805 feed without
silently changing authored data. Keep one user-selected working directory for
all generated files; never write runtime output into this skill directory.

## Get the feed

Claude Cowork, other cloud agents, and corporate networks may allow only listed
HTTPS hosts. If the host cannot fetch the geofeed URL, ask the user to upload
the CSV. That is the intended path. Do not bypass the host's network policy or
reconstruct feed rows.

## Gotchas and invariants

- **Fastah MCP receives only** `rowKey`, `countryCode`, `regionCode`,
  `cityName`, and `searchMode`. Never send a prefix, source URL, comment,
  publisher profile, RDAP evidence, approval data, or the full Analysis IR.
- Analyze the complete feed locally. More than 400,000 data rows is a hard
  error; comments and blank physical lines do not count. Never truncate or
  split an oversized feed to produce partial Analysis IR.
- Never auto-apply a proposal. A corrected CSV requires the user to identify
  exact proposal IDs and explicitly approve each one.
- RDAP evidence can be `consistent`, `conflicting`, `unverified`, or
  `unavailable`; it never proves legal ownership. MCP matches are advisory.
  Rank, population weight, and radius are not confidence.
- `package/schema/mcp-place-search-request.schema.json` and
  `package/schema/mcp-place-search-response.schema.json` are frozen local
  adapter/exchange contract v1.0 schemas. They validate the local export/import
  envelope and audit captures; they are not the live Fastah MCP tool schemas.
- Do not write parser, validator, schema, renderer, or correction scripts.
  Invoke `scripts/geofeed_cli.py`; the typed models and committed schemas are
  the source of truth.
- Do not start an unmanaged web server or tell the user to open localhost.
  Return artifacts through the host's file or attachment mechanism.

## Available scripts

- **`scripts/geofeed_cli.py`** — Agent-facing launcher for analysis, rendering,
  MCP exchange, and approval-gated correction commands. Use `--help`; do not
  read or reproduce its implementation.

## Prepare commands

Resolve the installed skill root, then run commands from that directory. The
launcher also resolves its bundled package from its own absolute file location,
so a host-provided absolute launcher path remains safe from any working directory.

```bash
SKILL_ROOT="/absolute/path/to/tuning-geofeeds"
cd "$SKILL_ROOT"
PYTHON="/absolute/path/to/python3.14"
RUN="scripts/geofeed_cli.py"
WORK="/absolute/path/to/user-selected-work-directory"
mkdir -p "$WORK"
```

Before the first run, follow [Python setup](references/setup.md). Use
`"$PYTHON" "$RUN" --help` for the current command contract.

## Default workflow

Track these gates and do not skip from analysis to export:

- [ ] Local source acquired safely
- [ ] Base Analysis JSON created and findings summarized
- [ ] Optional RDAP and MCP stages explicitly chosen
- [ ] JSON, Markdown, HTML, and GeoJSON rendered from the final validated IR
- [ ] Proposals reviewed
- [ ] Exact decisions recorded only after user approval
- [ ] Corrected CSV exported and reanalyzed, if approved

### 1. Obtain a local source

Use a local or uploaded file, or the host's normal HTTPS download capability.
If the host blocks the URL, ask the user to upload the CSV. Do not create a
downloader or bypass network controls. The analyzer accepts strict UTF-8 local
files. If conversion is needed, keep the original and make a separate UTF-8
working copy.

Set `INPUT` to that absolute local path.
Analysis records `source.sha256` for audits and for binding later approvals to
the analyzed file. Most users do not need to calculate a separate digest.

### 2. Analyze locally and present base findings

```bash
"$PYTHON" "$RUN" analyze "$INPUT" --output "$WORK/analysis-base.json"
"$PYTHON" "$RUN" render "$WORK/analysis-base.json" --output "$WORK/analysis-base.md"
```

Summarize counts and evidence separately as authored values, RFC 8805
violations, Fastah quality recommendations, and operational warnings. Preserve
invalid and unresolved rows. Do not claim enrichment has occurred.

### 3. Optionally add direct-RIR RDAP evidence

Before enabling RDAP, explain that canonical prefixes go directly to the
authoritative RIR selected through IANA bootstrap, not to Fastah MCP. The IR
retains only allowlisted consistency evidence, not contact payloads. If the
user accepts and supplies an optional profile:

```bash
"$PYTHON" "$RUN" analyze "$INPUT" \
  --rdap --publisher-profile "$PUBLISHER_PROFILE" \
  --output "$WORK/analysis-rdap.json"
```

Set `CURRENT_IR` to this output. Otherwise set it to `analysis-base.json`.
Timeouts, rate limits, malformed responses, or unavailable RIRs leave base
analysis usable; report `unavailable` rather than guessing.

### 4. Optionally add host-mediated Fastah MCP evidence

If the user opts in, have the host complete its normal OAuth flow, then use
`tools/list` (including all pages) to rediscover the current Fastah MCP tool
definitions before use. This workflow uses `rfc8805-row-place-search`; Fastah
may offer other tools, so do not treat it as the only valid Fastah MCP tool.
Read that tool's current `inputSchema`, `outputSchema`, and advertised positive
batch limit. Rediscover after a `notifications/tools/list_changed` notification
or before a later enrichment run; do not substitute the committed local adapter
schemas for discovery. Never ask the user to paste a password, token, or other
credential. Do not implement OAuth/MCP transport.

Use MCP only when the discovered `rfc8805-row-place-search` definition has an
`outputSchema` and supports the five allowlisted request fields plus the
row-correlation semantics needed by the local adapter. If it lacks an
`outputSchema`, cannot satisfy those checks, or MCP is unavailable, explain
that enrichment was skipped and continue with the local analysis. Export
batches using the discovered limit:

```bash
"$PYTHON" "$RUN" mcp-export "$CURRENT_IR" \
  --batch-limit "$DISCOVERED_BATCH_LIMIT" \
  --output-dir "$WORK/mcp-requests"
```

Have the host invoke `rfc8805-row-place-search` once per batch and save each
validated structured response in order under `WORK`. Inspect every outbound JSON
object first: it must contain only `rows`, and every row must contain only the
five allowlisted fields above. Export deterministically groups only exact,
byte-identical `(countryCode, regionCode, cityName, searchMode)` tuples in
first-seen order.
`mcp-requests/mapping.json` records the local-only, integrity-bound fanout from
each representative request row to all source rows; keep it beside the raw
request/response captures and never send it to MCP. Export includes valid do-not-geolocate rows,
including empty and `ZZ` country values. Every exported row has a deterministic,
privacy-safe, batch-unique `rowKey` of 32–128 characters; import fans its echoed
result into one unique MCP observation for every eligible source row;
`do_not_geolocate` is a first-class typed status in that common envelope and
does not invoke backend geocoding. MCP processing must never clear that state
or populate/apply location fields. Then import all captured responses:

```bash
"$PYTHON" "$RUN" mcp-import "$CURRENT_IR" "$WORK"/mcp-response-*.json \
  --mapping "$WORK/mcp-requests/mapping.json" \
  --batch-limit "$DISCOVERED_BATCH_LIMIT" \
  --output "$WORK/analysis-enriched.json"
```

Set `CURRENT_IR` to the enriched output. Partial, no-match, invalid-input, or
backend-unavailable statuses remain evidence and never erase base findings or
trigger a correction automatically. If MCP is unavailable, continue offline.

### 5. Render final review artifacts

```bash
"$PYTHON" "$RUN" render "$CURRENT_IR" --output "$WORK/analysis.md"
"$PYTHON" "$RUN" render-html "$CURRENT_IR" --output "$WORK/dashboard.html"
"$PYTHON" "$RUN" export-geojson "$CURRENT_IR" --output "$WORK/analysis.geojson"
```

The Analysis JSON itself is the JSON artifact. Renderers accept only validated
IR and do not recompute findings. Explain output distinctions using
[Interpretation guide](references/interpretation.md). Present the files through
the host; the offline dashboard needs no server or Mapbox token. Offline or
RDAP-only analysis has no point or bounds geometry. In that case GeoJSON is a
valid empty FeatureCollection and the launcher prints an informational message;
only MCP place evidence can populate its features.

### 6. Propose, review, and explicitly approve corrections

```bash
"$PYTHON" "$RUN" propose-corrections "$CURRENT_IR" \
  --output "$WORK/analysis-proposed.json" \
  --plan "$WORK/correction-plan.json"
```

Show each proposal's ID, row/source line, field, old/new values, rule,
rationale, evidence, and `deterministic` or `not_assessed` confidence. Ask the
user to decide every exact ID. End with an explicit decision list in this
shape, one line per proposal: `proposal-...: approve | reject`. Ask: “For each
proposal ID, reply approve or reject.” Do not ask only for approvals, omit
rejections, or preselect either action.

After the user answers, record every stated decision with a user/host-supplied
approver label and timezone-aware timestamp:

```bash
"$PYTHON" "$RUN" record-approval "$WORK/correction-plan.json" \
  --approver "$APPROVER_LABEL" --decided-at "$DECIDED_AT" \
  --approve proposal-... --reject proposal-... \
  --output "$WORK/correction-approval.json"
```

If no proposal is explicitly approved, stop without a corrected CSV. Otherwise:

CSV formatting may still be normalized. The meaning of row data must not
change, except for explicitly approved corrections. Rows without approved
proposals remain as authored.

```bash
"$PYTHON" "$RUN" export-csv "$WORK/analysis-proposed.json" \
  "$WORK/correction-approval.json" --source "$INPUT" \
  --output "$WORK/corrected.csv" \
  --final-analysis "$WORK/analysis-final.json"
"$PYTHON" "$RUN" analyze "$WORK/corrected.csv" \
  --output "$WORK/corrected-reanalysis.json"
```

Export fails closed for stale/tampered approvals, changed sources, unsafe CSV
values, or existing output paths.

## Finish

Report absolute artifact paths, source digest, row/finding counts, enrichment
status, approved/rejected proposal IDs, and remaining findings. State clearly
which claims are authored, advisory, or approved. Mention skipped or failed
optional stages without fabricating results.
