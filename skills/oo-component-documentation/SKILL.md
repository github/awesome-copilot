---
name: oo-component-documentation
description: 'Create or update standardized object-oriented component documentation using a shared template plus mode-specific guidance for new and existing docs.'
---

# OO Component Documentation

Create new documentation for an object-oriented component or update an existing component documentation file by analyzing the current implementation.

## Determine the mode first

Choose the workflow before writing anything:

1. Use **update mode** when the user provides an existing documentation Markdown file, points to a docs path, or explicitly asks to refresh or revise existing documentation. Follow [references/update-mode.md](references/update-mode.md).
2. Use **create mode** when the user provides a source file or folder, points to a component path, or asks to generate documentation from code. Follow [references/create-mode.md](references/create-mode.md).
3. If both code and an existing documentation file are provided, treat the existing documentation file as the output target and use the current source code as the source of truth.
4. If the request is ambiguous, infer the mode from the path type whenever possible: existing Markdown documentation file means update mode; source/component path means create mode.

## Documentation standards

- DOC-001: Follow C4 Model documentation levels (Context, Containers, Components, Code)
- DOC-002: Align with Arc42 software architecture documentation template
- DOC-003: Comply with IEEE 1016 Software Design Description standard
- DOC-004: Use Agile Documentation principles (just enough documentation that adds value)
- DOC-005: Target developers and maintainers as the primary audience

## Shared analysis guidance

- ANA-001: Determine the primary component boundary and whether the input represents a folder, file, or existing documentation target
- ANA-002: Examine source code files for class structures, inheritance, composition, and interfaces
- ANA-003: Identify design patterns, architectural decisions, and integration points
- ANA-004: Document or refresh public APIs, interfaces, dependencies, and usage patterns
- ANA-005: Capture method parameters, return values, asynchronous behavior, exceptions, and lifecycle concerns
- ANA-006: Assess performance, security, reliability, maintainability, and extensibility characteristics
- ANA-007: Infer data flow, collaboration patterns, and relationships with surrounding components
- ANA-008: Keep the documentation grounded in the implementation; avoid inventing behavior that is not supported by the code

## Shared output requirements

- Use [assets/documentation-template.md](assets/documentation-template.md) as the canonical section checklist and baseline structure.
- Keep the output in Markdown with a clear heading hierarchy, tables where useful, code blocks for examples, and Mermaid diagrams when architecture relationships need to be visualized.
- Make examples and interface descriptions match the current implementation instead of generic placeholders.
- Include only information that can be supported by the code, project structure, configuration, or clearly stated assumptions.
- When source coverage is incomplete, document the limitation explicitly instead of guessing.

## Language-specific optimizations

- LNG-001: **C#/.NET** - async/await, dependency injection, configuration, disposal, options patterns
- LNG-002: **Java** - Spring framework, annotations, exception handling, packaging, dependency injection
- LNG-003: **TypeScript/JavaScript** - modules, async patterns, types, npm dependencies, runtime boundaries
- LNG-004: **Python** - packages, virtual environments, type hints, testing, dependency management

## Error handling

- ERR-001: If the path does not exist, explain what path was expected and whether the skill needs a source path or an existing documentation file
- ERR-002: If no relevant source files are found, document the gap and suggest the likely locations to inspect next
- ERR-003: If the documentation target cannot be inferred from the request, state the ambiguity and ask for the missing path only when inference is not possible
- ERR-004: If the code uses non-standard architectural patterns, document the custom approach rather than forcing it into a generic pattern
- ERR-005: If source access is incomplete, continue with available evidence and clearly call out any unsupported sections

## Workflow

1. Determine whether the task is create mode or update mode.
2. Inspect the component implementation and any related files needed to understand its public surface area and internal structure.
3. Use [assets/documentation-template.md](assets/documentation-template.md) as the shared documentation scaffold.
4. Apply the mode-specific rules in [references/create-mode.md](references/create-mode.md) or [references/update-mode.md](references/update-mode.md).
5. Produce or revise the documentation so that diagrams, examples, interfaces, dependencies, and quality attributes reflect the current implementation.

## Completion criteria

- The documentation clearly identifies the component purpose, architecture, interfaces, implementation details, usage patterns, quality attributes, and references.
- Front matter fields are accurate for the selected mode.
- Examples and diagrams match the implementation.
- Any unknowns, gaps, or assumptions are explicitly called out.
