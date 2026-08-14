# Solution Blueprint - [Client]

| | |
|---|---|
| **Version** | 0.1 |
| **Status** | In progress - Track A |
| **Solution Architect** | |
| **Client sponsor** | |
| **Last session** | [date] |
| **Distribution** | |

---

## Progress tracker

*Read this first when resuming. Update it at the end of every session.*

| Track | Section | Topic | Status | Last updated | Open items |
|---|---:|---|---|---|---|
| A | 1 | Programme context and business case | Not started | | |
| A | 2 | Scope ⚑ | Not started | | |
| A | 3 | Target operating model | Not started | | |
| B | 4 | Application architecture ⚑ | Not started | | |
| B | 5 | Data architecture ⚑ | Not started | | |
| B | 6 | Integration architecture | Not started | | |
| C | 7 | Data migration ⚑ | Not started | | |
| C | 8 | Security, compliance, and licensing | Not started | | |
| D | 9 | Environment strategy and ALM | Not started | | |
| D | 10 | Reporting and analytics | Not started | | |
| D | 11 | Performance and volumetrics | Not started | | |
| E | 12 | Test strategy | Not started | | |
| E | 13 | Deployment and cutover ⚑ | Not started | | |
| E | 14 | Support and operating model | Not started | | |

Status values: `Not started` | `In progress` | `Drafted - open items` | `Complete`

**Load-bearing decisions outstanding:**

| # | Decision | Owner | Blocking by | Sections provisional if it changes |
|---|---|---|---|---|

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected | Implications | Decided by | Date |
|---|---|---|---|---|---|---|
| D-001 | | | | | | |

---

## Assumptions register

| ID | Assumption | Impact if false | Validation owner | Validate by | Status |
|---|---|---|---|---|---|
| A-001 | | | | | |

---

## Constraints

| ID | Constraint | Source | Consequence |
|---|---|---|---|
| C-001 | | | |

---

## Open items

| ID | Open item | Section | Owner | Needed by | Severity |
|---|---|---|---|---|---|
| O-001 | | | | | |

---

## Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R-001 | | | | | | |

---

# TRACK A - FOUNDATION

## 1. Programme context and business case

### 1.1 Drivers
### 1.2 Objectives and success measures
### 1.3 Governance and sponsorship
### 1.4 The fixed constraint
### 1.5 History and prior attempts

## 2. Scope ⚑

### 2.1 Applications and modules in scope
### 2.2 Legal entity register

| Entity | Country | Functional currency | Statutory filing | Rationale for separate entity | Wave |
|---|---|---|---|---|---|

### 2.3 Countries and localisations
### 2.4 Explicitly out of scope
### 2.5 Phasing decision and wave definition
### 2.6 Interim-state integration implications

## 3. Target operating model and process architecture

### 3.1 Operating model summary
### 3.2 Process architecture mapped to modules
### 3.3 Process ownership

| End-to-end process | Business owner | D365 modules | Change from current state |
|---|---|---|---|

### 3.4 Standard-first posture and gap governance

---

# TRACK B - SOLUTION

## 4. Application architecture ⚑

### 4.1 Application landscape
### 4.2 Instance strategy
### 4.3 ISV register

| ISV | Purpose | One Version compliance | Support model | Contract status | Risk |
|---|---|---|---|---|---|

### 4.4 Power Platform scope
### 4.5 Logic placement principles
### 4.6 Extension governance

## 5. Data architecture ⚑

### 5.1 Chart of accounts design
### 5.2 Financial dimension design

| Dimension | Mandatory | Values (approx.) | Report / decision it serves | Consumer |
|---|---|---|---|---|

### 5.3 Product model and inventory dimensions
### 5.4 Master data ownership

| Entity | Master system | Owner | Creation process | Sync method |
|---|---|---|---|---|

### 5.5 Dataverse and dual-write scope
### 5.6 Dual-write failure behaviour
### 5.7 Number sequence strategy

## 6. Integration architecture

### 6.1 Interface inventory

| ID | Interface | Source | Target | Direction | Pattern | Volume (avg / peak) | Frequency | Tier | Owner |
|---|---|---|---|---|---|---|---|---|---|

### 6.2 Pattern selection rationale
### 6.3 Middleware strategy
### 6.4 Error handling, retry, and idempotency

| Interface | Retry policy | Poison handling | Idempotency | Alert destination | Reconciliation |
|---|---|---|---|---|---|

### 6.5 Monitoring and ownership

---

# TRACK C - DATA AND CONTROL

## 7. Data migration ⚑

### 7.1 Object scope by class
### 7.2 Historical data decision
### 7.3 Opening balance strategy
### 7.4 Data cleansing ownership
### 7.5 Reconciliation and sign-off model
### 7.6 Tooling

## 8. Security, compliance, and licensing

### 8.1 Role family design
### 8.2 Segregation of duties requirement and authority
### 8.3 Compliance and data residency constraints
### 8.4 Record-level security assessment
### 8.5 Indicative licence shape

| Role family | Headcount | Indicative licence type | Notes |
|---|---|---|---|

*Indicative only. Verify against the current Dynamics 365 licensing documentation and the client's contracted entitlement.*

### 8.6 Access administration and joiner/mover/leaver process

---

# TRACK D - PLATFORM

## 9. Environment strategy and ALM

### 9.1 Environment topology

| Environment | Tier | Purpose | Owner | Refresh cadence |
|---|---|---|---|---|

### 9.2 Golden configuration approach
### 9.3 Source control and branching
### 9.4 Build and release pipelines
### 9.5 Service update governance

## 10. Reporting and analytics architecture

### 10.1 Report inventory

| Report | Consumer | Decision it drives | Required latency | Tool | Owner |
|---|---|---|---|---|---|

### 10.2 Tool mapping rationale
### 10.3 Analytics platform direction
### 10.4 Statutory reporting approach
### 10.5 Post-go-live report ownership

## 11. Performance, scale, and volumetrics

### 11.1 Transaction volumetrics

| Process | Daily average | Daily peak | Monthly | 3-year projection |
|---|---|---|---|---|

### 11.2 Data volumes and growth
### 11.3 User concurrency profile
### 11.4 Batch windows and hard constraints
### 11.5 Performance targets and acceptance thresholds
### 11.6 Archiving and retention direction

---

# TRACK E - DELIVERY

## 12. Test strategy

### 12.1 Test levels and ownership
### 12.2 Traceability approach
### 12.3 Test data strategy
### 12.4 Regression automation decision

*Include the calculated cost of not automating: hours per cycle x updates per year, ongoing.*

### 12.5 Exit criteria by phase
### 12.6 Defect severity model

## 13. Deployment and cutover approach ⚑

### 13.1 Deployment approach and wave plan
### 13.2 Cutover window constraint

*Validate the window against measured full-volume dry-run timings.*

### 13.3 Parallel running decision
### 13.4 Rollback position
### 13.5 Go/no-go authority and criteria framework

## 14. Support and operating model

### 14.1 Support model and tiers
### 14.2 Hypercare definition and exit criteria
### 14.3 Knowledge transfer plan

| Capability | Client recipient | Transfer method | By when |
|---|---|---|---|

### 14.4 Post-go-live change process
### 14.5 Service update ownership

---

## Appendix A - References

| Source | URL | Date checked |
|---|---|---|

## Appendix B - Architect's notes

| # | Section | Recommendation | Decision taken instead | Risk | Accepted by |
|---|---|---|---|---|---|

## Appendix C - Version history

| Version | Date | Sections updated | Author |
|---|---|---|---|
| 0.1 | | Initial structure | |
