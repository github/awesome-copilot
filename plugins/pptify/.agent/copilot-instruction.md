<!-- pptify-managed: do not edit manually -->
# pptify Generic Coding-Agent Instructions

Use the installed `./.agent` assets as the local pptify runtime context.

## Installed Context

- Skills: `./.agent/skills/pptify-*`
- Workflows: `./.agent/workflows`
- Design profiles and predefined templates: `./.agent/pptify-design`
- Plugin tool set: `./.agent/pptify-plugin`
- Image provider environment template: `./.agent/.env.template`
- Developer-protection policy: `./.agent/pptify-policy.md`

## Agent Rules

- Read `./.agent/pptify-policy.md` before generating or repairing a deck.
- For every new generated deck, choose and load a `./.agent/pptify-design`
    profile before authoring slides unless a user-provided brand guide or
    reference PPTX is the primary style source. Default to
    `fluent-ui-design-tokens`; for developer decks use `primer-primitives`; for
    consulting/governance decks use `likaku-mck-ppt-design-skill`; use
    `corazzon-pptx-design-styles` only when a broader modern style catalog is
    explicitly useful.
- Record selected profile IDs, source URLs, palette, typography, spacing rhythm,
    and signature elements in `summary.design_context`.
- Treat plain white, Calibri-only, bullet-heavy `python-pptx`-looking output as
    not production-ready.
- Use scripts under `./.agent/pptify-plugin` for source ingestion, design
    context loading, visual assets, PPTX extraction, and audit checks.
- When image generation needs provider configuration or credentials, create
    `./.agent/.env` from `./.agent/.env.template` and have the user fill secrets
    directly in that file. Do not ask for secrets in chat or prompt dialogs.
- Keep generated specs coordinate-explicit and preserve source/license metadata
    from the selected design profile.
