---
title: "Lesson 2 - Build and polish the quiz"
description: "Build a single-file Space Quiz and refine it with the integrated browser and element picker."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Use one detailed prompt to build the Space Quiz, verify its behavior in the integrated browser, and make a visual refinement with the element picker.

In this lesson, you will:

- create a dependency-free quiz in `index.html`.
- test the quiz in the integrated browser.
- inspect the generated code.
- refine a selected element while preserving accessibility.

## Build the quiz

Send the following prompt in your `space-quiz` session:

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with emoji reaction at the end. Center in a narrow column. Single index.html, no server/dependencies. Polished, sans-serif, 14–16px body, prefers-color-scheme. Open in the integrated browser.
```

When the agent finishes, play several questions and confirm:

- the progress bar advances.
- the score updates.
- correct answers show a green state.
- incorrect answers use a red shake animation.
- the results screen appears after the final question.

## Inspect the generated code

Collapse the left sidebar and the right-side browser panel, then review `index.html` in the expanded code area. Notice how the HTML, CSS, and JavaScript work together in one file. Restore both panels when you finish.

## Polish with the element picker

1. Select the element picker in the browser toolbar.
2. Select the quiz heading or answer area.
3. Send the following prompt:

   ```plaintext
   Make the selected element feel more like a mission-control display. Keep it accessible and preserve the existing light and dark themes.
   ```

4. Watch the integrated browser refresh and verify the change.

## Optional refinements

If you want to continue experimenting, ask the agent to:

- add a subtle star-field background that respects `prefers-reduced-motion`.
- make the results screen more celebratory when the score is 8 or higher.
- improve keyboard focus states, then verify the quiz without a mouse.

## Summary and next steps

You built, inspected, and refined the Space Quiz. Continue to [Lesson 3: Inspect the session and test the quiz][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/3-inspect-and-test/
