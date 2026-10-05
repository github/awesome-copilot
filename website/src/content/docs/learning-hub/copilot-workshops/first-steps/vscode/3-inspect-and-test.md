---
title: "Lesson 3 - Inspect context and test"
description: "Inspect the context attached to a Copilot Chat request, then run a browser-level smoke test before Git writes anything."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Before you publish anything, check what Copilot can see and prove that the quiz works.

In this lesson, you will:

- inspect the context included in a chat request.
- run a browser-level smoke test.
- fix failures before you move on to Git.

## Inspect context from the bottom-right

VS Code shows the active context at the bottom-right of the Copilot Chat input.

1. Open the context indicator in the **bottom-right** of the chat input.
2. Inspect the files, custom instructions, and symbols included in the request.
3. Remove irrelevant context, or attach the quiz file, before you continue.

## Build and test before Git writes

Use the integrated browser and a smoke-test prompt before you initialize a repository or commit anything:

```plaintext
Run a browser-level smoke test for the quiz. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. Run the smoke test and check the integrated browser.
2. Fix any failures and rerun the test until everything passes.
3. Only after the build and test pass, move on to Git.

## Summary and next steps

You confirmed what Copilot can see and tested the quiz before publishing. Continue to [Lesson 4: Publish the project][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/vscode/4-publish/
