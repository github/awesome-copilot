# Self-Reflection Quality Gate

After you complete the analysis, score the output across domain categories on a 1–10 scale.

**Threshold**: Every category must score **≥ 8** to pass. If any category scores < 8, resolve the gaps before you deliver the report (maximum 2 rework iterations).

## Core Scoring Rubric (Universal)

| Category           | Score 9–10                                                                                  | Score 7–8                                                             | Score 5–6                                                           | Score 1–4                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Completeness**   | All phases, categories, boundaries, and checklists evaluated with explicit evidence         | Minor omissions that do not affect the risk profile                   | Noticeable gaps in coverage; entire sections omitted                | Superficial pass; major sections missing                        |
| **Accuracy**       | Precise file:line references, confirmed CVE IDs, verified taint flows, correct CWE mappings | Minor version ambiguity or indirect references; core findings correct | Plausible findings with unverified details or questionable mappings | Fabricated references, wrong CWE mappings, or hallucinated CVEs |
| **Actionability**  | Concrete remediation code, exact package upgrade targets, step-by-step guidance             | Clear direction but requires human adjustment                         | High-level advice without code or version targets                   | Generic platitudes ("sanitize inputs", "keep packages updated") |
| **Consistency**    | Risk ratings match evidence, framework verdicts align with findings, formatting uniform     | Minor formatting or taxonomy inconsistencies                          | Severity ratings conflict with impact descriptions                  | Contradictory findings or incompatible verdicts                 |
| **Evidence Rigor** | Every claim backed by code, manifest, trace, or threat model element                        | Most findings backed; some secondary claims lack citations            | Assertions made without code citations                              | Speculative findings with zero code or manifest backing         |

## Scoring Threshold

| Final Score                  | Action                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| All categories ≥ 8           | **PASS** — Proceed to final delivery                                      |
| Any category < 8 (attempt 1) | **REWORK** — Address deficiencies and re-score                            |
| Any category < 8 (attempt 2) | **REWORK** — Final attempt to resolve gaps                                |
| Any category < 8 (attempt 3) | **FLAG & DELIVER** — Deliver with explicit quality gap disclosure to user |

## Domain-Specific Rubrics

### SAST/SCA

| Category          | Question                                                                               | Threshold |
| ----------------- | -------------------------------------------------------------------------------------- | :-------: |
| **Completeness**  | Did you evaluate all SAST flaw categories and SCA ecosystems?                          |    ≥ 8    |
| **Accuracy**      | Are findings supported by concrete taint traces and verified CVE IDs?                  |    ≥ 8    |
| **Actionability** | Does each Critical and High finding have a concrete code fix or upgrade step?          |    ≥ 8    |
| **Consistency**   | Are severity ratings, CWE mappings, and policy verdicts consistent across the report?  |    ≥ 8    |
| **Coverage**      | Did you trace all entry points from source to sink and audit all dependency manifests? |    ≥ 8    |

### Threat Modeling and Code Review

| Category         | Question                                                                            | Threshold |
| ---------------- | ----------------------------------------------------------------------------------- | :-------: |
| **Completeness** | Did you evaluate all six STRIDE categories for each trust boundary and data flow?   |    ≥ 8    |
| **Coverage**     | Were all entry points, trust boundaries, and data flows traced from source to sink? |    ≥ 8    |
