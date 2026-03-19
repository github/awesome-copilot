---
title: "Quick Start"
description: "Install Copilot CLI, sign in, and confirm your first working session with a hands-on quick start that mirrors the companion course."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: "10 minutes"
tags:
  - copilot-cli
  - beginners
  - course
  - quick-start
prerequisites:
  - Review the course overview for the full chapter map.
relatedArticles:
  - ./index.md
  - ./01-setup-and-first-steps.md
prev: false
---

> **Goal:** get from _not installed_ to _successfully signed in and ready for Chapter 01_ with as little friction as possible.

> **Hands-on note:** This chapter works best with the companion repo [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners), because the verification steps use the sample book app from the source course.

Welcome! In this chapter, you'll install GitHub Copilot CLI, sign in with your GitHub account, and verify that everything works. This is the setup chapter, so keep the goal simple: finish with one working prompt and one working repo-aware example.

## Learning objectives

By the end of this chapter, you'll have:

- installed GitHub Copilot CLI
- signed in with your GitHub account
- verified that a basic interactive session works
- confirmed that Copilot CLI can read local repository context

> ⏱️ **Estimated time:** about 10 minutes total, including installation and sign-in.

## Prerequisites

Before starting, make sure you have:

- a GitHub account
- GitHub Copilot access on that account
- basic terminal comfort with commands like `cd` and `ls`

### What "Copilot access" means

GitHub Copilot CLI requires an account that can use Copilot. You can check your status at [github.com/settings/copilot](https://github.com/settings/copilot). Typical access paths include:

- **Copilot Free** or another personal plan
- **Copilot Business** through your organization
- **Copilot Enterprise** through your enterprise
- **GitHub Education** access for verified students and teachers

If your settings page says you do not have access, fix that first. Installation alone will not unlock the CLI.

## Installation

> ⏱️ **Time estimate:** installation usually takes 2-5 minutes. Authentication usually takes another 1-2 minutes.

### Recommended: GitHub Codespaces

Codespaces is the fastest path if you want the original practice environment with minimal local setup.

1. Open the companion repo: [github/copilot-cli-for-beginners](https://github.com/github/copilot-cli-for-beginners)
2. Fork it if you want to save your own progress
3. Select **Code** → **Codespaces** → **Create codespace on main**
4. Wait for the environment to finish provisioning
5. Start working in the terminal that opens automatically

If you want a quick extra check inside the Codespace, run:

```bash
cd samples/book-app-project
python book_app.py help
```

That confirms the sample environment is ready before you even open Copilot CLI.

### Alternative: local installation

If you prefer your own machine, choose the install method that matches your system.

> **Which option should you pick?** Use `npm` if you already have Node.js installed. Otherwise choose the platform-native option that is easiest for you.

> **Local lab note:** The source course uses a Python sample app for many demos. If you plan to follow the book-app exercises locally, install Python 3.10+ as well.

#### All platforms with npm

```bash
npm install -g @github/copilot
```

#### macOS or Linux with Homebrew

```bash
brew install copilot-cli
```

#### Windows with WinGet

```bash
winget install GitHub.Copilot
```

#### macOS or Linux with the install script

```bash
curl -fsSL https://gh.io/copilot-install | bash
```

<aside class="repo-launch-cta" aria-label="Quick start companion repository options">
  <div class="repo-launch-cta__inner">
    <p class="repo-launch-cta__eyebrow">Hands-on shortcut</p>
    <h2 class="repo-launch-cta__title">Choose the repo path that matches how you learn</h2>
    <p class="repo-launch-cta__description">Whether you want a zero-setup Codespace or a local clone you can keep, these links get you from the web lesson back into the original repo workflow quickly.</p>
    <div class="repo-launch-cta__actions">
      <a href="https://codespaces.new/github/copilot-cli-for-beginners?hide_repo_select=true&ref=main&quickstart=true" class="btn btn-primary" target="_blank" rel="noopener">Open in Codespaces</a>
      <a href="https://github.com/github/copilot-cli-for-beginners/blob/main/00-quick-start/README.md" class="btn btn-outline" target="_blank" rel="noopener">View source chapter</a>
      <a href="https://docs.github.com/en/copilot/how-tos/copilot-cli/cli-getting-started" class="btn btn-outline" target="_blank" rel="noopener">Open getting started guide</a>
    </div>
    <div class="repo-launch-cta__grid">
      <div class="repo-launch-cta__card">
        <h3>Fork before you edit</h3>
        <p>Use <a href="https://github.com/github/copilot-cli-for-beginners" target="_blank" rel="noopener">the companion repo</a> for browsing, then fork it when you want your own progress, branches, or Codespace.</p>
      </div>
      <div class="repo-launch-cta__card">
        <h3>Clone your fork locally</h3>
        <p>Prefer your own terminal and editor? Clone your fork and work through the repo chapters there.</p>
        <code class="repo-launch-cta__code">git clone https://github.com/YOUR-USERNAME/copilot-cli-for-beginners.git</code>
      </div>
      <div class="repo-launch-cta__card">
        <h3>Keep command help open</h3>
        <ul class="repo-launch-cta__card-links">
          <li><a href="https://docs.github.com/en/copilot/how-tos/copilot-cli/cli-getting-started" target="_blank" rel="noopener">Official getting started guide</a></li>
          <li><a href="https://docs.github.com/en/copilot/reference/cli-command-reference" target="_blank" rel="noopener">CLI command reference</a></li>
        </ul>
      </div>
    </div>
  </div>
</aside>

## Authentication

Open a terminal in the root of the companion repository, or in another folder you trust, then start the CLI:

```bash
copilot
```

On first launch, Copilot CLI may ask whether you trust the current folder so it can read local files. If you recognize the repository or directory, allow access.

![Copilot CLI trust prompt shown before granting the tool access to a local folder](/images/learning-hub/copilot-cli-for-beginners/00/copilot-trust.png)

After you trust the folder, sign in from inside the session:

```text
> /login
```

### What happens next

1. Copilot CLI shows a one-time device code
2. Your browser opens GitHub's device authorization page
3. Sign in to GitHub if needed
4. Enter the code from the terminal
5. Approve access and return to the CLI session

![GitHub device authorization flow for Copilot CLI sign-in](/images/learning-hub/copilot-cli-for-beginners/00/auth-device-flow.png)

> **Tip:** sign-in usually persists across sessions. You should not need to repeat this every time unless your token expires or you sign out.

## Verify it works

Keep the verification steps small and concrete. You want three wins: one successful response, one successful sample-app command, and one successful repo-aware prompt.

### Step 1: test a plain-English prompt

Inside the same `copilot` session, type:

```text
> Say hello and tell me what you can help with
```

A good result is simply a helpful answer that proves the CLI is responding. Then exit when you are ready:

```text
> /exit
```

<details>
<summary>🎬 See it in action!</summary>

![Hello demo in Copilot CLI](/images/learning-hub/copilot-cli-for-beginners/00/hello-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

### Step 2: run the sample book app

The source course uses a Python book collection app throughout the rest of the chapters. Make sure it runs before you move on.

```bash
cd samples/book-app-project
python book_app.py list
```

**Expected result:** you should see a list of five books, including titles like `The Hobbit`, `1984`, and `Dune`.

> **If `python` does not work on your system:** try `python3` instead.

### Step 3: try one repository-aware prompt

Go back to the repository root if needed, start Copilot CLI again, and ask about the sample project:

```bash
cd ../..
copilot
```

```text
> What does @samples/book-app-project/book_app.py do?
```

**Expected result:** a summary of the file's main commands and responsibilities.

> **Practice cue:** If that works, try one follow-up prompt before you leave. For example: `How would you improve its command parsing?` That gives you an early taste of the multi-turn flow you will use heavily in Chapter 01.

If you are only using the Learning Hub and not the companion repo, substitute a file you do have locally, such as:

```text
> Summarize @README.md in one paragraph
```

## ▶️ Try it yourself

Work through the three verification steps above, then confirm that all of these are true:

- [ ] `copilot` launches successfully
- [ ] `/login` completed and your session is authenticated
- [ ] a plain-English prompt received a useful answer
- [ ] the sample book app runs locally or in Codespaces
- [ ] a repo-aware `@file` prompt worked at least once

If you can check those off, you are ready for the real demos in Chapter 01.

## 📝 Assignment

Set yourself up for the rest of the course without skipping the hands-on part:

1. Open the companion repo locally or in Codespaces
2. Install or verify GitHub Copilot CLI
3. Sign in with `/login`
4. Run `python book_app.py list` inside `samples/book-app-project`
5. Start a `copilot` session and ask `What does @samples/book-app-project/book_app.py do?`
6. Ask one follow-up question about that file

**Success criteria:** you can launch the CLI, authenticate, run the sample app, and get one useful repo-aware answer before moving on.

## Troubleshooting

### `copilot: command not found`

The CLI probably did not install correctly, or its binary is not on your `PATH`. Try another installation method and reopen the terminal.

### "You don't have access to GitHub Copilot"

Check your status at [github.com/settings/copilot](https://github.com/settings/copilot). If you use a work account, verify that your organization allows Copilot CLI access.

### Authentication failed or expired

Start a new session and run:

```text
> /login
```

### Browser did not open automatically

Visit [github.com/login/device](https://github.com/login/device) manually and enter the code shown in the terminal.

### The sample app does not run

Double-check that you are in the companion repo and that Python is available. In local environments, try `python3 book_app.py list` if `python` is unavailable.

### Still stuck?

- Read the [official getting started guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/cli-getting-started)
- Use the [CLI command reference](https://docs.github.com/en/copilot/reference/cli-command-reference)
- Head over to the [source chapter](https://github.com/github/copilot-cli-for-beginners/blob/main/00-quick-start/README.md)

## Key takeaways

1. **Codespaces is the fastest path** if you want a ready-made environment that matches the source course.
2. **You have multiple installation choices** including npm, Homebrew, WinGet, and the install script.
3. **Authentication is usually one-time** until your token expires.
4. **The sample book app matters** because it becomes the shared practice project for later chapters.
