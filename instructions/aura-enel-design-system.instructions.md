---
description: 'Use for AURA Enel Design System requests, Enel brand styling, Zensical theme changes, MkDocs Material visual updates, CSS token alignment, typography, color palette, layout polish, dark mode tuning, component styling, accessibility, and documentation-site UI refinements.'
applyTo: 'mkdocs.yml, zensical.toml, docs/stylesheets/**/*.css, docs/**/*.md'
---

# AURA Enel Design System

Apply these instructions when editing documentation-site theme, style, and layout files.

## Primary Context

Start every task from these local sources before making changes:

1. `.github/skills/enel-design-system/SKILL.md`
2. `zensical.toml`
3. `docs/stylesheets/extra.css`
4. Any page, component, or asset file directly affected by the request

## Use This Instruction For

- Enel or AURA design-system alignment
- Theme token updates and color-system corrections
- Typography, spacing, and layout refinement
- Light/dark mode adjustments
- Header, tabs, navigation, footer, and button styling
- MkDocs Material or Zensical visual customization
- Documentation-site accessibility improvements tied to styling
- UI consistency reviews for docs pages

## Working Rules

1. Read local theme files first.
2. Prefer existing `--enel-*` tokens over one-off CSS values.
3. Keep the current scheme model: light `enel`, dark `slate`, with custom primary and accent colors.
4. Preserve accessibility, especially contrast, active states, focus visibility, and readable typography.
5. Keep changes minimal and consistent with the current repository style.

## AURA Source Handling

If the internal AURA page is unavailable from this environment:

- use the local Enel design-system skill and current repo theme as the baseline
- do not invent undocumented brand rules
- note the limitation briefly in the summary

If the page is available, extract concrete guidance and reconcile it with the repository implementation.

## AURA Baseline To Apply

When available, align edits with these page-level facts:

- Status: ONGOING
- Latest version: Release 3.1.3
- Problem focus: fragmented design practices and inconsistent CX/brand/assets
- Objective: consistent ecosystem-wide customer experience
- Pillars: Visual Inventory and Repository

Use this baseline to justify decisions and avoid arbitrary visual changes.

## Success Metrics Lens

For each substantial styling or component decision, include expected impact on at least one of:

1. Adoption Rate
2. Accessibility Score (AA)
3. Top Tasks' Usability
4. App Performance
5. Development Efficiency
6. Business KPIs

If no metric can be reasonably linked, explain why and keep the change minimal.

## Accessibility References

When accessibility is involved, prioritize:

1. Enel Official Accessibility Requirements
2. WCAG 2.1
3. Other AURA-linked institutional references

## Validation

After edits:

1. Check touched files for YAML or CSS issues.
2. Confirm selectors and token names match current conventions.
3. Summarize assumptions caused by unavailable AURA source material.
