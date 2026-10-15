---
title: "Lesson 3 - Inspect the session and test the quiz"
description: "Review the project and usage details for the session, then run a browser-level smoke test before Git writes anything."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-15
---

Now that your session has done real work, there is something to inspect. Confirm what the agent is pointed at, then let it drive the quiz in the integrated browser and report what actually happened rather than what it intended.

In this lesson, you will:

- review the project and session controls in the title menu.
- check the plan, session usage, tokens, and context in the usage menu.
- run a browser-level smoke test and fix any failures.

## Review the project details

Select **Build a space quiz** in the title bar to open the project and session menu.

![Illustration of the Build a space quiz title menu. It identifies the space-quiz folder session and provides controls for the path, remote control, name, nested sessions, session ID, sharing, archiving, and deletion.](/images/learning-hub/copilot-workshops/first-steps-app-project-details.svg)

This menu identifies the project that the session is working in and provides controls for managing the session.

1. Confirm that the folder session is for the `space-quiz` project.
2. Select **Path** to confirm that the session is working in the folder you expect.
3. Notice the controls for remote control, renaming, nested sessions, sharing, archiving, and deletion.

## Review the usage details

Select the usage control next to **Send** to open the plan and session usage menu.

![Illustration of the usage menu next to the Send button. It shows the GitHub Copilot Pro+ plan, session AI credits, input and output token counts, and context usage at 16 percent of 400 thousand tokens.](/images/learning-hub/copilot-workshops/first-steps-app-usage-details.svg)

This menu separates account and session usage from the project controls:

- **Plan** shows plan-level usage when that information is available.
- **Session** shows the AI credits used by the current session.
- **Tokens** shows input, cached, output, and reasoning token counts.
- **Context** shows how much of the context window the session has used.

Check **Context** as the session grows. As it fills, the agent has less room for your task, and that is your cue to start a fresh session.

> [!TIP]
> **Most bad results are context problems**
>
> A wrong folder or a nearly full context window explains far more surprises than a bad prompt does.

## Test before Git writes anything

The integrated browser is a real browser, so the agent can drive the quiz and verify its behavior. Send the following prompt:

```plaintext
Run a browser-level smoke test for the quiz in the integrated browser. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. Watch the integrated browser as the agent runs through the questions.
2. If anything fails, let the agent fix it and rerun the test until everything passes.
3. Move on only when the build and test are green.

Nothing has been written to Git yet. In the next lesson, you will run `/init create simple rules for the project`, which reads the project as it stands, so it is worth making sure the project works first.

## Summary and next steps

You confirmed the session's project and usage details, then verified the quiz with a browser-level smoke test. Continue to [Lesson 4: Capture project instructions][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
[publish-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/5-publish/
