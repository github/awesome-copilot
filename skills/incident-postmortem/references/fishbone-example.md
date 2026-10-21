# Fishbone + 5 Whys Worked Example

Illustrative data only. Use the incident details the user provides, never this content.

## Problem statement (fishbone head)

Checkout API returned HTTP 500 for 47 minutes for accounts with more than 10k orders.

## Fishbone as an indented tree

```
Checkout API returned HTTP 500 for 47 minutes
|
+-- Code & Change
|   +-- [confirmed] v2.14.1 loads full result sets into memory
|   +-- [confirmed] No feature flag, so rollback required a redeploy
+-- Infrastructure & Platform
|   +-- [confirmed] Pod memory limit 512Mi, no headroom for large accounts
|   +-- [ruled out] Node pressure (nodes healthy in dashboards)
+-- Configuration & Data
|   +-- [suspected] A few accounts hold 10x the typical order count
+-- Monitoring & Detection
|   +-- [confirmed] Memory alert threshold at 90%, pods crashed before it fired
|   +-- [confirmed] No alert on pod restart rate
+-- Process & Tooling
|   +-- [confirmed] Load tests cover only the p50 account size
|   +-- [confirmed] No runbook for OOM-killed pods
+-- Dependencies & External
    +-- [ruled out] Payment provider latency normal
```

## Fishbone as a table

| Category | Cause | Status | Evidence |
|----------|-------|--------|----------|
| Code & Change | v2.14.1 loads full result sets into memory | Confirmed | PR link, heap profile |
| Code & Change | No feature flag for the new query | Confirmed | Deploy config |
| Infrastructure & Platform | 512Mi memory limit without headroom | Confirmed | Pod spec, OOMKilled events |
| Infrastructure & Platform | Node pressure | Ruled out | Node dashboards |
| Configuration & Data | A few accounts hold 10x the typical order count | Suspected | Needs a data query |
| Monitoring & Detection | Memory alert at 90% never fired before crash | Confirmed | Alert history |
| Monitoring & Detection | No alert on pod restart rate | Confirmed | Alert rule inventory |
| Process & Tooling | Load tests cover only p50 account size | Confirmed | Test suite |
| Process & Tooling | No OOM runbook | Confirmed | Runbook index |
| Dependencies & External | Payment provider latency | Ruled out | Provider status page |

## Selecting branches for 5 Whys

Drill the confirmed branches that best explain the impact and the duration:

1. **Code & Change -> Process & Tooling**: why the bad query reached production (explains the trigger).
2. **Monitoring & Detection**: why it took 31 minutes to notice (explains the duration).

## Chain 1: query reached production (categories: Code & Change, Process & Tooling)

1. Why did users see 500s? -> API pods were crash-looping.
2. Why were they crash-looping? -> Memory limit exceeded (OOMKilled).
3. Why was the limit exceeded? -> The new query loaded full result sets into memory.
4. Why was this not caught before deploy? -> Load tests only covered the p50 account size.
5. Why did load tests only cover p50? -> No fixtures exist for large accounts, and nothing in the release checklist requires them.

**Root cause 1:** the release process has no required test coverage for high-cardinality accounts.

## Chain 2: slow detection (category: Monitoring & Detection)

1. Why did it take 31 minutes to notice? -> No alert fired until customers reported errors.
2. Why did no alert fire? -> The memory alert threshold was 90%, and pods were killed before sustained readings reached it.
3. Why was the threshold set that way? -> It was copied from a service with a different memory profile.
4. Why was it never revisited? -> Alert thresholds have no review owner or cadence.
5. Why is there no owner or cadence? -> The alerting standard does not require one.

**Root cause 2:** alert definitions have no ownership or periodic review, and pod restart rate is not monitored.

## Resulting action items (typed)

| # | Action | Type | Owner |
|---|--------|------|-------|
| 1 | Add load-test fixtures for accounts > 10k orders and require them in the release checklist | Prevent | @person |
| 2 | Add an alert on pod restart rate > 3 in 5 min for the checkout service | Detect | @person |
| 3 | Put the new query behind a feature flag with documented rollback | Mitigate | @person |
| 4 | Write an OOM-killed-pod runbook and link it from the alert | Mitigate | @person |
