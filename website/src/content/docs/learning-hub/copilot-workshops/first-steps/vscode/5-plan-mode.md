---
title: "Lesson 5 - Plan before you edit"
description: "Switch Copilot Chat to Plan mode so it researches the workspace and proposes an approach before editing any files."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Plan mode researches the workspace and writes an implementation plan without touching your files.

In this lesson, you will:

- switch Copilot Chat from Agent to Plan.
- review and refine a proposed plan.
- switch back to Agent to implement the plan.

## Agree on the approach before any edits

1. Open Copilot Chat and use the **mode dropdown** above the input.
2. Switch from **Agent** to **Plan**.
3. Describe the next feature with the following prompt and let Copilot investigate the workspace:

   ```plaintext
   Plan how to add a review screen that shows every question with the answer I chose. Investigate the existing quiz, list the changes you would make, call out accessibility and single-file risks, and stop before editing.
   ```

4. Read the plan and request changes, then switch back to **Agent** to implement it.

> [!TIP]
> **When plan mode pays off**
>
> Use Plan mode for anything ambiguous, cross-cutting, or expensive to undo. The cheapest place to fix a bad approach is before the first edit.

## Summary and next steps

You agreed on an approach with Copilot before it wrote any code. Continue to [Lesson 6: Give Copilot GitHub-aware tools][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/vscode/6-github-mcp/
