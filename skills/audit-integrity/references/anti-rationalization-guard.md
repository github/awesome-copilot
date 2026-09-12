# Anti-Rationalization Guard

These rationalizations are **never** valid reasons to skip, omit, or downgrade findings:

## Universal Rationalizations

| If you think...                            | Mandatory response                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| "No issues or threats found on first pass" | Systematic evaluation across all categories is required before you conclude clean. Expand scope and complete the full matrix. |
| "This looks fine, skip deep analysis"      | "Looks fine" is not evidence. Evidence is a code trace, architecture reference, or rule match. Run checks.                    |
| "The risk is probably lower in practice"   | Risk level is based on impact multiplied by likelihood. Justify any downgrade with explicit evidence.                         |
| "This is a false positive"                 | Flag the finding as a potential false positive, but include it. Do not silently suppress findings. Document the rationale.    |
| "This is outside scope"                    | State explicitly why, with a reference to the declared scope or assessment boundary.                                          |
| "No controls or mitigations needed here"   | State "No gap identified — rationale: [X]" explicitly. Silence is not assurance.                                              |

## SAST/SCA

| If you think...                          | Mandatory response                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "SCA CVE is not exploitable here"        | Include the CVE with a documented context note. Do not silently suppress.                                   |
| "This phase can be skipped"              | All phases are mandatory. Document any phase that you cannot complete due to missing inputs.                |
| "Severity should be lower given context" | Severity is based on CVSS or exploitability. Justify any downgrade with explicit evidence. Do not suppress. |

## Threat Modeling

| If you think...                                | Mandatory response                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "This threat is mitigated by the architecture" | Document the specific compensating control and verify that it is implemented. Do not assume.             |
| "This category has no applicable threats here" | State "No applicable threats identified — rationale: [X]" explicitly. Do not silently omit categories.   |
| "Lateral movement is unlikely here"            | Document the specific architectural control that prevents pivoting and verify that it is implemented.    |
| "This threat actor would not target this"      | Document the basis for that exclusion. You must always consider insider threats and supply chain actors. |
