---
name: mermaid-markdown-diagrams
description: >-
  Create or update Mermaid diagrams in Markdown. Use when asked to render a
  supplied model or description as C4, sequence, flowchart, state, or ER
  diagrams, and to validate Mermaid syntax when a local renderer is available.
---

# Mermaid Markdown Diagrams

Use Mermaid fenced code blocks for diagrams intended to live in Markdown.
This skill handles notation and rendering; it does not invent an architecture
model. When working with the C4 Architecture Modeling skill, preserve the
provided elements, relationships, and labels while translating them to
Mermaid.

## Workflow

1. Determine the question the diagram must answer and the intended audience.
   Adapt terms and detail to that audience; default to mixed technical readers.
2. Start from the user's description or supplied model. Do not inspect a
   repository unless the user asks for an as-built diagram or explicitly
   supplies repository context.
3. Choose the smallest suitable diagram type from the table below. Suggest a
   diagram when it would help an architecture task, but do not add one to
   unrelated work without being asked.
4. Ask a focused question if a missing fact changes the diagram's structure.
   Otherwise make the smallest reasonable assumption and label it in nearby
   Markdown.
5. Add or update the target Markdown document. If no target is named, use an
   obvious existing document only when repository context makes it clear;
   otherwise ask before selecting or creating a file.
6. Validate with an already available Mermaid parser or renderer. If none is
   available, review the syntax manually and state that it was not rendered.
   Do not install tools or claim validation that did not happen.

## Select a diagram type

| Question | Mermaid type |
| --- | --- |
| Who is in a system and what external systems does it depend on? | `C4Context` |
| What applications, services, and data stores make up the system? | `C4Container` |
| Where do containers run, and in what environment? | `C4Deployment` |
| What responsibilities are inside one complex container? | `C4Component`, only when needed |
| What happens in one specific interaction over time? | `sequenceDiagram`; use `C4Dynamic` sparingly for a C4-focused view |
| What steps or decisions make up a process? | `flowchart` |
| How does an entity change state during its lifecycle? | `stateDiagram-v2` |
| What entities and relationships make up a data model? | `erDiagram` |

Prefer C4 Context and Container for a general architecture overview. Add
Deployment when placement matters; do not generate every supported type by
default. Mermaid has no native C4 Code diagram. The `architecture-beta` syntax
is beta and is not a default choice.

## Mermaid and Markdown rules

- Put diagram source in a fenced block tagged `mermaid`. Keep headings, scope,
  legends, source references, and assumptions in ordinary Markdown around it.
- Use concise labels and preserve the meaning and direction of the supplied
  relationships. Do not turn an inferred relationship into a verified fact.
- Mermaid C4 layout follows statement order rather than automatic placement.
  Reorder statements first and keep labels concise; Mermaid C4 has limited
  layout controls.
- Mermaid C4 does not support a built-in legend, tags, or sprites. Add a
  nearby Markdown legend when colors or abbreviations need explanation; do not
  rely on unsupported C4 features.
- Mermaid C4 Dynamic relationships render in statement order; do not rely on
  `RelIndex` to reorder them.
- If native Mermaid C4 layout is unusable, a flowchart may be used as a clearly
  labeled "C4-inspired" fallback. Do not present it as native C4.
- Mermaid syntax errors can result from unknown words, while invalid parameters
  may be silently ignored. Check diagram-type-specific syntax and parameter
  names, then render when possible. Avoid braces in Mermaid `%%` comments.
- Mermaid renderer versions differ. Do not assume the target Markdown host
  supports the same features as a local renderer; mention version-sensitive
  behavior when it affects the output.

## Sources and assumptions

For diagrams explicitly derived from repository files, add a short
`Sources and assumptions` section beside the diagram. Cite relevant file paths,
state what was observed, and mark inferred details. For diagrams based only on
the user's description, label important assumptions without implying that
repository evidence was checked.

## References

- [Mermaid syntax reference](https://mermaid.js.org/intro/syntax-reference.html)
- [Mermaid C4 syntax](https://mermaid.js.org/syntax/c4.html)
- [Mermaid flowcharts](https://mermaid.js.org/syntax/flowchart.html)
- [Mermaid sequence diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html)
- [Mermaid state diagrams](https://mermaid.js.org/syntax/stateDiagram.html)
- [Mermaid ER diagrams](https://mermaid.js.org/syntax/entityRelationshipDiagram.html)
- [Mermaid architecture diagrams](https://mermaid.js.org/syntax/architecture.html)
- [GitHub diagrams in Markdown](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)
