---
name: gem-design-md-guidelines
description: Create or validate accessible web, desktop, mobile, or cross-platform UI/UX with DESIGN.md token compliance, responsive layouts, platform conventions, dark mode, motion, and WCAG guidance.
---

# UI/UX Design Guidelines

## Activation and use

Use for web, desktop, mobile, or cross-platform UI/UX design: layouts, themes, components, design-system updates, visual validation. Select platform branch before designing. Apply shared guidance to every branch, then add branch-specific requirements.

Before designing, identify purpose, problem, users/devices, existing design system, platform, framework, library, tokens, responsive requirements, dark-mode needs, and accessibility constraints. Preserve existing patterns unless brief requires change. Use smallest compliant solution; verify token references, responsive behavior, contrast, focus states, semantic structure, and reduced-motion before finalizing.

## Platform branches

### Web and desktop

- Semantic HTML before ARIA; logical keyboard focus order, visible focus indicators, pointer/keyboard parity for interactive controls.
- Validate responsive breakpoints, 44x44px minimum touch targets, readable line lengths, no horizontal scrolling.
- Preserve existing component library and layout system. CSS-only motion where possible.

### iOS

- Apple Human Interface Guidelines for navigation, system icons, sheets, modals, feedback, gestures.
- Safe areas: notch, Dynamic Island, status bar, home indicator, keyboard avoidance, landscape.
- 44pt minimum touch targets with at least 8pt between targets. VoiceOver, Dynamic Type, reduced motion support.
- Prefer SF Pro or existing system font; system colors for platform feedback; map shared semantic roles to iOS tokens.
- Appropriate spring timing; meaningful haptics paired with visual or textual signal.

### Android

- Material 3 for top bars, navigation bars/rails, FABs, cards, dialogs, pressed states, navigation.
- Status bars, gesture navigation, keyboard avoidance, cutouts, portrait or landscape.
- 48dp minimum touch targets with at least 8dp between targets. TalkBack, font scaling, reduced motion support.
- Prefer Roboto or existing system font; Material 3 or tokenized platform colors; dynamic color only when it fits product requirements.
- Elevation and Material motion tokens; preserve accessible press and state feedback.

### Cross-platform mobile

- Shared semantic tokens; map genuine differences with `Platform.select` or framework adapter; do not duplicate whole designs for superficial differences.
- React Native, Expo, Flutter: use existing component library and theme tokens before `StyleSheet.create` or custom styles. Never inline styles for static values.
- Specify platform variants for navigation, typography, elevation, shadows, safe areas, gestures, system feedback, haptics while keeping content hierarchy and interaction intent consistent.
- iOS and Android text scaling without clipping or hiding required actions.

## Shared mobile checks

- 8pt grid unless existing design system defines compatible system.
- Notch/cutout areas, status bars, home indicators, keyboard overlap, gesture conflicts, reachability.
- Specify loading, empty, error, refresh, content, selected, disabled, active states for lists and controls.
- 44pt on iOS and 48dp on Android for touch targets; at least 8pt/8dp between adjacent targets.
- `accessibilityLabel`, role, hint, and state values when framework requires them.

## DESIGN.md Spec Compliance

When creating or updating `DESIGN.md`, follow the Google DESIGN.md alpha structure:

1. YAML frontmatter with `version`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, and `components`.
2. `## Overview` for brand and style rationale.
3. `## Colors` for palette and semantic roles.
4. `## Typography` for font hierarchy and rationale.
5. `## Layout` for spacing system, grid, and container widths.
6. `## Elevation & Depth` for surface tiers or flat-design alternative.
7. `## Shapes` for corner radii and border styles.
8. `## Components` for token-referenced component definitions.
9. `## Do's and Don'ts` for practical guardrails.

Every value in the YAML `components:` block MUST use `{token.ref}` references. Do not use inline raw colors, spacing, dimensions, or other values there. Validate with `npx @google/design.md lint DESIGN.md` when available.

## Frontend Aesthetics

- Typography: Preserve existing typography by default. Choose distinctive fonts and a display/body pair only when
  the brief or design system requires it. Load fonts through the existing project approach.
- Color: Use existing tokens and CSS variables. Apply the 60-30-10 rule when it fits the current design system.
- Motion: Use CSS-only motion on web and desktop where possible. Use platform-consistent springs or Material motion
  tokens on mobile.
- Spatial: Preserve the existing layout pattern unless the brief requests a new composition.
- Backgrounds: Use existing surfaces and effects by default.
- Do not reject standard fonts, solid surfaces, predictable grids, or existing components without a task-specific
  reason.

For mobile, preserve existing fonts, lists, icons, and navigation patterns unless the brief requires a change. Use
system UI fonts by default: SF Pro on iOS and Roboto on Android. Use shared fonts with platform mapping only when the
product requires cross-platform branding. Load them through the existing platform approach, such as `expo-font`,
`react-native-google-fonts`, or embedded font assets.

## Color Strategy (Dark Mode)

- Invert backgrounds from light to dark while preserving text contrast.
- Keep accents saturated enough to remain distinguishable on dark surfaces.
- Replace heavy shadows with restrained glows or surface contrast where appropriate.
- Check semantic roles and contrast in both light and dark themes.
- On OLED mobile surfaces, true black allowed only when it supports the product and remains compatible with the semantic token system. On Android, use Material 3 dark theme or equivalent tokenized dark theme.
- Share semantic palette roles across platforms and map them to platform-specific tokens instead of hard-coding separate palettes.

## Motion & Animation

- Orchestrate page-load motion instead of animating every element. Define consistent duration and easing standards.
- CSS-only implementations for web and desktop UI motion where possible. For mobile, use platform-consistent springs or Material motion tokens, and map gesture progress to gesture state.
- Every non-essential animation MUST have a reduced-motion fallback; fallback may remove, shorten, or replace the movement while preserving information and task completion.
- Haptics must never be the only feedback signal.

## Layout Innovation

Suitable patterns: asymmetric CSS Grid, overlapping elements with negative margins and controlled z-index, Bento grids, diagonal visual flow, full-bleed media with contained content, mobile lists with varied heights, horizontal scrolling with snapping, reachable floating elements, bottom sheets respecting safe areas.

Verify innovative layouts remain responsive, keyboard accessible, readable, free of horizontal scrolling. On mobile: reachability, scrollability, performance, screen-reader order, large-text behavior, and safe-area insets.

## Accessibility (WCAG)

- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text or qualifying UI elements.
- Visible focus indicators with sufficient contrast.
- Semantic HTML before adding ARIA; accurate labels and roles only when needed.
- Keyboard access and logical focus order for interactive content.
- Touch targets: at least 44x44px on web and desktop, 44pt on iOS, 48dp on Android.
- VoiceOver on iOS, TalkBack on Android, and platform text scaling without clipping or truncating essential content.
- Reduced motion; do not communicate information through motion alone.
- Validate empty, loading, error, hover, focus, active, disabled, and selected states where applicable.

## Styling Priority

Apply in following preference order:

1. Component Library Config (global theme override)
2. Component Library Props (NativeBase, RN Paper, Tamagui:themed props, not custom)
3. StyleSheet.create (RN) / Theme (Flutter): use framework tokens
4. Platform.select: only for genuine differences (shadows, fonts, spacing)
5. Inline styles: NEVER for static values (only runtime dynamic positions/colors)

### DESIGN.md Output Format

COMPLIANT: Google DESIGN.md alpha YAML frontmatter, `{token.ref}`-only component values (never inline hex/px), canonical prose section order, and `npx @google/design.md lint DESIGN.md` validation before finalizing.

## Rules

- Visual Quality Default: Unless the user requests another direction, make greenfield UI modern, professional, cohesive, responsive, and visually distinctive. Preserve existing visual language for established products; do not independently redesign an approved handoff.
- Generic UI Guardrail: Do not fall back to interchangeable card grids, unnecessary containers, pill clusters, gratuitous gradients/glassmorphism, excessive rounding, ornamental icons, filler copy, or decorative motion. Every visual treatment must support hierarchy, brand, affordance, or feedback.
- Styling: Use `DESIGN.md` tokens and `StyleSheet.create` only; no hardcoded values or inline styles.
