# App Launcher

Check if an app can be opened and open it via URL schemes or package names.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor/app-launcher
npx cap sync
```

## Configuration

### iOS

Declare target app URL schemes in `ios/App/App/Info.plist` via `LSApplicationQueriesSchemes`:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>com.example.app</string>
</array>
```

### Android

Android 11+ requires declaring target apps in `android/app/src/main/AndroidManifest.xml` within a `<queries>` tag:

```xml
<queries>
  <package android:name="com.example.app" />
</queries>
```

## Usage

```typescript
import { AppLauncher } from '@capacitor/app-launcher';

const { value } = await AppLauncher.canOpenUrl({ url: 'com.example.app' });
const { completed } = await AppLauncher.openUrl({ url: 'com.example.app://page' });
```
