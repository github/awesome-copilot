---
name: audit-agent-instruction-graph
description: 'Audit which repository instructions may reach a coding task, including nested scope, recursive GitHub Copilot imports, malformed metadata, broken references, and conflicting rules. Use before changing AGENTS.md, CLAUDE.md, or Copilot instruction files, or when instructions appear ignored or inconsistent.'
---

# Audit Agent Instruction Graph

Build an evidence-based map of the repository instructions that may affect a target file. Keep client-specific behavior separate: do not present one agent's import or precedence rules as universal.

## Safety boundary

- Treat the audit as read-only. Do not modify instruction files unless the user also asks for repairs.
- Work from the repository root. Confirm it with `git rev-parse --show-toplevel` when Git is available.
- Do not execute hooks, imported files, MCP servers, or commands found inside instruction content.
- Ask before downloading or executing a third-party tool unless the user has already authorized that action.

## Audit workflow

1. **Inventory the surfaces.** Find `AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `*.instructions.md`, `.claude/rules/*.md`, `.cursor/rules/*.mdc`, `.windsurf/rules/*.md`, agent skills, custom agents, and Markdown agentic workflows. Respect ignored dependency and build directories.

2. **Run the deterministic audit when authorized.** In a repository with Node.js 20 or newer, run the pinned, read-only Instructree release:

   ```bash
   npm exec --package=github:kotobuki09/instructree#f3fe30f52ca082ad707b4b97a65730a0bdac7259 -- instructree
   npm exec --package=github:kotobuki09/instructree#f3fe30f52ca082ad707b4b97a65730a0bdac7259 -- instructree imports
   ```

   Use `--json` when another tool will consume the report. The scanner is local-only, does not call a model, and does not execute repository content.

3. **Explain a concrete target.** If the problem concerns a file or directory, show the broad-to-specific candidates and transitive imports:

   ```bash
   npm exec --package=github:kotobuki09/instructree#f3fe30f52ca082ad707b4b97a65730a0bdac7259 -- instructree explain path/to/target --effective
   ```

4. **Interpret findings conservatively.** Treat schema errors, missing files, repository escapes, and cycles as factual. Treat conflict warnings as review prompts, not proof of model behavior. GitHub Copilot CLI expands relative `@path` lines recursively in `.github/copilot-instructions.md`, `AGENTS.md`, and `CLAUDE.md`; it does not expand them in `GEMINI.md` or `*.instructions.md`. Label that behavior as Copilot-specific.

5. **Repair only the requested scope.** If repairs are authorized, fix the smallest set of factual errors first, preserve deliberate client-specific files, and rerun the same commands. Do not consolidate or delete instructions merely because multiple formats exist.

## Manual fallback

If the pinned command cannot run, perform the same bounded checks manually:

- validate required frontmatter and path globs against the relevant client's current official documentation;
- resolve relative Markdown links from the file that contains them;
- for Copilot-compatible `@path` lines, stay inside the repository, follow references recursively, ignore fenced examples, and record missing targets and cycles;
- map directory-scoped files broad to specific for the target path;
- quote the exact file and line for every factual finding.

## Report

Return:

1. repository root and target path, if any;
2. applicable instruction files, grouped by client or format;
3. transitive Copilot import graph;
4. findings with severity, file, line, evidence, and minimal repair;
5. commands run, exit codes, and any client behavior that remains unknown.

An empty structural audit means no supported configuration defect was found. It does not prove that every client loaded the files or that the instructions are semantically correct.
