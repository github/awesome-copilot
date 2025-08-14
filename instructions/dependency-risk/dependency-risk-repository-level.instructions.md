---
description: 'Sub-instructions of `dependency-risk-base-level.instructions.md` focused on per-repository guidance or tools for should I use questions.'
applyTo: '**'
mode: 'agent'
version: '0.1.01'
---

# Dependency Risk Repository Level Instructions

## Instructions

The following are instructions that reflect policies that must be followed that are specific to this repository. They build off of the instructions found in the [./dependency-risk-base-level.instructions.md](./dependency_instructions_baseLevel.md) and override any instructions in that file.

## MCPs or APIs

No additional instructions for MCPs or APIs at this time.

### Formatting and Styling Guidelines for Dependency Risk Report

- Use section headers in bold (e.g., **Indicators of risk: POSSIBLY ABANDONED**).
- For each risk indicator, use:
  - ✅ for "No" (no risk triggered)
  - ⚠️ for "Yes" (yes risk triggered)
  - ❌ for "Yes" (yes risk triggered AND meets one of the criteria mentioned below for when to use ❌)
  - ❔ for "Not found" (information not available)
- Highlight any triggered risks in **bold**.
- Use bullet points for each item.
- At the end, include a summary table or list of triggered risks.
- Keep links on their own lines for clarity. If very relevant, provide link to a risk source when mentioning that risk.
- Example 1:

    ```
   **Indicators of risk: POSSIBLY ABANDONED**
    - ✅ The package itself is deprecated: No
    - ✅ The source repository is archived: No
    - ❌ The latest version of package was published more than 2 years ago: Yes (2020-08-19)
    ```

- Example 2:

    ```
    Indicators of risk: NOT ENOUGH EYEBALLS TO SPOT PROBLEMS
    - ⚠️ Number of dependent repositories is <500: Yes (29)
    - ✅ Number of package downloads <10,000: No (24,221 last month)
    ```

“Strictly follow the symbol usage rules below. Do not use ❌ for ‘No’ responses.

## Any addition instructions based on section of the report

### Indicators of that risk that project is POSSIBLY ABANDONED?

#### when to use ❌

- Do allow usage of packages that:
  - Yes: depreciated : Signify this with a ❌ if it is detected.
  - Yes: archived : Signify this with a ❌ if it is detected.
  - Yes: the latest version is more than X number of years old. Signify this with a ❌ if it is detected.

### Indicators of risk that there are NOT ENOUGH EYEBALLS TO SPOT PROBLEMS?

#### when to use ❌

- Do not suggest or allow usage of packages that:
  - Number of package downloads <1000  Signify this with a ❌ if it is detected.

### Indicators of risk that CONTRIBUTION COULD STOP SUDDENLY?

### Indicators of risk of: SECURITY VULNERABILITIES

- Use ⚠️ if vulnerabilities detected.
- Do not suggest usage of package's latest version when that version has any security vulnerabilities reported against it. Suggest different package instead. Give date of last update.

## At bottom of the report
