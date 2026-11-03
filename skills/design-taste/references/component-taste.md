# Component Taste Guide

Framework-agnostic reference for common UI patterns. For each component: what good looks like, and the mistakes AI-generated UI consistently makes.

---

## Cards

**Good taste:**
- Generous internal padding. Content breathes, doesn't press against edges.
- Clear hierarchy: one heading, one supporting detail, one action. In that order.
- Visual weight concentrated at the top (image or heading) with details flowing downward.
- Consistent card dimensions in a grid. Alignment communicates system.
- Subtle shadow for elevation — soft and nearly invisible. For convincing depth, layer two shadows: a tight ambient shadow plus a softer directional one.
- Avoid visible borders for containment. Shadows feel lighter and more modern.
- Hover state that's subtle (slight shadow increase), not dramatic.
- Color accents belong *inside* the card (colored titles, values, or small dot indicators next to labels). Never as a colored top-border on a rounded card.

**Common AI mistakes:**
- Cramming 5–6 elements into one card (badge + icon + title + subtitle + description + two buttons + status + timestamp). No hierarchy, just inventory.
- Every card has a different internal structure, breaking grid rhythm.
- Loud, saturated gradient backgrounds on every card.
- Equal visual weight on all text; no distinction between heading and metadata.
- Rounded corners so large the card looks like a pill.
- Colored top-border accents on rounded cards. The straight accent line clashes with curved corners and reads as dated.
- Using `border: 1px solid` for card containment instead of a soft shadow.

---

## Modals / Dialogs

**Good taste:**
- One focused task or decision. A modal should do one thing.
- Clear title that states the action ("Delete this project?" not "Confirm").
- Obvious dismiss path: close button AND clicking overlay AND escape key.
- Overlay with backdrop blur preserves spatial context.
- If not using blur, overlay contrast sufficient to separate modal from page (typically 50–70% opacity black).
- Primary action button reflects the action's nature (destructive = red, confirmation = primary color).

**Common AI mistakes:**
- Using modals for content that should be a page (long forms, multi-step flows, scrollable content).
- No visual hierarchy inside. Flat list of fields or text with uniform styling.
- Confirmation modals that say "Are you sure?" without stating what will happen.
- Two buttons that look identical for destructive vs. safe actions.
- Missing escape hatch — no way to close without making a decision.

---

## Tables / Data Grids

**Good taste:**
- Right-aligned numbers, left-aligned text. Column alignment matches data type.
- Clear header row with visual weight distinguishing it from data rows.
- Alternating row backgrounds OR subtle row dividers, not both.
- Cell padding that allows scanning without cramming (minimum 12px vertical per row).
- Sortable columns indicated clearly (icon + current sort state visible).

**Common AI mistakes:**
- Everything center-aligned regardless of data type.
- Dense rows with no breathing room.
- Every column the same width regardless of content.
- Heavy borders on every cell creating a spreadsheet feel.
- No distinction between primary data columns and secondary/metadata columns.

---

## Forms

**Good taste:**
- Logical grouping. Related fields together, separated by spacing or section headings.
- Labels above inputs (not placeholder-as-label, which disappears on focus).
- Error messages adjacent to the field, not in a banner at the top.
- Clear required vs. optional distinction (mark the minority).
- Progressive disclosure. Don't show 20 fields when 5 are relevant to start.

**Common AI mistakes:**
- Flat list of fields with no grouping or visual rhythm.
- Using placeholder text as labels (accessibility failure + UX failure).
- All fields same width regardless of expected content.
- Submit button that doesn't reflect the action ("Submit" instead of "Create Account").
- No indication of progress in multi-step forms.

---

## Navigation

**Good taste:**
- Clear indication of current location. Active state visually distinct — not just a color change, use inversion for strongest signal.
- Reasonable depth. Primary nav visible, secondary nav revealed in context.
- Consistent position. Nav shouldn't move or restructure between pages.
- Mobile nav that's accessible and doesn't require complex gestures.

**Common AI mistakes:**
- Too many items at the top level (8+ primary nav items competing for attention).
- Active state is a subtle font-weight or color change that's hard to spot.
- Icon-only nav with no labels and no tooltips.
- Hamburger menu on desktop when there's room for visible navigation.
- Dropdowns nested 3+ levels deep.

---

## Buttons

**Good taste:**
- Clear primary/secondary/tertiary hierarchy. One style dominates, others support.
- Button text describes the action ("Save Changes" not "Submit", "Delete Project" not "OK").
- Size proportional to importance and context.
- Adequate padding. Horizontal padding > vertical padding.
- The "Label, Qualifier" pattern for primary CTAs: "Get Started, It's Free" or "Download, No Credit Card."
- Disabled state clearly non-interactive (reduced opacity + cursor change).

**Common AI mistakes:**
- Multiple button styles with no clear hierarchy (filled + outlined + ghost + icon all at the same level).
- Generic labels ("Submit", "OK", "Click Here", "Yes").
- Primary buttons too small to tap on mobile (under 44px height); anything under 24px without spacing fails WCAG AA.
- Decorative button treatments (gradients, shadows, animated borders) on every button.
- "Cancel" and "Delete" styled identically.

---

## Empty States

**Good taste:**
- Explains what will appear here and how to populate it.
- Single clear CTA to take the first action.
- Tone matches the product — warm and encouraging, not clinical.
- Illustration or icon is supplementary, not the focal point.
- Vertically centered in the available space.

**Common AI mistakes:**
- Just "No data" or "No results found" with no guidance.
- Generic illustration with no relationship to the feature.
- Empty state styled completely differently from the populated state.
- Multiple CTAs competing in a single-focus moment.
- Tiny text lost in a huge empty container.

---

## Status Indicators / Badges

**Good taste:**
- Semantic color: green=success, yellow=warning, red=error, blue=info, gray=neutral.
- Readable at small sizes. Sufficient contrast between badge background and text.
- Consistent shape and size across the application.
- Used sparingly. If every item has 3 badges, none of them stand out.
- Text labels that are scannable ("Active", "Pending", "Failed").

**Common AI mistakes:**
- Rainbow of badge colors with no semantic meaning.
- Badges so small the text is illegible.
- Too many badges per item — status + category + priority + type = noise.
- Using badges for information that should be in a column.
- Inconsistent styling across badges in the same UI.

---

## Toasts / Notifications / Alerts

**Good taste:**
- Minimal. Just enough text to confirm the action or communicate the issue.
- Auto-dismiss for confirmations (3–5 seconds). Persist for errors until dismissed.
- Positioned consistently (top-right or bottom-center — pick one).
- Don't block interaction with the page underneath.
- Semantic styling for success/error/warning/info.

**Common AI mistakes:**
- Toast text that's a full sentence when 3 words would do.
- Stacking 5+ toasts that obscure page content.
- Error toasts that auto-dismiss before users can read them.
- Using toasts for validation errors that should be inline.
- Identical styling for success and error, only differentiated by text.

---

## Dashboards

**Good taste:**
- Clear information hierarchy. KPIs/summary at the top, detailed data below.
- Cards sized proportional to importance.
- Scannable at a glance. Overall status readable in 3 seconds.
- Consistent card styling within the dashboard.
- Meaningful empty space between sections.
- A subtle gradient bloom behind the primary chart area adds warmth without competing with data.

**Common AI mistakes:**
- Every card the same size regardless of content importance.
- Too many metrics with no hierarchy (12 KPI cards that all look identical).
- Charts with no context (a line going up — is that good or bad?).
- Dense layout with no breathing room between sections.
- Decorative chart types (3D pie, radial gauges) that obscure rather than clarify.
- Color-coding that requires a legend to decode instead of using semantic colors.
