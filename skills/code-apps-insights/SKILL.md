---
name: code-apps-insights
description: Adds Azure Application Insights to a Power Apps code app, including platform telemetry forwarding, React/runtime error logging, CSP guidance, and Azure verification. Use when adding Application Insights, wiring telemetry, logging errors to Azure, or monitoring a Power Apps code app. Do not use when provisioning Azure resources or integrating a different monitoring stack.
user-invocable: true
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, LSP, AskUserQuestion, Skill, EnterPlanMode, ExitPlanMode
model: GPT-5.4
argument-hint: Describe the code app and whether you want telemetry only or telemetry plus error logging.
---

# Add Application Insights

Add Azure Application Insights to a Power Apps code app end to end. This skill should inspect the current app, reuse the patterns from this repository when possible, and complete the setup from dependency installation through Azure-side verification.

**References:**

- [implementation-reference.md](./references/implementation-reference.md) - canonical implementation flow and reusable code patterns
- [csp-validation-reference.md](./references/csp-validation-reference.md) - CSP remediation steps and Azure validation queries

## Workflow

1. Inspect the app structure
2. Confirm the telemetry scope
3. Add dependencies and telemetry bootstrap
4. Add Power Apps metric forwarding
5. Add React and runtime error logging
6. Verify app wiring
7. Explain CSP and Azure validation

---

### Step 1: Inspect the App Structure

Start from the code app entry point and identify the controlling files before changing anything.

1. Find the app root, entry file, and package manifest.
2. Check whether the app already uses `@microsoft/power-apps` and `@microsoft/applicationinsights-web`.
3. Check whether telemetry setup already exists, for example a file like `appInsights.ts`, a provider wrapper, or a React error boundary.
4. If the app already has partial telemetry, preserve it and only fill the missing slices.

Prefer the implementation patterns documented in [implementation-reference.md](./references/implementation-reference.md).

### Step 2: Confirm the Telemetry Scope

If the user already specified the desired outcome, use that and continue. Otherwise ask only the missing questions:

1. Do they want only built-in Power Apps metrics, or also React/runtime exception logging?
2. Do they already have an Application Insights resource and connection string?
3. Should the skill wire only the telemetry infrastructure, or also add one or two example custom events?

If they have an Application Insights resource but have not yet provided the connection string value, explicitly ask them to paste it before writing the bootstrap code. If they prefer not to provide it yet, continue with a clear placeholder constant and say exactly where to fill it in later.

If the user does not yet have an Application Insights resource, explain the prerequisite and continue with the code-side implementation placeholders. Do not claim to provision Azure resources automatically.

### Step 3: Add Dependencies and Telemetry Bootstrap

If missing, install the required packages:

```bash
npm install @microsoft/applicationinsights-web @microsoft/power-apps
```

Then create or update a telemetry bootstrap module that:

1. Creates a single `ApplicationInsights` instance.
2. Calls `loadAppInsights()` once.
3. Tracks an initial page view.
4. Relies on the SDK's default uncaught exception autocollection instead of adding custom global error handlers.
5. Sets `enableUnhandledPromiseRejectionTracking: true` when unhandled promise rejections should be captured.

Do not layer custom `window.onerror` or `window.onunhandledrejection` handlers on top of the SDK's exception autocollection unless you intentionally disable SDK exception autocollection first. Pick one global exception path and keep it consistent.

When generating app-specific code, use the exact connection string the user provided. When generating reusable guidance or when the user declines to provide the value, use a placeholder or a constant selected by environment-aware logic, following the constraints in [implementation-reference.md](./references/implementation-reference.md).

### Step 4: Add Power Apps Metric Forwarding

Ensure the app initializes the Power Apps client logger exactly once.

1. Find the existing provider or app bootstrap layer.
2. If no wrapper exists, create a small provider component.
3. Call `initialize()` from `@microsoft/power-apps/app` and provide a `logger.logMetric` implementation.
4. Forward each metric to Application Insights using `trackEvent({ name: value.type }, value.data)`.
5. If the app environment needs the `performance.clearMarks` or `performance.clearMeasures` fallback used in this repository, add it narrowly and only when missing.

### Step 5: Add React and Runtime Error Logging

If the user wants full error logging, make sure both render-time and runtime failures are covered.

1. If a React error boundary does not exist, create one.
2. In `componentDidCatch`, send the exception and component stack to Application Insights.
3. Wrap the application so the error boundary encloses the Power Apps provider and the app root.
4. Keep fallback UI minimal and production-safe unless the user asks for a custom error screen.

### Step 6: Verify App Wiring

Before finishing, verify the setup locally:

1. Check that the telemetry module is imported from the entry path or provider path exactly once.
2. Check that the provider initializes the Power Apps logger exactly once.
3. Check that the error boundary actually wraps the rendered application tree.
4. Run the narrowest available validation, typically `npm run build`.
5. Fix any local TypeScript or import errors introduced by the integration.

### Step 7: Explain CSP and Azure Validation

Close the loop by explaining how the user verifies the setup.

1. If telemetry requests are blocked, direct the user to the CSP workflow in [csp-validation-reference.md](./references/csp-validation-reference.md).
2. Explain how to verify `customEvents` and `exceptions` in Application Insights.
3. Offer the sample Kusto queries from [csp-validation-reference.md](./references/csp-validation-reference.md).

## Completion Criteria

Only finish when all applicable items are true:

- The app has Application Insights bootstrap code.
- Power Apps metrics are forwarded through `logger.logMetric`.
- Runtime errors and unhandled promise rejections are logged through one consistent global exception collection path.
- React render failures are logged through an error boundary when the app uses React.
- The entry-point wiring is correct.
- The user has CSP next steps and Azure validation queries.

## Safety Rules

- Do not invent Azure resource values.
- Do not pretend a placeholder was user-provided.
- Do not commit secrets into source files.
- Do not mix SDK exception autocollection with custom global error hooks unless the duplication risk is addressed deliberately.
- Do not replace an existing telemetry implementation unless it is clearly broken and the replacement is necessary.
- Do not add broad refactors unrelated to telemetry instrumentation.
