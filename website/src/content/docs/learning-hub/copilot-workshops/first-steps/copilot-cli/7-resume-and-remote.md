---
title: "Lesson 7 - Resume and go remote"
description: "Leave a Copilot CLI session and come back to it later with copilot --resume or /resume, and optionally follow it from another device with /remote."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Sessions can be paused without losing their conversation or workspace context. Leave a session, return to it later, and optionally make it available from another device.

In this lesson, you will:

- exit a session and resume it from the terminal.
- switch between sessions without leaving the CLI.
- optionally make a session available remotely.

## Leave a session and come back later

1. Exit the current Copilot CLI session when you are ready to switch tasks.
2. From a terminal, run `copilot --resume` to pick a previous session.
3. Inside Copilot CLI, use `/resume` to switch between sessions without leaving the CLI.
4. Confirm that the restored session still has the expected files, issue context, and model.

## Optional: Continue a session remotely

Run `/remote` to keep *that same session* running locally while making it available on the web and in the GitHub Copilot mobile app. Your machine needs to stay on. Open the link it returns in your browser, or access the session in the GitHub Copilot mobile app.

> [!NOTE]
> `/remote` is not delegation and does not move execution to the cloud. It is not required for this workshop, so try it once the local loop feels natural.

## Summary and next steps

You can pause and resume sessions, and follow a local session from another device. Continue to [Lesson 8: Create, review, and merge from the CLI][next-lesson].

[next-lesson]: /learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
