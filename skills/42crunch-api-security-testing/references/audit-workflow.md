# Audit Workflow

> **Command conventions used throughout this file**
> - `<binary>` — the full path resolved during binary discovery (e.g. `~/.42crunch/bin/42c-ast`). Never call `42c-ast` by name alone unless it is confirmed to be on PATH.
> - **Platform mode**: prefix every command with `API_KEY="<resolved-value>" PLATFORM_HOST="<value>"` (both values read from `~/.42crunch/conf/env` on macOS/Linux or `%APPDATA%\42Crunch\conf\env` on Windows).
> - **Freemium mode**: add `--freemium-host stateless.42crunch.com:443` and `--token <FREEMIUM_TOKEN>` to every command.
> - **Score tracking**: record `initial_score`, `initial_sec_score`, and `initial_data_score` immediately after the first parse (Step 2). These are used to build the before/after comparison in the final summary.

---

## Step 1 — Run the Audit

> **Freemium mode**: omit `--tag` and `--report-sqg` from all commands in this
> step. These flags require platform access and must not be used in freemium mode.

Resolve a platform-appropriate output directory and create it if it does not exist:

```bash
# macOS / Linux
OUTPUT_DIR=/tmp/42c-audit
mkdir -p "$OUTPUT_DIR"
```

```powershell
# Windows
$OUTPUT_DIR = "$env:TEMP\42c-audit"
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null
```

### Platform mode

```bash
API_KEY="<resolved-value>" PLATFORM_HOST="<value>" <binary> audit run \
  --enrich=false \
  --output "$OUTPUT_DIR/report.json" \
  --output-format json \
  --report-sqg \
  [--tag <category>:<tagname>] \   # include only when a tag is assigned
  <path-to-oas-file>
```

### Freemium mode

```bash
<binary> audit run \
  --enrich=false \
  --freemium-host stateless.42crunch.com:443 \
  --token <FREEMIUM_TOKEN> \
  --output "$OUTPUT_DIR/report.json" \
  --output-format json \
  <path-to-oas-file>
```

### Output files (written to the same directory as `--output`)

| File          | Contents                                                                                           |
|---------------|----------------------------------------------------------------------------------------------------|
| `report.json` | Audit results                                                                                      |
| `todo.json`   | Same as report.json but with `index[]` for OAS path resolution — **prefer this file**              |
| `sqg.json`    | SQG result — written in platform mode whenever `--report-sqg` is passed (with or without `--tag`). Not written in freemium mode. |

---

## Step 2 — Parse and Display the Audit Report

Parse `todo.json` (fall back to `report.json` if absent) and `sqg.json`. Then
render a **developer-readable, risk-classified report**. Do NOT surface raw
rule IDs — translate each one using the table in `./audit-rule-translations.md`.

> **Token rule**: never load raw JSON file contents into your response. Use the
> Python extraction below to pull only the fields you need (TOON output —
> https://github.com/toon-format/toon), then display the formatted output.
> Read `./audit-rule-translations.md` for the rule-ID translation table only
> when rendering findings (not before).

### Score headline

**Platform mode** (`sqg.json` always present):
```
Audit Score: <score> / 100  |  Security: <sec-score>/100  |  Data Validation: <data-score>/100
SQG (<sqg-name>): PASSED / FAILED
```

**Freemium mode** (no `sqg.json`):
```
Audit Score: <score> / 100  |  Security: <sec-score>/100  |  Data Validation: <data-score>/100
```

**Platform mode** — score ≥ 90, add one interpretation line:
> `Your API scores in the top tier — excellent security posture.`
Otherwise omit the interpretation line; SQG PASSED/FAILED in the headline is the authoritative result.

**Platform mode only** — when the score crosses from below 70 to 70 or above after fixes are applied, add:
> `This improvement moves your API from failing to passing the SQG threshold.`

**Freemium mode only** — before rendering the findings report, prompt the user for session
thresholds (call `AskUserQuestion` with two questions):
- **Question 1**: `"What minimum score are you targeting for this API?"` — options:
  `["90+ — Excellent", "70 — Good baseline", "50 — Acceptable for now", "Custom — I'll enter a number"]`
  If "Custom" is chosen, call a follow-up `AskUserQuestion` for the numeric value.
- **Question 2**: `"What is the lowest severity you want treated as a blocking issue?"` — options:
  `["CRITICAL only", "HIGH and above", "MEDIUM and above", "All findings (including LOW)"]`

Map the severity choice to a numeric threshold: CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1.
Store as `target_score` and `blocking_severity_threshold` for this session only — do not persist.

Then add one score interpretation line:
- Score ≥ 90: `Your API scores in the top tier — excellent security posture.`
- Score ≥ target and < 90: `Your API meets your target score. A few improvements could push it higher.`
- Score within 10 of target (but below): `Your API is approaching your target score — the blocking issues below are holding it back.`
- Score more than 10 below target: `Your API score is below your target. The issues below must be fixed.`

### Parsing reference

Extract only the needed fields — do not read the raw file into context:

```bash
python3 << 'EOF'
import json, sys

with open("$OUTPUT_DIR/todo.json") as f:
    d = json.load(f)

score      = d["score"]
sec_score  = d["security"]["score"]
data_score = d["data"]["score"]
print(f"score: {score}  security: {sec_score}  data: {data_score}")

# Collect issues as TOON
issues = []
for section in ["security", "data"]:
    for issue_id, issue_data in d[section]["issues"].items():
        crit  = issue_data["criticality"]
        count = len(issue_data.get("issues", []))
        issues.append((issue_id, section, crit, count))

if issues:
    print(f"\nissues[{len(issues)}]{{id,section,criticality,count}}:")
    for issue_id, section, crit, count in issues:
        print(f"  {issue_id},{section},{crit},{count}")
EOF
```

```bash
# sqg.json (platform mode only)
python3 << 'EOF'
import json
with open("$OUTPUT_DIR/sqg.json") as f:
    sqg = json.load(f)
print(f"sqg_acceptance: {sqg['acceptance']}")
print(f"sqg_name: {sqg['sqgsDetail'][0]['name']}")
blocking = [r for d in sqg.get("processingDetails", []) for r in d.get("blockingRules", [])]
if blocking:
    print(f"blocking_rules: {', '.join(blocking)}")
EOF
```

Use the extracted output above for all display and fix logic. Never include
raw `todo.json` or `sqg.json` content in your response.

```python
# Reference: field paths used in display and fix logic
# todo.json
index = d["index"]                      # list of OAS paths (resolve pointer ints against this)
score = d["score"]
sec_score  = d["security"]["score"]
data_score = d["data"]["score"]

# Save initial scores for before/after comparison (used in final summary)
initial_score      = score
initial_sec_score  = sec_score
initial_data_score = data_score

# Determine which issue IDs are SQG-blocking
blocking_ids = set()
if sqg:
    # Platform mode: use sqg.json
    if sqg["acceptance"] != "yes":
        blocking_ids = set(sqg["sqgsDetail"][0]["directives"].get("issueRules", []))
else:
    # Freemium mode: use user-defined blocking_severity_threshold from the
    # session threshold prompt (CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1)
    for section in ["security", "data"]:
        for issue_id, issue_data in d[section]["issues"].items():
            if issue_data["criticality"] >= blocking_severity_threshold:
                blocking_ids.add(issue_id)

# Iterate issues across both sections
for section in ["security", "data"]:
    for issue_id, issue_data in d[section]["issues"].items():
        pointers   = [index[loc["pointer"]] for loc in issue_data["issues"]]
        crit       = issue_data["criticality"]   # 4=CRITICAL 3=HIGH 2=MEDIUM 1=LOW 0=INFO
        is_blocking = issue_id in blocking_ids

# sqg.json
sqg_passed     = sqg["acceptance"] == "yes"
sqg_name       = sqg["sqgsDetail"][0]["name"]
blocking_rules = [r for d in sqg.get("processingDetails", [])
                  for r in d.get("blockingRules", [])]
```

### Rendered format

Group issues into three tiers. Resolve each `pointer` integer to its human-readable
OAS path using `index[pointer]`. Severity label: 4=CRITICAL, 3=HIGH, 2=MEDIUM, 1=LOW, 0=INFO.

```
── 🔴 SQG-Blocking Issues — must fix before scan can run ──────────────────

  1. <Plain-English Title>  [<SEVERITY>]
     Where:  <OAS path from index>
     Risk:   <risk sentence from table>
     Fix:    <one-line description of the minimal change needed>

  2. ...

── 🟠 Security Issues (authentication · authorization · transport) ─────────
  (list issues from d["security"]["issues"] that are not SQG-blocking,
   same per-issue format; write "(none)" if empty)

── 🟡 Data Validation Issues (schemas · responses · parameters) ───────────
  (list issues from d["data"]["issues"] that are not SQG-blocking,
   same per-issue format)
```

Number issues sequentially across all three sections so the user can reference
them by number in their consent response.

---

## Step 3 — Consent Gate

After rendering the report, call `AskUserQuestion`:
- **question**: `"I found N SQG-blocking issue(s) (🔴) that must be fixed to pass the SQG, plus M additional finding(s) for your information. For the blocking issues I propose the following changes to <filename>: 1. [issue title] → [one-line fix description] 2. ... What would you like to do?"`
- **options**: `["Yes — apply all fixes now", "Show me the diff first", "No — skip fixes for now"]`

If the user chooses **"Show me the diff first"**, display the proposed change for each
issue one at a time in unified diff format, then call `AskUserQuestion`:
- **question**: `"Apply this change?"` — **options**: `["Yes", "No — skip this one"]`

Only advance to the next fix after the user confirms the current one.

Do **not** offer to fix non-blocking issues at this stage — only the 🔴 items.
Only proceed to Step 4 after the user explicitly confirms.

**API-first vs code-first — per-issue handling:**
For findings that represent a **spec/implementation mismatch** (e.g. `additionalproperties-true`
where the server actually returns those fields, HTTP vs HTTPS in `servers`, undocumented security
schemes, or response bodies wider than the schema), do **not** assume the OAS is the source of
truth. Instead, present the choice explicitly before applying the fix:
- Call `AskUserQuestion`:
  - **question**: `"For [issue title] at [OAS path]: the spec and implementation disagree. Which should be the source of truth?"` — options: `["Fix the OAS to match the implementation", "Fix the implementation to match the OAS", "Skip this one"]`
- Apply the fix in whichever direction the user chooses.
- Pure security issues (missing patterns, unbounded arrays, undocumented 403/429 responses, etc.)
  that have no implementation-side equivalent do not need this prompt — just propose the OAS fix.

---

## Step 4 — Context-Aware Fix Analysis

For each SQG-blocking issue the user has approved:

1. Map the issue `pointer` integer to its human-readable OAS path using
   `index[pointer]` from `todo.json`.
2. Read the structural context in the OAS file at that path: the operation,
   request/response schema, security requirements, or parameter definition.
3. Apply the minimum correct fix required to resolve the blocking rule. Do not
   make speculative or cosmetic changes — only fix what is explicitly blocking
   SQG acceptance.

After all fixes are applied, re-run the audit (**Step 1**) to confirm the SQG
now passes:
- **Platform mode**: confirm `sqg["acceptance"]` is `"yes"` in the new `sqg.json`.
- **Freemium mode**: confirm the new score meets `target_score` and no issues
  with criticality ≥ `blocking_severity_threshold` remain in `todo.json`.

After confirming the SQG passes, compute the before/after score deltas and
pass them to the final summary:

```python
delta_score      = round(final_score      - initial_score,      1)
delta_sec_score  = round(final_sec_score  - initial_sec_score,  1)
delta_data_score = round(final_data_score - initial_data_score, 1)

def fmt_delta(d):
    return f"+{d}" if d > 0 else (f"-{abs(d)}" if d < 0 else "±0")
```

Format the `Score change:` line as:

```
Score change:   <initial_score> → <final_score>  (<fmt_delta(delta_score)>)  |  Data: <initial_data_score> → <final_data_score>  (<fmt_delta(delta_data_score)>)
```

Include a Security segment only when `delta_sec_score != 0`:

```
  |  Security: <initial_sec_score> → <final_sec_score>  (<fmt_delta(delta_sec_score)>)
```

Omit the `Score change:` line entirely when no fixes were applied (user
declined at the consent gate, or there were no SQG-blocking issues).

---

## Flags Reference

```
--output-format json|yaml     output format (default json)
--output <file>               write report to file instead of stdout
--report-sqg                  include sqg_pass in the report
--tag <category>:<tagname>    apply platform tag
--max-impacted-issues <n>     limit reported impacted issues (default 30)
--max-origin-issues <n>       limit reported origin issues (default 30)
```
