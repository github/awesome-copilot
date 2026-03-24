# Architecture Guidance Sources (For Design Direction Decisions)

A source registry for using Azure official architecture guidance **only for design direction decisions**.

> **The URLs in this document are a list of sources for "where to look".**
> Do not hardcode the contents of these URLs as fixed facts.
> Do not use for SKU, API version, region, model availability, or PE mapping decisions — those are handled exclusively via `azure-dynamic-sources.md`.

---

## Purpose Separation

| Purpose | Document to Use | Decidable Items |
|---------|----------------|-----------------|
| **Design direction decisions** | This document (architecture-guidance-sources) | Architecture patterns, best practices, service combination direction, security boundary design |
| **Deployment spec verification** | `azure-dynamic-sources.md` | API version, SKU, region, model availability, PE groupId, actual property values |

**What must NOT be decided using this document:**
- API version
- SKU names/pricing
- Region availability
- Model names/versions/deployment types
- PE groupId / DNS Zone mapping
- Specific values for resource properties

---

## Primary Sources

Targeted fetch targets for design direction decisions.

| ID | Document | URL | Purpose |
|----|----------|-----|---------|
| A1 | Azure Architecture Center | https://learn.microsoft.com/en-us/azure/architecture/ | Hub — Entry point for finding domain-specific documents |
| A2 | Well-Architected Framework | https://learn.microsoft.com/en-us/azure/architecture/framework/ | Security/reliability/performance/cost/operations principles |
| A3 | Cloud Adoption Framework / Landing Zone | https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/ | Enterprise governance, network topology, subscription structure |
| A4 | Azure AI/ML Architecture | https://learn.microsoft.com/en-us/azure/architecture/ai-ml/ | AI/ML workload reference architecture hub |
| A5 | Basic Foundry Chat Reference Architecture | https://learn.microsoft.com/en-us/azure/architecture/ai-ml/architecture/basic-azure-ai-foundry-chat | Basic Foundry-based chatbot structure |
| A6 | Baseline AI Foundry Chat Reference Architecture | https://learn.microsoft.com/en-us/azure/architecture/ai-ml/architecture/baseline-openai-e2e-chat | Foundry chatbot enterprise baseline (including network isolation) |
| A7 | RAG Solution Design Guide | https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide | RAG pattern design guide |
| A8 | Microsoft Fabric Overview | https://learn.microsoft.com/en-us/fabric/get-started/microsoft-fabric-overview | Fabric platform overview and workload understanding |
| A9 | Fabric Governance / Adoption | https://learn.microsoft.com/en-us/power-bi/guidance/fabric-adoption-roadmap-governance | Fabric governance, adoption roadmap |

## Secondary Sources (awareness only)

Not direct fetch targets; referenced only for change awareness.

| Document | URL | Notes |
|----------|-----|-------|
| Azure Updates | https://azure.microsoft.com/en-us/updates/ | Service changes/new feature announcements. Not a targeted fetch target |

---

## Fetch Trigger — When to Query

Architecture guidance documents are **not queried on every request.** Only perform targeted fetch when the following triggers apply.

### Trigger Conditions

0. **When the user's workload type is identified in Phase 1 (automatic)**
   - Pre-query the relevant workload's reference architecture to adjust question depth
   - Triggers automatically even if the user doesn't mention "best practice" etc.
   - Purpose: Reflect official architecture-based design decision points in questions, beyond SKU/region spec questions
1. **When the user requests design direction justification**
   - Keywords such as "best practice", "reference architecture", "recommended structure", "baseline", "well-architected", "landing zone", "enterprise pattern"
2. **When architecture boundaries for a new service combination are ambiguous**
   - Inter-service relationships that cannot be determined from existing reference files/service-gotchas
3. **When enterprise-level security/governance design is needed**
   - Subscription structure, network topology, landing zone patterns

### When Triggers Do Not Apply

- Simple resource creation (SKU/API version/region questions) → Use only `azure-dynamic-sources.md`
- Service combinations already covered in domain-packs → Prioritize reference files
- Bicep property value verification → `service-gotchas.md` or MS Docs Bicep reference

---

## Fetch Budget

| Scenario | Max Fetch Count |
|----------|----------------|
| Default (when trigger fires) | Architecture guidance documents **up to 2** |
| Additional fetch allowed when | Conflicts between documents / core design uncertainty remains / user explicitly requests deeper justification |
| Simple deployment spec questions | **0** (no architecture guidance queries) |

---

## Decision Rule by Question Type

| Question Type | Documents to Query | Design Decision Points to Extract | Documents NOT to Query |
|--------------|-------------------|----------------------------------|----------------------|
| RAG / chatbot / Foundry app | A5 or A6 + A7 | Network isolation level, authentication method (managed identity vs key), indexing strategy (push vs pull), monitoring scope | Do not traverse entire Architecture Center |
| Enterprise security / governance / landing zone | A2 + A3 | Subscription structure, network topology (hub-spoke etc.), identity/governance model, security boundary | AI/ML domain documents not needed |
| Fabric data platform | A8 + A9 | Capacity model (SKU selection criteria), governance level, data boundary (workspace separation etc.) | AI-related documents not needed |
| Ambiguous service combination (unclear pattern) | A1 (find closest domain document from hub) + that document | Key design decision points identified from the document | Do not traverse all sub-documents |
| Simple resource creation values (SKU/API/region) | No query | — | All architecture guidance |
| General AI/ML architecture | A4 (hub) + closest reference architecture | Compute isolation, data boundary, model serving approach | Do not crawl entirely |

---

## URL Fallback Rule

1. Use `en-us` Learn URLs by default
2. If a specific URL returns 404 / redirect / deprecated → Fall back to the parent hub page
   - Example: If A5 fails → Search for "foundry chat" keyword on A4 (AI/ML hub)
3. If not found on the parent hub either → Search by title keyword on A1 (Architecture Center main)
4. **Do not use the contents of a URL as fixed rules just because the URL exists**

---

## Full Traversal Prohibited

- Do not broadly traverse (crawl) Architecture Center sub-documents
- Only targeted fetch 1–2 related documents according to the decision rule by question type
- Even within fetched documents, only reference relevant sections; do not read the entire document
- Unlimited fetching, recursive link following, and sub-page enumeration are prohibited
