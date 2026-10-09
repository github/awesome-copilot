---
title: "Lesson 8 - Review and merge"
description: "Create a pull request from Source Control, request a Copilot code review, address feedback with GitHub tools, and merge."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
---

Inspect, review, and merge the new work with GitHub tools in VS Code.

In this lesson, you will:

- commit the new work and create a pull request from **Source Control**.
- request a Copilot code review.
- address feedback and failing checks with GitHub MCP.
- merge the pull request.

## Inspect, review, and merge

> [!IMPORTANT]
> Copilot Free does not include Copilot code review for pull requests. Use Copilot Student or a paid Copilot plan that includes code review. An organization can also enable paid code review on GitHub.com for members without a Copilot license, but this does not grant IDE code review access. See [Copilot code review availability][code-review].
>
> If you do not have access, skip the Copilot review request in step 4. Review the diff yourself or ask a teammate to review it, then continue with the remaining steps, addressing any human review feedback and retesting before merging.

1. Open **Source Control** to inspect the changed files and diff before you create anything.
2. Commit the new work, using the **sparkle** button to write the message again.
3. Select the **Create Pull Request** button that appears in **Source Control**. Copilot drafts the title and description from your commits, so you get a better pull request than asking for one from scratch.
4. Request a **Copilot code review** while you create the pull request, from the **GitHub** view in VS Code, or on GitHub.
5. Ask Copilot, with GitHub MCP, to inspect the pull request, resolve merge conflicts, address review comments, and investigate failing CI checks.
6. Retest in the integrated browser, review every proposed change, and update the branch.
7. When checks and review are complete, ask the agent to merge, or merge from the GitHub integration.

> [!NOTE]
> You can always ask Copilot to do this in chat instead. The **Source Control** path is worth learning first because it writes the commit and pull request text for you from what actually changed.

## Summary and next steps

You reviewed and merged a pull request without leaving VS Code. Continue to [Lesson 9: Hand the next idea to a cloud session][next-lesson].

[code-review]: https://docs.github.com/copilot/concepts/agents/code-review
[next-lesson]: /learning-hub/copilot-workshops/first-steps/vscode/9-cloud-session/
