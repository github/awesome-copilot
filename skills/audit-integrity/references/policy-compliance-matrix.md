# Policy Compliance Matrix

This reference document defines policy compliance evaluation matrices and baseline security controls across regulatory frameworks.

## Policy Frameworks and Verification Criteria

| Framework           | Target Version           | Core Requirements Evaluated                                                                                    | Status Criteria                                                       |
| :------------------ | :----------------------- | :------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **OWASP Top 10**    | 2025 (8th Edition)       | Map findings to categories A01:2025 through A10:2025                                                           | **FAIL** if any Critical or High finding maps to A01–A10              |
| **PCI-DSS**         | v4.0.1 (Active Standard) | Requirement 6.2 (secure software), Requirement 6.3 (vulnerabilities), no hardcoded credentials, TLS encryption | **FAIL** if any unpatched Critical flaw or hardcoded secret exists    |
| **CWE Top 25**      | 2025 (View-1435)         | Verify weaknesses against the MITRE Top 25 Most Dangerous Software Weaknesses list                             | **FAIL** if any confirmed flaw appears in the CWE Top 25 list         |
| **NIST SP 800-218** | SSDF v1.1                | Tasks PW.1 (secure coding rules), PW.4 (third-party component checks), RV.1 (vulnerability scans)              | **FAIL** if third-party audits or vulnerability scans are missing     |
| **NIST SP 800-53**  | Revision 5               | Controls SA-11 (developer testing), IA-5 (authenticator management), SC-28 (protection at rest)                | **FAIL** if sensitive data lacks encryption or authorization checks   |
| **HIPAA**           | Security Rule            | Protected Health Information (PHI) exposure, access controls, audit logging, transport encryption              | **FAIL** if PHI data flows through unencrypted channels or plain logs |
| **GDPR**            | Article 25 & 32          | Personally Identifiable Information (PII) exposure, encryption, consent enforcement, data deletion             | **FAIL** if PII leaks to client errors or unencrypted log sinks       |

## Verdict Definitions

For each applicable compliance framework, record one of three verdicts:

1. **PASS**:

   - The analysis identified zero Critical and zero High findings in controls governed by this framework.
   - All mandatory baseline checks succeeded with verifiable evidence.

2. **FAIL**:

   - The analysis identified one or more Critical or High findings that directly violate framework controls.
   - Immediate remediation is required before software release.

3. **CONDITIONAL**:
   - The analysis identified Medium or Low findings that require remediation within the current development sprint.
   - Alternatively, specific compliance controls could not be evaluated due to missing deployment configurations.
