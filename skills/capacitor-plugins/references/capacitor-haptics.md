# Haptics

Physical feedback through touch or vibration.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor/haptics
npx cap sync
```

## Usage

```typescript
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

await Haptics.impact({ style: ImpactStyle.Heavy });
await Haptics.notification({ type: NotificationType.Success });
await Haptics.vibrate({ duration: 500 });
await Haptics.selectionStart();
await Haptics.selectionChanged();
await Haptics.selectionEnd();
```

## Notes

- `ImpactStyle`: Heavy, Medium, Light.
- `NotificationType`: Success, Warning, Error.
- Devices without Taptic Engine or Vibrator execute calls silently.
