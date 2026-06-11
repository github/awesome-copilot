# Skeleton: 0.1-architecture.md

> **⛔ Copy the template content below VERBATIM (excluding the outer code fence). Replace `[FILL]` placeholders. Do NOT add/rename/reorder sections.**
> **⛔ Key Components table columns are EXACTLY: `Component | Type | Description`. DO NOT rename to `Role`, `Change`, `Function`.**
> **⛔ Technology Stack table columns are EXACTLY: `Layer | Technologies` (2 columns). DO NOT add `Version` column or rename `Layer` to `Category`.**
> **⛔ Security Infrastructure Inventory and Repository Structure sections are MANDATORY — do NOT omit them.**

---

````markdown
# Architecture Overview

## System Purpose

[FILL-PROSE: 2-4 sentences — what is this system, what problem does it solve, who are the users]

## Key Components

| Component | Type | Description |
|-----------|------|-------------|
[REPEAT: one row per component]
| [FILL: PascalCase name] | [FILL: Process / Data Store / External Service / External Interactor] | [FILL: one-line description] |
[END-REPEAT]

<!-- ⛔ POST-TABLE CHECK: Verify Key Components:
  1. Every component has PascalCase name (not kebab-case or snake_case)
  2. Type is one of: Process / Data Store / External Service / External Interactor
  3. Row count matches the number of nodes in the Component Diagram below
  If ANY check fails → FIX NOW. -->

## Component Diagram

```mermaid
[FILL: Architecture diagram using service/external/datastore styles — NOT DFD circles]
```

## Top Scenarios

[REPEAT: 3-5 scenarios. First 3 MUST include sequence diagrams.]

### Scenario [FILL: N]: [FILL: Title]

[FILL-PROSE: 2-3 sentence description]

```mermaid
sequenceDiagram
    [FILL: participants, messages, alt/opt blocks]
```

[END-REPEAT]

<!-- ⛔ POST-SECTION CHECK: Verify Top Scenarios:
  1. At least 3 scenarios listed
  2. First 3 scenarios MUST have sequenceDiagram blocks
  3. Each sequence diagram has participant lines and message arrows
  If ANY check fails → FIX NOW. -->

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| Languages | [FILL] |
| Frameworks | [FILL] |
| Data Stores | [FILL] |
| Infrastructure | [FILL] |
| Security | [FILL] |

<!-- ⛔ POST-TABLE CHECK: Verify Technology Stack has all 5 rows filled. If Security row is empty, list security-relevant libraries/frameworks found in the code. -->

## Deployment Model

[FILL-PROSE: deployment description — ports, protocols, bind addresses, network exposure, topology (single machine / cluster / multi-tier)]

**Deployment Classification:** `[FILL: one of LOCALHOST_DESKTOP | LOCALHOST_SERVICE | AIRGAPPED | K8S_SERVICE | NETWORK_SERVICE]`

<!-- ⛔ DEPLOYMENT CLASSIFICATION RULES:
  LOCALHOST_DESKTOP — Single-process console/GUI app, no network listeners (or localhost-only), single-user workstation. T1 FORBIDDEN.
  LOCALHOST_SERVICE — Daemon/service binding to 127.0.0.1 only. T1 FORBIDDEN.
  AIRGAPPED — No internet connectivity. T1 forbidden for network-originated attacks.
  K8S_SERVICE — Kubernetes Deployment/StatefulSet with ClusterIP or LoadBalancer. T1 allowed.
  NETWORK_SERVICE — Public API, cloud endpoint, internet-facing. T1 allowed.
  This classification is BINDING on all subsequent prerequisite and tier assignments. -->

### Component Exposure Table

| Component | Listens On | Auth Required | Reachability | Min Prerequisite | Derived Tier |
|-----------|------------|---------------|--------------|------------------|-------------|
[REPEAT: one row per component from Key Components table]
| [FILL: component name] | [FILL: port/address or "N/A — no listener"] | [FILL: Yes (mechanism) / No] | [FILL: one of: External / Internal Only / Localhost Only / No Listener] | [FILL: one of closed enum — see rules below] | [FILL: T1 / T2 / T3] |
[END-REPEAT]

<!-- ⛔ EXPOSURE TABLE RULES:
  1. Every component from Key Components MUST have a row.
  2. "Listens On" = the actual bind address from code (e.g., "127.0.0.1:8080", "0.0.0.0:443", "N/A — no listener").
  3. "Reachability" MUST be one of these 4 values (closed enum):
     - `External` — reachable from public internet or untrusted network
     - `Internal Only` — reachable only within a private network (K8s cluster, VNet, etc.)
     - `Localhost Only` — binds to 127.0.0.1 or named pipe, same-host only
     - `No Listener` — does not accept inbound connections (outbound-only, console I/O, library)
  4. "Min Prerequisite" MUST be one of these values (closed enum):
     - `None` — only valid when Reachability = External AND Auth Required = No
     - `Authenticated User` — Reachability = External AND Auth Required = Yes
     - `Internal Network` — Reachability = Internal Only AND Auth Required = No
     - `Privileged User` — requires admin/operator role
     - `Local Process Access` — Reachability = Localhost Only (same-host process can connect)
     - `Host/OS Access` — Reachability = No Listener (requires filesystem, console, or debug access)
     - `Admin Credentials` — requires admin credentials + host access
     - `Physical Access` — requires physical presence
     ⛔ FORBIDDEN values: `Application Access`, `Host Access` (ambiguous — use `Local Process Access` or `Host/OS Access` instead)
  5. "Derived Tier" is mechanically determined from Min Prerequisite:
     - `None` → T1
     - `Authenticated User`, `Privileged User`, `Internal Network`, `Local Process Access` → T2
     - `Host/OS Access`, `Admin Credentials`, `Physical Access`, `{Component} Compromise`, or any `A + B` → T3
  6. No threat or finding for this component may have a LOWER prerequisite than Min Prerequisite.
  7. No threat or finding for this component may have a HIGHER tier (lower number) than Derived Tier.
  8. This table is the SINGLE SOURCE OF TRUTH for prerequisite floors and tier ceilings. STRIDE and findings MUST respect it. -->

## Security Infrastructure Inventory

| Component | Security Role | Configuration | Notes |
|-----------|---------------|---------------|-------|
[REPEAT: one row per security-relevant component found in code]
| [FILL] | [FILL] | [FILL] | [FILL] |
[END-REPEAT]

## Repository Structure

| Directory | Purpose |
|-----------|---------|
[REPEAT: one row per key directory]
| [FILL: path/] | [FILL] |
[END-REPEAT]
````
