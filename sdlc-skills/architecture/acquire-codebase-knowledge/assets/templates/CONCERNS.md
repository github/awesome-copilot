# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| [high/med/low] | [issue] | [file or scan output] | [impact] | [next action] |

### 2) Technical Debt

List the most important debt items only.

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| [item] | [reason] | [path] | [risk] | [fix] |

### 3) Security Concerns

| Risk | OWASP category (if applicable) | Evidence | Current mitigation | Gap |
|------|--------------------------------|----------|--------------------|-----|
| [risk] | [A01/A03/etc or N/A] | [path] | [what exists] | [what is missing] |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| [issue] | [path/metric] | [symptom] | [risk] | [action] |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| [path] | [reason] | [recent churn evidence] | [approach] |

### 6) `[ASK USER]` Questions

Add unresolved intent-dependent questions as a numbered list.

1. [ASK USER] [question]

### 7) Evidence

- [scan output section reference]
- [path/to/code-file]
- [path/to/config-or-history-evidence]

## Extended Sections (Optional)

Add only when needed:

- Full bug inventory
- Component-level remediation roadmap
- Cost/effort estimates by concern
- Dependency-risk and ownership mapping
