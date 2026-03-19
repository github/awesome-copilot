# Update mode

Use this workflow when the input is an existing documentation Markdown file or the user asks to refresh existing component documentation.

## Input handling

- Read the existing documentation first to understand the current structure, terminology, and any front matter metadata.
- Extract the component source path from the `component_path` front matter when present.
- If `component_path` is missing, infer the component path from the documentation content and surrounding repository structure.
- Use the current implementation as the source of truth when the documentation and code disagree.

## Update-specific requirements

- Preserve the existing documentation file as the output target.
- Preserve `date_created`.
- Update `last_updated` to the current date.
- Preserve version history and ownership metadata when still accurate; refresh them only when the code or repository evidence indicates they have changed.
- Maintain the existing organization where it is still useful, but ensure the content remains consistent with the shared template expectations.

## Update-specific analysis focus

- Compare the existing documentation with the current code to identify stale APIs, outdated diagrams, renamed dependencies, and changed usage patterns.
- Highlight breaking changes, deprecated features, or major architectural shifts when they are evident.
- Refresh method tables, examples, diagrams, dependency lists, and quality attribute notes to match the implementation as it exists today.
- Add missing sections only when the component has grown or the current documentation omits information now needed for maintainers.

## Update-specific output guidance

- Keep useful editorial choices from the existing document, but remove stale or misleading content.
- Update examples so they compile conceptually against the current API shape.
- Refresh Mermaid diagrams rather than replacing them with generic placeholders.
- Add migration notes or change history when the update reveals important compatibility or behavior changes.
