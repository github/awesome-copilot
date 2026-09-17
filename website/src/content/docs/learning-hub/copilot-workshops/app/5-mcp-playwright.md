---
title: "Lesson 5 - Testing with the Playwright MCP server"
description: "Add the Playwright MCP server to the GitHub Copilot app and ask the agent to manually test your filtering feature in a real browser."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

In the previous lesson you created and verified the filtering feature with the project's automated test suite. Tests automate validation of code, but allowing the agent to confirm behavior is powerful. It allows an agent to respond to issues it sees in the actual UI it's creating. Let's explore how MCP allows access to external capabilities to AI agents, and add the Playwright MCP server to allow Copilot to interact with the site you're building directly.

In this lesson, you will:

- understand what Model Context Protocol (MCP) is and how the GitHub Copilot app uses it.
- add the Playwright MCP server from the app settings.
- ask the agent to drive a browser and explore your filtering feature.

## Scenario

While unit and end-to-end tests are important, validating updates to the UI requires actually interacting with the UI. You want to allow Copilot to use the website you're working on as a user would to further automate how changes are made, providing more confidence the updates perform as expected.

## What is Model Context Protocol (MCP)?

[Model Context Protocol (MCP)][mcp-blog-post] provides AI agents with a way to communicate with external tools and services. By using MCP, AI agents can communicate with external tools and services in real-time. This allows them to access up-to-date information (using resources) and perform actions on your behalf (using tools).

These tools and resources are accessed through an MCP server, which acts as a bridge between the AI agent and the external tools and services. The MCP server is responsible for managing the communication between the AI agent and the external tools (such as existing APIs or local tools like NPM packages). Each MCP server represents a different set of tools and resources that the AI agent can access.

A couple of popular existing MCP servers are:

- **[GitHub MCP Server](https://github.com/github/github-mcp-server)**: This server provides access to a set of APIs for managing your GitHub repositories. It allows the AI agent to perform actions such as creating new repositories, updating existing ones, and managing issues and pull requests.
- **[Playwright MCP Server][playwright-mcp-server]**: This server provides browser automation capabilities using Playwright. It allows the AI agent to perform actions such as navigating to web pages, filling out forms, and clicking buttons.

There are many other MCP servers available that provide access to different tools and resources. GitHub hosts an [MCP registry](https://github.com/mcp) to enhance discoverability and contributions to the ecosystem.

> [!CAUTION]
> Treat MCP servers as you would any other dependency in your project. Before using an MCP server, carefully review its source code, verify the publisher, and consider the security implications. Only use MCP servers that you trust and be cautious about granting access to sensitive resources or operations.

## Add the Playwright MCP server

You add and manage MCP servers from the app settings. The app includes a catalog of popular servers, so the [Playwright MCP server][playwright-mcp-server] is just a couple of clicks away.

1. Select <kbd>Ctrl</kbd>+<kbd>,</kbd> to open the Copilot app settings page.
2. Select **MCP servers**.
3. In the search dialog, type `Playwright`.
4. Select **Playwright** from the list of **Popular MCP servers**.
5. Select **Add server** to add it to the list of available MCP servers.
6. Select <kbd>Esc</kbd> to close the settings dialog.

You've now added the Playwright MCP server!

## Ask Copilot to explore the feature via Playwright

Let's ask Copilot to test the feature manually by using the Playwright MCP server.

1. Use the following prompt to ask Copilot to validate the new functionality:

   ```plaintext
   Start the dev server then use the Playwright MCP server to validate the functionality you just added exists. Use the details in the issue to ensure the newly added behavior matches the specs.
   ```

Copilot will launch a browser through the Playwright MCP server, walk through each step, and report back what it found. You'll actually see it open a browser on your system to perform the tasks!

2. Read its summary against the acceptance criteria in the issue. If something looks off, ask follow-up questions or send it back to fix the code before you open a pull request.
3. Leave this session open as we're going to close it out in the next lesson!

Copilot has now also validated the functionality in the browser by exploring the feature like a user would.

## Summary and next steps

Congratulations, you used the Playwright MCP server to explore your feature in a real browser from the GitHub Copilot app! To recap, you:

- learned what Model Context Protocol (MCP) is and how the app makes MCP tools available.
- added the Playwright MCP server from the app settings.
- asked the agent to drive a browser and explore your filtering feature.

Your feature is built, verified, and seen working. Now it's time to ship it — using **Agent Merge** to open and merge the pull request for you. Continue to [Lesson 6 - Merging with Agent Merge][next-lesson].

## Resources

- [What the heck is MCP and why is everyone talking about it?][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [Configuring MCP servers in the GitHub Copilot app][customize-app]

[next-lesson]: /learning-hub/copilot-workshops/app/6-agent-merge/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
