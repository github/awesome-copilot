---
name: capacitor-ci-cd
description: Complete CI/CD guide for Capacitor apps covering GitHub Actions, GitLab CI, build automation, app signing, and deployment pipelines. Use this skill when users need to automate their build and release process.
---

# CI/CD for Capacitor Applications

Automate building, testing, and deploying Capacitor apps.

## When to Use This Skill

- User wants to automate builds
- User needs CI/CD pipeline
- User asks about GitHub Actions
- User needs app signing automation
- User wants automated releases

## GitHub Actions

### Complete Workflow

```yaml
# .github/workflows/build.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # Run tests and linting
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm install

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  # Security scan
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx capsec scan --ci

  # Build web assets
  build-web:
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: dist/

  # Build iOS
  build-ios:
    runs-on: macos-latest
    needs: build-web
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - name: Download web build
        uses: actions/download-artifact@v4
        with:
          name: web-build
          path: dist/

      - name: Install dependencies
        run: npm install

      - name: Sync Capacitor
        run: npx cap sync ios

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: ios/App

      - name: Install CocoaPods
        run: cd ios/App && pod install

      - name: Import certificates
        env:
          CERTIFICATE_P12: ${{ secrets.CERTIFICATE_P12 }}
          CERTIFICATE_PASSWORD: ${{ secrets.CERTIFICATE_PASSWORD }}
          PROVISIONING_PROFILE: ${{ secrets.PROVISIONING_PROFILE }}
        run: |
          # Create keychain
          security create-keychain -p "" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "" build.keychain
          security set-keychain-settings -t 3600 -u build.keychain

          # Import certificate
          echo "$CERTIFICATE_P12" | base64 --decode > certificate.p12
          security import certificate.p12 -k build.keychain -P "$CERTIFICATE_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "" build.keychain

          # Install provisioning profile
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          echo "$PROVISIONING_PROFILE" | base64 --decode > ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision

      - name: Build iOS
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive

      - name: Export IPA
        run: |
          cd ios/App
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportPath build/ \
            -exportOptionsPlist ExportOptions.plist

      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: ios-build
          path: ios/App/build/*.ipa

  # Build Android
  build-android:
    runs-on: ubuntu-latest
    needs: build-web
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - name: Download web build
        uses: actions/download-artifact@v4
        with:
          name: web-build
          path: dist/

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install dependencies
        run: npm install

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Decode keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 --decode > android/app/release.keystore

      - name: Build APK
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          ./gradlew assembleRelease \
            -Pandroid.injected.signing.store.file=release.keystore \
            -Pandroid.injected.signing.store.password=$KEYSTORE_PASSWORD \
            -Pandroid.injected.signing.key.alias=$KEY_ALIAS \
            -Pandroid.injected.signing.key.password=$KEY_PASSWORD

      - name: Build AAB
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          ./gradlew bundleRelease \
            -Pandroid.injected.signing.store.file=release.keystore \
            -Pandroid.injected.signing.store.password=$KEYSTORE_PASSWORD \
            -Pandroid.injected.signing.key.alias=$KEY_ALIAS \
            -Pandroid.injected.signing.key.password=$KEY_PASSWORD

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: android/app/build/outputs/apk/release/*.apk

      - name: Upload AAB
        uses: actions/upload-artifact@v4
        with:
          name: android-aab
          path: android/app/build/outputs/bundle/release/*.aab

  # Deploy to Capgo
  deploy-capgo:
    runs-on: ubuntu-latest
    needs: build-web
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - name: Download web build
        uses: actions/download-artifact@v4
        with:
          name: web-build
          path: dist/

      - name: Deploy to Capgo
        run: npx @capgo/cli upload
        env:
          CAPGO_TOKEN: ${{ secrets.CAPGO_TOKEN }}

  # Deploy to App Store
  deploy-ios:
    runs-on: macos-latest
    needs: build-ios
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Download IPA
        uses: actions/download-artifact@v4
        with:
          name: ios-build
          path: build/

      - name: Upload to App Store Connect
        env:
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
        run: |
          xcrun altool --upload-app \
            --type ios \
            --file build/*.ipa \
            --apiKey ${{ secrets.API_KEY_ID }} \
            --apiIssuer ${{ secrets.API_ISSUER_ID }}

  # Deploy to Play Store
  deploy-android:
    runs-on: ubuntu-latest
    needs: build-android
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Download AAB
        uses: actions/download-artifact@v4
        with:
          name: android-aab
          path: build/

      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT }}
          packageName: com.yourapp.id
          releaseFiles: build/*.aab
          track: internal
```

### Fastlane Integration

```yaml
# .github/workflows/fastlane.yml
name: Fastlane Build

on:
  push:
    tags: ['v*']

jobs:
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install Fastlane
        run: gem install fastlane

      - name: Build and Deploy
        run: fastlane ios release
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install Fastlane
        run: gem install fastlane

      - name: Build and Deploy
        run: fastlane android release
        env:
          PLAY_STORE_JSON_KEY: ${{ secrets.PLAY_SERVICE_ACCOUNT }}
```

## Fastlane Setup

### iOS Fastfile

```ruby
# ios/App/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and deploy to TestFlight"
  lane :release do
    setup_ci

    # Match for code signing
    match(
      type: "appstore",
      readonly: true
    )

    # Increment build number
    increment_build_number(
      build_number: ENV["GITHUB_RUN_NUMBER"]
    )

    # Build
    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store"
    )

    # Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end

  desc "Build for development"
  lane :build do
    match(type: "development", readonly: true)

    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "development"
    )
  end
end
```

### Android Fastfile

```ruby
# android/fastlane/Fastfile
default_platform(:android)

platform :android do
  desc "Build and deploy to Play Store"
  lane :release do
    # Increment version code
    increment_version_code(
      version_code: ENV["GITHUB_RUN_NUMBER"].to_i
    )

    # Build AAB
    gradle(
      task: "bundle",
      build_type: "Release"
    )

    # Upload to Play Store
    upload_to_play_store(
      track: "internal",
      aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH]
    )
  end

  desc "Build APK"
  lane :build do
    gradle(
      task: "assemble",
      build_type: "Release"
    )
  end
end
```

## GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

.npm-cache: &npm-cache
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - ~/.npm

test:
  stage: test
  image: node:20
  <<: *npm-cache
  script:
    - npm install
    - npm run lint
    - npm test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

security:
  stage: test
  image: node:20
  script:
    - npx capsec scan --ci --output json --output-file security.json
  artifacts:
    reports:
      security: security.json

build-web:
  stage: build
  image: node:20
  <<: *npm-cache
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day

build-ios:
  stage: build
  tags:
    - macos
  needs: [build-web]
  script:
    - npm install
    - npx cap sync ios
    - cd ios/App && fastlane build
  artifacts:
    paths:
      - ios/App/build/*.ipa
  only:
    - main
    - tags

build-android:
  stage: build
  image: thyrlian/android-sdk
  needs: [build-web]
  script:
    - npm install
    - npx cap sync android
    - cd android && ./gradlew assembleRelease
  artifacts:
    paths:
      - android/app/build/outputs/apk/release/*.apk
  only:
    - main
    - tags

deploy-capgo:
  stage: deploy
  image: node:20
  needs: [build-web]
  script:
    - npx @capgo/cli upload --channel production
  only:
    - main
  environment:
    name: production
```

## Secrets Management

### Required Secrets

| Secret | Description |
|--------|-------------|
| `CERTIFICATE_P12` | iOS distribution certificate (base64) |
| `CERTIFICATE_PASSWORD` | Certificate password |
| `PROVISIONING_PROFILE` | iOS provisioning profile (base64) |
| `KEYSTORE_BASE64` | Android keystore (base64) |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Signing key alias |
| `KEY_PASSWORD` | Signing key password |
| `CAPGO_TOKEN` | Capgo API token |
| `APP_STORE_CONNECT_API_KEY` | App Store Connect API key |
| `PLAY_SERVICE_ACCOUNT` | Play Store service account JSON |

### Encoding Secrets

```bash
# iOS certificate
base64 -i certificate.p12 | pbcopy

# iOS provisioning profile
base64 -i profile.mobileprovision | pbcopy

# Android keystore
base64 -i release.keystore | pbcopy
```

## Version Management

### Semantic Release

```bash
npm install -D semantic-release @semantic-release/git @semantic-release/changelog
```

```json
// .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      { "npmPublish": false }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["package.json", "CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

### Version Bumping

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: actions/setup-node@v4

      - run: npm install

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

## Build Caching

### Gradle Cache

```yaml
- name: Cache Gradle
  uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: gradle-${{ runner.os }}-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
    restore-keys: gradle-${{ runner.os }}-
```

### CocoaPods Cache

```yaml
- name: Cache CocoaPods
  uses: actions/cache@v4
  with:
    path: ios/App/Pods
    key: pods-${{ runner.os }}-${{ hashFiles('ios/App/Podfile.lock') }}
    restore-keys: pods-${{ runner.os }}-
```

## Resources

- GitHub Actions: https://docs.github.com/actions
- Fastlane: https://fastlane.tools
- Capgo CLI: https://capgo.app/docs/cli
- App Store Connect API: https://developer.apple.com/documentation/appstoreconnectapi
- Google Play API: https://developers.google.com/android-publisher
