# Skeleton: 1.2-threatmodel-summary.mmd

> **⛔ ALWAYS evaluate this skeleton after creating `1.1-threatmodel.mmd`.**
> Count elements (nodes with `(("..."))`, `[("...")]`, `["..."]`) and boundaries (`subgraph`) in the detailed DFD.
> - If elements > 15 OR boundaries > 4 → this file is **REQUIRED**. Fill the template below.
> - If elements ≤ 15 AND boundaries ≤ 4 → **SKIP** this file. Proceed to `1-threatmodel.md`.
> **⛔ This is a raw Mermaid file. The template below is shown inside a code fence for readability only — do NOT include the fence in the output file. The `.mmd` file must start with `%%{init:` on line 1.**

---

```
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#ffffff', 'lineColor': '#666666' }}}%%
flowchart LR
    classDef process fill:#6baed6,stroke:#2171b5,stroke-width:2px,color:#000000
    classDef external fill:#fdae61,stroke:#d94701,stroke-width:2px,color:#000000
    classDef datastore fill:#74c476,stroke:#238b45,stroke-width:2px,color:#000000

    [FILL: External actors — keep all, do not aggregate]
    [FILL: ExternalActor]["[FILL: Name]"]:::external

    [REPEAT: one subgraph per trust boundary — ALL boundaries MUST be preserved]
    subgraph [FILL: BoundaryID]["[FILL: Boundary Name]"]
        [FILL: Aggregated and individual nodes]
    end
    [END-REPEAT]

    [REPEAT: summary data flows using SDF prefix]
    [FILL: Source] <-->|"[FILL: SDF##: description]"| [FILL: Target]
    [END-REPEAT]

    [REPEAT: boundary styles]
    style [FILL: BoundaryID] fill:none,stroke:#e31a1c,stroke-width:3px,stroke-dasharray: 5 5
    [END-REPEAT]

    linkStyle default stroke:#666666,stroke-width:2px
```

## Aggregation Rules

**Reference:** `diagram-conventions.md` → Summary Diagram Rules for full details.

1. **ALL trust boundaries MUST be preserved** — never combine or omit boundaries.
2. **Keep individually:** entry points, core flow components, security-critical services, primary data stores, all external actors.
3. **Aggregate only:** supporting infrastructure, secondary caches, multiple externals at same trust level.
4. **Aggregated element labels MUST list contents:**
   ```
   DataLayer[("Data Layer<br/>(UserDB, OrderDB, Redis)")]
   SupportServices(("Supporting<br/>(Logging, Monitoring)"))
   ```
5. **Flow IDs:** Use `SDF` prefix: `SDF01`, `SDF02`, ...

## Required in `1-threatmodel.md`

When this file is generated, `1-threatmodel.md` MUST include:
- A `## Summary View` section with this diagram in a ` ```mermaid ` fence
- A `## Summary to Detailed Mapping` table:

```markdown
| Summary Element | Contains | Summary Flows | Maps to Detailed Flows |
|----------------|----------|---------------|------------------------|
| [FILL] | [FILL: list of detailed elements] | [FILL: SDF##] | [FILL: DF## list] |
```
