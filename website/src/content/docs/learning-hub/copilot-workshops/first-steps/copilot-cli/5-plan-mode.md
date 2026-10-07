---
title: "Lesson 5 - Plan before you edit"
description: "Switch the second session into plan mode with /plan so the agent proposes an approach before it edits any files."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

You already have a second session running in its own worktree. Do not start with code there. Plan mode researches the project and proposes an approach while leaving your files untouched.

In this lesson, you will:

- switch the second session into plan mode.
- review and refine the agent's proposed plan.
- approve the plan and let the session implement it.

## Agree on the approach before any edits

1. Switch to the **second session** you opened in the previous lesson.
2. Run `/plan` to switch that session into plan mode.
3. Send the following prompt and let the agent investigate without editing anything:

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. Read the plan, push back on anything missing, then approve it.
5. The session continues into implementation with the approved plan as its brief.

> [!TIP]
> **When plan mode pays off**
>
> Use plan mode for anything ambiguous, cross-cutting, or expensive to undo. The cheapest place to fix a bad approach is before the first edit.

## Summary and next steps

You agreed on an approach with the agent before it wrote any code. Continue to [Lesson 6: Know what the agent can see][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
