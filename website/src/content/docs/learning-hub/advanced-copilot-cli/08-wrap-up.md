---
title: '08 · Wrap-up & Next Steps'
description: 'Recap the AI infrastructure you built across the course and where to go next with Copilot CLI.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 8 — Wrap-up and next steps

| [← Previous: Managing Copilot's infrastructure][previous-lesson] |  |
|:--|--:|

You've worked Copilot CLI through a brownfield, multi-stack codebase, codified your team's conventions, built reusable skills and custom agents, wired up lifecycle hooks, registered LSP and MCP servers, modernized a stack, and packaged the whole setup as a plugin. This module is a quick recap and a pointer to where to go next.

## What you will learn

- A consolidated view of the AI infrastructure you built across the course.
- How the patterns generalize beyond AssetTrack.
- Where to go next with Copilot CLI.

## Recap

Talking points:

- **Working with Copilot CLI** ([Module 1][m01]) — the harness, agent loop, tool surface, permission model.
- **Building AI infrastructure foundation** ([Module 2][m02]) — exploring a brownfield project, filling doc gaps, generating `copilot-instructions.md` with `/init`, scoped `.instructions` files, the `Accessibility Expert` custom agent, and the imported `make-repo-contribution` skill.
- **Enhancing the test suite with remote and delegation** ([Module 3][m03]) — Playwright tests locally, `/remote` against a hosted environment, `/delegate` to the Copilot cloud agent, reviewing the resulting PR.
- **Shaping Copilot CLI's lifecycle with hooks** ([Module 4][m04]) — wiring lifecycle hooks so tests, lint, and build feedback flow back to the agent automatically.
- **Adding a new feature** ([Module 5][m05]) — `/research` for the library choice, `/plan` + rubber-duck, QA + accessibility custom agents, `/fleet` for parallel execution.
- **Modernizing apps with Copilot CLI** ([Module 6][m06]) — `/lsp` across stacks, MCP servers as documentation surfaces, `/research` for a citation-backed plan, per-stack migrator agents driving the upgrade.
- **Managing Copilot's infrastructure** ([Module 7][m07]) — enterprise custom agents, plugins for distribution, and a custom MCP server exposing the inventory database safely.

## Generalizing beyond AssetTrack

Talking points:

- The same pattern (instructions → custom agents → skills → hooks → LSP / MCP → plugins → research + plan + fleet) applies to any brownfield repo. Walk the learner through how to bootstrap each piece on their own codebase.
- Common variations:
  - A team conventions `copilot-instructions.md` shared across many repos.
  - User-level skills for tasks that recur outside any one project (e.g., "rewrite this commit message in our team's house style").
  - Custom agents for compliance-sensitive areas (security review, license audit).
  - Custom MCP servers for the resources your team queries most: databases, internal APIs, feature flags.
- Knowing when **not** to use any of this — for genuinely one-off, exploratory work, a plain CLI session is still the right tool.

## Suggested next steps

Talking points:

- Apply the instructions / custom agents / skills / hooks / MCP / plugin pattern to a real repo at work. Start with `copilot-instructions.md`.
- Share one custom agent or skill with your team. See how the conversation changes when everyone has the same one available.
- Explore the [MCP registry][mcp-registry] for a server that fits your team's external tools — or write a small one targeting an internal resource.
- Subscribe to the [GitHub Changelog][changelog] — Copilot CLI features evolve fast.

## Further reading

- [Copilot CLI documentation][copilot-cli-docs]
- [GitHub Copilot best practices][copilot-best-practices]
- [Model Context Protocol introduction][mcp-intro]
- [Legacy app: `github-samples/contoso-inventory`][contoso-inventory]

## Resources

- [Copilot CLI documentation][copilot-cli-docs]
- [GitHub Copilot Changelog][changelog]
- [MCP registry][mcp-registry]

---

| [← Previous: Managing Copilot's infrastructure][previous-lesson] |  |
|:--|--:|

[previous-lesson]: ../07-manage-infrastructure/
[m01]: ../01-working-with-copilot-cli/
[m02]: ../02-building-ai-infrastructure/
[m03]: ../03-test-suite-remote-delegation/
[m04]: ../04-lifecycle-hooks/
[m05]: ../05-add-feature-barcode/
[m06]: ../06-modernize-apps/
[m07]: ../07-manage-infrastructure/
[copilot-cli-docs]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli
[copilot-best-practices]: https://docs.github.com/copilot/get-started/best-practices
[mcp-intro]: https://modelcontextprotocol.io/introduction
[mcp-registry]: https://github.com/mcp
[contoso-inventory]: https://github.com/github-samples/contoso-inventory
[changelog]: https://github.blog/changelog/label/copilot/
