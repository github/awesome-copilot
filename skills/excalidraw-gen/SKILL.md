---
name: excalidraw-gen
description: >
  Generate Excalidraw diagram files from a structured JSON or YAML input spec.
  Use this skill whenever a user asks for a diagram, flowchart, architecture
  diagram, pipeline, or any visual graph that should open in Excalidraw.
  The skill covers authoring the input file and invoking the CLI.
---

# excalidraw-gen — Diagram Generation Skill

`excalidraw-gen` converts a structured JSON or YAML description into a fully
laid-out `.excalidraw` file that opens directly in [excalidraw.com](https://excalidraw.com)
or the Excalidraw desktop app.

**Your job as an agent**: produce the correct input file. The CLI handles all layout, routing, and rendering automatically.

---

## Skill files

This skill is split across focused reference files. Read the ones relevant to your current task:

| File                                     | Contents                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| [schema.md](schema.md)                   | Full input file schema — top-level fields, node fields, edge fields        |
| [node-types.md](node-types.md)           | All node `type` values for the `flowchart` and `architecture` templates    |
| [style-overrides.md](style-overrides.md) | Per-node and per-edge `style` fields + recommended colour palette          |
| [validation.md](validation.md)           | Validation rules — what causes errors vs warnings                          |
| [examples.md](examples.md)               | Annotated JSON and YAML examples (minimal, styled, architecture, pipeline) |
| [agent-workflow.md](agent-workflow.md)   | Step-by-step agent checklist + common diagram patterns                     |

---

## CLI invocation

```bash
# Using npx (no install required)
npx excalidraw-gen generate <input-file> [options]

# Options
--template   flowchart | architecture          (default: flowchart)
--theme      default | pastel | dark           (default: default)
--layout     dag | grid                        (default: dag)
--out        path/to/output.excalidraw         (default: stdout)
--max-nodes  <number>                          (default: 200)
```

**Template choice rule**:

- Use `--template flowchart` for processes, workflows, decision trees, pipelines, sequences.
- Use `--template architecture` for system diagrams, infrastructure, service maps, data flows between components.

**Layout choice rule**:

- `dag` — hierarchical top-to-bottom layout. Best for almost everything.
- `grid` — equal-spaced grid. Use only when nodes have no meaningful hierarchy (e.g. a legend or component catalogue).

**Theme choice rule**:

- `default` — clean white background, vivid colours. General purpose.
- `pastel` — lightened fills, same strokes. Presentations, documentation.
- `dark` — dark fills, brightened strokes, dark canvas. Dark-mode contexts.
