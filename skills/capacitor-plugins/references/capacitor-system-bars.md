# System Bars

Modern edge-to-edge API for configuring system bars (status bar + navigation bar). Replaces Status Bar plugin for new apps.

**Platforms:** Android, iOS

## Installation

Bundled with `@capacitor/core`. No separate install needed.

## Configuration

### iOS

Set `UIViewControllerBasedStatusBarAppearance` to `YES` in `ios/App/App/Info.plist`.

### Android

Injects `--safe-area-inset-x` CSS variables as fallback for older Android WebView versions (<140).

## Usage

```typescript
import { SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';

await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
await SystemBars.hide({ types: [SystemBarType.StatusBar] });
await SystemBars.show({ types: [SystemBarType.NavigationBar] });
await SystemBars.setAnimation({ animation: 'FADE' });
```

## Notes

- `setAnimation()` is iOS-only (values: 'FADE', 'NONE').
- Config options: `insetsHandling` (Android), `style`, `hidden`, `animation` (iOS).
