---
title: "Lesson 4 - Capture project instructions"
description: "Run /init to generate agent instructions that describe the finished Space Quiz, then tailor them to how you work."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Now that the quiz is built, polished, and tested, capture how future sessions should treat this project. Agent instructions are read by every session before it starts work, so they save you from repeating the same guidance in every prompt.

In this lesson, you will:

- generate agent instructions with `/init`.
- review the generated file before accepting it.
- trim and personalize the instructions.

## Capture the rules with `/init`

1. Run `/init` in the app session.
2. Review the generated agent instructions file before accepting it.
3. Trim it to guidance that reflects this project: a single file, no dependencies, accessible, and browser-tested.

> [!IMPORTANT]
> **Why after polishing?**
>
> `/init` reads the project as it exists right now. Running it after the quiz is built and tested produces instructions that describe real code instead of an empty folder.

## Make it yours

The instructions file is not only for facts about the project. Add the specifics you would otherwise repeat in every prompt, such as how you like code written, naming conventions, which libraries to avoid, and how much commenting you want. Every future session reads this file before it reads your prompt.

## Summary and next steps

Your project now has agent instructions grounded in real code. Continue to [Lesson 5: Publish the project][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/5-publish/
