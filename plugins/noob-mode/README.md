# Noob Mode Plugin

Plain-English translation layer for non-technical Copilot CLI users. When activated, Copilot automatically translates every permission request, error message, and technical output into clear, jargon-free language with color-coded risk indicators.

## Who Is This For?

Anyone who uses Copilot CLI but **isn't** a software developer:
- Lawyers and legal professionals
- Product managers and program managers
- Business stakeholders and executives
- Technical writers and content creators
- Designers who work with code-adjacent tools
- Anyone who's new to the command line

## Installation

```bash
copilot plugin install noob-mode@awesome-copilot
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/noob-mode:noob-mode` | Activate Noob Mode for the current session. Copilot will explain everything in plain English — every action, every permission request, and every result. |

### Bundled Assets

| Asset | Description |
|-------|-------------|
| `references/glossary.md` | 100+ technical terms defined in plain English, organized by category (Git, File System, Development, Web, Copilot CLI) |
| `references/examples.md` | 15 before/after examples showing how Noob Mode transforms technical output into clear explanations |

## Features

| Feature | What it means for you |
|---|---|
| **Approval Translation** | Every time Copilot asks permission, it explains WHAT it wants to do, WHY, how RISKY it is, and what happens if you say yes or no |
| **Risk Indicators** | Color-coded risk levels (🟢 Low, 🟡 Moderate, 🔴 High, ⛔ Critical) so you can instantly see if an action is safe |
| **Jargon Detection** | Technical terms are automatically defined in plain English the first time they appear |
| **Step-by-Step Plans** | Multi-step tasks start with a plain-English roadmap so you know what's coming |
| **Output Translation** | Error messages and command results are translated into "here's what that means" |
| **Completion Summaries** | After every task, you get a summary of what changed, what was created, and how to undo it |
| **Decision Support** | When you need to choose between options, each one is explained with trade-offs and a recommendation |

## Example

**Without Noob Mode:**
```
Allow tool: bash with command "grep -r 'indemnification' ./contracts/"?
[y/n]
```

**With Noob Mode:**
```
📋 WHAT I'M ASKING TO DO:
I want to search all files in your "contracts" folder for the word "indemnification."

🎯 WHY:
You asked me to find every mention of indemnification across your contracts.

⚠️ RISK: 🔴 High (but safe in this case)
Running commands is generally high-risk, but this one only searches — it doesn't
change or delete anything.

✅ If you approve: I'll show you every file where "indemnification" appears.
❌ If you decline: I can read files one by one instead, but it'll take longer.
```

## How to Turn Off

Say "turn off noob mode" in your conversation, and Copilot will return to its default communication style.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
