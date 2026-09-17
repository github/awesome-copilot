---
title: "Exercise 1 - Installing GitHub Copilot CLI"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

[GitHub Copilot CLI][about-copilot-cli] is a powerful agentic coding assistant that runs in your terminal, enabling you to explore codebases, generate code, run commands, and interact with external tools - all from the command line. It allows you to offload tasks, request changes, and stay in the zone. The first step, as you might imagine, is to install the tool! Fortunately this can be done using tools you're already familiar with.

In this exercise, you will learn how to:

- install GitHub Copilot CLI using npm.
- authenticate with your GitHub account.
- verify the installation.

## Scenario

Your team is starting to use AI agents to work through a growing backlog. Copilot CLI brings that capability into the terminal, where many developers already live. This exercise gets you installed, authenticated, and ready to use it for the rest of the workshop.

## Open a terminal in your codespace

Before installing Copilot CLI, you need to open a terminal window in your codespace.

1. Return to your codespace if you're not already there.
2. Open a terminal window by pressing <kbd>Ctrl</kbd>+<kbd>\`</kbd>.
3. You should see a terminal panel appear at the bottom of your VS Code window.

## Install Copilot CLI

You can install Copilot CLI through [npm][install-npm], [WinGet][install-winget], and [Homebrew][install-homebrew]. Since GitHub Codespaces come with Node.js pre-installed you'll use npm to install Copilot CLI.

1. In the terminal, verify Node.js is installed and meets the version requirement:

   ```bash
   node --version
   ```

   You should see version 22 or higher (e.g., `v22.x.x`).

2. Install Copilot CLI globally in the codespace using npm:

   ```bash
   npm install -g @github/copilot
   ```

3. Verify the installation by checking the version:

   ```bash
   copilot --version
   ```

   You should see the version number displayed (e.g., `v1.0.XX`).

> [!TIP]
> If you encounter permission errors, you may need to use `sudo npm install -g @github/copilot` on some systems. However, this shouldn't be necessary in GitHub Codespaces.

## Authenticate with GitHub

On first launch, Copilot CLI will prompt you to authenticate with your GitHub account.

1. Start Copilot CLI:

   ```bash
   copilot
   ```

2. If you're not currently logged in, you'll see a prompt to authenticate. Copilot CLI will display a device code and ask you to visit a URL.
3. Follow the on-screen instructions:
   - Open the provided URL in your browser
   - Enter the device code when prompted
   - Authorize Copilot CLI to access your GitHub account
4. Once authenticated, you'll see the Copilot CLI prompt, ready to accept your questions and commands.

> [!NOTE]
> In a codespace, you may already be authenticated through your GitHub session. If Copilot CLI starts without prompting for authentication, you're good to go!

## Trust the directory and verify everything is working

Now that you're at the Copilot CLI prompt for the first time, let's trust this workshop repository and make sure Copilot CLI is properly installed and connected.

1. When Copilot CLI asks you to confirm that you trust the files in this folder, you'll see three options:
   - **Yes, proceed**: Trust for this session only
   - **Yes, and remember this folder for future sessions**: Trust permanently
   - **No, exit (Esc)**: Don't allow file access
2. For this workshop, select **Yes, and remember this folder for future sessions** since you'll be working in this repository throughout.
3. Ask Copilot a simple question to verify it's working:

   ```
   What files are in this project?
   ```

4. Copilot should explore the repository and provide a summary of the project structure.
5. Try the `/help` command to see available slash commands:

   ```
   /help
   ```

6. Exit Copilot CLI by entering the following command in the terminal. We will return back to Copilot CLI in a future exercise!

   ```
   exit
   ```

## Summary and next steps

Congratulations! You've successfully installed and authenticated GitHub Copilot CLI. You learned how to:

- install Copilot CLI using npm.
- authenticate with your GitHub account.
- trust a directory for Copilot CLI to work with.
- verify the installation is working correctly.

Now that Copilot CLI is installed, let's give Copilot some project context. Continue to [Exercise 2 - Custom instructions with CLI][next-lesson].

## Resources

- [Installing GitHub Copilot CLI][install-copilot-cli]
- [About Copilot CLI][about-copilot-cli]
- [Using Copilot CLI][using-copilot-cli]

[previous-lesson]: /learning-hub/copilot-workshops/cli/0-prerequisites/
[next-lesson]: /learning-hub/copilot-workshops/cli/2-custom-instructions/
[install-copilot-cli]: https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli
[install-npm]: https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli#installing-with-npm-all-platforms
[install-winget]: https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli#installing-with-winget-windows
[install-homebrew]: https://docs.github.com/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli#installing-with-homebrew-macos-and-linux
[about-copilot-cli]: https://docs.github.com/copilot/concepts/agents/about-copilot-cli
[using-copilot-cli]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli
