---
title: "Lesson 12 - Deploy the site with GitHub Pages"
description: "Use the GitHub Copilot app to configure a Pages workflow, review its pull request, and verify the live Space Quiz."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-11-13
---

Give the Space Quiz a public home by deploying it with GitHub Pages. Copilot can prepare the workflow and guide the deployment, but you remain responsible for reviewing the changes and confirming that the site is live.

In this lesson, you will:

- ask Copilot to configure a GitHub Pages deployment.
- review the workflow and pull request before merging.
- follow the deployment and verify the published site.

## Scenario

The Space Quiz is already in a GitHub repository, but people still need a simple way to try it. Publishing the single-file site with GitHub Pages makes it available from a public URL without adding a server or runtime dependency.

## Ask Copilot to prepare the deployment

> [!WARNING]
> Creating a pull request can commit and push code. Review your approval settings and the destination repository before sending this prompt. With **Approve all**, do not expect a separate confirmation prompt.

In the Copilot app session for `space-quiz`, send this prompt:

```plaintext
Prepare a GitHub Pages deployment for this repository. Create a GitHub Actions workflow that builds the website if needed and deploys it to GitHub Pages after changes reach the default branch. Add a README describing the app and how to run it locally if one does not already exist. Create a pull request with these changes and report its link and any required Pages settings or permissions. Do not merge, enable auto-merge, change Pages settings, or deploy. Stop and wait for my review.
```

## Review the workflow and pull request

1. Confirm that the README is added only if the repository does not already have one.
2. Review the pull request changes, including the workflow's build and deployment steps, triggers, and permissions.
3. Confirm that the workflow deploys from the default branch, not from an unmerged pull request.
4. Request any corrections and review the updated diff. Wait for the required pull request checks to pass before authorizing a merge.

## Authorize the merge and deployment

> [!WARNING]
> The following prompt authorizes the agent to merge the reviewed pull request, change repository Pages settings, and publish the site. Send it only after completing your review and confirming the repository and pull request. Approval settings may allow these actions without another confirmation prompt.

Replace `<PR_NUMBER>` with the number of the pull request you reviewed, then send this separate prompt:

```plaintext
I have reviewed pull request <PR_NUMBER> in this repository and authorize its merge and deployment. Enable GitHub Pages using GitHub Actions, merge that pull request only after required checks pass, and monitor the deployment until it succeeds. Report the final URL of the live website. If you lack permission to enable Pages or merge, tell me exactly what I need to approve or do; do not report success until the site is live.
```

![Three-stage diagram: a merged space-quiz pull request; a successful GitHub Actions Deploy website run with Build website, Upload artifact, and Deploy to Pages steps; and the live Space Quiz at yourname.github.io/space-quiz/.](/images/learning-hub/copilot-workshops/first-steps-app-pages-deploy.svg)

## Verify the deployment

1. Follow the GitHub Actions deployment run until it succeeds.
2. Open the reported URL and confirm that the Space Quiz loads.

If the agent cannot enable Pages or merge the pull request, follow the specific instructions it provides. Do not treat the task as complete until the deployment succeeds and the live site loads.

## Summary and next steps

Your Space Quiz is now available as a live site, and you have verified the deployment instead of relying on the agent's report. Continue to [Lesson 13: Review and next steps][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-app/13-review/
