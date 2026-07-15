# Skeleton: 3-findings.md

> **⛔ Copy the template content below VERBATIM (excluding the outer code fence). Replace `[FILL]` placeholders. ALL 10 attribute rows are MANDATORY per finding. Organize by TIER, not by severity.**
> **⛔ DO NOT abbreviate attribute names. Use EXACT names: `SDL Bugbar Severity` (not `Severity`), `Exploitation Prerequisites` (not `Prerequisites`), `Exploitability Tier` (not `Tier`), `Remediation Effort` (not `Effort`), `CVSS 4.0` (not `CVSS Score`).**
> **⛔ DO NOT use bold inline headers (`**Description:**`). Use `#### Description` markdown h4 headings.**
> **⛔ Tier section headings MUST be: `## Tier 1 — Direct Exposure (No Prerequisites)`, NOT `## Tier 1 Findings`.**

---

```markdown
# Security Findings

---

## Tier 1 — Direct Exposure (No Prerequisites)

[REPEAT: one finding block per Tier 1 finding, sorted by severity (Critical→Important→Moderate→Low) then CVSS descending]

### FIND-[FILL: NN]: [FILL: title]

| Attribute | Value |
|-----------|-------|
| SDL Bugbar Severity | [FILL: Critical / Important / Moderate / Low] |
| CVSS 4.0 | [FILL: N.N] (CVSS:4.0/[FILL: full vector starting with AV:]) |
| CWE | [CWE-[FILL: NNN]](https://cwe.mitre.org/data/definitions/[FILL: NNN].html): [FILL: weakness name] |
| OWASP | A[FILL: NN]:2025 – [FILL: category name] |
| Exploitation Prerequisites | [FILL: text or "None"] |
| Exploitability Tier | Tier [FILL: 1/2/3] — [FILL: tier description] |
| Remediation Effort | [FILL: Low / Medium / High] |
| Mitigation Type | [FILL: Redesign / Standard Mitigation / Custom Mitigation / Existing Control / Accept Risk / Transfer Risk] |
| Component | [FILL: component name] |
| Related Threats | [T[FILL: NN].[FILL: X]](2-stride-analysis.md#[FILL: component-anchor]), [T[FILL: NN].[FILL: X]](2-stride-analysis.md#[FILL: component-anchor]) |

<!-- ⛔ POST-FINDING CHECK: Verify this finding IMMEDIATELY:
  1. ALL 10 attribute rows present (SDL Bugbar Severity through Related Threats)
  2. Row names are EXACT: 'SDL Bugbar Severity' (not 'SDL Bugbar'), 'Exploitation Prerequisites' (not 'Prerequisites'), 'Exploitability Tier' (not 'Risk Tier'), 'Remediation Effort' (not 'Effort')
  3. Related Threats are HYPERLINKS with `](2-stride-analysis.md#` — NOT plain text like 'T01.S, T02.T'
  4. CVSS starts with `CVSS:4.0/` — NOT bare vector
  5. CWE is a hyperlink to cwe.mitre.org — NOT plain text
  6. OWASP uses `:2025` suffix — NOT `:2021`
  If ANY check fails → FIX THIS FINDING NOW before writing the next one. -->

#### Description

[FILL-PROSE: technical description of the vulnerability]

#### Evidence

**Prerequisite basis:** [FILL: cite the specific code/config that determines this finding's prerequisite — e.g., "binds to 127.0.0.1 only (src/Server.cs:42)", "no auth middleware on /api routes (Startup.cs:18)", "console app with no network listener (Program.cs)". This MUST match the Component Exposure Table in 0.1-architecture.md.]

[FILL: specific file paths, line numbers, config keys, code snippets]

#### Remediation

[FILL: actionable remediation steps]

#### Verification

[FILL: how to verify the fix was applied]

<!-- ⛔ POST-SECTION CHECK: Verify this finding's sub-sections:
  1. Exactly 4 sub-headings present: `#### Description`, `#### Evidence`, `#### Remediation`, `#### Verification`
  2. Sub-headings use `####` level (NOT bold `**Description:**` inline text)
  3. No extra sub-headings like `#### Impact`, `#### Recommendation`, `#### Mitigation`
  4. Description has at least 2 sentences of technical detail
  5. Evidence cites specific file paths or line numbers (not generic)
  If ANY check fails → FIX NOW before moving to next finding. -->

[END-REPEAT]
[CONDITIONAL-EMPTY: If no Tier 1 findings, include this line instead of the REPEAT block]
*No Tier 1 findings identified for this repository.*
[END-CONDITIONAL-EMPTY]

---

## Tier 2 — Conditional Risk (Authenticated / Single Prerequisite)

[REPEAT: same finding block structure as Tier 1, sorted same way]

### FIND-[FILL: NN]: [FILL: title]

| Attribute | Value |
|-----------|-------|
| SDL Bugbar Severity | [FILL] |
| CVSS 4.0 | [FILL] (CVSS:4.0/[FILL]) |
| CWE | [CWE-[FILL]](https://cwe.mitre.org/data/definitions/[FILL].html): [FILL] |
| OWASP | A[FILL]:2025 – [FILL] |
| Exploitation Prerequisites | [FILL] |
| Exploitability Tier | Tier [FILL] — [FILL] |
| Remediation Effort | [FILL] |
| Mitigation Type | [FILL] |
| Component | [FILL] |
| Related Threats | [FILL] |

#### Description

[FILL-PROSE]

#### Evidence

**Prerequisite basis:** [FILL: cite the specific code/config that determines this finding's prerequisite — must match the Component Exposure Table in 0.1-architecture.md]

[FILL]

#### Remediation

[FILL]

#### Verification

[FILL]

[END-REPEAT]
[CONDITIONAL-EMPTY: If no Tier 2 findings, include this line instead of the REPEAT block]
*No Tier 2 findings identified for this repository.*
[END-CONDITIONAL-EMPTY]

---

## Tier 3 — Defense-in-Depth (Prior Compromise / Host Access)

[REPEAT: same finding block structure]

### FIND-[FILL: NN]: [FILL: title]

| Attribute | Value |
|-----------|-------|
| SDL Bugbar Severity | [FILL] |
| CVSS 4.0 | [FILL] (CVSS:4.0/[FILL]) |
| CWE | [CWE-[FILL]](https://cwe.mitre.org/data/definitions/[FILL].html): [FILL] |
| OWASP | A[FILL]:2025 – [FILL] |
| Exploitation Prerequisites | [FILL] |
| Exploitability Tier | Tier [FILL] — [FILL] |
| Remediation Effort | [FILL] |
| Mitigation Type | [FILL] |
| Component | [FILL] |
| Related Threats | [FILL] |

#### Description

[FILL-PROSE]

#### Evidence

**Prerequisite basis:** [FILL: cite the specific code/config that determines this finding's prerequisite — must match the Component Exposure Table in 0.1-architecture.md]

[FILL]

#### Remediation

[FILL]

#### Verification

[FILL]

[END-REPEAT]
[CONDITIONAL-EMPTY: If no Tier 3 findings, include this line instead of the REPEAT block]
*No Tier 3 findings identified for this repository.*
[END-CONDITIONAL-EMPTY]
```

At the END of `3-findings.md`, append the Threat Coverage Verification table:

```markdown
---

## Threat Coverage Verification

| Threat ID | Finding ID | Status |
|-----------|------------|--------|
[REPEAT: one row per threat from ALL components in 2-stride-analysis.md]
| [FILL: T##.X] | [FILL: FIND-## or —] | [FILL: ✅ Covered (FIND-XX) / ✅ Mitigated (FIND-XX) / 🔄 Mitigated by Platform] |
[END-REPEAT]

<!-- ⛔ POST-TABLE CHECK: Verify Threat Coverage Verification:
  1. Status column uses ONLY these 3 values with emoji prefixes:
     - `✅ Covered (FIND-XX)` — vulnerability needs remediation
     - `✅ Mitigated (FIND-XX)` — team built a control (documented in finding)
     - `🔄 Mitigated by Platform` — external platform handles it
  2. Do NOT use plain text like "Finding", "Mitigated", "Covered" without the emoji
  3. Do NOT use "Needs Review", "Accepted Risk", or "N/A"
  4. Column headers are EXACTLY: `Threat ID | Finding ID | Status` (NOT `Threat | Finding | Status`)
  5. Every threat from 2-stride-analysis.md appears in this table (no missing threats)
  If ANY check fails → FIX NOW. -->
```

**Fixed rules baked into this skeleton:**
- Finding ID: `FIND-` prefix (never `F-`, `F01`, `Finding`)
- Attribute names: `SDL Bugbar Severity`, `Exploitation Prerequisites`, `Exploitability Tier`, `Remediation Effort` (exact — not abbreviated)
- CVSS: starts with `CVSS:4.0/` (never bare vector)
- CWE: hyperlinked (never plain text)
- OWASP: `:2025` suffix (never `:2021`)
- Related Threats: individual hyperlinks (never plain text)
- Sub-sections: `#### Description`, `#### Evidence`, `#### Remediation`, `#### Verification`
- Organized by TIER — no `## Critical Findings` or `## Mitigated` sections
- Exactly 3 tier sections (all mandatory, even if empty with "*No Tier N findings identified.*")
