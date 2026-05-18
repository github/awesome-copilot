# Code Apps Insights

Skill for adding Azure Application Insights to Power Apps code apps.

## What It Covers

- installs the required packages
- adds an Application Insights bootstrap module
- forwards Power Apps platform metrics through `logger.logMetric`
- logs runtime errors through SDK autocollection, unhandled promise rejections, and React render failures
- explains CSP remediation when telemetry is blocked


## Package Contents

- `SKILL.md` - main workflow and routing logic
- `references/implementation-reference.md` - reusable code patterns based on this repository
- `references/csp-validation-reference.md` - CSP guidance and Kusto queries

## Example Prompts

- `Add Application Insights to my Power Apps code app`
- `Wire telemetry and error logging to Azure in this code app`
- `Forward Power Apps metrics to Application Insights`

## Notes

- This skill assumes the app is a Power Apps code app and can inspect the current workspace before editing.
- It does not provision Azure resources automatically.
- When the user already has Application Insights, the skill should ask for the connection string and use it in app-specific code if the user provides it.
- Shared snippets should use placeholders instead of hardcoded connection strings.
- The preferred global exception strategy is SDK autocollection plus `enableUnhandledPromiseRejectionTracking`, not custom `window.onerror` layering.

## Connection String

This package deliberately uses a placeholder connection string in the shared reference material, especially in [`references/implementation-reference.md`](./references/implementation-reference.md). That keeps the examples reusable and avoids implying that a single hardcoded value should be copied into every project.

When the skill is used in a real implementation, the expectation is more specific. If the user already has an Application Insights resource, the skill should ask for the actual connection string and use that value in the app-specific telemetry setup. If the value is not available yet, the skill should continue with a clearly labeled placeholder and explain exactly where the real connection string must be inserted later.

This behavior aligns with Microsoft's guidance for the Application Insights JavaScript SDK. In browser-based applications, the connection string is visible in client-side code and is not treated as a secret or security token. For that reason, it is appropriate to place the real connection string in frontend telemetry bootstrap code, while keeping shared documentation and reusable snippets generic by default.

## Useful Links

- [Learn - App Insights for Code Apps](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/set-up-azure-app-insights)
- [Learn - CSP](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/content-security-policy)
- [Learn - Connection strings in Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings)
- [Learn - Application Insights JavaScript SDK setup](https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript-sdk)
- [Learn - Analyze system-generated logs using Application Insights](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/application-insights)