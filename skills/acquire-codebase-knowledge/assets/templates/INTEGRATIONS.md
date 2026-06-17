# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type (API/DB/Queue/etc) | Purpose | Auth model | Criticality | Evidence |
|--------|---------------------------|---------|------------|-------------|----------|
| [name] | [type] | [purpose] | [auth] | [high/med/low] | [file] |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| [db/cache/etc] | [role] | [module] | [risk] | [file] |

### 3) Secrets and Credentials Handling

- Credential sources: [env/secrets manager/config]
- Hardcoding checks: [result]
- Rotation or lifecycle notes: [known/unknown]

### 4) Reliability and Failure Behavior

- Retry/backoff behavior: [implemented/none/partial]
- Timeout policy: [where configured]
- Circuit-breaker or fallback behavior: [if any]

### 5) Observability for Integrations

- Logging around external calls: [yes/no + where]
- Metrics/tracing coverage: [yes/no + where]
- Missing visibility gaps: [list]

### 6) Evidence

- [path/to/integration-wrapper]
- [path/to/config-or-env-template]
- [path/to/monitoring-or-logging-config]

## Extended Sections (Optional)

Add only when needed:

- Endpoint-by-endpoint catalog
- Auth flow sequence diagrams
- SLA/SLO per integration
- Region/failover topology notes
