# Skeleton: 1.1-threatmodel.mmd

> **⛔ This is a raw Mermaid file — NO markdown wrapper. Line 1 MUST start with `%%{init:`.**
> **The init block, classDefs, and linkStyle are FIXED — never change colors/strokes.**
> **Diagram direction is ALWAYS `flowchart LR` — NEVER `flowchart TB`.**
> **⛔ The template below is shown inside a code fence for readability only — do NOT include the fence in the output file.**

---

```
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#ffffff', 'lineColor': '#666666' }}}%%
flowchart LR
    classDef process fill:#6baed6,stroke:#2171b5,stroke-width:2px,color:#000000
    classDef external fill:#fdae61,stroke:#d94701,stroke-width:2px,color:#000000
    classDef datastore fill:#74c476,stroke:#238b45,stroke-width:2px,color:#000000
    [CONDITIONAL: incremental mode — include BOTH lines below]
    classDef newComponent fill:#d4edda,stroke:#28a745,stroke-width:3px,color:#000000
    classDef removedComponent fill:#e9ecef,stroke:#6c757d,stroke-width:1px,stroke-dasharray:5,color:#6c757d
    [END-CONDITIONAL]

    [REPEAT: one line per external actor/interactor — outside all subgraphs]
    [FILL: NodeID]["[FILL: Display Name]"]:::external
    [END-REPEAT]

    [REPEAT: one subgraph per trust boundary]
    subgraph [FILL: BoundaryID]["[FILL: Boundary Display Name]"]
        [REPEAT: processes and datastores inside this boundary]
        [FILL: NodeID](("[FILL: Process Name]")):::process
        [FILL: NodeID][("[FILL: DataStore Name]")]:::datastore
        [END-REPEAT]
    end
    [END-REPEAT]

    [REPEAT: one line per data flow — use <--> for bidirectional request-response]
    [FILL: SourceID] <-->|"[FILL: DF##: description]"| [FILL: TargetID]
    [END-REPEAT]

    [REPEAT: one style line per trust boundary subgraph]
    style [FILL: BoundaryID] fill:none,stroke:#e31a1c,stroke-width:3px,stroke-dasharray: 5 5
    [END-REPEAT]

    linkStyle default stroke:#666666,stroke-width:2px
```

**NEVER change these fixed elements:**
- `%%{init:` themeVariables: only `background`, `primaryColor`, `lineColor`
- `flowchart LR` — never TB
- classDef colors: process=#6baed6/#2171b5, external=#fdae61/#d94701, datastore=#74c476/#238b45
- Incremental classDefs (when applicable): newComponent=#d4edda/#28a745 (light green), removedComponent=#e9ecef/#6c757d (gray dashed)
- New components MUST use `:::newComponent` (NOT `:::process`). Removed components MUST use `:::removedComponent`.
- Trust boundary style: `fill:none,stroke:#e31a1c,stroke-width:3px,stroke-dasharray: 5 5`
- linkStyle: `stroke:#666666,stroke-width:2px`

**DFD shapes:**
- Process: `(("Name"))` (double parentheses = circle)
- Data Store: `[("Name")]` (bracket-paren = cylinder)
- External: `["Name"]` (brackets = rectangle)
- All labels MUST be quoted in `""`
- All subgraph IDs: `subgraph ID["Title"]`

<!-- ⛔ POST-DFD GATE — IMMEDIATELY after creating this file:
  1. Count element nodes: lines with (("...")), [("...")], ["..."] shapes
  2. Count boundaries: lines with 'subgraph'
  3. If elements > 15 OR boundaries > 4:
     → OPEN skeleton-summary-dfd.md and create 1.2-threatmodel-summary.mmd NOW
     → Do NOT proceed to 1-threatmodel.md until summary exists
  4. If threshold NOT met → skip summary, proceed to 1-threatmodel.md
  This is the most frequently skipped step. The gate is MANDATORY. -->
