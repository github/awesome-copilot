# Google Maps

Integrates Google Maps SDK into Capacitor applications.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/google-maps
npx cap sync
```

## Configuration

### iOS

Add `skipLibCheck: true` to `tsconfig.json`. Add `NSLocationWhenInUseUsageDescription` to `ios/App/App/Info.plist` for current location.

### Android

Add API key to `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_API_KEY_HERE"/>
```

Add location permissions if using current location:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Web

Requires API key with billing enabled from Google Cloud Console.

## Usage

```typescript
import { GoogleMap } from '@capacitor/google-maps';

const mapElement = document.querySelector<HTMLElement>('#map');
if (!mapElement) throw new Error('Map element not found');

const map = await GoogleMap.create({
  id: 'my-map',
  element: mapElement,
  apiKey: 'YOUR_API_KEY',
  config: { center: { lat: 33.6, lng: -117.9 }, zoom: 8 },
});

const markerId = await map.addMarker({
  coordinate: { lat: 33.6, lng: -117.9 },
  title: 'My Location',
});
```

## Notes

- Map renders beneath the entire webview on Android; ensure transparency through all layers.
- Custom marker icons support PNG/JPG only (no SVG on native).
- Requires `<capacitor-google-map>` custom web component with explicit CSS sizing.
- Framework-specific setup needed for Angular/React/Vue.
