# CSP and Validation Reference

Use this reference after the code-side integration is complete.

## CSP Remediation

If Application Insights calls are blocked in a Power Apps code app, check the browser console for errors like:

```text
Connecting to 'https://...' violates the following Content Security Policy directive
```

When that happens:

1. Open the app in the browser.
2. Open DevTools and filter the console to errors.
3. Identify the blocked Application Insights endpoints.
4. Add those sources to the environment Content Security Policy `connect-src` allow list in Power Platform admin settings.
5. Refresh the app and verify the violations are gone.

## Azure Verification

After the app is instrumented:

1. Open the Application Insights resource in Azure.
2. Go to `Monitoring > Logs`.
3. Verify that events appear in `customEvents` and errors appear in `exceptions`.

## Sample Queries

### App open performance

```kusto
customEvents
| where name == "sessionLoadSummary"
| extend cd = parse_json(customDimensions)
| extend cm = parse_json(customMeasurements)
| extend timeToAppInteractive = todouble(cm["timeToAppInteractive"])
| extend successfulAppLaunch = tobool(cd.successfulAppLaunch)
| where successfulAppLaunch == true
| summarize percentile(timeToAppInteractive, 75) by bin(timestamp, 1d)
| render timechart
```

### Network request performance by URL

```kusto
customEvents
| where name == "networkRequest"
| extend cd = parse_json(customDimensions)
| extend url = tostring(cd.url)
| extend cm = parse_json(customMeasurements)
| extend duration = todouble(cm.duration)
| summarize count(), percentile(duration, 75) by url, bin(timestamp, 1d)
| render timechart
```

### Logged exceptions

```kusto
exceptions
| project timestamp, type, outerMessage, problemId
| sort by timestamp desc
```

## Validation Checklist

- `@microsoft/applicationinsights-web` is installed.
- `@microsoft/power-apps` is installed.
- The telemetry client is initialized once.
- `logger.logMetric` forwards Power Apps metrics.
- Runtime errors and promise rejections are tracked.
- A React error boundary logs render-time failures when React is used.
- CSP issues are resolved if telemetry is missing.