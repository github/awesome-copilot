---
description: 'Sub-instructions of `dependency_instructions_baseLevel.md" focused on company specific guidance or tools.'
applyTo: '**'
mode: "agent"
version: "0.1.00"
---

## Instructions

The following are instructions that reflect policies that must be followed that are specific to this repository. They build off of the instructions found in the [./dependency-risk-base-level.instructions.md](./dependency_instructions_baseLevel.md) and override any instructions in that file.

## MCPs or APIs

- No additional instructions for what MCP tools to use at this time.

## Vulnerabilities

- Flag whether there are no vulnerabilities reported for the latest version of the package. If this is true, suggest either a different version be used or different package.
- This report is not exhaustive and is not a substitute for required compliance processes you may be required to follow.

## Malicious code

Tell user: `❔nothing in this report checks for malicious code and they should use other tooling for that risk.`

## License

- Mention in the report what license is detected. Mention is was only "detected" and
this approach will not catch multiple licenses or tell you what steps you may need to follow for a copy left license.

## At bottom of the report

Remember to state:

- This report is not exhaustive and is not a substitute for actual compliance processes you may be required to follow.
