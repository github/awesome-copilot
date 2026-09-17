---
title: "Exercise 3 - Adding project features with GitHub Copilot CLI"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

As you might expect, the core tasks you'll perform with GitHub Copilot CLI is to add features, functionality, and code to a project. Let's take one of the issues from your backlog and ask Copilot to help us implement it.

## Scenario

The time has come to complete filtering in the project. You already have the filtering issue in your backlog and a foundation helper from the previous exercise. Let's have Copilot retrieve the issue details, account for existing work, and build the remaining functionality.

In this exercise, you will:

- utilize plan mode to generate a plan for implementing the filtering functionality.
- generate the code necessary to add filtering to the website with Copilot.

By the end of this exercise, you will have added new functionality to the project.

## Utilize plan mode

One of the best uses of AI is planning. Oftentimes you'll have a good concept of what you want to build, but just need to bounce some ideas off of something. AI tools can help you crystalize your thoughts by asking you follow up questions and working through different pitfalls or missing components. To support this process, Copilot CLI offers a plan mode. Additionally, that time you spend planning will help Copilot generate code that best matches the requirements set forth.

You'll start the process of creating the new functionality by utilizing plan mode in Copilot CLI.

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Return to your open Copilot CLI session. If the terminal is closed or you exited Copilot CLI, open a terminal by selecting <kbd>Ctrl</kbd>+<kbd>\`</kbd>, then start it from the repository root by running `copilot --yolo --enable-all-github-mcp-tools`. Trust the project folder if prompted, then run `/models` and select **Auto**.
3. Enter the following prompt into Copilot CLI to create a plan based on the filtering issue:

    ```
    /plan Retrieve the issue on the repository related to adding filtering. We already added a publishers helper in src/lib/publishers.ts, so treat that as existing work and plan the remaining updates (games filtering logic, UI, and tests).
    ```

4. Copilot may ask follow-up questions as it builds out its plan. As those arise, answer them based on how you'd build out the functionality.
5. Once the plan is generated, review the blueprint. You should notice it recommends remaining changes across the data layer and UI, as well as generating tests.
6. Copilot CLI will offer you the ability to provide additional feedback to the plan. You can cursor down to the indicated section, then type your suggestions. Copilot will incorporate your suggestions into a new version of the plan.
7. Once you're satisfied, select the option provided by Copilot to begin work building the new feature!

> [!NOTE]
> Because Copilot is probabilistic, the exact text and options provided will vary. But you will notice an option to begin building that will read something similar to:
>
> `Yes, and switch to autopilot mode`.
>
> Copilot may offer you the option to enable [autopilot mode](https://docs.github.com/copilot/concepts/agents/copilot-cli/autopilot), as shown in the example above. Autopilot mode allows Copilot CLI to work through a task without waiting for your input after each step. Once you give the initial instruction, Copilot CLI works through each step autonomously until it determines the task is complete. As we are running in a contained environment, we're OK running autopilot and allowing all tools.

8. Copilot will get to work generating the files!

> [!NOTE]
> This operation will likely take several minutes. You will see Copilot edit and create files, update and generate tests, and run all of the tests to ensure everything succeeds. Now's a good time to reflect on what you've explored thus far, or to enjoy a beverage.

## Review the code

All AI code needs to be reviewed before being merged into production. Let's take the time now to explore the files Copilot created and modified in implementing the new feature.

1. Use Copilot CLI to display the "diff" or code changes by using the following command in Copilot CLI:

    ```
    /diff
    ```

2. Note the files changed. Use your arrow keys to switch left and right to view the different files. You should see updates to files such as the games listing page (where the new filter controls and client-side filtering live) and `src/lib/games.ts`, plus tests like `games.test.ts`. You may also see updates to `publishers.ts` if Copilot refines your existing helper to align with the full implementation.

## Summary and next steps

You've now added filtering functionality to the website with the help of Copilot CLI! Specifically, you:

- utilized plan mode to generate a plan for implementing the filtering functionality.
- generated the code necessary to add filtering to the website with Copilot.

Of course, the next step from here is to make sure it works. Let's [test your feature with the Playwright MCP server][next-lesson] before we open a pull request.

## Resources

- [Using Copilot CLI][using-copilot-cli]
- [About Copilot CLI][about-copilot-cli]
- [Context management in Copilot CLI][context-management]

[previous-lesson]: /learning-hub/copilot-workshops/cli/2-custom-instructions/
[next-lesson]: /learning-hub/copilot-workshops/cli/4-mcp/
[using-copilot-cli]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli
[about-copilot-cli]: https://docs.github.com/copilot/concepts/agents/about-copilot-cli
[context-management]: https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli#context-management
