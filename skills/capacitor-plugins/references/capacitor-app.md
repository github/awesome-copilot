# App

Handles high-level app state and events including foreground/background transitions, deep links, and back button handling.

**Platforms:** Android, iOS, Web (partial)

## Installation

```bash
npm install @capacitor/app
npx cap sync
```

## Configuration

### iOS

Add custom URL schemes in `ios/App/App/Info.plist` via `CFBundleURLTypes`.

### Android

Add custom URL schemes via `intent-filter` in `android/app/src/main/AndroidManifest.xml` with scheme in `android/app/src/main/res/values/strings.xml`.

Config option `disableBackButtonHandler` (boolean, default: false, Android only) in `capacitor.config.ts`.

## Usage

```typescript
import { App } from '@capacitor/app';

const appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
  console.log('App state:', isActive);
});

const appUrlHandle = await App.addListener('appUrlOpen', (data) => {
  console.log('Deep link:', data.url);
});

const info = await App.getInfo();
const launch = await App.getLaunchUrl();
const url = launch?.url;

// Cleanup when the screen or component is torn down.
await appStateHandle.remove();
await appUrlHandle.remove();
```

## Notes

- `exitApp()`, `minimizeApp()` are Android-only.
- `backButton` and `appRestoredResult` events are Android-only.
