---
title: '00 · Prerequisites'
description: 'Set up your Codespaces-based environment and prerequisites for the Advanced GitHub Copilot CLI course.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 0 — Prerequisites and environment setup

|  | [Next: Getting started with Copilot CLI →][next-lesson] |
|:--|--:|

The first step to using any tool or beginning development on a new project is installation. In our case, we'll need:

- Copilot CLI
- A new instance of the project
- SDKs, frameworks and libraries installed

To streamline the last bullet point (local installation of SDKs, frameworks and libraries), this course is built to use [Codespaces][codespaces-docs]. Codespaces are cloud-based containers which are configured using a dev container definition. Once launched, you can interact with your codespace through an instance of VS Code running in your browser, so no local installation is required!

> [!IMPORTANT]
> The content in this course will always use codespaces as the interface for the lab. You can run the course locally by using a [dev container running locally in VS Code][vscode-devcontainers], or installing all the necessary software on your system. The "green path" is to work through the content through codespaces, which will be our focus.

## Scenario

You've recently joined Contoso, and your first assignment is as part of the team developing AssetTrack, an internal asset tracking application. The first step before you can begin creating code is to get a copy of the project and the necessary tooling installed. To streamline the process you'll do everything via Codespaces.

In this lesson, you will:

- create a new repository based on the template for AssetTrack.
- open the project in Codespaces.
- install and authenticate Copilot CLI.
- verify installation of Copilot CLI.
- run AssetTrack.

## Create a new instance of AssetTrack

When doing standard development, the first step is often to fork or clone the repository you'll be contributing to. For our course, since you'll be working through the exercises on your own, you'll grab a separate copy of the project. You'll do this by creating a new instance of the repository by using a [template repository][github-template-docs] on your own personal GitHub account.

1. In your browser, navigate to [https://github.com/github-samples/contoso-inventory](https://github.com/github-samples/contoso-inventory).
2. Select **Use this template**.
3. Select **Create a new repository**.
4. Under **Owner**, select your personal GitHub account.
5. For **Repository name**, enter `AssetTrack`.
6. Leave the remaining options at their defaults.
7. Select **Create repository**.
8. Once the new repository has been created, select the **Code** button.
9. Switch to the **Codespaces** tab.
10. Select **Create codespace on main**.

> [!NOTE]
> The first launch of the codespace will take a few minutes. AssetTrack uses a custom devcontainer that includes the runtimes for all four stacks (Java, Node/Astro, .NET, Python/FastAPI), and the container image needs to be built the first time the codespace starts. Subsequent launches will be much faster.

## Launch AssetTrack

Before pointing Copilot CLI at the codebase, you need to know the app runs in its current state. That way, when something breaks later in the course, you can be confident it was a change you (or the agent) made — not a pre-existing problem with your environment. AssetTrack spans four stacks (Java, Astro/TypeScript, .NET, and two FastAPI services), but it's wired up so a single `npm run dev` command starts everything together and the Astro frontend proxies the rest. Running it once now gives you a known-good baseline and the URL you'll keep open throughout the course.

1. In your codespace, press <kbd>ctrl</kbd>+<kbd>`</kbd> to open the integrated terminal.
2. Run `npm run dev`.
3. Wait for the terminal to display a forwarded link to `localhost:4321`.
4. Select the displayed link to open AssetTrack in a new browser tab.
5. Confirm the AssetTrack dashboard renders.

## Install and authenticate Copilot CLI

Copilot CLI is the primary tool you'll spend the rest of the course driving, so the final setup step is to get it installed, signed in, and verified inside the codespace. You'll do this in a second terminal so the app keeps running undisturbed in the first one — that side-by-side layout (app on the left, agent on the right) is the workflow you'll use for every exercise that follows. Authenticating once now means later modules can jump straight into prompting instead of stopping to handle a login flow.

1. In your codespace, press <kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>`</kbd> to open a new terminal.
2. Install Copilot CLI by following the [official install instructions][copilot-cli-install].
3. Run `copilot` to start the CLI.
4. Follow the prompts to sign in with your GitHub account and authenticate.
5. Once you reach the prompt, enter `hello` and press <kbd>Enter</kbd>.
6. Confirm Copilot CLI responds.

## Summary

With the environment in place, you're ready to start driving Copilot CLI against a real codebase. You created your own copy of AssetTrack from a template, launched it in a Codespace backed by the course's custom devcontainer, confirmed the app boots end-to-end, and got Copilot CLI installed and authenticated in a second terminal. That side-by-side setup — app running in one terminal, agent in another — is the workflow every remaining module builds on.

In this lesson, you:

- created a new repository based on the template for AssetTrack.
- opened the project in Codespaces.
- installed and authenticated Copilot CLI.
- verified installation of Copilot CLI.
- ran AssetTrack.

Next, [start a real conversation with the codebase][next-lesson].

## Resources

- [Copilot CLI documentation][copilot-cli-docs]
- [GitHub Copilot CLI repository][copilot-cli-repo]
- [Legacy app: `github-samples/contoso-inventory`][contoso-inventory]
- [GitHub Codespaces overview][codespaces-docs]

---

|  | [Next: Getting started with Copilot CLI →][next-lesson] |
|:--|--:|

[next-lesson]: ../01-working-with-copilot-cli/
[contoso-inventory]: https://github.com/github-samples/contoso-inventory
[copilot-cli-docs]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli
[copilot-cli-install]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli#installing-copilot-cli
[copilot-cli-repo]: https://github.com/github/copilot-cli
[codespaces-docs]: https://docs.github.com/codespaces/overview
[vscode-devcontainers]: https://code.visualstudio.com/docs/devcontainers/containers
[github-template-docs]: https://docs.github.com/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template
