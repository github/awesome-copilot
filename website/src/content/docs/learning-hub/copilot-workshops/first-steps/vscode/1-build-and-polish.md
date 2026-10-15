---
title: "Lesson 1 - Build in the workspace"
description: "Build the Space Quiz in VS Code, preview it in the integrated browser, and polish a picked element."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Keep the editor, chat, files, and preview together. You will build the quiz, play it in the integrated browser, then hand a specific element straight to chat for a focused change.

In this lesson, you will:

- build the quiz in a single `index.html`.
- preview the quiz in the integrated browser.
- select an element in the browser and polish it.

## Build the quiz

Send the following prompt in Copilot Chat:

```plaintext
Create a colorful, accessible space exploration quiz with 10 questions in a single index.html. Add a progress bar, score counter, animated correct and incorrect feedback, and a results screen. Use no server or dependencies. Open it in the VS Code integrated browser.
```

1. Review the generated file in the editor.
2. Open the integrated browser and play several questions.
3. Open **Source Control** at any point to see the changed files and diff.

## Pick an element and polish it

The integrated browser can hand a specific element straight to chat, so you never have to describe which button you mean.

1. With the quiz open in the integrated browser, start an element selection from the browser toolbar.
2. Select the answer buttons to attach that element to your next chat message.
3. Send the following prompt and watch the preview reload:

   ```plaintext
   Using the selected element, make the answer buttons feel more tactile: add a subtle press state, a clearer focus ring for keyboard users, and a smoother transition into the correct and incorrect colors. Change nothing else.
   ```

4. Read the diff in **Source Control** before you keep it.
5. Press <kbd>Tab</kbd> to move through the answers and confirm that the focus ring is visible.

## Summary and next steps

You built, previewed, and polished the quiz without leaving the editor. Continue to [Lesson 2: Capture project instructions][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/vscode/2-project-instructions/
