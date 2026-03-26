---
name: capacitor-accessibility
description: Accessibility guide for Capacitor apps covering screen readers, semantic HTML, focus management, and WCAG compliance. Use this skill when users need to make their app accessible.
---

# Accessibility in Capacitor Apps

Build inclusive apps that work for everyone.

## When to Use This Skill

- User needs accessibility
- User wants screen reader support
- User asks about WCAG
- User needs focus management

## Quick Checklist

- [ ] Semantic HTML
- [ ] Alt text for images
- [ ] Touch targets 44x44pt
- [ ] Color contrast 4.5:1
- [ ] Focus indicators
- [ ] Screen reader labels
- [ ] Keyboard navigation

## Screen Reader Support

### Labels and Hints

```tsx
// Accessible button
<button
  aria-label="Delete item"
  aria-describedby="delete-hint"
>
  <TrashIcon />
</button>
<span id="delete-hint" className="sr-only">
  Permanently removes this item
</span>

// Accessible input
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && <span id="email-error">Invalid email</span>}
```

### Live Regions

```tsx
// Announce dynamic content
<div aria-live="polite" aria-atomic="true">
  {message}
</div>

// Urgent announcements
<div aria-live="assertive" role="alert">
  {error}
</div>
```

## Touch Targets

```css
/* Minimum 44x44pt */
button, a, input {
  min-height: 44px;
  min-width: 44px;
}

/* Icon buttons need padding */
.icon-button {
  padding: 12px;
}
```

## Color Contrast

```css
/* Good contrast (4.5:1 for text) */
.text {
  color: #333333;
  background: #ffffff;
}

/* Don't rely on color alone */
.error {
  color: #d32f2f;
  border-left: 4px solid #d32f2f; /* Visual indicator */
}
.error::before {
  content: "⚠ "; /* Icon indicator */
}
```

## Focus Management

```typescript
// Move focus after navigation
useEffect(() => {
  const heading = document.querySelector('h1');
  heading?.focus();
}, [page]);

// Trap focus in modals
function trapFocus(element: HTMLElement) {
  const focusable = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
```

## Native Accessibility

### iOS VoiceOver

```swift
// Custom accessibility in native code
element.isAccessibilityElement = true
element.accessibilityLabel = "Play video"
element.accessibilityHint = "Double tap to play"
element.accessibilityTraits = .button
```

### Android TalkBack

```kotlin
// Custom accessibility
ViewCompat.setAccessibilityDelegate(view, object : AccessibilityDelegateCompat() {
    override fun onInitializeAccessibilityNodeInfo(
        host: View,
        info: AccessibilityNodeInfoCompat
    ) {
        super.onInitializeAccessibilityNodeInfo(host, info)
        info.contentDescription = "Play video"
    }
})
```

## Testing

```bash
# iOS: Enable VoiceOver in Simulator
# Settings > Accessibility > VoiceOver

# Android: Enable TalkBack
# Settings > Accessibility > TalkBack

# Web: Use axe-core
npx @axe-core/cli https://localhost:3000
```

## Resources

- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/quickref
- iOS Accessibility: https://developer.apple.com/accessibility
- Android Accessibility: https://developer.android.com/accessibility
