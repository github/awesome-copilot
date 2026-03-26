# Geolocation

GPS position tracking with altitude, heading, and speed data.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/geolocation
npx cap sync
```

## Configuration

### iOS

Add to `ios/App/App/Info.plist`:

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Location access is required.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location access is required.</string>
```

### Android

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" />
```

## Usage

```typescript
import { Geolocation } from '@capacitor/geolocation';

const position = await Geolocation.getCurrentPosition();
console.log(position.coords.latitude, position.coords.longitude);

const watchId = await Geolocation.watchPosition(
  { enableHighAccuracy: true },
  (position) => {
    console.log(position.coords);
  },
);

Geolocation.clearWatch({ id: watchId });
```
