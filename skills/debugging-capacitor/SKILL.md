---
name: debugging-capacitor
description: Comprehensive debugging guide for Capacitor applications. Covers WebView debugging, native debugging, crash analysis, network inspection, and common issues. Use this skill when users report bugs, crashes, or need help diagnosing issues.
---

# Debugging Capacitor Applications

Complete guide to debugging Capacitor apps on iOS and Android.

## When to Use This Skill

- User reports app crashes
- User needs to debug WebView/JavaScript
- User needs to debug native code
- User has network/API issues
- User sees unexpected behavior
- User asks how to debug

## Quick Reference: Debugging Tools

| Platform | WebView Debug | Native Debug | Logs |
|----------|--------------|--------------|------|
| iOS | Safari Web Inspector | Xcode Debugger | Console.app |
| Android | Chrome DevTools | Android Studio | adb logcat |

## WebView Debugging

### iOS: Safari Web Inspector

1. **Enable on device**:
   - Settings > Safari > Advanced > Web Inspector: ON
   - Settings > Safari > Advanced > JavaScript: ON

2. **Enable in Xcode** (capacitor.config.ts):
```typescript
const config: CapacitorConfig = {
  ios: {
    webContentsDebuggingEnabled: true, // Required for iOS 16.4+
  },
};
```

3. **Connect Safari**:
   - Open Safari on Mac
   - Develop menu > [Device Name] > [App Name]
   - If no Develop menu: Safari > Settings > Advanced > Show Develop menu

4. **Debug**:
   - Console: View JavaScript logs
   - Network: Inspect API calls
   - Elements: Inspect DOM
   - Sources: Set breakpoints

### Android: Chrome DevTools

1. **Enable in config** (capacitor.config.ts):
```typescript
const config: CapacitorConfig = {
  android: {
    webContentsDebuggingEnabled: true,
  },
};
```

2. **Connect Chrome**:
   - Open Chrome on computer
   - Navigate to `chrome://inspect`
   - Your device/emulator should appear
   - Click "inspect" under your app

3. **Debug features**:
   - Console: JavaScript logs
   - Network: API requests
   - Performance: Profiling
   - Application: Storage, cookies

### Remote Debugging with VS Code

Install "Debugger for Chrome" extension:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "attach",
      "name": "Attach to Android WebView",
      "port": 9222,
      "webRoot": "${workspaceFolder}/dist"
    }
  ]
}
```

## Native Debugging

### iOS: Xcode Debugger

1. **Open in Xcode**:
```bash
npx cap open ios
```

2. **Set breakpoints**:
   - Click line number in Swift/Obj-C files
   - Or use `breakpoint set --name methodName` in LLDB

3. **Run with debugger**:
   - Product > Run (Cmd + R)
   - Or click Play button

4. **LLDB Console commands**:
```lldb
# Print variable
po myVariable

# Print object description
p myObject

# Continue execution
continue

# Step over
next

# Step into
step

# Print backtrace
bt
```

5. **View crash logs**:
   - Window > Devices and Simulators
   - Select device > View Device Logs

### Android: Android Studio Debugger

1. **Open in Android Studio**:
```bash
npx cap open android
```

2. **Attach debugger**:
   - Run > Attach Debugger to Android Process
   - Select your app

3. **Set breakpoints**:
   - Click line number in Java/Kotlin files

4. **Debug console**:
```
# Evaluate expression
myVariable

# Run method
myObject.toString()
```

5. **Logcat shortcuts**:
   - View > Tool Windows > Logcat
   - Filter by package: `package:com.yourapp`

## Console Logging

### JavaScript Side

```typescript
// Basic logging
console.log('Debug info:', data);
console.warn('Warning:', issue);
console.error('Error:', error);

// Grouped logs
console.group('API Call');
console.log('URL:', url);
console.log('Response:', response);
console.groupEnd();

// Table format
console.table(arrayOfObjects);

// Timing
console.time('operation');
// ... operation
console.timeEnd('operation');
```

### Native Side (iOS)

```swift
import os.log

let logger = Logger(subsystem: "com.yourapp", category: "MyPlugin")

// Log levels
logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")

// With data
logger.info("User ID: \(userId)")

// Legacy NSLog (shows in Console.app)
NSLog("Legacy log: %@", message)
```

### Native Side (Android)

```kotlin
import android.util.Log

// Log levels
Log.v("MyPlugin", "Verbose message")
Log.d("MyPlugin", "Debug message")
Log.i("MyPlugin", "Info message")
Log.w("MyPlugin", "Warning message")
Log.e("MyPlugin", "Error message")

// With exception
Log.e("MyPlugin", "Error occurred", exception)
```

## Common Issues and Solutions

### Issue: App Crashes on Startup

**Diagnosis**:
```bash
# iOS - Check crash logs
xcrun simctl spawn booted log stream --level debug | grep -i crash

# Android - Check logcat
adb logcat *:E | grep -i "fatal\|crash"
```

**Common causes**:
1. Missing plugin registration
2. Invalid capacitor.config
3. Missing native dependencies

**Solution checklist**:
- [ ] Run `npx cap sync`
- [ ] iOS: `cd ios/App && pod install`
- [ ] Check Info.plist permissions
- [ ] Check AndroidManifest.xml permissions

### Issue: Plugin Method Not Found

**Error**: `Error: "MyPlugin" plugin is not implemented on ios/android`

**Diagnosis**:
```typescript
import { Capacitor } from '@capacitor/core';

// Check if plugin exists
console.log('Plugins:', Capacitor.Plugins);
console.log('MyPlugin available:', !!Capacitor.Plugins.MyPlugin);
```

**Solutions**:
1. Ensure plugin is installed: `npm install @capgo/plugin-name`
2. Run sync: `npx cap sync`
3. Check plugin is registered (native code)

### Issue: Network Requests Failing

**Diagnosis**:
```typescript
// Add request interceptor
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('Fetch:', args[0]);
  try {
    const response = await originalFetch(...args);
    console.log('Response status:', response.status);
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
```

**Common causes**:
1. **iOS ATS blocking HTTP**: Add to Info.plist:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

2. **Android cleartext blocked**: Add to capacitor.config.ts:
```typescript
server: {
  cleartext: true, // Only for development!
}
```

3. **CORS issues**: Use native HTTP:
```typescript
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.request({
  method: 'GET',
  url: 'https://api.example.com/data',
});
```

### Issue: Permission Denied

**Diagnosis**:
```typescript
import { Permissions } from '@capacitor/core';

// Check permission status
const status = await Permissions.query({ name: 'camera' });
console.log('Camera permission:', status.state);
```

**iOS**: Check Info.plist has usage descriptions:
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan documents</string>
```

**Android**: Check AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### Issue: White Screen on Launch

**Diagnosis**:
1. Check WebView console for errors (Safari/Chrome)
2. Check if `dist/` folder exists
3. Verify `webDir` in capacitor.config.ts

**Solutions**:
```bash
# Rebuild web assets
npm run build

# Sync to native
npx cap sync

# Check config
cat capacitor.config.ts
```

### Issue: Deep Links Not Working

**Diagnosis**:
```typescript
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', (event) => {
  console.log('Deep link:', event.url);
});
```

**iOS**: Check Associated Domains entitlement and apple-app-site-association file.

**Android**: Check intent filters in AndroidManifest.xml.

## Performance Debugging

### JavaScript Performance

```typescript
// Mark performance
performance.mark('start');
// ... operation
performance.mark('end');
performance.measure('operation', 'start', 'end');

const measures = performance.getEntriesByName('operation');
console.log('Duration:', measures[0].duration);
```

### iOS Performance (Instruments)

1. Product > Profile (Cmd + I)
2. Choose template:
   - Time Profiler: CPU usage
   - Allocations: Memory usage
   - Network: Network activity

### Android Performance (Profiler)

1. View > Tool Windows > Profiler
2. Select:
   - CPU: Method tracing
   - Memory: Heap analysis
   - Network: Request timeline

## Memory Debugging

### JavaScript Memory Leaks

Use Chrome DevTools Memory tab:
1. Take heap snapshot
2. Perform action
3. Take another snapshot
4. Compare snapshots

### iOS Memory (Instruments)

```bash
# Run with Leaks instrument
xcrun instruments -t Leaks -D output.trace YourApp.app
```

### Android Memory (LeakCanary)

Add to build.gradle:
```groovy
debugImplementation 'com.squareup.leakcanary:leakcanary-android:2.12'
```

## Debugging Checklist

When debugging issues:

- [ ] Check WebView console (Safari/Chrome DevTools)
- [ ] Check native logs (Xcode Console/Logcat)
- [ ] Verify plugin is installed and synced
- [ ] Check permissions (Info.plist/AndroidManifest)
- [ ] Test on real device (not just simulator)
- [ ] Try clean build (`rm -rf node_modules && npm install`)
- [ ] Verify capacitor.config.ts settings
- [ ] Check for version mismatches (capacitor packages)

## Resources

- Capacitor Debugging Guide: https://capacitorjs.com/docs/guides/debugging
- Safari Web Inspector: https://webkit.org/web-inspector
- Chrome DevTools: https://developer.chrome.com/docs/devtools
- Xcode Debugging: https://developer.apple.com/documentation/xcode/debugging
- Android Studio Debugging: https://developer.android.com/studio/debug
