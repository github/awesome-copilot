---
name: cocoapods-to-spm
description: Guide to migrating iOS Capacitor plugins and dependencies from CocoaPods to Swift Package Manager (SPM). Use this skill when users want to modernize their iOS project, remove CocoaPods, or add SPM-based dependencies.
---

# CocoaPods to Swift Package Manager Migration

Step-by-step guide for migrating Capacitor iOS projects from CocoaPods to Swift Package Manager.

## When to Use This Skill

- User wants to migrate from CocoaPods to SPM
- User is setting up a new project with SPM
- User needs to add SPM dependencies to Capacitor
- User has CocoaPods issues and wants an alternative
- User wants faster builds (SPM often faster)

## Why Migrate to SPM?

| Aspect | CocoaPods | SPM |
|--------|-----------|-----|
| Build Speed | Slower | Faster |
| Apple Integration | Third-party | Native Xcode |
| Ruby Dependency | Required | None |
| Version Management | Podfile.lock | Package.resolved |
| Xcodeproj Changes | Modifies project | Uses workspace |
| Binary Caching | Limited | Built-in |

## Migration Process

### Step 1: Analyze Current Dependencies

First, identify what you're currently using:

```bash
cd ios/App
cat Podfile
pod outdated
```

Common Capacitor pods to migrate:
```ruby
# Podfile (before)
target 'App' do
  capacitor_pods
  pod 'Firebase/Analytics'
  pod 'Firebase/Messaging'
  pod 'Alamofire'
  pod 'KeychainAccess'
end
```

### Step 2: Find SPM Equivalents

Most popular libraries support SPM. Use these URLs:

| Library | SPM URL |
|---------|---------|
| Firebase | `https://github.com/firebase/firebase-ios-sdk` |
| Alamofire | `https://github.com/Alamofire/Alamofire` |
| KeychainAccess | `https://github.com/kishikawakatsumi/KeychainAccess` |
| SDWebImage | `https://github.com/SDWebImage/SDWebImage` |
| SnapKit | `https://github.com/SnapKit/SnapKit` |
| Realm | `https://github.com/realm/realm-swift` |
| Lottie | `https://github.com/airbnb/lottie-spm` |

### Step 3: Clean CocoaPods

```bash
cd ios/App

# Remove CocoaPods integration
pod deintegrate

# Remove Podfile.lock and Pods directory
rm -rf Podfile.lock Pods

# Remove workspace (we'll use project directly or create new workspace)
rm -rf App.xcworkspace
```

### Step 4: Add SPM Dependencies in Xcode

1. Open `ios/App/App.xcodeproj` in Xcode
2. Select the project in navigator
3. Go to **Package Dependencies** tab
4. Click **+** to add package
5. Enter the package URL
6. Choose version rules
7. Select target `App`

### Step 5: Update Podfile for Capacitor Core

Capacitor still needs CocoaPods for its core. Create minimal Podfile:

```ruby
# ios/App/Podfile
require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'

platform :ios, '14.0'
use_frameworks!

install! 'cocoapods', :disable_input_output_paths => true

def capacitor_pods
  pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
end

target 'App' do
  capacitor_pods
  # Other plugin pods that don't support SPM yet
end

post_install do |installer|
  assertDeploymentTarget(installer)
end
```

Then run:
```bash
cd ios/App && pod install
```

### Step 6: Configure Plugin for SPM Support

If you're creating a Capacitor plugin with SPM support:

**Package.swift**:
```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorNativeBiometric",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "CapacitorNativeBiometric",
            targets: ["NativeBiometricPlugin"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/nicholasalx/capacitor-swift-pm", from: "6.0.0"),
    ],
    targets: [
        .target(
            name: "NativeBiometricPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
            ],
            path: "ios/Sources/NativeBiometricPlugin",
            publicHeadersPath: "include"
        ),
    ]
)
```

### Step 7: Xcode Project Structure for SPM

```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   ├── Info.plist
│   │   └── ...
│   ├── App.xcodeproj/
│   │   └── project.xcworkspace/
│   │       └── xcshareddata/
│   │           └── swiftpm/
│   │               └── Package.resolved  # SPM lock file
│   ├── Podfile
│   └── Podfile.lock
└── ...
```

## Hybrid Approach (Recommended)

Most Capacitor projects work best with a hybrid approach:

### Keep in CocoaPods:
- `@capacitor/ios` core
- Capacitor plugins without SPM support

### Move to SPM:
- Firebase
- Third-party libraries
- Your own Swift packages

### Example Hybrid Setup

**Podfile**:
```ruby
require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'

platform :ios, '14.0'
use_frameworks!

install! 'cocoapods', :disable_input_output_paths => true

def capacitor_pods
  pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
  # Plugins without SPM support
  pod 'CapacitorCamera', :path => '../../node_modules/@capacitor/camera'
end

target 'App' do
  capacitor_pods
  # NO Firebase here - use SPM instead
end
```

**Xcode Package Dependencies**:
- Firebase iOS SDK
- Any other SPM-compatible libraries

## Common Issues and Solutions

### Issue: Duplicate Symbols

**Cause**: Same library in both CocoaPods and SPM

**Solution**: Remove from Podfile if using SPM
```ruby
# Podfile - WRONG
pod 'Firebase/Analytics'  # Remove this

# Use SPM instead in Xcode
```

### Issue: Module Not Found

**Cause**: SPM package not linked to target

**Solution**:
1. Xcode > Project > Targets > App
2. General > Frameworks, Libraries, and Embedded Content
3. Add the SPM package product

### Issue: Build Errors After Migration

**Cause**: Missing frameworks or wrong imports

**Solution**: Clean and rebuild
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clean build folder in Xcode
# Cmd + Shift + K

# Rebuild
npx cap sync ios
cd ios/App && pod install
```

### Issue: Capacitor Plugin Not Found

**Cause**: Plugin needs registration

**Solution**: Ensure plugin is registered in `AppDelegate.swift`:
```swift
import Capacitor
import YourPlugin

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Capacitor handles plugin registration automatically
        return true
    }
}
```

## Creating SPM-Compatible Capacitor Plugin

### Directory Structure

```
my-capacitor-plugin/
├── Package.swift
├── ios/
│   └── Sources/
│       └── MyPlugin/
│           ├── MyPlugin.swift
│           ├── MyPlugin.m           # Objc bridge if needed
│           └── include/
│               └── MyPlugin.h       # Public headers
├── src/
│   ├── index.ts
│   ├── definitions.ts
│   └── web.ts
└── package.json
```

### Package.swift Template

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorMyPlugin",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "CapacitorMyPlugin",
            targets: ["MyPluginPlugin"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/nicholasalx/capacitor-swift-pm", from: "6.0.0"),
    ],
    targets: [
        .target(
            name: "MyPluginPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
            ],
            path: "ios/Sources/MyPlugin"
        ),
    ]
)
```

### Plugin Swift Code

```swift
import Foundation
import Capacitor

@objc(MyPlugin)
public class MyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MyPlugin"
    public let jsName = "MyPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise),
    ]

    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve(["value": value])
    }
}
```

## Migration Checklist

- [ ] List all current CocoaPods dependencies
- [ ] Identify SPM equivalents for each
- [ ] Run `pod deintegrate`
- [ ] Add SPM packages in Xcode
- [ ] Create minimal Podfile for Capacitor core
- [ ] Run `pod install`
- [ ] Clean derived data
- [ ] Build and test
- [ ] Commit `Package.resolved` to git
- [ ] Update CI/CD scripts if needed

## Resources

- Swift Package Manager Documentation: https://swift.org/package-manager
- Capacitor iOS Documentation: https://capacitorjs.com/docs/ios
- CocoaPods to SPM Migration: https://developer.apple.com/documentation/xcode/adding-package-dependencies-to-your-app
