---
title: "Lesson 3 - Publish the project"
description: "Initialize, commit, and publish the Space Quiz to GitHub, either by prompt or by running the commands yourself."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Turn the experiment into a public GitHub repository. You can ask for this in one prompt, or run the commands yourself. Try both ways once, and you will know exactly what the agent does on your behalf.

In this lesson, you will:

- initialize a Git repository and create the first commit.
- create and push a public GitHub repository.
- confirm that the commit and file landed.

## Option A: Ask for it

Send the following prompt:

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch.
```

Approve each Git and GitHub action as the agent requests it.

## Option B: Run it yourself

Prefix each command with `!` to run it from inside the session, or run the commands without the prefix in your own terminal:

```plaintext
!git init -b main
!git add .
!git commit -m "Add space quiz"
!gh repo create space-quiz --public --source=. --push
```

The last command uses the [GitHub CLI][gh-cli]. If you do not have it, create the repository on GitHub, then run `!git remote add origin <url>` and `!git push -u origin main`.

## Confirm the result

1. Run `!git log --oneline` to confirm that the commit landed.
2. Open the repository on GitHub and confirm that `index.html` is present.

## Summary and next steps

Your project is now a GitHub repository with a known-good version to compare against. Continue to [Lesson 4: Work on issues in parallel][next-lesson].

[gh-cli]: https://cli.github.com/
[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
