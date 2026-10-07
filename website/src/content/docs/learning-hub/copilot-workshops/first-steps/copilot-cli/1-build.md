---
title: "Lesson 1 - Build the quiz from the terminal"
description: "Ask Copilot CLI for the whole Space Quiz in one detailed request, then make one focused refinement."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Ask for the whole project in one detailed request, review what the agent proposes before you approve it, then make one small, scoped change.

In this lesson, you will:

- build a dependency-free quiz in `index.html`.
- open the quiz in a browser from the session.
- make one focused change and verify it.

## Build the quiz

Send the following prompt in your Copilot CLI session:

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with an emoji reaction at the end. Single index.html, no server or dependencies. Accessible, keyboard-navigable, and respects prefers-color-scheme.
```

1. Read the proposed plan and approve the file changes.
2. Open `index.html` in a browser and play a few questions. To launch it from the session, run `!open index.html` on macOS, `!start index.html` on Windows, or `!xdg-open index.html` on Linux.

## Make a small change, then check it

Ask for one focused refinement so you can see how a scoped request behaves:

```plaintext
The results screen feels flat. Give it a stronger sense of arrival: animate the score counting up and make the emoji reaction larger. Change nothing else.
```

1. Reload the page in your browser and play through to the end.
2. Notice that nothing is in Git yet, so there is nothing to diff against. That changes after you publish the project.

## Summary and next steps

You built the quiz and refined it with a scoped request. Continue to [Lesson 2: Capture project instructions][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
