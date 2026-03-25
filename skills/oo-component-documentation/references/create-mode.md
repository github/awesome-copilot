# Create mode

Use this workflow when the input is a component source path or the user asks to generate new documentation from code.

## Input handling

- Accept a single file or a folder path representing the component.
- If the input is a folder, analyze the relevant source files in that folder and nearby supporting files.
- If the input is a single file, treat it as the primary component entry point and inspect adjacent files as needed to understand collaborators and interfaces.

## Create-specific requirements

- Save the new documentation in `/docs/components/`.
- Name the file `[component-name]-documentation.md`.
- Set `component_path` to the source path provided by the user.
- Set `date_created` to the current date.
- Set `last_updated` only if the repository convention for the target area expects it at creation time.
- Populate optional metadata such as `version`, `owner`, and `tags` only when they can be inferred reliably.

## Create-specific analysis focus

- Determine the primary component name and responsibilities from the code structure.
- Identify the initial system context, scope boundaries, dependencies, design patterns, and collaboration model.
- Build interface tables and usage examples from the actual public surface area.
- Create a Mermaid diagram that introduces the component structure, dependencies, and data flow for a reader seeing the documentation for the first time.

## Create-specific output guidance

- Use the full section structure from `../assets/documentation-template.md`.
- Write the introduction as a fresh overview of what the component does and why it exists.
- Prefer complete sections over placeholders; if information is unavailable, mark the section with a short limitation note instead of leaving template text behind.
- Include change history or migration notes only if there is evidence of prior versions or migration concerns in the code or repository history.
