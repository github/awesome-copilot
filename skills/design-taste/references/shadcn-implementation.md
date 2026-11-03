# Shadcn Implementation

Use this when the project uses shadcn/ui, Radix UI, Base UI, Tailwind CSS, `components.json`, or a `components/ui` directory.

## Core Model

shadcn/ui is copied source, not a black-box component package. Treat it as project-owned code with a stable primitive foundation.

## Before Editing

- Check `components.json`.
- Check Tailwind version and configuration.
- Check path aliases.
- Check whether primitives are Radix UI or Base UI.
- Check existing `components/ui` variants before adding new ones.
- Check installed dependencies before importing a package.

## Composition Rules

- Prefer composing from existing `components/ui` before creating new primitives.
- Keep primitive components generic and reusable.
- Put product-specific wrappers outside `components/ui`.
- Do not fork a primitive for one screen when a wrapper or variant would solve it.
- Preserve ARIA attributes, keyboard behavior, focus management, and disabled semantics.

## Customization Rules

- Customize theme tokens before scattering one-off classes.
- Use `cn()` for class merging.
- Use `cva` or the local variant pattern when the component already uses it.
- Keep variants semantic: `primary`, `secondary`, `destructive`, `ghost`, `compact`, not `blue`, `big`, `marketing`.
- Do not leave default shadcn styling untouched if the project has a distinct brand language.
- Do not mix multiple primitive systems inside one interaction surface.

## Taste Rules

- shadcn gives structure, not taste. The default look is a starting point, not a design direction.
- Avoid stacking shadcn cards inside shadcn cards.
- Avoid the default SaaS pattern of `CardHeader`, `CardContent`, icon, title, description repeated everywhere.
- Make active navigation obvious enough to scan.
- Use semantic color and spacing tokens from the project.
- Keep radii consistent with the system. Inner radii should be smaller than outer radii.

## Forms

- Labels should be visible.
- Error messages should sit near the field.
- Helper text should be associated with the input.
- Loading and disabled states should be explicit.
- Use established form libraries only if the project already uses them or the form complexity justifies it.

## Verification

- Typecheck after adding components or variants.
- Test keyboard navigation for menus, dialogs, popovers, tabs, and dropdowns.
- Check mobile layout and touch targets.
- Check focus indicators after visual customization.
