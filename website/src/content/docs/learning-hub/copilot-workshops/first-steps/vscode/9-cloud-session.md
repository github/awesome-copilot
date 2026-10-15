---
title: "Lesson 9 - Hand the next idea to a cloud session"
description: "Switch the Copilot Chat harness from Local to Cloud and delegate a self-contained feature that arrives as a pull request."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

You have done the whole loop locally, so you now know what good output looks like. That is the right moment to let something run without you. Copilot Chat can switch the harness it runs on from your machine to GitHub.

In this lesson, you will:

- switch the Copilot Chat harness from **Local** to **Cloud**.
- delegate a self-contained feature with clear acceptance criteria.
- review the resulting pull request.

> [!NOTE]
> Cloud sessions require an eligible paid Copilot plan. Business and Enterprise access may also need to be enabled by an administrator.

## Delegate to the cloud

![Illustration of Copilot Chat in VS Code with the Harness picker open. Under Copilot, Cloud is selected instead of Local, and other harnesses such as Claude and Codex are listed. Above, a request to add three new color themes shows Working in the cloud with a link to follow the session on GitHub.](/images/learning-hub/copilot-workshops/first-steps-vscode-cloud-harness.svg)

The **Harness** picker lists Copilot running **Local** or **Cloud**, alongside other harnesses. Switch to **Cloud** and the next request runs on GitHub instead of your machine.

1. In Copilot Chat, open the **Harness** picker and switch Copilot from **Local** to **Cloud**.
2. Start a new session and give it a self-contained feature with clear acceptance criteria:

   ```plaintext
   Add a theme picker to the space quiz with three named themes: Deep Space, Launch Pad, and Lunar. Persist the choice in localStorage, keep everything in the single index.html with no dependencies, keep contrast accessible in every theme, and open a pull request when the tests pass.
   ```

3. Close your laptop. The work continues on GitHub and arrives as a pull request.
4. Review that pull request exactly as carefully as the one you wrote yourself.

> [!TIP]
> **Delegate what you can describe**
>
> Cloud sessions reward a precise brief. If you cannot write the acceptance criteria, the task is not ready to leave your machine yet.

## Summary and next steps

You delegated a feature to a cloud session and reviewed the result. Continue to [Lesson 10: Review and next steps][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/vscode/10-review/
