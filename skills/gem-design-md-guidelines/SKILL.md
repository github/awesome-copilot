---
name: gem-design-md-guidelines
description: Create or validate accessible web, desktop, mobile, or cross-platform UI/UX with DESIGN.md token compliance, responsive layouts, platform conventions, dark mode, motion, and WCAG guidance.
---

# UI/UX Design Guidelines

## Activation and use

Use this skill for web, desktop, mobile, or cross-platform UI/UX design work, including layouts, themes, color
systems, component specifications, design-system updates, and visual validation. Select the platform branch below
before designing. Apply the shared guidance to every branch, then add the branch-specific requirements.

Before designing, identify the purpose, problem, users or device, existing design system, platform, framework,
library, tokens, responsive requirements, dark-mode requirements, and accessibility constraints. Preserve existing
patterns unless the brief requires a change. Use the smallest compliant solution and verify token references,
responsive behavior, contrast, focus states, semantic structure, and reduced-motion behavior before finalizing.

## Platform branches

### Web and desktop

- Use semantic HTML before ARIA, logical keyboard focus order, visible focus indicators, and pointer and keyboard
  parity for interactive controls.
- Validate responsive breakpoints, 44x44px minimum touch targets, readable line lengths, and no horizontal scrolling.
- Preserve the existing component library and layout system. Use CSS-only motion where possible.

### iOS

- Follow Apple Human Interface Guidelines for navigation, system icons, sheets, modals, feedback, and gestures.
- Account for safe areas: notch, Dynamic Island, status bar, home indicator, keyboard avoidance, and landscape.
- Use 44pt minimum touch targets with at least 8pt between targets. Support VoiceOver, Dynamic Type, and reduced
  motion.
- Prefer SF Pro or the existing system font. Use system colors for platform feedback and map shared semantic roles to
  iOS tokens.
- Use appropriate spring timing and meaningful haptics. Pair haptic feedback with a visual or textual signal.

### Android

- Follow Material 3 for top bars, navigation bars or rails, FABs, cards, dialogs, pressed states, and navigation.
- Account for status bars, gesture navigation, keyboard avoidance, cutouts, and portrait or landscape layouts.
- Use 48dp minimum touch targets with at least 8dp between targets. Support TalkBack, font scaling, and reduced motion.
- Prefer Roboto or the existing system font. Use Material 3 or tokenized platform colors, with dynamic color only when
  it fits the product requirements.
- Use elevation and Material motion tokens. Preserve required accessible press and state feedback.

### Cross-platform mobile

- Use shared semantic tokens and map genuine differences with `Platform.select` or the framework's platform adapter;
  do not duplicate whole designs for superficial differences.
- For React Native, Expo, Flutter, or similar stacks, use the existing component library and theme tokens before
  `StyleSheet.create` or custom styles. Never use inline styles for static values.
- Specify platform variants for navigation, typography, elevation, shadows, safe areas, gestures, system feedback,
  and haptics while keeping content hierarchy and interaction intent consistent.
- Support iOS and Android text scaling without clipping or hiding required actions.

### Shared mobile checks

- Use an 8pt grid unless the existing design system defines a compatible system.
- Check notch or cutout areas, status bars, home indicators, keyboard overlap, gesture conflicts, and reachability.
- Specify loading, empty, error, refresh, content, selected, disabled, and active states for lists and controls.
- Use 44pt on iOS and 48dp on Android for touch targets. Keep at least 8pt or 8dp between adjacent targets.
- Use `accessibilityLabel`, role, hint, and state values when the framework requires them.

## Design Thinking

Start with Purpose -> Problem -> User or Device. Choose a clear visual direction that fits the brief. Use an extreme
aesthetic and one memorable element only when the brief leaves creative direction open. Commit to the smallest
compliant solution that respects the selected platform branch.

## DESIGN.md Spec Compliance

When creating or updating `DESIGN.md`, follow the Google DESIGN.md alpha structure:

1. YAML frontmatter with `version`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, and
   `components`.
2. `## Overview` for brand and style rationale.
3. `## Colors` for the palette and semantic roles.
4. `## Typography` for the font hierarchy and rationale.
5. `## Layout` for the spacing system, grid, and container widths.
6. `## Elevation & Depth` for surface tiers or a flat-design alternative.
7. `## Shapes` for corner radii and border styles.
8. `## Components` for token-referenced component definitions.
9. `## Do's and Don'ts` for practical guardrails.

Every value in the YAML `components:` block MUST use `{token.ref}` references. Do not use inline raw colors,
spacing, dimensions, or other values there. Validate with `npx @google/design.md lint DESIGN.md` when the package
is available.

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

## Design Movements

- Brutalism: Raw, exposed, bold type, high contrast, and minimal polish. Use for portfolio, creative, or
  anti-establishment work.
- Neo-brutalism: Bright saturated colors, thick black borders, hard shadows, and playful surfaces. Use for
  startups, consumer products, or youth-oriented work.
- Glassmorphism: Translucency, backdrop blur, and floating layers. Use for dashboards, SaaS, or premium products.
- Claymorphism: Soft 3D, rounded forms, pastels, and inner/outer shadows. Use for kids, casual, or wellness work.
- Minimalist Luxury: Whitespace, refined type, muted palettes, and subtle animation. Use for luxury, editorial, or
  professional work.
- Retro-futurism/Y2K: Chrome, gradients, grid patterns, and 2000s web references. Use for tech, creative, or music
  work.
- Maximalism: Bold patterns, saturated colors, layered composition, and asymmetry. Use for fashion, entertainment,
  or stand-out brands.

## Color Strategy (Dark Mode)

- Invert backgrounds from light to dark while preserving text contrast.
- Keep accents saturated enough to remain distinguishable on dark surfaces.
- Replace heavy shadows with restrained glows or surface contrast where appropriate.
- Check semantic roles and contrast in both light and dark themes.
- On OLED mobile surfaces, true black is allowed only when it supports the product and remains compatible with the
  semantic token system. On Android, use the Material 3 dark theme or an equivalent tokenized dark theme.
- Share semantic palette roles across platforms and map them to platform-specific tokens instead of hard-coding
  separate palettes.

## Motion & Animation

Orchestrate page-load motion instead of animating every element. Define consistent duration and easing standards.
Use CSS-only implementations for web and desktop UI motion where possible. For mobile, use platform-consistent
springs or Material motion tokens, and map gesture progress to gesture state. Every non-essential animation MUST have
a reduced-motion fallback; the fallback may remove, shorten, or replace the movement while preserving information and
task completion. Haptics must never be the only feedback signal.

## Layout Innovation

Use innovation only when it supports hierarchy, usability, and the existing system. Suitable patterns include:

- Asymmetric CSS Grid.
- Overlapping elements with negative margins and controlled `z-index`.
- Bento grids.
- Diagonal visual flow.
- Full-bleed media with contained content.
- Mobile lists with varied heights, horizontal scrolling with snapping, reachable floating elements, and bottom sheets
  that respect safe areas.

Verify that innovative layouts remain responsive, keyboard accessible, readable, and free of horizontal scrolling.
On mobile, also verify reachability, scrollability, performance, screen-reader order, large-text behavior, and safe-area
insets.

## Accessibility (WCAG)

- Meet a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text or qualifying UI elements.
- Provide visible focus indicators with sufficient contrast.
- Use semantic HTML before adding ARIA; add accurate labels and roles only when needed.
- Provide keyboard access and logical focus order for interactive content.
- Use touch targets of at least 44x44px on web and desktop, 44pt on iOS, and 48dp on Android.
- Support VoiceOver on iOS, TalkBack on Android, and platform text scaling without clipping or truncating essential
  content.
- Support reduced motion and do not communicate information through motion alone.
- Validate empty, loading, error, hover, focus, active, disabled, and selected states where applicable.

### Styling Priority

Apply in following preference order:

1. Component Library Config (global theme override)
2. Component Library Props (NativeBase, RN Paper, Tamagui:themed props, not custom)
3. StyleSheet.create (RN) / Theme (Flutter):use framework tokens
4. Platform.select:only for genuine differences (shadows, fonts, spacing)
5. Inline styles:NEVER for static values (only runtime dynamic positions/colors)

### DESIGN.md Output Format

When creating or updating `DESIGN.md`, comply with the official `DESIGN.md Spec Compliance` section above: Google DESIGN.md alpha YAML frontmatter, `{token.ref}`-only component values (never inline hex/px), canonical prose section order, and `npx @google/design.md lint DESIGN.md` validation before finalizing.
