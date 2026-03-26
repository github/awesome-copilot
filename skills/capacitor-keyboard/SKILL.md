---
name: capacitor-keyboard
description: Guide to handling keyboard in Capacitor apps including visibility detection, accessory bar, scroll behavior, and input focus. Use this skill when users have keyboard-related issues.
---

# Keyboard Handling in Capacitor

Manage keyboard behavior in iOS and Android apps.

## When to Use This Skill

- User has keyboard issues
- User needs keyboard events
- User wants to hide keyboard
- User has scroll issues with keyboard
- User wants keyboard accessory bar

## Quick Start

```bash
npm install @capacitor/keyboard
npx cap sync
```

## Basic Usage

```typescript
import { Keyboard } from '@capacitor/keyboard';

// Show keyboard
await Keyboard.show();

// Hide keyboard
await Keyboard.hide();

// Listen for keyboard events
Keyboard.addListener('keyboardWillShow', (info) => {
  console.log('Keyboard height:', info.keyboardHeight);
});

Keyboard.addListener('keyboardWillHide', () => {
  console.log('Keyboard hiding');
});
```

## Configuration

```typescript
// capacitor.config.ts
plugins: {
  Keyboard: {
    resize: 'body',        // 'body' | 'ionic' | 'native' | 'none'
    style: 'dark',         // 'dark' | 'light' | 'default'
    resizeOnFullScreen: true,
  },
},
```

### Resize Modes

| Mode | Description |
|------|-------------|
| `body` | Resize body element |
| `ionic` | Use Ionic's keyboard handling |
| `native` | Native WebView resize |
| `none` | No automatic resize |

## Handle Keyboard Height

```typescript
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  Keyboard.addListener('keyboardWillShow', (info) => {
    document.body.style.setProperty(
      '--keyboard-height',
      `${info.keyboardHeight}px`
    );
  });

  Keyboard.addListener('keyboardWillHide', () => {
    document.body.style.setProperty('--keyboard-height', '0px');
  });
}
```

```css
.chat-input {
  position: fixed;
  bottom: calc(var(--keyboard-height, 0px) + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
}
```

## Scroll to Input

```typescript
Keyboard.addListener('keyboardWillShow', async (info) => {
  const activeElement = document.activeElement as HTMLElement;

  if (activeElement) {
    // Wait for keyboard animation
    await new Promise((r) => setTimeout(r, 100));

    activeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
});
```

## iOS Accessory Bar

```typescript
// Show/hide the toolbar above keyboard
await Keyboard.setAccessoryBarVisible({ isVisible: true });
```

## Form Best Practices

```typescript
// Prevent zoom on iOS (use font-size >= 16px)
input {
  font-size: 16px;
}

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await Keyboard.hide();
  // Process form
});

// Move to next field
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const nextInput = getNextInput();
    if (nextInput) {
      nextInput.focus();
    } else {
      Keyboard.hide();
    }
  }
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Content hidden | Use resize mode |
| Slow animation | Use `keyboardWillShow` |
| iOS zoom | Use 16px font-size |
| Android overlap | Set `windowSoftInputMode` |

## Resources

- Capacitor Keyboard: https://capacitorjs.com/docs/apis/keyboard
