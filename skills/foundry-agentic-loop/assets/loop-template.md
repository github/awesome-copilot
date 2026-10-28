# Agentic Loop lessons

Verified lessons from building this workspace. Improve mode turns them into skill and workflow changes, only with approval.

<!--
How to upsert (the coordinator or SDD phase lead writes; workers report evidence):
- Write right after a fix is verified: the failing probe, or an equivalent boundary check, reran successfully. An edit, commit or deployment alone is not resolution.
- Update the matching row instead of adding a duplicate, revisit earlier proposals and keep user notes.
- Separate verified app fixes from untested skill proposals, and measurements from estimates. When no skill change is supported, say so in the outcome line.
- Never include secrets, raw .env values or request and response payloads.
- Read the file back after each write.
- Status: proposed, adopted (applied by improve mode), validated (a later run confirmed the benefit) or rejected.
-->

## YYYY-MM-DD <solution>, <rapid | SDD>

Outcome: <what was built and verified, or "No skill change is supported.">

| Observation and evidence | Proposed skill change (file, section) | Expected benefit | Regression check | Status |
| --- | --- | --- | --- | --- |
| <symptom, root cause, and the rerun that proved the fix> | <`references/<file>.md`, section, or none> | <measured, or marked as an estimate> | <eval ID or probe> | proposed |
