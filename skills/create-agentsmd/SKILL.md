---
name: create-agentsmd
description: 'Create, revise, or audit repository AGENTS.md files using evidence from the codebase, with scoped instructions for monorepos and verified commands.'
---

# Create or improve AGENTS.md

Produce an `AGENTS.md` that helps a coding agent make correct changes in this
repository without rediscovering its workflow. Base every repository-specific
claim on files or safe checks in the current checkout.

## Preserve intent and existing instructions

- Treat the user's request as the editing scope. Do not add unrelated policy or
  reorganize the repository.
- Find and read existing `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
  `.github/copilot-instructions.md`, and relevant
  `.github/instructions/*.instructions.md` files before writing.
- If an `AGENTS.md` already exists, improve it in place. Preserve accurate
  maintainer-authored rules and make a focused diff instead of replacing the
  file with a generic template.
- Do not silently resolve conflicting instructions. Identify the conflict and
  preserve the higher-priority instruction or ask when the intended rule cannot
  be established from repository evidence.

## Build an evidence map

Inspect only the files needed to establish how the repository works:

1. Read the human overview and contribution guidance (`README*`,
   `CONTRIBUTING*`, and project documentation).
2. Read package and workspace manifests, lockfiles, task runners, and build
   configuration. Use them to identify the supported package manager and exact
   commands.
3. Read CI workflows to learn the checks maintainers actually require. Do not
   assume every CI job is appropriate to run locally.
4. Inspect representative source and test files for naming, layout, and testing
   conventions. Avoid exhaustive scans when a few files establish the pattern.
5. Check for generated files, migrations, vendored code, large fixtures,
   secrets boundaries, and deployment-only operations that an agent should not
   modify or run casually.

Prefer `rg`/`rg --files` for discovery when available. Record the source of each
command, path, or non-obvious rule while investigating so unsupported claims do
not enter the final file.

## Decide the file scope

Use a root `AGENTS.md` for repository-wide instructions. Add or revise a nested
`AGENTS.md` only when a subproject has materially different commands,
architecture, safety boundaries, or conventions.

Keep shared rules at the root and put only the differences in nested files.
When multiple files apply, the nearest `AGENTS.md` in the directory tree takes
precedence for GitHub Copilot and other implementations that follow the public
AGENTS.md convention. Do not duplicate the entire root file in every package.

## Write high-signal instructions

Use headings that fit the repository rather than forcing a fixed template. A
useful file usually covers the following when evidence exists:

- **Repository map:** the few directories and boundaries an agent must
  understand before editing.
- **Setup and commands:** exact install, development, build, lint, type-check,
  and test commands, including the working directory and targeted-test form.
- **Change rules:** generated-file ownership, migrations, API or schema
  contracts, dependency policy, and cross-package coordination.
- **Validation:** the smallest relevant check for a focused change and the
  broader checks required before handoff.
- **Safety:** secrets, production data, destructive commands, deployment, and
  other operations that require explicit authorization.
- **Contribution conventions:** only repository-specific naming, formatting,
  pull-request, or commit rules that affect implementation or handoff.

Write direct, testable statements. Prefer:

```markdown
- Run `npm test -- path/to/file.test.ts` for a focused test from the repository root.
```

over:

```markdown
- Make sure the tests pass and follow best practices.
```

For each command, state where it runs when that is not obvious. Distinguish a
required check from an optional or expensive check. Link to existing detailed
documentation instead of copying it into `AGENTS.md`.

## Exclude low-value or unsafe content

Do not include:

- placeholder commands, guessed paths, or claims inferred only from a tool's
  popularity;
- long project descriptions already maintained in the README;
- style advice already enforced by a formatter or linter unless an agent needs
  a non-obvious invocation or exception;
- secrets, credentials, internal URLs, personal data, or environment values;
- instructions to deploy, publish, delete data, rewrite history, or run other
  consequential operations without the authorization the operation requires;
- blanket mandates such as "fix every failing test" when failures may be
  pre-existing or unrelated to the requested change.

## Validate the result

Before finishing:

1. Re-read every changed `AGENTS.md` in full and remove duplication,
   contradictions, placeholders, and stale claims.
2. Confirm mentioned files and directories exist.
3. Cross-check commands against their manifests or CI definitions. Run safe,
   proportionate checks when useful; do not run deployments or destructive
   commands merely to validate documentation.
4. If nested files were added, verify that each contains only rules needed for
   its subtree and does not conflict accidentally with the root.
5. Review the diff as a maintainer would: every added line should change an
   agent's decision or prevent a realistic mistake.

Report the files changed, the repository evidence used, checks performed, and
any unresolved uncertainty. Never claim a command was tested when it was only
read from configuration.

## Optional independent check

For a browser-local second opinion, paste the finished file into the free
[Repo Agent Kit AGENTS.md checker](https://repoagentkit.com/audit?utm_source=github-awesome-copilot&utm_medium=skill&utm_campaign=create-agentsmd).
This is optional and must not replace repository evidence or local validation.

Primary format guidance: [agents.md](https://agents.md/). GitHub Copilot support
and precedence details: [GitHub Docs](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions-in-your-ide/add-repository-instructions-in-your-ide).
