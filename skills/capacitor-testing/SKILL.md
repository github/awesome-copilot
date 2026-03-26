---
name: capacitor-testing
description: Complete testing guide for Capacitor apps covering unit tests, integration tests, E2E tests, and native testing. Includes Jest, Vitest, Playwright, Appium, and native testing frameworks. Use this skill when users need to test their mobile apps.
---

# Testing Capacitor Applications

Comprehensive testing strategies for Capacitor mobile apps.

## When to Use This Skill

- User wants to add tests
- User asks about testing strategies
- User needs E2E testing
- User wants to mock native plugins
- User needs CI testing setup

## Testing Pyramid

```
        /\
       /  \        E2E Tests (Few)
      /----\       - Real devices
     /      \      - Full user flows
    /--------\     Integration Tests (Some)
   /          \    - Component interactions
  /------------\   - API integration
 /              \  Unit Tests (Many)
/----------------\ - Pure functions
                   - Business logic
```

## Unit Testing

### Setup with Vitest

```bash
npm install -D vitest @vitest/coverage-v8
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### Mock Capacitor Plugins

```typescript
// src/test/setup.ts
import { vi } from 'vitest';

// Mock @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => 'ios'),
    isPluginAvailable: vi.fn(() => true),
  },
  registerPlugin: vi.fn(),
}));

// Mock @capacitor/preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock @capgo/capacitor-native-biometric
vi.mock('@capgo/capacitor-native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn().mockResolvedValue({
      isAvailable: true,
      biometryType: 'touchId',
    }),
    verifyIdentity: vi.fn().mockResolvedValue({}),
    setCredentials: vi.fn().mockResolvedValue({}),
    getCredentials: vi.fn().mockResolvedValue({
      username: 'test@example.com',
      password: 'token',
    }),
  },
}));
```

### Unit Test Examples

```typescript
// src/services/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('biometricLogin', () => {
    it('should authenticate with biometrics', async () => {
      const authService = new AuthService();

      const result = await authService.biometricLogin();

      expect(NativeBiometric.verifyIdentity).toHaveBeenCalledWith({
        reason: 'Authenticate to login',
        title: 'Biometric Login',
      });
      expect(result).toBe(true);
    });

    it('should return false when biometrics unavailable', async () => {
      vi.mocked(NativeBiometric.isAvailable).mockResolvedValueOnce({
        isAvailable: false,
        biometryType: 'none',
      });

      const authService = new AuthService();
      const result = await authService.biometricLogin();

      expect(result).toBe(false);
    });

    it('should handle user cancellation', async () => {
      vi.mocked(NativeBiometric.verifyIdentity).mockRejectedValueOnce(
        new Error('User cancelled')
      );

      const authService = new AuthService();
      const result = await authService.biometricLogin();

      expect(result).toBe(false);
    });
  });
});
```

### Testing Utilities

```typescript
// src/test/utils.ts
import { Capacitor } from '@capacitor/core';
import { vi } from 'vitest';

export function mockPlatform(platform: 'ios' | 'android' | 'web') {
  vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(platform !== 'web');
}

export function mockPluginAvailable(available: boolean) {
  vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(available);
}

// Usage in tests
describe('Platform-specific behavior', () => {
  it('should use iOS-specific code on iOS', () => {
    mockPlatform('ios');
    // Test iOS behavior
  });

  it('should use Android-specific code on Android', () => {
    mockPlatform('android');
    // Test Android behavior
  });
});
```

## Component Testing

### React Testing Library

```bash
npm install -D @testing-library/react @testing-library/user-event
```

```typescript
// src/components/LoginButton.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginButton } from './LoginButton';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

describe('LoginButton', () => {
  it('should show biometric option when available', async () => {
    render(<LoginButton />);

    await waitFor(() => {
      expect(screen.getByText('Login with Face ID')).toBeInTheDocument();
    });
  });

  it('should call biometric auth on click', async () => {
    const user = userEvent.setup();
    render(<LoginButton />);

    const button = await screen.findByRole('button', { name: /face id/i });
    await user.click(button);

    expect(NativeBiometric.verifyIdentity).toHaveBeenCalled();
  });
});
```

### Vue Test Utils

```bash
npm install -D @vue/test-utils
```

```typescript
// src/components/LoginButton.spec.ts
import { mount, flushPromises } from '@vue/test-utils';
import LoginButton from './LoginButton.vue';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

describe('LoginButton', () => {
  it('should render biometric button', async () => {
    const wrapper = mount(LoginButton);
    await flushPromises();

    expect(wrapper.text()).toContain('Login with Biometrics');
  });

  it('should trigger authentication on click', async () => {
    const wrapper = mount(LoginButton);
    await flushPromises();

    await wrapper.find('button').trigger('click');

    expect(NativeBiometric.verifyIdentity).toHaveBeenCalled();
  });
});
```

## E2E Testing

### Playwright for Web

```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login with email and password', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password"]', 'wrong');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error"]')).toBeVisible();
  });
});
```

### Appium for Native

```bash
npm install -D webdriverio @wdio/appium-service @wdio/mocha-framework
```

```typescript
// wdio.conf.ts
export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./e2e/native/**/*.spec.ts'],
  capabilities: [
    {
      platformName: 'iOS',
      'appium:deviceName': 'iPhone 15',
      'appium:platformVersion': '17.0',
      'appium:app': './ios/App/build/App.app',
      'appium:automationName': 'XCUITest',
    },
    {
      platformName: 'Android',
      'appium:deviceName': 'Pixel 8',
      'appium:platformVersion': '14',
      'appium:app': './android/app/build/outputs/apk/debug/app-debug.apk',
      'appium:automationName': 'UiAutomator2',
    },
  ],
  services: ['appium'],
  framework: 'mocha',
};
```

```typescript
// e2e/native/login.spec.ts
describe('Native Login', () => {
  it('should login with biometrics', async () => {
    // Wait for app to load
    await $('~login-screen').waitForExist();

    // Tap biometric button
    await $('~biometric-login').click();

    // Simulate biometric auth (device-specific)
    if (driver.isIOS) {
      await driver.touchId(true);
    } else {
      await driver.fingerPrint(1);
    }

    // Verify logged in
    await expect($('~dashboard')).toBeExisting();
  });
});
```

### Detox for React Native Style Testing

```bash
npm install -D detox
```

```javascript
// .detoxrc.js
module.exports = {
  testRunner: {
    $0: 'jest',
    args: {
      config: 'e2e/jest.config.js',
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/App/build/App.app',
      build: 'cd ios && xcodebuild ...',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_8_API_34' },
    },
  },
};
```

## Native Testing

### iOS XCTest

```swift
// ios/AppTests/PluginTests.swift
import XCTest
@testable import App
import Capacitor

class PluginTests: XCTestCase {
    var bridge: MockBridge!

    override func setUp() {
        super.setUp()
        bridge = MockBridge()
    }

    func testPluginMethodReturnsExpectedValue() {
        let plugin = MyPlugin(bridge: bridge, pluginId: "MyPlugin", pluginName: "MyPlugin")

        let call = CAPPluginCall(callbackId: "test", options: ["value": "test"], success: { result, call in
            XCTAssertEqual(result?.data?["value"] as? String, "test")
        }, error: { error in
            XCTFail("Should not error")
        })

        plugin.echo(call!)
    }
}
```

### Android JUnit

```kotlin
// android/app/src/test/java/com/example/PluginTest.kt
import org.junit.Test
import org.junit.Assert.*
import org.mockito.Mockito.*

class PluginTest {
    @Test
    fun `echo returns input value`() {
        val plugin = MyPlugin()
        val call = mock(PluginCall::class.java)

        `when`(call.getString("value")).thenReturn("test")

        plugin.echo(call)

        verify(call).resolve(argThat { data ->
            data.getString("value") == "test"
        })
    }
}
```

### Android Instrumented Tests

```kotlin
// android/app/src/androidTest/java/com/example/PluginInstrumentedTest.kt
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*

@RunWith(AndroidJUnit4::class)
class PluginInstrumentedTest {
    @Test
    fun useAppContext() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.example.app", appContext.packageName)
    }
}
```

## Testing Best Practices

### Test Organization

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx      # Unit tests next to component
├── services/
│   ├── auth.ts
│   └── auth.test.ts
├── test/
│   ├── setup.ts             # Test setup
│   ├── mocks/               # Shared mocks
│   └── utils.ts             # Test utilities
e2e/
├── web/                     # Playwright tests
│   └── login.spec.ts
└── native/                  # Appium tests
    └── login.spec.ts
```

### Mock Best Practices

```typescript
// Don't over-mock - test real behavior when possible
// BAD
vi.mock('./api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
}));

// GOOD - Use MSW for API mocking
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ id: 1, name: 'Test' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### CI Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test -- --coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test

  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd ios/App && xcodebuild test -scheme App -destination 'platform=iOS Simulator,name=iPhone 15'

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - run: cd android && ./gradlew test
```

## Resources

- Vitest Documentation: https://vitest.dev
- Playwright Documentation: https://playwright.dev
- Testing Library: https://testing-library.com
- Appium Documentation: https://appium.io
