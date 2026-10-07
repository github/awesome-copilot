---
title: "Lesson 0 - Prerequisites and setup"
description: "Verify the workshop prerequisites, install the GitHub Copilot app, and get familiar with its workspace."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Before you build the Space Quiz, confirm that you have what you need, install the GitHub Copilot app, and get familiar with its workspace.

In this lesson, you will:

- verify the workshop prerequisites.
- install and sign in to the GitHub Copilot app.
- choose a model for your sessions.
- identify the app's primary work areas.
- try a quick chat.

## Prerequisites

You need:

- a GitHub account. [Create a GitHub account][github-signup], or use your existing account.
- an active Copilot plan. [Activate Copilot Free or a paid Copilot plan][copilot-plans]. If your organization already provides Copilot access, use that account.
- a computer running macOS, Windows, or Linux.

The app ships with Git, so there is nothing else to install.

> [!NOTE]
> If you use Copilot Business or Copilot Enterprise, your administrator must enable the **Copilot CLI** policy before agent sessions will work.

## Install and configure the app

1. Download and install the [GitHub Copilot app][download-app] for your operating system.
2. Open the app.
3. Select **Sign in to GitHub** and authenticate.
4. Choose a theme, then select **Finish**.

## Choose a model

Use the following preference order when you choose a model, and select the first option available to you:

1. **GPT-6-Luna** (recommended).
2. **Auto**, as a balanced backup.
3. Any model from the [list of active models][active-models].

Model availability depends on your plan, organization policy, and product version.

## Find your way around

The app brings the development workflow into one place:

- **New**: Start a session on a project, or choose **Chat** for a quick question.
- **Pull requests**: Review and track your pull requests across every repository.
- **Issues**: Find issues assigned to you, created by you, or mentioning you.
- **Automations**: Schedule recurring agent work on a repository.
- **Customize**: Change themes and models, and manage Canvas extensions.
- **Projects**: Open your repositories, with each one's sessions listed underneath.

## Try a quick chat

Not every question needs a workspace. From **New**, choose **Chat** instead of a project. A chat has no repository attached and cannot edit files, so it is the fastest way to ask a question, get an explanation, or think through an approach before you start a real session.

Send the following prompt in a chat:

```plaintext
How does the GitHub Copilot app use worktrees?
```

## Summary and next steps

You verified the prerequisites, installed the app, chose a model, and explored its main work areas. Continue to [Lesson 1: Create the Space Quiz workspace][next-lesson].

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[download-app]: https://gh.io/app
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/1-create-workspace/
