# Camera

Photo capture and gallery selection.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/camera
npx cap sync
```

## Configuration

### iOS

Add to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to take photos.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Photo library access is required to save photos.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library access is required to select photos.</string>
```

### Android

Uses Android Photo Picker (API 30+) with automatic fallback. Storage permissions only needed with `saveToGallery: true`.

### Web

Requires PWA Elements (`@ionic/pwa-elements`).

## Usage

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri,
  source: CameraSource.Prompt,
});
const imageUrl = photo.webPath;
```

## Notes

- `CameraResultType`: Uri, Base64, DataUrl.
- `CameraSource`: Prompt, Camera, Photos.
- Also supports `pickImages()` and `pickLimitedLibraryPhotos()`.
