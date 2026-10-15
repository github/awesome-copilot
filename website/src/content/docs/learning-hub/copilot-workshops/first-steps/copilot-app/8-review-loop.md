---
title: "Lesson 8 - Complete the Copilot review loop"
description: "Create a pull request, request a Copilot review, address actionable feedback, and let Agent Merge keep the pull request healthy."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Turn the implemented issue into a pull request, request a review from Copilot, and address the feedback before merging.

In this lesson, you will:

- inspect the session's changes one last time.
- create a pull request from the agent session.
- request a Copilot code review.
- review and apply actionable feedback.
- turn on Agent Merge to keep the pull request healthy until it merges.

## Create and review the pull request

1. Open the right-side flyout and select the **Changes** tab to inspect the files changed in the session.
2. Select **Create PR** in the session toolbar.
3. Review the generated title and description, then create the pull request.
4. Open the pull request on GitHub.
5. From the **Reviewers** menu, request a review from **Copilot**.
6. Open the **Files changed** tab and read every review comment.
7. For each actionable comment, use the Copilot **Fix** action in the app or make the change yourself.
8. Review each change and retest the feature.
9. Reply with a concise description of what changed, then resolve the conversation.

> [!NOTE]
> If a suggestion is not applicable or is outside the scope of the pull request, reply with the reason instead of making an unnecessary change. Resolve every review conversation before merging.

## Merge with Agent Merge

Turn on **Agent Merge** for the pull request to let the agent keep it healthy. The agent addresses review comments, fixes failing checks, and resolves conflicts as they appear, then merges once everything is green.

If you prefer to merge yourself, review the final diff, verify the feature, and merge the pull request after every check passes.

## Summary and next steps

You completed the development loop from issue to reviewed and merged pull request. Continue to [Lesson 9: Automate issue triage][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/9-automations/
