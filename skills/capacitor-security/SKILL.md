---
name: capacitor-security
description: Comprehensive security guide for Capacitor apps using Capsec scanner. Covers 63+ security rules across secrets, storage, network, authentication, cryptography, and platform-specific vulnerabilities. Use this skill when users need to secure their mobile app or run security audits.
---

# Capacitor Security with Capsec

Zero-config security scanning for Capacitor and Ionic apps.

## When to Use This Skill

- User wants to secure their app
- User asks about security vulnerabilities
- User needs to run security audit
- User has hardcoded secrets
- User needs CI/CD security scanning
- User asks about OWASP mobile security

## Quick Start with Capsec

### Run Security Scan

```bash
# Scan current directory (no installation needed)
npx capsec scan

# Scan specific path
npx capsec scan ./my-app

# CI mode (exit code 1 on high/critical issues)
npx capsec scan --ci
```

### Output Formats

```bash
# CLI output (default)
npx capsec scan

# JSON report
npx capsec scan --output json --output-file report.json

# HTML report
npx capsec scan --output html --output-file security-report.html
```

### Filtering

```bash
# Only critical and high severity
npx capsec scan --severity high

# Specific categories
npx capsec scan --categories secrets,network,storage

# Exclude test files
npx capsec scan --exclude "**/test/**,**/*.spec.ts"
```

## Security Rules Reference

### Secrets Detection (SEC)

| Rule | Severity | Description |
|------|----------|-------------|
| SEC001 | Critical | Hardcoded API Keys & Secrets |
| SEC002 | High | Exposed .env File |

**What Capsec Detects**:
- AWS Access Keys
- Google API Keys
- Firebase Keys
- Stripe Keys
- GitHub Tokens
- JWT Secrets
- Database Credentials
- 30+ secret patterns

**Fix Example**:
```typescript
// BAD - Hardcoded API key
const API_KEY = 'sk_live_abc123xyz';

// GOOD - Use environment variables
import { Env } from '@capgo/capacitor-env';
const API_KEY = await Env.get({ key: 'API_KEY' });
```

### Storage Security (STO)

| Rule | Severity | Description |
|------|----------|-------------|
| STO001 | High | Unencrypted Sensitive Data in Preferences |
| STO002 | High | localStorage Usage for Sensitive Data |
| STO003 | Medium | SQLite Database Without Encryption |
| STO004 | Medium | Filesystem Storage of Sensitive Data |
| STO005 | Low | Insecure Data Caching |
| STO006 | High | Keychain/Keystore Not Used for Credentials |

**Fix Example**:
```typescript
// BAD - Plain preferences for tokens
import { Preferences } from '@capacitor/preferences';
await Preferences.set({ key: 'auth_token', value: token });

// GOOD - Use secure storage
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
await NativeBiometric.setCredentials({
  username: email,
  password: token,
  server: 'api.myapp.com',
});
```

### Network Security (NET)

| Rule | Severity | Description |
|------|----------|-------------|
| NET001 | Critical | HTTP Cleartext Traffic |
| NET002 | High | SSL/TLS Certificate Pinning Missing |
| NET003 | High | Capacitor Server Cleartext Enabled |
| NET004 | Medium | Insecure WebSocket Connection |
| NET005 | Medium | CORS Wildcard Configuration |
| NET006 | Medium | Insecure Deep Link Validation |
| NET007 | Low | Capacitor HTTP Plugin Misuse |
| NET008 | High | Sensitive Data in URL Parameters |

**Fix Example**:
```typescript
// BAD - HTTP in production
const config: CapacitorConfig = {
  server: {
    cleartext: true,  // Never in production!
  },
};

// GOOD - HTTPS only
const config: CapacitorConfig = {
  server: {
    cleartext: false,
    // Only allow specific domains
    allowNavigation: ['https://api.myapp.com'],
  },
};
```

### Capacitor-Specific (CAP)

| Rule | Severity | Description |
|------|----------|-------------|
| CAP001 | High | WebView Debug Mode Enabled |
| CAP002 | Medium | Insecure Plugin Configuration |
| CAP003 | Low | Verbose Logging in Production |
| CAP004 | High | Insecure allowNavigation |
| CAP005 | Critical | Native Bridge Exposure |
| CAP006 | Critical | Eval Usage with User Input |
| CAP007 | Medium | Missing Root/Jailbreak Detection |
| CAP008 | Low | Insecure Plugin Import |
| CAP009 | Medium | Live Update Security |
| CAP010 | High | Insecure postMessage Handler |

**Fix Example**:
```typescript
// BAD - Debug mode in production
const config: CapacitorConfig = {
  ios: {
    webContentsDebuggingEnabled: true,  // Remove in production!
  },
  android: {
    webContentsDebuggingEnabled: true,  // Remove in production!
  },
};

// GOOD - Only in development
const config: CapacitorConfig = {
  ios: {
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
  },
};
```

### Android Security (AND)

| Rule | Severity | Description |
|------|----------|-------------|
| AND001 | High | Android Cleartext Traffic Allowed |
| AND002 | Medium | Android Debug Mode Enabled |
| AND003 | Medium | Insecure Android Permissions |
| AND004 | Low | Android Backup Allowed |
| AND005 | High | Exported Components Without Permission |
| AND006 | Medium | WebView JavaScript Enabled Without Safeguards |
| AND007 | Critical | Insecure WebView addJavascriptInterface |
| AND008 | Critical | Hardcoded Signing Key |

**Fix AndroidManifest.xml**:
```xml
<!-- BAD -->
<application android:usesCleartextTraffic="true">

<!-- GOOD -->
<application
    android:usesCleartextTraffic="false"
    android:allowBackup="false"
    android:networkSecurityConfig="@xml/network_security_config">
```

**network_security_config.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.myapp.com</domain>
        <pin-set>
            <pin digest="SHA-256">your-pin-hash</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

### iOS Security (IOS)

| Rule | Severity | Description |
|------|----------|-------------|
| IOS001 | High | App Transport Security Disabled |
| IOS002 | Medium | Insecure Keychain Access |
| IOS003 | Medium | URL Scheme Without Validation |
| IOS004 | Low | iOS Pasteboard Sensitive Data |
| IOS005 | Medium | Insecure iOS Entitlements |
| IOS006 | Low | Background App Refresh Data Exposure |
| IOS007 | Medium | Missing iOS Jailbreak Detection |
| IOS008 | Low | Screenshots Not Disabled for Sensitive Screens |

**Fix Info.plist**:
```xml
<!-- BAD - Disables ATS -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>

<!-- GOOD - Specific exceptions only -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>legacy-api.example.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.2</string>
        </dict>
    </dict>
</dict>
```

### Authentication (AUTH)

| Rule | Severity | Description |
|------|----------|-------------|
| AUTH001 | Critical | Weak JWT Validation |
| AUTH002 | High | Insecure Biometric Implementation |
| AUTH003 | High | Weak Random Number Generation |
| AUTH004 | Medium | Missing Session Timeout |
| AUTH005 | High | OAuth State Parameter Missing |
| AUTH006 | Critical | Hardcoded Credentials in Auth |

**Fix Example**:
```typescript
// BAD - No JWT validation
const decoded = jwt.decode(token);

// GOOD - Verify JWT signature
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://auth.myapp.com',
  audience: 'myapp',
});
```

### WebView Security (WEB)

| Rule | Severity | Description |
|------|----------|-------------|
| WEB001 | Critical | WebView JavaScript Injection |
| WEB002 | Medium | Unsafe iframe Configuration |
| WEB003 | Medium | External Script Loading |
| WEB004 | Medium | Content Security Policy Missing |
| WEB005 | Low | Target _blank Without noopener |

**Fix - Add CSP**:
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.myapp.com;
  font-src 'self';
  frame-ancestors 'none';
">
```

### Cryptography (CRY)

| Rule | Severity | Description |
|------|----------|-------------|
| CRY001 | Critical | Weak Cryptographic Algorithm |
| CRY002 | Critical | Hardcoded Encryption Key |
| CRY003 | High | Insecure Random IV Generation |
| CRY004 | High | Weak Password Hashing |

**Fix Example**:
```typescript
// BAD - Weak algorithm
const encrypted = CryptoJS.DES.encrypt(data, key);

// GOOD - Strong algorithm
const encrypted = CryptoJS.AES.encrypt(data, key, {
  mode: CryptoJS.mode.GCM,
  padding: CryptoJS.pad.Pkcs7,
});

// BAD - Hardcoded key
const key = 'my-secret-key-123';

// GOOD - Derived key
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
  baseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
```

### Logging (LOG)

| Rule | Severity | Description |
|------|----------|-------------|
| LOG001 | High | Sensitive Data in Console Logs |
| LOG002 | Low | Console Logs in Production |

**Fix Example**:
```typescript
// BAD - Logging sensitive data
console.log('User password:', password);
console.log('Token:', authToken);

// GOOD - Redact sensitive data
console.log('User authenticated:', userId);
// Use conditional logging
if (process.env.NODE_ENV === 'development') {
  console.debug('Debug info:', data);
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - name: Run Capsec Security Scan
        run: npx capsec scan --ci --output json --output-file security-report.json

      - name: Upload Security Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: security-report
          path: security-report.json
```

### GitLab CI

```yaml
security-scan:
  image: node:20
  script:
    - npx capsec scan --ci
  artifacts:
    reports:
      security: security-report.json
  only:
    - merge_requests
    - main
```

## Configuration

### capsec.config.json

```json
{
  "exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "severity": "low",
  "categories": [],
  "rules": {
    "LOG002": {
      "enabled": false
    },
    "SEC001": {
      "severity": "critical"
    }
  }
}
```

### Initialize Config

```bash
npx capsec init
```

## Root/Jailbreak Detection

```typescript
import { IsRoot } from '@capgo/capacitor-is-root';

async function checkDeviceSecurity() {
  const { isRooted } = await IsRoot.isRooted();

  if (isRooted) {
    // Option 1: Warn user
    showWarning('Device security compromised');

    // Option 2: Restrict features
    disableSensitiveFeatures();

    // Option 3: Block app (for high-security apps)
    blockApp();
  }
}
```

## Security Checklist

### Before Release

- [ ] Run `npx capsec scan --severity high`
- [ ] Remove all console.log statements
- [ ] Disable WebView debugging
- [ ] Remove development URLs
- [ ] Verify no hardcoded secrets
- [ ] Enable certificate pinning
- [ ] Implement root/jailbreak detection
- [ ] Add Content Security Policy
- [ ] Use secure storage for credentials
- [ ] Enable ProGuard (Android)
- [ ] Verify ATS settings (iOS)

### Ongoing

- [ ] Run security scans in CI/CD
- [ ] Monitor for new vulnerabilities
- [ ] Update dependencies regularly
- [ ] Review third-party plugins
- [ ] Audit authentication flows

## Resources

- Capsec Documentation: https://capacitor-sec.dev
- OWASP Mobile Top 10: https://owasp.org/www-project-mobile-top-10
- OWASP MASTG: https://mas.owasp.org/MASTG
- Capgo Security Plugins: https://capgo.app
