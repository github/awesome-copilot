---
title: '07 · Automations'
description: 'Create and schedule a read-only pull request report, then explore event and cloud options.'
authors:
  - GitHub, Inc.
  - Dan Wahlin
lastUpdated: 2026-10-04
tags:
  - workshop
  - copilot-app
  - desktop
---

![Chapter 07: Automations](/images/learning-hub/copilot-app-for-beginners/07/chapter-header.svg)

> **What if a prompt you run every morning could run itself?**

Chapter 06 made session work visible with canvases. This chapter makes repeatable work reusable.

Automations let you save agent tasks in the GitHub Copilot app and run them on demand or later on a schedule. You'll start with a manual review readiness report that runs only when you choose, then schedule it so the summary is waiting each morning. The chapter closes with an optional section on event triggers and cloud automations.

## Learning Objectives

By the end of this chapter, you'll be able to:

- Explain when to automate recurring agent work instead of starting a manual session
- Create and test an on-demand local automation
- Schedule an automation and review its run history
- Optionally recognize event triggers, such as **Issue** and **Pull request**, and when they are appropriate
- Optionally explain what cloud automations need and how to limit their tools

> ⏱️ **Estimated Time**: ~50 minutes

---

## Prerequisites

Complete [Chapter 06](/learning-hub/app-for-beginners/06-canvases/) and the preceding chapters. You'll reuse the **Pull requests** view from Chapter 03 and the tool-access principles from Chapters 04 and 05. You don't need to keep a canvas open or an MCP server or plugin enabled for this chapter.

If you skipped the setup script earlier, [run it now](/learning-hub/app-for-beginners/00-setup/#seed-the-repository) before the first automation exercise. The review readiness report needs open pull requests to inspect.

---

## From the Studio: Programming the Sequencer

A producer does not replay the same drum pattern by hand every night. They program it into a sequencer once and let it run when needed:

![Sequencer analogy for automations](/images/learning-hub/copilot-app-for-beginners/07/sequencer-automation.webp)

| Sequencer | App automation |
|---|---|
| Programmed pattern | Saved prompt |
| Hit play | Manual trigger |
| Run on the clock | Schedule |
| Chosen instruments | Selected tools |
| Producer checks the mix | Human reviews the result |

Start with a manual automation so you can test the prompt safely before giving it a schedule or trigger.

## Core Concepts

### Automation Is a Saved Agent Run

An automation has four beginner-friendly parts:

| Part | Question |
|---|---|
| Trigger | What starts it? |
| Prompt | What should the agent do? |
| Tools | What is the least access needed? |
| Review path | Where do I inspect the result? |

![Automation trigger to agent run](/images/learning-hub/copilot-app-for-beginners/07/automation-trigger-to-run.webp)

### Start Manual and Local

A manual automation runs only when you start it. Keep it local while you test it. A manual, local automation is the safest first step because you can:

- test the prompt
- inspect output
- adjust scope
- avoid surprise runs
- confirm tools are minimal

![Start manual, then expand automations](/images/learning-hub/copilot-app-for-beginners/07/manual-first-path.webp)

Add a schedule, an event trigger, or cloud execution only after the manual prompt gives trustworthy results.

### A Good Starter Automation

Pick work you already do more than once:

- "Which pull requests are blocked, and what do they need next?"
- "What validation steps should I run before opening a PR?"

Avoid first automations that write code, post comments, change labels, approve reviews, or merge pull requests.

> [!TIP]
> Automations are saved in the app, not committed with the repository. Treat the prompt like production instructions: keep secrets out of it, and give the automation only the tools it needs.

> [!WARNING]
> Issue titles and bodies can contain untrusted text. A read-only summary is safer than an automation that posts comments or edits the repository. That reduces **prompt-injection** risk, where hostile text tries to steer the agent.

---

## Hands-On Exercises

In these exercises, you'll:

- Create a manual review readiness report automation
- Run it and inspect its history
- Schedule that automation so it runs daily without a manual trigger

### Confirm Work Items Exist

Before creating the automation, confirm work items exist. Select **Pull requests** in the sidebar, then select your fork in the repository picker.

On the **Authored by me** tab, you should see at least three open pull requests from the Chapter 00 setup script. If you completed Chapter 03, the review comment and the failing check may already be fixed, and your search-fix pull request also appears. That is expected; the report shows whatever state your pull requests are in now. If the list is empty, [run the script now](/learning-hub/app-for-beginners/00-setup/#seed-the-repository) before continuing.

### Exercise: Create a Manual Review Readiness Report

This automation answers a real daily question: which pull requests are ready to merge, and what's blocking the ones that aren't?

The **Pull requests** view already lists your open pull requests, but it doesn't synthesize merge-readiness across them. A review readiness report adds that analysis: CI status, unresolved comments, and what each PR needs next.

To create an automation:

1. Open **Automations** in the sidebar.
1. Select **New automation**.
1. Provide a name for the automation: `PR review readiness report`
1. Change the **Trigger** from **Daily** to **Manual**.
1. Make sure **Run in the cloud** is off, so the automation runs locally.
1. Paste the prompt below:

   ```text
   For each open pull request in this repository, report:
   - PR number, title, and branch
   - CI check status (passing, failing, or pending) and the name of any failing check
   - Whether there are unresolved review comments, and a one-line summary of each
   - Whether the branch is up to date with the default branch
   - The single next human action needed to move it toward merge

   Present the results as a table. Do not edit files, add comments, change labels, approve reviews, or merge anything.
   ```

1. Below the prompt, use **Select project** to choose your `copilot-app-for-beginners` project. The prompt says "this repository", so the automation must target your fork.
1. In the **Workspace** picker that appears next to the project, select **Current checkout**. This report only reads data, so each run doesn't need its own new worktree.
1. Select the arrow next to **Create**, then select **Create and run**.

   ![New automation form with the Manual trigger, Run in the cloud off, the course project, Current checkout, and the Create and run option open](/images/learning-hub/copilot-app-for-beginners/07/app-new-automation.webp)

   **Expected Output:** Your automation should appear under **Your automations** with the **Manual** trigger. The run should start immediately and appear under **Recent runs**.

1. Wait for the run to complete. The status should change to a success indicator.

1. Open the run detail and confirm:
   - The **prompt** matches what you pasted above.
   - No **error text** appears. If the result is empty, check that the Chapter 00 setup script created practice pull requests.
   - The **result** includes a table of open pull requests with CI status, comment status, and the next action for each. A representative result from the seeded PRs looks like:

   | PR | CI | Comments | Next action |
   |---|---|---|---|
   | #6 Improve empty-state copy | ✅ Pass | ⚠️ 1 unresolved; reviewer asks for more helpful guidance | Address the review comment |
   | #7 Failing stats check practice | ❌ Fail: Book app web | None | Fix the favorite count in `ReadingStats.tsx` |
   | #8 Reading dashboard merge-readiness practice | ✅ Pass | None | Ready to merge |

Your PR numbers, titles, and statuses may differ. The key is that each row includes CI status, comment status, and a concrete next action. If the table is empty, confirm the Chapter 00 setup script created practice pull requests, then check repository permissions.

**How It Works:** The automation saves the prompt and trigger so you can run the same bounded task again later. Because the prompt is read-only, the risk stays low while you learn the review loop. Unlike the **Pull requests** view, which lists open items, this report explains why a PR is blocked, not only that it exists.

---

### Exercise: Schedule the Review Readiness Report

The manual report worked. Now make it run every morning so the summary is waiting when you start your day.

> [!NOTE]
> This automation is local. A scheduled local run happens only when your computer is awake and the GitHub Copilot app is running. If your computer is asleep at the scheduled time, the run does not happen.

1. Open **Automations** in the sidebar and find your `PR review readiness report`.
1. Select the automation, then select **Edit**.
1. Change the **Trigger** from **Manual** to **Daily**.
1. Set **Hours** to a time before your workday starts, for example **08:00**, and keep **Minute** at **:00**.

   Before you save, narrow the scope so the scheduled report stays useful:

      - Confirm that the project picker still shows your `copilot-app-for-beginners` project, so the automation targets only your fork.
      - If the prompt is noisy after a few runs, add a label or branch filter to reduce the output.

1. Select **Save automation**.

   After saving:

   - Check the automation card. It should show the **Daily** trigger.
   - Open the automation and select its name at the top. **Automation details** shows the **Schedule** and the **Next run** time.
   - The next morning, check **Recent runs** and confirm a new run completed.
   - If the summary is too long or noisy, tighten the prompt. For example, limit it to PRs with failing checks, then save again.

**Expected Output:** The automation card shows the **Daily** trigger, and **Automation details** shows when the next run happens. If the app was running at the scheduled time, the new run appears under **Recent runs** without you selecting **Run**. If the result is noisy, you know where to narrow the prompt.

### Why Schedule Instead of Running Manually?

A manual automation answers "What's the status right now?" A scheduled automation answers "What changed since yesterday?" without requiring you to remember to ask.

> [!TIP]
> The app also supports **Hourly**, **Weekly**, and **CRON** schedules. CRON gives you the most control. The app validates the expression and shows a human-readable preview before you save.

---

<details>
<summary>Optional: Event triggers and cloud automations</summary>

## Event Triggers

Schedules run on the clock. Event triggers run in response to something happening in the repository.

The current Trigger menu includes these event triggers:

| Trigger | Fires when... | Example use |
|---|---|---|
| **Issue** | A matching issue event occurs | Summarize issue activity for triage |
| **Automation completed** | An automation that you name under **Upstream Automations** completes | Start a follow-up report after a triage run |
| **Discussion comment** | A comment is added to a discussion | Summarize new discussion feedback |
| **Discussion opened** | A discussion is opened | Prepare a short discussion summary |
| **Discussion updated** | A discussion is updated | Report what changed in a discussion |
| **Pull request** | A matching pull request event occurs | Summarize changes for a reviewer |
| **Sub issue added** | A sub-issue is added | Report changes to an issue breakdown |
| **Workflow** | A GitHub Actions workflow that you name completes (for example, it fails) | Summarize why a CI run failed |

Choose the trigger that matches the event you want the automation to handle. Schedule choices such as **Hourly**, **Daily**, **Weekly**, and **CRON** appear in the same menu.

<img src="/images/learning-hub/copilot-app-for-beginners/07/app-automation-new-triggers.webp" alt="Automation trigger options in the new-automation form" width="800" />

### Keeping Event Triggers Safe

Event-triggered automations deserve extra caution because they react to external input:

1. **Start read-only.** A summary is safer than an automation that posts comments or edits the repository.
2. **Limit repository scope.** Target one repository, not every repository you can access.
3. **Filter by label or search query.** Narrow the issue or PR trigger so the automation does not fire on every new item.
4. **Avoid write tools until the summary is reliable.** A broad trigger paired with write tools increases prompt-injection risk. Review several runs before enabling tools that push changes or add comments.
5. **Review run history regularly.** Check that the automation is firing at the expected frequency and producing useful output.

## Cloud Automations

Every automation you've created so far is **local**: it runs from your machine while the app is open. A **cloud automation** runs on GitHub-hosted infrastructure, so it can fire even when your laptop is closed.

![Local versus cloud automations](/images/learning-hub/copilot-app-for-beginners/07/local-vs-cloud-automations.webp)

### When to Consider Cloud

Move an automation to the cloud only after the local version works reliably and you understand the permission model. Cloud is a good fit when:

- The automation needs to run overnight or on weekends.
- Multiple team members should see the same run history.
- The trigger is an event (issue created, PR opened) that can happen at any time.

Cloud automations have requirements that you may not control:

- **Copilot cloud agent** must be enabled for the repository, and the organization must allow automations.
- **Repository visibility**: the repository must be private or internal. Cloud automations are not available in public repositories. A fork of this public course repository is public, so read this section without creating a cloud automation.
- **Billing**: each cloud run starts a Copilot cloud agent session that uses GitHub Actions minutes and AI credits. This usage is billed to the person who created the automation. Check your plan before you enable a high-frequency schedule.

When you enable **Run in the cloud**, a **Tools** dropdown appears. It starts with **All tools selected**. Each tool grants the cloud agent a specific capability, such as pushing changes, updating labels, or creating a pull request. Built-in tools are always available.

<img src="/images/learning-hub/copilot-app-for-beginners/07/app-automation-cloud-tools.webp" alt="Cloud automation Tools selector with Read PR, List PRs, and Search PRs selected, showing 3 tools selected while write tools such as Create PR are cleared" width="800" />

Select only the tools the task requires. The list starts with every tool selected, so clear each tool you don't need. The screenshot shows the pull request readiness report with three read-only pull request tools selected (**Read PR**, **List PRs**, and **Search PRs**) and every write tool cleared. For CI status, the report may also need a read-only **Actions** tool, such as **List workflows**. You can add tools later, after the output proves trustworthy.

</details>

---

## Troubleshooting

If something does not work as expected, check the problems below. The [Troubleshooting Reference](https://github.com/github/copilot-app-for-beginners/blob/main/appendices/troubleshooting-reference.md) lists problems and fixes for all chapters.

<details>
<summary>Automation problems</summary>

### A local automation does not run

A local run happens only when your computer is awake and the GitHub Copilot app is running. Also confirm that the project is still connected and that the local tools and credentials that the prompt needs still work.

### The review readiness report is empty

Confirm that the setup script finished and that your fork has open pull requests. See [Confirm Work Items Exist](#confirm-work-items-exist). Then check your repository permissions and any filters in the prompt.

### Cloud automations are unavailable

Cloud automations are not available in public repositories, and a fork of this course is public. In a private or internal repository, check the organization policy, repository settings, billing, and the tools that you selected. See [Cloud Automations](#cloud-automations).

### A scheduled run is noisy

Narrow the prompt, run the schedule less often, or add a label or branch filter to reduce the output.

### The automation made surprising suggestions

Make the prompt more specific, and list what the automation must not do. For a cloud automation, also clear the tools that the task does not need.

</details>

---

## Key Takeaways

1. Every automation needs a trigger, prompt, tool set, and review path.
2. Manual automations are the safest first step. Test the prompt before adding a schedule.
3. A read-only review readiness report is a strong first automation because it adds analysis that the **Pull requests** view alone does not provide.
4. Scheduled automations answer "what changed since yesterday?" without requiring you to remember to ask.
5. Event triggers and cloud automations come later. Start read-only, filter narrowly, and check policy, billing, and permissions.
6. Apply least privilege: give an automation only the tools it needs, so untrusted issue or PR text is less able to steer the agent.

---

## Assignment

![Assignment](/images/learning-hub/copilot-app-for-beginners/overview/assignment.webp)

Create one manual automation for your own workflow:

1. Name it clearly.
2. Use a manual trigger.
3. Write a prompt with one bounded task.
4. Keep it read-only. In the prompt, tell it not to edit files, post comments, or change GitHub items. Local automations have no tool list. If you later move the automation to the cloud, select only read-only tools in its **Tools** list.
5. Run it once.
6. Inspect the run history and revise the prompt.

**Success Criteria:** You're able to explain why the automation is safe to run again.

---

## Course Complete

That automation was your last exercise. Here's a look back at everything you practiced across Chapters 00 through 07.

You've gone from setup and orientation through sessions, worktrees, and context; the development-and-GitHub workflow loop; skills and custom agents; MCP servers and plugins; canvases; and automations. Along the way, one habit stayed constant: keeping a human in control of quality and delivery.

| Area | What you practiced |
|---|---|
| Sessions and worktrees | Work in scoped branches and isolated worktrees |
| Context | Use prompts, files, issues, and instructions intentionally |
| Development and GitHub | Plan, change, and validate with tests, builds, browser previews, and diffs, then move work through issues, PRs, review comments, and failing checks |
| Instructions and roles | Repository instructions, reusable skills, and read-only custom agents |
| Connected tools and packages | MCP servers for documentation and plugins that supply capabilities |
| Visibility | Canvases for shared, inspectable state |
| Repetition | Manual and scheduled automations, used safely |

That last habit is the whole point: human judgment stays in the loop at every major control point, before implementation starts, before a pull request is opened, and before any merge automation is enabled. Practice on small, real issues first, then add advanced workflows as the work stays independent, validated, and reviewable.

**[← Back to Chapter 06](/learning-hub/app-for-beginners/06-canvases/)** | **[Return to Course Home →](/learning-hub/app-for-beginners/)**

---

## Source References

- [Using automations in the GitHub Copilot app](https://docs.github.com/en/copilot/how-tos/github-copilot-app/using-automations)
- [About automations in the GitHub Copilot app](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-automations)
- [GitHub Copilot app generally available](https://github.blog/changelog/2026-06-17-github-copilot-app-generally-available/)
- [GitHub Copilot app product blog](https://github.blog/news-insights/product-news/github-copilot-app-the-agent-native-desktop-experience/)
