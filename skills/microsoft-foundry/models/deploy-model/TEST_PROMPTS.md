# Deploy Model — Test Prompts

Test prompts for the unified `deploy-model` skill with router, preset, customize, and capacity sub-skills.

## Preset Mode (Quick Deploy)

| # | Prompt | Expected |
|---|--------|----------|
| 1 | Deploy gpt-4o | Preset — confirm project, deploy with defaults |
| 2 | Set up o3-mini for me | Preset — pick latest version automatically |
| 3 | I need a text-embedding-ada-002 deployment | Preset — non-chat model |
| 4 | Deploy gpt-4o to the best region | Preset — region scan, no capacity target |

## Customize Mode (Guided Flow)

| # | Prompt | Expected |
|---|--------|----------|
| 5 | Deploy gpt-4o with custom settings | Customize — walk through version → SKU → capacity → RAI |
| 6 | I want to choose the version and SKU for my o3-mini deployment | Customize — explicit keywords |
| 7 | Set up a PTU deployment for gpt-4o | Customize — PTU requires SKU selection |
| 8 | Deploy gpt-4o with a specific content filter | Customize — RAI policy flow |

## Capacity Discovery

| # | Prompt | Expected |
|---|--------|----------|
| 9 | Where can I deploy gpt-4o? | Capacity — show regions, no deploy |
| 10 | Which regions have o3-mini available? | Capacity — run script, show table |
| 11 | Check if I have enough quota for gpt-4o with 500K TPM | Capacity — high target, some regions may not qualify |

## Chained (Capacity → Deploy)

| # | Prompt | Expected |
|---|--------|----------|
| 12 | Find me the best region and project to deploy gpt-4o with 10K capacity | Capacity → Preset |
| 13 | Deploy o3-mini with 200K TPM to whatever region has it | Capacity → Preset |
| 14 | I want to deploy gpt-4o with 50K capacity and choose my own settings | Capacity → Customize |

## Negative / Edge Cases

| # | Prompt | Expected |
|---|--------|----------|
| 15 | Deploy unicorn-model-9000 | Fail gracefully — model doesn't exist |
| 16 | Deploy gpt-4o with 999999K TPM | Capacity shows no region qualifies |
| 17 | Deploy gpt-4o (with az login expired) | Auth error caught early |
| 18 | Delete my gpt-4o deployment | Should NOT trigger deploy-model |
| 19 | List my current deployments | Should NOT trigger deploy-model |
| 20 | Deploy gpt-4o to mars-region-1 | Fail gracefully — invalid region |

## Project Selection

| # | Prompt | Expected |
|---|--------|----------|
| 21 | Deploy gpt-4o (with PROJECT_RESOURCE_ID set) | Show current project, confirm before deploying |
| 22 | Deploy gpt-4o (no PROJECT_RESOURCE_ID) | Ask user to pick a project |
| 23 | Deploy gpt-4o to project my-special-project | Use named project directly |

## Ambiguous / Routing Stress

| # | Prompt | Expected |
|---|--------|----------|
| 24 | Help me with model deployment | Preset (default) — vague, no keywords |
| 25 | I need gpt-4o deployed fast with good capacity | Preset — "fast" + vague capacity |
| 26 | Can you configure a deployment? | Customize — "configure" keyword, should ask which model |
| 27 | What's the best way to deploy gpt-4o with 100K? | Capacity → Preset |

## Automated Test Results (2026-02-09)

All 18 tests passed. Deployments created during testing were cleaned up.

| Category | Tests | Result |
|----------|-------|--------|
| Preset | 3/3 | ✅ |
| Customize | 2/2 | ✅ |
| Capacity | 3/3 | ✅ |
| Chained | 1/1 | ✅ |
| Negative | 5/5 | ✅ |
| Ambiguous | 4/4 | ✅ |
