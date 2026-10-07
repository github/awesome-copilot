---
title: "Lesson 6 - Validate functionality with Playwright MCP"
description: "Configure Playwright MCP through Customize and observe filtering in a browser in the existing feature worktree."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

As we've already highlighted, there's more to writing code than just writing code. We need to work with data, external services, and even allow for additional automations to be available to Copilot. This is where MCP servers come into play. MCP servers allow Copilot to go beyond what's built into the app, providing it even more tools and services.

In this lesson, you will:

- understand what Model Context Protocol (MCP) is and how the GitHub Copilot app uses it.
- add the Playwright MCP server.
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

You manage MCP servers through **Customize** in the sidebar. Servers configured for your repositories or Copilot CLI may already be available in the app, so check before adding a duplicate. The [app customization documentation][customize-app] covers the available options.

1. Select **Customize** in the sidebar.
2. Select **MCP**, then check **Installed** for an existing Playwright server.
3. If needed, find **Playwright** among the available servers, or use the custom-server flow documented by the publisher.
4. Review the publisher, configuration, and any installation prompts before approving them. Follow the prompts to add the server; organization policy or missing prerequisites can block setup.
5. Return to the filtering session in **Interactive** mode and confirm the Playwright MCP tools are available.

If setup fails, resolve the configuration or permission issue before continuing.

## Ask Copilot to explore the feature via Playwright

The issue and your planning decisions are already in context. Stop any dev server you started earlier before asking Copilot to start one.

1. Use the following prompt to ask Copilot to validate the new functionality:

    ```plaintext
    Start the app and use Playwright MCP to check filtering against the issue and our plan. Tell me what works and what doesn't, without making changes. Stop the server you started when you're done.
    ```

> [!NOTE]
> You're not required to tell Copilot to use a specific MCP server; it will normally find the right one to use based on the current context. However, it's never a bad idea to tell Copilot something you know you think is important.

2. Sit back and watch!

Copilot will start the server, open a browser, and interact with the website! Once it's done, it'll stop the server and give you a report.

## Summary and next steps

Congratulations, you used the Playwright MCP server to explore your feature in a real browser from the GitHub Copilot app! To recap, you:

- learned what Model Context Protocol (MCP) is and how the GitHub Copilot app uses it.
- added the Playwright MCP server.
- asked the agent to drive a browser and explore your filtering feature.

Next, you'll [create a QA custom agent][next-lesson] that brings the skill and browser tools together in a specialist role.

## Resources

- [What the heck is MCP and why is everyone talking about it?][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [Configuring MCP servers in the GitHub Copilot app][customize-app]

[next-lesson]: /learning-hub/copilot-workshops/app/7-qa-agent/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
