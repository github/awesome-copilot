---
title: "Lesson 1 - Installing the GitHub Copilot app"
description: "Install the GitHub Copilot app, connect the repository you created from the template, get oriented in the workspace, and try a quick chat."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

The **[GitHub Copilot app][about-copilot-app]** is a desktop application for agent-driven development. It is built on GitHub Copilot CLI and integrates natively with GitHub, so your repositories, branches, and CI pipelines work out of the box. It's designed for workflows where you direct several agents in parallel — each in its own isolated workspace — rather than doing all of the work yourself, and automating repetitive tasks. With Node.js installed and your copy of the project ready, the next step is to install the app and connect that repository.

In this lesson, you will:

- install the GitHub Copilot app and sign in.
- add your project to the app from its GitHub repository.
- get oriented in the workspace, including the backlog the template seeded for you.
- try a quick chat to learn about the app itself.

## Scenario

Your team is adopting AI agents to work through a growing backlog. The Copilot app gives you one place to direct that work — picking up issues, running agents, reviewing changes, and merging pull requests. This lesson gets you installed, connected, and comfortable starting a conversation about your project.

> [!NOTE]
> An eligible Copilot plan is required — Copilot Student or any paid plan (Pro, Pro+, Business, or Enterprise). If you are on Copilot Business or Copilot Enterprise, your administrator must enable the **Copilot CLI** policy before the app will work.

## Install and configure the GitHub Copilot app

To use the GitHub Copilot app the first step, as you might imagine, is to install it. Versions are available for Windows, macOS and Linux. Let's install the app, authenticate, and add our Tailspin Toys repo to the app.

1. In a browser, open the [landing page for the GitHub Copilot app][download-app].
2. Download the app for your platform and install it following the instructions provided on the landing page.
3. Open the app once it's installed.
4. Select **Sign in to GitHub** and follow the prompts to authenticate. If you use GitHub Enterprise Server, choose **Use GitHub Enterprise** and enter your server address when prompted.
5. After authenticating, you'll be asked about connecting your repositories. Select the Tailspin Toys repo you just created, which should be named `<YOUR_GITHUB_HANDLE>/tailspin-toys`.
6. Select **Continue** to continue the onboarding.
7. When prompted for a theme, select the one which brings you the most joy, then select **Finish**.

> [!NOTE]
> If your copy of Tailspin Toys didn't appear in the list automatically, you can add it after completing the onboarding process in the app. When completed, the Copilot app will bring you to the home screen. From there you can select **Choose from GitHub**, and search for your repo by name (\<YOUR_GITHUB_HANDLE\>/tailspin-toys), then select it. Your repo will now be added to the Copilot app!

## Get oriented in the workspace

With your project connected, take a moment to learn your way around. The app organizes everything into a few areas in the sidebar:

- **Sessions** — where agents do their work. Each session runs in its own isolated workspace, so you can run several at once without their changes colliding. You'll start your first session in the next lesson.
- **Quick chats** — lightweight conversations for questions and brainstorming that don't need a branch or workspace of their own. You'll try one at the end of this lesson.
- **My work** — your issues and pull requests, surfaced through the app's **native GitHub integration**. From here you can browse and filter issues and pull requests, check CI status, start a session from an issue, and review pull requests — all without leaving the app.
- **Automations** — saved agent tasks that run on a schedule or on demand. You'll create one near the end of the harness.

### Find your seeded backlog

Because the app integrates with GitHub natively, the work waiting in your repository shows up right inside the app. When you created your repository from the template, a backlog of issues was filed for you — let's confirm it's there.

1. Select **My work** in the sidebar.
2. The template seeded eight issues in your backlog. This harness focuses on the following three — confirm you can see them:

   - Allow users to filter games by category and publisher
   - Update our repository coding standards
   - Implement pagination on the game list page

3. Select an issue to read its details. Each issue is also a launch point for an agent session — you'll start work from these issues later in the harness.

> [!NOTE]
> The list of items in My work is automatically filtered to only display items from the repositories you've added to Copilot app. Want to see work items from other repos? Add them to the app!

## Try a quick chat

A great way to get comfortable with the app is to use it to learn about the *app itself* — and a **quick chat** is exactly the right tool for that. Quick chats let you ask a question or brainstorm without creating a branch or worktree, so they're perfect for a fast, throwaway question — no session required.

1. In the sidebar, select **+** next to **Quick chats** to open a new chat.
2. Ask the app how its own sessions work:

   ```plaintext
   How does the GitHub Copilot app use worktrees?
   ```

3. Read the response in the conversation view. You'll see that each session runs in its own isolated git worktree — the detail that lets you run several agents in parallel without their changes colliding. You can continue the conversation or start a new chat at any time.

## Summary and next steps

Congratulations! You've installed the GitHub Copilot app, connected your project, and explored your workspace. You learned how to:

- install the app and sign in to GitHub.
- add a project from its GitHub repository.
- get oriented in the workspace and find your seeded backlog in **My work**.
- use a quick chat to ask a fast, throwaway question.

Next, you'll start your first agent session and make your first change to the project — showing a star rating on the game cards. Continue to [Lesson 2 - Running your first agent session][next-lesson].

## Resources

- [About the GitHub Copilot app][about-copilot-app]
- [Getting started with the GitHub Copilot app][getting-started]
- [Working with agent sessions in the GitHub Copilot app][agent-sessions]

[ex0]: /learning-hub/copilot-workshops/app/0-prerequisites/
[next-lesson]: /learning-hub/copilot-workshops/app/2-add-star-rating/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[download-app]: https://gh.io/app
