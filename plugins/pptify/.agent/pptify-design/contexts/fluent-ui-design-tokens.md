# Fluent UI Design Token Context

Source-backed predefined design-system context.

- Source repository: https://github.com/microsoft/fluentui
- Source docs: https://github.com/microsoft/fluentui/blob/master/docs/architecture/design-tokens.md
- Source agent instructions: https://github.com/microsoft/fluentui/blob/master/AGENTS.md
- License: MIT; see [third-party-notices.md](../third-party-notices.md)
- Retrieved: 2026-05-18

## Selected Source Excerpts

From `docs/architecture/design-tokens.md`:

```md
# Design Tokens

## Rule

**Always use design tokens** from `@fluentui/react-theme` instead of hardcoded values.
Hardcoded values break theming, high contrast mode, and dark mode.
```

```md
## Token Categories

| Category      | Example tokens                                                | Use for              |
| ------------- | ------------------------------------------------------------- | -------------------- |
| Color         | `tokens.colorNeutralForeground1`, `tokens.colorBrandBackground` | All colors           |
| Spacing       | `tokens.spacingVerticalM`, `tokens.spacingHorizontalL`          | Padding, margin, gap |
| Border radius | `tokens.borderRadiusMedium`, `tokens.borderRadiusLarge`         | Border radius        |
| Font          | `tokens.fontSizeBase300`, `tokens.fontWeightSemibold`           | Typography           |
| Line height   | `tokens.lineHeightBase300`                                      | Line height          |
| Stroke        | `tokens.strokeWidthThin`, `tokens.strokeWidthThick`             | Border width         |
| Shadow        | `tokens.shadow4`, `tokens.shadow16`                             | Box shadow           |
| Duration      | `tokens.durationNormal`, `tokens.durationFast`                  | Animations           |
| Easing        | `tokens.curveEasyEase`                                          | Animation timing     |
```

```md
## Available Themes

- `webLightTheme` - Default light
- `webDarkTheme` - Default dark
- `teamsLightTheme` / `teamsDarkTheme` / `teamsHighContrastTheme` - Teams variants
```

From `AGENTS.md`:

```md
## Critical Rules (never violate)

1. **Never hardcode colors, spacing, or typography values.** Always use design tokens from `@fluentui/react-theme`. See [docs/architecture/design-tokens.md](docs/architecture/design-tokens.md).
```

```tsx
// Styles - always use tokens, never hardcoded values
import { makeStyles } from '@griffel/react';
import { tokens } from '@fluentui/react-theme';

export const useComponentNameStyles = makeStyles({
  root: {
    color: tokens.colorNeutralForeground1,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
  },
});
```

## Source Signals for LLM Context

- Token categories from source: color, spacing, border radius, font, line height, stroke, shadow, duration, easing.
- Theme variants from source: `webLightTheme`, `webDarkTheme`, `teamsLightTheme`, `teamsDarkTheme`, `teamsHighContrastTheme`.
- Agent behavior from source: avoid hardcoded styling when the target design system exposes tokens.

## PPTify Translation Guardrails

- Use this context for Microsoft, Teams, M365, Power Platform, and enterprise product decks.
- `pptify` JSON uses concrete values, so include Fluent token names in `summary.design_context` when translating to theme values.
- Prefer restrained, utilitarian, accessibility-aware slide structure for operational and enterprise decks.
- Do not copy Fluent fonts or icons as assets from this context pack; use separately licensed assets only when explicitly sourced.