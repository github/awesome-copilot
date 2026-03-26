# Preferences

Key/value storage for lightweight persistent data. Not a database replacement.

**Platforms:** Android (SharedPreferences), iOS (UserDefaults), Web (localStorage)

## Installation

```bash
npm install @capacitor/preferences
npx cap sync
```

## Configuration

### iOS

Add to `ios/App/PrivacyInfo.xcprivacy` inside `NSPrivacyAccessedAPITypes`:

```xml
<dict>
  <key>NSPrivacyAccessedAPIType</key>
  <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
  <key>NSPrivacyAccessedAPITypeReasons</key>
  <array>
    <string>CA92.1</string>
  </array>
</dict>
```

## Usage

```typescript
import { Preferences } from '@capacitor/preferences';

await Preferences.set({ key: 'name', value: JSON.stringify({ first: 'John' }) });
const { value } = await Preferences.get({ key: 'name' });
await Preferences.remove({ key: 'name' });
await Preferences.clear();
const { keys } = await Preferences.keys();
```

## Notes

- Only supports string values; use JSON serialization for complex types.
