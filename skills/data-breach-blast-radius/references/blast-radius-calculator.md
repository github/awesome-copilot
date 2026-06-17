# Blast Radius Calculator

Formulas, scoring matrices, and estimation heuristics for quantifying how many people, records, and systems would be affected by a data breach in the codebase under analysis.

---

## Core Blast Radius Formula

```
Blast Radius Score (BRS) = Tier_Weight × Exposure_Likelihood × Population_Scale × Completeness_Factor × Context_Multiplier
```

**Score ranges:**
- 0–25: **Low** — limited exposure, few records
- 26–50: **Medium** — meaningful exposure, focused population
- 51–75: **High** — significant exposure, broad regulatory consequences
- 76–100: **Critical** — catastrophic exposure, immediate action required

---

## Factor 1: Tier Weight (T)

Based on the data classification tier from `data-classification.md`:

| Tier | Label | Weight |
|------|-------|--------|
| T1 | Catastrophic | 5.0 |
| T2 | Critical | 4.0 |
| T3 | High | 3.0 |
| T4 | Elevated | 2.0 |
| T5 | Standard | 1.0 |

**Rule:** When multiple tiers exist in the same exposure vector, use the **highest** tier weight.

**Aggregation uplift:** If 3+ fields from different tiers are exposed together, add +0.5 to the highest tier weight (aggregation attack risk).

---

## Factor 2: Exposure Likelihood (E)

How likely is this vector to be exploited in a realistic breach scenario?

| Likelihood Score | Label | Criteria |
|-----------------|-------|---------|
| 1.0 | **Certain** | Data is publicly accessible today (no auth required) |
| 0.9 | **Near Certain** | Auth bypass is trivial (e.g., IDOR on sequential IDs, broken JWT validation) |
| 0.8 | **Very Likely** | Auth required but missing for this specific endpoint; or data leaked in logs accessible by most engineers |
| 0.7 | **Likely** | Auth required but over-broad access (all users can see all data); missing field-level access control |
| 0.6 | **Moderate** | Requires privilege escalation or chaining with another bug; internal system with broad developer access |
| 0.5 | **Possible** | Requires significant attacker effort but no defense-in-depth; DB accessible from dev environment |
| 0.3 | **Unlikely** | Multiple security controls in place; but controls are not verified by the codebase review |
| 0.1 | **Remote** | Strong defense-in-depth: encryption, field masking, proper authz, rate limiting, anomaly detection all present |

---

## Factor 3: Population Scale (P)

Normalize the estimated number of affected records to a 0–1 scale.

### Estimating Record Counts

**Step 1: Look for explicit signals in the codebase**
```
# Strong signals (use these if found):
- README mentions user count ("serves 5M users")
- Seeder/fixture files with record counts
- Migration comments ("adding index for 50K users")
- Analytics dashboards or monitoring configs mentioning scale
- Infrastructure configs (DB instance size implies scale):
  - db.t3.micro → < 10K active users
  - db.r5.large → 10K–500K users
  - db.r5.4xlarge / Aurora Serverless → > 500K users

# Medium signals:
- App category (SaaS product → higher, internal tool → lower)
- Multi-tenant vs. single-tenant architecture
- Presence of sharding or partitioning in DB schema

# Weak signals:
- Tech stack alone (no reliable correlation to user count)
```

**Step 2: Apply default estimates when no signals are found**

| Application Type | Conservative Estimate | Typical Estimate |
|-----------------|----------------------|-----------------|
| Internal corporate tool | 100–1,000 | 500 |
| B2B SaaS (small/startup) | 1,000–10,000 | 5,000 |
| B2B SaaS (established) | 10,000–100,000 | 50,000 |
| B2C app (consumer startup) | 10,000–100,000 | 50,000 |
| B2C app (growth stage) | 100,000–1,000,000 | 500,000 |
| B2C app (scale) | 1,000,000–100,000,000 | 10,000,000 |
| Healthcare system | 1,000–100,000 | 20,000 |
| Financial services | 5,000–500,000 | 50,000 |
| Government / public sector | 10,000–10,000,000 | 1,000,000 |

**Always state the assumption used.**

### Population Scale Score (P)

| Records at Risk | Score |
|----------------|-------|
| < 100 | 0.1 |
| 100–1,000 | 0.2 |
| 1,000–10,000 | 0.3 |
| 10,000–50,000 | 0.4 |
| 50,000–100,000 | 0.5 |
| 100,000–500,000 | 0.6 |
| 500,000–1,000,000 | 0.7 |
| 1M–10M | 0.8 |
| 10M–100M | 0.9 |
| > 100M | 1.0 |

---

## Factor 4: Completeness Factor (C)

How complete/useful is the exposed data for an attacker?

| Factor | Score | Description |
|--------|-------|-------------|
| **Full Profile** | 1.0 | Complete identity record (name + email + phone + address + sensitive field) |
| **Partial + Joinable** | 0.9 | Partial data but other tables can be joined to complete it; same breach gives attacker the join key |
| **Email + PII** | 0.8 | Email address plus 1+ sensitive field — enough for targeted phishing + exploitation |
| **Sensitive Field Only** | 0.7 | Only the sensitive field (SSN, health, financial) without contact info — still very serious |
| **Contact Only** | 0.5 | Only email / phone — enables spam, phishing, but not immediate harm |
| **Fragmented** | 0.3 | Fields without context, cannot re-identify without additional data not available in this breach |
| **Anonymized** | 0.1 | Properly anonymized — re-identification requires significant external data linking |

---

## Factor 5: Context Multipliers (M)

Apply these multipliers to the final score for specific contexts:

| Context | Multiplier | Rationale |
|---------|-----------|-----------|
| Children's data present (COPPA / GDPR Art 8) | × 2.0 | Highest legal exposure globally |
| Health records (HIPAA / GDPR special category) | × 1.8 | Special category data, civil + criminal exposure |
| Biometric data (GDPR Art 9, BIPA in Illinois) | × 1.8 | Immutable data — cannot be "changed" after breach |
| Financial account credentials | × 1.7 | Direct financial theft possible |
| Government IDs (SSN, passport) | × 1.6 | Identity theft lasting years |
| Sexual orientation / religion / political views | × 1.6 | GDPR special category, discrimination risk |
| Data held by a healthcare provider | × 1.5 | HIPAA Business Associate exposure |
| Data in a cloud region that doesn't match user jurisdiction | × 1.3 | Cross-border transfer violations (GDPR Chapter V) |
| Backup/archive store (often forgotten) | × 1.2 | Backups frequently missed in breach containment |

---

## Blast Radius Score Calculation Examples

### Example 1: E-commerce checkout system

**Exposure vector:** API endpoint `/api/users/{id}/payment-methods` — no ownership check (IDOR)
- Tier: T2 (card last 4 + billing address) = 4.0
- Exposure Likelihood: 0.9 (IDOR on sequential IDs, near-certain exploitation)
- Population Scale: 100K users = 0.6
- Completeness: Partial profile + joinable to user table = 0.9
- Context Multiplier: Payment data = 1.7

```
BRS = 4.0 × 0.9 × 0.6 × 0.9 × 1.7 = 3.30 (raw) → normalized to 66/100 → HIGH
```

### Example 2: Internal HR tool

**Exposure vector:** Employees table visible to all company users via `/api/employees`
- Tier: T2 (salary + home address + SSN) = 5.0 (SSN is T1)
- Exposure Likelihood: 0.7 (auth required, but no RBAC; any employee can see all)
- Population Scale: 2,000 employees = 0.3
- Completeness: Full profile = 1.0
- Context Multiplier: Government IDs (SSN) = 1.6

```
BRS = 5.0 × 0.7 × 0.3 × 1.0 × 1.6 = 1.68 (raw) → normalized to 34/100 → MEDIUM
```

However — **financial impact** overrides score here because SSN exposure is Tier 1. Flag as HIGH regardless of score.

---

## Score Normalization

The raw formula output typically ranges 0–8. Normalize to 0–100:

```
Normalized_BRS = min(100, (raw_BRS / 8.0) × 100)
```

---

## Blast Radius Summary Table (per exposure vector)

Use this format when reporting:

```markdown
| # | Exposure Vector | Tier | Likelihood | Pop. at Risk | BRS | Severity | Jurisdiction |
|---|----------------|------|-----------|-------------|-----|----------|--------------|
| 1 | /api/users endpoint - SSN returned in response | T1 | 0.9 | 50K | 87 | CRITICAL | GDPR, CCPA |
| 2 | Logs contain plaintext emails | T3 | 0.6 | 50K | 45 | MEDIUM | GDPR |
| 3 | Redis cache stores full user objects | T2 | 0.5 | 50K | 38 | MEDIUM | GDPR, CCPA |
| 4 | S3 bucket - public read on user avatars | T4 | 1.0 | 50K | 28 | LOW | - |
```

---

## Total Organizational Blast Radius

After scoring all exposure vectors, compute:

**Maximum Simultaneous Exposure (MSE):** The number of unique individuals that could be affected if a single attacker gained broad DB access (worst case). This is the number used in regulatory reporting.

**Expected Breach Exposure (EBE):** The typical exposure based on the most likely attack vector (the highest-likelihood finding, not the highest-impact one).

**Regulatory Trigger Count:** The number of distinct regulatory regimes triggered (each one has its own notification obligation and fine formula).

```markdown
## Organizational Blast Radius Summary

| Metric | Value |
|--------|-------|
| Maximum records at risk | [number] |
| Users with Tier 1 data | [number] |
| Users with Tier 2 data | [number] |
| Users with Tier 3+ data | [number] |
| Regulations triggered | GDPR, CCPA, [others] |
| Worst-case BRS | [score] |
| Most likely attack vector | [description] |
| Time to detect (estimated) | [industry avg: 194 days if no SIEM] |
| Time to contain (estimated) | [industry avg: 73 days] |
```

---

## Breach Cost Benchmarks (IBM Data — Verify Annual Edition)

Use these when no specific cost data is available. Figures below are from the **IBM 2024 edition**. IBM publishes a new edition annually at https://www.ibm.com/reports/data-breach — the 2025 report reports a ~9% decrease in global average cost.

| Metric | Value (IBM 2024) |
|--------|------------------|
| Global average cost per breach | $4.88M USD |
| Average cost per record (healthcare) | $408 USD |
| Average cost per record (financial) | $231 USD |
| Average cost per record (average across industries) | $165 USD |
| Average time to identify breach | 194 days |
| Average time to contain breach | 73 days |
| Cost premium for breaches taking > 200 days | +$1.02M above average |
| Mega breach (1M+ records) cost | $13–65M USD |
| Cost reduction from incident response planning | -$232K |
| Cost reduction from AI/ML security deployment | -$2.22M |
| Cost reduction from employee training | -$258K |

> Source: IBM Cost of a Data Breach Report 2024. State these as benchmarks, not guarantees. Update this table when a new edition is released.
