# Watch

Build watch interfaces in web code for display on paired Apple Watch devices. Experimental (CapacitorLABS).

**Platforms:** iOS only

## Installation

```bash
npm install @capacitor/watch
npx cap sync
```

## Configuration

### iOS

1. Add Background Modes capability: "Background Fetch", "Remote Notifications", "Background Processing".
2. Add Push Notification capability.
3. Modify `ios/App/App/AppDelegate.swift`: import `WatchConnectivity` and `CapacitorWatch`, activate `WCSession`.
4. Create watchOS app target with bundle ID `[app-bundle-id].watchapp`.
5. Configure watch app main file with `WCSession` and `CapWatchContentView()`.
6. Add Background Modes to watch target: "Remote Notifications".

## Usage

```typescript
import { Watch } from '@capacitor/watch';

await Watch.updateWatchUI({
  watchUI: 'Text("Hello $name")\nButton("Tap Me", "tapCommand")',
});
await Watch.updateWatchData({ data: { name: 'World' } });

Watch.addListener('runCommand', (command) => {
  console.log('Watch command:', command);
});
```

## Notes

- Simulators do not support app-to-watch communication; physical devices required for testing.
- UI format: String-based with `Text()` and `Button()` components. Variables use `$variableName` syntax.
