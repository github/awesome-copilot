---
name: c4-architecture-modeling
description: >-
  Model software architecture as C4 diagrams in Markdown. Use when asked to
  design or explain a system with C4 Context, Container, Deployment, Component,
  or focused Dynamic views, using a description or explicitly supplied
  repository context.
---

# C4 Architecture Modeling

Use this skill to decide what an architecture diagram should say before
rendering it. It can be used on its own to create native Mermaid C4 diagrams.
When the Mermaid Markdown Diagrams skill is also in use, pass it the selected
view, elements, relationships, and labels for rendering and validation.

## Workflow

1. Establish the system boundary, question the diagram must answer, intended
   audience, and requested Markdown destination. Adapt terminology and detail
   to the audience; default to mixed technical readers.
2. Start from the user's description. Inspect repository files only when an
   as-built diagram is requested or repository context is explicitly supplied.
   Read relevant files without changing them.
3. If a missing fact changes system boundaries, ownership, or a relationship,
   ask a focused question. Otherwise make the smallest reasonable assumption
   and identify it next to the diagram.
4. Choose the smallest useful C4 view. Do not generate every view by default.
5. Model the elements and relationships, then write the native Mermaid C4
   block. Keep source evidence and assumptions in adjacent Markdown, not in
   diagram labels.
6. Validate with an already available Mermaid parser or renderer when possible.
   If none is available, review the syntax and state that the diagram was not
   rendered. Do not install tools or claim a render check that did not happen.

## Choose a view

| Need | View |
| --- | --- |
| Explain the system boundary, users, and external dependencies | C4 Context |
| Show the applications, services, and data stores inside one system | C4 Container |
| Explain the deployment environment and where containers run | C4 Deployment |
| Zoom in on the responsibilities inside one complex container | C4 Component, only when needed |
| Explain a specific runtime interaction | C4 Dynamic, sparingly; use a sequence diagram when that notation is clearer |

For a general architecture overview, prefer Context and Container. Add
Deployment when placement or infrastructure matters. Use a component view only
to answer a focused question about a container. C4's Code level is not
recommended for routine documentation; Mermaid has no native C4 Code diagram.
Do not imitate C4 syntax for a diagram that is not a C4 view.

## Model and describe

- Name the people, software systems, containers, and (when needed) components
  that matter to the question. Keep the system boundary explicit.
- Give each element a type and a short responsibility description. State a
  container's principal technology when it is known; do not guess technologies
  from naming alone.
- Make relationships directional and describe the actual purpose with a
  specific verb phrase. Avoid vague labels such as "Uses". Name the protocol on
  inter-container relationships when it is known.
- Keep separate concerns in separate views instead of compressing unrelated
  actors, dependencies, and deployment details into one diagram.
- Do not infer undocumented decisions as facts. For repository-derived views,
  add a short `Sources and assumptions` section with relevant paths and clearly
  mark which relationships are inferred.

## Markdown output

- Use native Mermaid C4 types such as `C4Context`, `C4Container`,
  `C4Component`, `C4Dynamic`, and `C4Deployment`.
- Include a Markdown heading that identifies the view and its scope.
- Mermaid C4 does not provide a legend. Add a concise legend in nearby
  Markdown when the diagram uses abbreviations, colors, or non-obvious symbols.
- Prefer short labels. Mermaid C4 layout follows statement order and offers
  limited layout control; reorder statements before changing diagram type.
- If native C4 layout remains unusable, a Mermaid flowchart may be used only as
  a clearly labeled "C4-inspired" fallback, not represented as native C4.
- Edit the obvious existing Markdown document when the task requests a file
  update and repository context is supplied. If no target is named and no
  obvious document exists, ask before choosing or creating a file.

## References

- [C4 model diagrams](https://c4model.com/diagrams)
- [C4 notation](https://c4model.com/diagrams/notation)
- [C4 System Context](https://c4model.com/diagrams/system-context)
- [C4 Deployment](https://c4model.com/diagrams/deployment)
- [C4 Dynamic](https://c4model.com/diagrams/dynamic)
- [C4 Code](https://c4model.com/diagrams/code)
- [Mermaid C4 syntax](https://mermaid.js.org/syntax/c4.html)
