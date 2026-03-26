---
name: safe-area-handling
description: Complete guide to handling safe areas in Capacitor apps for iPhone notch, Dynamic Island, home indicator, and Android cutouts. Covers CSS, JavaScript, and native solutions. Use this skill when users have layout issues on modern devices.
---

# Safe Area Handling in Capacitor

Handle iPhone notch, Dynamic Island, home indicator, and Android cutouts properly.

## When to Use This Skill

- User has layout issues on notched devices
- User asks about safe areas
- User sees content under the notch
- User needs fullscreen layout
- Content is hidden by home indicator

## Understanding Safe Areas

### What Are Safe Areas?

Safe areas are the regions of the screen not obscured by:
- **iPhone**: Notch, Dynamic Island, home indicator, rounded corners
- **Android**: Camera cutouts, navigation gestures, display cutouts

### Safe Area Insets

| Inset | Description |
|-------|-------------|
| `safe-area-inset-top` | Notch/Dynamic Island/status bar |
| `safe-area-inset-bottom` | Home indicator/navigation bar |
| `safe-area-inset-left` | Left edge (landscape) |
| `safe-area-inset-right` | Right edge (landscape) |

## CSS Solution

### Enable Viewport Coverage

```html
<!-- index.html -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
```

**Important**: `viewport-fit=cover` is required to access safe area insets.

### Using CSS Environment Variables

```css
/* Basic usage */
.header {
  padding-top: env(safe-area-inset-top);
}

.footer {
  padding-bottom: env(safe-area-inset-bottom);
}

/* With fallback */
.header {
  padding-top: env(safe-area-inset-top, 20px);
}

/* Combined with other padding */
.content {
  padding-top: calc(env(safe-area-inset-top) + 16px);
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
}
```

### Full Page Layout

```css
/* App container */
.app {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
}

/* Header respects notch */
.header {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  background: #fff;
}

/* Scrollable content */
.content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Footer respects home indicator */
.footer {
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  background: #fff;
}
```

### Tab Bar with Safe Area

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  border-top: 1px solid #eee;

  /* Add padding for home indicator */
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  min-height: 49px; /* iOS standard height */
}
```

### Full-Bleed Background with Safe Content

```css
.hero {
  /* Background extends to edges */
  background: linear-gradient(to bottom, #4f46e5, #7c3aed);
  padding-top: calc(env(safe-area-inset-top) + 20px);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.hero-content {
  /* Content stays in safe area */
  max-width: 100%;
}
```

## JavaScript Solution

### Reading Safe Area Values

```typescript
function getSafeAreaInsets() {
  const computedStyle = getComputedStyle(document.documentElement);

  return {
    top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
    left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
    right: parseInt(computedStyle.getPropertyValue('--sar') || '0'),
  };
}

// Set CSS custom properties
function setSafeAreaProperties() {
  const style = document.documentElement.style;

  // Create temporary element to read values
  const temp = document.createElement('div');
  temp.style.paddingTop = 'env(safe-area-inset-top)';
  temp.style.paddingBottom = 'env(safe-area-inset-bottom)';
  temp.style.paddingLeft = 'env(safe-area-inset-left)';
  temp.style.paddingRight = 'env(safe-area-inset-right)';
  document.body.appendChild(temp);

  const computed = getComputedStyle(temp);
  style.setProperty('--sat', computed.paddingTop);
  style.setProperty('--sab', computed.paddingBottom);
  style.setProperty('--sal', computed.paddingLeft);
  style.setProperty('--sar', computed.paddingRight);

  document.body.removeChild(temp);
}

// Update on orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(setSafeAreaProperties, 100);
});
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    function updateInsets() {
      const temp = document.createElement('div');
      temp.style.cssText = `
        position: fixed;
        top: 0;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      `;
      document.body.appendChild(temp);

      const computed = getComputedStyle(temp);
      setInsets({
        top: parseFloat(computed.paddingTop) || 0,
        bottom: parseFloat(computed.paddingBottom) || 0,
        left: parseFloat(computed.paddingLeft) || 0,
        right: parseFloat(computed.paddingRight) || 0,
      });

      document.body.removeChild(temp);
    }

    updateInsets();
    window.addEventListener('resize', updateInsets);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateInsets, 100);
    });

    return () => {
      window.removeEventListener('resize', updateInsets);
    };
  }, []);

  return insets;
}

// Usage
function Header() {
  const { top } = useSafeArea();

  return (
    <header style={{ paddingTop: top }}>
      App Header
    </header>
  );
}
```

### Vue Composable

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useSafeArea() {
  const insets = ref({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  function updateInsets() {
    const temp = document.createElement('div');
    temp.style.cssText = `
      position: fixed;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    `;
    document.body.appendChild(temp);

    const computed = getComputedStyle(temp);
    insets.value = {
      top: parseFloat(computed.paddingTop) || 0,
      bottom: parseFloat(computed.paddingBottom) || 0,
      left: parseFloat(computed.paddingLeft) || 0,
      right: parseFloat(computed.paddingRight) || 0,
    };

    document.body.removeChild(temp);
  }

  onMounted(() => {
    updateInsets();
    window.addEventListener('resize', updateInsets);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateInsets);
  });

  return insets;
}
```

## Native iOS Configuration

### Status Bar Style

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  ios: {
    // Content extends behind status bar
    contentInset: 'automatic', // or 'always', 'scrollableAxes', 'never'
  },
};
```

### Extend Behind Safe Areas

```swift
// ios/App/App/AppDelegate.swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Extend content to edges
        if let window = UIApplication.shared.windows.first {
            window.backgroundColor = .clear
        }
        return true
    }
}
```

### Info.plist Settings

```xml
<!-- ios/App/App/Info.plist -->
<!-- Allow full screen content -->
<key>UIViewControllerBasedStatusBarAppearance</key>
<true/>

<!-- For landscape support -->
<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

## Native Android Configuration

### Display Cutout Mode

```xml
<!-- android/app/src/main/res/values-v28/styles.xml -->
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <!-- Extend content into cutout area -->
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    </style>
</resources>
```

### Edge-to-Edge Display

```kotlin
// android/app/src/main/java/.../MainActivity.kt
import android.os.Build
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
        }
    }
}
```

### AndroidManifest Configuration

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity
    android:name=".MainActivity"
    android:theme="@style/AppTheme"
    android:windowSoftInputMode="adjustResize"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">
</activity>
```

## Capacitor Status Bar Plugin

### Installation

```bash
npm install @capacitor/status-bar
npx cap sync
```

### Usage

```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

// Set status bar style
await StatusBar.setStyle({ style: Style.Dark });

// Set background color (Android)
await StatusBar.setBackgroundColor({ color: '#ffffff' });

// Show/hide status bar
await StatusBar.hide();
await StatusBar.show();

// Overlay mode
await StatusBar.setOverlaysWebView({ overlay: true });
```

## Common Issues and Solutions

### Issue: Content Behind Notch

**Solution**: Add viewport-fit and safe area padding

```html
<meta name="viewport" content="viewport-fit=cover">
```

```css
body {
  padding-top: env(safe-area-inset-top);
}
```

### Issue: Tab Bar Under Home Indicator

**Solution**: Add bottom safe area padding

```css
.tab-bar {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Issue: Landscape Layout Broken

**Solution**: Handle left/right insets

```css
.content {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### Issue: Keyboard Pushes Content

**Solution**: Use adjustResize and handle insets dynamically

```typescript
import { Keyboard } from '@capacitor/keyboard';

Keyboard.addListener('keyboardWillShow', (info) => {
  document.body.style.paddingBottom = `${info.keyboardHeight}px`;
});

Keyboard.addListener('keyboardWillHide', () => {
  document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
});
```

### Issue: Safe Areas Not Working in WebView

**Cause**: Missing viewport-fit=cover

**Solution**:
```html
<!-- Must be exactly like this -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
```

## Testing Safe Areas

### iOS Simulator

1. Use iPhone with notch (iPhone 14 Pro, etc.)
2. Test both portrait and landscape
3. Test with keyboard visible

### Android Emulator

1. Create emulator with camera cutout
2. Test navigation gesture mode
3. Test 3-button navigation mode

### Preview Different Devices

```css
/* Debug mode - visualize safe areas */
.debug-safe-areas::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top);
  background: rgba(255, 0, 0, 0.3);
  z-index: 9999;
  pointer-events: none;
}

.debug-safe-areas::after {
  content: '';
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom);
  background: rgba(0, 0, 255, 0.3);
  z-index: 9999;
  pointer-events: none;
}
```

## Resources

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/layout
- Android Display Cutouts: https://developer.android.com/develop/ui/views/layout/display-cutout
- CSS env() specification: https://drafts.csswg.org/css-env-1/
- Capacitor Status Bar: https://capacitorjs.com/docs/apis/status-bar
