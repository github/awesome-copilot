# UI Component Patterns Reference

## Buttons

### Button Types

| Type | Purpose | Visual Treatment |
| ---- | ------- | ---------------- |
| Primary | Main action on page | Solid fill, brand color |
| Secondary | Supporting actions | Outline or muted fill |
| Tertiary | Low-emphasis actions | Text-only, underline optional |
| Destructive | Delete/remove actions | Red color, confirmation required |
| Ghost | Minimal UI, icon buttons | Transparent, subtle hover |

### Button States

```text
Default    → Resting state, clearly interactive
Hover      → Cursor over (desktop): darken 10%, subtle shadow
Active     → Being pressed: darken 20%, slight scale down
Focus      → Keyboard selected: visible outline ring
Disabled   → Not available: 50% opacity, cursor: not-allowed
Loading    → Processing: spinner replaces or accompanies label

```

### Button Specifications

- **Minimum size:** 44×44px (touch target)
- **Padding:** 12-16px horizontal, 8-12px vertical
- **Border radius:** 4-8px (consistent across app)
- **Font weight:** Medium or Semibold (600-700)
- **Text:** Sentence case, 2-4 words max

### Button Label Patterns

```text
✓ Save Changes        ✗ Submit
✓ Add to Cart         ✗ Click Here
✓ Create Account      ✗ OK
✓ Download PDF        ✗ Go
✓ Start Free Trial    ✗ Continue

```

---

## Forms

### Form Layout Guidelines

- **Single column preferred:** Reduces cognitive load
- **Top-aligned labels:** Fastest completion times
- **Logical grouping:** Related fields together
- **Smart defaults:** Pre-fill when possible

### Input Field Anatomy

```text
┌─ Label (required) ─────────────────────────┐
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ Placeholder text...                 │   │
│  └────────────────────────────────────┘   │
│  Helper text or error message              │
└────────────────────────────────────────────┘

```

### Input States

| State | Border | Background | Additional |
| ----- | ------ | ---------- | ---------- |
| Default | Gray (#D1D5DB) | White | - |
| Focus | Primary color | White | Shadow/glow |
| Filled | Gray | White | Checkmark optional |
| Error | Red (#EF4444) | Light red tint | Error icon + message |
| Disabled | Light gray | Gray (#F3F4F6) | 50% opacity text |

### Validation Timing

- **On blur:** Validate when user leaves field
- **On change (after error):** Clear error as user types correct input
- **On submit:** Final validation before processing
- **Never on focus:** Don't show errors before user types

### Error Message Guidelines

```text
✓ "Email address is required"
✓ "Password must be at least 8 characters"
✓ "Please enter a valid phone number (e.g., 555-123-4567)"

✗ "Invalid input"
✗ "Error"
✗ "This field is required" (generic)

```

### Form Best Practices

- Mark optional fields, not required (fewer asterisks)
- Show password requirements before errors occur
- Use input masks for formatted data (phone, date)
- Preserve data on errors (don't clear the form)
- Provide clear success confirmation

---

## Navigation

### Navigation Patterns

#### Top Navigation Bar

```text
┌─────────────────────────────────────────────────────┐
│ Logo    Nav Item  Nav Item  Nav Item    [Search] [User] │
└─────────────────────────────────────────────────────┘

```

- **Best for:** Marketing sites, simple apps
- **Max items:** 5-7 top-level links
- **Mobile:** Collapse to hamburger menu

#### Sidebar Navigation

```text
┌────────┬────────────────────────────────┐
│ Logo   │ Content Area                   │
├────────┤                                │
│ Nav 1  │                                │
│ Nav 2  │                                │
│ Nav 3  │                                │
│        │                                │
│ ────── │                                │
│ Nav 4  │                                │
│ Nav 5  │                                │
└────────┴────────────────────────────────┘

```

- **Best for:** Dashboards, complex apps
- **Width:** 200-280px expanded, 64px collapsed
- **Mobile:** Overlay drawer

#### Bottom Navigation (Mobile)

```text
┌─────────────────────────────────────┐
│           Content Area              │
│                                     │
├─────────────────────────────────────┤
│  🏠    🔍    ➕    💬    👤        │
│ Home  Search Add  Chat  Profile     │
└─────────────────────────────────────┘

```

- **Max items:** 3-5 destinations
- **Best for:** Primary app sections
- **Always visible:** Persistent navigation

#### Breadcrumbs

```text
Home > Products > Electronics > Headphones

```

- **Use for:** Deep hierarchies (3+ levels)
- **Current page:** Not clickable, different style
- **Separator:** > or / or chevron icon

### Tab Navigation

```text
┌─────────┬─────────┬─────────┬─────────┐
│ Tab 1   │ Tab 2   │ Tab 3   │ Tab 4   │
└─────────┴─────────┴─────────┴─────────┘
│                                       │
│        Tab Content Area               │
│                                       │
└───────────────────────────────────────┘

```

- **Max tabs:** 3-5 for clarity
- **Active indicator:** Underline or background
- **Use for:** Related content within same page

---

## Cards

### Card Anatomy

```text
┌─────────────────────────────────┐
│ ░░░░░░░ Image/Media ░░░░░░░░░░ │
├─────────────────────────────────┤
│ Category Label                  │
│ Card Title                      │
│ Description text that may       │
│ span multiple lines...          │
│                                 │
│ [Action Button]  [Secondary]    │
└─────────────────────────────────┘

```

### Card Guidelines

- **Consistent sizing:** Use grid, equal heights
- **Content hierarchy:** Image → Title → Description → Actions
- **Padding:** 16-24px internal spacing
- **Border radius:** 8-12px (matching buttons)
- **Shadow:** Subtle elevation (0 2px 4px rgba(0,0,0,0.1))

---

## Modals and Dialogs

### Modal Structure

```text
┌─────────────────────────────────────┐
│ Modal Title                    [×]  │
├─────────────────────────────────────┤
│                                     │
│ Modal content goes here.            │
│ Keep it focused on one task.        │
│                                     │
├─────────────────────────────────────┤
│           [Cancel]  [Confirm]       │
└─────────────────────────────────────┘

```

### Modal Guidelines

- **Size:** 400-600px width (desktop), full-width minus margins (mobile)
- **Overlay:** Semi-transparent dark background (rgba(0,0,0,0.5))
- **Close options:** X button, overlay click, Escape key
- **Focus trap:** Keep keyboard focus within modal
- **Primary action:** Right-aligned, visually prominent

---

## Dashboards

### Dashboard Layout Principles

1. **Most important metrics at top:** KPIs, summary cards
2. **Progressive detail:** Overview → Drill-down capability
3. **Consistent card sizes:** Use grid system
4. **Minimal chartjunk:** Only data-serving visuals
5. **Actionable insights:** Highlight anomalies

### Data Visualization Selection

| Data Type | Chart Type |
| --------- | ---------- |
| Comparison across categories | Bar chart |
| Trend over time | Line chart |
| Part of whole | Pie (≤5 slices) or Donut |
| Distribution | Histogram |
| Correlation | Scatter plot |
| Geographic | Map |
| Single metric | Big number + sparkline |

### Dashboard Best Practices

- **Limit to 5-9 widgets** per view
- **Align to grid:** Consistent gutters and sizing
- **Filter controls:** Top or sidebar, always visible
- **Date range selector:** Common need, make prominent
- **Export options:** PDF, CSV for data tables
- **Responsive:** Stack cards on smaller screens

---

## Empty States

### Empty State Components

```text
┌─────────────────────────────────────┐
│                                     │
│         [Illustration/Icon]         │
│                                     │
│      No projects yet                │
│                                     │
│   Create your first project to      │
│   start organizing your work.       │
│                                     │
│       [Create Project]              │
│                                     │
└─────────────────────────────────────┘

```

### Empty State Guidelines

- **Friendly illustration:** Not just "No data"
- **Explain value:** Why create something?
- **Clear CTA:** Primary action to fix empty state
- **Keep it brief:** 1-2 sentences max

---

## Loading States

### Loading Patterns

| Duration | Pattern |
| -------- | ------- |
| <1 second | No indicator (feels instant) |
| 1-3 seconds | Spinner or progress indicator |
| 3-10 seconds | Skeleton screens + progress |
| >10 seconds | Progress bar + explanation |

### Skeleton Screen

```text
┌─────────────────────────────────────┐
│ ░░░░░░░░░░░░ ░░░░░░░░░░           │
├─────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░         │
│ ░░░░░░░░░░░░░░░░░░░               │
│ ░░░░░░░░░░░░░░░░░░░░░░░           │
└─────────────────────────────────────┘

```

- Match layout of loaded content
- Use subtle animation (shimmer/pulse)
- Show actual content structure
