---
title: "Lesson 7 - Plan before you edit"
description: "Use Plan mode on a second issue so the agent researches the project and proposes an approach before it changes any files."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Not every issue should start with edits. Plan mode researches the project, proposes an approach, and waits for your approval before any code changes.

In this lesson, you will:

- start a session for a second issue in Plan mode.
- review and refine the agent's proposed plan.
- approve the plan and choose how the session continues.

## Agree on the approach before any code changes

1. Open a **second issue** from **Issues** and select **New session**.
2. In the session configuration, choose **Plan** instead of **Interactive** or **Autopilot**.
3. Send the following prompt and let the agent investigate without changing files:

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. Read the proposed plan and request changes if something is missing.
5. Approve the plan.
6. When prompted, choose whether the session continues in **Interactive** or **Autopilot** mode.

> [!TIP]
> **When Plan mode pays off**
>
> Use Plan mode for anything ambiguous, cross-cutting, or expensive to undo. The cheapest place to fix a bad approach is before the first edit.

## Summary and next steps

You agreed on an approach with the agent before it wrote any code. Continue to [Lesson 8: Complete the Copilot review loop][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/8-review-loop/
