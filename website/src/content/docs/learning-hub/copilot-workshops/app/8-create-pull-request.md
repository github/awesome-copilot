---
title: "Lesson 8 - Create and merge the feature PR"
description: "Review filtering, instructions, the skill update, QA profile, and tests together, then create a PR and use Agent Merge."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Your filtering implementation, instruction updates, skill update, quality assurance (QA) profile, and tests are saved on one branch. It's time to review them together and open a pull request. You merged the star-rating pull request (PR) yourself; this time you'll allow **Agent Merge** to manage the process.

> [!NOTE]
> Normally, we'd split the feature, instruction updates, skill update, and QA agent into a few separate PRs. To streamline the workshop, you've kept the full filtering and quality workflow in one session and branch, with all that work going into this PR.

In this lesson, you will:

- learn what Agent Merge is and how it automates the merge lifecycle.
- inspect the full feature PR and verification evidence.
- authorize Agent Merge only after review, and confirm the PR is merged.

## Scenario

Throughout the filtering workflow, you've used Copilot to plan, implement, and verify a feature. Tailspin Toys now wants to automate the remaining PR work while keeping merge authorization under the developer's control.

## Introducing Agent Merge

**Agent Merge** automates the remaining work needed to land a pull request in the GitHub Copilot app. When you enable it, the app's session reads your pull request, addresses what's blocking it — fixing failing continuous integration (CI) checks, responding to review comments, rebasing when needed — and merges it as soon as GitHub allows. It runs in the background, survives app restarts, and turns itself off once your pull request is merged.

Up to this point you've selected **Merge pull request** yourself. Agent Merge can take on that responsibility, but its ability to edit code and merge still needs your explicit authorization. Review its allowed actions and the work before granting merge permission.

## Use Agent Merge to manage the PR

With all of your code created and reviewed, let's allow agent merge to manage the PR process.

1. Use the agent picker to select **Default agent**.
2. Select the dropdown next to **Create PR**.
3. Select **Agent merge**. The button changes to **Agent merge**.
4. Select **Agent merge** to start the agent merge process.

The agent merge process kicks off. It will:

- Create the pull request with a title and description.
- If you started the session with an issue, reference the related issue in the description's body.
- Rebase or handle any potential merge conflicts with the target branch.
- Monitor the CI process to ensure all checks pass.
- Monitor the PR for any feedback from other developers or Copilot code review. It will make updates to resolve those comments.
- Optionally it can automatically merge the PR once everything has succeeded.

Let's let agent merge also merge the PR once everything passes!

5. Select the dropdown next to **Agent merge**.
6. Ensure there's a check next to **Merge pull request**.


> [!IMPORTANT]
> Agent Merge does not bypass repository protections or missing permissions. Resolve those blockers before continuing.

## Summary and next steps

You've automated several parts of the development process, including generating code, testing and validating code, and now the pull request process. You:

- learned what Agent Merge is and how it automates the merge lifecycle.
- inspected the full feature PR and verification evidence.
- authorized Agent Merge only after review and confirmed the PR was merged.

Next, you'll [use an existing canvas and create a triage canvas][next-lesson] to explore a richer way to inspect, plan, and visualize work with the agent.

## Resources

- [Managing issues and pull requests with the GitHub Copilot app][managing-issues-prs]
- [About the GitHub Copilot app][about-copilot-app]

[next-lesson]: /learning-hub/copilot-workshops/app/9-canvases/
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
