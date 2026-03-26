# Motion

Tracks accelerometer and device orientation (compass heading, etc.).

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/motion
npx cap sync
```

## Usage

```typescript
import { Motion } from '@capacitor/motion';

Motion.addListener('accel', (event) => {
  console.log('Acceleration:', event.acceleration);
  console.log('Rotation:', event.rotationRate);
});

Motion.addListener('orientation', (event) => {
  console.log('Orientation:', event.alpha, event.beta, event.gamma);
});
```

## Notes

- Requires user permission before accessing motion data.
- Must request on user-initiated action (button click) via DeviceMotionEvent API on web.
