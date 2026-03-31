# GDPR Reference — Security, Operations & Architecture

Load this file when you need implementation detail on:
encryption, password hashing, secrets management, anonymization/pseudonymization,
cloud/DevOps practices, CI/CD controls, incident response, architecture patterns.

---

## Encryption

### At-Rest Encryption

| Data sensitivity | Minimum standard |
|---|---|
| Standard personal data (name, address, email) | AES-256 disk/volume encryption (cloud provider default) |
| Sensitive personal data (health, biometric, financial, national ID) | AES-256 **column-level** encryption + envelope encryption via KMS |
| Encryption keys | HSM-backed KMS (Azure Key Vault Premium / AWS KMS CMK / GCP Cloud KMS) |

**Envelope encryption pattern:**
1. Encrypt data with a **Data Encryption Key (DEK)** (AES-256, generated per record or per table).
2. Encrypt the DEK with a **Key Encryption Key (KEK)** stored in the KMS.
3. Store the encrypted DEK alongside the encrypted data.
4. Deleting the KEK = effective crypto-shredding of all data encrypted with it.

### In-Transit Encryption

- **MUST** enforce TLS 1.2 minimum; prefer TLS 1.3.
- **MUST** set `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
- **MUST NOT** allow TLS 1.0, TLS 1.1, null cipher suites, or export-grade ciphers.
- **MUST NOT** use self-signed certificates in production.

### Key Management

- Rotate DEKs annually minimum; rotate immediately upon suspected compromise.
- Use separate key namespaces per environment (dev / staging / prod).
- Log all KMS key access events — alert on anomalous access patterns.
- MUST NOT hardcode encryption keys in source code or configuration files.

---

## Password Hashing

| Algorithm | Parameters | Notes |
|---|---|---|
| **Argon2id**  recommended | memory ≥ 64 MB, iterations ≥ 3, parallelism ≥ 4 | OWASP and NIST recommended |
| **bcrypt**  acceptable | cost factor ≥ 12 | Widely supported; use if Argon2id unavailable |
| **scrypt**  acceptable | N=32768, r=8, p=1 | Good alternative |
| MD5  | — | Never — trivially broken |
| SHA-1 / SHA-256  | — | Never for passwords — not designed for this purpose |

**MUST**
- Use a unique salt per password (built into all three algorithms above).
- Store only the hash — never the plaintext, never a reversible encoding.
- Re-hash on login if the stored hash uses an outdated algorithm — upgrade transparently.

**SHOULD**
- Add a **pepper** (server-side secret added before hashing) stored in the KMS, not in the DB.
- Check passwords against known breach lists at registration (`haveibeenpwned` API, k-anonymity mode).
- Enforce minimum password length of 12 characters.

**MUST NOT**
- Log passwords in any form — not during registration, not during failed login.
- Transmit passwords in URLs or query strings.
- Store password reset tokens in plaintext — hash them before storage.

---

## Secrets Management

**MUST**
- Store all secrets in a dedicated secret manager: Azure Key Vault, AWS Secrets Manager,
  GCP Secret Manager, or HashiCorp Vault.
- Use pre-commit hooks to prevent secret commits: `gitleaks`, `detect-secrets`, GitHub native secret scanning.
- Rotate secrets immediately upon: developer offboarding, suspected compromise, annual schedule.
- Maintain a **secrets inventory document** — every secret listed with its purpose and rotation date.

**SHOULD**
- Use **short-lived credentials** via OIDC federation (GitHub Actions → Azure/AWS/GCP) instead of long-lived API keys.
- Audit all KMS secret access — alert on access outside business hours or from unexpected sources.
- Use separate secret namespaces per environment.

**`.gitignore` MUST include:**
```
.env
.env.*
*.pem
*.key
*.pfx
*.p12
secrets/
appsettings.*.json   # if it may contain connection strings
```

**MUST NOT**
- Commit secrets to source code repositories.
- Pass secrets as plain-text CLI arguments (they appear in process lists and shell history).
- Store secrets as unencrypted environment variable defaults in code.

---

## Anonymization & Pseudonymization

### Definitions

| Term | Reversible? | GDPR scope? | Use case |
|---|---|---|---|
| **Anonymization** | No | Outside GDPR scope | Retained records after erasure, analytics datasets |
| **Pseudonymization** | Yes (with key) | Still personal data | Analytics pipelines, audit logs, reduced-risk processing |

### Anonymization Techniques

| Technique | How | When |
|---|---|---|
| Suppression | Remove the field entirely | Fields with no analytical value |
| Masking | Replace with fixed placeholder (`"ANONYMIZED_USER"`) | Audit log identifiers after erasure |
| Generalization | Replace exact value with a range (age 34 → "30–40") | Analytics |
| Noise addition | Add statistical noise to numerical values | Aggregate analytics |
| Aggregation | Report group statistics, never individual values | Reporting |
| K-anonymity | Ensure each record is indistinguishable from k-1 others | Analytics datasets |

### Pseudonymization Techniques

| Technique | How |
|---|---|
| HMAC-SHA256 with secret key | Consistent, one-way, keyed. Use for user IDs in analytics. Key in KMS. |
| Tokenization | Replace value with opaque token; mapping in separate secure vault. |
| Encryption with separate key | Decrypt only with explicit KMS authorization. |

**MUST**
- When erasing a user, **anonymize** records that must be retained (financial, audit logs) — replace identifying fields with `"ANONYMIZED"` or a hashed placeholder.
- Store the pseudonymization key in the KMS — never in the same database as the pseudonymized data.
- Test anonymization routines with assertions: the original value MUST NOT be recoverable from the output.

**Crypto-shredding pattern (event sourcing):**
Encrypt personal data in events with a per-user DEK. Store the DEK in the KMS.
On erasure: delete the DEK from the KMS → all events for that user are effectively anonymized.

**MUST NOT**
- Call data "anonymized" if re-identification is possible through linkage with other datasets.
- Apply pseudonymization and store the mapping key in the same table as the pseudonymized data.

---

## Cloud & DevOps Practices

**MUST**
- Enable encryption at rest for all cloud storage: blobs, managed databases, queues, caches.
- Use **private endpoints** — databases MUST NOT be publicly accessible.
- Apply network security groups / firewall rules: restrict DB access to application layers only.
- Enable cloud-native audit logging: Azure Monitor / AWS CloudTrail / GCP Cloud Audit Logs.
- Store personal data only in **approved geographic regions** (EEA, or adequacy decision / SCCs).
- Tag all cloud resources processing personal data with a `DataClassification` tag.

**SHOULD**
- Enable Microsoft Defender for Cloud / AWS Security Hub / GCP SCC — review recommendations weekly.
- Use **managed identities** (Azure) or **IAM roles** (AWS/GCP) instead of long-lived access keys.
- Enable soft delete and versioning on object storage.
- Apply DLP policies on cloud storage to detect PII written to unprotected buckets.
- Enable database-level audit logging for SELECT on sensitive tables.

**MUST NOT**
- Store personal data in public storage buckets without access controls.
- Deploy databases with public IPs in production.
- Use the same cloud account/subscription for production and non-production if data could bleed across.

---

## CI/CD Controls

**MUST**
- Run **secret scanning** on every commit: `gitleaks`, `detect-secrets`, GitHub secret scanning.
- Run **dependency vulnerability scanning** on every build: `npm audit`, `dotnet list package --vulnerable`, `trivy`, `snyk`.
- MUST NOT use real personal data in CI test jobs.
- MUST NOT log environment variables in CI pipelines — mask all secrets.

**SHOULD**
- Run **SAST**: SonarQube, Semgrep, or CodeQL on every PR.
- Run **container image scanning**: `trivy`, Snyk Container, or AWS ECR scanning.
- Add a **GDPR compliance gate** to the pipeline:
  - New migrations without a documented retention period → fail.
  - Log statements containing known PII field names → warn.

**Pipeline secret rules:**
```yaml
# MUST: mask secrets before use
- name: Mask secret
  run: echo "::add-mask::${{ secrets.MY_SECRET }}"

# MUST NOT: echo secrets to console
- run: echo "Key=$API_KEY"   # Never

# SHOULD: use OIDC federation (no long-lived keys)
- uses: azure/login@v1
  with:
    client-id: ${{ vars.AZURE_CLIENT_ID }}
    tenant-id: ${{ vars.AZURE_TENANT_ID }}
    subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```

---

## Incident & Breach Handling

### Regulatory Timeline

| Window | Obligation |
|---|---|
| **72 hours** from awareness | Notify the supervisory authority (CNIL, APD, ICO…) — unless breach is unlikely to risk individuals |
| **Without undue delay** | Notify affected data subjects if breach is likely to result in **high risk** to their rights |

Log **all** personal data breaches internally — even those that do not require DPA notification.

### Breach Response Runbook (template)

1. **Detection** — Define criteria: what triggers an incident (credential leak, DB dump exposed, ransomware, accidental public bucket).
2. **Severity classification** — Low / Medium / High / Critical based on data sensitivity and volume.
3. **Containment** — Revoke compromised credentials; isolate affected systems; preserve evidence (do NOT delete logs).
4. **Assessment** — What data was exposed? How many subjects? What is the risk level?
5. **DPA notification** — Use the supervisory authority's online portal; include: nature of breach, categories and approximate number of data subjects, categories and approximate number of records, contact point, likely consequences, measures taken.
6. **Data subject notification** — If high risk: clear language, nature of breach, likely consequences, measures taken, DPO contact.
7. **Post-incident review** — Root cause analysis; corrective measures; update runbook.

### Automated Breach Detection Alerts

Configure alerts for:
- Unusual volume of data exports (threshold per hour)
- Access to sensitive tables outside business hours
- Bulk deletion events
- Failed authentication spikes
- New credentials appearing in public breach databases (HaveIBeenPwned monitoring)

Store breach records internally for at least **5 years**.

---

## Architecture Patterns

### Data Store Separation
Separate operational data (transactional DB) from analytical data (data warehouse).
Apply different retention periods and access controls to each.
The analytics store MUST NOT read directly from production operational tables.

### Dedicated Consent Store
Track consent as an immutable event log in a separate store, not a boolean column on the user table.
This enables: auditable consent history, version tracking, easy withdrawal without data loss.

### Audit Log Segregation
Store audit logs in a separate, append-only store.
The application service account MUST NOT be able to delete audit log entries.
Use a separate DB user with INSERT-only rights on the audit table.

### DSR Queue Pattern
Implement Data Subject Requests as an asynchronous workflow:
`POST /api/v1/me/erasure-request` → enqueue a job → worker scrubs all stores → notify user on completion.
This handles the complexity of multi-store scrubbing reliably and provides a retry mechanism.

### Pseudonymization Gateway
For analytics pipelines, implement a pseudonymization service at the boundary between
operational and analytical systems.
The mapping key (HMAC secret or tokenization vault) never leaves the operational zone.
The analytics zone receives only pseudonymized identifiers.

### Crypto-Shredding (Event Sourcing)
Encrypt personal data in events with a per-user DEK stored in the KMS.
On user erasure: delete the DEK → all historical events for that user are effectively anonymized
without modifying the event log.
