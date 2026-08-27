---
title: '03 · Test Suite, Remote & Delegation'
description: 'Turn accessibility checks into a Playwright-backed feedback loop, steer sessions with /remote, and offload work with /delegate.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-26
---

# Module 3 — Enhancing the test suite with remote and delegation

| [← Previous: Building an AI infrastructure foundation][previous-lesson] | [Next: Shaping Copilot CLI's lifecycle with hooks →][next-lesson] |
|:--|--:|

The accessibility and contribution infrastructure from [Module 2][m02] is useful only if the team can prove it keeps working. This module turns the first accessibility checks into a Playwright-backed feedback loop, uses `/remote` to steer the active CLI session remotely, and hands a bounded test backfill to Copilot cloud agent with `/delegate`.

> [!NOTE]
> If you're jumping straight to this module without finishing the earlier ones, check out the `start-of-module-03` catch-up branch. It holds the accessibility and contribution infrastructure the earlier modules produced, which the exercises here assume is already in place.
>
> 1. Follow the [course prerequisites][prerequisites] to create your AssetTrack repository from the [`github-samples/contoso-inventory`][contoso-inventory] template. Ensure that you select **Include all branches** when you create it so the catch-up branches come along.
> 2. In your codespace terminal, check out the catch-up branch:
>
>     ```bash
>     git checkout start-of-module-03
>     ```
>
> This branch contains the completed AI infrastructure that this module builds on.

## What you will learn

By the end of this module you will be able to:

- Decide which test work belongs in a local Copilot CLI session and which work is safe to delegate.
- Start a Playwright browser test suite for AssetTrack's web UI.
- Use test output to separate setup issues from real accessibility gaps.
- Steer an active Copilot CLI session from GitHub.com or GitHub Mobile with `/remote`.
- Hand scoped work to Copilot cloud agent with `/delegate`.
- Write and review a delegation brief before trusting an agent-created pull request.

## Scenario

AssetTrack already has a few backend smoke tests, but the UI has no browser coverage yet. That makes accessibility work hard to trust. You'll use Copilot CLI to scaffold a small Playwright suite, read the first failures carefully, and make only the changes the evidence supports. Once the local foundation is reviewable, you'll write a delegation brief and send the broader test backfill to Copilot cloud agent.

![Five connected stages running left to right: Accessibility, Tests, Remote, Delegate, and PR.](/images/learning-hub/advanced-copilot-cli/03-test-backed-workflow.png)

## Local, remote, and delegated work

The same Copilot CLI logic can run in three places. Choosing the right one for a given task is the core skill of this module. Each surface trades immediacy for reach.

- A local Copilot CLI session is best for exploration, test setup, debugging, and judgment calls. You approve tool calls, inspect diffs, and decide whether a failure is a test bug, an app gap, or an environment issue.
- `/remote` gives you access to your Copilot CLI session from GitHub.com or GitHub Mobile, allowing you to control the same active CLI session running in your terminal or codespace. It does not move execution to a hosted runner.
- `/delegate` sends scoped work to Copilot cloud agent, which works from GitHub state, creates commits, and opens a pull request.

As a general rule, keep ambiguous work local and delegate only bounded work you can describe with files, commands, constraints, and PR expectations. Remember that the cloud agent sees pushed branches and repository files, not the uncommitted changes in your terminal. Commit and push before you delegate.

![Three work surfaces side by side: Local shown as a terminal window, Remote as a web page beside a phone, and Cloud as a robot inside a cloud.](/images/learning-hub/advanced-copilot-cli/03-copilot-work-surfaces.png)

## Exercise 1: Start the Playwright foundation locally

Playwright is a browser-automation framework that drives a real browser to exercise your UI the way a user would. Let's start by creating the first browser test signal for the AssetTrack UI and using it to validate the accessibility work from the previous module. You'll touch `playwright.config.ts`, accessibility specs under `tests/playwright/`, and root `package.json` and lockfile updates — plus narrow Astro accessibility files only if the tests prove a real gap.

The goal is a tight evidence loop: scaffold tests, run them, classify each failure, and fix only what the evidence supports.

![A four-stage cycle flowing clockwise: Run, Learn, Fix, and Verify, then back to Run.](/images/learning-hub/advanced-copilot-cli/03-test-evidence-loop.png)

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Open a terminal in the codespace. If you don't already have a terminal available, open the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) and select **Terminal: Create New Terminal**.
3. Run `npm run install:all` to ensure dependencies are up to date.
4. Start the app with `npm run dev`, open `http://localhost:4321` or the forwarded Codespaces URL, and confirm the AssetTrack UI loads. 
5. Stop the dev server by pressing <kbd>ctrl</kbd>+<kbd>C</kbd> in the terminal.
6. If you don't have a Copilot CLI session already running, type `copilot` in the terminal to start a new session.
7. Ask for a read-only test inventory:

    ```text
    Inspect this repository's current test setup. Summarize what test frameworks already exist, which services have tests, which services are missing tests, and where a Playwright browser test suite should live. Do not edit files yet.
    ```

8. Review the answer. Copilot should find xUnit tests under `services/assets-svc/Tests/`, a Spring Boot context test under `services/workforce-svc/src/test/`, an intentionally empty `services/reporting-svc/tests/` folder, and no Playwright setup for `services/web`.
9. Ask Copilot to scaffold the Playwright foundation:

    ```text
    Add a minimal Playwright browser test setup for the AssetTrack web UI.

    Requirements:
    - Put the Playwright config at the repository root as playwright.config.ts.
    - Put tests under tests/playwright/.
    - Add npm scripts at the repository root for test:e2e and test:e2e:ui.
    - Use the existing npm run dev command as the Playwright webServer command.
    - Target http://localhost:4321 as the base URL.
    - Use Chromium only for now so the course exercise stays fast.
    - Add or update a `.gitignore` so generated Playwright output (`test-results/` and `playwright-report/`) is not committed.
    - Do not change production application code in this step.
    - After editing, run the install or test command needed to verify the setup. A normal first setup may add @playwright/test and run npx playwright install chromium. In Codespaces, npx playwright install --with-deps chromium may be needed.
    ```

10. Before running the full app, ask Copilot to run `npx playwright test --list` and confirm the tests are discovered.
11. Ask Copilot to add focused accessibility checks for the dashboard landmarks, active navigation state, asset form labels, asset list filters, and keyboard access to the Assets link (reachable by Tab and activated by Enter). Require Playwright role and label locators such as `getByRole` and `getByLabel`; avoid CSS selectors unless there is no accessible alternative (for example, use `getByRole('heading', { level: 1 })` rather than `locator('h1')`). Because these locators resolve elements through the accessibility tree, using them doubles as an accessibility check: if a role or label locator can't find an element, that missing role or label is often the gap itself. Keep the checks focused and standards-correct: links are activated with `Enter`, not `Space`, and a button inside a form already submits, so don't require an explicit `type="submit"`.
12. Run the Playwright suite and ask for evidence in a predictable shape:

    ```text
    Run the Playwright tests and summarize the result. If any tests fail, classify each failure as one of: test bug, app accessibility gap, or environment/startup issue. Include the command run, how many tests were found, the pass/fail count, each failure category, and the next action you recommend. Do not change production code yet.
    ```

13. If the setup is broken, fix only `playwright.config.ts`, `tests/playwright/**`, and package files. If the failure proves a real accessibility gap, switch to the `Accessibility Expert` agent from Module 2 and make the narrowest app fix. The agent applies the path-scoped Astro accessibility instructions you added in Module 2, so the fix follows those rules and WCAG 2.2 AA. If Copilot does not automatically switch to the right agent, run `/agent`, select `Accessibility Expert`, then send the prompt.
14. Review the diff, but don't commit yet — you'll commit and push this foundation in Exercise 3. The local result should be a Playwright foundation, a test result, and maybe a small accessibility fix backed by that result.

When you're done, `npx playwright test --list` discovers the browser tests under `tests/playwright/`, `npm run test:e2e` runs against the configured web server, any production code change is traceable to a failing accessibility test, and generated folders such as `test-results/` and `playwright-report/` are cleaned or ignored before commit.

## Remote control with `/remote`

`/remote` creates a GitHub.com session link for the same Copilot CLI session already running locally or in a codespace. It is good for approving prompts from another tab or device, watching longer validation commands, and keeping a session moving while the original environment stays online. It does not run commands in GitHub Actions or move your work to Copilot cloud agent.

A few things can get in the way: the account or organization may have remote sessions disabled, the current folder may not be a GitHub repository, or the original machine may stop before the command finishes. The `/keep-alive busy` command can help prevent supported environments from idling during longer work; if your CLI version does not support it, keep the codespace or machine active using your instructor's environment guidance.

![A Copilot CLI terminal labeled /remote linked to a laptop showing GitHub.com and a phone showing GitHub Mobile, all driving the same session.](/images/learning-hub/advanced-copilot-cli/03-remote-control-flow.png)

## Exercise 2: Steer the test session with `/remote`

Now let's prove you can control the active Copilot CLI session from GitHub while the Playwright validation runs. No source files are required.

1. In the same Copilot CLI session, enter `/remote on`.
2. Open the GitHub.com link Copilot provides and sign in with the same GitHub account that started the CLI session.
3. Confirm the remote page shows the current prompt history and accepts a new message.
4. From the remote UI, send:

    ```text
    Run the Playwright suite again. If the app needs to start first, use the existing Playwright webServer configuration. Summarize any failures as test bug, app accessibility gap, or environment/startup issue.
    ```

5. Respond to permission prompts from the remote UI.
6. If remote sessions are disabled, record that limitation and continue with the delegation exercise.
7. When finished, enter `/remote off`. You can also enter `/remote` without an argument to check the current status.

When you're done, the remote UI shows the same conversation as the terminal session, a prompt sent from GitHub.com or GitHub Mobile runs in the original CLI session, and the Playwright summary includes the command run, pass/fail count, failure classification, and recommended next action.

## Delegating work with `/delegate`

`/delegate` sends a task to Copilot cloud agent, which works asynchronously on GitHub, creates commits, and opens a pull request. Writing the brief into the repository first means reviewers can see exactly what the agent was asked to do, and the agent can work from a durable artifact instead of relying only on a chat prompt.

A useful delegation task spells out the primary goal, secondary goals, the files and folders in scope, the files and folders out of scope, the commands to run, what to do if production behavior blocks the task, and the expected PR title and description. Before committing or pushing the local foundation, ask Copilot for `git status` and a diff summary — don't delegate from a dirty working tree unless you understand what the cloud agent can and cannot see. When the PR lands, treat the cloud agent like a teammate: review file scope, test evidence, production code changes, skipped tests, and known limitations before merging.

![A laptop with a brief document passing through /delegate to a cloud agent, which opens a pull request that a person reviews.](/images/learning-hub/advanced-copilot-cli/03-delegation-handoff-flow.png)

## Exercise 3: Delegate the test backfill

Finally, let's create a reviewable handoff for Copilot cloud agent and use it to expand the test suite through a draft PR. You'll add `docs/delegations/test-backfill.md`, push a branch such as `test-suite-foundation`, and end with a delegated draft PR adding tests under `tests/playwright/`, `services/assets-svc/Tests/`, and `services/reporting-svc/tests/`.

1. Ask Copilot CLI to create `docs/delegations/test-backfill.md` with a brief for Copilot cloud agent that captures the primary goal:

    - Expand the Playwright accessibility coverage started locally.
    - Keep using role and label locators where possible.
    - Cover dashboard, navigation, asset list filters, and new asset form behaviors.

2. Add the secondary goal to the brief:

    - Add xUnit backfill coverage for `services/assets-svc` covering create, read, update, delete, search, stats-by-status, and not-found edge cases.
    - Add pytest backfill coverage for `services/reporting-svc` covering warranty-expiring reports, utilization reports, and CSV import behavior.

3. Add the constraints to the brief:

    - Do not change production application code.
    - Do not add new backend framework dependencies unless required for the test framework already implied by the service.
    - Prefer isolated test data and temporary SQLite databases.
    - Mock cross-service HTTP calls (for example, reporting-svc's calls to assets-svc) instead of requiring live services.
    - If you add a test-only dependency such as a mocking library, declare it in the service's dependency manifest so the tests run from a clean install.
    - If a real production bug blocks a test, document it in the PR instead of fixing it.
    - Include exact commands and results in the PR description.
    - Follow the Module 2 contribution standard: open an issue using the repository's issue template, link it from the pull request, and use the pull request template.

4. Ask for a read-only checkpoint before any write operations:

    ```text
    Show me the current git status and summarize the files changed for the Playwright setup, accessibility follow-up if any, and delegation brief. Do not commit or push yet.
    ```

5. Clean or ignore generated Playwright artifacts such as `test-results/` and `playwright-report/`.
6. After reviewing the diff, land the work following the Module 2 contribution standard — no direct commits to `main`. Create and push a branch such as `test-suite-foundation`, driving the issue → branch → PR flow with the `make-repo-contribution` skill so the change stays auditable. Use a commit like `test: add Playwright accessibility foundation`, a second commit like `fix: address accessibility gaps found by Playwright` only if a narrow app fix was needed, and `docs: add test backfill delegation brief` for the brief.
7. Confirm `docs/delegations/test-backfill.md` exists on the pushed branch in GitHub before delegating.
8. Use `/delegate` with both the branch reference and a short inline summary:

    ```text
    /delegate Use the pushed test-suite-foundation branch and docs/delegations/test-backfill.md as the source of truth. If the branch context does not include that file, use this brief summary: primary goal, expand Playwright accessibility coverage under tests/playwright using role and label locators for dashboard, navigation, asset list filters, and new asset form behaviors; secondary goal, add xUnit coverage for services/assets-svc covering create, read, update, delete, search, stats-by-status, and not-found edge cases, and add pytest coverage for services/reporting-svc covering warranty-expiring reports, utilization reports, and CSV import behavior. Keep production application code unchanged. If production behavior blocks a test, document the gap in the PR instead of fixing it. Following the repository's contribution standard, open an issue for this backfill and a draft pull request titled "Add test suite backfill" that links the issue and uses the repository's issue and pull request templates, and include the commands you ran plus their results in the PR description.
    ```

9. If `/delegate` is unavailable or blocked by permissions, keep the pushed branch and delegation brief as the handoff artifact.
10. When the draft PR is ready, ask Copilot CLI to summarize changed files, tests added, commands reported by the agent, production code changes, and known limitations.
11. Review the PR. If it uses CSS selectors where role or label locators would work, changes production code without evidence, omits command output, leaves out a required coverage area such as utilization reports or CSV import, skips the linked issue or the repository's pull request template, or ignores the brief, leave a specific revision comment.
12. After the delegated PR adds the backfill, run or verify the relevant commands:

    ```bash
    npm run test:e2e
    dotnet test services/assets-svc/Tests/AssetsService.Tests.csproj
    cd services/reporting-svc && pytest
    ```

When you're done, the pushed branch contains the local Playwright foundation and `docs/delegations/test-backfill.md`, the delegated PR references the brief, links an issue, and includes exact command output, the new tests live under `tests/playwright/`, `services/assets-svc/Tests/`, and `services/reporting-svc/tests/`, and production code is unchanged unless the PR clearly explains why a test-backed fix was necessary.

## Summary

You should now have:

- A Playwright foundation for the AssetTrack UI.
- A validation result for the Module 2 accessibility work.
- Any narrow accessibility fix that was justified by a failing browser test.
- A delegation brief at `docs/delegations/test-backfill.md`.
- A pushed handoff branch and, when `/delegate` is available, a draft PR from Copilot cloud agent expanding the test suite.
- A clearer sense of when to keep Copilot CLI work local, steer it remotely, or delegate it to cloud agent.

Next, you'll use the test commands created here to shape Copilot CLI's lifecycle with hooks so tests, builds, and lint checks run automatically as Copilot edits the project in [Module 4][next-lesson].

## Resources

- [Steer a Copilot CLI session remotely][remote-docs]
- [Delegate tasks to Copilot cloud agent][delegate-docs]
- [About Copilot cloud agent][cloud-agent]
- [Playwright getting started][playwright]
- [Playwright locators][playwright-locators]
- [Accessible name and description computation][accessible-name]

---

| [← Previous: Building an AI infrastructure foundation][previous-lesson] | [Next: Shaping Copilot CLI's lifecycle with hooks →][next-lesson] |
|:--|--:|

[previous-lesson]: ../02-building-ai-infrastructure/
[next-lesson]: ../04-lifecycle-hooks/
[m02]: ../02-building-ai-infrastructure/
[prerequisites]: ../00-prerequisites/
[contoso-inventory]: https://github.com/github-samples/contoso-inventory
[remote-docs]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/steer-remotely
[delegate-docs]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/delegate-tasks-to-cca
[cloud-agent]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-cloud-agent
[playwright]: https://playwright.dev/docs/intro
[playwright-locators]: https://playwright.dev/docs/locators
[accessible-name]: https://www.w3.org/TR/accname-1.2/
