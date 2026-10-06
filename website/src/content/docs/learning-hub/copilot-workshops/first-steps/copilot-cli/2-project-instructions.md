---
title: "Lesson 2 - Capture project instructions"
description: "Run /init to generate agent instructions that describe the finished Space Quiz, then tailor them to how you work."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

With a working quiz on disk, generate agent instructions that describe the real project. Every future session reads these instructions before it starts work, so they save you from repeating the same guidance in every prompt.

In this lesson, you will:

- generate agent instructions with `/init`.
- review the generated file before accepting it.
- trim and personalize the instructions.

## Capture the rules with `/init`

1. Run `/init` in the session.
2. Review the generated instructions file before accepting it.
3. Keep only guidance that matches this project: a single file, no dependencies, accessible, and browser-tested.

> [!IMPORTANT]
> **Order matters**
>
> `/init` reads the project as it exists right now. Running it after the quiz is built and polished produces instructions grounded in real code.

## Make it yours

The instructions file is not only for facts about the project. Add the specifics you would otherwise repeat in every prompt, such as how you like code written, naming conventions, which libraries to avoid, and how much commenting you want. Every future session reads this file before it reads your prompt.

## Summary and next steps

Your project now has agent instructions grounded in real code. Continue to [Lesson 3: Publish the project][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
