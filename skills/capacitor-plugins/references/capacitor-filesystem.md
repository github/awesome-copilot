# Filesystem

Node.js-like API for device file operations (read, write, delete, manage files and directories).

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/filesystem
npx cap sync
```

## Configuration

### iOS

Add to `ios/App/PrivacyInfo.xcprivacy` inside `NSPrivacyAccessedAPITypes`:

```xml
<dict>
  <key>NSPrivacyAccessedAPIType</key>
  <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
  <key>NSPrivacyAccessedAPITypeReasons</key>
  <array>
    <string>C617.1</string>
  </array>
</dict>
```

Add to `ios/App/App/Info.plist`:

```xml
<key>UIFileSharingEnabled</key>
<true/>
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

### Android

`READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` permissions for `Directory.Documents` or `Directory.ExternalStorage` on Android 10 and older. Large files may need `android:largeHeap="true"` in `android/app/src/main/AndroidManifest.xml`.

## Usage

```typescript
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

await Filesystem.mkdir({
  path: 'secrets',
  directory: Directory.Documents,
  recursive: true,
});

await Filesystem.writeFile({
  path: 'secrets/text.txt',
  data: 'Hello',
  directory: Directory.Documents,
  encoding: Encoding.UTF8,
});

const contents = await Filesystem.readFile({
  path: 'secrets/text.txt',
  directory: Directory.Documents,
  encoding: Encoding.UTF8,
});

const files = await Filesystem.readdir({
  path: '',
  directory: Directory.Documents,
});
```

## Notes

- Available directories: Documents, Data, Library, Cache, External, ExternalStorage, ExternalCache, LibraryNoCloud, Temporary.
- `downloadFile()` is deprecated; use `@capacitor/file-transfer` instead.
