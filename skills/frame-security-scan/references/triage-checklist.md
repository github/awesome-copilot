# Findings triage checklist

For each finding, in order:

1. Tier. Is `source` a variable name (symbolic) or `llm_detect` / `llm_verified` (model)? Note it.
2. Read the source line and the sink line. Does the described flow exist in the code?
3. Is the source really attacker-controlled (request data, file upload, environment, message queue), or a constant or internal value?
4. Is there validation or escaping between source and sink (parameterized query, allow-list, path normalization plus a base-directory check, schema validation)?
5. Is the code reachable in production, or is it a test, script, or dead code?
6. Does the CWE match what the code does? A tool can label the right line with the wrong class.
7. Decide: confirmed, likely false positive (write the reason), or ask the user.

Record the verdict next to the finding ID, file and line. Do not delete or suppress findings without telling the user.
