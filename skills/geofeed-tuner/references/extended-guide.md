# Geofeed Tuner – Create Better IP Geolocation Feeds: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Directory Structure and File Management

This skill uses a clear separation between **distribution files** (read-only) and **working files** (generated at runtime).

### Read-Only Directories (Do Not Modify)

The following directories contain static distribution assets. **Do not create, modify, or delete files in these directories:**

| Directory      | Purpose                                                    |
|----------------|------------------------------------------------------------|
| `assets/`      | Static data files (ISO codes, examples)                    |
| `references/`  | RFC specifications and code snippets for reference         |
| `scripts/`     | Executable code and HTML template files for reports        |

### Working Directories (Generated Content)

All generated, temporary, and output files go in these directories:

| Directory       | Purpose                                              |
|-----------------|------------------------------------------------------|
| `run/`          | Working directory for all agent-generated content    |
| `run/data/`     | Downloaded CSV files from remote URLs                |
| `run/report/`   | Generated HTML tuning reports                        |

### File Management Rules

1. **Never write to `assets/`, `references/`, or `scripts/`** — these are part of the skill distribution and must remain unchanged.
2. **All downloaded input files** (from remote URLs) must be saved to `./run/data/`.
3. **All generated HTML reports** must be saved to `./run/report/`.
4. **All generated Python scripts** must be saved to `./run/`.
5. The `run/` directory may be cleared between sessions; do not store permanent data there.
6. **Working directory for execution:** All generated scripts in `./run/` must be executed with the **skill root directory** (the directory containing `SKILL.md`) as the current working directory, so that relative paths like `assets/iso3166-1.json` and `./run/data/report-data.json` resolve correctly. Do not `cd` into `./run/` before running scripts.

## Processing Pipeline: Sequential Phase Execution

### Phase 2: Gather Input

- If the user has not already provided a list of IP subnets or ranges (sometimes referred to as `inetnum` or `inet6num`), prompt them to supply it. Accepted input formats:
  - Text pasted into the chat
  - A local CSV file
  - A remote URL pointing to a CSV file

- If the input is a **remote URL**:
  - Attempt to download the CSV file to `./run/data/` before processing.
  - On HTTP error (4xx, 5xx, timeout, or redirect loop), **stop immediately** and report to the user:
    `Feed URL is not reachable: HTTP {status_code}. Please verify the URL is publicly accessible.`
  - Do not proceed to Phase 3 with an incomplete or empty download.

- If the input is a **local file**, process it directly without downloading.

- **Encoding detection and normalization:**
  1. Attempt to read the file as UTF-8 first.
  2. If a `UnicodeDecodeError` is raised, try `utf-8-sig` (UTF-8 with BOM), then `latin-1`.
  3. Once successfully decoded, re-encode and write the working copy as UTF-8.
  4. If no encoding succeeds, stop and report: `Unable to decode input file. Please save it as UTF-8 and try again.`

### Phase 4: Tuning Data Lookup

#### Objective
Lookup all the `Entries` using Fastah's `rfc8805-row-place-search` tool.

#### Execution Rules
- Generate a new **script** _only_ for payload generation (read the dataset and write one or more payload JSON files; do not call MCP from this script).
- Server only accepts 1000 entries per request, so if there are more than 1000 entries, split into multiple requests.
- The agent must read the generated payload files, construct the requests from them, and send those requests to the MCP server in batches of at most 1000 entries each.
- **On MCP failure:** If the MCP server is unreachable, returns an error, or returns no results for any batch, log a warning and continue to Phase 5. Set `TunedEntry: {}` for all affected entries. Do not block report generation. Notify the user clearly: `Tuning data lookup unavailable; the report will show validation results only.`
- Suggestions are **advisory only** — **never auto-populate** them.

#### Step 1: Build Lookup Payload with Deduplication

Load the dataset from: `./run/data/report-data.json`
- Read the `Entries` array. Each entry will be used to build the MCP lookup payload.

Reduce server requests by deduplicating identical entries:
- For each entry in `Entries`, compute a content hash (hash of `CountryCode` + `RegionCode` + `City`).
- Create a deduplication map: `{ contentHash -> { rowKey, payload, entryIndices: [] } }`. rowKey is a UUID that will be sent to the MCP server for matching responses.
- If an entry's hash already exists, append its **0-based array index** in `Entries` to that deduplication entry's `entryIndices` array.
- If hash is new, generate a **UUID (rowKey)** and create a new deduplication entry.

Build request batches:
- Extract unique deduplicated entries from the map, keeping them in deduplication order.
- Build request batches of up to 1000 items each.
- For each batch, keep an in-memory structure like `[{ rowKey, payload, entryIndices }, ...]` to match responses back by rowKey.
- When writing the MCP payload file, include the `rowKey` field with each payload object:

```json
[
    {"rowKey": "550e8400-e29b-41d4-a716-446655440000", "countryCode":"CA","regionCode":"CA-ON","cityName":"Toronto"},
    {"rowKey": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "countryCode":"IN","regionCode":"IN-KA","cityName":"Bangalore"},
    {"rowKey": "6ba7b811-9dad-11d1-80b4-00c04fd430c8", "countryCode":"IN","regionCode":"IN-KA"}
]
```

- When reading responses, match each response `rowKey` field to the corresponding deduplication entry to retrieve all associated `entryIndices`.

Rules:
- Write payload to: `./run/data/mcp-server-payload.json`
- Exit the script after writing the payload.

#### Step 2: Invoke Fastah MCP Tool

- An example `mcp.json` style configuration of Fastah MCP server is as follows:
```json
    "fastah-ip-geofeed": {
      "type": "http",
      "url": "https://mcp.fastah.ai/mcp"
    }
```
- Server: `https://mcp.fastah.ai/mcp`
- Tool and its Schema: before the first `tools/call`, the agent MUST send a `tools/list` request to read the input and output schema for **`rfc8805-row-place-search`**.
  Use the discovered schema as the authoritative source for field names, types, and constraints.
- The following is an illustrative example only; always defer to the schema returned by `tools/list`:

  ```json
  [
      {"rowKey": "550e8400-...", "countryCode":"CA", ...},
      {"rowKey": "690e9301-...", "countryCode":"ZZ", ...}
  ]
  ```
- Open `./run/data/mcp-server-payload.json` and send all deduplicated entries with their rowKeys.
- If there are more than 1000 deduplicated entries after deduplication, split into multiple requests of 1000 entries each.
- The server will respond with the same `rowKey` field in each response for mapping back.
- Do NOT use local data.

#### Step 3: Attach Tuned Data to Entries

- Generate a new **script** for attaching tuned data.
- Load both `./run/data/report-data.json` and the deduplication map (held in memory from Step 1, or re-derived from the payload file).
- For each response from the MCP server:
  - Extract the `rowKey` from the response.
  - Look up the `entryIndices` array associated with that `rowKey` from the deduplication map.
  - For each index in `entryIndices`, attach the best match to `Entries[index]`.
- Use the **first (best) match** from the response when available.

Create the field on each affected entry if it does not exist. Remap the MCP API response keys to Go struct field names:

```json
"TunedEntry": {
  "Name": "",
  "CountryCode": "",
  "RegionCode": "",
  "PlaceType": "",
  "H3Cells": [],
  "BoundingBox": []
}
```

The `TunedEntry` field is a **single object** (not an array). It holds the best match from the MCP server.

**MCP response key → JSON key mapping**:
| MCP API response key | JSON key                   |
|----------------------|----------------------------|
| `placeName`          | `Name`                     |
| `countryCode`        | `CountryCode`              |
| `stateCode`          | `RegionCode`               |
| `placeType`          | `PlaceType`                |
| `h3Cells`            | `H3Cells`                  |
| `boundingBox`        | `BoundingBox`              |

Entries with no UUID match (i.e. the MCP server returned no response for their UUID) must receive an empty `TunedEntry: {}` object — never leave the field absent.

- Write the dataset back to: `./run/data/report-data.json`
- Rules:
  - Maintain all existing validation flags.
  - Do NOT create additional intermediate files.

### Phase 5: Generate Tuning Report

Generate a **self-contained HTML report** by rendering the template at `./scripts/templates/index.html` with data from `./run/data/report-data.json` and `./run/data/comments.json`.

Write the completed report to `./run/report/geofeed-report.html`. After generating, attempt to open it in the system's default browser (e.g., `webbrowser.open()`). If running in a headless environment, CI pipeline, or remote container where no browser is available, skip the browser step and instead present the file path to the user so they can open or download it.

**The template uses Go `html/template` syntax** (`{{.Field}}`, `{{range}}`, `{{if eq}}`, etc.). Write a Python script that reads the template, builds a rendering context from the JSON data files, and processes the template placeholders to produce final HTML. Do not modify the template file itself — all processing happens in the Python script at render time.

#### Step 1: Replace Metadata Placeholders

Replace each `{{.Metadata.X}}` placeholder in the template with the corresponding value from `report-data.json`. Since JSON keys match the template placeholder, the mapping is direct — `{{.Metadata.InputFile}}` maps to the `InputFile` JSON key, etc.

| Template placeholder                   | JSON key (`report-data.json`)     |
|----------------------------------------|-----------------------------------|
| `{{.Metadata.InputFile}}`              | `InputFile`                       |
| `{{.Metadata.Timestamp}}`              | `Timestamp`                       |
| `{{.Metadata.TotalEntries}}`           | `TotalEntries`                    |
| `{{.Metadata.IpV4Entries}}`            | `IpV4Entries`                     |
| `{{.Metadata.IpV6Entries}}`            | `IpV6Entries`                     |
| `{{.Metadata.InvalidEntries}}`         | `InvalidEntries`                  |
| `{{.Metadata.Errors}}`                 | `Errors`                          |
| `{{.Metadata.Warnings}}`               | `Warnings`                        |
| `{{.Metadata.Suggestions}}`            | `Suggestions`                     |
| `{{.Metadata.OK}}`                     | `OK`                              |
| `{{.Metadata.CityLevelAccuracy}}`      | `CityLevelAccuracy`               |
| `{{.Metadata.RegionLevelAccuracy}}`    | `RegionLevelAccuracy`             |
| `{{.Metadata.CountryLevelAccuracy}}`   | `CountryLevelAccuracy`            |
| `{{.Metadata.DoNotGeolocate}}`         | `DoNotGeolocate` (metadata)       |

**Note on `{{.Metadata.Timestamp}}`:** This placeholder appears inside a JavaScript `new Date(...)` call. Replace it with the raw integer value (no HTML escaping needed for a numeric literal inside `<script>`). All other metadata values should be HTML-escaped since they appear inside HTML element text.

#### Step 2: Replace the Comment Map Placeholder

Locate this pattern in the template:
```javascript
const commentMap = {{.Comments}};
```

Replace `{{.Comments}}` with the serialized JSON object from `./run/data/comments.json`. The JSON is embedded directly as a JavaScript object literal (not inside a string), so no extra escaping is needed:

```python
comments_json = json.dumps(comments)
template = template.replace("{{.Comments}}", comments_json)
```

#### Step 3: Expand the Entries Range Block

The template contains a `{{range .Entries}}...{{end}}` block inside `<tbody id="entriesTableBody">`. Process it as follows:

1. **Extract** the range block body using regex. **Critical:** The block contains nested `{{end}}` tags (from `{{if eq .Status ...}}`, `{{if .Checked}}`, and `{{range .Messages}}`). A naive non-greedy match like `\{\{range \.Entries\}\}(.*?)\{\{end\}\}` will match the **first** inner `{{end}}`, truncating the block. Instead, anchor the outer `{{end}}` to the `</tbody>` that follows it:
    ```python
    m = re.search(
        r'\{\{range \.Entries\}\}(.*?)\{\{end\}\}\s*</tbody>',
        template,
        re.DOTALL,
    )
    entry_body = m.group(1)  # template text for one entry iteration
    ```
    This ensures you capture the full block body including all three `<tr>` rows and the nested `{{range .Messages}}...{{end}}`.
2. **Iterate** over each entry in `report-data.json`'s `Entries` array.
3. **Expand** the block body for each entry using the processing order below.
4. **Replace** the entire match (from `{{range .Entries}}` through `</tbody>`) with the concatenated expanded HTML followed by `</tbody>`.

**Processing order for each entry** (innermost constructs first to avoid `{{end}}` confusion):
1. Evaluate `{{if eq .Status ...}}...{{end}}` conditionals (status badge class and icon).
2. Evaluate `{{if .Checked}}...{{end}}` conditional (message checkbox).
3. Expand `{{range .Messages}}...{{end}}` inner range.
4. Replace simple `{{.Field}}` placeholders.

##### Entry Field Mapping

Within the range block body, replace these placeholders for each entry. Since JSON keys match the template placeholder, the template placeholder `{{.X}}` maps directly to JSON key `X`:

| Template placeholder           | JSON key (`Entries[]`)       | Notes                                                        |
|--------------------------------|------------------------------|--------------------------------------------------------------|
| `{{.Line}}`                    | `Line`                       | Direct integer value                                         |
| `{{.IPPrefix}}`                | `IPPrefix`                   | HTML-escaped                                                 |
| `{{.CountryCode}}`             | `CountryCode`                | HTML-escaped                                                 |
| `{{.RegionCode}}`              | `RegionCode`                 | HTML-escaped                                                 |
| `{{.City}}`                    | `City`                       | HTML-escaped                                                 |
| `{{.Status}}`                  | `Status`                     | HTML-escaped                                                 |
| `{{.HasError}}`                | `HasError`                   | Lowercase string: `"true"` or `"false"`                      |
| `{{.HasWarning}}`              | `HasWarning`                 | Lowercase string: `"true"` or `"false"`                      |
| `{{.HasSuggestion}}`           | `HasSuggestion`              | Lowercase string: `"true"` or `"false"`                      |
| `{{.GeocodingHint}}`           | `GeocodingHint`              | Empty string `""`                                            |
| `{{.DoNotGeolocate}}`          | `DoNotGeolocate`             | `"true"` or `"false"`                                        |
| `{{.Tunable}}`                 | `Tunable`                    | `"true"` or `"false"`                                        |
| `{{.TunedEntry.CountryCode}}`  | `TunedEntry.CountryCode`     | `""` if `TunedEntry` is empty `{}`                           |
| `{{.TunedEntry.RegionCode}}`   | `TunedEntry.RegionCode`      | `""` if `TunedEntry` is empty `{}`                           |
| `{{.TunedEntry.Name}}`         | `TunedEntry.Name`            | `""` if `TunedEntry` is empty `{}`                           |
| `{{.TunedEntry.H3Cells}}`      | `TunedEntry.H3Cells`         | Bracket-wrapped space-separated; `"[]"` if empty (see format below) |
| `{{.TunedEntry.BoundingBox}}`  | `TunedEntry.BoundingBox`     | Bracket-wrapped space-separated; `"[]"` if empty (see format below) |

**`data-h3-cells` and `data-bounding-box` format:** These are **NOT JSON arrays**. They are bracket-wrapped, space-separated values. Do **not** use JSON serialization (no quotes around string elements, no commas between numbers). Examples:
- `[836752fffffffff 836755fffffffff]` — correct
- `["836752fffffffff","836755fffffffff"]` — **WRONG**, quotes will break parsing
- `[-71.70 10.73 -71.52 10.55]` — correct
- `[]` — correct for empty

##### Evaluating Status Conditionals

**Process these BEFORE replacing simple `{{.Field}}` placeholders** — otherwise the `{{end}}` markers get consumed and the regex won't match.

The template uses `{{if eq .Status "..."}}` conditionals for the status badge CSS class and icon. Evaluate these by checking the entry's `status` value and keeping only the matching branch text.

The status badge line contains **two** `{{if eq .Status ...}}...{{end}}` blocks on a single line — one for the CSS class, one for the icon. Use `re.sub` with a callback to resolve all occurrences:

```python
STATUS_CSS = {"ERROR": "error", "WARNING": "warning", "SUGGESTION": "suggestion", "OK": "ok"}
STATUS_ICON = {
    "ERROR": "bi-x-circle-fill",
    "WARNING": "bi-exclamation-triangle-fill",
    "SUGGESTION": "bi-lightbulb-fill",
    "OK": "bi-check-circle-fill",
}

def resolve_status_if(match_obj, status):
    """Pick the branch matching `status` from a {{if eq .Status ...}}...{{end}} block."""
    block = match_obj.group(0)
    # Try each branch: {{if eq .Status "X"}}val{{else if ...}}val{{else}}val{{end}}
    for st, val in [("ERROR",), ("WARNING",), ("SUGGESTION",)]:
        # not needed to parse generically — just map from the known patterns
    ...
```

A simpler approach: since there are exactly two known patterns, replace them as literal strings:
```python
css_class = STATUS_CSS.get(status, "ok")
icon_class = STATUS_ICON.get(status, "bi-check-circle-fill")
body = body.replace(
    '{{if eq .Status "ERROR"}}error{{else if eq .Status "WARNING"}}warning{{else if eq .Status "SUGGESTION"}}suggestion{{else}}ok{{end}}',
    css_class,
)
body = body.replace(
    '{{if eq .Status "ERROR"}}bi-x-circle-fill{{else if eq .Status "WARNING"}}bi-exclamation-triangle-fill{{else if eq .Status "SUGGESTION"}}bi-lightbulb-fill{{else}}bi-check-circle-fill{{end}}',
    icon_class,
)
```
This avoids regex entirely and is safe because these exact strings appear verbatim in the template.

#### Step 4: Expand the Nested Messages Range

The `{{range .Messages}}...{{end}}` block contains a **nested** `{{if .Checked}} checked{{else}} disabled{{end}}` conditional, so its inner `{{end}}` would cause a simple non-greedy regex to match too early. Anchor the regex to `</td>` (the tag immediately after the messages range closing `{{end}}`) to capture the full block body:

```python
msg_match = re.search(
    r'\{\{range \.Messages\}\}(.*?)\{\{end\}\}\s*(?=</td>)',
    body, re.DOTALL
)
```

The lookahead `(?=</td>)` ensures the regex skips past the checkbox conditional's `{{end}}` (which is followed by `>`, not `</td>`) and matches only the range-closing `{{end}}` (which is followed by whitespace then `</td>`).

For each message in the entry's `Messages` array, clone the captured block body and expand it:

1. **Resolve the checkbox conditional** per message (must happen before simple placeholder replacement to remove the nested `{{end}}`):
   ```python
   if msg.get("Checked"):
       msg_body = msg_body.replace(
           '{{if .Checked}} checked{{else}} disabled{{end}}', ' checked'
       )
   else:
       msg_body = msg_body.replace(
           '{{if .Checked}} checked{{else}} disabled{{end}}', ' disabled'
       )
   ```

2. **Replace message field placeholders**:

   | Template placeholder | Source                            | Notes                          |
   |--------------------------|-----------------------------------|--------------------------------|
   | `{{.ID}}`                | `Messages[i].ID`                  | Direct string value from JSON  |
   | `{{.Text}}`              | `Messages[i].Text`                | HTML-escaped                   |

3. **Concatenate** all expanded message blocks and replace the original `{{range .Messages}}...{{end}}` match (`msg_match.group(0)`) with the result:
   ```python
   body = body[:msg_match.start()] + "".join(expanded_msgs) + body[msg_match.end():]
   ```

If `Messages` is empty, replace the entire matched region with an empty string (no message divs — only the issues header remains).

#### Output Guarantees

- The report must be readable in any modern browser without extra network dependencies beyond the CDN links already in the template (`leaflet`, `h3-js`, `bootstrap-icons`, Raleway font).
- All values embedded in HTML must be **HTML-escaped** (`<`, `>`, `&`, `"`) to prevent rendering issues.
- `commentMap` is embedded as a direct JavaScript object literal (not inside a string), so no JS string escaping is needed — just emit valid JSON.
- All values must be derived **only from analysis output**, not recomputed heuristically.

### Phase 6: Final Review

Perform a final verification pass using concrete, checkable assertions before presenting results to the user.

**Check 1 — Entry count integrity**
- Count non-comment, non-blank data rows in the original input CSV.
- Assert: `len(entries) in report-data.json == data_row_count`
- On failure: `Row count mismatch: input has {N} data rows but report contains {M} entries.`

**Check 2 — Summary counter integrity**
- These counters use **mutual exclusion** based on the boolean flags, which mirrors the highest-severity `Status` field. An entry with both `HasError: true` and `HasWarning: true` is counted only in `Errors`, never in `Warnings`. This is equivalent to counting by the entry's `Status` field.
- Assert all of the following; correct any that fail before generating the report:
  - `Errors == sum(1 for e in Entries if e['HasError'])`
  - `Warnings == sum(1 for e in Entries if e['HasWarning'] and not e['HasError'])`
  - `Suggestions == sum(1 for e in Entries if e['HasSuggestion'] and not e['HasError'] and not e['HasWarning'])`
  - `OK == sum(1 for e in Entries if not e['HasError'] and not e['HasWarning'] and not e['HasSuggestion'])`
  - `Errors + Warnings + Suggestions + OK == TotalEntries - InvalidEntries`

**Check 3 — Accuracy bucket integrity**
- Assert: `CityLevelAccuracy + RegionLevelAccuracy + CountryLevelAccuracy + DoNotGeolocate == TotalEntries - InvalidEntries`
- **Note:** The accuracy buckets defined in Phase 3 say "Do not count entries with `HasError: true`", but the Check 3 formula above uses `TotalEntries - InvalidEntries` (which still includes ERROR entries). This means ERROR entries (those that parsed as valid IPs but failed validation) **are** counted in accuracy buckets by their geo-field presence. Only `InvalidEntries` (unparsable IP prefixes) are excluded. Follow the Check 3 formula as the authoritative rule.
- On failure, trace and fix the bucketing logic before proceeding.

**Check 4 — No duplicate line numbers**
- Assert: all `Line` values in `Entries` are unique.
- On failure, report the duplicated line numbers to the user.

**Check 5 — TunedEntry completeness**
- Assert: every object in `Entries` has a `TunedEntry` key (even if its value is `{}`).
- On failure, add `"TunedEntry": {}` to any entry missing the key, then re-save `report-data.json`.

**Check 6 — Report file is present and non-empty**
- Confirm `./run/report/geofeed-report.html` was written and has a file size greater than zero bytes.
- On failure, regenerate the report before presenting to the user.
