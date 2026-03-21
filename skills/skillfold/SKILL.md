---
name: skillfold
description: |
  Compile YAML pipeline configs into multi-agent skill files for GitHub Copilot and other AI coding tools. Use this skill when:
  - Defining multi-agent pipelines with typed state, conditional routing, loops, and parallel map
  - Composing atomic skills into specialized agents with clear responsibilities
  - Generating `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` via `--target copilot`
  - Validating pipeline configs, checking compiled output is current, or running pipelines
  - Coordinating agent teams with orchestrators, execution graphs, and shared state schemas
---

# Skillfold

Configuration language and compiler for multi-agent AI pipelines. Compiles YAML config into standard skill files for GitHub Copilot, Claude Code, Cursor, Windsurf, Codex, Gemini CLI, and other platforms.

## Overview

Skillfold lets you define reusable atomic skills, compose them into specialized agents, wire agents into typed execution graphs, and compile the result into platform-native output files. A single `skillfold.yaml` config produces ready-to-use agent instructions for whichever coding tool your team runs.

```
skillfold.yaml --> skillfold compile --> platform-native agent files
```

## Installation

```bash
npm install -g skillfold
```

Or use directly with npx:

```bash
npx skillfold --target copilot
```

## Core Concepts

### Atomic Skills

Small, focused skill definitions stored as `SKILL.md` files. Each skill teaches an agent one capability.

```yaml
skills:
  atomic:
    planning: skills/planning
    code-writing: skills/code-writing
    code-review: skills/code-review
    testing: skills/testing
```

### Composed Skills (Agents)

Combine atomic skills into agents with specific roles. Composition is recursive - composed skills can include other composed skills.

```yaml
skills:
  composed:
    engineer:
      includes: [planning, code-writing, testing]
    reviewer:
      includes: [code-review, testing]
```

### State Schema

Define typed shared state that agents read from and write to. The compiler validates all state access at compile time.

```yaml
state:
  types:
    TaskResult:
      summary: string
      files_changed: string[]
      tests_passed: boolean
  schema:
    task: string
    result: TaskResult
    approved: boolean
```

### Team Flow

Wire agents into a directed execution graph with conditional routing, loops, and parallel map.

```yaml
team:
  flow:
    plan:
      skill: engineer
      writes: [task]
      then: implement
    implement:
      skill: engineer
      reads: [task]
      writes: [result]
      then: review
    review:
      skill: reviewer
      reads: [result]
      writes: [approved]
      then:
        - when: approved == true
          then: done
        - when: approved == false
          then: implement
    done:
      terminal: true
```

## Compiling for GitHub Copilot

Generate Copilot-native instruction files:

```bash
skillfold --target copilot
```

This produces:
- `.github/copilot-instructions.md` - Global Copilot instructions with orchestrator plan
- `.github/instructions/*.instructions.md` - Per-agent instruction files

## Key Commands

| Command | Description |
|---------|-------------|
| `skillfold --target copilot` | Compile pipeline for GitHub Copilot |
| `skillfold validate` | Validate config without compiling |
| `skillfold --check` | Verify compiled output is up to date (CI use) |
| `skillfold list` | Inspect pipeline structure |
| `skillfold run --target copilot` | Execute the pipeline |
| `skillfold graph --html` | Generate interactive pipeline visualization |
| `skillfold watch` | Auto-recompile on file changes |
| `skillfold search [query]` | Find shared pipeline configs on npm |

## Supported Targets

| Target | Output |
|--------|--------|
| `copilot` | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` |
| `claude-code` | `.claude/agents/*.md` + `.claude/skills/*/SKILL.md` |
| `cursor` | `.cursor/rules/*.mdc` |
| `windsurf` | `.windsurf/rules/*.md` |
| `codex` | `AGENTS.md` |
| `gemini` | `.gemini/agents/*.md` + `.gemini/skills/*/SKILL.md` |
| `goose` | `.goosehints` |
| `roo-code` | `.roo/skills/` + `.roo/rules-*/` + `.roomodes` |
| `kiro` | `.kiro/skills/` + `.kiro/steering/` |
| `junie` | `.junie/skills/` + `.junie/AGENTS.md` |

## CI Integration

Add to your GitHub Actions workflow to verify compiled output stays in sync:

```yaml
- uses: byronxlg/skillfold@v1
```

Or run directly:

```yaml
- run: npx skillfold --check --target copilot
```

## Shared Skills Library

Skillfold ships with 11 reusable atomic skills (planning, research, decision-making, code-writing, code-review, testing, writing, summarization, github-workflow, file-management, skillfold-cli) and example pipeline configs. Import them into any pipeline:

```yaml
imports:
  - npm:skillfold/library/skillfold.yaml
```

## Resources

- [Repository](https://github.com/byronxlg/skillfold)
- [npm package](https://www.npmjs.com/package/skillfold)
- [Getting started guide](https://github.com/byronxlg/skillfold/blob/main/docs/getting-started.md)
- [Platform integration guide](https://github.com/byronxlg/skillfold/blob/main/docs/integrations.md)
