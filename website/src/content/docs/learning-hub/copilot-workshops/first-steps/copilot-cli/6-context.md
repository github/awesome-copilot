---
title: "Lesson 6 - Know what the agent can see"
description: "Use /context to inspect what fills the context window, and /clear to start fresh when a conversation drifts."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Terminal commands make context visible and intentional. Knowing what the agent can see helps you understand its results and decide when to start fresh.

In this lesson, you will:

- inspect the context window with `/context`.
- see how much of the window each part consumes.
- reset a drifting conversation with `/clear`.

## Inspect the context

1. Run `/context` to inspect files, instructions, and conversation history.
2. Check how much of the window each part is consuming.
3. Run `/clear` to start fresh when the conversation has drifted.
4. Add the right file back before you ask for another change.

![Illustration of Copilot CLI output after running /context. A context window meter shows 61 percent used, split between conversation, files read, and instructions. A note suggests using /compact to summarize, or starting a fresh session, when running low.](/images/learning-hub/copilot-workshops/first-steps-cli-context.svg)

`/context` shows exactly what is filling the context window and how much room is left. When you are running low, use `/compact` to summarize the conversation, or start a fresh session.

## Summary and next steps

You can now see and manage what the agent knows. Continue to [Lesson 7: Resume and go remote][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
