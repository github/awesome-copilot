---
title: "Lesson 6 - Work with issues and sessions"
description: "Create a focused backlog, select an issue, implement it in an isolated worktree, and review the diff yourself."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Ask the agent to suggest focused product improvements, turn those ideas into GitHub issues, and implement one issue in an isolated session.

In this lesson, you will:

- create three focused issues for the Space Quiz.
- browse your backlog in **Issues**.
- start a session from an issue in a new worktree.
- review the diff in the **Changes** tab and verify the feature.

## Build a backlog in Issues

Send the following prompt:

```plaintext
Review the space quiz and suggest three focused feature ideas that could each be completed in a short session. Create a separate GitHub issue for each idea with a clear title, user-focused description, and acceptance criteria. Do not implement them yet.
```

Open **Issues**, review the three issues, and choose one that has clear value and a manageable scope.

![Illustration of the Copilot app Issues view. The sidebar lists New, Pull requests, Issues, Automations, Customize, More, and the space-quiz project. The main area has Assigned to me, Created by me, Mentioning me, and Done tabs, a search box, State and Assignee filters, and a list of three open issues in the space-quiz repository.](/images/learning-hub/copilot-workshops/first-steps-app-issues.svg)

**Issues** pulls your GitHub issues from every repository into the app, filtered by **Assigned to me**, **Created by me**, **Mentioning me**, and **Done**.

## Implement an issue

1. Open the selected issue from **Issues**.
2. Select **New session**.
3. Choose a **new worktree** when prompted.
4. Use **Interactive** mode and your preferred model.
5. Send the following prompt:

   ```plaintext
   Implement this issue completely. Keep the single-file, dependency-free design, test the behavior in the integrated browser, and summarize the changes when finished.
   ```

The new worktree keeps this feature isolated from your default branch until you are ready to review and merge it.

## Review the diff yourself

When the agent reports back, do not take its word for it.

1. Open the right-side flyout and select the **Changes** tab.
2. Read the diff for every file the session touched.
3. Test the feature in the integrated browser and confirm that it meets the issue's acceptance criteria.

![Illustration of the Copilot app session with the Changes tab open in the right-side flyout. It shows one file changed, index.html, with 142 lines added and 8 removed, and inline diff lines beside the session conversation.](/images/learning-hub/copilot-workshops/first-steps-app-changes-tab.svg)

The **Changes** tab lists every file the session touched, with the diff inline.

## Summary and next steps

You created a backlog, implemented one issue in an isolated session, and reviewed the diff. Continue to [Lesson 7: Plan before you edit][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/7-plan-mode/
