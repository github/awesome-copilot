---
name: 42crunch-audit
description: 'Run a 42Crunch API Security Audit and fix SQG-blocking issues in an OpenAPI
  Specification file. Use this skill whenever the user wants to audit an OAS
  file for security issues, fix SQG-blocking issues, score an API, apply data
  dictionary enrichment, or remediate audit findings. Triggers on phrases like
  "run audit", "audit only", "fix audit issues", "SQG audit", "42crunch audit",
  "audit score", or any request focused on static OAS analysis and remediation
  without running a live scan.'
---

# 42Crunch Audit Skill

Runs a single phase: **Audit** (static OAS analysis, SQG reporting, and
SQG-blocking fix loop). Requires explicit user permission before execution.
Does **not** run a live scan — use the `42crunch-scan` skill for that.

---

## Entry Point

1. **Pre-flight checks.** Read `./references/pre-flight.md` and complete
   all steps (setup, OAS resolution, tag detection). When prompting for OAS
   file selection, use the context `"audit"` (e.g. "Which one should I audit?").
   Do not proceed if any step fails or the user cancels.

2. **Ask for permission.** Call `AskUserQuestion`:
   - **question**: `"Ready to run a 42Crunch Audit on <filename>. This will analyse your OAS file and produce a scored report. Shall I proceed?"`
   - **options**: `["Yes, proceed", "No, cancel"]`

3. **Execute the Audit.** Mode is already resolved from pre-flight — do not
   re-derive it. Read `./references/audit-workflow.md` and apply only the
   commands for the identified mode throughout.
   The workflow runs the audit, then presents a **developer-readable,
   risk-classified report** (SQG-Blocking / Security / Data Validation tiers)
   with plain-English titles and risk descriptions — no raw rule IDs. It then
   pauses and asks the user to consent before applying any fixes. Fixes are
   only applied after explicit confirmation.

4. **Present the final audit summary** (see Output Format below).

5. **Recommend next steps** based on the outcome:

   **If SQG PASSED:**
   > "Your audit is complete and the SQG is passing. The natural next step is to
   > run a live scan to test conformance and authorization against a running
   > instance of your API. Just say `run scan` when your API server is available."

   **If SQG FAILED (user declined to fix):**
   > "Your audit findings are saved above. When you're ready to address the
   > SQG-blocking issues, run `42crunch-audit` again on this file and I'll apply
   > the fixes. Once the audit passes, run `42crunch-scan` to test the live API."

   **If no issues found:**
   > "No issues found — your API has a clean audit result. Run `42crunch-scan`
   > to verify the live API matches its contract."

Only continue after explicit user confirmation at each permission prompt.

---

## Output Format

After the audit completes, produce a summary in this shape:

```
Audit Complete
  Score:          <score> / 100  (Security: <sec-score> · Data Validation: <data-score>)
  Score change:   <initial-score> → <score>  (<delta>)  |  Data: <initial-data> → <data-score>  (<data-delta>)   ← omit if no fixes applied
  SQG:            PASSED  (<sqg-name> — your org's security quality gate is met)    ← platform mode, passed
  SQG:            FAILED  (<sqg-name> — the quality gate is not met; fixes above are required)    ← platform mode, failed
  SQG:            N/A  (Freemium — no automated gate; user-defined thresholds applied this session)    ← freemium mode
  Mode:           Platform / Freemium
  Tag:            <category>:<tagname>             ← platform mode only, when a tag is assigned; omit this row if no tag
  Issues fixed:   2 SQG-blocking  (0 security · 2 data validation)
  OAS updated:    <path/to/openapi.json>
```

Show only the one SQG line that matches the current mode and result.

The `Score change:` row is produced from the delta values computed in Step 4 of
`./references/audit-workflow.md`. Omit it when no fixes were applied (user
declined at the consent gate, or there were no SQG-blocking issues).

If the user declined to apply fixes, note that instead.

