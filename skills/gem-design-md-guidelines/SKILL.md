---
name: gem-design-md-guidelines
description: Create or review accessible web, desktop, iOS, Android, and cross-platform UI/UX. Use for layouts, themes, components, design systems, DESIGN.md tokens, responsive behavior, dark mode, motion, and WCAG validation.
---

# UI/UX Design Guidelines

## Workflow

1. Identify purpose, user problem, audience/devices, platform, framework, component library, existing design system/tokens, breakpoints, dark-mode needs, and accessibility constraints.
2. Select the platform branch below. Apply shared rules plus its requirements.
3. Preserve established patterns unless the brief requires change. Implement the smallest compliant solution.
4. Validate tokens, responsive behavior, semantics, keyboard/screen-reader use, contrast, focus, touch targets, states, and reduced motion.

## Platform branches

### Web and desktop

- Use semantic HTML before ARIA; maintain logical focus order, visible focus, and pointer/keyboard parity.
- Validate breakpoints, readable line lengths, no horizontal overflow, and 44×44px minimum targets.
- Preserve the component library/layout system; prefer CSS-only motion.

### iOS

- Follow Apple HIG for navigation, system icons, sheets/modals, feedback, and gestures.
- Handle safe areas, notch/Dynamic Island, status/home indicators, keyboard, and landscape.
- Support VoiceOver, Dynamic Type, and reduced motion. Targets: ≥44pt with ≥8pt separation.
- Prefer SF Pro/current system font and system feedback colors; map shared semantic roles to iOS tokens.
- Use appropriate spring timing; pair haptics with visual or textual feedback.

### Android

- Follow Material 3 for app/navigation bars or rails, FABs, cards, dialogs, navigation, and pressed states.
- Handle status bars, gesture navigation, keyboard, cutouts, portrait, and landscape.
- Support TalkBack, font scaling, and reduced motion. Targets: ≥48dp with ≥8dp separation.
- Prefer Roboto/current system font and Material 3/tokenized colors; use dynamic color only when appropriate.
- Use elevation/motion tokens and accessible press/state feedback.

### Cross-platform mobile

- Share semantic tokens and content/interaction hierarchy. Map only genuine platform differences (navigation, type, elevation/shadows, safe areas, gestures, system feedback, haptics) through `Platform.select` or a framework adapter; never duplicate whole designs for superficial differences.
- In React Native, Expo, or Flutter, prefer the current component library/theme, then `StyleSheet.create` or framework theme. Never use inline styles for static values.
- Support iOS/Android text scaling without clipping or hiding required actions.

### Shared mobile checks

- Use an 8pt grid unless the design system defines a compatible scale.
- Test cutouts/system bars/home indicators, keyboard overlap, gesture conflicts, reachability, rotation, scrolling, performance, screen-reader order, and large text.
- Define loading, empty, error, refresh, content, selected, disabled, and active states.
- Provide framework-required accessibility label, role, hint, and state values.

## `DESIGN.md` compliance

Use Google DESIGN.md alpha format:

1. YAML frontmatter: `version`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components`.
2. Canonical prose order: `## Overview`, `## Colors`, `## Typography`, `## Layout`, `## Elevation & Depth`, `## Shapes`, `## Components`, `## Do's and Don'ts`.
3. Cover brand rationale; semantic palette; type hierarchy; spacing/grid/container widths; surface tiers or flat alternative; radii/borders; component definitions; practical guardrails.

Every YAML `components:` value MUST be a `{token.ref}`—never an inline color, spacing, dimension, or other raw value. Run `npx @google/design.md lint DESIGN.md` when available.

## Frontend Aesthetics

- Ground underspecified briefs in one concrete subject, audience, and primary task. Derive real copy and visual cues from its materials, tools, and vocabulary—not a reusable theme.
- Choose one coherent direction and one defensible signature element. Concentrate boldness there; keep support restrained and remove purposeless decoration.
- Make a web hero demonstrate the product's central idea through characteristic content or interaction; avoid canned metric/gradient compositions unless warranted.
- Use numbering, dividers, labels, and eyebrows only to communicate hierarchy, sequence, or category.
- Match execution to direction: maximalism needs depth/detail; minimalism needs exact type, spacing, and alignment. Revise anything that could belong to any product.
- Preserve existing typography, layout, surfaces, effects, components, lists, icons, and navigation by default. Do not reject standard fonts, solid surfaces, or predictable grids without a task-specific reason.
- Choose a distinctive display/body pair only when required; load fonts through the project approach. Mobile defaults: SF Pro on iOS, Roboto on Android. Use mapped shared fonts only for cross-platform branding (for example, `expo-font`, `react-native-google-fonts`, or embedded assets).
- Use existing tokens/CSS variables. Apply 60-30-10 only when it fits the design system.

## Color Strategy (Dark Mode)

- Invert surfaces while preserving text contrast; keep accents distinguishable and replace heavy shadows with restrained glow/surface contrast when appropriate.
- Validate every semantic role in both themes. Share roles across platforms and map them to platform tokens; never hard-code separate palettes.
- Use OLED true black only when product-appropriate and token-compatible. On Android, use Material 3 dark theme or equivalent tokens.

## Motion & Animation

- Orchestrate page-load motion; do not animate everything. Define consistent durations/easing.
- Prefer CSS on web/desktop. On mobile, use platform springs or Material tokens and map gesture progress to state.
- Every nonessential animation MUST support reduced motion by removing, shortening, or replacing movement without losing information or task completion. Haptics MUST NOT be the only feedback.

## Layout Innovation

Allowed when justified: asymmetric grids, controlled overlap/negative margins/z-index, bento or diagonal flow, full-bleed media with contained content, varied-height mobile lists, snap scrolling, reachable floating controls, and safe-area-aware bottom sheets. Keep them responsive, readable, keyboard accessible, and free of unintended horizontal overflow.

## Accessibility and states

- Contrast: ≥4.5:1 normal text; ≥3:1 large text and qualifying UI elements. Focus indicators need sufficient contrast.
- Use semantic HTML before accurate, necessary ARIA. Ensure keyboard access and logical focus order.
- Targets: ≥44×44px web/desktop, ≥44pt iOS, ≥48dp Android.
- Test VoiceOver/TalkBack and text scaling without clipping or hiding essential content.
- Never communicate through motion alone. Validate empty, loading, error, hover, focus, active, disabled, and selected states.

## Styling Priority

Apply in order:

1. Component-library/global theme configuration.
2. Library props/themed props (for example NativeBase, React Native Paper, Tamagui).
3. `StyleSheet.create` (React Native) or framework theme (Flutter), using tokens.
4. `Platform.select` only for genuine differences such as shadows, fonts, or spacing.
5. Inline styles only for runtime-dynamic values—NEVER static values.

## Rules

- Greenfield UI defaults to modern, professional, cohesive, responsive, accessible, and distinct. Preserve established visual language and approved handoffs unless explicitly redesigning.
- Avoid interchangeable card grids, unnecessary containers/pills, gratuitous gradients/glassmorphism, excessive rounding, ornamental icons, filler copy, and decorative motion. Every treatment MUST support hierarchy, brand, affordance, or feedback.
- Use `DESIGN.md` tokens and `StyleSheet.create`; no hardcoded or static inline styles.
