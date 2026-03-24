---
name: azure-architecture-autopilot
description: >
  Design Azure infrastructure using natural language, or analyze existing Azure resources
  to auto-generate architecture diagrams, refine them through conversation, and deploy with Bicep.

  When to use this skill:
  - "Create X on Azure", "Set up a RAG architecture" (new design)
  - "Analyze my current Azure infrastructure", "Draw a diagram for rg-xxx" (existing analysis)
  - "Foundry is slow", "I want to reduce costs", "Strengthen security" (natural language modification)
  - Azure resource deployment, Bicep template generation, IaC code generation
  - Microsoft Foundry, AI Search, OpenAI, Fabric, ADLS Gen2, Databricks, and all Azure services
---

# Azure Architecture Builder

A pipeline that designs Azure infrastructure using natural language, or analyzes existing resources to visualize architecture and proceed through modification and deployment.

The diagram engine is **embedded within the skill** (`scripts/` folder).
No `pip install` needed — it directly uses the bundled Python scripts
to generate interactive HTML diagrams with 605+ official Azure icons.
Ready to use immediately without network access or package installation.

## Automatic User Language Detection

**🚨 Detect the language of the user's first message and provide all subsequent responses in that language. This is the highest-priority principle.**

- If the user writes in Korean → respond in Korean
- If the user writes in English → **respond in English** (ask_user, progress updates, reports, Bicep comments — all in English)
- The instructions and examples in this document are written in English, and **all user-facing output must match the user's language**

**⚠️ Do not copy examples from this document verbatim to the user.**
Use only the structure as reference, and adapt text to the user's language.

## Tool Usage Guide (GHCP Environment)

| Feature | Tool Name | Notes |
|---------|-----------|-------|
| Fetch URL content | `web_fetch` | For MS Docs lookups, etc. |
| Web search | `web_search` | URL discovery |
| Ask user | `ask_user` | `choices` must be a string array |
| Sub-agents | `task` | explore/task/general-purpose |
| Shell command execution | `powershell` | Windows PowerShell |

> All sub-agents (explore/task/general-purpose) cannot use `web_fetch` or `web_search`.
> Fact-checking that requires MS Docs lookups must be performed **directly by the main agent**.

## External Tool Path Discovery

`az`, `python`, `bicep`, etc. are often not on PATH.
**Discover once before starting a Phase and cache the result. Do not re-discover every time.**

> **⚠️ Do not use `Get-Command python`** — risk of Windows Store alias.
> Direct filesystem discovery (`$env:LOCALAPPDATA\Programs\Python`) takes priority.

az CLI path:
```powershell
$azCmd = $null
if (Get-Command az -ErrorAction SilentlyContinue) { $azCmd = 'az' }
if (-not $azCmd) {
  $azExe = Get-ChildItem -Path "$env:ProgramFiles\Microsoft SDKs\Azure\CLI2\wbin", "$env:LOCALAPPDATA\Programs\Azure CLI\wbin" -Filter "az.cmd" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  if ($azExe) { $azCmd = $azExe }
}
```

Python path + embedded diagram engine: refer to the diagram generation section in `references/phase1-advisor.md`.

## Progress Updates Required

Use blockquote + emoji + bold format:
```markdown
> **⏳ [Action]** — [Reason]
> **✅ [Complete]** — [Result]
> **⚠️ [Warning]** — [Details]
> **❌ [Failed]** — [Cause]
```

## Parallel Preload Principle

While waiting for user input via `ask_user`, preload information needed for the next step in parallel.

| ask_user Question | Preload Simultaneously |
|---|---|
| Project name / scan scope | Reference files, MS Docs, Python path discovery, **diagram module path verification** |
| Model/SKU selection | MS Docs for next question choices |
| Architecture confirmation | `az account show/list`, `az group list` |
| Subscription selection | `az group list` |

---

## Path Branching — Automatically Determined by User Request

### Path A: New Design (New Build)

**Trigger**: "create", "set up", "deploy", "build", etc.
```
Phase 1 (references/phase1-advisor.md) — Interactive architecture design + diagram
    ↓
Phase 2 (references/bicep-generator.md) — Bicep code generation
    ↓
Phase 3 (references/bicep-reviewer.md) — Code review + compilation verification
    ↓
Phase 4 (references/phase4-deployer.md) — validate → what-if → deploy
```

### Path B: Existing Analysis + Modification (Analyze & Modify)

**Trigger**: "analyze", "current resources", "scan", "draw a diagram", "show my infrastructure", etc.
```
Phase 0 (references/phase0-scanner.md) — Existing resource scan + diagram
    ↓
Modification conversation — "What would you like to change here?" (natural language modification request → follow-up questions)
    ↓
Phase 1 (references/phase1-advisor.md) — Confirm modifications + update diagram
    ↓
Phase 2~4 — Same as above
```

### When Path Determination Is Ambiguous

Ask the user directly:
```
ask_user({
  question: "What would you like to do?",
  choices: [
    "Design a new Azure architecture (Recommended)",
    "Analyze + modify existing Azure resources"
  ]
})
```

---

## Phase Transition Rules

- Each Phase reads and follows the instructions in its corresponding `references/*.md` file
- When transitioning between Phases, always inform the user about the next step
- Do not skip Phases (especially the what-if between Phase 3 → Phase 4)
- **🚨 Required condition for Phase 1 → Phase 2 transition**: `01_arch_diagram_draft.html` must have been generated using the embedded diagram engine and shown to the user. **Do not proceed to Bicep generation without a diagram.** Completing spec collection alone does not mean Phase 1 is done — Phase 1 includes diagram generation + user confirmation.
- Modification request after deployment → return to Phase 1, not Phase 0 (Delta Confirmation Rule)

## Service Coverage & Fallback

### Optimized Services
Microsoft Foundry, Azure OpenAI, AI Search, ADLS Gen2, Key Vault, Microsoft Fabric, Azure Data Factory, VNet/Private Endpoint, AML/AI Hub

### Other Azure Services
All supported — MS Docs are automatically consulted to generate at the same quality standard.
**Do not send messages that cause user anxiety such as "out of scope" or "best-effort".**

### Stable vs Dynamic Information Handling

| Category | Handling Method | Examples |
|----------|----------------|---------|
| **Stable** | Reference files first | `isHnsEnabled: true`, PE triple set |
| **Dynamic** | **Always fetch MS Docs** | API version, model availability, SKU, region |

## Quick Reference

| File | Role |
|------|------|
| `references/phase0-scanner.md` | Existing resource scan + relationship inference + diagram |
| `references/phase1-advisor.md` | Interactive architecture design + fact checking |
| `references/bicep-generator.md` | Bicep code generation rules |
| `references/bicep-reviewer.md` | Code review checklist |
| `references/phase4-deployer.md` | validate → what-if → deploy |
| `references/service-gotchas.md` | Required properties, PE mappings |
| `references/azure-dynamic-sources.md` | MS Docs URL registry |
| `references/azure-common-patterns.md` | PE/security/naming patterns |
| `references/ai-data.md` | AI/Data service guide |
