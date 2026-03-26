# Screen Orientation

Screen orientation information and locking.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/screen-orientation
npx cap sync
```

## Usage

```typescript
import { ScreenOrientation } from '@capacitor/screen-orientation';

const { type } = await ScreenOrientation.orientation();
await ScreenOrientation.lock({ orientation: 'portrait' });
await ScreenOrientation.unlock();

ScreenOrientation.addListener('screenOrientationChange', (result) => {
  console.log('Orientation:', result.type);
});
```

## Notes

- `OrientationLockType`: 'any', 'natural', 'landscape', 'portrait', 'portrait-primary', 'portrait-secondary', 'landscape-primary', 'landscape-secondary'.
- iPad: requires `UIRequiresFullScreen` = `true` in `ios/App/App/Info.plist`.
- Android 16+ (targetSdk 36): `lock()` has no effect on large screens.
