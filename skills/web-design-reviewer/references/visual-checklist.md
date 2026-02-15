# Visual Inspection Checklist

This document is a comprehensive checklist of items to verify during web design visual inspection.

---

## 1. Layout Verification

### Structural Integrity

- [ ] Header is correctly fixed/positioned at the top of the screen
- [ ] Footer is positioned at the bottom of the screen or end of content
- [ ] Main content area is center-aligned with appropriate width
- [ ] Sidebar (if present) is positioned correctly
- [ ] Navigation is displayed in the intended position

### Overflow

- [ ] Horizontal scrollbar is not unintentionally displayed
- [ ] Content does not overflow from parent elements
- [ ] Images fit within parent containers
- [ ] Tables do not exceed container width
- [ ] Code blocks wrap or scroll appropriately

### Alignment

- [ ] Grid items are evenly distributed
- [ ] Flex item alignment is correct
- [ ] Text alignment (left/center/right) is consistent
- [ ] Icons and text are vertically aligned
- [ ] Form labels and input fields are correctly positioned

---

## 2. Typography Verification

### Readability

- [ ] Body text font size is sufficient (minimum 16px recommended)
- [ ] Line height is appropriate (1.5-1.8 recommended)
- [ ] Characters per line is appropriate (40-80 characters recommended)
- [ ] Spacing between paragraphs is sufficient
- [ ] Heading size hierarchy is clear

### Text Handling

- [ ] Long words wrap appropriately
- [ ] URLs and code are handled properly
- [ ] No text clipping occurs
- [ ] Ellipsis (...) displays correctly
- [ ] Language-specific line breaking rules work correctly

### Fonts

- [ ] Web fonts load correctly
- [ ] Fallback fonts are appropriate
- [ ] Font weights are as intended
- [ ] Special characters and emoji display correctly

---

## 3. Color & Contrast Verification

### Accessibility (WCAG Standards)

- [ ] Body text: Contrast ratio 4.5:1 or higher (AA)
- [ ] Large text (18px+ bold or 24px+): 3:1 or higher
- [ ] Interactive element borders: 3:1 or higher
- [ ] Focus indicators: Sufficient contrast with background

### Color Consistency

- [ ] Brand colors are unified
- [ ] Link colors are consistent
- [ ] Error state red is unified
- [ ] Success state green is unified
- [ ] Hover/active state colors are appropriate

### Color Vision Diversity

- [ ] Information conveyed by shape and text, not just color
- [ ] Charts and diagrams consider color vision diversity
- [ ] Error messages don't rely solely on color

---

## 4. Responsive Verification

### Mobile (~640px)

- [ ] Content fits within screen width
- [ ] Touch targets are 44x44px or larger
- [ ] Text is readable size
- [ ] No horizontal scrolling occurs
- [ ] Navigation is mobile-friendly (hamburger menu, etc.)
- [ ] Form inputs are easy to use

### Tablet (641px~1024px)

- [ ] Layout is optimized for tablet
- [ ] Two-column layouts display appropriately
- [ ] Image sizes are appropriate
- [ ] Sidebar show/hide is appropriate

### Desktop (1025px~)

- [ ] Maximum width is set and doesn't break on extra-large screens
- [ ] Spacing is sufficient
- [ ] Multi-column layouts function correctly
- [ ] Hover states are implemented

### Breakpoint Transitions

- [ ] Layout transitions smoothly when screen size changes
- [ ] Layout doesn't break at intermediate sizes
- [ ] No content disappears or duplicates

---

## 5. Interactive Element Verification

### Buttons

- [ ] Default state is clear
- [ ] Hover state exists (desktop)
- [ ] Focus state is visually clear
- [ ] Active (pressed) state exists
- [ ] Disabled state is distinguishable
- [ ] Loading state (if applicable)

### Links

- [ ] Links are visually identifiable
- [ ] Visited links are distinguishable (if needed)
- [ ] Hover state exists
- [ ] Focus state is clear

### Form Elements

- [ ] Input field boundaries are clear
- [ ] Placeholder text contrast is appropriate
- [ ] Visual feedback on focus
- [ ] Error state display
- [ ] Required field indication
- [ ] Dropdowns function correctly

---

## 6. Images & Media Verification

### Images

- [ ] Images display at appropriate size
- [ ] Aspect ratio is maintained
- [ ] High resolution display support (@2x)
- [ ] Display when image fails to load
- [ ] Lazy loading behavior works

### Video & Embeds

- [ ] Videos fit within containers
- [ ] Aspect ratio is maintained
- [ ] Embedded content is responsive
- [ ] iframes don't overflow

---

## 7. Accessibility Verification

### Keyboard Navigation

- [ ] All interactive elements accessible via Tab key
- [ ] Focus order is logical
- [ ] Focus traps are appropriate (modals, etc.)
- [ ] Skip to content link exists

### Screen Reader Support

- [ ] Images have alt text
- [ ] Forms have labels
- [ ] ARIA labels are appropriately set
- [ ] Heading hierarchy is correct (h1→h2→h3...)

### Motion

- [ ] Animations are not excessive
- [ ] prefers-reduced-motion is supported (if possible)

---

## 8. Performance-related Visual Issues

### Loading

- [ ] Font FOUT/FOIT is minimal
- [ ] No layout shift (CLS) occurs
- [ ] No jumping when images load
- [ ] Skeleton screens are appropriate (if applicable)

### Animation

- [ ] Animations are smooth (60fps)
- [ ] No performance issues when scrolling
- [ ] Transitions are natural

---

## Priority Matrix

| Priority | Category | Examples |
|----------|----------|----------|
| P0 (Critical) | Functionality breaking | Complete element overlap, content disappearance |
| P1 (High) | Serious UX issues | Unreadable text, inoperable buttons |
| P2 (Medium) | Moderate issues | Alignment issues, spacing inconsistencies |
| P3 (Low) | Minor issues | Slight positioning differences, minor color variations |

---

## Verification Tools

### Browser DevTools

- Elements panel: DOM and style inspection
- Lighthouse: Performance and accessibility audits
- Device toolbar: Responsive testing

### Accessibility Tools

- axe DevTools
- WAVE
- Color Contrast Analyzer

### Automation Tools

- Playwright (screenshot comparison)
- Percy / Chromatic (Visual Regression Testing)
