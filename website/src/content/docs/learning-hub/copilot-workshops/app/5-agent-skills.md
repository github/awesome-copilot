---
title: "Lesson 5 - Customize and use a quality-checks skill"
description: "Explore the existing quality-checks skill, customize its report format, and use it to validate filtering."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

There's more to writing code that just writing code. We've been able to validate the code works manually, and used instructions files to ensure it follows our standards. But how about testing? Linting? All the other parts of continuous integration (CI)?

For these types of tasks, **agent skills** are the best fit! Skills help Copilot understand how to properly run operations like these.

In this lesson, you will:

- explore the existing `quality-checks` skill.
- customize the format of its results.
- run the skill and review its output.

## Scenario

Tailspin Toys uses the `quality-checks` skill for unit tests, lint, and type checks. The team wants to improve the report to make the results easier to read.

## Instructions, scripts, and resources

Agent skills package reusable task instructions, executable scripts, and supporting resources that an agent loads on demand. At their core, they're a folder with the name of the skill, with a markdown file named `SKILL.md`. The markdown contains frontmatter with a name and description to define what the skill is, an overview of what it does, and guidance on when it should be called. The folder can also contain subfolders which contain scripts and other resources for the skill to use when called.

> [!NOTE]
> Additional folders and files are not required for a skill! In our example, our skill will be running `npm` commands to run our tests and linters. As a result, we don't need additional supporting files.

Skills can reside in a projects `.github/skills` folder to become a repository asset to be shared and reused by the rest of the team, or in the root folder for Copilot, typically `~/.copilot/skills`.

## Explore the skill

Let's explore the skill the Tailspin Toys team created for running unit tests, lint, and type checks, named `quality-checks`.

1. If you don't already have a **Files** canvas open, in the review panel, select **+**, then **File**
2. Search for `.github/skills/quality-checks/SKILL.md`.
3. Read the `name` and `description` at the top. Note the description, which helps Copilot understand when to call the skill.
4. Read the instructions and note how it guides Copilot through the testing and linting process.

## Run the skill before making a change

Skills are callable directly via a slash (`/`) command, or by using natural language to call the skill. Let's ask Copilot to run the skill's three checks.

1. Ensure Copilot is in **Interactive** mode by selecting it from the mode dropdown.
2. Use the following prompt to call the skill:

    ```plaintext
    Run the quality-checks skill for unit tests, lint, and type checks.
    ```

3. Note the report at the end.

## Customize the report

OK, we'd like a better report that tells us what ran, whether it succeeded, and what the tools actually reported. Let's update our skill to create that report!

1. Return to the **Files** canvas.
2. If not already open, open `.github/skills/quality-checks/SKILL.md`.
3. Add the following section to the end of the file:

    ```markdown
    ## Results output formatting

    Upon completion, report each command that ran and whether it passed, failed, or was blocked. Include test counts, durations, errors, warnings, and other metrics only when the tool reports them. Identify the next action for any failure or blocker, and never describe a skipped or incomplete check as passed.
    ```

The file will automatically be saved.

## Run the updated skill

With our change made, let's see it in action! We'll use the exact same prompt as before.

1. Ensure Copilot is in **Interactive** mode by selecting it from the mode dropdown.
2. Use the following prompt to call the skill:

    ```plaintext
    Run the quality-checks skill for unit tests, lint, and type checks.
    ```

3. Note the report at the end.

## Summary and next steps

You've customized and used an existing agent skill. In this lesson, you:

- explored the `quality-checks` skill for unit tests, lint, and type checks.
- customized the format of its results.
- ran the skill and reviewed its output.

That change will accompany filtering in the feature PR. Next, you'll allow Copilot to interact with the site directly [via the Playwright MCP server][next-lesson].

## More skill examples

These community examples are references, not additional tasks. Review their prerequisites and behavior before adopting them:

- [Agent Skills specification][skill-spec].
- [Contribution workflow: `make-repo-contribution`][contribution-example].
- [Requirements documents: `prd`][prd-example].
- [Diagrams and a bundled export script: `drawio`][drawio-example].
- [Browser testing: `webapp-testing`][browser-example].

The upstream contribution example is named `make-repo-contribution`; older Tailspin templates used a different name, `make-contribution`. This workshop does not depend on either contribution skill.

[next-lesson]: /learning-hub/copilot-workshops/app/6-mcp-playwright/
[skill-spec]: https://agentskills.io/specification
[contribution-example]: https://github.com/github/awesome-copilot/tree/main/skills/make-repo-contribution
[prd-example]: https://github.com/github/awesome-copilot/tree/main/skills/prd
[drawio-example]: https://github.com/github/awesome-copilot/tree/main/skills/drawio
[browser-example]: https://github.com/github/awesome-copilot/tree/main/skills/webapp-testing
