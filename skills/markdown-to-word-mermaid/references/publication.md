# Scope and evaluation notes

## Scope vs. general Markdown converters

This skill converts Markdown documents containing Mermaid code fences into Word (`.docx`) documents. It renders diagrams locally with Mermaid CLI, embeds vector SVG through Office OOXML relationships (`asvg:svgBlip`), retains 3x PNG fallbacks, and keeps tall diagrams together with page-aware placement.

A general converter such as `md-to-docx` handles Markdown body content and pre-rendered PNG images. Use `markdown-to-word-mermaid` when the input contains Mermaid source fences that must be rendered into vector SVGs with Office-compatible text labels (`htmlLabels: false`) and page-aware sizing. Embedding an SVG does not make individual diagram nodes, connectors, or labels editable as native Word shapes.

## Evaluation cases

| Input / request | Expected behavior |
| --- | --- |
| Export a design document with Mermaid flowcharts to Word | Select this skill and embed both vector SVG and PNG fallback in the DOCX |
| Export a runbook containing a tall Mermaid diagram to Word | Keep the diagram together on a page, starting on a new page and scaling when needed |
| Convert a plain Markdown document that only links to existing PNG images | Prefer a general Markdown-to-DOCX converter if Mermaid rendering is not needed |
| Edit individual Mermaid shapes and connectors directly inside Word | Explain that embedded SVGs are not editable Office shapes and suggest an editable-diagram workflow |
| Mermaid CLI or a compatible local browser is unavailable | Report the missing prerequisite and stop before rendering or installing packages without approval |

## Verification checklist

- Confirm that sample fixtures and generated outputs contain no confidential paths, credentials, or non-synthetic data.
- Run the unit test suite (`python -m unittest discover -s tests -v`) to verify SVG relationship injection, PNG fallback retention, custom font propagation, ordered list numbering, diagram alt text, timeout handling, and atomic output staging.
- When `MERMAID_CLI` is configured, run the real-renderer test against `assets/example.md` and confirm that no `foreignObject` label elements remain in the embedded SVGs.
- Perform visual inspection in Word separately from automated package tests, checking label sharpness, connectors, font appearance, and pagination.
