---
description: "Instructions for producing a dependency risk report anytime user requests or Copilot suggests a package."
applyTo: '**'
mode: "agent"
version: '0.1.01'
---

# Dependency Risk Instructions

Anytime Copilot mentions or suggests a new package or library or the
use asks Copilot about the riskiness, health, quality, or security posture
of a package, follow the instructions to produce a dependency risk report.

You must follow the instructions in `.github/instructions/dependency-risk-base-level.instructions.md` file

And add to those instructions the additional ones found in:

- `.github/instructions/dependency-risk-company-level.instructions.md`
- `.github/instructions/dependency-risk-repository-level.instructions.md`

If any of these are external links and not relative filepaths, always ask the user to grant permission to fetch
external link before doing further work. Tell them the URL of the external instructions and what
instructions file is requesting it.
