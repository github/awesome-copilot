# Self-Critique Loop

After you complete the initial analysis, complete a **mandatory second pass** before you deliver the report.

## Universal Checks

1. **Evidence check**: Every finding must cite a verified reference (`file:line`, component, architecture element, or CVE ID). Remove any finding that does not have supporting evidence.
2. **Coverage check**: Verify that you evaluated all required categories and phases. State "None detected" for clean categories. Do not omit clean categories.
3. **Remediation check**: Provide a specific, implementable fix for every Critical and High finding. Do not provide generic recommendations.

## Domain Checks

### SAST/SCA

1. **Taint trace completeness**: Verify that you traced each discovered entry point from source to sink.
2. **Manifest coverage**: Verify that you audited all discovered dependency manifests.
3. **Evidence completeness**: Cite a verified `file:line` reference and taint trace for each SAST finding. Cite a verified CVE ID and affected version range for each SCA finding.
4. **Flaw category completeness**: Confirm that you evaluated all flaw categories. State "No instances detected" for clean categories. Do not omit clean categories.
5. **Policy consistency**: Verify that the PASS or FAIL policy verdict matches severity counts and policy threshold rules.

### Threat Modeling

1. **STRIDE completeness**: Verify that you evaluated all six STRIDE categories (S/T/R/I/D/E) for each trust boundary and data flow.
2. **Trust boundary audit**: Verify that each identified trust boundary has at least one evaluated data flow crossing it.
