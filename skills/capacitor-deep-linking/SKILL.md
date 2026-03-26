---
name: capacitor-deep-linking
description: Complete guide to implementing deep links and universal links in Capacitor apps. Covers iOS Universal Links, Android App Links, custom URL schemes, and navigation handling. Use this skill when users need to open their app from links.
---

# Deep Linking in Capacitor

Implement deep links, universal links, and app links in Capacitor apps.

## When to Use This Skill

- User wants deep links
- User needs universal links
- User asks about URL schemes
- User wants to open app from links
- User needs share links

## Types of Deep Links

| Type | Platform | Format | Requires Server |
|------|----------|--------|-----------------|
| Custom URL Scheme | Both | `myapp://path` | No |
| Universal Links | iOS | `https://myapp.com/path` | Yes |
| App Links | Android | `https://myapp.com/path` | Yes |

## Quick Start

### Install Plugin

```bash
npm install @capacitor/app
npx cap sync
```

### Handle Deep Links

```typescript
import { App } from '@capacitor/app';

// Listen for deep link opens
App.addListener('appUrlOpen', (event) => {
  console.log('App opened with URL:', event.url);

  // Parse and navigate
  const url = new URL(event.url);
  handleDeepLink(url);
});

function handleDeepLink(url: URL) {
  // Custom scheme: myapp://product/123
  // Universal link: https://myapp.com/product/123

  const path = url.pathname || url.host + url.pathname;

  // Route based on path
  if (path.startsWith('/product/')) {
    const productId = path.split('/')[2];
    navigateTo(`/product/${productId}`);
  } else if (path.startsWith('/user/')) {
    const userId = path.split('/')[2];
    navigateTo(`/profile/${userId}`);
  } else if (path === '/login') {
    navigateTo('/login');
  } else {
    navigateTo('/');
  }
}
```

## Custom URL Scheme

### iOS Configuration

```xml
<!-- ios/App/App/Info.plist -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.yourcompany.yourapp</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>myapp</string>
            <string>myapp-dev</string>
        </array>
    </dict>
</array>
```

### Android Configuration

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity android:name=".MainActivity">
    <!-- Deep link intent filter -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />

        <data android:scheme="myapp" />
    </intent-filter>
</activity>
```

### Test Custom Scheme

```bash
# iOS Simulator
xcrun simctl openurl booted "myapp://product/123"

# Android
adb shell am start -a android.intent.action.VIEW -d "myapp://product/123"
```

## Universal Links (iOS)

### 1. Enable Associated Domains

In Xcode:
1. Select App target
2. Signing & Capabilities
3. + Capability > Associated Domains
4. Add: `applinks:myapp.com`

### 2. Create apple-app-site-association

Host at `https://myapp.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.yourcompany.yourapp",
        "paths": [
          "/product/*",
          "/user/*",
          "/invite/*",
          "NOT /api/*"
        ]
      }
    ]
  }
}
```

**Requirements**:
- Served over HTTPS
- Content-Type: `application/json`
- No redirects
- File at root domain

### 3. Info.plist

```xml
<!-- ios/App/App/Info.plist -->
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:myapp.com</string>
    <string>applinks:www.myapp.com</string>
</array>
```

### Verify Universal Links

```bash
# Validate AASA file
curl -I https://myapp.com/.well-known/apple-app-site-association

# Check Apple CDN cache
curl "https://app-site-association.cdn-apple.com/a/v1/myapp.com"
```

## App Links (Android)

### 1. Create assetlinks.json

Host at `https://myapp.com/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourcompany.yourapp",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

### Get SHA256 Fingerprint

```bash
# Debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release keystore
keytool -list -v -keystore release.keystore -alias your-alias

# From APK
keytool -printcert -jarfile app-release.apk
```

### 2. AndroidManifest.xml

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity android:name=".MainActivity">
    <!-- App Links intent filter -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />

        <data android:scheme="https" />
        <data android:host="myapp.com" />
        <data android:pathPrefix="/product" />
        <data android:pathPrefix="/user" />
        <data android:pathPrefix="/invite" />
    </intent-filter>
</activity>
```

### Verify App Links

```bash
# Validate assetlinks.json
curl https://myapp.com/.well-known/assetlinks.json

# Use Google's validator
https://developers.google.com/digital-asset-links/tools/generator

# Check link handling on device
adb shell pm get-app-links com.yourcompany.yourapp
```

## Advanced Routing

### React Router Integration

```typescript
import { App } from '@capacitor/app';
import { useHistory } from 'react-router-dom';
import { useEffect } from 'react';

function DeepLinkHandler() {
  const history = useHistory();

  useEffect(() => {
    App.addListener('appUrlOpen', (event) => {
      const url = new URL(event.url);
      const path = getPathFromUrl(url);

      // Navigate using React Router
      history.push(path);
    });

    // Check if app was opened with URL
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        const url = new URL(result.url);
        const path = getPathFromUrl(url);
        history.push(path);
      }
    });
  }, []);

  return null;
}

function getPathFromUrl(url: URL): string {
  // Handle both custom scheme and https
  if (url.protocol === 'myapp:') {
    return '/' + url.host + url.pathname;
  }
  return url.pathname + url.search;
}
```

### Vue Router Integration

```typescript
import { App } from '@capacitor/app';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

export function useDeepLinks() {
  const router = useRouter();

  onMounted(async () => {
    App.addListener('appUrlOpen', (event) => {
      const path = parseDeepLink(event.url);
      router.push(path);
    });

    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) {
      const path = parseDeepLink(launchUrl.url);
      router.push(path);
    }
  });
}
```

### Deferred Deep Links

Handle links when app wasn't installed:

```typescript
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';

// On first launch, check for deferred link
async function checkDeferredDeepLink() {
  const { value: isFirstLaunch } = await Preferences.get({ key: 'firstLaunch' });

  if (isFirstLaunch !== 'false') {
    await Preferences.set({ key: 'firstLaunch', value: 'false' });

    // Check with your attribution service
    const deferredLink = await fetchDeferredLink();
    if (deferredLink) {
      handleDeepLink(new URL(deferredLink));
    }
  }
}
```

## Query Parameters

```typescript
App.addListener('appUrlOpen', (event) => {
  const url = new URL(event.url);

  // Get query parameters
  const source = url.searchParams.get('source');
  const campaign = url.searchParams.get('campaign');
  const referrer = url.searchParams.get('ref');

  // Track attribution
  analytics.logEvent('deep_link_open', {
    path: url.pathname,
    source,
    campaign,
    referrer,
  });

  // Navigate with state
  navigateTo(url.pathname, {
    state: { source, campaign, referrer },
  });
});
```

## OAuth Callback Handling

```typescript
// Handle OAuth redirect
App.addListener('appUrlOpen', async (event) => {
  const url = new URL(event.url);

  if (url.pathname === '/oauth/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      handleOAuthError(error);
      return;
    }

    if (code && validateState(state)) {
      await exchangeCodeForToken(code);
      navigateTo('/home');
    }
  }
});
```

## Testing

### Test Matrix

| Scenario | Command |
|----------|---------|
| Custom scheme | `myapp://path` |
| Universal link cold start | Tap link with app closed |
| Universal link warm start | Tap link with app in background |
| Universal link in Safari | Type URL in Safari |
| App link cold start | Tap link with app closed |
| App link in Chrome | Tap link in Chrome |

### Debug Tools

```bash
# iOS: Check associated domains entitlement
codesign -d --entitlements - App.app | grep associated-domains

# iOS: Reset Universal Links cache
xcrun simctl erase all

# Android: Check verified links
adb shell dumpsys package d | grep -A5 "Package: com.yourcompany.yourapp"
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Universal Links not working | Check AASA file, SSL, entitlements |
| App Links not verified | Check assetlinks.json, fingerprint |
| Links open in browser | Check intent-filter, autoVerify |
| Cold start not handled | Use `App.getLaunchUrl()` |
| Simulator issues | Reset simulator, rebuild app |

## Resources

- Capacitor App Plugin: https://capacitorjs.com/docs/apis/app
- Universal Links Guide: https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
- Android App Links: https://developer.android.com/training/app-links
- Digital Asset Links Validator: https://developers.google.com/digital-asset-links/tools/generator
