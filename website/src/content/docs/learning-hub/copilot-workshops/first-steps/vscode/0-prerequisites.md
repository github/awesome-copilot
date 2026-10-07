---
title: "Lesson 0 - Prerequisites and setup"
description: "Verify the workshop prerequisites, confirm Copilot Chat in VS Code, add the GitHub Pull Requests and Issues extension, and choose a model."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Bring Copilot into the editor. Copilot ships with VS Code, so there is nothing to install for chat. Add the GitHub extension, then open an empty folder.

In this lesson, you will:

- verify the workshop prerequisites.
- confirm that Copilot Chat responds in VS Code.
- install the GitHub Pull Requests and Issues extension.
- open an empty project folder and choose a model.

## Prerequisites

You need:

- a GitHub account. [Create a GitHub account][github-signup], or use your existing account.
- an active Copilot plan. [Activate Copilot Free or a paid Copilot plan][copilot-plans]. If your organization already provides Copilot access, use that account.
- [Visual Studio Code][vscode].
- [Git][git] installed. Run `git --version` in a terminal to verify it.

## Set up VS Code

1. Install [VS Code][vscode] and sign in to GitHub. Copilot and Copilot Chat are built in, so open the **Chat** view from the title bar and confirm that it responds.
2. Open the **Extensions** view and install the official [GitHub Pull Requests and Issues][pr-extension] extension so issues and pull requests appear in the sidebar.
3. Create an empty folder named `space-quiz`, then select **File** > **Open Folder** and open it.
4. Choose a model with the model picker in the **Chat** view, using the preference order in the next section.

## Choose a model

Select the first option available to you:

1. **GPT-6-Luna** (recommended).
2. **Auto**, as a balanced backup.
3. Any model from the [list of active models][active-models].

Model availability depends on your plan, organization policy, and product version.

## Summary and next steps

VS Code is ready with Copilot Chat, the GitHub extension, and an empty `space-quiz` folder. Continue to [Lesson 1: Build in the workspace][next-lesson].

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[vscode]: https://code.visualstudio.com/
[git]: https://git-scm.com/downloads
[pr-extension]: https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /learning-hub/copilot-workshops/first-steps/vscode/1-build-and-polish/
