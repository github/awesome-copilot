---
title: "Lesson 4 - Publish the project"
description: "Initialize, commit, and publish the Space Quiz entirely through the built-in Source Control integration in VS Code."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Publish the tested quiz to GitHub entirely through the built-in Git integration, and let Copilot draft the commit message from what actually changed.

In this lesson, you will:

- initialize a repository from **Source Control**.
- generate a commit message from the staged diff.
- publish the branch to a new public GitHub repository.

## Initialize, commit, and publish

1. Open **Source Control** and select **Initialize Repository**.
2. Stage the files.
3. Select the **sparkle pencil** icon in the commit message box to have Copilot write the message from the staged diff. Read the message, edit anything that is wrong, then commit.
4. Select **Publish Branch** and create a public `space-quiz` repository on GitHub.
5. Confirm that the tested file is present on GitHub.

![Illustration of the VS Code Source Control view. The Changes list shows index.html and .github/copilot-instructions.md. A callout on the sparkle button in the commit message box reads Copilot wrote your message, and the message reads Add per-question timer to the quiz. Below the Commit button, a Create Pull Request button is highlighted with the note Commit first, then this button appears right inside Source Control.](/images/learning-hub/copilot-workshops/first-steps-vscode-commit.svg)

The sparkle button drafts a commit message from the staged diff. Once you commit, **Source Control** offers to create the pull request too.

## Summary and next steps

Your tested quiz is now published on GitHub. Continue to [Lesson 5: Plan before you edit][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/vscode/5-plan-mode/
