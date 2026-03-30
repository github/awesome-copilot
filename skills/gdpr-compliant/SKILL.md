---
name: gdpr-compliant
description: 'Apply GDPR-compliant engineering practices across your codebase. Use this skill
  whenever you are designing APIs, writing data models, building authentication flows,
  implementing logging, handling user data, writing retention/deletion jobs, designing
  cloud infrastructure, or reviewing pull requests for privacy compliance.
  Trigger this skill for any task involving personal data, user accounts, cookies,
  analytics, emails, audit logs, encryption, pseudonymization, anonymization,
  data exports, breach response, CI/CD pipelines that process real data, or any
  question framed as "is this GDPR-compliant?". Inspired by CNIL developer guidance
  and GDPR Articles 5, 25, 32, 33, 35.'
---

# GDPR Engineering Skill

A comprehensive, actionable reference for engineers, architects, DevOps engineers,
and tech leads building GDPR-compliant software in the EU/EEA or handling data of
EU residents.

> **Golden Rule — commit this to memory:**
> **Collect less. Store less. Expose less. Retain less.**

---

## Table of Contents

1. [Core GDPR Principles](#1-core-gdpr-principles)
2. [Privacy by Design & by Default](#2-privacy-by-design--by-default)
3. [Data Minimization](#3-data-minimization)
4. [Purpose Limitation](#4-purpose-limitation)
5. [Storage Limitation & Retention Policies](#5-storage-limitation--retention-policies)
6. [Integrity & Confidentiality](#6-integrity--confidentiality)
7. [Accountability & Records of Processing](#7-accountability--records-of-processing)
8. [User Rights Implementation](#8-user-rights-implementation)
9. [API Design Rules](#9-api-design-rules)
10. [Logging Rules](#10-logging-rules)
11. [Error Handling](#11-error-handling)
12. [Encryption](#12-encryption)
13. [Password Hashing](#13-password-hashing)
14. [Secrets Management](#14-secrets-management)
15. [Anonymization & Pseudonymization](#15-anonymization--pseudonymization)
16. [Testing with Fake Data](#16-testing-with-fake-data)
17. [Incident & Breach Handling](#17-incident--breach-handling)
18. [Cloud & DevOps Practices](#18-cloud--devops-practices)
19. [CI/CD Controls](#19-cicd-controls)
20. [Architecture Patterns](#20-architecture-patterns)
21. [Anti-Patterns](#21-anti-patterns)
22. [PR Review Checklist](#22-pr-review-checklist)

---

## 1. Core GDPR Principles

These seven principles (Article 5 GDPR) are the foundation of every engineering decision.

| Principle | Engineering meaning |
|---|---|
| **Lawfulness, fairness, transparency** | Have a documented legal basis for every processing activity. Expose privacy notices in the UI. |
| **Purpose limitation** | Data collected for purpose A MUST NOT be silently reused for purpose B without a new legal basis. |
| **Data minimization** | Collect only the fields you actually need today. Delete the rest. |
| **Accuracy** | Provide update endpoints. Propagate corrections to downstream stores. |
| **Storage limitation** | Define a TTL at the moment you design the schema, not after. |
| **Integrity & confidentiality** | Encrypt at rest and in transit. Restrict access. Audit access to sensitive data. |
| **Accountability** | Maintain documented evidence that you comply. DPA-ready at any time. |

---

## 2. Privacy by Design & by Default

**Privacy by Design** means privacy is an architectural requirement, not a retrofit.
**Privacy by Default** means the most privacy-preserving option is always the default.

### MUST

- Design data models with retention in mind from day one — add `CreatedAt`, `DeletedAt`, `RetentionExpiresAt` columns when the entity is first created.
- Default all optional data collection to **off**. Users opt in; they do not opt out.
- Make the least-privileged access path the default API behavior.
- Conduct a **Data Protection Impact Assessment (DPIA)** before building any high-risk processing (biometrics, large-scale profiling, health data, systematic monitoring).
- Document processing activities in a **Record of Processing Activities (RoPA)** — update it with every new feature.

### SHOULD

- Use feature flags to allow disabling data collection without a deployment.
- Apply column-level encryption for sensitive fields (health, financial, SSN, biometrics) rather than relying on disk encryption alone.
- Design for soft-delete + scheduled hard-delete, not immediate hard-delete, to allow data subject request windows.

### MUST NOT

- MUST NOT ship a new data collection feature without a documented legal basis.
- MUST NOT enable analytics, tracking, or telemetry by default without explicit consent.
- MUST NOT store personal data in a system not listed in the RoPA.

---

## 3. Data Minimization

### MUST

- Map every field in every DTO/model to a concrete business need. Remove fields with no documented use.
- In API responses, return only what the client actually needs. Never return full entity objects when a projection suffices.
- Truncate or mask data at the edge — e.g., return `****1234` for card numbers, not the full PAN.
- In search/list endpoints, exclude sensitive fields (date of birth, national ID, health data) from default projections.

### SHOULD

- Use separate DTOs for create, read, and update operations — never reuse the same object and accidentally expose fields.
- Add automated tests that assert sensitive fields are absent from API responses where they should not appear.

### MUST NOT

- MUST NOT log full request/response bodies if they may contain personal data.
- MUST NOT include personal data in URL path segments or query parameters (they end up in access logs, CDN logs, and browser history).
- MUST NOT collect `dateOfBirth`, national ID, or health data unless there is an explicit, documented business requirement and a legal basis.

---

## 4. Purpose Limitation

### MUST

- Document the purpose of every processing activity in code comments and in the RoPA.
- Tag database columns with their purpose in migration scripts or schema documentation.
- When reusing data for a secondary purpose (e.g., fraud detection reusing transactional data), obtain a new legal basis or confirm compatibility analysis.

### SHOULD

- Implement **data purpose tags** as metadata in your data warehouse/lake so downstream pipelines cannot silently extend usage.
- Build separate data stores for separate purposes (e.g., marketing analytics must not read from production operational data directly).

### MUST NOT

- MUST NOT share personal data collected for service delivery with third-party advertising networks without explicit consent.
- MUST NOT use support ticket content to train ML models without a separate legal basis and user notice.

---

## 5. Storage Limitation & Retention Policies

### MUST

- Every table or store that holds personal data MUST have a defined retention period.
- Implement a scheduled job (e.g., Hangfire, cron) that enforces retention — not a manual process.
- Distinguish between **anonymization** (data may remain) and **deletion** (data is gone). Choose deliberately.
- Archive or anonymize data when retention expires — never leave expired data silently in production.
- Document retention periods in a **Retention Policy** document linked from the RoPA.

### Recommended Retention Defaults

| Data type | Suggested maximum retention |
|---|---|
| Authentication logs | 12 months |
| Audit logs | 12–24 months (legal requirements may extend this) |
| Session tokens / refresh tokens | 30–90 days |
| Email / notification logs | 6 months |
| User accounts (inactive) | 12 months after last login, then notify + delete |
| Payment records | As required by tax law (typically 7–10 years), but minimized |
| Support tickets | 3 years after closure |
| Analytics events | 13 months (standard GA-style) |

### SHOULD

- Add a `RetentionExpiresAt` column to every sensitive table — compute it at insert time.
- Use soft-delete (`DeletedAt`) with a scheduled hard-delete job after the GDPR erasure request window (30 days).

### MUST NOT

- MUST NOT retain personal data indefinitely "in case it becomes useful later."
- MUST NOT use production data as a long-term data lake without a retention enforcement mechanism.

---

## 6. Integrity & Confidentiality

### MUST

- Enforce **TLS 1.2+** on all connections. Reject older protocols.
- Encrypt personal data **at rest** using AES-256 or equivalent.
- Use **column-level encryption** for highly sensitive fields (health, biometric, financial, national ID).
- Restrict database access by role — application user MUST NOT have DDL rights on the production database.
- Enforce the **principle of least privilege** on all IAM roles, service accounts, and API keys.
- Enable access logging on databases and object storage. Retain access logs per retention policy.

### SHOULD

- Use **envelope encryption**: data encrypted with a data encryption key (DEK) which is itself encrypted by a key encryption key (KEK) stored in a KMS (Azure Key Vault, AWS KMS, GCP Cloud KMS).
- Enable **automatic key rotation** (annually minimum).
- Use **network segmentation**: databases must not be publicly accessible. Use private endpoints / VPC peering.
- Enable **audit logging** at the database level for SELECT on sensitive tables.

### MUST NOT

- MUST NOT store secrets (API keys, connection strings, passwords) in source code, configuration files committed to Git, or environment variable defaults.
- MUST NOT use self-signed certificates in production.
- MUST NOT transmit personal data over HTTP.

---

## 7. Accountability & Records of Processing

### MUST

- Maintain a **Record of Processing Activities (RoPA)** — a living document updated with every new feature. Minimum fields per activity:
  - Name and purpose
  - Legal basis (contract / legitimate interest / consent / legal obligation / vital interest / public task)
  - Categories of data subjects
  - Categories of personal data
  - Recipients (third parties, sub-processors)
  - Transfers outside EEA and safeguards
  - Retention period
  - Security measures

- Maintain a list of all **sub-processors** (cloud providers, SaaS tools, analytics, email providers). Review annually.
- Sign **Data Processing Agreements (DPAs)** with every sub-processor before data flows to them.

### SHOULD

- Generate a machine-readable RoPA (YAML/JSON) alongside the human-readable version, so it can be version-controlled.
- Automate a quarterly reminder to review the RoPA and sub-processor list.

### MUST NOT

- MUST NOT onboard a new SaaS tool that processes personal data without a signed DPA and RoPA entry.

---

## 8. User Rights Implementation

GDPR grants data subjects the following rights. Each must have a technical implementation path.

| Right | Engineering implementation |
|---|---|
| **Right of access (Art. 15)** | `GET /api/v1/me/data-export` — returns all personal data in a machine-readable format (JSON or CSV). Respond within 30 days. |
| **Right to rectification (Art. 16)** | `PUT /api/v1/me/profile` — allow users to update their data. Propagate changes to downstream stores (search index, data warehouse). |
| **Right to erasure / right to be forgotten (Art. 17)** | `DELETE /api/v1/me` — anonymize or delete all personal data. Implement a checklist of all stores to scrub. |
| **Right to restriction of processing (Art. 18)** | Add a `ProcessingRestricted` flag on the user record. Gate all non-essential processing behind this flag. |
| **Right to data portability (Art. 20)** | Same as access endpoint, but ensure the format is structured, commonly used, and machine-readable (JSON preferred). |
| **Right to object (Art. 21)** | Provide an opt-out mechanism for processing based on legitimate interest. Honor it immediately — do not defer. |
| **Rights related to automated decision-making (Art. 22)** | If automated decisions produce legal or significant effects, provide a human review path. Expose an explanation of the logic. |

### MUST

- Every right MUST have a tested API endpoint (or admin back-office process) before the system goes live.
- Erasure MUST be comprehensive — document every store where a user's data lives (DB, S3, search index, cache, email logs, CDN logs, analytics).
- Respond to verified data subject requests within **30 calendar days**.
- Provide a machine-readable data export — not a PDF screenshot.

### SHOULD

- Build a **Data Subject Request (DSR) tracker** — a back-office tool to manage incoming requests, deadlines, and completion status.
- Automate the erasure pipeline for primary stores; document the manual steps for third-party stores.
- Test erasure with integration tests that assert the user's data is absent from all stores after deletion.

### MUST NOT

- MUST NOT require users to contact support via phone or letter to exercise their rights if the product is digital.
- MUST NOT charge a fee for data access requests unless clearly abusive and excessive.

---

## 9. API Design Rules

### MUST

- MUST NOT include personal data in URL path or query parameters.
  - ❌ `GET /users/john.doe@example.com`
  - ✅ `GET /users/{userId}`
- Authenticate all endpoints that return or accept personal data.
- Enforce **RBAC or ABAC** — users MUST NOT be able to access another user's data by guessing IDs (IDOR prevention).
  - Always extract the acting user's identity from the JWT/session, never from the request body.
  - Validate ownership: `if (resource.OwnerId != currentUserId) return 403`.
- Version your API — breaking privacy changes require a new version with migration guidance.
- Return **only the fields the caller is authorized to see**. Use response projections.

### SHOULD

- Implement **rate limiting** on sensitive endpoints (login, data export, password reset) to prevent enumeration and abuse.
- Add a `Content-Security-Policy` header on all responses.
- Use `Referrer-Policy: no-referrer` or `strict-origin` to prevent personal data leaking in referer headers.
- Implement **CORS** with an explicit allowlist. Never use `Access-Control-Allow-Origin: *` on authenticated APIs.

### MUST NOT

- MUST NOT return stack traces, internal paths, or database error messages in API error responses.
- MUST NOT use predictable sequential integer IDs as public resource identifiers — use UUIDs or opaque identifiers.
- MUST NOT expose bulk export endpoints without authentication and rate limiting.

---

## 10. Logging Rules

### MUST

- **Anonymize IPs** in application logs — mask the last octet (IPv4) or the last 80 bits (IPv6).
  - ❌ `192.168.1.42`
  - ✅ `192.168.1.xxx`
- MUST NOT log passwords, tokens, session IDs, or authentication credentials.
- MUST NOT log full request or response bodies if they may contain personal data (forms, profile updates, health data).
- MUST NOT log national identification numbers, payment card numbers, or health data.
- Apply log retention — purge logs automatically after the defined retention period.

### SHOULD

- Log **events** rather than data: `"User {UserId} updated email"` not `"Email changed from a@b.com to c@d.com"`.
- Hash or pseudonymize user identifiers in logs used for analytics or debugging (use a one-way HMAC).
- Separate **audit logs** (access to sensitive data, configuration changes, admin actions) from **application logs** (errors, performance). Different retention, different access controls.
- Implement **structured logging** (JSON) with a `userId` field that uses an internal identifier, not the email address.

### Log fields — MUST NOT include

- `password`, `passwordHash`, `secret`, `token`, `refreshToken`, `resetToken`
- `cardNumber`, `cvv`, `iban`, `bic`
- `ssn`, `nationalId`, `passportNumber`
- `dateOfBirth` (in logs where it is not strictly necessary)
- Full `email` in high-volume access logs (use a hash or user ID)

---

## 11. Error Handling

### MUST

- Return **generic error messages** to clients — never expose internal state, stack traces, or database errors.
  - ❌ `"Column 'email' violates unique constraint on table 'users'"`
  - ✅ `"A user with this email address already exists."`
- Use **Problem Details (RFC 7807)** format for all error responses — structured, consistent, no internal leakage.
- Log the full error **server-side** with correlation ID. Return only the correlation ID to the client.

### SHOULD

- Implement a global exception handler/middleware that catches unhandled exceptions before they reach the response serializer.
- Differentiate between **operational errors** (user errors, 4xx) and **programmer errors** (bugs, 5xx) in your logging strategy.

### MUST NOT

- MUST NOT include file paths, class names, method names, or line numbers in error responses.
- MUST NOT include personal data in error messages (e.g., "User john@example.com not found").

---

## 12. Encryption

### At-Rest Encryption

| Sensitivity | Minimum standard |
|---|---|
| Standard personal data (name, address, email) | AES-256 disk/volume encryption (cloud provider default) |
| Sensitive personal data (health, biometric, financial) | AES-256 **column-level** encryption + envelope encryption via KMS |
| Encryption keys | HSM-backed KMS (Azure Key Vault Premium, AWS KMS with CMK) |

### In-Transit Encryption

- **MUST** enforce TLS 1.2 minimum; prefer TLS 1.3.
- **MUST** use HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).
- **MUST** pin certificates or use certificate transparency monitoring for critical services.
- **MUST NOT** allow TLS 1.0 or TLS 1.1.
- **MUST NOT** use null cipher suites or export-grade ciphers.

### Key Management

- **MUST** store encryption keys in a dedicated KMS — never hardcoded, never in environment variables in plain text.
- **MUST** rotate data encryption keys (DEKs) annually, or immediately upon suspected compromise.
- **SHOULD** use separate keys per environment (dev, staging, prod).
- **SHOULD** log all key access events in the KMS audit trail.

---

## 13. Password Hashing

### MUST

- Use **bcrypt** (cost ≥ 12), **Argon2id** (recommended), or **scrypt** for password hashing.
- Never use MD5, SHA-1, SHA-256, or any non-password-specific hash function for passwords.
- Use a **unique salt per password** — never a global salt.
- Store only the hash — never the plaintext password, never a reversible encoding.

### SHOULD

- Implement **pepper** (a secret server-side value added before hashing) stored in the KMS, not in the database.
- Enforce a minimum password length of 12 characters.
- Check passwords against known breach lists (HaveIBeenPwned API) at registration and login.
- Re-hash on login if the stored hash uses an outdated algorithm — upgrade transparently.

### MUST NOT

- MUST NOT log passwords in any form — not during registration, not during failed login.
- MUST NOT transmit passwords in URLs or query strings.
- MUST NOT store password reset tokens in plaintext — hash them before storage.

---

## 14. Secrets Management

### MUST

- Store all secrets in a dedicated secret manager: **Azure Key Vault**, **AWS Secrets Manager**, **GCP Secret Manager**, or **HashiCorp Vault**.
- MUST NOT commit secrets to source code repositories — use pre-commit hooks (`detect-secrets`, `gitleaks`) to prevent this.
- MUST NOT store secrets in environment variable defaults in code.
- MUST NOT pass secrets as plain-text command-line arguments (they appear in process lists).
- Rotate secrets immediately upon:
  - Developer offboarding
  - Suspected compromise
  - Annual rotation schedule

### SHOULD

- Use short-lived credentials (OIDC-based GitHub Actions → cloud OIDC federation instead of long-lived API keys).
- Audit all secret access in the KMS — alert on anomalous access patterns.
- Maintain a **secrets inventory** document updated with every new secret.
- Use separate secret namespaces per environment.

### In `.gitignore` — MUST include

```
.env
.env.*
*.pem
*.key
*.pfx
*.p12
appsettings.Development.json   # if it may contain connection strings
secrets/
```

---

## 15. Anonymization & Pseudonymization

### Definitions

- **Anonymization**: Irreversible. The individual can no longer be identified. Anonymized data falls outside GDPR scope.
- **Pseudonymization**: Reversible with a key. The individual can be re-identified. Pseudonymized data is still personal data under GDPR, but carries reduced risk.

### Anonymization Techniques

| Technique | When to use |
|---|---|
| **Generalization** | Replace exact value with a range (age 34 → "30–40") |
| **Suppression** | Remove the field entirely |
| **Data masking** | Replace with a fixed placeholder (name → "ANONYMIZED_USER") |
| **Noise addition** | Add statistical noise to numerical values for analytics |
| **Aggregation** | Report group statistics, never individual values |
| **K-anonymity / l-diversity** | For analytics datasets — ensure each record is indistinguishable from k-1 others |

### Pseudonymization Techniques

- **HMAC-SHA256 with a secret key**: Consistent, one-way, keyed. Use for user identifiers in analytics.
- **Tokenization**: Replace value with an opaque token; mapping stored separately in a secure vault.
- **Encryption with a separate key**: Decrypt only with explicit authorization.

### MUST

- When a user exercises the right to erasure, anonymize all records that must be retained (e.g., financial records, audit logs) rather than deleting them — replace identifying fields with anonymized values.
- Store the pseudonymization key in the KMS — never in the database alongside pseudonymized data.
- Test anonymization routines with assertions that the original value cannot be recovered from the output.

### MUST NOT

- MUST NOT call data "anonymized" if re-identification is possible through linkage attacks with other datasets.
- MUST NOT apply pseudonymization and then store the mapping key in the same table as the pseudonymized data.

---

## 16. Testing with Fake Data

### MUST

- MUST NOT use production personal data in development, staging, or test environments.
- MUST NOT restore production database backups to non-production environments without scrubbing personal data first.
- Use **synthetic data generators** for test fixtures: `Bogus` (.NET), `Faker` (JS/Python/Ruby), `factory_boy` (Python).

### SHOULD

- Build a **data anonymization pipeline** for production → staging refreshes: replace all PII fields with generated fakes before the restore completes.
- Add CI checks that fail if test fixtures contain real-looking email domains, real names, or real phone number patterns.
- Use realistic but fictional datasets (fake names, fake emails at `@example.com`, fake addresses) so UI tests are meaningful.

### Test Data Rules

```
# MUST use for test emails
user@example.com
test.user+{n}@example.com

# MUST NOT use in tests
Real customer emails
Real names from production
Real phone numbers
Real national ID numbers
```

---

## 17. Incident & Breach Handling

### Regulatory Timeline

- **72 hours**: Notify the supervisory authority (e.g., CNIL, APD, ICO) from the moment of awareness of a personal data breach — unless the breach is unlikely to result in a risk to individuals.
- **Without undue delay**: Notify affected data subjects if the breach is likely to result in a high risk to their rights and freedoms.

### MUST

- Maintain a **breach response runbook** with:
  1. Detection criteria (what triggers an incident)
  2. Severity classification (low / medium / high / critical)
  3. Containment steps per scenario (credential leak, DB dump exposed, ransomware)
  4. Evidence preservation steps
  5. DPA notification template
  6. Data subject notification template
  7. Post-incident review process
- Log all personal data breaches internally — even those that do not require DPA notification.
- Test the breach response process at least annually (tabletop exercise).

### SHOULD

- Implement automated alerts for:
  - Unusual volume of data exports
  - Access to sensitive tables outside business hours
  - Bulk deletion events
  - Failed authentication spikes
  - New credentials appearing in public breach databases (`haveibeenpwned` monitoring)
- Store breach records (internal) for at least 5 years.

### MUST NOT

- MUST NOT delete evidence upon discovery of a breach — preserve logs, snapshots, and access records.
- MUST NOT notify the press or users before notifying the DPA, unless lives are at immediate risk.

---

## 18. Cloud & DevOps Practices

### MUST

- Enable **encryption at rest** for all cloud storage: blob/object storage, managed databases, queues, caches.
- Use **private endpoints** for databases — they MUST NOT be publicly accessible.
- Apply **network security groups / firewall rules** to restrict database access to application layers only.
- Enable **cloud-native audit logging**: Azure Monitor / AWS CloudTrail / GCP Cloud Audit Logs.
- Store personal data only in **approved geographic regions** consistent with GDPR data residency requirements (EEA, or adequacy decision / SCCs for transfers outside EEA).
- Tag all cloud resources that process personal data with a `DataClassification` tag.

### SHOULD

- Enable **Microsoft Defender for Cloud / AWS Security Hub / GCP Security Command Center** and review recommendations regularly.
- Use **managed identities** (Azure) or **IAM roles** (AWS/GCP) instead of long-lived access keys for service-to-service authentication.
- Enable **soft delete and versioning** on object storage — accidental deletion should be recoverable within the retention window.
- Apply **DLP (Data Loss Prevention)** policies on cloud storage to detect PII being written to unprotected buckets.

### MUST NOT

- MUST NOT store personal data in public cloud storage buckets (S3, Azure Blob, GCS) without access controls.
- MUST NOT deploy databases with public IPs in production.
- MUST NOT use the same cloud account / subscription for production and non-production if production data could bleed across.

---

## 19. CI/CD Controls

### MUST

- Run **secret scanning** on every commit: `gitleaks`, `detect-secrets`, GitHub secret scanning (native).
- Run **dependency vulnerability scanning** on every build: `npm audit`, `dotnet list package --vulnerable`, `trivy`, `snyk`.
- MUST NOT use real personal data in CI test jobs.
- MUST NOT log environment variables in CI pipelines — mask all secrets.

### SHOULD

- Add a **GDPR compliance gate** to the pipeline:
  - No new columns without a documented retention period (enforced via migration linting).
  - No new log statements containing fields flagged as PII.
  - Dependency license check (avoid GPL/AGPL for closed-source SaaS).
- Run **SAST (Static Application Security Testing)**: `SonarQube`, `Semgrep`, `CodeQL`.
- Run **container image scanning**: `trivy`, `Snyk Container`, `AWS ECR scanning`.
- Rotate all CI secrets annually and upon personnel changes.

### Pipeline Secret Rules

```yaml
# MUST: mask secrets in logs
- name: Set secret
  run: echo "::add-mask::${{ secrets.MY_SECRET }}"

# MUST NOT: echo secrets to console
- name: Debug  # ❌ Never do this
  run: echo "API Key is $API_KEY"

# SHOULD: use OIDC federation instead of long-lived keys
- name: Authenticate
  uses: azure/login@v1
  with:
    client-id: ${{ vars.AZURE_CLIENT_ID }}
    tenant-id: ${{ vars.AZURE_TENANT_ID }}
    subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```

---

## 20. Architecture Patterns

### Recommended Patterns

**Data Store Separation**
Separate operational data (transactional DB) from analytical data (data warehouse). Apply different retention and access controls to each.

**Event Sourcing with PII Scrubbing**
When using event sourcing, implement a **crypto-shredding** pattern: encrypt personal data in events with a per-user key. Deleting the key effectively anonymizes all events for that user.

**Audit Log Segregation**
Store audit logs in a separate, append-only store with restricted write access. The application service account MUST NOT be able to delete audit log entries.

**Consent Store**
Implement a dedicated consent service that tracks:
- What the user consented to
- When they consented
- Which version of the privacy policy they accepted
- The mechanism of consent (checkbox, API, paper)

**Data Subject Request Queue**
Implement DSRs as an asynchronous workflow (queue + worker) to handle the complexity of scrubbing data across multiple stores reliably.

**Pseudonymization Gateway**
For analytics pipelines, implement a pseudonymization service at the boundary between operational and analytical systems. The mapping key never leaves the operational zone.

---

## 21. Anti-Patterns

These are common mistakes that create GDPR liability. Avoid them.

| Anti-pattern | Risk | Correct approach |
|---|---|---|
| Storing emails in URLs | Logged in CDN/server logs, browser history | Use opaque user IDs in URLs |
| Logging full request bodies | Captures passwords, health data, PII | Log only structured event metadata |
| "Keep forever" database design | Retention violations | Define TTL at schema design time |
| Using production data in dev | Data breach, no legal basis | Synthetic data generators + scrubbing pipeline |
| Shared credentials across teams | Cannot attribute access, cannot rotate safely | Individual accounts + RBAC |
| Hard-coded secrets | Compromise of all environments at once | KMS + secret manager |
| Sequential integer user IDs in URLs | IDOR vulnerabilities, enumeration | UUIDs or opaque identifiers |
| Global `*` CORS header on authenticated API | Cross-origin data theft | Explicit CORS allowlist |
| Storing consent in the same table as profile | Cannot prove consent without the profile | Separate consent store |
| Sending PII in GET query params | Server logs, referrer headers, browser history | POST body or authenticated session |
| Re-using analytics SDK across all users without consent | PECR/ePrivacy violation | Conditional loading behind consent gate |
| Mixing backup and live data residency regions | GDPR data residency violation | Explicit region lockdown on backup jobs |
| "Anonymized" data that includes quasi-identifiers | Re-identification risk | Apply k-anonymity, test linkage resistance |

---

## 22. PR Review Checklist

Use this checklist on every pull request that touches personal data, authentication, logging, or infrastructure.

### Data Model Changes
- [ ] Every new column that holds personal data has a documented purpose.
- [ ] Every new table with personal data has a retention period defined (column or policy).
- [ ] Sensitive fields (health, financial, national ID) use column-level encryption.
- [ ] No sequential integer PKs used as public-facing identifiers.

### API Changes
- [ ] No personal data in URL path or query parameters.
- [ ] All endpoints returning personal data are authenticated.
- [ ] Ownership checks are in place (user cannot access another user's resource).
- [ ] Response projections exclude fields the caller is not authorized to see.
- [ ] Rate limiting applied to sensitive endpoints.

### Logging Changes
- [ ] No passwords, tokens, or credentials logged.
- [ ] No full email addresses or national IDs in high-volume logs.
- [ ] IPs are anonymized (last octet masked).
- [ ] No full request/response bodies logged where PII may be present.

### Infrastructure Changes
- [ ] No storage buckets are public.
- [ ] Databases use private endpoints only.
- [ ] New cloud resources are tagged with `DataClassification`.
- [ ] Encryption at rest enabled for new storage resources.
- [ ] New geographic regions for data storage are approved and compliant with GDPR.

### Secrets & Configuration
- [ ] No secrets in source code or committed config files.
- [ ] New secrets are added to KMS and to the secrets inventory document.
- [ ] CI/CD secrets are masked in pipeline logs.

### Retention & Deletion
- [ ] New data flows have a retention enforcement job or policy.
- [ ] Erasure pipeline covers this new data store or field.
- [ ] Soft-delete is used where hard-delete would be premature.

### User Rights
- [ ] If a new personal data field is introduced, the data export endpoint includes it.
- [ ] If a new data store is introduced, the erasure runbook is updated.

### Third Parties & Sub-processors
- [ ] No new third-party service receives personal data without a signed DPA.
- [ ] New sub-processors are added to the RoPA.

### General
- [ ] RoPA updated if a new processing activity is introduced.
- [ ] No production personal data used in tests.
- [ ] DPIA triggered if the change involves high-risk processing (profiling, health, biometrics, large scale).

---

## Quick Reference — MUST / MUST NOT Summary

| Topic | MUST | MUST NOT |
|---|---|---|
| **Passwords** | bcrypt/Argon2id, cost ≥ 12 | MD5, SHA-1, SHA-256, plaintext storage |
| **Secrets** | KMS / secret manager | Commit to Git, hardcode in source |
| **Encryption** | TLS 1.2+, AES-256 at rest | HTTP, TLS 1.0/1.1 |
| **URLs** | Opaque UUIDs | Emails, names, national IDs in paths |
| **Logs** | Anonymized IPs, event-based | Passwords, tokens, full bodies with PII |
| **Error responses** | Generic messages, correlation ID | Stack traces, DB errors, user data |
| **Test data** | Synthetic / Faker-generated | Real production PII |
| **Retention** | TTL defined at design time | "Keep forever" |
| **Erasure** | Cover all stores, test it | Partial deletion leaving PII in logs/cache |
| **Third parties** | Signed DPA before data flows | Onboard without DPA |
| **IDs** | UUIDs as public identifiers | Sequential integers in public URLs |
| **CORS** | Explicit allowlist | `Access-Control-Allow-Origin: *` on auth APIs |

---

> **Golden Rule — repeated for emphasis:**
> **Collect less. Store less. Expose less. Retain less.**
>
> Every byte of personal data you do not collect is a byte you cannot lose,
> cannot breach, and cannot be held liable for.

---

*Inspired by CNIL developer GDPR guidance, GDPR Articles 5, 25, 32, 33, 35,
and engineering best practices from ENISA, OWASP, and NIST.*
