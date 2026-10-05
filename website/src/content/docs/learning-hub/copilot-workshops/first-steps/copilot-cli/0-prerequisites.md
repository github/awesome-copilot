---
title: "Lesson 0 - Prerequisites and setup"
description: "Verify the workshop prerequisites, install GitHub Copilot CLI, sign in, and choose a model from an empty project folder."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Put an agent in your terminal. Confirm that you have what you need, install GitHub Copilot CLI, sign in, and get ready to make your first request from an empty folder.

In this lesson, you will:

- verify the workshop prerequisites.
- install GitHub Copilot CLI and sign in.
- create and trust the project folder.
- choose a model for your session.

## Prerequisites

You need:

- a GitHub account. [Create a GitHub account][github-signup], or use your existing account.
- an active Copilot plan. [Activate Copilot Free or a paid Copilot plan][copilot-plans]. If your organization already provides Copilot access, use that account.
- [Git][git] installed. Run `git --version` to verify it.
- a computer running macOS, Windows, or Linux.

The [GitHub CLI][gh-cli] (`gh`) is optional but recommended, because it lets the agent create repositories and pull requests for you.

> [!NOTE]
> If you use Copilot Business or Copilot Enterprise, your administrator must enable the **Copilot CLI** policy before agent sessions will work.

## Set up the CLI

1. Install [GitHub Copilot CLI][install-cli] for your platform.
2. Create and enter the project folder:

   ```bash
   mkdir space-quiz && cd space-quiz
   ```

3. Run `copilot`, sign in, and trust the folder when prompted.
4. Run `/model` and choose a model using the preference order in the next section.
5. Optionally, install the [GitHub CLI][gh-cli] if you have not already.

![Illustration of Copilot CLI in a terminal window titled space-quiz. It asks whether to trust the files in this folder, with Yes, proceed selected, and suggests the /model command to choose the model for this session and /help to list every slash command. The prompt line reads Create a space exploration quiz.](/images/learning-hub/copilot-workshops/first-steps-cli-welcome.svg)

The CLI opens with a trust prompt and a few starting commands, including `/model`.

> [!TIP]
> Type `/` at any time to browse every available command, or run `/help` for the full reference.

## Choose a model

Use the following preference order when you run `/model`, and select the first option available to you:

1. **GPT-6-Luna** (recommended).
2. **Auto**, as a balanced backup.
3. Any model from the [list of active models][active-models].

Model availability depends on your plan, organization policy, and product version.

## Summary and next steps

Copilot CLI is installed, signed in, and running in an empty `space-quiz` folder. Continue to [Lesson 1: Build the quiz from the terminal][next-lesson].

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[git]: https://git-scm.com/downloads
[gh-cli]: https://cli.github.com/
[install-cli]: https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
