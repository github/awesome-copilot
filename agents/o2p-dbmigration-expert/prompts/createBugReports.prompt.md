---
description: 'Create clear, user-friendly bug reports for Oracle-to-Postgres application migration issues.'
model: Claude Haiku 4.5 (copilot)
tools: [vscode/askQuestions, read, edit, search]
---
# Create Bug Reports for Oracle to Postgres Migration

Generate a concise, easy-to-understand bug report for the defect discovered while validating the application migration from Oracle to Postgres. This prompt targets a **single project** identified by `TARGET_PROJECT`.

## Expected Inputs (from router handoff payload)

| Key | Required | Description |
|---|---|---|
| `SOLUTION_ROOT` | Yes | Resolved workspace root path. |
| `TARGET_PROJECT` | Yes | Absolute path to the single application project whose failures are being reported (e.g., `C:/Source/MyApp/MIUS.API.Postgres`). |

INSTRUCTIONS:
- Treat Oracle as the source of truth; capture expected Oracle behavior versus observed Postgres behavior.
- Keep wording user-friendly: plain language, short sentences, and clear next actions.
- Document when client code changes were made or are being proposed; emphasize that changes should be avoided unless required for correct behavior.
- Always include: summary, impacted feature/flow, severity, environment (Oracle/Postgres, build, branch), prerequisites/seed data, exact repro steps, expected vs actual results, scope of impact, and workaround (if any).
- Attach supporting evidence: minimal SQL excerpts, logs, and screenshots; avoid sensitive data and keep snippets reproducible.
- Note data-specific factors (collation, null handling, sequence values, time zones) that might differ between Oracle and Postgres.
- Recommend a validation step after fixes (re-run repro on both DBs, compare row/column outputs, and check error handling parity).

OUTPUT LOCATION:
- Save each bug report under `{SOLUTION_ROOT}/.github/o2p-dbmigration/Reports/` using a clear, human-readable filename (e.g., `Bug - {area} - {short-title}.md`).

OUTPUT INSTRUCTIONS:
Bug Report Output Definition (Template)
•	Filename format: .github/o2p-dbmigration/Reports/BUG_REPORT_<DescriptiveSlug>.md
•	Status line: Status: [✅ RESOLVED | ⛔ UNRESOLVED | ⏳ IN PROGRESS]
•	Component: <High-level component/endpoint and key method(s)>
•	Test(s): <Related automated test names>
•	Severity: <Low | Medium | High | Critical>

Sections (markdown headings):
1.	# Bug Report: <Title> — concise, specific.
2.	**Status:** <status>
**Component:** <controller/method>
**Test:** <test(s)>
**Severity:** <level>
3.	---
4.	## Problem — observable incorrect behavior and expected vs actual.
5.	## Scenario — ordered steps to reproduce.
6.	## Root Cause — minimal, concrete technical cause.
7.	## Solution — changes made or required (be explicit about data access/tracking flags).
8.	## Validation — bullet list of passing tests or manual checks.
9.	## Files Modified — bullet list with relative paths and short purpose.
10.	## Notes / Next Steps — follow-ups, environment caveats, or risks.

Style rules:
•	Keep wording concise and factual.
•	Use present or past tense consistently.
•	Prefer bullets/numbered lists for steps and validation.
•	Call out data layer nuances (tracking, padding, constraints) explicitly.
•	Keep to existing runtime/language versions; avoid speculative fixes.