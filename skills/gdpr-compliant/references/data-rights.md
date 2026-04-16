# GDPR Reference — Data Rights, Accountability & Governance

Load this file when you need implementation detail on:
user rights endpoints, Data Subject Request (DSR) workflow,
Record of Processing Activities (RoPA), consent management.

---

## User Rights Implementation (Articles 15–22)

Every right MUST have a tested API endpoint or documented back-office process
before the system goes live. Respond to verified requests within **30 calendar days**.

| Right | Article | Engineering implementation |
|---|---|---|
| Right of access | 15 | `GET /api/v1/me/data-export` — all personal data, JSON or CSV |
| Right to rectification | 16 | `PUT /api/v1/me/profile` — propagate to all downstream stores |
| Right to erasure | 17 | `DELETE /api/v1/me` — scrub all stores per erasure checklist |
| Right to restriction | 18 | `ProcessingRestricted` flag on user record; gate non-essential processing |
| Right to portability | 20 | Same as access endpoint; structured, machine-readable (JSON) |
| Right to object | 21 | Opt-out endpoint for legitimate-interest processing; honor immediately |
| Automated decision-making | 22 | Expose a human review path + explanation of the logic |

### Erasure Checklist — MUST cover all stores

When `DELETE /api/v1/me` is called, the erasure pipeline MUST scrub:

- Primary relational database (anonymize or delete rows)
- Read replicas
- Search index (Elasticsearch, Azure Cognitive Search, etc.)
- In-memory cache (Redis, IMemoryCache)
- Object storage (S3, Azure Blob — profile pictures, documents)
- Email service logs (Brevo, SendGrid — delivery logs)
- Analytics platform (Mixpanel, Amplitude, GA4 — user deletion API)
- Audit logs (anonymize identifying fields — do not delete the event)
- Backups (document the backup TTL; accept that backups expire naturally)
- CDN edge cache (purge if personal data may be cached)
- Third-party sub-processors (trigger their deletion API or document the manual step)

### Data Export Format (`GET /api/v1/me/data-export`)

```json
{
  "exportedAt": "2025-03-30T10:00:00Z",
  "subject": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-15T08:30:00Z"
  },
  "profile": { ... },
  "orders": [ ... ],
  "consents": [ ... ],
  "auditEvents": [ ... ]
}
```

- MUST be machine-readable (JSON preferred, CSV acceptable).
- MUST NOT be a PDF screenshot or HTML page.
- MUST include all stores listed in the RoPA for this user.

### DSR Tracker (back-office)

Implement a **Data Subject Request tracker** with:
- Incoming request date
- Request type (access / rectification / erasure / portability / restriction / objection)
- Verification status (identity confirmed y/n)
- Deadline (received date + 30 days)
- Assigned handler
- Completion date and outcome
- Notes

Automate the primary store scrubbing; document manual steps for third-party stores.

---

## Record of Processing Activities (RoPA)

Maintain as a living document (Markdown, YAML, or JSON) version-controlled in the repo.
Update with **every** new feature that introduces a processing activity.

### Minimum fields per processing activity

```yaml
- name: "User account management"
  purpose: "Create and manage user accounts for service access"
  legalBasis: "Contract (Art. 6(1)(b))"
  dataSubjects: ["Registered users"]
  personalDataCategories: ["Name", "Email", "Password hash", "IP address"]
  recipients: ["Internal engineering team", "Brevo (email delivery)"]
  retentionPeriod: "Account lifetime + 12 months"
  transfers:
    outside_eea: true
    safeguard: "Brevo — Standard Contractual Clauses (SCCs)"
  securityMeasures: ["TLS 1.3", "AES-256 at rest", "bcrypt password hashing"]
  dpia_required: false
```

### Legal basis options (Art. 6)

| Basis | When to use |
|---|---|
| `Contract (6(1)(b))` | Processing necessary to fulfill the service contract |
| `Legitimate interest (6(1)(f))` | Fraud prevention, security, analytics (requires balancing test) |
| `Consent (6(1)(a))` | Marketing, non-essential cookies, optional profiling |
| `Legal obligation (6(1)(c))` | Tax records, anti-money-laundering |
| `Vital interest (6(1)(d))` | Emergency situations only |
| `Public task (6(1)(e))` | Public authorities |

---

## Consent Management

### MUST

- Store consent as an **immutable event log**, not a mutable boolean flag.
- Record: what was consented to, when, which version of the privacy policy, the mechanism.
- Load analytics / marketing SDKs **conditionally** — only after consent is granted.
- Provide a consent withdrawal mechanism as easy to use as the consent grant.

### Consent store schema (minimum)

```sql
CREATE TABLE ConsentRecords (
    Id          UUID PRIMARY KEY,
    UserId      UUID NOT NULL,
    Purpose     VARCHAR(100) NOT NULL,   -- e.g. "marketing_emails", "analytics"
    Granted     BOOLEAN NOT NULL,
    PolicyVersion VARCHAR(20) NOT NULL,
    ConsentedAt TIMESTAMPTZ NOT NULL,
    IpAddressHash VARCHAR(64),           -- HMAC-SHA256 of anonymized IP
    UserAgent   VARCHAR(500)
);
```

### MUST NOT

- MUST NOT pre-tick consent checkboxes.
- MUST NOT bundle consent for marketing with consent for service delivery.
- MUST NOT make service access conditional on marketing consent.
- MUST NOT use dark patterns (e.g., "Accept all" prominent, "Reject" buried).

---

## Sub-processor Management

Maintain a **sub-processor list** updated with every new SaaS tool or cloud service
that touches personal data.

Minimum fields per sub-processor:

| Field | Example |
|---|---|
| Name | Brevo |
| Service | Transactional email |
| Data categories transferred | Email address, name, email content |
| Processing location | EU (Paris) |
| DPA signed |  2024-01-10 |
| DPA URL / reference | [link] |
| SCCs applicable | N/A (EU-based) |

**MUST** review the sub-processor list annually and upon any change.
**MUST NOT** allow data to flow to a new sub-processor before a DPA is signed.

---

## DPIA Triggers (Article 35)

A DPIA is **mandatory** before processing that is likely to result in a high risk. Triggers include:

- Systematic and extensive profiling with significant effects on individuals
- Large-scale processing of special category data (health, biometric, racial origin, sexual orientation, religion)
- Systematic monitoring of publicly accessible areas (CCTV, location tracking)
- Processing of children's data at scale
- Innovative technology with unknown privacy implications
- Matching or combining datasets from multiple sources

When in doubt: conduct the DPIA anyway. Document the outcome.
