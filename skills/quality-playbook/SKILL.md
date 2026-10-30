---
name: quality-playbook
description: "Run a complete quality engineering audit on any codebase. Derives behavioral requirements from the code, generates spec-traced functional tests, runs a three-pass code review with regression tests, executes a multi-model spec audit (Council of Three), and produces a consolidated bug report with TDD-verified patches. Finds the 35% of real defects that structural code review alone cannot catch. Works with any language. Trigger on 'quality playbook', 'spec audit', 'Council of Three', 'fitness-to-purpose', or 'coverage theater'."
license: Apache-2.0
compatibility: "Cross-platform. Requires Python 3.10+ and git. Install via `pip install quality-playbook` or `npx quality-playbook install --into <repo> --ai-tool <tool>`."
metadata:
  version: "1.6.1"
  author: Andrew Stellman
  upstream: https://github.com/andrewstellman/quality-playbook
---

# Quality Playbook

Run a complete quality engineering audit on any codebase. Derives behavioral requirements from the code, generates spec-traced functional tests, runs a three-pass code review with regression tests, executes a multi-model spec audit (Council of Three), and produces a consolidated bug report with TDD-verified patches. Finds the 35% of real defects that structural code review alone cannot catch.

## Installation

This skill is distributed as a standalone toolkit because the full bundle
(`SKILL.md` plus six support directories: `references/`, `phase_prompts/`,
`agents/`, `ai_context/`, `schemas/` and `scripts/`) is larger than a
typical in-repo skill. The canonical install is one command:

```bash
pip install quality-playbook
# or
npx quality-playbook install --into <repo> --ai-tool <tool>
```

After installation, run:

```bash
quality-playbook install --into /path/to/your/repo --ai-tool <tool>
```

`<tool>` is one of: `claude`, `cursor`, `copilot`, `continue`, `codex`,
`windsurf`, `cline`, `aider`. The installer copies the skill files
(`SKILL.md` and the six support directories, including the gate script
`scripts/quality_gate.py`) into the right place for your AI coding agent
(Claude Code, Cursor, GitHub Copilot CLI, and others),
auto-detecting `.claude/`, `.github/`, `.cursor/`, `.continue/`,
`.codex/`, `.windsurf/`, `.cline/`, or `.aider/`.

## What it does

When you (or your AI coding agent) say one of the trigger phrases
("quality playbook", "spec audit", "Council of Three", "fitness-to-purpose"
or "coverage theater"), this skill drives the following workflow:

1. **Phase 1 (Explore)**: Documentation intake + three-stage codebase
   exploration. Writes `quality/EXPLORATION.md`.
2. **Phase 2 (Generate)**: Produces requirements, constitution,
   functional tests, code-review protocol, integration tests, spec-audit
   protocol, TDD protocol.
3. **Phase 3 (Code Review)**: Three-pass code review against HEAD;
   regression tests for every confirmed bug; patches.
4. **Phase 4 (Spec Audit)**: Three independent AI auditors review the
   code against requirements. Council-of-Three triage with verification
   probes. Layer-2 semantic citation check.
5. **Phase 5 (Reconcile)**: Combined bug report with TDD-verified
   patches.
6. **Phase 6 (Verify)**: 45 self-check benchmarks and the final gate
   verdict.

After Phase 6 the agent presents a summary and a menu of next steps, and
it can prepare an upstream pull request for one confirmed bug at a time
(it never submits anything itself).

The trigger language is intentional: this is an opt-in heavy workflow,
not an always-on hook. A full run on a real project takes hours; one
measured run, on Javalin (about 13,000 lines), took about 24 hours.

## License

Apache 2.0. Full terms in
[LICENSE.txt](https://github.com/andrewstellman/quality-playbook/blob/main/LICENSE.txt) in the canonical
repository.

## Canonical source

This skill is maintained at https://github.com/andrewstellman/quality-playbook. File issues and PRs there.
