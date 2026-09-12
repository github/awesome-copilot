# Security Report Template

This reference document defines the standard report structure and layout for security analysis findings.

## Structured Report Format

Deliver final reports matching this structure:

````markdown
# SAST and SCA Security Report: <Application or Module Name>

**Scan Date**: <YYYY-MM-DD>  
**Scan Type**: SAST | SCA | SAST+SCA  
**Detected Languages**: <List of languages>  
**Scanned Modules**: <List of modules or directory paths>  
**Evaluated Policy**: <Policy name or "Standard Baseline">  
**Overall Status**: PASS | FAIL | CONDITIONAL  

---

## Executive Summary

| Severity | SAST Findings | SCA Vulnerabilities | Total Count |
| :--- | :---: | :---: | :---: |
| **Critical** | <count> | <count> | <total> |
| **High** | <count> | <count> | <total> |
| **Medium** | <count> | <count> | <total> |
| **Low** | <count> | <count> | <total> |
| **Informational** | <count> | <count> | <total> |
| **Total** | <count> | <count> | <total> |

**Risk Posture Summary**: <Provide one concise sentence describing the overall security posture>.

---

## Module Summary

| Module Path | Files Evaluated | SAST Findings | SCA Vulnerabilities | Highest Severity |
| :--- | :---: | :---: | :---: | :--- |
| `<path>` | <count> | <count> | <count> | <Severity> |

---

## SAST Findings

### [<SEVERITY>] CWE-<ID>: <Flaw Category> — <Short Title>

- **Module**: `<module name>`
- **File**: `<path/to/file.ext>:<line_number>`
- **Category**: <Flaw category name>
- **CWE**: CWE-<ID> (<Weakness Title>)
- **OWASP 2025**: <A01:2025 to A10:2025 Category>
- **Taint Flow**: `<source>` -> `<propagation>` -> `<sink>`
- **Evidence**:
  ```<language>
  <vulnerable code snippet with line numbers>
  ```
- **Exploit Scenario**: <One concrete explanation of how an attacker exploits this flaw>.
- **Remediation**:
  ```<language>
  <remediated code snippet>
  ```
- **References**: <CWE URL or standard advisory link>

---

## SCA Findings

### [<SEVERITY>] CVE-<YYYY>-<NNNNN>: <Package>@<Version>

- **Package**: `<package_name>@<version>`
- **Package URL (PURL)**: `pkg:<type>/<namespace>/<name>@<version>`
- **Ecosystem**: npm | PyPI | NuGet | Maven | Go | Cargo | RubyGems
- **Dependency Type**: Direct | Transitive (via `<parent_package>`)
- **CVE ID**: CVE-<YYYY>-<NNNNN>
- **CVSS Score**: <Score> (CVSS v3.1 or v4.0 vector)
- **EPSS Exploit Probability**: <Score>% | CISA KEV: Yes | No
- **Vulnerability Summary**: <Concise explanation of the vulnerability>
- **Remediation**: Upgrade `<package_name>` to version `<fixed_version>`
- **License**: <SPDX identifier> (<Risk classification>)

---

## License Risk Summary

| Package Name | License (SPDX) | Risk Level | Commercial Use Status |
| :--- | :--- | :--- | :--- |
| `<name>` | `<SPDX ID>` | Low \| Medium \| High | Permitted \| Restricted \| Prohibited |

---

## Policy Compliance Verdicts

| Policy Framework | Status | Failing Requirements |
| :--- | :---: | :--- |
| OWASP Top 10 2025 | PASS \| FAIL | <List failing categories or "None"> |
| PCI-DSS v4.0.1 | PASS \| FAIL | <List failing requirements or "None"> |
| CWE Top 25 (2025) | PASS \| FAIL | <List confirmed CWEs or "None"> |
| NIST SP 800-218 | PASS \| FAIL | <List failing controls or "None"> |

---

## Prioritized Remediation Plan

### Immediate Action (Block Release — Critical and High)

1. **<Title>** (`<file>:<line>`): <Specific code fix or package upgrade action>.

### Short Term (Current Sprint — Medium)

1. **<Title>** (`<file>:<line>`): <Specific mitigation action>.

### Long Term (Backlog — Low and Informational)

1. **<Title>** (`<file>:<line>`): <Hardening action>.

---

## Quality Gate Metrics

- **Flaw Density**: <Number of flaws per 1000 lines of code>
- **Vulnerable Dependency Rate**: <Percentage of vulnerable packages>
- **Estimated Remediation Effort**: <Total estimated hours>
````
