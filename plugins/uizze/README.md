# UIZZE Plugin

Stop generic UI from shipping. UIZZE gives GitHub Copilot a repeatable workflow for turning real interface evidence into a product-specific design contract, then checking the result against a hard finish gate.

## Installation

```bash
copilot plugin install uizze@awesome-copilot
```

## What's Included

| Skill | Description |
|---|---|
| `anti-ui-slop` | Selects relevant interface references, extracts reusable design decisions, writes an implementation-ready design contract, and blocks completion until specificity, interaction states, responsiveness, accessibility, and design-system integrity pass review. |

## How It Works

1. Inspect the target product, task, and existing design system.
2. Search [UIZZE](https://uizze.com) for three to five relevant examples from its public catalogue of 800,000+ real web and iOS screens.
3. Convert the evidence into a design contract before implementation.
4. Run the finish gate and fix every blocking issue before calling the UI complete.

The skill remains usable when catalogue browsing is unavailable: it can work from user-provided references or repository evidence and will state which evidence is missing.

## Requirements and Scope

- No account, credential, token, or external server is required.
- No MCP server is bundled with this plugin.
- The skill is MIT licensed and useful on its own.

UIZZE maintains the public catalogue referenced by the skill.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
