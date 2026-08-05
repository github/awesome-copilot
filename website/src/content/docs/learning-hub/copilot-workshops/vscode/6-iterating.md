---
title: "Exercise 6 - Iterating on GitHub Copilot's work"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

| [← Previous lesson: Monitoring and managing agents][previous-lesson] |
|:--|

## Reviewing the work

Throughout this lab you've worked with GitHub Copilot on several tasks focused on improving the user experience. You used agent mode to add filtering across the client and server, the Playwright MCP server to manually test that work in a browser, then a custom agent to implement accessibility features — high-contrast and light-mode toggles — and steered the session mid-flight to extend the work. Now it's time to publish that local work and review it the same way your team would.

### Scenario

The fundamentals of software design and DevOps don't change with the addition of generative AI. You still want a real review cycle on anything Copilot produces. With that in mind, let's push the accessibility changes from your codespace, open a pull request, and walk through the diff before bringing the rest of the team in.
## Publish the accessibility features

The high-contrast and light-mode toggles you implemented with the accessibility custom agent in [Exercise 4][exercise-4] and [Exercise 5][exercise-5] are sitting in your codespace as committed changes. Let's push them to a branch and open a pull request so the rest of your team can review.

1. Return to your codespace.
2. Open the **Source Control** view in VS Code.
3. Confirm your accessibility changes are committed. If you have uncommitted changes from Exercise 5, stage and commit them now with a descriptive message such as `Add high-contrast and light-mode toggles`.
4. Publish the branch by selecting **Publish Branch** (or use the **...** menu → **Push**).
5. VS Code will offer to open the new branch on github.com. Accept the prompt, or navigate to your repository manually and select **Compare & pull request** on the branch banner.
6. Set a clear title (for example, `Add high-contrast and light-mode toggles`) and a short description summarizing what was done and why.
7. Select **Create pull request**.
8. Once the PR is open, select the **Files changed** tab to review your work end-to-end. Pay particular attention to:
   - The toggle UI components for switching between modes.
   - The use of local storage to persist user preferences.
   - The CSS or styling changes for high-contrast and light modes.
   - The accessibility attributes (ARIA labels, keyboard navigation, etc.).
   - Any JavaScript/TypeScript code that manages the mode switching.

9. Return to the **Conversation** tab.
10. If workflows are waiting for approval, select **Approve and run workflows**.

    ![Approve and run workflows](/images/learning-hub/copilot-workshops/shared-approve-workflows.png)
11. Wait for the workflows to complete. All being well, you should see them pass.

> [!TIP]
> Want a second opinion on your accessibility work? Tag `@copilot` in a PR comment with a request such as "review this PR for additional WCAG issues" or "suggest improvements to the keyboard navigation". Copilot will start a new session to address the comment.

## Optional exercise - keep exploring locally

Working iteratively with an agent in the IDE is a skill, and the only way to build it is repetition. Some ideas for follow-up sessions you can run from VS Code:

- Add a backer interest form on the game details page.
- Implement pagination on the game list page.
- Add input validation and error handling to the data-access helpers in `src/lib/`.
- Extend the accessibility agent's scope — for example, audit keyboard focus order across the whole site.

## Summary

Congratulations — you've completed the VS Code harness! Through this lab you:

- **Used Playwright MCP to manually test your feature.** You added the Playwright MCP server and let Copilot drive a browser to verify your filtering feature before opening a pull request.
- **Drove agent mode through coordinated changes across the stack.** You added a filter feature that touched the client, the server, and the tests in a single session.
- **Used a custom agent.** You selected the accessibility-focused custom agent from the agent picker and watched it implement high-contrast mode against the repository.
- **Managed and steered an agent session.** You reviewed proposed changes inline, accepted what you wanted, and extended the session with a light-mode follow-up.
- **Closed the loop with a pull request.** You published your local work and reviewed it end-to-end the way your team would.

## Review and next steps

If you'd like to expand your perspective on Copilot's agent capabilities, the other harnesses cover related scenarios through different surfaces:

- 💻 **[CLI harness](/learning-hub/copilot-workshops/cli/)** — work similar flows from your terminal with Copilot CLI: plan mode, agent skills, custom agents, and slash commands like `/share`, `/context`, and `/delegate`.
- ☁️ **[Cloud agent harness](/learning-hub/copilot-workshops/cloud/)** — focus on assigning issues to cloud agent, monitoring sessions through the agents page, and iterating asynchronously on pull requests.

You can also keep building on what you started here. [awesome-copilot][awesome-copilot] is a great source for more instruction files, custom agents, and skills you can adapt to your own projects.

## Resources

- [GitHub Copilot][github-copilot]
- [Copilot Chat in VS Code][copilot-chat-vscode]
- [Using agent mode][agent-mode]

---

| [← Previous lesson: Managing agents][previous-lesson] |
|:--|

[previous-lesson]: /learning-hub/copilot-workshops/vscode/5-managing-agents/
[exercise-4]: /learning-hub/copilot-workshops/vscode/4-custom-agents/
[exercise-5]: /learning-hub/copilot-workshops/vscode/5-managing-agents/
[github-copilot]: https://github.com/features/copilot
[copilot-chat-vscode]: https://code.visualstudio.com/docs/copilot/chat/copilot-chat
[agent-mode]: https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode
[awesome-copilot]: https://github.com/github/awesome-copilot
