---
title: "Lesson 3 - Inspect the session and test the quiz"
description: "Read the session details to confirm what the agent is working on, then run a browser-level smoke test before Git writes anything."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
---

Now that your session has done real work, there is something to inspect. Confirm what the agent is pointed at, then let it drive the quiz in the integrated browser and report what actually happened rather than what it intended.

In this lesson, you will:

- read the session details panel.
- check the session's project, path, and context usage.
- run a browser-level smoke test and fix any failures.

## Read the session details

The session details tell you exactly what the agent is working on. You do not need to watch this panel constantly, but everything in it matters when a result surprises you.

At this point, Space Quiz is still a local folder, not a Git repository. Check its project, path, and context usage. After you [publish the project in Lesson 5][publish-lesson], Git-backed sessions show additional details such as the branch and **Changes**.

The illustration below shows a later, Git-backed session. Its branch and **Changes** fields are not available in your local-folder session yet.

![Illustration of the Copilot app session details panel for a Git-backed Space Quiz session. It shows the main branch from origin/main, the path, project, session name, session ID, and agent, one file changed, token counts, context usage at 27 percent, session spend, and options to enable remote control, rename, view insights, share as a secret gist, or archive the session.](/images/learning-hub/copilot-workshops/first-steps-app-session-details.svg)

The panel shows where the work is happening and how full the context window is. There is no model row, because you choose the model for each request in the composer.

1. Confirm that the **project** and **path** are the ones you think you are editing.
2. Check **context usage**. As it climbs, the agent has less room for your actual task, and that is your cue to start a fresh session.

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

You confirmed what the session is working on and verified the quiz with a browser-level smoke test. Continue to [Lesson 4: Capture project instructions][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
[publish-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/5-publish/
