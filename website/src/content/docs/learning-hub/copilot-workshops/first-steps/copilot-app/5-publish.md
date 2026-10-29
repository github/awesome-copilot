---
title: "Lesson 5 - Publish the project"
description: "Turn the local Space Quiz experiment into a public GitHub repository."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
---

Publish the Space Quiz so you can manage issues, use isolated worktrees, and complete a pull request workflow.

In this lesson, you will:

- initialize the folder as a Git repository.
- create and push a public GitHub repository.
- link the project to GitHub in the Copilot app.

## Publish the repository

Send the following prompt:

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch. Refresh the project within this app so the GitHub project is linked.
```

> [!WARNING]
> Depending on your approval settings, the agent may ask for confirmation before it creates a repository or pushes code, or those actions may be approved automatically. With **Approve all**, do not expect a separate confirmation prompt. Review your settings, the requested action, and the destination before sending the publishing prompt.

After the agent finishes:

1. Open the new repository on GitHub.
2. Confirm that `index.html` is present.
3. Return to the Copilot app and confirm that the project is linked to the repository.

## Summary and next steps

Your project is now a GitHub repository. Continue to [Lesson 6: Work with issues and sessions][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/6-issues-and-sessions/
