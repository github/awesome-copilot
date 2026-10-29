---
title: "Lesson 1 - Installing the GitHub Copilot app"
description: "Install the GitHub Copilot app, connect the repository you created from the template, get oriented in the workspace, and try a quick chat."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-29
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
> An eligible Copilot plan is required — Copilot Free,Copilot Student or any paid plan (Pro, Pro+, Business, or Enterprise). If you are on Copilot Business or Copilot Enterprise, your administrator must keep the **GitHub Copilot app** policy enabled. 

## Install and configure the GitHub Copilot app

To use the GitHub Copilot app the first step, as you might imagine, is to install it. Versions are available for Windows, macOS and Linux. Let's install the app, authenticate, and add our Tailspin Toys repo to the app.

1. In a browser, open the [landing page for the GitHub Copilot app][download-app].
2. Download the app for your platform and install it following the instructions provided on the landing page.
3. Open the app once it's installed.
4. Select **Sign in to GitHub** and follow the prompts to authenticate. If you use GitHub Enterprise Cloud with data residency, choose **Use GitHub Enterprise** and enter your `*.ghe.com` hostname when prompted. GitHub Enterprise Server is not supported.
5. If onboarding offers repository selection, select the Tailspin Toys repository you created from the template. You can also skip repository selection and add the project after onboarding.
6. Choose a theme when prompted, then finish onboarding.
7. Look for your repository under **Sessions** in the sidebar. If it is already listed, you do not need to add it again.
8. If the repository is not connected yet, select **+** next to **Sessions** to create a new session, then select **Add GitHub repository**. Use the owner and repository name you recorded in the prerequisites lesson.
9. Confirm your repository appears in the sidebar. In the layout used here, repository folders such as `tailspin-toys` are grouped under **Sessions**, with individual sessions beneath each repository.

## Get oriented in the workspace

With your project connected, take a moment to learn your way around. The app organizes everything into a few areas in the sidebar:

- **New** - like you might expect, you can start a new chat session with Copilot here!
- **Pull requests** - your pull requests, surfaced through the app's native GitHub integration. From here you can browse and filter pull requests, check CI status, and review pull requests — all without leaving the app.
- **Issues** - your issues, surfaced the same way. From here you can browse and filter issues and start a session from an issue.
- **Automations** — saved agent tasks that run on a schedule or on demand. These are great for managing todo lists, regular project maintenance, or other bits of tedium you'd like to offload. The wrap-up links to these as a next step, not another workshop exercise.
- **Customize** - add features and functions to the Copilot app in the form of MCP servers, plugins, skills, and other components. You'll use it to configure Playwright MCP.
- **Chats** — lightweight conversations for questions and brainstorming that don't need a branch or workspace of their own. This section appears after you start your first chat. If it is not visible, select **+** next to **Sessions** to start your first chat.
- **Sessions** — groups repository folders and their agent sessions. Select a repository name, such as `tailspin-toys`, to open its repository view, or select a session beneath it to return to that conversation. Each session runs in its own isolated workspace, so you can run several at once without their changes colliding. You'll start your first session when you add star ratings.

As you work through the workshop, you'll explore the workspace!

> [!TIP]
> When in doubt, ask Copilot! If you're not sure how to do something, or if something is possible, you can ask Copilot. It will help guide you.

### Find your seeded backlog

There's likely not a single project without a backlog, and Tailspin Toys isn't any different. Let's explore the backlog that currently exists, which was created when you created your template.

1. Under **Sessions** in the sidebar, select the Tailspin Toys repository folder, not an individual session beneath it. Then select **Issues** in the repository's top navigation.
2. Find these issues by title rather than assuming their issue numbers:

   - Allow users to filter games by category and publisher
   - Update our repository coding standards

3. Select an issue to read its details. Each issue is also a launch point for an agent session. You'll start from the filtering issue after completing a quick first change.

> [!NOTE]
> The lists of items in **Issues** and **Pull requests** are automatically filtered to only display items from the repositories you've added to Copilot app. Want to see work items from other repos? Add those repos to the app!

## Try a quick chat

A great way to get comfortable with the app is to use it to learn about the *app itself* — and a **quick chat** is exactly the right tool for that. Quick chats let you ask a question or brainstorm without creating a branch or worktree, so they're perfect for a fast, throwaway question — no session required.

1. In the sidebar, select **+** next to **Chats** to open a new chat. If **Chats** is not visible yet, select **+** next to **Sessions** to start your first chat; **Chats** appears afterward.
2. Ask the app how its own sessions work:

   ```plaintext
   How does the GitHub Copilot app use worktrees?
   ```

3. Read the response in the conversation view. You'll see that each session runs in its own isolated git worktree — the detail that lets you run several agents in parallel without their changes colliding. You can continue the conversation or start a new chat at any time.

## Summary and next steps

Congratulations! You've installed the GitHub Copilot app, connected your project, and explored your workspace. You learned how to:

- install the app and sign in to GitHub.
- add a project from its GitHub repository.
- get oriented in the workspace and find your seeded backlog in **Issues**.
- use a quick chat to ask a fast, throwaway question.

Next, you'll [start your first agent session][next-lesson] and use it to show a star rating on the game cards.

## Resources

- [About the GitHub Copilot app][about-copilot-app]
- [Getting started with the GitHub Copilot app][getting-started]
- [Working with agent sessions in the GitHub Copilot app][agent-sessions]

[next-lesson]: /learning-hub/copilot-workshops/app/2-add-star-rating/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[download-app]: https://gh.io/app
