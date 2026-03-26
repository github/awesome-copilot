# Device

Exposes internal device information (model, OS version, unique IDs).

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/device
npx cap sync
```

## Usage

```typescript
import { Device } from '@capacitor/device';

const info = await Device.getInfo();
const id = await Device.getId();
const battery = await Device.getBatteryInfo();
const { value } = await Device.getLanguageCode();
```

## Notes

- `getId()` returns UUID on iOS, 64-bit hex on Android 8+, random on web with localStorage.
- `getBatteryInfo()` returns `batteryLevel` (0-1) and `isCharging`.
