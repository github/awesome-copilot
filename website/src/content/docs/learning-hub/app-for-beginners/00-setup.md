---
title: '00 · Setup'
description: 'Install the app, prepare your course fork, and create the practice work items.'
authors:
  - GitHub, Inc.
  - Dan Wahlin
lastUpdated: 2026-10-04
tags:
  - workshop
  - copilot-app
  - desktop
---

![Chapter 00: Setup](/images/learning-hub/copilot-app-for-beginners/00/chapter-header.svg)

> **A little setup now means a lot more hands-on learning later.**

Before you can direct agents in the GitHub Copilot app, you need the app installed and signed in, your copy of the course repository connected, and the practice items that later chapters use. This chapter walks you through the setup process and checks the tools that the exercises use.

## Learning Objectives

By the end of this chapter, you'll be able to:

- Install and set up the GitHub Copilot app
- Connect your fork of the course repository as a project and start a project session
- Check the required tools in the app's **Terminal** tab
- Run the setup script that creates the course's labels, practice issues, branches, and pull requests

> ⏱️ **Estimated Time**: ~20 minutes

## Prerequisites

- A [GitHub account](https://github.com/signup)
- A [Copilot plan](https://github.com/features/copilot/plans), or you can opt to continue with your own model provider during sign-in
    - For Copilot Business or Enterprise, the **GitHub Copilot app** policy must be enabled.
- [Git](https://git-scm.com/install) installed on your machine
- [Node.js LTS](https://nodejs.org) to run `samples/book-app-web` for the hands-on exercises
- [GitHub CLI (`gh`)](https://cli.github.com) for the initial one-time setup script used in the course

You will check the tool versions in the Copilot app's **Terminal** tab after connecting your repository.

## The Course Theme: Working in a Recording Studio

Throughout this course, a recording studio is the recurring analogy for working with the GitHub Copilot app. Each chapter connects a part of agent-driven development to preparing, recording, reviewing, and refining a track.

Before you record anything, you get the studio ready. You sign in for access, plug in your gear, load the song you'll work on, and run a quick soundcheck before you commit a single take. This chapter is that preparation: install the app, connect the repository, check your tools, and load the practice items.

![Setting up the studio analogy for GitHub Copilot app setup](/images/learning-hub/copilot-app-for-beginners/00/studio-setup-soundcheck.webp)

## Installation

1. [Download and install the GitHub Copilot app][app-install] for your operating system.
2. Open the app and select **Sign in to GitHub**.
3. Sign in with your GitHub account.

    <img src="/images/learning-hub/copilot-app-for-beginners/00/app-sign-in.webp" alt="Sign in to the Copilot app" width="800" />

4. At **Connect your repositories**, leave every repository unselected, then select **Continue**. You'll connect your fork of the GitHub Copilot app for Beginners repository in the next section.

The app opens the **New** view. If it shows a short tip about a new feature, you can close the tip. Next, connect your copy of the course repository.

## Connect to Your Repository

> [!NOTE]
> If the Copilot app reports that Git is missing when you connect your repository, [install Git](https://git-scm.com/install), then retry the connection.

1. [Fork the course repository on GitHub][fork-repo-link]. A fork is your own copy of the repository that lives on GitHub.

2. In the Copilot app, select **+** next to **Projects**, then select **Add GitHub repository**.

    ![Projects menu with callouts for + and Add GitHub repository](/images/learning-hub/copilot-app-for-beginners/00/app-add-project.webp)

3. Type `copilot-app-for-beginners` in the search box. Select your fork, the result that starts with your GitHub username, not `github/copilot-app-for-beginners`. The app downloads a local copy (clones it) and adds the project to the sidebar.

<details>
<summary>Other ways to connect a repository</summary>

Select **+** next to **Projects**, then choose the option that matches what you have:

| If you have... | Select |
|---|---|
| A local copy of your fork | **Open folder**, then select the folder |
| Your fork's repository URL | **Clone repository**, paste the URL in **Repository URL**, then select **Clone** |

</details>

## Check Your Tools in Terminal

> [!NOTE]
> Use the GitHub Copilot app's **Terminal** tab to run commands. Use the prompt box to send requests to the agent.

1. Confirm that the sidebar shows `copilot-app-for-beginners` under **Projects**.

1. Point to the `copilot-app-for-beginners` project in the sidebar. Select the **+** that appears next to it to start a project session.

1. Select the workspace selector below the prompt box, then choose **Current checkout**.

    This uses the clone already on your machine for setup. You'll learn about the other options in later chapters.

    <img src="/images/learning-hub/copilot-app-for-beginners/00/app-current-checkout-workspace-selector.webp" alt="Where to work menu with callouts for the workspace selector and Current checkout" width="800" />

1. Submit this short prompt to create the session and test it out.

    ```text
    Name the top-level folders in this repository. Do not change any files.
    ```

1. Select **View** > **Toggle Review Panel** to open the side panel if it is not already visible.

1. Select **Terminal**. If you don't see it, select **+**, then **Terminal**.

1. In **Terminal**, run each of these version checks to ensure that the prerequisites are installed correctly.

    ```bash
    git --version
    node -v
    npm -v
    gh --version
    ```

    Each command should display a version number. For `node -v`, the sample app requires [Node.js LTS](https://nodejs.org) or later.

    <details>
    <summary>Windows: npm fails because running scripts is disabled</summary>

    In PowerShell, `npm -v` can fail with a message that `npm.ps1` cannot be loaded because running scripts is disabled on this system. To continue, use `npm.cmd` in place of `npm` for every npm command in this course. For example, run `npm.cmd -v` and `npm.cmd test -- --run`.

    If your organization allows it, you can let PowerShell run local scripts instead. Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`. If PowerShell asks you to confirm, type `Y`. Then the `npm` commands in this course work as written.

    </details>

    Install only the tools that are missing, using the links in [Prerequisites](#prerequisites), then run the checks again.

1. The setup script uses the GitHub CLI, which has a separate sign-in. Confirm that it uses the account you used to create your fork:

    ```bash
    gh auth status
    ```

    If you are not signed in to that account, run:

    ```bash
    gh auth login
    ```

    Select **GitHub.com**, then **Login with a web browser**. After sign-in, run `gh auth status` again and confirm the active account before you continue.

<a id="seed-the-repository"></a>

## Add the Course Practice Items

The setup script prepares your fork with the practice items used in later chapters:

- **Labels** to organize the course tasks.
- **Issues** describing bugs and improvements you'll work on.
- **Practice branches** with separate versions of the Book App, including intentional bugs to fix.
- **Pull requests** with changes to review, a feedback comment to address, and an intentionally failing automated check.

These are training scenarios, not problems with your setup. The intentional bugs stay on practice branches, not `main`. The script creates items on GitHub in your fork, so you'll preview its target and planned changes before running it.

1. Open a browser and navigate to your newly forked repository on github.com.

1. Select the **Actions** tab.

1. New forks disable workflows by default. If you see **Workflows aren't being run on this forked repository**, select **I understand my workflows, go ahead and enable them**.

    Enable workflows so GitHub can run automated checks for the practice exercises.

1. Return to the same **Terminal** tab in the Copilot app. Run this command from the repository root (the folder containing `.github` and `samples` subfolders) to preview the setup without creating practice items:

    ```bash
    node .github/scripts/setup-training-scenarios.js --dry-run
    ```

    Wait for the preview to finish. It ends with `Dry run complete. No changes were made.` Confirm that the `Repository:` line in the output shows your fork before you continue.

1. In the same **Terminal** tab, run the setup script:

    ```bash
    node .github/scripts/setup-training-scenarios.js --yes
    ```

    Wait for the terminal to show `Setup complete.`

### Checklist

After setup, you should have:

- [ ] A fork connected to the Copilot app
- [ ] [Course labels](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/training-github-scenarios.md#manual-fallback-create-the-labels)
- [ ] [Training issues](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/training-github-scenarios.md#manual-fallback-create-the-seeded-issues)
- [ ] [Practice branches](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/training-github-scenarios.md#manual-fallback-create-practice-branches)
- [ ] [Training pull requests](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/training-github-scenarios.md#manual-fallback-create-pull-request-scenarios)

## Learn More About the Course Repository

Return to the prompt box in the project session. Submit this request to the Copilot app, not to Terminal:

```text
Give me an overview of the copilot-app-for-beginners course repository. Focus on the learning path and the samples/book-app-web folder.
```

**Expected Output:** The Copilot app should summarize the course structure and identify `samples/book-app-web` as the web sample used for later exercises.

---

## Troubleshooting

If something does not work as expected, check the problems below. The [Troubleshooting Reference](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/troubleshooting-reference.md) lists problems and fixes for all chapters.

<details>
<summary>Setup and access problems</summary>

### I cannot sign in

Check:

- You're using the expected GitHub account
- You have a Copilot plan, or you continued with your own model provider
- Your organization left the **GitHub Copilot app** policy enabled (separate from the Copilot CLI policy)
- If your organization uses `*.ghe.com`, you selected **Sign in to GitHub Enterprise Cloud**

### I cannot see the repository

Check:

- You've got access to the repository on GitHub
- You selected the correct account or organization
- You tried **Open folder** if the repository is already cloned

### A chat cannot explain the repository

Check:

- The correct repository is connected
- The prompt mentions `copilot-app-for-beginners`
- The app has permission to read the project folder

### The script stops for an organization fork

The script stops before changing a repository owned by an organization. Use this command only if you are authorized to set up that organization fork and have confirmed that the `Repository:` line shows the correct target:

```bash
node .github/scripts/setup-training-scenarios.js --yes --allow-shared-repository
```

### The script stops with "Setup failed"

Read the message after `Setup failed`. Fix the problem that it reports, then run `node .github/scripts/setup-training-scenarios.js --yes` again. The script reuses the labels, issues, branches, and pull requests that it already created, so it does not make duplicates.

### Practice items were not created

If issues are missing, open your fork on GitHub.com. Under **Settings** > **Features**, enable **Issues**, then rerun the script.

If you cannot run the script, complete the [manual setup steps in the Training GitHub Scenarios appendix](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/training-github-scenarios.md#manual-fallback-create-the-labels) before Chapter 02.

</details>

---

## Key Takeaways

1. GitHub Copilot app is a desktop control center for agent-driven coding work.
2. This course uses `samples/book-app-web` as the main sample app path.
3. Run the setup script so later chapters have practice branches, issues, and pull request scenarios ready.

## What's Next

Your studio is ready! In the next chapter, you'll answer a practical question first: why use the GitHub Copilot app if you already use GitHub Copilot in an editor or terminal? Then you'll tour the interface and learn about the different session types and modes.

**[← Back to Course Home](/learning-hub/app-for-beginners/)** | **[Continue to Chapter 01 →](/learning-hub/app-for-beginners/01-tour-the-app/)**

[fork-repo-link]: https://github.com/github/copilot-app-for-beginners/fork
[app-install]: https://github.com/features/ai/github-app
