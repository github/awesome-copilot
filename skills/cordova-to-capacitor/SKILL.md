---
name: cordova-to-capacitor
description: Complete guide for migrating from Apache Cordova to Capacitor. Use this skill when users need to modernize a Cordova/PhoneGap app to Capacitor, migrate plugins, or understand platform differences.
---

# Cordova to Capacitor Migration

Step-by-step guide for migrating from Apache Cordova/PhoneGap to Capacitor.

## When to Use This Skill

- Migrating an existing Cordova app to Capacitor
- Converting PhoneGap projects to Capacitor
- Understanding Cordova vs Capacitor differences
- Finding Capacitor equivalents for Cordova plugins
- Modernizing hybrid mobile apps

## Why Migrate from Cordova?

| Aspect | Cordova | Capacitor |
|--------|---------|-----------|
| Native IDE | Builds via CLI | First-class Xcode/Android Studio |
| Plugin Management | Separate ecosystem | npm packages |
| Updates | Full app store review | Live updates with Capgo |
| Web App Platform | Any | Any (React, Vue, Angular, etc.) |
| Maintenance | Slowing down | Active development |
| TypeScript | Limited | Full support |
| Modern APIs | Older patterns | Modern Promise-based APIs |

## Migration Process Overview

### Step 1: Assess Your Current App

**Check Cordova version:**
```bash
cordova --version
cordova platform version
```

**List installed plugins:**
```bash
cordova plugin list
```

**Review config.xml:**
```bash
cat config.xml
```

### Step 2: Install Capacitor

**In your existing Cordova project:**
```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init
```

**When prompted:**
- **App name**: Your app's display name
- **App ID**: Use the same ID from config.xml (e.g., `com.company.app`)
- **Web directory**: Usually `www` for Cordova projects

### Step 3: Add Platforms

**Capacitor doesn't modify web assets. Add platforms separately:**

```bash
# Add iOS platform
npm install @capacitor/ios
npx cap add ios

# Add Android platform
npm install @capacitor/android
npx cap add android
```

This creates:
- `ios/` directory with Xcode project
- `android/` directory with Android Studio project

### Step 4: Migrate Plugins

**CRITICAL: Check plugin compatibility first.**

#### Core Cordova Plugins → Capacitor Equivalents

| Cordova Plugin | Capacitor Equivalent | Install Command |
|----------------|---------------------|-----------------|
| cordova-plugin-camera | @capacitor/camera | `npm install @capacitor/camera` |
| cordova-plugin-geolocation | @capacitor/geolocation | `npm install @capacitor/geolocation` |
| cordova-plugin-device | @capacitor/device | `npm install @capacitor/device` |
| cordova-plugin-network-information | @capacitor/network | `npm install @capacitor/network` |
| cordova-plugin-statusbar | @capacitor/status-bar | `npm install @capacitor/status-bar` |
| cordova-plugin-splashscreen | @capacitor/splash-screen | `npm install @capacitor/splash-screen` |
| cordova-plugin-keyboard | @capacitor/keyboard | `npm install @capacitor/keyboard` |
| cordova-plugin-dialogs | @capacitor/dialog | `npm install @capacitor/dialog` |
| cordova-plugin-file | @capacitor/filesystem | `npm install @capacitor/filesystem` |
| cordova-plugin-inappbrowser | @capacitor/browser | `npm install @capacitor/browser` |
| cordova-plugin-media | @capacitor/media | Custom or use @capgo plugins |
| cordova-plugin-vibration | @capacitor/haptics | `npm install @capacitor/haptics` |
| cordova-plugin-local-notifications | @capacitor/local-notifications | `npm install @capacitor/local-notifications` |
| cordova-plugin-push | @capacitor/push-notifications | `npm install @capacitor/push-notifications` |

#### Third-Party Cordova Plugins → Capgo Equivalents

**For biometrics:**
```bash
# Cordova
cordova plugin add cordova-plugin-fingerprint-aio

# Capacitor
npm install @capgo/capacitor-native-biometric
```

**For payments:**
```bash
# Cordova
cordova plugin add cordova-plugin-purchase

# Capacitor
npm install @capgo/capacitor-purchases
```

**For social login:**
```bash
# Facebook
npm install @capgo/capacitor-social-login

# Google
npm install @codetrix-studio/capacitor-google-auth
```

**Check the full plugin catalog:**
https://github.com/Cap-go/awesome-capacitor

### Step 5: Update Code

#### Import Changes

**Cordova (old):**
```javascript
document.addEventListener('deviceready', () => {
  navigator.camera.getPicture(success, error, options);
});
```

**Capacitor (new):**
```typescript
import { Camera } from '@capacitor/camera';

// No deviceready event needed
const image = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri
});
```

#### Common Pattern Changes

**Device Information:**
```typescript
// Cordova
const uuid = device.uuid;
const platform = device.platform;

// Capacitor
import { Device } from '@capacitor/device';
const info = await Device.getId();
const platform = await Device.getInfo();
```

**Network Status:**
```typescript
// Cordova
const networkState = navigator.connection.type;

// Capacitor
import { Network } from '@capacitor/network';
const status = await Network.getStatus();
console.log('Connected:', status.connected);
```

**Geolocation:**
```typescript
// Cordova
navigator.geolocation.getCurrentPosition(success, error);

// Capacitor
import { Geolocation } from '@capacitor/geolocation';
const position = await Geolocation.getCurrentPosition();
```

#### Remove deviceready Event

**Capacitor doesn't need deviceready.** Plugins work immediately.

```typescript
// Cordova (remove this)
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
  // Your code
}

// Capacitor (just use directly)
import { Camera } from '@capacitor/camera';

async function takePicture() {
  const photo = await Camera.getPhoto();
}
```

### Step 6: Update Configuration

**Cordova uses config.xml. Capacitor uses capacitor.config.ts**

#### Create capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.app', // From config.xml widget id
  appName: 'My App',         // From config.xml name
  webDir: 'www',             // From Cordova build output
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
```

#### Migrate config.xml Settings

**Preferences:**
```xml
<!-- Cordova config.xml -->
<preference name="Orientation" value="portrait" />
<preference name="StatusBarOverlaysWebView" value="false" />
<preference name="StatusBarBackgroundColor" value="#000000" />
```

**Capacitor equivalent:**
- Orientation: Set in Xcode/Android Studio per platform
- StatusBar: Use `@capacitor/status-bar` plugin

**Platform-specific config:**
```xml
<!-- Cordova config.xml -->
<platform name="ios">
  <allow-intent href="itms:*" />
</platform>
```

**Capacitor equivalent:**
```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: true,
  }
};
```

### Step 7: Handle Permissions

**Capacitor requires explicit permission configuration.**

#### iOS: Info.plist

**Add to ios/App/App/Info.plist:**
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to take photos</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select images</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We need location to show nearby places</string>

<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access for audio recording</string>
```

#### Android: AndroidManifest.xml

**Add to android/app/src/main/AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### Step 8: Sync and Build

**Sync web code with native projects:**
```bash
npx cap sync
```

**This copies:**
- Web assets from `www/` to native projects
- Installs native dependencies
- Updates plugin configurations

**Build for iOS:**
```bash
npx cap open ios
# Then build in Xcode (Cmd+R)
```

**Build for Android:**
```bash
npx cap open android
# Then build in Android Studio (Run)
```

### Step 9: Test the App

**Test all plugin functionality:**
- Camera/photo picker
- Geolocation
- File operations
- Network detection
- Device information
- Push notifications

**Check for:**
- Missing permissions
- API differences
- Callback → Promise conversions
- Removed plugins

### Step 10: Remove Cordova

**Once migration is complete and tested:**

```bash
# Remove Cordova platforms
cordova platform remove ios
cordova platform remove android

# Remove Cordova
npm uninstall cordova
npm uninstall cordova-ios
npm uninstall cordova-android

# Remove Cordova plugins
cordova plugin list | xargs -I {} cordova plugin remove {}

# Remove config.xml (after backing up)
mv config.xml config.xml.backup
```

## Common Issues and Solutions

### Issue: Plugin Not Found

**Problem:**
```
Error: Plugin not found
```

**Solution:**
1. Check if plugin is installed: `npm list`
2. Sync native projects: `npx cap sync`
3. Clean and rebuild in Xcode/Android Studio

### Issue: deviceready Never Fires

**Problem:**
Cordova's deviceready event doesn't exist in Capacitor.

**Solution:**
Remove all `deviceready` event listeners. Capacitor plugins work immediately.

```typescript
// Remove this
document.addEventListener('deviceready', onDeviceReady);

// Use this
import { App } from '@capacitor/app';
App.addListener('appStateChange', (state) => {
  console.log('App state changed:', state.isActive);
});
```

### Issue: White Screen on Startup

**Problem:**
App shows white screen or crashes.

**Solution:**
1. Check `webDir` in capacitor.config.ts points to correct build output
2. Rebuild web app: `npm run build`
3. Sync: `npx cap sync`
4. Check browser console in device for errors

### Issue: Permissions Not Working

**Problem:**
Camera/location/etc. fail silently.

**Solution:**
1. Add permission strings to Info.plist (iOS)
2. Add permission declarations to AndroidManifest.xml (Android)
3. Request permissions explicitly in code:

```typescript
import { Camera } from '@capacitor/camera';

// Capacitor handles permission prompts automatically
const photo = await Camera.getPhoto();
```

### Issue: Plugins Using Old Cordova API

**Problem:**
Some third-party Cordova plugins still reference Cordova global.

**Solution:**
Use the Capacitor Cordova compatibility layer:

```bash
npm install cordova-plugin-example
npx cap sync
```

Capacitor includes Cordova compatibility, but:
- It's best to migrate to native Capacitor plugins when possible
- Not all Cordova plugins will work

## Hybrid Approach: Run Both

**You can run Cordova and Capacitor side-by-side during migration.**

1. Install Capacitor alongside Cordova
2. Keep both config.xml and capacitor.config.ts
3. Migrate plugins incrementally
4. Test each platform independently

**When ready, remove Cordova entirely.**

## Plugin Migration Checklist

- [ ] List all Cordova plugins: `cordova plugin list`
- [ ] Find Capacitor equivalents (use table above)
- [ ] Install Capacitor plugins: `npm install @capacitor/plugin-name`
- [ ] Update imports in code
- [ ] Convert callbacks to async/await
- [ ] Remove `deviceready` event listeners
- [ ] Add permission strings (iOS Info.plist, Android AndroidManifest.xml)
- [ ] Sync native projects: `npx cap sync`
- [ ] Test on physical devices
- [ ] Remove Cordova plugins after verification

## Live Updates with Capgo

**Capacitor enables instant updates without app store review.**

After migration, add Capgo for OTA updates:

```bash
# Install Capgo plugin
npm install @capgo/capacitor-updater

# Create account at capgo.app
npm install -g @capgo/cli
capgo login

# Initialize and deploy
capgo init
npm run build
capgo upload
```

Users get updates instantly. See the `capgo-live-updates` skill for details.

## Resources

- **Official Migration Guide**: https://capacitorjs.com/docs/cordova/migrating-from-cordova-to-capacitor
- **Capacitor Docs**: https://capacitorjs.com/docs
- **Plugin Search**: https://github.com/Cap-go/awesome-capacitor
- **Capgo Plugins**: https://github.com/Cap-go?q=capacitor
- **Community Forum**: https://forum.ionicframework.com/c/capacitor

## Migration Timeline Estimate

| App Size | Estimated Time |
|----------|----------------|
| Small (1-3 plugins) | 2-4 hours |
| Medium (4-8 plugins) | 1-2 days |
| Large (9+ plugins) | 3-5 days |
| Enterprise (custom plugins) | 1-2 weeks |

## Post-Migration Benefits

After migrating from Cordova to Capacitor:

✅ **Faster development** - Direct access to Xcode/Android Studio
✅ **Live updates** - Deploy updates without app store review (with Capgo)
✅ **Better TypeScript** - Full type safety
✅ **Modern APIs** - Promise-based, async/await
✅ **Active maintenance** - Regular updates and improvements
✅ **Better debugging** - Native IDE debugging tools
✅ **Improved performance** - Optimized native bridge

## Next Steps

1. Complete the migration using steps above
2. Test thoroughly on physical devices
3. Set up CI/CD (see `capacitor-ci-cd` skill)
4. Add live updates (see `capgo-live-updates` skill)
5. Submit to app stores (see `capacitor-app-store` skill)
