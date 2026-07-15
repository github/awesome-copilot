# Analysis Principles — Security Analysis Methodology

This file contains ALL rules for how to analyze code for security threats. It is self-contained — everything needed to perform correct, evidence-based security analysis is here.

---

## ⛔ CRITICAL: Verify Before Flagging

**NEVER flag a security gap without confirming it exists.** Many platforms have secure defaults.

### Three-Step Verification

1. **Check for security infrastructure components** before claiming security is missing:
   - Certificate authorities (Dapr Sentry, cert-manager, Vault)
   - Service mesh control planes (Istio, Linkerd, Dapr)
   - Policy engines (OPA, Kyverno, Gatekeeper)
   - Secret managers (Vault, Azure Key Vault, AWS Secrets Manager)
   - Identity providers (MISE, OAuth proxies, OIDC)

2. **Understand platform defaults** — research before assuming:
   - Dapr: mTLS enabled by default when Sentry is deployed
   - Kubernetes: RBAC enabled by default since v1.6
   - Istio: mTLS in PERMISSIVE mode by default, STRICT available
   - Azure: Many services encrypted at rest by default

3. **Distinguish configuration states**:
   - **Explicitly disabled**: `enabled: false` → Flag as finding
   - **Not configured**: No setting present → Check platform default first
   - **Implicitly enabled**: Default behavior is secure → Document as control, not gap

### Evidence Quality Requirements

For every finding:
- Show the specific config/code that proves the gap (not just absence of config)
- For "missing security" claims, prove the default is insecure
- Cross-reference with platform documentation when uncertain

---

## Security Infrastructure Inventory

Before STRIDE-A analysis, identify ALL security-enabling components present in the codebase:

| Category | Components to Look For | Security They Provide |
|----------|----------------------|----------------------|
| Service Mesh | Dapr, Istio, Linkerd, Consul Connect | mTLS, traffic policies, observability |
| Certificate Management | Sentry, cert-manager, Vault PKI | Automatic cert issuance/rotation |
| Authentication | MISE, OAuth2-proxy, Dex, Keycloak | Token validation, SSO |
| Authorization | OPA, Kyverno, Gatekeeper, RBAC | Policy enforcement |
| Secrets | Vault, External Secrets, CSI drivers | Secret injection, rotation |
| Network | NetworkPolicy, Calico, Cilium | Microsegmentation |

**If these components exist, their security features are likely active unless explicitly disabled.**

---

## Security Analysis Lenses

Apply these frameworks during analysis:

- **Zero Trust**: Verify explicitly, least privilege, assume breach
- **Defense in Depth**: Identify missing security layers
- **Abuse Cases**: Business logic abuse, workflow manipulation, feature misuse

---

## Comprehensive Coverage Requirements

**Do NOT truncate analysis for larger codebases.** All components must receive equal analytical depth.

### Sidecar Security Analysis

⚠️ **Sidecars (Dapr, MISE, Envoy, etc.) are NOT separate components in the DFD** — they are co-located in the same pod as the primary container (see diagram-conventions.md Rule 2). However, sidecar communication MUST still be analyzed for security vulnerabilities.

**How to analyze sidecar threats:**
- Sidecars with distinct threat surfaces (e.g., MISE auth bypass, Dapr mTLS) get their own `## Component` section in `2-stride-analysis.md` — but are NOT separate DFD nodes (see diagram-conventions.md Rule 2)
- Use the format: threat title includes the sidecar name, e.g., "Dapr Sidecar Plaintext Communication"
- Common sidecar threats:
  - **Information Disclosure (I):** Dapr/MISE sidecar communicating with main container over plaintext HTTP within the pod
  - **Tampering (T):** Dapr pub/sub messages not signed or encrypted
  - **Spoofing (S):** MISE token validation bypass if sidecar is compromised
  - **Elevation of Privilege (E):** Sidecar running with elevated privileges that the main container doesn't need
- CWE mapping: CWE-319 (Cleartext Transmission), CWE-311 (Missing Encryption), CWE-250 (Unnecessary Privileges)
- These threats appear in the sidecar's own STRIDE section (if it has a distinct threat surface) or under the primary component's table (if the sidecar is a simple infrastructure proxy)
- If the sidecar vulnerability warrants a finding, list it under the sidecar component with a note: "Affects [Dapr/MISE] sidecar communication"

1. **Minimum coverage:** Every component in `0.1-architecture.md` MUST have a corresponding section in `2-stride-analysis.md` with actual threat enumeration (not just "no threats found").
2. **Finding density check:** As a guideline, expect roughly 1 finding per 2-3 significant components. If a repo has 15+ components and you have fewer than 8 findings, re-examine under-analyzed components.
3. **Use sub-agents for scale:** For repos with 10+ components, delegate component-specific STRIDE analysis to sub-agents to maintain depth. Each sub-agent should analyze 3-5 components.
4. **OWASP checklist sweep:** After component-level STRIDE, do a cross-cutting pass using the OWASP Top 10:2025 checklist below. This catches systemic issues (missing auth, no audit logging, no rate limiting, unsigned images) that component-level analysis may miss.
5. **Infrastructure-layer check:** Explicitly check for: container security contexts, network policies, resource limits, image signing, secrets management, backup/DR controls, and monitoring/alerting gaps.
6. **Exhaustive findings consolidation:** After STRIDE analysis is complete, scan the STRIDE output for ALL identified threats. Every threat MUST map to either:
   - A finding in `3-findings.md` (consolidated with related threats)
   - A `🔄 Mitigated by Platform` entry in the Threat Coverage Verification table (for platform-handled threats only)
   
   **⛔ EVERY `Open` THREAT MUST HAVE A FINDING.** The tool does NOT have authority to accept risks, defer threats, or decide that a threat is "acceptable." That is the engineering team's decision. The tool's job is to identify ALL threats and create findings for them. The Coverage table should show `✅ Covered (FIND-XX)` for every Open threat — NEVER `⚠️ Accepted Risk`.

   If you have 40+ threats in STRIDE but only 10 findings, you are under-consolidating. Check for missed data store auth, operational controls, credential management, and supply chain issues.

   **⛔ "ACCEPTED RISK" IS FORBIDDEN (MANDATORY):**
   - **NEVER use `⚠️ Accepted Risk` as a Coverage table status.** This label implies the tool has accepted a risk on behalf of the engineering team. It has not. It cannot.
   - **NEVER use `Accepted` as a STRIDE Status value.** Use `Open`, `Mitigated`, or `Platform` only.
   - If you are tempted to write "Accepted Risk" → create a finding instead. The finding's remediation section tells the team what to do. The team decides whether to accept, fix, or defer.

   **⛔ NEEDS REVIEW RESTRICTIONS (MANDATORY):**
   - **Tier 1 threats (prerequisites = `None`) MUST NEVER be classified as "⚠️ Needs Review."** A threat exploitable by an unauthenticated external attacker cannot be deferred — it MUST become a finding.
   - **If a threat has a mitigation listed in the STRIDE analysis, it SHOULD become a finding.** The mitigation text is the remediation — use it to write the finding. Only defer to "Needs Review" if the mitigation is genuinely not actionable.
   - **DoS threats with `None` prerequisites are Tier 1 findings**, not hardening opportunities. An unauthenticated attacker flooding an API with no rate limiting is a directly exploitable vulnerability (CWE-770, CWE-400).
   - **Do NOT batch-classify entire STRIDE categories as Needs Review.** Each threat must be evaluated individually based on its prerequisites and exploitability.
   - **"⚠️ Needs Review" is reserved for:** Tier 2/3 threats where no technical mitigation is possible (e.g., social engineering), or threats requiring business context the tool doesn't have.
   - **The automated analysis does NOT have authority to accept risks** — it only identifies them. "Needs Review" signals that a human must decide.
   - **Maximum Needs Review ratio:** If more than 30% of threats are classified as "Needs Review", re-examine — you are likely under-reporting findings. Typical ratio: 10-20% for a well-analyzed codebase.
7. **Minimum finding thresholds by repo size:**
   - Small repo (< 20 source files): 8+ findings expected
   - Medium repo (20-100 source files): 12+ findings expected
   - Large repo (100+ source files): 18+ findings expected
   
   If below threshold, systematically review: auth per component, secrets in code, container security, network segmentation, logging/monitoring, input validation.

8. **Context-aware Platform ratio limits (MANDATORY):**
   
   After completing the security infrastructure inventory (Step 1), detect the deployment pattern:
   
   | Pattern | Detection Signal | Platform Limit |
   |---------|-----------------|----------------|
   | **K8s Operator** | `controller-runtime`, `kubebuilder`, or `operator-sdk` in go.mod/go.sum; `Reconcile()` functions in source | **≤35%** |
   | **Standalone Application** | All other repos (web apps, CLI tools, services) | **≤20%** |
   
   **Why K8s operators have higher Platform ratios:** Operators delegate security to the K8s platform (RBAC for CR access, etcd encryption, API server TLS, webhook cert validation, Azure AD token validation). The operator code CANNOT implement these controls — they are the platform's responsibility. Classifying them as Platform is correct.
   
   **Action when Platform exceeds limit:**
   - Review each Platform-classified threat
   - If the operator CAN take action (e.g., add input validation, add RBAC checks at startup) → reclassify as `Open` with a finding
   - If the operator genuinely cannot act (e.g., etcd encryption is a cluster admin concern) → Platform is correct
   - Document the detected pattern and ratio in `0-assessment.md` → Analysis Context & Assumptions

---

## Technology-Specific Security Checklist

**After completing STRIDE analysis**, scan the codebase for each technology below. For every technology found, verify the corresponding security checks are covered in findings or documented as mitigated. This catches specific vulnerabilities that component-level STRIDE often misses.

| Technology Found | MUST Check For | Common Finding |
|-----------------|---------------|----------------|
| **Redis** | `requirepass` disabled, no TLS, no ACL | Auth disabled by default → finding |
| **Milvus** | `authorizationEnabled: false`, no TLS, public gRPC port | Auth disabled by default → finding |
| **PostgreSQL/SQL DB** | Superuser usage, `ssl=false`, SQL injection, connection string credentials | Input validation + auth |
| **MongoDB** | Auth disabled, no TLS, `--noauth` flag | Auth disabled by default |
| **NGINX/Ingress** | Missing TLS, server_info headers, snippet injection, rate limiting | Config hardening |
| **Docker/Containers** | Running as root, no `USER` directive, host mounts, no seccomp/AppArmor, unsigned images | Container hardening |
| **ML/AI Models** | Unauthenticated inference endpoint, model poisoning, prompt injection, no input validation | Endpoint auth + input validation |
| **LLM/Cloud AI** | PII/secrets sent to external LLM, no content filtering, prompt injection, data exfiltration | Data exposure to cloud |
| **Kubernetes** | No NetworkPolicy, no PodSecurityPolicy/Standards, no resource limits, RBAC gaps | Network segmentation + resource limits |
| **Helm Charts** | Hardcoded secrets in values.yaml, no image tag pinning, no security contexts | Config + supply chain |
| **Key Management** | Hardcoded RSA/HMAC keys, weak key generation, no rotation, keys in source | Cryptographic failures |
| **CI/CD Pipelines** | Secrets in logs, no artifact signing, mutable dependencies, script injection | Supply chain |
| **REST APIs** | Missing auth, no rate limiting, verbose errors, no input validation | Auth + injection |
| **gRPC Services** | No TLS, no auth interceptor, reflection enabled in production | Auth + encryption |
| **Message Queues** | No auth on pub/sub, no encryption, no message signing | Auth + integrity |
| **NFS/File Shares** | Path traversal, no access control, world-readable mounts | Access control |
| **Audit/Logging** | No security event logging, log injection, no tamper protection | Monitoring gaps |

**Process:** After writing 3-findings.md, scan this table for technologies present in the repo. For each technology, evaluate its common technology-specific threat patterns based on how that technology is actually used, and ensure any relevant risks are accounted for in the assessment. Add a finding only if an actual threat or meaningful mitigation gap is identified.

---

## OWASP Top 10:2025 Checklist

Check for these vulnerability categories during analysis:

| ID | Category | Check For |
|----|----------|----------|
| A01 | Broken Access Control | Missing authZ, privilege escalation, IDOR, CORS misconfig |
| A02 | Security Misconfiguration | Default creds, verbose errors, unnecessary features, missing hardening |
| A03 | Software Supply Chain Failures | Vulnerable dependencies, malicious packages, compromised CI/CD |
| A04 | Cryptographic Failures | Weak algorithms, exposed secrets, improper key management, plaintext data |
| A05 | Injection | SQL, NoSQL, OS command, LDAP, XSS, template injection |
| A06 | Insecure Design | Missing security controls at architecture level, threat modeling gaps |
| A07 | Authentication Failures | Broken auth, weak sessions, credential stuffing, missing MFA |
| A08 | Software/Data Integrity Failures | Insecure deserialization, unsigned updates, CI/CD tampering |
| A09 | Security Logging & Alerting Failures | Missing audit logs, no alerting, log injection, insufficient monitoring |
| A10 | Mishandling of Exceptional Conditions | Poor error handling, race conditions, resource exhaustion |

Reference: https://owasp.org/Top10/2025/

---

## Platform Security Defaults Reference

Before flagging missing security, check these common secure-by-default behaviors:

| Platform | Feature | Default Behavior | How to Verify |
|----------|---------|------------------|---------------|
| **Dapr** | mTLS | Enabled when Sentry deployed | Check for `dapr_sentry` or `sentry` component |
| **Dapr** | Access Control | Deny if policies defined | Look for `accessControl` in Configuration |
| **Kubernetes** | RBAC | Enabled since v1.6 | Check `--authorization-mode` includes RBAC |
| **Kubernetes** | Secrets | Base64 encoded (not encrypted) | Check for encryption provider config |
| **Istio** | mTLS | PERMISSIVE by default | Check PeerAuthentication resources |
| **Azure Storage** | Encryption at rest | Enabled by default | Always encrypted, check key management |
| **Azure SQL** | TDE | Enabled by default | Transparent data encryption on |
| **PostgreSQL** | SSL | Often disabled by default | Check `ssl` parameter |
| **Redis** | Auth | Disabled by default | Check `requirepass` configuration |
| **Milvus** | Auth | Disabled by default | Check `authorizationEnabled` |
| **NGINX Ingress** | TLS | Not enabled by default | Check for TLS secret in Ingress |
| **Docker** | User | Root by default | Check `USER` in Dockerfile |

**Key insight**: Service meshes (Dapr, Istio, Linkerd) typically enable mTLS automatically. Databases (Redis, Milvus, MongoDB) typically have auth disabled by default.

---

## Exploitability Tiers

Threats are classified into three exploitability tiers based on prerequisites:

| Tier | Label | Prerequisites | Assignment Rule |
|------|-------|---------------|----------------|
| **Tier 1** | Direct Exposure | `None` | Exploitable by unauthenticated external attacker with NO prior access. |
| **Tier 2** | Conditional Risk | Single prerequisite | Requires exactly ONE form of access: `Authenticated User`, `Privileged User`, `Internal Network`, or single `{Boundary} Access`. |
| **Tier 3** | Defense-in-Depth | Multiple prerequisites or infrastructure access | Requires `Host/OS Access`, `Admin Credentials`, `{Component} Compromise`, `Physical Access`, or multiple prerequisites with `+`. |

### Tier Assignment Rules

**⛔ CANONICAL PREREQUISITE → TIER MAPPING (deterministic, no exceptions):**

Prerequisites MUST use only these values (closed enum). The tier follows mechanically:

| Prerequisite | Tier | Rationale |
|-------------|------|----------|
| `None` | **Tier 1** | Unauthenticated external attacker, no prior access |
| `Authenticated User` | **Tier 2** | Requires valid credentials |
| `Privileged User` | **Tier 2** | Requires admin/operator role |
| `Internal Network` | **Tier 2** | Requires position on internal network |
| `Local Process Access` | **Tier 2** | Requires code execution on same host (localhost listener, IPC) |
| `Host/OS Access` | **Tier 3** | Requires filesystem, console, or debug access to the host |
| `Admin Credentials` | **Tier 3** | Requires admin credentials + host access |
| `Physical Access` | **Tier 3** | Requires physical presence (USB, serial) |
| `{Component} Compromise` | **Tier 3** | Requires prior compromise of another component |
| Any `A + B` combination | **Tier 3** | Multiple prerequisites = always Tier 3 |

**⛔ FORBIDDEN prerequisite values:** `Application Access`, `Host Access` (ambiguous — use `Local Process Access` or `Host/OS Access`).

**Deployment context overrides:** If Deployment Classification is `LOCALHOST_DESKTOP` or `LOCALHOST_SERVICE`, the prerequisite `None` is FORBIDDEN for all components — use `Local Process Access` or `Host/OS Access` instead. The tier then follows from the corrected prerequisite.

### ⛔ Prerequisite Determination (MANDATORY — Evidence-Based, Not Judgment-Based)

**Prerequisites MUST be determined from deployment configuration evidence, not from general knowledge or assumptions.** Two independent analysis runs on the same code MUST assign the same prerequisites because they are objective facts about the deployment.

**Generic Decision Procedure (applies to ALL environments):**

1. **Network Exposure Check — Is the component reachable from outside?**
   - Look for evidence of external exposure in the codebase:
     - API gateway / reverse proxy routes pointing to the component
     - Firewall rules or security group configurations
     - Load balancer configurations
     - DNS records or public endpoint definitions
   - If ANY external route exists → prerequisites = `None` for network-based threats
   - If NO external route exists AND the component is on an internal-only network → prerequisites = `Internal Network`

2. **Authentication Check — Does the endpoint require credentials?**
   - Look for authentication middleware, decorators, or filters in the component's code:
     - `@require_auth`, `[Authorize]`, `@login_required`, auth middleware in Express/FastAPI
     - API key validation in request handlers
     - OAuth/OIDC token validation
     - mTLS certificate requirements
   - If auth is ENFORCED on all endpoints → prerequisite = `Authenticated User`
   - If auth is OPTIONAL or DISABLED by config flag → prerequisite = `None` (disabled auth = no barrier)
   - If auth exists but has bypass routes (e.g., `/health`, `/metrics` without auth) → those specific routes have prerequisite = `None`

3. **Authorization Check — What level of access is required?**
   - If no RBAC/role check beyond authentication → prerequisite stays `Authenticated User`
   - If admin/operator role required → prerequisite = `Privileged User`
   - If specific permissions required → prerequisite names the permission (e.g., `ClusterAdmin Role`)

4. **Physical/Local Access Check:**
   - If the component only listens on `localhost`/`127.0.0.1` → prerequisite = `Local Process Access` (T2)
   - If access requires console/SSH/filesystem → prerequisite = `Host/OS Access` (T3)
   - If access requires physical presence (USB, serial port) → prerequisite = `Physical Access` (T3)
   - If component has no listener (console app, library, outbound-only) → prerequisite = `Host/OS Access` (T3)

5. **Default Rule:** If you cannot determine exposure from config → look up the component's `Min Prerequisite` in the Component Exposure Table. If the table is not yet filled, assume `Local Process Access` (T2) as a safe default for unknown components. **NEVER assume `None` without positive evidence of external reachability.** **NEVER assume `Internal Network` without evidence of network restriction.**

**Platform-Specific Evidence Sources:**

| Platform | Where to check exposure | Internal indicator | External indicator |
|----------|------------------------|--------------------|--------------------|
| **Kubernetes** | Service type, Ingress rules, values.yaml | `ClusterIP` service, no Ingress | `LoadBalancer`/`NodePort`, Ingress path exists |
| **Docker Compose** | `ports:` mapping, network config | No `ports:` mapping, internal network only | `ports: "8080:8080"` maps to host |
| **Azure App Service** | App settings, access restrictions | VNet integration, private endpoint | Public URL, no IP restrictions |
| **VM / Bare Metal** | Firewall rules, NSG, iptables | Port blocked in firewall/NSG | Port open, public IP bound |
| **Serverless (Functions)** | Function auth level, API Management | `authLevel: function/admin` | `authLevel: anonymous` |
| **.NET / Java / Node** | Startup config, middleware pipeline | `app.UseAuthentication()` enforced | No auth middleware, or auth disabled |
| **Python (FastAPI/Flask)** | Middleware, dependency injection | `Depends(get_current_user)` on routes | No auth dependency, open routes |

**⛔ NEVER assign prerequisites based on "what seems reasonable" or architecture assumptions.** Check the actual deployment config. The same component MUST get the same prerequisite across runs because the config doesn't change between runs.

**Common violations:**
- Assigning `Internal Network` to a component that has an ingress route → hides real external exposure
- Assuming databases are "internal only" without checking if they have a public endpoint or ingress route
- Assuming ML model servers are "internal" when they may be exposed for direct inference requests

### CVSS-to-Tier Consistency Check (MANDATORY)

**After assigning CVSS vectors AND tiers, cross-check for contradictions:**

| CVSS Metric | Value | Tier Implication |
|-------------|-------|------------------|
| `AV:L` (Attack Vector: Local) | Requires local access | **Cannot be Tier 1** — must be T2 or T3 |
| `AV:A` (Attack Vector: Adjacent) | Requires adjacent network | **Cannot be Tier 1** — must be T2 or T3 |
| `AV:P` (Attack Vector: Physical) | Requires physical access | **Must be Tier 3** |
| `PR:H` (Privileges Required: High) | Requires admin/privileged access | **Cannot be Tier 1** — must be T2 or T3 |
| `PR:L` (Privileges Required: Low) | Requires authenticated user | **Cannot be Tier 1** — must be T2 |
| `PR:N` + `AV:N` | No privileges, network accessible | Tier 1 candidate (confirm no deployment override) |

⚠️ **If a finding has `AV:L` and `Tier 1`, this is ALWAYS an error.** Fix by either:
- Changing the tier to T2/T3 (correct approach for localhost-only services), OR
- Changing the CVSS AV to `AV:N` if the service is actually network-accessible (rare)

⚠️ **If a finding has `PR:H` and `Tier 1`, this is ALWAYS an error.** Admin-required findings are T2 minimum.

### Deployment Context Affects Tier Classification

**CRITICAL: This section OVERRIDES the default tier rules above when specific deployment conditions apply.**

Before assigning tiers, determine the system's deployment model from code, docs, and architecture. Record the **Deployment Classification** and **Component Exposure Table** in `0.1-architecture.md` (see `skeleton-architecture.md`).

**Deployment Classifications and their tier implications:**

| Classification | Description | T1 Allowed? | Min Prerequisite |
|----------------|-------------|-------------|------------------|
| `LOCALHOST_DESKTOP` | Console/GUI app, no network listeners (or localhost-only), single-user workstation | ❌ **NO** — all findings T2+ | `Host/OS Access` (T3) or `Local Process Access` (T2) |
| `LOCALHOST_SERVICE` | Daemon/service binding to 127.0.0.1 only | ❌ **NO** — all findings T2+ | `Local Process Access` (T2) |
| `AIRGAPPED` | No internet connectivity | ❌ for network-originated attacks | `Internal Network` |
| `K8S_SERVICE` | Kubernetes Deployment with ClusterIP/LoadBalancer | ✅ YES | Depends on Service type |
| `NETWORK_SERVICE` | Public API, cloud endpoint, internet-facing | ✅ YES | `None` (if no auth) |

**The Component Exposure Table in `0.1-architecture.md` sets the prerequisite floor per component.** No threat or finding may have a lower prerequisite than the table permits. This table is filled in Step 1 and is binding on all subsequent analysis steps.

**Legacy override table (still applies as fallback):**

| Deployment Indicator | Tier Override Rule |
|---------------------|-------------------|
| Binds to `localhost`/`127.0.0.1` only | Cannot be T1 — requires local access (T2 minimum) |
| Air-gapped / no internet | Downgrade network-based attacks by one tier |
| Single-admin workstation tool | Cannot be T1 unless exploitable by a non-admin local user |
| Docker/container on single machine | Docker socket access = T2 (local admin required) |
| Named pipe / Unix socket | Cannot be T1 — requires local process access |

**How to apply:**
1. In Step 1 (context gathering), identify deployment model and record in 0.1-architecture.md
2. In Step 6/7 (finding verification), check each T1 candidate against the table above
3. If ANY override applies, downgrade to T2 (or T3 if multiple)
4. Document the override rationale in the finding’s Description

**Example:** Kusto container on air-gapped workstation, listening on port 80 without auth:
- Default classification: T1 (unauthenticated, port 80)
- Override: localhost-only + single-admin → **T2** (attacker needs local access to an admin workstation)

**Do NOT override** for:
- Kubernetes services (any pod can reach them → lateral movement is realistic → keep T1)
- Network-exposed APIs (any network user can reach them → keep T1)
- Cloud endpoints (public internet → keep T1)
- **Network-exposed APIs**: An unauthenticated API on a listening port IS Tier 1.

The prerequisite for Tier 1 is `None` — meaning an **unauthenticated external attacker** with no prior access. If exploiting a vulnerability requires local admin access, OS-level access, or physical presence, it cannot be Tier 1.

---

## Finding Classification

Before documenting each finding, verify:

- [ ] **Positive evidence exists**: Can you show config/code that proves the vulnerability?
- [ ] **Not a secure default**: Have you checked if the platform enables security by default?
- [ ] **Security infrastructure checked**: Did you look for Sentry/cert-manager/Vault/etc.?
- [ ] **Explicit vs implicit**: Is security explicitly disabled, or just not explicitly enabled?
- [ ] **Platform documentation consulted**: When uncertain, verify against official docs

**Classification outcomes:**
- **Confirmed**: Positive evidence of vulnerability → Document as finding in `3-findings.md`
- **Needs Verification**: Unable to confirm but potential risk → Add to "Needs Verification" in `0-assessment.md`
- **Not a Finding**: Confirmed secure by default or explicitly enabled → Do not document

---

## Severity Standards

### SDL Bugbar Severity
Classify each finding per: https://www.microsoft.com/en-us/msrc/sdlbugbar

### CVSS 4.0 Score
Use CVSS v4.0 Base score (0.0-10.0) with vector string.
Reference: https://www.first.org/cvss/v4.0/specification-document

### CWE
Assign Common Weakness Enumeration ID and name.
Reference: https://cwe.mitre.org/

### OWASP
Map to OWASP Top 10:2025 category if applicable (A01-A10).
**ALWAYS use `:2025` suffix** (e.g., `A01:2025`), never `:2021`.
Reference: https://owasp.org/Top10/2025/

### Remediation Effort
- **Low**: Configuration change, flag toggle, or single-file fix
- **Medium**: Multi-file code change, new validation logic, or dependency update
- **High**: Architecture change, new component, or cross-team coordination

### STRIDE Scope Rule
- **External services** (AzureOpenAI, AzureAD, Redis, PostgreSQL) **DO get** STRIDE sections — they are attack surfaces from your system's perspective
- **External actors** (Operator, EndUser) **do NOT get** STRIDE sections — they are threat sources, not targets
- If you have 20 elements and 2 are external actors, you write 18 STRIDE sections

**⚠️ DO NOT include time estimates.** Never add "(hours)", "(days)", "(weeks)", "~1 hour", "~2 hours", or any duration/effort-to-fix estimates anywhere in the output. The effort level (Low/Medium/High) is sufficient.

### Mitigation Type (OWASP-aligned)
- **Redesign**: Eliminate the threat by changing architecture (OWASP: Avoid)
- **Standard Mitigation**: Apply well-known, proven security controls (OWASP: Mitigate)
- **Custom Mitigation**: Implement a bespoke code fix specific to this system (OWASP: Mitigate)
- **Existing Control**: Team already built a control that addresses this threat — document it (OWASP: Fix)
- **Accept Risk**: Acknowledge and document the residual risk (requires justification) (OWASP: Accept)
- **Transfer Risk**: Shift responsibility to user/operator/third-party (e.g., configuration choice, SLA) (OWASP: Transfer)
