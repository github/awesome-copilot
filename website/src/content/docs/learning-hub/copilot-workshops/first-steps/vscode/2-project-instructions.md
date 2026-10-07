---
title: "Lesson 2 - Capture project instructions"
description: "Run /init in Copilot Chat to generate .github/copilot-instructions.md for the Space Quiz, then tailor it."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

With a working quiz in the workspace, generate repository custom instructions that describe the real project. Copilot reads these instructions with every chat request.

In this lesson, you will:

- generate repository custom instructions with `/init`.
- review `.github/copilot-instructions.md` before saving it.
- trim and personalize the instructions.

## Capture the rules with `/init`

1. Run `/init` in Copilot Chat.
2. Review the generated `.github/copilot-instructions.md` file before saving it.
3. Keep only guidance that matches this project: a single file, no dependencies, accessible, and browser-tested.

![Illustration of VS Code with .github/copilot-instructions.md open in the editor and selected in the Explorer, next to index.html. The file is titled Space Quiz and lists rules: a single index.html with no dependencies and no build step, every answer reachable by keyboard, and respect for prefers-color-scheme in both themes. A section titled How I like code written asks for small functions, early returns, no clever one-liners, and comments only for what is genuinely surprising.](/images/learning-hub/copilot-workshops/first-steps-vscode-instructions.svg)

Repository custom instructions live in `.github/copilot-instructions.md` and apply to every chat request.

> [!IMPORTANT]
> **Order matters**
>
> `/init` reads the workspace as it exists right now. Running it after the quiz is built produces instructions grounded in real code.

## Make it yours

The instructions file is not only for facts about the project. Add the specifics you would otherwise repeat in every prompt, such as how you like code written, naming conventions, which libraries to avoid, and how much commenting you want. Every future session reads this file before it reads your prompt.

## Summary and next steps

Your workspace now has custom instructions grounded in real code. Continue to [Lesson 3: Inspect context and test][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
