---
name: react-container-presentation-component
description: "Create a React component using the Container/Presentation pattern in src/components by asking for the component name and type (ui or features), then scaffold files that follow this repository's TypeScript, Storybook, and SCSS conventions. Use when the user explicitly asks for a Container/Presentation-based component or runs /react-container-presentation-component."
argument-hint: "componentName type(ui|features)"
user-invocable: true
---

# Container/Presentation Component

Use this skill to create a React component under `src/components` that follows the Container/Presentation pattern.

Refer to this skill's bundled references for detailed rules.

- `references/component-architecture.md`
- `references/typescript-and-scss-rules.md`

If the `/react-container-presentation-component` input is incomplete, ask questions first before creating files.

## When To Use

- When the user runs `/react-container-presentation-component`
- When the user explicitly asks for a React component that follows the Container/Presentation pattern
- When the user wants help deciding or implementing `ui` vs `features` classification within the Container/Presentation pattern

## Required Questions

If any of the following information is missing, ask the user using `ask_user`.

1. Component name
2. Type (`ui` or `features`)
3. Whether to replace existing components (only when creating `ui`)

Question requirements:

- Provide the type as options (`ui`, `features`)
- Require the component name to be in PascalCase
- For `ui`, ask whether direct usage of Mantine or other UI libraries in existing `features` should be replaced with the new component

## Procedure

1. Check existing components

- Check whether `src/components/ui/<ComponentName>` or `src/components/features/<ComponentName>` already exists.
- If it exists, do not overwrite; confirm the preferred approach with the user.

2. Decide target directory

- `ui`: `src/components/ui/<ComponentName>`
- `features`: `src/components/features/<ComponentName>`

3. Re-check classification (only when `ui` is specified)

- Even when `ui` is specified, before creating files, review `Reclassification Rule` in `references/component-architecture.md`.
- If the implementation includes state management, side effects, async processing, context/store updates, or business logic, treat it as `features`.
- If the result is closer to `features`, do not proceed as `ui`; use `ask_user` and confirm one of the following before continuing.
  - `Create as features`
  - `Keep ui and move state/logic to parent or features`

4. Create required files

- `ui`: `index.tsx`, `index.module.scss`, `index.stories.tsx`
- `features`: `index.tsx`, `use<ComponentName>.tsx`, `presentation.tsx`, `types.ts`, `presentation.module.scss`, `presentation.stories.tsx`

5. Replace existing usages (only when creating `ui`)

- Only when the user approves, replace equivalent direct implementations using Mantine or other UI libraries in existing `features` with the new `ui` component.

6. Validate

- Run build and lint commands, and ensure both pass; if issues are introduced by newly added or updated files, fix them.
- Follow `Storybook Minimum` in `references/component-architecture.md` for story state decisions.
- Ask the user via `ask_user` whether to run a Storybook check (for example: "Run" / "Skip for now").
- Run `npm run storybook` only if the user selects "Run".
- If the user selects "Skip for now", explicitly mention in the final report that Storybook execution was skipped.

## Output Contract

- Report the list of files created.
- If replacements were performed, report the list of changed files and replacement details.
- Provide one usage example of the created component.
- Report whether Storybook verification was executed (run/skip), and if run, include the command used.
- Explain why the component was classified as `ui` or `features`.
- Summarize where state, side effects, and rendering responsibilities were placed.
- Confirm whether there were any dependency direction violations.
- Clearly state any unresolved items.
