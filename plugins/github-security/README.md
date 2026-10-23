# GitHub Security

Bring security into your Copilot workflow. The official GitHub Security extension adds a **GitHub Security** canvas to help you catch vulnerabilities early and work through existing findings, all without leaving your session:

- **Catch new vulnerabilities before they ship.** Run a security review of the changes you're making in the current session, so you can fix problems before you open a pull request.
- **Fix vulnerabilities already in your code.** Bring your repository's existing code scanning alerts into the session and hand them to Copilot to explain and fix.

![The GitHub Security canvas in the GitHub Copilot App, listing code scanning findings with Fix and Explain actions](https://raw.githubusercontent.com/github/awesome-copilot/main/extensions/github-security/assets/screenshot.png)

## Features

### Catch security issues before your pull request

- **Review as you work.** Run a security review of your session’s changes and see the findings in the canvas.
- **Fix before you push.** Hand review findings back to Copilot to fix in the same session, while the context is still fresh.

### Work through existing code scanning alerts

- **Code scanning alerts in your session.** Load code scanning alerts for the current repository from GitHub.com or GitHub Enterprise Cloud and browse them alongside your code.
- **Filter and triage.** Filter findings by severity, tools, or assignees, and see assignees, tags and linked pull requests at a glance.
- **Dismiss alerts.** Dismiss code scanning alerts with a reason directly from the canvas.

### Understand and fix each finding

- **See the code around it.** Findings include a highlighted snippet from your checkout.
- **Get a clear explanation.** Ask Copilot to explain one or more findings.
- **Make a fix you can review.** Ask Copilot to update your code, then review its changes.

## Requirements

- The GitHub Copilot App. Standalone Copilot CLI is not supported.
- A repository on GitHub.com or GitHub Enterprise Cloud. GitHub Enterprise Server is not supported.
- Access to code scanning alerts for the repository (GitHub Advanced Security or GitHub Code Security), to work with existing alerts.
- A local checkout of the repository, opened as a session in the Copilot App.

To load existing code scanning alerts, your Copilot App version must support GitHub authentication for extensions. Security reviews of your session's changes work without it.

## Install

### From the Copilot App

1. Open **Customize** and select the **Plugins** tab.
2. Find **github-security** in the **awesome-copilot** marketplace and select **Install**.
3. Reload extensions. You may need to start a new session before the **GitHub Security** canvas appears.

### From the terminal

With the Copilot App closed, run:

```shell
copilot plugin install github-security@awesome-copilot
```

To keep the extension current, open the **Update all** menu on the **Plugins** tab and select **Update plugins automatically**, or run `copilot plugin update github-security@awesome-copilot`.

## Agent tools

The extension registers tools that Copilot can call during a session. Each call goes through Copilot's normal per-invocation approval, the extension never bypasses tool permission prompts.

| Tool | What it does |
| --- | --- |
| `fetchGhasFindings` | Loads code scanning alerts for the current repository into the canvas. |
| `loadLocalFindings` | Adds findings from a local security review to the canvas. |
| `runFindingWorkflow` | Runs the explain, fix or recheck workflow for selected findings. |
| `reportFindingStatus` | Records whether a finding is resolved or still present after a fix or recheck. |
| `getExtensionState` | Reads the canvas state so Copilot knows which findings you're looking at. |

## Data and permissions

- The extension authenticates with the GitHub account you're signed in to in the Copilot App. It doesn't ask for or store tokens.
- Code scanning API requests use the repository's host, and the canvas loads assignee avatars from URLs returned by GitHub. The canvas runs on a local loopback server: static assets do not require authentication, while state, command and code-snippet endpoints require a per-instance token.
- Explain, fix and recheck run in your existing Copilot session and model. The extension doesn't call any other AI service.
- **Resolved** and **In progress** statuses set by Copilot are local to your session. They don't close or change code scanning alerts. Only an explicit **Dismiss** action updates the alert on GitHub.

Security findings and generated fixes require review. They don't guarantee that a repository is free of vulnerabilities.

## Third-party notices

The bundled dependencies' versions, licenses and notices are included with the
[extension](https://github.com/github/awesome-copilot/blob/main/extensions/github-security/THIRD_PARTY_NOTICES.md) and
[canvas](https://github.com/github/awesome-copilot/blob/main/extensions/github-security/client/THIRD_PARTY_NOTICES.md).
