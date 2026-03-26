# Status Bar

Configure style, visibility, and background color of the Status Bar.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor/status-bar
npx cap sync
```

## Configuration

### iOS

Set `UIViewControllerBasedStatusBarAppearance` to `YES` in `ios/App/App/Info.plist`.

## Usage

```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

await StatusBar.setStyle({ style: Style.Dark });
await StatusBar.setBackgroundColor({ color: '#ffffff' });
await StatusBar.hide({ animation: Animation.Fade });
await StatusBar.show();
await StatusBar.setOverlaysWebView({ overlay: true });
const info = await StatusBar.getInfo();
```

## Notes

- **Android 16+ breaking change**: `overlaysWebView` and `backgroundColor` no longer function due to enforced edge-to-edge behavior.
- Animation parameter is iOS-only.
