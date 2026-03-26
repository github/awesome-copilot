---
name: capacitor-app-store
description: Complete guide to publishing Capacitor apps to Apple App Store and Google Play Store. Covers app preparation, screenshots, metadata, review guidelines, and submission process. Use this skill when users are ready to publish their app.
---

# Publishing to App Stores

Guide to submitting Capacitor apps to Apple App Store and Google Play Store.

## When to Use This Skill

- User is ready to publish app
- User asks about app store submission
- User needs app store screenshots
- User has app rejection issues
- User needs to update app listing

## Pre-Submission Checklist

### Universal Requirements

- [ ] App icon in all required sizes
- [ ] Splash screen configured
- [ ] App name and bundle ID set
- [ ] Version and build numbers set
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support email/URL
- [ ] Age rating content questionnaire
- [ ] App description (short and long)
- [ ] Keywords/tags
- [ ] Screenshots for all device sizes
- [ ] Feature graphic (Android)
- [ ] App preview video (optional)

### iOS-Specific

- [ ] Apple Developer Program membership ($99/year)
- [ ] App Store Connect app created
- [ ] Signing certificates and profiles
- [ ] Info.plist usage descriptions
- [ ] App Tracking Transparency (if applicable)
- [ ] Sign in with Apple (if social login used)
- [ ] Export compliance (encryption)

### Android-Specific

- [ ] Google Play Developer account ($25 one-time)
- [ ] App signed with release keystore
- [ ] Target SDK level (API 34+)
- [ ] 64-bit support
- [ ] Permissions declared in manifest
- [ ] Data safety form completed
- [ ] Content rating questionnaire

## App Store Configuration

### Version and Build Numbers

```typescript
// capacitor.config.ts - Not stored here, just for reference

// iOS: Info.plist
// CFBundleShortVersionString = "1.2.3" (user-visible)
// CFBundleVersion = "45" (build number, increment each upload)

// Android: build.gradle
// versionName = "1.2.3" (user-visible)
// versionCode = 45 (must increment each upload)
```

### iOS Info.plist

```xml
<!-- ios/App/App/Info.plist -->
<key>CFBundleDisplayName</key>
<string>My App</string>

<key>CFBundleShortVersionString</key>
<string>1.0.0</string>

<key>CFBundleVersion</key>
<string>1</string>

<!-- Privacy descriptions - REQUIRED for permissions -->
<key>NSCameraUsageDescription</key>
<string>Take photos for your profile</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Select photos from your library</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Find nearby locations</string>

<key>NSFaceIDUsageDescription</key>
<string>Secure login with Face ID</string>

<key>NSMicrophoneUsageDescription</key>
<string>Record voice messages</string>

<!-- App Tracking Transparency -->
<key>NSUserTrackingUsageDescription</key>
<string>Allow tracking for personalized ads</string>

<!-- Export compliance -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

### Android build.gradle

```groovy
// android/app/build.gradle
android {
    defaultConfig {
        applicationId "com.yourcompany.yourapp"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"

        // 64-bit support
        ndk {
            abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
        }
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }

    bundle {
        language {
            enableSplit = true
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }
}
```

## App Icons

### iOS App Icons

Required sizes (place in Assets.xcassets):

| Size | Scale | Usage |
|------|-------|-------|
| 20pt | 2x, 3x | Notification |
| 29pt | 2x, 3x | Settings |
| 40pt | 2x, 3x | Spotlight |
| 60pt | 2x, 3x | App Icon |
| 76pt | 1x, 2x | iPad |
| 83.5pt | 2x | iPad Pro |
| 1024pt | 1x | App Store |

### Android App Icons

Required sizes (place in res/mipmap-*):

| Density | Size | Folder |
|---------|------|--------|
| mdpi | 48x48 | mipmap-mdpi |
| hdpi | 72x72 | mipmap-hdpi |
| xhdpi | 96x96 | mipmap-xhdpi |
| xxhdpi | 144x144 | mipmap-xxhdpi |
| xxxhdpi | 192x192 | mipmap-xxxhdpi |

Also needed:
- Adaptive icon (foreground + background layers)
- Play Store icon: 512x512

### Generate Icons

```bash
# Use capacitor-assets
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#ffffff'
```

## Screenshots

### iOS Screenshot Sizes

| Device | Size | Required |
|--------|------|----------|
| iPhone 6.7" | 1290x2796 | Yes |
| iPhone 6.5" | 1284x2778 | Yes |
| iPhone 5.5" | 1242x2208 | Yes |
| iPad Pro 12.9" | 2048x2732 | If supporting iPad |
| iPad Pro 11" | 1668x2388 | If supporting iPad |

### Android Screenshot Sizes

| Type | Size | Required |
|------|------|----------|
| Phone | 1080x1920 to 1080x2400 | Yes (2-8) |
| 7" Tablet | 1200x1920 | If supporting |
| 10" Tablet | 1600x2560 | If supporting |

### Feature Graphic (Android)

- Size: 1024x500
- Required for Play Store listing

### Generating Screenshots

```typescript
// Use Playwright for automated screenshots
import { test } from '@playwright/test';

const devices = [
  { name: 'iPhone 14 Pro Max', viewport: { width: 430, height: 932 } },
  { name: 'iPhone 14', viewport: { width: 390, height: 844 } },
  { name: 'Pixel 7', viewport: { width: 412, height: 915 } },
];

test('generate screenshots', async ({ page }) => {
  for (const device of devices) {
    await page.setViewportSize(device.viewport);

    // Screenshot 1: Home
    await page.goto('/');
    await page.screenshot({
      path: `screenshots/${device.name}-home.png`,
      fullPage: false,
    });

    // Screenshot 2: Feature
    await page.goto('/feature');
    await page.screenshot({
      path: `screenshots/${device.name}-feature.png`,
    });
  }
});
```

## App Store Connect Submission

### 1. Create App

1. Go to https://appstoreconnect.apple.com
2. My Apps > + > New App
3. Fill in:
   - Platform: iOS
   - Name: Your App Name
   - Primary Language
   - Bundle ID
   - SKU (unique identifier)

### 2. App Information

- Category (primary and secondary)
- Content Rights
- Age Rating (complete questionnaire)

### 3. Pricing and Availability

- Price (Free or paid tier)
- Availability (countries)

### 4. App Privacy

- Privacy Policy URL (required)
- Data collection types:
  - Contact Info
  - Health & Fitness
  - Financial Info
  - Location
  - Identifiers
  - Usage Data
  - etc.

### 5. Version Information

- Screenshots (all sizes)
- Promotional Text (170 chars)
- Description (4000 chars)
- Keywords (100 chars, comma-separated)
- Support URL
- Marketing URL (optional)
- What's New (for updates)

### 6. Build Upload

```bash
# Using Xcode
# Product > Archive > Distribute App > App Store Connect

# Using Fastlane
fastlane ios release

# Using xcrun
xcrun altool --upload-app --type ios --file App.ipa \
  --apiKey KEY_ID --apiIssuer ISSUER_ID
```

### 7. Submit for Review

- Answer export compliance questions
- Add notes for reviewer (if needed)
- Submit

## Google Play Console Submission

### 1. Create App

1. Go to https://play.google.com/console
2. All apps > Create app
3. Fill in:
   - App name
   - Default language
   - App or game
   - Free or paid

### 2. Store Listing

- Short description (80 chars)
- Full description (4000 chars)
- Screenshots (2-8 per device type)
- Feature graphic (1024x500)
- App icon (512x512)
- Video URL (optional, YouTube)

### 3. Content Rating

Complete the questionnaire for IARC rating

### 4. Target Audience

- Target age group
- Ads declaration

### 5. Data Safety

- Data collection
- Data sharing
- Security practices
- Data deletion request handling

### 6. App Content

- Ads (yes/no)
- App category
- Contact details
- Privacy policy

### 7. Release

```bash
# Build AAB (required for new apps)
cd android && ./gradlew bundleRelease

# Upload via Play Console or API
# Production > Create new release > Upload AAB
```

### Release Tracks

| Track | Purpose |
|-------|---------|
| Internal testing | Up to 100 testers, instant |
| Closed testing | Invite-only, review |
| Open testing | Public beta |
| Production | Full release |

## Common Rejection Reasons

### iOS Rejections

| Reason | Solution |
|--------|----------|
| Crashes | Test on real devices, fix bugs |
| Broken links | Verify all URLs work |
| Incomplete metadata | Fill all required fields |
| Missing privacy info | Complete App Privacy section |
| Login issues | Provide demo account |
| Guideline 4.2 (Minimum Functionality) | Add meaningful features |
| Guideline 5.1.1 (Data Collection) | Justify data usage |

### Android Rejections

| Reason | Solution |
|--------|----------|
| Crashes/ANRs | Fix stability issues |
| Policy violation | Review Play policies |
| Deceptive behavior | Be transparent about features |
| Sensitive permissions | Justify in-app |
| Target SDK too low | Update to API 34+ |

## Updates and Versioning

### Version Incrementing

```bash
# Increment patch (1.0.0 -> 1.0.1)
npm version patch

# Increment minor (1.0.0 -> 1.1.0)
npm version minor

# Increment major (1.0.0 -> 2.0.0)
npm version major
```

### Phased Rollout

**iOS**:
- Enable phased release in App Store Connect
- 7-day gradual rollout (1%, 2%, 5%, 10%, 20%, 50%, 100%)

**Android**:
- Set rollout percentage in release
- Monitor crash rate before increasing

## Resources

- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines
- Google Play Policy Center: https://play.google.com/about/developer-content-policy
- App Store Connect: https://appstoreconnect.apple.com
- Google Play Console: https://play.google.com/console
- Capacitor Assets: https://github.com/ionic-team/capacitor-assets
