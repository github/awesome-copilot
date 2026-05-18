# Implementation Reference

Use this repository as the canonical pattern source for Power Apps code app telemetry wiring:

- `ExampleApp/src/appInsights.ts`
- `ExampleApp/src/PowerProvider.tsx`
- `ExampleApp/src/ErrorBoundary.tsx`
- `ExampleApp/src/main.tsx`

## Canonical Flow

1. Create a single telemetry module that owns the `ApplicationInsights` instance.
2. Initialize Application Insights once with a connection string constant.
3. Rely on the Application Insights SDK to autocollect uncaught browser exceptions.
4. Create or update a provider that calls `initialize()` from `@microsoft/power-apps/app` once.
5. Forward `logMetric` values to `trackEvent()`.
6. Add a React error boundary for render-time failures.
7. Wrap the app tree so the error boundary encloses the provider and app.

## Reusable Bootstrap Pattern

```ts
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

export const appInsights = new ApplicationInsights({
  config: {
    connectionString: '<APP_INSIGHTS_CONNECTION_STRING>',
    enableUnhandledPromiseRejectionTracking: true,
  },
});

appInsights.loadAppInsights();
appInsights.trackPageView();
```

## Reusable Power Apps Logger Pattern

```ts
import { initialize } from '@microsoft/power-apps/app';
import { appInsights } from './appInsights';

initialize({
  logger: {
    logMetric: (value) => {
      appInsights.trackEvent({ name: value.type }, value.data);
    },
  },
});
```

## Reusable React Error Boundary Pattern

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { appInsights } from './appInsights';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    appInsights.trackException({
      exception: error,
      properties: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return <p>Something went wrong.</p>;
    }

    return this.props.children;
  }
}
```

## Configuration Constraints

Microsoft Learn currently states that environment variables are not yet supported for Power Apps code apps. For reusable guidance:

- Use placeholders in shared snippets.
- Tell the agent to ask the user for the connection string before writing app-specific telemetry code.
- If the user provides the connection string, thread that exact value into the generated constant or bootstrap module.
- If the user does not provide it, leave a clear constant to fill in.
- For per-environment configuration, prefer a small constants module, Dataverse-backed settings, or environment-aware branching based on app context.

## Exception Strategy

Use one exception collection path for global browser errors:

- Prefer the built-in Application Insights browser exception autocollection for uncaught exceptions.
- Set `enableUnhandledPromiseRejectionTracking: true` when the app should also capture unhandled promise rejections.
- Do not add custom `window.onerror` or `window.onunhandledrejection` handlers on top of SDK autocollection unless you intentionally disable SDK exception autocollection first.
- Continue to use a React error boundary for render-time React failures because it adds component stack context.
- Continue to call `trackException()` manually in important handled `catch` blocks when those failures should still be visible in telemetry.

## Decision Rules

- If the app already has a provider, extend it instead of adding a second provider.
- If the app already has an error boundary, reuse it and only add telemetry logging.
- If the app already has a telemetry client, prefer integrating with it rather than introducing a parallel telemetry stack.
- If the app is not React-based, skip the React error boundary and keep the runtime/global error logging path.
