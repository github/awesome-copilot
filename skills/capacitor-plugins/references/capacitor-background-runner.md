# Background Runner

Event-based standalone JavaScript environment for executing code outside the webview.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor/background-runner
npx cap sync
```

## Configuration

### Capacitor Config

```json
{
  "plugins": {
    "BackgroundRunner": {
      "label": "com.example.background.task",
      "src": "runners/background.js",
      "event": "myCustomEvent",
      "repeat": true,
      "interval": 15,
      "autoStart": true
    }
  }
}
```

### iOS

- Enable Background Modes capability: "Background fetch" and "Background processing".
- Add `BGTaskSchedulerPermittedIdentifiers` to `ios/App/App/Info.plist`.
- In `ios/App/App/AppDelegate.swift`, import `CapacitorBackgroundRunner`.
- Call `BackgroundRunnerPlugin.handleApplicationDidFinishLaunching(launchOptions: launchOptions)` inside `application(_:didFinishLaunchingWithOptions:)`.
- Register the task with `BackgroundRunnerPlugin.registerBackgroundTask()`.

### Android

- Geolocation: `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` permissions in `android/app/src/main/AndroidManifest.xml`.
- Android 13+: call `checkPermissions()` / `requestPermissions()` for notifications.
- Android 12+: `SCHEDULE_EXACT_ALARM` permission.

## Usage

```typescript
import { BackgroundRunner } from '@capacitor/background-runner';

await BackgroundRunner.dispatchEvent({
  label: 'com.example.background.task',
  event: 'myCustomEvent',
  details: {},
});
```

## Notes

- iOS: ~30 second runtime per invocation.
- Android: 10-minute max runtime, 15-minute minimum repeat interval.
- Runner context destroyed after resolve/reject. No state persistence between events.
