---
title: "Exercise 5 - Monitoring and managing agents"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

When you put GitHub Copilot in agent mode, it works autonomously — exploring your codebase, proposing changes, editing files, and running commands. Because that work is happening on your machine in real time, Copilot Chat in VS Code gives you a running view of every tool call and every file edit as it happens. You can review each diff inline, accept or reject individual changes, and steer the conversation with follow-up prompts to refine or extend the work without leaving your editor.

In this exercise, you will:

- monitor the accessibility agent's work in real time.
- review and accept the proposed file edits.
- steer the agent mid-session to add a light-mode toggle alongside high-contrast.

## Scenario

The accessibility custom agent you used in [Exercise 4][previous-lesson] is implementing high-contrast mode. While the work is in progress, the design team has come back with an additional request — they'd also like a light-mode toggle for users who find the default theme too dark. Rather than start a new conversation from scratch, you'll steer the existing session to extend the work.

## Monitor Copilot's progress

The Copilot Chat view shows each step the agent takes — files it explores, commands it runs, and edits it proposes. Each file edit appears inline in the chat with a diff and **Keep** / **Undo** controls.

1. Return to the Copilot Chat view from Exercise 4.
2. As the agent works, scroll the chat to watch each tool call land. You'll see file reads, file edits, and any terminal commands it asks to run.
3. When the agent proposes a file edit, the diff appears inline:
    - Select **Keep** to accept the change.
    - Select **Undo** to revert the change and let the agent take another pass.
4. You can also open the **Files changed** indicator at the top of the chat to see the full working set the agent has modified during this session.

> [!NOTE]
> If a tool call asks for permission (for example, running a terminal command), the agent will pause and surface an **Allow** prompt. Approve only the commands you're comfortable with.

5. Wait for the agent to finish implementing high-contrast mode. You should see a final message summarizing the changes it made.

## Steer the agent to add light mode

Now that high-contrast mode is in place, you'll extend the same conversation to add a light-mode toggle. Because you're continuing the same chat session, the agent retains all the context from its previous work — including the components it touched, the styling approach it used, and the local-storage pattern it set up.

1. In the Copilot Chat input, send the following follow-up prompt:

    ```
    Nice work! Now add a light-mode toggle alongside the high-contrast toggle. Light mode should follow the same pattern — persist via local storage and be accessible from the same area of the UI. The user should be able to enable high-contrast and light mode independently.
    ```

2. The agent will pick up where it left off, exploring the changes it already made and proposing additions for light mode.
3. Review each new edit as it lands, just like you did for high-contrast. Use **Keep** or **Undo** on each diff.
4. If the agent goes in a direction you don't want — for example, it tries to refactor the toggle UI in a way you don't like — you can stop it with the **Stop** button next to the chat input, then send a clarifying follow-up message.

> [!TIP]
> Steering an in-flight session is faster than starting over. Use follow-up prompts to ask for adjustments ("simplify the CSS — use CSS variables instead of duplicating selectors"), to course-correct ("don't add a third toggle, integrate light mode into the existing settings panel"), or to extend scope ("also add keyboard shortcuts for both toggles").

## Review the working set

Before committing the work, take a quick pass over everything the agent touched.

1. Open the **Source Control** view in VS Code.
2. Review the full list of changed files. You should see updates to the Astro components, styles, and any related tests.
3. Open a couple of the changed files and walk through the diffs. Confirm the accessibility patterns from the custom agent are reflected — ARIA attributes, keyboard navigation, semantic HTML, and persistence via local storage.
4. When you're satisfied, stage and commit the changes from the Source Control panel. You'll publish them in [the next lesson][next-lesson].

## Summary and next steps

You used Copilot Chat agent mode to monitor and steer an in-flight session — reviewing each file edit as it landed, accepting or rejecting changes, and sending follow-up prompts to extend the work without losing context.

In this lesson you explored:

- monitoring an agent's work in real time.
- accepting and rejecting individual file edits.
- steering a session mid-flight with follow-up prompts.

In the [next lesson][next-lesson] you'll publish your accessibility work as a pull request and review the changes the local custom agent has produced throughout this lab.

## Resources

- [Copilot Chat in VS Code][copilot-chat-vscode]
- [Using agent mode][agent-mode]

---

| [← Previous lesson: Custom agents][previous-lesson] | [Next lesson: Iterating on Copilot's work →][next-lesson] |
|:--|--:|

[previous-lesson]: /learning-hub/copilot-workshops/vscode/4-custom-agents/
[next-lesson]: /learning-hub/copilot-workshops/vscode/6-iterating/
[copilot-chat-vscode]: https://code.visualstudio.com/docs/copilot/chat/copilot-chat
[agent-mode]: https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode
