# Orchestrator — Threat Model Analysis Workflow

This file contains the complete orchestration logic for performing a threat model analysis.
It is the primary workflow document for the `/threat-model-analyst` skill.

## ⚡ Context Budget — Read Files Selectively

**Do NOT read all 10 skill files at session start.** Read only what each phase needs. This preserves context window for the actual codebase analysis.

**Phase 1 (context gathering):** Read this file (`orchestrator.md`) + `analysis-principles.md` + `tmt-element-taxonomy.md`
**Phase 2 (writing reports):** Read the relevant skeleton from `skeletons/` BEFORE writing each file. Read `output-formats.md` + `diagram-conventions.md` for rules — but use the skeleton as the structural template.
- Before `0.1-architecture.md`: read `skeletons/skeleton-architecture.md`
- Before `1.1-threatmodel.mmd`: read `skeletons/skeleton-dfd.md`
- Before `1-threatmodel.md`: read `skeletons/skeleton-threatmodel.md`
- Before `2-stride-analysis.md`: read `skeletons/skeleton-stride-analysis.md`
- Before `3-findings.md`: read `skeletons/skeleton-findings.md`
- Before `0-assessment.md`: read `skeletons/skeleton-assessment.md`
- Before `threat-inventory.json`: read `skeletons/skeleton-inventory.md`
- Before `incremental-comparison.html`: read `skeletons/skeleton-incremental-html.md`
**Phase 3 (verification):** Delegate to a sub-agent and include `verification-checklist.md` in the sub-agent prompt. The sub-agent reads the full checklist with a fresh context window — the parent agent does NOT need to read it.

**Key principle:** Sub-agents get fresh context windows. Delegate verification and JSON generation to sub-agents rather than keeping everything in the parent context.

---

## ✅ Mandatory Rules — READ BEFORE STARTING

These are the required behaviors for every threat model report. Follow each rule exactly:

1. Organize findings by **Exploitability Tier** (Tier 1/2/3), never by severity level
2. Split each component's STRIDE table into Tier 1, Tier 2, Tier 3 sub-sections
3. Include `Exploitability Tier` and `Remediation Effort` on every finding — both are MANDATORY
4. STRIDE summary table MUST include T1, T2, T3 columns
4b. **STRIDE + Abuse Cases categories are exactly:** **S**poofing, **T**ampering, **R**epudiation, **I**nformation Disclosure, **D**enial of Service, **E**levation of Privilege, **A**buse (business logic abuse, workflow manipulation, feature misuse — an extension to standard STRIDE covering misuse of legitimate features). The A is ALWAYS "Abuse" — NEVER "AI Safety", "Authorization", or any other interpretation. Authorization issues belong under E (Elevation of Privilege).
5. `.md` files: start with `# Heading` on line 1. The `create_file` tool writes raw content — no code fences
6. `.mmd` files: start with `%%{init:` on line 1. Raw Mermaid source, no fences
7. Section MUST be titled exactly `## Action Summary`. Include `### Quick Wins` subsection with Tier 1 low-effort findings table
8. K8s sidecars: annotate host container with `<br/>+ Sidecar` — never create separate sidecar nodes (see `diagram-conventions.md` Rule 1)
9. Intra-pod localhost flows are implicit — do NOT draw them in diagrams
10. Action Summary IS the recommendations — no separate `### Key Recommendations` section
11. Include `> **Note on threat counts:**` blockquote in Executive Summary
12. Every finding MUST have CVSS 4.0 (score AND full vector string), CWE (with hyperlink), and OWASP (`:2025` suffix)
13. OWASP suffix is always `:2025` (e.g., `A01:2025 – Broken Access Control`)
14. Include Threat Coverage Verification table at end of `3-findings.md` mapping every threat → finding
15. Every component in `0.1-architecture.md` MUST appear in `2-stride-analysis.md`
16. First 3 scenarios in `0.1-architecture.md` MUST have Mermaid sequence diagrams
17. `0-assessment.md` MUST include `## Analysis Context & Assumptions` with `### Needs Verification` and `### Finding Overrides` tables
18. `### Quick Wins` subsection is REQUIRED under Action Summary (include heading with note if none)
19. ALL 7 sections in `0-assessment.md` are MANDATORY: Report Files, Executive Summary, Action Summary, Analysis Context & Assumptions, References Consulted, Report Metadata, Classification Reference
20. **Deployment Classification is BINDING.** In `0.1-architecture.md`, set `Deployment Classification` and fill the Component Exposure Table. If classification is `LOCALHOST_DESKTOP` or `LOCALHOST_SERVICE`: zero T1 findings, zero `Prerequisites = None`, zero `AV:N` for non-listener components. See `analysis-principles.md` Deployment Context table.
21. Finding IDs MUST be sequential top-to-bottom: FIND-01, FIND-02, FIND-03... Renumber after sorting
22. CWE MUST include hyperlink: `[CWE-306](https://cwe.mitre.org/data/definitions/306.html): Missing Authentication`
23. After STRIDE, run the Technology-Specific Security Checklist in `analysis-principles.md`. Every technology in the repo needs at least one finding or documented mitigation
24. CVSS `AV:L` or `PR:H` → finding CANNOT be Tier 1. Downgrade to T2/T3. See CVSS-to-Tier Consistency Check in `analysis-principles.md`
25. Use only `Low`/`Medium`/`High` effort labels. NEVER generate time estimates, sprint phases, or scheduling. See Prohibited Content in `output-formats.md`
26. References Consulted: use the exact two-subsection format from `output-formats.md` — `### Security Standards` (3-column table with full URLs) and `### Component Documentation` (3-column table with URLs)
27. Report Metadata: include ALL fields from `output-formats.md` template — Model, Analysis Started, Analysis Completed, Duration. Run `Get-Date -Format "yyyy-MM-dd HH:mm:ss" -AsUTC` at Step 1 and before writing `0-assessment.md`
28. `## Summary` table in `2-stride-analysis.md` MUST appear at the TOP, immediately after `## Exploitability Tiers`, BEFORE individual component sections
29. Related Threats: every threat ID MUST be a hyperlink to `2-stride-analysis.md#component-anchor`. Format: `[T02.S](2-stride-analysis.md#component-name)`
30. Diagram colors: copy classDef lines VERBATIM from `diagram-conventions.md`. Only allowed fills: `#6baed6` (process), `#fdae61` (external), `#74c476` (datastore). Only allowed strokes: `#2171b5`, `#d94701`, `#238b45`, `#e31a1c`. Use ONLY `%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#ffffff', 'lineColor': '#666666' }}}%%` — no other themeVariables keys
31. Summary DFD: after creating `1.1-threatmodel.mmd`, run the POST-DFD GATE in Step 4. The gate and `skeleton-summary-dfd.md` control whether `1.2-threatmodel-summary.mmd` is generated.
32. Report Files table in `0-assessment.md`: list `0-assessment.md` (this document) as the FIRST row, followed by 0.1-architecture.md, 1-threatmodel.md, etc. Use the exact template from `output-formats.md`
33. `threat-inventory.json` MUST be generated for every analysis run (Step 8b). This file enables future comparisons. See `output-formats.md` for schema.
34. **NEVER delete, modify, or remove any existing `threat-model-*` or `threat-model-compare-*` folders** in the repository. Only write to your own timestamped output folder. Cleaning up temporary git worktrees you created is allowed; deleting other report folders is FORBIDDEN.

### Rule Precedence (when guidance conflicts)

Apply rules in this order:
1. Literal skeletons in `skeletons/skeleton-*.md` — exact section/table headers and attribute rows
2. Mandatory Rules in `orchestrator.md` (this list)
3. Examples in `output-formats.md` (examples are illustrative, not authoritative when they differ from literal skeletons)

If any conflict is detected, follow the highest-precedence item.

**Post-generation:** The verification sub-agent will scan your output for all known deviations listed in `verification-checklist.md` Phase 0. Fix any failures before finalizing.

---

## Workflow

**Exclusions:** Skip these directories:
- `threat-model-*` (previous reports)
- `node_modules`, `.git`, `dist`, `build`, `vendor`, `__pycache__`

**Pre-work:** Before writing any output file, scan `verification-checklist.md` Phase 1 (Per-File Structural Checks) and Phase 2 (Diagram Rendering Checks). This internalizes the quality gates so output is correct on the first pass — preventing costly rework. Do NOT run the full verification yet; that happens in Step 10.

### ⛔ Sub-Agent Governance (MANDATORY — prevents duplicate work)

Sub-agents are **independent execution contexts** — they have no memory of the parent's state, instructions, or other sub-agents. Without strict governance, sub-agents will independently perform the ENTIRE analysis, creating duplicate report folders and wasting ~15 min compute + ~100K tokens per duplication.

**Rule 1 — Parent owns ALL file creation.** The parent agent is the ONLY agent that calls `create_file` for report files (0.1-architecture.md, stride-analysis.md, findings.md, etc.). Sub-agents NEVER write report files.

**Rule 2 — Sub-agents are READ-ONLY helpers.** Sub-agents may:
- Search source code for specific patterns (e.g., "find all auth-related code")
- Read and analyze files, then return structured data to the parent
- Run verification checks and return PASS/FAIL results
- Execute terminal commands (git diff, grep) and return output

**Rule 3 — Sub-agent prompts must be NARROW and SPECIFIC.** Never tell a sub-agent to "perform threat model analysis" or "generate the report." Instead:
- ✅ "Read these 5 Go files and list every function that handles credentials. Return a table of function name, file, line number."
- ✅ "Run the verification checklist against the files in {folder}. Return PASS/FAIL for each check."
- ✅ "Read threat-inventory.json from {path} and verify all array lengths match metrics. Return mismatches."
- ❌ "Analyze this codebase and write the threat model files."
- ❌ "Generate 0.1-architecture.md and stride-analysis.md for this component."

**Rule 4 — Output folder path.** The parent creates the timestamped output folder in Step 1 and uses that exact path for ALL `create_file` calls. If a sub-agent needs to read previously written report files, pass the folder path in the sub-agent prompt.

**Rule 5 — The ONLY exception** is `threat-inventory.json` generation (Step 8b), where the parent MAY delegate JSON writing to a sub-agent IF the data is too large. In that case, the sub-agent prompt MUST include: (a) the exact output file path, (b) the data to serialize, and (c) explicit instruction: "Write ONLY this one file. Do NOT create any other files or folders."

### Steps

1. **Record start time & gather context**
   - Run `Get-Date -Format "yyyy-MM-dd HH:mm:ss" -AsUTC` and store as `START_TIME`
   - Get git info: `git remote get-url origin`, `git branch --show-current`, `git rev-parse --short HEAD`, `git log -1 --format="%ai" HEAD` (commit date — NOT today's date), `hostname`
   - Map the system: identify components, trust boundaries, data flows
   - **Reference:** `analysis-principles.md` for security infrastructure inventory

   **⛔ DEPLOYMENT CLASSIFICATION (MANDATORY — do this BEFORE analyzing code for threats):**
   Determine the system's deployment class from code evidence (see `skeleton-architecture.md` for values).
   Record in `0.1-architecture.md` → Deployment Model section. Then fill the **Component Exposure Table** — one row per component showing listen address, auth barrier, external reachability, and minimum prerequisite.
   This table is the **single source of truth** for prerequisite floors. No threat or finding may have a lower prerequisite than what the exposure table permits for its component.

   **⛔ DETERMINISTIC NAMING — Apply BEFORE writing any files:**
   
   When identifying components, assign each a canonical PascalCase `id`. The naming MUST be deterministic — two independent runs on the same codebase MUST produce the same component IDs.

   **⛔ ABSOLUTE RULE: Every component ID MUST be anchored to a real code artifact.**
   For every component you identify, you MUST be able to point to a specific class, file, or manifest in the codebase that is the "anchor" for that component. If no such artifact exists, the component does not exist.

   **Naming procedure (follow IN ORDER — stop at the first match):**
   1. **Primary class name** — Use the EXACT class name from the source code. Do NOT abbreviate, expand, or rephrase it.
      - `TaskProcessor.cs` → `TaskProcessor` (NOT `TaskServer`, NOT `TaskService`)
      - `SessionStore.cs` → `SessionStore` (NOT `FileSessionStore`, NOT `SessionService`)
      - `TerminalUserInterface.cs` → `TerminalUserInterface` (NOT `TerminalUI`)
      - `PowerShellCommandExecutor.cs` → `PowerShellCommandExecutor` (NOT `PowerShellExecutor`)
      - `ResponsesAPIService.cs` → `ResponsesAPIService` (NOT `LLMService` — that's a DIFFERENT class)
      - `MCPHost.cs` → `MCPHost` (NOT `OrchestrationHost`)
   2. **Primary script name** → `Import-Images.ps1` → `ImportImages`
   3. **Primary config/manifest name** → `Dockerfile` → `DockerContainer`, `values.yaml` → `HelmChart`
   4. **Directory name** (if component spans multiple files) → `src/ParquetParsing/` → `ParquetParser`
   5. **Technology name** (for external services/datastores) → "Azure OpenAI" → `AzureOpenAI`, "Redis" → `Redis`
   6. **External actor role** → `Operator`, `EndUser` (never drop these)

   **⛔ Helm/Kubernetes Deployment Naming (CRITICAL for comparison stability):**
   When a component is deployed via Helm chart or Kubernetes manifests, use the **Kubernetes workload name** (from the Deployment/StatefulSet metadata.name) as the component ID — NOT the Helm template filename or directory structure:
   - Look at `metadata.name` in deployment YAML → use that as the component ID (PascalCase normalized)
   - Example: `metadata.name: devportal` in `templates/knowledge/devportal-deployment.yml` → component ID is `DevPortal`
   - Example: `metadata.name: phi-model` in `templates/knowledge/phi-deployment.yml` → component ID is `PhiModel`
   - **Why:** Helm templates frequently get reorganized (e.g., moved from `templates/` to `templates/knowledge/`) but the Kubernetes workload name stays the same. Using the workload name ensures the component ID survives directory reorganizations.
   - `source_files` MUST include the deployment YAML path AND the application source code path (e.g., both `helmchart/myapp/templates/knowledge/devportal-deployment.yml` AND `developer-portal/src/`)
   - `source_directories` MUST include BOTH the Helm template directory AND the source code directory

   **External Service Anchoring (for components without repo source code):**
   External services (cloud APIs, managed databases, SaaS endpoints) don't have source files in the repository. Anchor them to their **integration point** in the codebase:
   - `source_files` → the client class or config file that defines the connection (e.g., `src/MCP/appsettings.json` for Azure OpenAI connection config, `helmchart/values.yaml` for Redis endpoint config)
   - `source_directories` → the directory containing the integration code (e.g., `src/MCP/Core/Services/LLM/` for the LLM client)
   - `class_names` → the CLIENT class in YOUR repo that talks to the service (e.g., `ResponsesAPIService`), NOT the vendor's SDK class (e.g., NOT `OpenAIClient`). If no dedicated client class exists, leave empty.
   - `namespace` → leave empty `""` (external services don't have repo namespaces)
   - `config_keys` → the env vars / config keys for the service connection (e.g., `["AZURE_OPENAI_ENDPOINT", "RESPONSES_API_DEPLOYMENT"]`). These are the most stable anchors for external services.
   - `api_routes` → leave empty (external services expose their own routes, not yours)
   - `dependencies` → the SDK package used (e.g., `["Azure.AI.OpenAI"]` for NuGet, `["pymilvus"]` for pip)
   
   **Why this matters:** External services frequently change display names across LLM runs (e.g., "Azure OpenAI" vs "GPT-4 Endpoint" vs "LLM Backend"). The `config_keys` and `dependencies` fields are what make them matchable across runs.

   **⛔ FORBIDDEN naming patterns — NEVER use these:**
   - NEVER invent abstract names that don't correspond to a real class: `ConfigurationStore`, `LocalFileSystem`, `DataLayer`, `IngestionPipeline`, `BackendServer`
   - NEVER abbreviate a class name: `TerminalUI` for `TerminalUserInterface`, `PSExecutor` for `PowerShellCommandExecutor`
   - NEVER substitute a synonym: `TaskServer` for `TaskProcessor`, `LLMService` for `ResponsesAPIService`
   - NEVER merge two separate classes into one component: `ResponsesAPIService` and `LLMService` are two different classes → two different components
   - NEVER create a component for something that doesn't exist in the code: if there's no Windows Registry access code, don't create a `WindowsRegistry` component
   - NEVER rename between runs: if you called it `TaskProcessor` in run 1, it MUST be `TaskProcessor` in run 2

   **⛔ COMPONENT ANCHOR VERIFICATION (MANDATORY — do this BEFORE Step 2):**
   After identifying all components, create a mental checklist:
   ```
   For EACH component:
     Q: What is the EXACT filename or class that anchors this component?
     A: [must cite a real file path, e.g., "src/Core/TaskProcessor.cs"]
     If you cannot cite a real file → DELETE the component from your list
   ```
   This verification catches invented components like `WindowsRegistry` (no registry code exists), `ConfigurationStore` (no such class), `LocalFileSystem` (abstract concept, not a class).

   **⛔ COMPONENT SELECTION STABILITY (when multiple related classes exist):**
   Many systems have clusters of related classes (e.g., `CredentialManager`, `AzureCredentialProvider`, `AzureAuthenticationHandler`). To ensure deterministic selection:
   - **Pick the class that OWNS the security-relevant behavior** — the one that makes the trust decision, holds the credential, or processes the data
   - **Prefer the class registered in dependency injection** over helpers/utilities
   - **Prefer the higher-level orchestrator** over its internal implementation classes
   - **Once you pick a class, its alternatives become aliases** — add them to the `aliases` array, not as separate components
   - **Example**: If `CredentialManager` orchestrates credential lookup and uses `AzureCredentialProvider` internally, `CredentialManager` is the component and `AzureCredentialProvider` is an alias
   - **Example**: Do NOT include both `SessionStore` and `SessionFiles` — `SessionStore` is the class, `SessionFiles` is an abstract concept
   - **Count rule**: Two runs on the same code MUST produce the same number of components (±1 for edge cases). A difference of ≥3 components indicates the selection rules were not followed.

   **⛔ STABILITY ANCHORS (for comparison matching):**
   When recording each component in `threat-inventory.json`, the `fingerprint` fields `source_directories`, `class_names`, and `namespace` serve as **stability anchors** — immutable identifiers that persist even when:
   - The class is renamed (directory stays the same)
   - The file is moved to a different directory (class name stays the same)
   - The component ID changes between analysis runs (namespace stays the same)
   The comparison matching algorithm relies on these anchors MORE than on the component `id` field. Therefore:
   - `source_directories` MUST be populated for every process-type component (never empty `[]`)
   - `class_names` MUST include at least the primary class name
   - `namespace` MUST be the actual code namespace (e.g., `MyApp.Core.Servers.Health`), not a made-up grouping
   - These fields are what make a component identifiable across independent analysis runs, even if two LLMs pick different display names

   **⛔ COMPONENT ELIGIBILITY — What qualifies as a threat model component:**
   A class/service becomes a threat model component ONLY if it meets ALL of these criteria:
   1. **It crosses a trust boundary OR handles security-sensitive data** (credentials, user input, network I/O, file I/O, process execution)
   2. **It is a top-level service**, not an internal helper (registered in DI, or the main entry point, or an agent with its own responsibility)
   3. **It would appear in a deployment diagram** — you could point to it and say "this runs here, talks to that"
   
   **ALWAYS include these component types (if they exist in the code):**
   - ALL agent classes (HealthAgent, InfrastructureAgent, InvestigatorAgent, SupportabilityAgent, etc.)
   - ALL MCP server classes (HealthServer, InfrastructureServer, etc.)
   - The main host/orchestrator (MCPHost, etc.)
   - ALL external service connections (AzureOpenAI, AzureAD, etc.)
   - ALL credential/auth managers
   - The user interface entry point
   - ALL tool execution services (PowerShellCommandExecutor, etc.)
   - ALL session/state persistence services
   - ALL LLM service classes (ResponsesAPIService, LLMService — if they are separate classes, they are separate components)
   - External actors (Operator, EndUser)
   
   **NEVER include these as separate components:**
   - Loggers (LocalFileLogger, TelemetryLogger) — these are cross-cutting concerns, not threat model components
   - Static helper classes
   - Model/DTO classes
   - Configuration builders (unless they handle secrets)
   - Infrastructure-as-code classes that don't exist at runtime (AzureStackHCI cluster reference, deployment scripts)
   
   **The goal:** Every run on the same code should identify the SAME set of ~12-20 components. If you're including a logger or excluding an agent, you're doing it wrong.

   **Boundary naming rules:**
   - Boundary IDs MUST be PascalCase (never `Layer`, `Zone`, `Group`, `Tier` suffixes)
   - Derive from deployment topology, NOT from code architecture layers
   - **Deployment topology determines boundaries:**
     - Single-process app → **EXACTLY 2 boundaries**: `Application` (the process) + `External` (external services). NEVER use 1 boundary. NEVER use 3+ boundaries. This is mandatory for single-process apps.
     - Multi-container app → boundaries per container/pod
     - K8s deployment → `K8sCluster` + per-namespace boundaries if relevant
     - Client-server → `Client` + `Server`
   - **K8s multi-service deployments (CRITICAL for microservice architectures):**
     When a K8s namespace contains multiple Deployments/StatefulSets with DIFFERENT security characteristics, create sub-boundaries based on workload type:
     - `BackendServices` — API services (FastAPI, Express, etc.) that handle user requests
     - `DataStorage` — Databases and persistent storage (Redis, Milvus, PostgreSQL, NFS) — these have different access controls, persistence, and backup policies
     - `MLModels` — ML model servers running on GPU nodes — these have different compute resources, attack surfaces (adversarial inputs), and scaling characteristics
     - `Agentic` — Agent runtime/manager services if present
     - The outer `K8sCluster` contains these sub-boundaries
     - **This is NOT "code layers"** — each sub-boundary represents a different Kubernetes Deployment/StatefulSet with its own security context, resource limits, and network policies
     - **Test**: If two components are in DIFFERENT Kubernetes Deployments with different service accounts, different network exposure, or different resource requirements → they SHOULD be in different sub-boundaries
   - **FORBIDDEN boundary schemes (for SINGLE-PROCESS apps only):**
     - Do NOT create boundaries based on code layers: `PresentationBoundary`, `OrchestrationBoundary`, `AgentBoundary`, `ServiceBoundary` are CODE LAYERS, not deployment boundaries. All these run in the SAME process.
     - Do NOT split a single process into 4+ boundaries. If all components run in one .exe, they are in ONE boundary.
   - **Example**: An application where `TerminalUserInterface`, `MCPHost`, `HealthAgent`, `ResponsesAPIService` all run in the same process → they are ALL in `Application`. External services like `AzureOpenAI` are in `External`.
   - Two runs on the same code MUST produce the same number of boundaries (±1). A difference of ≥2 boundaries is WRONG.
   - NEVER create boundaries based on code layers (Presentation/Business/Data) — boundaries represent DEPLOYMENT trust boundaries, not code architecture

   **Boundary count locking:**
   - After identifying boundaries, LOCK the count. Two runs on the same code MUST produce the same number of boundaries (±1 acceptable if one run identifies an edge boundary the other doesn't)
   - A 4-boundary vs 7-boundary difference on the same code is WRONG and indicates the naming rules were not followed

   **Additional naming rules:**
   - The SAME component must get the SAME `id` regardless of which LLM model runs the analysis or how many times it runs
   - External actors (`Operator`, `AzureDataStudio`, etc.) are ALWAYS included — never drop them
   - Datastores representing distinct storage (files, database) are ALWAYS separate components — never merge them
   - Lock the component list before Step 2. Use these exact IDs in ALL subsequent files (architecture, DFD, STRIDE, findings, JSON)
   - If two classes exist as separate files (e.g., `ResponsesAPIService.cs` and `LLMService.cs`), they are TWO components even if they seem related

   **⛔ DATA FLOW COMPLETENESS (MANDATORY — ensures consistent flow enumeration across runs):**
   Data flows MUST be enumerated exhaustively. Two independent analyses of the same codebase MUST produce the same set of flows. To achieve this:
   
   **⛔ RETURN FLOW MODELING RULE (addresses 24% variance in flow counts):**
   - **DO NOT model separate return flows.** A request-response pair is ONE bidirectional flow (use `<-->` in Mermaid).
   - Example: `DF01: Operator <--> TUI` (one flow for input and output)
   - Example: `DF03: MCPHost <--> HealthAgent` (one flow for delegation and result)
   - **DO model separate flows ONLY when the two directions use different protocols or semantics** (e.g., HTTP request vs WebSocket push-back).
   - **Why:** When runs independently decide whether to create 1 flow or 2 flows per interaction, the flow count varies by 20-30%. This rule eliminates that variance.
   - **Flow count formula:** `# flows ≈ # unique component-to-component interactions`. If component A talks to component B, that is 1 flow, not 2.
   
   **Flow completeness checklist (use `<-->` bidirectional flows per the return flow rule above):**
   1. **Ingress/reverse proxy flows**: `DF_EndUser_to_NginxIngress` (bidirectional `<-->`), `DF_NginxIngress_to_Backend` (bidirectional `<-->`). Each is ONE flow, not two.
   2. **Database/datastore flows**: `DF_Service_to_Redis` (bidirectional `<-->`). ONE flow per service-datastore pair.
   3. **Auth provider flows**: `DF_Service_to_AzureAD` (bidirectional `<-->`). ONE flow per service-auth pair.
   4. **Admin access flows**: `DF_Operator_to_Service` (bidirectional `<-->`). ONE per admin interaction.
   5. **Flow count locking**: After enumerating flows, LOCK the count. Two runs on the same code MUST produce the same number of flows (±3 acceptable). A difference of >5 flows indicates incomplete enumeration.
   
   **⛔ EXTERNAL ENTITY INCLUSION RULES (addresses variance in which externals are modeled):**
   - **ALWAYS include `AzureAD` (or `EntraID`) as an external entity** if the code acquires tokens from Azure AD / Microsoft Entra ID (look for `ChainedTokenCredential`, `ManagedIdentityCredential`, `AzureCliCredential`, MSAL, or any OAuth2/OIDC flow).
   - **ALWAYS include the infrastructure target** (e.g., `OnPremInfra`, `HCICluster`) as an external entity if the code sends commands to external infrastructure via PowerShell, REST, or WMI.
   - **ALWAYS include `AzureOpenAI`** (or equivalent LLM endpoint) if the code calls a cloud LLM API.
   - **ALWAYS include `Operator`** as an external actor for CLI/TUI tools, admin tools, or operator consoles.
   - **Rule of thumb:** If the code has a client class or config for a service, that service is an external entity.
   
   **⛔ TMT CATEGORY RULES (addresses category inconsistency across runs):**
   - **Tool servers** that expose APIs callable by agents → `SE.P.TMCore.WebSvc` (NOT `SE.P.TMCore.NetApp`)
   - **Network-level services** that handle connections/sockets → `SE.P.TMCore.NetApp`
   - **Services that execute OS commands** (PowerShell, bash) → `SE.P.TMCore.OSProcess`
   - **Services that store data to disk** (SessionStore, FileLogger) → `SE.DS.TMCore.FS` (classify as Data Store, NOT Process)
   - **Rule:** If a class's primary purpose is persisting data, it is a Data Store. If it does computation or orchestration, it is a Process. Never switch between runs.
   
   **⛔ DFD DIRECTION (MANDATORY — addresses layout variance):**
   - ALL DFDs MUST use `flowchart LR` (left-to-right). NEVER use `flowchart TB`.
   - ALL summary DFDs MUST also use `flowchart LR`.
   - This is immutable — do not change based on aesthetics or diagram shape.

   **Acronym rules for PascalCase:**
   - Preserve well-known acronyms as ALL-CAPS: `API`, `NFS`, `LLM`, `SQL`, `HCI`, `AD`, `UI`, `DB`
   - Examples: `IngestionAPI` (not `IngestionApi`), `NFSServer` (not `NfsServer`), `AzureAD` (not `AzureAd`), `VectorDBAPI` (not `VectorDbApi`)
   - Single-word technologies keep standard casing: `Redis`, `Milvus`, `PostgreSQL`, `Nginx`

   **Common technology naming (use EXACTLY these IDs for well-known infrastructure):**
   - Redis cache/state: `Redis` (never `DaprStateStore`, `RedisCache`, `StateStore`)
   - Milvus vector DB: `Milvus` (never `MilvusVectorDb`, `VectorDB`)
   - NGINX ingress: `NginxIngress` (never `IngressNginx`)
   - Azure AD/Entra: `AzureAD` (never `AzureAd`, `EntraID`)
   - PostgreSQL: `PostgreSQL` (never `PostgresDb`, `Postgres`)
   - User/Operator: `Operator` for admin users, `EndUser` for end users
   - Azure OpenAI: `AzureOpenAI` (never `OpenAIService`, `LLMEndpoint`)
   - NFS: `NFSServer` (never `NfsServer`, `FileShare`)
   - If two LLM models are separate deployments, keep them separate (never merge `MistralLLM` + `PhiLLM` into `LocalLlm`)
   
   **BUT: for application-specific classes, use the EXACT class name from the code, NOT a technology label:**
   - `ResponsesAPIService.cs` → `ResponsesAPIService` (NOT `OpenAIService` — the class IS named ResponsesAPIService)
   - `TaskProcessor.cs` → `TaskProcessor` (NOT `LocalLLM` — the class IS named TaskProcessor)
   - `SessionStore.cs` → `SessionStore` (NOT `StatePersistence` — the class IS named SessionStore)
   **Component granularity rules (CRITICAL for stability):**
   - Model components at the **technology/service level**, not the script/file level
   - A Docker container running Kusto is `KustoContainer` — NOT decomposed into `KustoService` + `IngestLogs` + `KustoDataDirectory`
   - A Moby Docker engine is `MobyDockerEngine` — NOT `InstallMoby` (the installer script is evidence, not the component)
   - An installer for a tool is `SetupInstaller` — NOT renamed to `InstallAzureEdgeDiagnosticTool` (script filename)
   - Rule: if a component has one primary function (e.g., "run Kusto queries"), model it as ONE component regardless of how many scripts/files implement it
   - Scripts are EVIDENCE for components, not components themselves
   - Keep the same granularity across runs — never split a single component into sub-components or merge sub-components between runs

   **⛔ COMPONENT ID FORMAT (MANDATORY — addresses casing variance):**
   - ALL component IDs MUST be PascalCase. NEVER use kebab-case, snake_case, or camelCase.
   - Examples: `HealthAgent` (not `health-agent`), `AzureAD` (not `azure-ad`), `MCPHost` (not `mcp-host`)
   - This applies to ALL artifacts: 0.1-architecture.md, 1-threatmodel.md, DFD mermaid, STRIDE, findings, JSON.

   **⛔ STRIDE SCOPE RULE (addresses external entity analysis variance):**
   - STRIDE analysis in `2-stride-analysis.md` MUST include sections for ALL elements in the Element Table EXCEPT external actors (Operator, EndUser).
   - External services (AzureOpenAI, AzureAD, OnPremInfra) DO get STRIDE sections — they are attack surfaces from YOUR system's perspective.
   - External actors (human users) do NOT get STRIDE sections — they are threat SOURCES, not targets.
   - This means: if you have 20 elements total and 1 is an external actor, you write 19 STRIDE sections.

   **⛔ STRIDE DEPTH CONSISTENCY (addresses threat count variance):**
   - Each component MUST get ALL 7 STRIDE-A categories analyzed (S, T, R, I, D, E, A).
   - Each STRIDE category MUST be explicitly addressed per component: either with one or more concrete threats, OR with an explicit `N/A — {1-sentence justification}` row explaining why that category does not apply to this specific component.
   - A category may produce 0, 1, 2, 3, or more threats — the count depends on the component's actual attack surface. Do NOT cap at 1 threat per category. Components with rich security surfaces (API services, auth managers, command executors, LLM clients) should typically have 2-4 threats per relevant STRIDE category. Only simple components (static config, read-only data stores) should have mostly 0-1.
   - **Expected distribution:** For a 15-component system: ~30% of STRIDE cells should be 0 (with N/A), ~40% should be 1, ~25% should be 2, ~5% should be 3+. If ALL cells are 0 or 1 (binary pattern) → the analysis is too shallow. Go back and identify additional threat vectors.
   - N/A entries do NOT count toward threat totals in the Summary table. Only concrete threat rows count.
   - The Summary table S/T/R/I/D/E/A columns show the COUNT of concrete threats per category (0 is valid if N/A was justified).
   - This ensures comprehensive coverage while producing accurate, non-inflated threat counts.

2. **Write architecture overview** (`0.1-architecture.md`)
   - **Read `skeletons/skeleton-architecture.md` first** — copy skeleton structure, fill `[FILL]` placeholders
   - System purpose, key components, top scenarios, tech stack, deployment
   - **Use the exact component IDs locked in Step 1** — do not rename or merge components
   - **Reference:** `output-formats.md` for template, `diagram-conventions.md` for architecture diagram styles

3. **Inventory security infrastructure**
   - Identify security-enabling components before flagging gaps
   - **Reference:** `analysis-principles.md` Security Infrastructure Inventory table

4. **Produce threat model DFD** (`1.1-threatmodel.mmd`, `1.2-threatmodel-summary.mmd`, `1-threatmodel.md`)
   - **Read `skeletons/skeleton-dfd.md`, `skeletons/skeleton-summary-dfd.md`, and `skeletons/skeleton-threatmodel.md` first**
   - **Reference:** `diagram-conventions.md` for DFD styles, `tmt-element-taxonomy.md` for element classification
   - ⚠️ **BEFORE FINALIZING:** Run the Pre-Render Checklist from `diagram-conventions.md`

   ⛔ **POST-DFD GATE — Run IMMEDIATELY after creating `1.1-threatmodel.mmd`:**
   1. Count elements (nodes with `((...))`, `[(...)`, `["..."]`) in `1.1-threatmodel.mmd`
   2. Count boundaries (`subgraph` lines)
   3. If elements > 15 OR boundaries > 4:
      → You MUST create `1.2-threatmodel-summary.mmd` using `skeleton-summary-dfd.md` NOW
      → Do NOT proceed to `1-threatmodel.md` until the summary file exists
   4. If threshold NOT met → skip summary, proceed to `1-threatmodel.md`
   5. Create `1-threatmodel.md` (include Summary View section if summary was generated)

5. **Enumerate threats** per element and flow using STRIDE-A (`2-stride-analysis.md`)
   - **Read `skeletons/skeleton-stride-analysis.md` first** — use Summary table and per-component structure
   - **Reference:** `analysis-principles.md` for tier definitions, `output-formats.md` for STRIDE template
   - **⛔ PREREQUISITE FLOOR CHECK (per threat):** Before assigning a prerequisite to any threat, look up the component's `Min Prerequisite` and `Derived Tier` in the Component Exposure Table (`0.1-architecture.md`). The threat's prerequisite MUST be ≥ the component's floor. The threat's tier MUST be ≥ the component's derived tier (i.e., if component is T2, no threat can be T1). Use the canonical prerequisite→tier mapping from `analysis-principles.md`.

6. **For each threat:** cite files/functions/endpoints, propose mitigations, provide verification steps

7. **Verify findings** — confirm each finding against actual configuration before documenting
   - **Reference:** `analysis-principles.md` Finding Validation Checklist

7b. **Technology sweep** — Run the Technology-Specific Security Checklist from `analysis-principles.md`
   - For every technology found in the repo (Redis, Milvus, PostgreSQL, Docker, K8s, ML models, LLMs, NFS, CI/CD, etc.), verify you have at least one finding or explicit mitigation
   - This step catches gaps that component-level STRIDE misses (e.g., database auth defaults, container hardening, key management)
   - Add any missing findings before proceeding to Step 8

8. **Compile findings** (`3-findings.md`)
   - **Reference:** `output-formats.md` for findings template and Related Threats link format
   - **Reference:** `skeletons/skeleton-findings.md` — read this skeleton, copy VERBATIM, fill in `[FILL]` placeholders for each finding

   ⛔ **PRE-WRITE GATE — Verify before calling `create_file` for `3-findings.md`:**
   1. Finding IDs: `### FIND-01:`, `### FIND-02:` — sequential, `FIND-` prefix (NOT `F01` or `F-01`)
   2. CVSS prefix: every vector starts with `CVSS:4.0/` (NOT bare `AV:N/AC:L/...`)
   3. Related Threats: each threat ID is a separate hyperlink `[TNN.X](2-stride-analysis.md#anchor)` (NOT plain text)
   4. Sub-sections: `#### Description`, `#### Evidence`, `#### Remediation`, `#### Verification` (NOT `Recommendation`)
   5. Sort: within each tier → Critical → Important → Moderate → Low → higher CVSS first
   6. All 10 mandatory attribute rows present per finding
   7. **Deployment context gate (FAIL-CLOSED):** Read `0.1-architecture.md` Deployment Classification and Component Exposure Table.
      If classification is `LOCALHOST_DESKTOP` or `LOCALHOST_SERVICE`:
      - ZERO findings may have `Exploitation Prerequisites` = `None` → fix to `Local Process Access` (T2) or `Host/OS Access` (T3)
      - ZERO findings may be in `## Tier 1` → downgrade to T2/T3 based on prerequisite
      - ZERO CVSS vectors may use `AV:N` unless the **specific component** has `Reachability = External` in the Component Exposure Table → fix to `AV:L`
      For ALL deployment classifications:
      - For EACH finding, look up its Component in the exposure table. The finding's prerequisite MUST be ≥ the component's `Min Prerequisite`. The finding's tier MUST be ≥ the component's `Derived Tier`.
      - Prerequisites MUST use only canonical values: `None`, `Authenticated User`, `Privileged User`, `Internal Network`, `Local Process Access`, `Host/OS Access`, `Admin Credentials`, `Physical Access`, `{Component} Compromise`. ⛔ `Application Access` and `Host Access` are FORBIDDEN.
      If ANY violation exists → **DO NOT WRITE THE FILE.** Fix all violations first.

   ⛔ **Fail-fast gate:** Immediately after writing, run the Inline Quick-Checks for `3-findings.md` from `verification-checklist.md`. Fix before proceeding.

   ⛔ **MANDATORY: All 3 tier sections must be present.** Even if a tier has zero findings, include the heading with a note:
   - `## Tier 1 — Direct Exposure (No Prerequisites)` → `*No Tier 1 findings identified for this repository.*`
   - This ensures structural consistency for comparison matching and validation.

   ⛔ **COVERAGE VERIFICATION FEEDBACK LOOP (MANDATORY):**
   After writing the Threat Coverage Verification table at the end of `3-findings.md`:
   1. **Scan the table you just wrote.** Count how many threats have status `✅ Covered` vs `🔄 Mitigated by Platform` vs `⚠️ Needs Review` vs `⚠️ Accepted Risk`.
   2. **If ANY threat has `⚠️ Accepted Risk`** → FAIL. The tool cannot accept risks. Go back and create a finding for each one.
   3. **If Platform ratio > 20%** → SUSPECT. Re-examine each `🔄 Mitigated by Platform` entry: is the mitigation truly from an EXTERNAL system managed by a DIFFERENT team? If the mitigation is the repo's own code (auth middleware, file permissions, TLS config, localhost binding), reclassify as `Open` and create a finding.
   4. **If ANY `Open` threat in `2-stride-analysis.md` has NO corresponding finding** → create a finding NOW. Use the threat's description as the finding title, the mitigation column as the remediation guidance, and assign severity based on STRIDE category.
   5. **Update `3-findings.md`** with the newly created findings. Renumber sequentially. Update the Coverage table to show `✅ Covered` for each.
   6. **This loop is the ENTIRE POINT of the Coverage table** — it's not documentation, it's a self-check that forces complete coverage. If you write the table and don't act on gaps, you've wasted the effort.

8b. **Generate threat inventory** (`threat-inventory.json`)
   - **Read `skeletons/skeleton-inventory.md` first** — use exact field names and schema structure
   - After writing all markdown reports, compile a structured JSON inventory of all components, boundaries, data flows, threats, and findings
    - Use canonical PascalCase IDs for components (derived from class/file names) and keep display labels separate
   - Use canonical flow IDs: `DF_{Source}_to_{Target}`
    - Include identity keys on every threat and finding for future matching
    - Include deterministic identity fields for component and boundary matching across runs:
       - Component: `aliases`, `boundary_kind`, `fingerprint`
       - Boundary: `kind`, `aliases`, `contains_fingerprint`
    - Build `fingerprint` from stable evidence (source files, endpoint neighbors, protocols, type) — never from prose wording
    - Normalize synonyms to the same canonical component ID (example: `SupportAgent` and `SupportabilityAgent` → `SupportabilityAgent`) and store alternate names in `aliases`
    - Sort arrays deterministically before writing JSON:
       - `components` by `id`
       - `boundaries` by `id`
       - `flows` by `id`
       - `threats` by `id` then `identity_key.component_id`
       - `findings` by `id` then `identity_key.component_id`
   - Extract metrics (totals, per-tier counts, per-STRIDE-category counts)
   - Include git metadata (commit SHA, branch, date) and analysis metadata (model, timestamps)
   - **Reference:** `output-formats.md` for the `threat-inventory.json` schema
   - **This file is NOT linked in 0-assessment.md** but is always present in the output folder

   ⛔ **PRE-WRITE SIZE CHECK (MANDATORY — before calling `create_file` for JSON):**
   Before writing `threat-inventory.json`, count the data you plan to include:
   - Count total threats from `2-stride-analysis.md` (grep `^\| T\d+\.`)
   - Count total findings from `3-findings.md` (grep `### FIND-`)
   - Count total components from `0.1-architecture.md`
   - **If threats > 50 OR findings > 15:** DO NOT use a single `create_file` call.
     Instead, use one of: (a) delegate to sub-agent, (b) Python extraction script, (c) chunked write strategy.
   - **If threats ≤ 50 AND findings ≤ 15:** single `create_file` is acceptable, but keep entries minimal (1-sentence description/mitigation fields).

   ⛔ **POST-WRITE VALIDATION (MANDATORY — JSON Array Completeness):**
   After writing `threat-inventory.json`, immediately verify:
   - `threats.length == metrics.total_threats` — if mismatch, the threats array was truncated during generation. Rebuild by re-reading `2-stride-analysis.md` and extracting every threat row.
   - `findings.length == metrics.total_findings` — if mismatch, rebuild from `3-findings.md`.
   - `components.length == metrics.total_components` — if mismatch, rebuild from architecture/element tables.
   
   ⛔ **CROSS-FILE THREAT COUNT VERIFICATION (MANDATORY — catches dropped threats):**
   The JSON `threats.length` can match `metrics.total_threats` but BOTH can be wrong if threats were dropped during JSON generation. To catch this:
   - Count threat rows in `2-stride-analysis.md`: grep for `^\| T\d+\.` and count unique threat IDs
   - Compare this count to `threats.length` in the JSON
   - If the markdown has MORE threats than the JSON → the JSON dropped threats. Rebuild the JSON by re-extracting ALL threats from `2-stride-analysis.md`.
   - This is the #2 quality issue observed in testing (after truncation). Large repos (114+ threats) frequently have 1-3 threats dropped when sub-agents write the JSON from memory instead of re-reading the STRIDE file.

   ⛔ **FIELD NAME COMPLIANCE GATE (MANDATORY — run immediately after array check):**
   Read the first component and first threat from the JSON just written and verify these EXACT field names:
   - `components[0]` has key `"display"` (NOT `"display_name"`, NOT `"name"`) → if wrong, find-replace ALL occurrences
   - `threats[0]` has key `"stride_category"` (NOT `"category"`) → if wrong, find-replace ALL occurrences
   - `threats[0].identity_key` has key `"component_id"` (threat→component link must be INSIDE `identity_key`, NOT a top-level `component_id` field on the threat) → if wrong, restructure
   - `threats[0]` has BOTH `"title"` (short name, e.g., "Information Disclosure — Redis unencrypted traffic") AND `"description"` (longer prose). If only `description` exists without `title`, create `title` from the first sentence of `description`. If `name` or `threat_name` exists instead of `title`, find-replace to `title`
   - **Why this matters:** Downstream tooling depends on these exact field names. Wrong names cause zero-value heatmaps, broken component matching, and empty display labels in comparison reports.
   - **If ANY field name is wrong:** fix it NOW with find-replace on the JSON file before proceeding. Do NOT leave it for verification.

   - **This is the #1 quality issue observed in testing.** Large repos (20+ components, 80+ threats) frequently have truncated JSON arrays because the model runs out of output tokens. If ANY array is truncated, you MUST rebuild it before proceeding. Do NOT finalize with mismatched counts.

   ⛔ **HARD GATE — TRUNCATION RECOVERY (MANDATORY):**
   If post-write validation detects ANY array mismatch:
   1. **DELETE** the truncated `threat-inventory.json` immediately
   2. **DO NOT attempt to patch** the truncated file — partial JSON is unreliable
   3. **Regenerate using one of these strategies** (in preference order):
      a. **Delegate to a sub-agent** — hand the sub-agent the output folder path and instruct it to read `2-stride-analysis.md` and `3-findings.md`, then write `threat-inventory.json`. The sub-agent has a fresh context window.
      b. **Python extraction script** — write a Python script that reads the markdown files, extracts threats/findings via regex, and writes the JSON. Run the script via terminal.
      c. **Chunked write** — use the Large Repo Strategy below.
   4. **Re-validate** after regeneration — if still mismatched, repeat with the next strategy
   5. **NEVER proceed to Step 9 (assessment) or Step 10 (verification) with mismatched counts**
   
   ⛔ **LARGE REPO STRATEGY (MANDATORY for repos with >60 threats):**
   For repos producing more than ~60 threats, the JSON file can exceed output token limits if generated in one pass. Use this chunked approach:
   1. **Write metadata + components + boundaries + flows + metrics first** — these are small arrays
   2. **Append threats in batches** — write threats array with ~20 threats per append operation. Use `replace_string_in_file` to add batches to the existing file rather than writing the entire JSON in one `create_file` call.
   3. **Append findings** — similarly batch if >15 findings
   4. **Final validation** — read the completed file and verify all array lengths match metrics
   
   **Alternative approach:** If chunked writing is not feasible, keep each threat/finding entry minimal:
   - `description` field: max 1 sentence (not full prose paragraphs)
   - `mitigation` field: max 1 sentence
   - Remove redundant fields that duplicate markdown content
   - The JSON is for MATCHING, not for reading — brevity is key

9. **Write assessment** (`0-assessment.md`)
   - **Reference:** `output-formats.md` for assessment template
   - **Reference:** `skeletons/skeleton-assessment.md` — read this skeleton, copy VERBATIM, fill in `[FILL]` placeholders
   - ⚠️ **ALL 7 sections are MANDATORY:** Report Files, Executive Summary, Action Summary (with Quick Wins), Analysis Context & Assumptions (with Needs Verification + Finding Overrides), References Consulted, Report Metadata, Classification Reference
   - Do NOT add extra sections like "Severity Distribution", "Architecture Risk Areas", "Methodology Notes", or "Deliverables" — these are NOT in the template

   ⛔ **PRE-WRITE GATE — Verify before calling `create_file` for `0-assessment.md`:**
   1. Exactly 7 sections: Report Files, Executive Summary, Action Summary, Analysis Context & Assumptions (with `&`), References Consulted, Report Metadata, Classification Reference
   2. `---` horizontal rules between EVERY pair of `## ` sections (minimum 6)
   3. `### Quick Wins`, `### Needs Verification`, `### Finding Overrides` all present
   4. References: TWO subsections (`### Security Standards` + `### Component Documentation`) with 3-column tables and full URLs
   5. ALL metadata values wrapped in backticks; ALL fields present (Model, Analysis Started, Analysis Completed, Duration)
   6. Element/finding/threat counts match actual counts from other files

   ⛔ **Fail-fast gate:** Immediately after writing, run the Inline Quick-Checks for `0-assessment.md` from `verification-checklist.md`. Fix before proceeding.

10. **Final verification** — iterative correction loop

    This step runs verification and fixes in a loop until all checks pass. Do NOT finalize with any failures remaining.

    **Pass 1 — Comprehensive verification:**
    - Delegate to a verification sub-agent with the content of `verification-checklist.md` + the output folder path
    - Sub-agent runs ALL Phase 0–5 checks and reports PASS/FAIL with evidence
    - If ANY check fails:
      1. Fix the failed file(s) using the available file-edit tool
      2. Re-run ONLY the failed checks against the fixed file(s)
      3. Repeat until the failed checks pass

    **Pass 2 — Regression check (if Pass 1 had fixes):**
    - Re-run Phase 3 (cross-file consistency) to ensure fixes didn’t break other files
    - If new failures appear, fix and re-verify

    **Exit condition:** ALL phases report 0 failures. Only then mark the analysis as complete.

    **Sub-agent context management:**
    - Include the relevant phase content from `verification-checklist.md` in the sub-agent prompt
    - Include the output folder path so the sub-agent can read files
    - Sub-agent output MUST include: phase name, total checks, passed, failed, and for each failure: check ID, file, evidence, exact fix instruction. Do not return "looks good" without counts.

---

## Tool Usage

### Progress Tracking (todo)
- Create todos at start for each major phase
- Mark in-progress before starting each phase
- Mark completed immediately after finishing each phase

### Sub-task Delegation (agent)
Delegate NARROW, READ-ONLY tasks to sub-agents (see Sub-Agent Governance above). Allowed delegations:
- **Context gathering:** "Search for auth patterns in these directories and return a summary"
- **Code analysis:** "Read these files and identify security-relevant APIs, credentials, and trust boundaries"
- **Verification:** Hand the verification sub-agent the content of `verification-checklist.md` and the output folder path. It reads the files and returns PASS/FAIL results. The PARENT fixes any failures.
- **JSON generation (exception):** For large repos, delegate `threat-inventory.json` writing with exact file path and pre-computed data

**NEVER delegate:** "Write 0.1-architecture.md", "Generate the STRIDE analysis", "Perform the threat model analysis", or any prompt that would cause the sub-agent to independently produce report files.

---

## Verification Checklist (Final Step)

The full verification checklist is in `verification-checklist.md`. It contains 9 phases:

> **Authority hierarchy:** `orchestrator.md` defines the AUTHORING rules (what to do when writing reports). `verification-checklist.md` defines the CHECKING rules (what to verify after writing). Some rules appear in both files for visibility — if they ever conflict, `orchestrator.md` rules take precedence for authoring decisions, and `verification-checklist.md` takes precedence for pass/fail criteria. For the complete list of all structural, diagram, and consistency checks, always consult `verification-checklist.md` — it is the single source of truth for quality gates.

0. **Phase 0 — Common Deviation Scan**: Known deviation patterns with WRONG→CORRECT examples
1. **Phase 1 — Per-File Structural Checks**: Section order, required content, formatting
2. **Phase 2 — Diagram Rendering Checks**: Mermaid init blocks, classDef, styles, syntax
3. **Phase 3 — Cross-File Consistency Checks**: Component coverage, DF mapping, threat-to-finding traceability
4. **Phase 4 — Evidence Quality Checks**: Evidence concreteness, verify-before-flagging compliance
5. **Phase 5 — JSON Schema Validation**: Schema fields, array completeness, metrics consistency
6. **Phase 6 — Deterministic Identity**: Component ID stability, boundary naming, flow ID consistency
7. **Phase 7 — Evidence-Based Prerequisites**: Prerequisite deployment evidence, coverage completeness
8. **Phase 8 — Comparison HTML** (incremental only): HTML structure, change annotations, CSS

**Inline Quick-Checks:** `verification-checklist.md` also contains Inline Quick-Checks that MUST be run immediately after writing each file (before Step 10). These catch errors while content is still in active context.

**Two-pass usage:**
- **Before writing (Workflow pre-work):** Scan Phase 1 and Phase 2 to internalize structural and diagram quality gates. This prevents rework.
- **After writing (Step 10):** Run ALL Phase 0–4 checks comprehensively against the completed output. Phase 0 is the most critical — it catches the deviations that persist across runs. Fix any failures before finalizing.

**Delegation:** Hand the verification sub-agent the content of `verification-checklist.md` and the output folder. It will run all checks and produce a PASS/FAIL summary. Fix any failures before finalizing.

---

## Starting the Analysis

If no folder path is provided, analyze the entire repository from its root.
