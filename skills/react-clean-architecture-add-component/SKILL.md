---
name: react-clean-architecture-add-component
description: "Create a new React component in src/components by asking component name and type (ui or features), then scaffold files that follow this repository rules, TypeScript strict typing, and Storybook/SCSS structure. Use when user types /add-component or asks to add a component."
argument-hint: "componentName type(ui|features)"
user-invocable: true
---

# Add Component

Use this skill when adding a new component under `src/components`.

Refer to this skill's bundled references for detailed rules.

- `references/component-architecture.md`
- `references/typescript-and-scss-rules.md`

If the `/add-component` input is incomplete, ask questions first before creating files.

## When To Use

- When the user runs `/add-component`
- When the user asks to add a new component
- When the user wants to create a component in either `ui` or `features`

## Required Questions

If any of the following information is missing, ask using `vscode_askQuestions`.

1. Component name
2. Type (`ui` or `features`)
3. Whether to replace existing components (only when creating `ui`)

Question requirements:

- Provide the type as options (`ui`, `features`)
- Require the component name to be in PascalCase
- For `ui`, ask whether direct Mantine usage in existing `features` should be replaced with the new component

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
- If the result is closer to `features`, do not proceed as `ui`; use `vscode_askQuestions` and confirm one of the following before continuing.
  - `Create as features`
  - `Keep ui and move state/logic to parent or features`

4. Create required files

- `ui`: `index.tsx`, `index.module.scss`, `index.stories.tsx`
- `features`: `index.tsx`, `use<ComponentName>.tsx`, `presentation.tsx`, `types.ts`, `presentation.module.scss`, `presentation.stories.tsx`

5. Replace existing usages (only when creating `ui`)

- Only when the user approves, replace equivalent direct Mantine implementations in existing `features` with the new `ui` component.

6. Validate

- Run `npm run build && npm run lint` for added/updated files and confirm whether errors exist.
- Follow `Storybook Minimum` in `references/component-architecture.md` for story state decisions.
- Ask the user via `vscode_askQuestions` whether to run a Storybook check (for example: "Run" / "Skip for now").
- Run `npm run storybook` only if the user selects "Run".
- If the user selects "Skip for now", explicitly mention in the final report that Storybook execution was skipped.

## Output Contract

- Report the list of files created.
- If replacements were performed, report the list of changed files and replacement details.
- Provide one usage example of the created component.
- Report whether Storybook verification was executed (run/skip), and if run, include the command used.
- Clearly state any unresolved items.
