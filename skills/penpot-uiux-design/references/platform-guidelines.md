# Platform Design Guidelines Reference

## Mobile Design Fundamentals

### Screen Sizes

| Device | Size | Design At |
| ------ | ---- | --------- |
| iPhone SE | 375×667 | Small mobile |
| iPhone 14/15 | 390×844 | Standard mobile |
| iPhone 14 Pro Max | 430×932 | Large mobile |
| Android small | 360×640 | Minimum target |
| Android large | 412×915 | Large Android |

### Safe Areas

```text
┌─────────────────────────────────┐
│ ▓▓▓▓▓▓▓ Status Bar ▓▓▓▓▓▓▓▓▓▓ │ 44-47px
├─────────────────────────────────┤
│                                 │
│      Safe Content Area          │
│                                 │
│                                 │
├─────────────────────────────────┤
│ ▓▓▓▓▓▓ Home Indicator ▓▓▓▓▓▓▓ │ 34px
└─────────────────────────────────┘

```

### Touch Targets

- **Minimum:** 44×44pt (iOS) / 48×48dp (Android)
- **Recommended:** 48×48px for all platforms
- **Spacing:** Minimum 8px between targets

---

## iOS Human Interface Guidelines (HIG)

### Design Philosophy

- **Clarity:** Text is legible, icons precise, adornments subtle
- **Deference:** UI helps people understand content, never competes
- **Depth:** Distinct visual layers convey hierarchy

### Navigation Patterns

| Pattern | When to Use |
| ------- | ----------- |
| Tab Bar | 3-5 top-level destinations |
| Navigation Bar | Hierarchical content |
| Sidebar | iPad, rich content apps |
| Search | Content discovery |

### Tab Bar Specifications

```text
┌─────────────────────────────────┐
│  🏠    🔍    ➕    💬    👤    │
│ Home  Search Add  Chat  Profile │ 49pt height
└─────────────────────────────────┘

```

- Max 5 tabs
- Icons 25×25pt with 10pt labels
- Active tab uses fill/tint color
- Inactive tabs use gray

### Navigation Bar

```text
┌─────────────────────────────────┐
│ ‹ Back    Page Title    Action │ 44pt minimum
└─────────────────────────────────┘

```

- Left: Back button or cancel
- Center: Title
- Right: Primary action (text or icon)

### Typography (SF Pro)

| Style | Size | Weight |
| ----- | ---- | ------ |
| Large Title | 34pt | Bold |
| Title 1 | 28pt | Bold |
| Title 2 | 22pt | Bold |
| Title 3 | 20pt | Semibold |
| Headline | 17pt | Semibold |
| Body | 17pt | Regular |
| Callout | 16pt | Regular |
| Subhead | 15pt | Regular |
| Footnote | 13pt | Regular |
| Caption | 12pt | Regular |

### iOS Colors (System)

| Color | Light | Dark |
| ----- | ----- | ---- |
| Label | #000000 | #FFFFFF |
| Secondary Label | #3C3C43 @ 60% | #EBEBF5 @ 60% |
| Tertiary Label | #3C3C43 @ 30% | #EBEBF5 @ 30% |
| System Blue | #007AFF | #0A84FF |
| System Green | #34C759 | #30D158 |
| System Red | #FF3B30 | #FF453A |
| System Orange | #FF9500 | #FF9F0A |

### iOS-Specific Patterns

- **Swipe gestures:** Delete, archive, actions
- **Pull to refresh:** Standard list refresh
- **Long press:** Context menus
- **Haptic feedback:** Confirm actions
- **Edge swipe:** Back navigation

---

## Android Material Design

### Android Design Philosophy

- **Material as metaphor:** Physical properties, elevation
- **Bold, graphic, intentional:** Deliberate color, typography, space
- **Motion provides meaning:** Feedback and continuity

### Android Navigation Patterns

| Pattern | When to Use |
| ------- | ----------- |
| Bottom Navigation | 3-5 top destinations |
| Navigation Drawer | 5+ destinations, less frequent |
| Navigation Rail | Tablet landscape |
| Tabs | Related content groups |

### Bottom Navigation

```text
┌─────────────────────────────────┐
│  🏠    🔍    📷    💬    👤    │
│ Home  Search Camera Chat Account│ 80dp height
└─────────────────────────────────┘

```

- 3-5 destinations
- Icons 24dp with 12sp labels
- Active: filled icon + primary color
- Inactive: outlined icon + on-surface

### App Bar

```text
┌─────────────────────────────────┐
│ ≡  App Title                🔍 │ 64dp height
└─────────────────────────────────┘

```

- Left: Navigation icon (menu or back)
- Center: Title (can be left-aligned)
- Right: Action icons (max 3)

### Floating Action Button (FAB)

- **Size:** 56dp standard, 40dp mini
- **Position:** Bottom right, 16dp from edges
- **Purpose:** Primary action only
- **Behavior:** Can hide on scroll

### Typography (Roboto)

| Style | Size | Weight | Tracking |
| ----- | ---- | ------ | -------- |
| Display Large | 57sp | Regular | -0.25 |
| Display Medium | 45sp | Regular | 0 |
| Display Small | 36sp | Regular | 0 |
| Headline Large | 32sp | Regular | 0 |
| Headline Medium | 28sp | Regular | 0 |
| Headline Small | 24sp | Regular | 0 |
| Title Large | 22sp | Regular | 0 |
| Title Medium | 16sp | Medium | 0.15 |
| Title Small | 14sp | Medium | 0.1 |
| Body Large | 16sp | Regular | 0.5 |
| Body Medium | 14sp | Regular | 0.25 |
| Body Small | 12sp | Regular | 0.4 |
| Label Large | 14sp | Medium | 0.1 |
| Label Medium | 12sp | Medium | 0.5 |
| Label Small | 11sp | Medium | 0.5 |

### Material Colors

| Role | Purpose |
| ---- | ------- |
| Primary | Main brand color |
| On Primary | Text/icons on primary |
| Primary Container | Filled buttons, active states |
| Secondary | Less prominent components |
| Tertiary | Contrast, balance |
| Error | Error states |
| Surface | Card backgrounds |
| On Surface | Text on surfaces |
| Outline | Borders, dividers |

### Elevation (Shadows)

| Level | Elevation | Use Case |
| ----- | --------- | -------- |
| 0 | 0dp | Flat surfaces |
| 1 | 1dp | Cards, raised buttons |
| 2 | 3dp | Elevated cards |
| 3 | 6dp | FAB resting |
| 4 | 8dp | Dialogs, pickers |
| 5 | 12dp | FAB pressed |

### Android-Specific Patterns

- **Snackbar:** Brief feedback at bottom
- **Bottom sheet:** Additional content/actions
- **Chips:** Filter, input, choice, action
- **Speed dial FAB:** Multiple related actions

---

## Responsive Web Design

### Breakpoints

| Name | Width | Typical Device |
| ---- | ----- | -------------- |
| xs | <576px | Mobile portrait |
| sm | 576-767px | Mobile landscape |
| md | 768-991px | Tablet |
| lg | 992-1199px | Small desktop |
| xl | 1200-1399px | Desktop |
| xxl | ≥1400px | Large desktop |

### Grid System

- **Columns:** 12-column grid standard
- **Gutters:** 16-24px between columns
- **Margins:** 16px (mobile) to 64px (desktop)
- **Max content width:** 1200-1440px

### Responsive Typography

```text
Mobile (base):
  Body: 16px
  H1: 28-32px
  H2: 22-24px
  
Tablet:
  Body: 16px
  H1: 32-40px
  H2: 24-28px
  
Desktop:
  Body: 16-18px
  H1: 40-56px
  H2: 28-36px

```

### Mobile-First Approach

1. Design for smallest screen first
2. Add complexity for larger screens
3. Content priority: What's essential?
4. Performance: Minimize for mobile
5. Touch-first interactions

### Responsive Patterns

| Pattern | Description |
| ------- | ----------- |
| Stack | Columns become rows on mobile |
| Reflow | Content reorders based on priority |
| Reveal | More content shown at larger sizes |
| Off-canvas | Navigation slides in on mobile |
| Scale | Elements scale proportionally |

---

## Desktop Applications

### Window Chrome

```text
┌─────────────────────────────────────────┐
│ ● ● ●   App Title              ─ □ ×  │ Title bar
├────────┬────────────────────────────────┤
│ Sidebar│ Content Area                   │
│        │                                │
│        │                                │
│        │                                │
│        ├────────────────────────────────┤
│        │ Status Bar                     │
└────────┴────────────────────────────────┘

```

### Keyboard-First Design

- All actions accessible via keyboard
- Visible keyboard shortcuts
- Focus management for tab order
- Search/command palette (Cmd/Ctrl+K)

### Hover States

Desktop has hover (mobile doesn't):

- Show additional info on hover
- Preview actions before click
- Tooltips for icon-only buttons
- Dropdown menus on hover

### Dense Information

Desktop allows for:

- Smaller touch targets (32px min)
- More visible information
- Complex tables and data grids
- Multi-column layouts
- Side-by-side comparisons

---

## Cross-Platform Considerations

### Shared Principles

- Consistent brand identity
- Same core user flows
- Synchronized data/state
- Familiar information architecture

### Platform-Specific Adaptations

| Aspect | iOS | Android | Web |
| ------ | --- | ------- | --- |
| Back | Left nav | Left or gesture | Browser back |
| Primary action | Right nav | FAB | Top right button |
| Lists | Swipe actions | Long press | Hover actions |
| Menus | Action sheets | Bottom sheet | Dropdown/context |
| Alerts | Centered modal | Centered modal | Various positions |

### Design Tokens Across Platforms

Create platform-agnostic tokens:

```text
// Spacing
spacing-sm: 8
spacing-md: 16
spacing-lg: 24

// These map to platform units
iOS: points (pt)
Android: density-independent pixels (dp)
Web: pixels (px) or rem

```
