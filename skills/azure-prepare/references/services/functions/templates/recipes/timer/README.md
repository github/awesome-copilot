# Timer Recipe

Adds a Timer trigger to an Azure Functions base template.

## Overview

This recipe composes with any HTTP base template to create a scheduled/cron-based function.
No additional IaC is needed — the base template already includes Storage for timer lease management.

## Integration Type

| Aspect | Value |
|--------|-------|
| **Trigger** | `TimerTrigger` (cron schedule) |
| **Output** | None (typically writes to logs or calls APIs) |
| **Auth** | N/A — timer runs on schedule |
| **IaC** | ❌ None required |

## Composition Steps

Apply these steps AFTER `azd init` with the appropriate base template (see [composition.md](../composition.md) for full template lookup):

| # | Step | Details |
|---|------|---------|
| 1 | **Replace source code** | Swap HTTP trigger file with Timer trigger from `source/{lang}.md` |
| 2 | **Configure schedule** | Set `TIMER_SCHEDULE` app setting (cron expression) |

## App Settings to Add

| Setting | Value | Purpose |
|---------|-------|---------|
| `TIMER_SCHEDULE` | `0 */5 * * * *` | Cron expression (every 5 minutes) |

> **Note:** Use `%TIMER_SCHEDULE%` in code to reference the app setting.

## Common Cron Expressions

| Schedule | Expression |
|----------|------------|
| Every 5 minutes | `0 */5 * * * *` |
| Every hour | `0 0 * * * *` |
| Every day at midnight | `0 0 0 * * *` |
| Every Monday at 9am | `0 0 9 * * 1` |
| Every 30 seconds | `*/30 * * * * *` |

## Files

| Path | Description |
|------|-------------|
| [source/python.md](source/python.md) | Python TimerTrigger source code |
| [source/typescript.md](source/typescript.md) | TypeScript TimerTrigger source code |
| [source/javascript.md](source/javascript.md) | JavaScript TimerTrigger source code |
| [source/dotnet.md](source/dotnet.md) | C# (.NET) TimerTrigger source code |
| [source/java.md](source/java.md) | Java TimerTrigger source code |
| [source/powershell.md](source/powershell.md) | PowerShell TimerTrigger source code |
| [eval/summary.md](eval/summary.md) | Evaluation summary |
| [eval/python.md](eval/python.md) | Python evaluation results |

## Common Issues

### Timer Not Firing

**Cause:** Invalid cron expression or function app not running.

**Solution:** Verify cron syntax at [crontab.guru](https://crontab.guru/) (note: Azure uses 6-part expressions with seconds).

### Duplicate Executions

**Cause:** Multiple instances running the same timer.

**Solution:** Timer triggers use Storage lease to ensure single execution. Verify `AzureWebJobsStorage` is configured.
