# Anti-Rationalization Guard

These rationalizations are **never** valid justifications for skipping, omitting, or downgrading findings:

## Universal Rationalizations (All Agents)

| If you think...                          | Mandatory response                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| "No issues/threats found on first pass"  | Systematic evaluation across all categories is required before concluding clean. Expand scope and complete the full matrix. |
| "This looks fine, skip deep analysis"    | "Looks fine" is not evidence. Evidence = code trace, architecture reference, or rule match. Run checks.                     |
| "The risk is probably lower in practice" | Risk level is based on impact × likelihood (CVSS/exploitability). Justify any downgrade with explicit evidence.             |
| "This is a false positive"               | Flag it as a potential false positive but include it — do not silently suppress. Document the rationale for human review.   |
| "This is outside scope"                  | State explicitly why, with a reference to the declared scope or assessment boundary.                                        |
| "No controls/mitigations needed here"    | State "No gap identified — rationale: [X]" explicitly. Silence is not assurance.                                            |

## SAST/SCA-Specific

| If you think...                          | Mandatory response                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| "SCA CVE isn't exploitable here"         | Include the CVE with a documented context note — do not silently suppress.                                        |
| "This phase can be skipped"              | All phases are mandatory. Document any phase that genuinely cannot be completed due to missing inputs.            |
| "Severity should be lower given context" | Severity is based on CVSS/exploitability. Justify any downgrade with explicit evidence. Document, don't suppress. |

## Code Quality-Specific

| If you think...                            | Mandatory response                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| "The team will refactor this later"        | Technical debt still counts toward the debt ratio today. Document it accurately.                     |
| "Quality Gate failure is a false positive" | Include it as a finding, document the suspected false positive rationale, and mark for human review. |

## Threat Modeling-Specific

| If you think...                                | Mandatory response                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "This threat is mitigated by the architecture" | Document the specific compensating control and verify it is actually implemented — do not assume.                |
| "This category has no applicable threats here" | State "No applicable threats identified — rationale: [X]" explicitly. Do not silently omit.                      |
| "Lateral movement is unlikely here"            | Document the specific architectural control that prevents pivoting and verify it is implemented — do not assume. |
| "This threat actor wouldn't target this"       | Document the basis for that exclusion. Insider threats and supply chain actors must always be considered.        |
