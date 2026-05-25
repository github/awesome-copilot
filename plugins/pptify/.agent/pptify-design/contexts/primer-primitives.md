# Primer Primitives Context

Source-backed predefined design-system context.

- Source repository: https://github.com/primer/primitives
- Source docs: https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md
- Source tokens: `src/tokens/base/color/light/light.json5`, `src/tokens/functional/spacing/space.json5`, `src/tokens/functional/typography/typography.json5`
- License: MIT; see [third-party-notices.md](../third-party-notices.md)
- Retrieved: 2026-05-18

## Selected Source Excerpts

From `README.md`:

```md
This repo contains values for color, spacing, and typography primitives for use with Primer, GitHub's design system.

Data is served from the `dist/` folder:

- `dist/css` contains CSS files with values available as CSS variables
```

From `DESIGN_TOKENS_GUIDE.md`:

```md
## Core Rule

**You are a CSS expert. Never use raw values (hex, px, etc.). Only use semantic tokens.**
```

```md
### Typography

| Keyword    | Rule |
| ---------- | ---- |
| **MUST**   | Use **shorthand** tokens (e.g., `font: var(...)`) to ensure `line-height` and `font-weight` are synchronized. |
| **SHOULD** | Match the token to the **semantic role** (e.g., use `title` tokens for headers, not just a large `body` token). |
```

From `src/tokens/functional/spacing/space.json5`:

```json5
{
  space: {
    sm: {
      $value: '{base.size.8}',
      $type: 'dimension',
      $description: 'Default spacing for most UI elements. Comfortable visual density for standard component layouts.',
      $extensions: {
        'org.primer.llm': {
          usage: ['gap', 'padding', 'margin', 'flex-gap', 'grid-gap', 'card-padding'],
          rules: 'Default (8px). Use for standard component spacing, flex/grid item separation, container padding, and most element margins.',
        },
      },
    },
    lg: {
      $value: '{base.size.16}',
      $type: 'dimension',
      $description: 'Spacious spacing for major layout divisions and visual separation between content blocks.',
    },
  },
}
```

From `src/tokens/functional/typography/typography.json5`:

```json5
{
  text: {
    title: {
      shorthand: {
        medium: {
          $description: 'Default page title. The 32px-equivalent line-height matches with button and other medium control heights. Great for page header composition.',
          $extensions: {
            'org.primer.llm': {
              usage: ['section-heading', 'card-title', 'dialog-title', 'h2'],
              rules: 'RECOMMENDED default for page titles. Use for section headings and dialog titles.',
            },
          },
        },
      },
    },
    body: {
      shorthand: {
        medium: {
          $description: 'Default UI font. Most commonly used for body text.',
          $extensions: {
            'org.primer.llm': {
              usage: ['body-text', 'ui-text', 'form-label', 'button-text', 'navigation'],
              rules: 'RECOMMENDED default for UI text. Use for buttons, labels, and general interface text.',
            },
          },
        },
      },
    },
  },
}
```

From `src/tokens/base/color/light/light.json5`:

```json5
{
  base: {
    color: {
      black: { $value: { hex: '#1f2328' }, $type: 'color' },
      white: { $value: { hex: '#ffffff' }, $type: 'color' },
      neutral: {
        '1': { $value: { hex: '#F6F8FA' }, $type: 'color' },
        '12': { $value: { hex: '#25292E' }, $type: 'color' },
      },
      blue: {
        '5': { $value: { hex: '#0969da' }, $type: 'color' },
      },
      green: {
        '5': { $value: { hex: '#1a7f37' }, $type: 'color' },
      },
      red: {
        '5': { $value: { hex: '#cf222e' }, $type: 'color' },
      },
    },
  },
}
```

## Source Signals for LLM Context

- Token discipline: choose semantic roles for typography and spacing instead of arbitrary size jumps.
- Spacing signals from source: `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, with `sm` as 8px and `lg` as 16px in the source token scale.
- Typography signals from source: `display`, `title`, `subtitle`, `body`, `caption`, `codeBlock`, `codeInline` roles.
- Color signals from source: neutral GitHub-like surfaces and a clear blue accent around `#0969da`.

## PPTify Translation Guardrails

- Use this context for developer-facing, GitHub-style, or product/engineering decks.
- `pptify` JSON needs concrete theme values; when converting Primer tokens to concrete colors, keep source token names in the deck `summary.design_context` so the LLM-grounding remains visible.
- Prefer cards, tables, and compact sections with consistent spacing over decorative flourishes.