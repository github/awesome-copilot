---
title: "Lesson 4 - Work on issues in parallel"
description: "Create a backlog, add an issue to the chat from the side panel, review changes with /diff, and start a second session in its own worktree."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Keep the backlog and the implementation loop in the terminal, and open separate sessions for independent work.

In this lesson, you will:

- create three focused GitHub issues.
- add an issue to the chat from the side panel and implement it.
- review the change with `/diff`.
- start a second session in an isolated worktree.

## Create a backlog

Send the following prompt:

```plaintext
Review the space quiz and create three focused GitHub issues with clear titles, user-focused descriptions, and acceptance criteria. Do not implement them yet.
```

## Work the first issue in this session

1. Press the <kbd>Left arrow</kbd> key to open the side panel, then press <kbd>Tab</kbd> to move across to the **Issues** tab.
2. Highlight the first issue and press <kbd>c</kbd> to add it to the chat as context. To read the full issue first, press <kbd>Enter</kbd> instead.
3. Ask the agent to implement the issue.

![Illustration of the Copilot CLI side panel in a terminal. The Issues tab is selected among the Current, Sessions, Issues, Pull requests, and Gists tabs. A search filter for open issues in the space-quiz repository shows one issue, Add a score screen at the end of the quiz. Hints explain that the Left arrow key opens the panel and Tab moves between tabs, and the bottom row lists keys: slash to search, Enter for details, o to open, w for worktree, c for chat, and a for all.](/images/learning-hub/copilot-workshops/first-steps-cli-side-panel.svg)

The side panel lists every tab across the top, and the hints along the bottom are the keys that act on whatever is highlighted.

## Review the change with `/diff`

The project is published, so there is a known-good version to compare against. `/diff` shows precisely what this issue changed on top of it, which is exactly what you are about to ask someone to review.

1. Run `/diff` and read every changed file.
2. Ask for a fix for anything that looks wrong, then run `/diff` again.
3. Run `!git status` or `!git diff` whenever you want to inspect Git directly.

## Work the second issue in parallel

1. Open the side panel again and switch to the **Sessions** tab.
2. Start another session for the second issue without losing the first one.
3. In the new session, run `/worktree` so it gets an isolated worktree instead of branching in place. Both sessions can now run at once without interfering with each other.
4. Add the second issue to that session with <kbd>c</kbd>.
5. Leave the session there for now. The next lesson plans this issue before any code is written.

![Illustration of Copilot CLI output after running /worktree. It reports that it created the worktree ../space-quiz-13 on the branch issue-13-review-screen, and that this session now works there while main is untouched.](/images/learning-hub/copilot-workshops/first-steps-cli-worktree.svg)

`/worktree` moves the session into its own checkout on its own branch, so the first session keeps working undisturbed.

## Summary and next steps

You implemented the first issue, reviewed it with `/diff`, and started a second session in its own worktree. Continue to [Lesson 5: Plan before you edit][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
