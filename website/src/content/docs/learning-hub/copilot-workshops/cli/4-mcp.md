---
title: "Exercise 4 - Testing your feature with the Playwright MCP server"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

You just generated the filtering feature with Copilot CLI. Before you open a pull request, you should confirm it works in the browser. Rather than click through the app yourself, you'll connect the **Playwright MCP server** and let Copilot drive a real browser to test the feature for you.

In this exercise, you will:

- understand what Model Context Protocol (MCP) is and how MCP servers extend Copilot CLI.
- add the Playwright MCP server to Copilot CLI.
- ask Copilot to use it to manually test your filtering feature in a browser.

## What is Model Context Protocol (MCP)?

[Model Context Protocol (MCP)](https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/) provides AI agents with a way to communicate with external tools and services. By using MCP, AI agents can communicate with external tools and services in real-time. This allows them to access up-to-date information (using resources) and perform actions on your behalf (using tools).

These tools and resources are accessed through an MCP server, which acts as a bridge between the AI agent and the external tools and services. The MCP server is responsible for managing the communication between the AI agent and the external tools (such as existing APIs or local tools like NPM packages). Each MCP server represents a different set of tools and resources that the AI agent can access.

A couple of popular existing MCP servers are:

- **[GitHub MCP Server](https://github.com/github/github-mcp-server)**: This server provides access to a set of APIs for managing your GitHub repositories. It allows the AI agent to perform actions such as creating new repositories, updating existing ones, and managing issues and pull requests.
- **[Playwright MCP Server](https://github.com/microsoft/playwright-mcp)**: This server provides browser automation capabilities using Playwright. It allows the AI agent to perform actions such as navigating to web pages, filling out forms, and clicking buttons.

There are many other MCP servers available that provide access to different tools and resources. GitHub hosts an [MCP registry](https://github.com/mcp) to enhance discoverability and contributions to the ecosystem.

> [!CAUTION]
> With regard to security, treat MCP servers as you would any other dependency in your project. Before using an MCP server, carefully review its source code, verify the publisher, and consider the security implications. Only use MCP servers that you trust and be cautious about granting access to sensitive resources or operations.

> [!NOTE]
> The [GitHub MCP server][github-mcp-server] is **built in** to Copilot CLI — it's already available without any setup, which is how Copilot has been reading and writing to your repository throughout the workshop. In this exercise you'll add a *second* server, Playwright, to give Copilot a browser.

## Add the Playwright MCP server

The quickest way to add a server is the interactive `/mcp add` command. You'll register the [Playwright MCP server][playwright-mcp-server], which gives Copilot a browser it can control.

1. Return to your codespace. If you closed it, navigate to your repository on GitHub.com, select **Code** > **Codespaces**, then reopen your existing codespace.
2. Return to your open Copilot CLI session. If the terminal is closed or you exited Copilot CLI, open a terminal by selecting <kbd>Ctrl</kbd>+<kbd>\`</kbd>, then start it from the repository root by running `copilot --yolo --enable-all-github-mcp-tools`. Trust the project folder if prompted, then run `/models` and select **Auto**.
3. In your Copilot CLI session, enter:

    ```text
    /mcp add
    ```

4. A configuration form appears. Use <kbd>Tab</kbd> to move between fields and fill it in as follows:

    - **Server Name**: `playwright`
    - **Server Type**: select **Local** (also labelled **STDIO**)
    - **Command**: `npx @playwright/mcp@latest --headless`
    - **Tools**: leave as `*` to allow all of the server's tools

5. Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save. The server is added and available immediately — no restart required.

The `--headless` flag tells Playwright to run the browser without a visible window, which is required inside a codespace where there's no desktop to display it. Behind the scenes, this writes the server to your `~/.copilot/mcp-config.json` file:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "local",
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless"],
      "tools": ["*"]
    }
  }
}
```

6. Confirm the server is registered and active by listing your MCP servers:

    ```text
    /mcp show
    ```

7. You should see `playwright` listed alongside the built-in `github` server.

> [!NOTE]
> The Tailspin Toys project already uses Playwright for its end-to-end tests, so the browser Playwright needs is typically already installed. If Copilot later reports that a browser is missing, have it run `npx playwright install chromium` and try again.

## Start the website

The Playwright MCP server needs a running app to test against. Start the Astro dev server in a **separate** terminal so it keeps running while you work in Copilot CLI.

1. Open a new terminal in your codespace by selecting <kbd>Ctrl</kbd>+<kbd>\`</kbd>.
2. Start the website:

    ```bash
    npm run dev
    ```

3. Leave this terminal running. Once you see the `Astro server: http://localhost:4321` banner, the app is ready.

## Test the filtering feature

Return to your Copilot CLI session and ask Copilot to test the feature.

The [Playwright MCP server][playwright-mcp-server] gives Copilot a real browser to drive. Instead of you clicking through the app to check your work, the agent can open a page, navigate, apply filters, and read the result back to you — then summarize what it saw. It's the fastest way to confirm a feature behaves the way you expect without leaving the conversation.

Under the hood, the Playwright MCP server works from the page's [accessibility tree][playwright-mcp-server] rather than screenshots. That means the agent reasons over structured, labelled elements (buttons, links, list items) the same way assistive technology does — so a quick functional check doubles as a light accessibility sanity check.

With the server connected and the app running, ask Copilot to exercise the filtering feature you just built:

```text
Using the Playwright MCP server, open a browser to the running app at http://localhost:4321 and verify the new game filtering feature:

1. Go to the games page and note how many games are listed.
2. Apply a category filter and confirm the list updates to only show games in that category.
3. Clear it, then apply a publisher filter and confirm the list updates to that publisher.
4. Combine a category and a publisher filter and confirm the results respect both.

Report what you observe at each step, and call out anything that does not behave as expected.
```

Copilot will launch a browser through the Playwright MCP server, walk through each step, and report back what it found. Read its summary against the acceptance criteria in the issue — if something looks off, ask follow-up questions or send it back to fix the code before you open a pull request.

> [!NOTE]
> The app needs to be running at `http://localhost:4321` for this test. If you stopped the dev server, start it again before sending the prompt. The first time Copilot uses the Playwright MCP server it may need to download a browser — if it reports a missing browser, have it run `npx playwright install chromium` and try again.

## Summary and next steps

Congratulations, you used the Playwright MCP server to manually test your feature with Copilot CLI! To recap, you:

- learned what Model Context Protocol (MCP) is and how MCP servers extend Copilot CLI.
- added the Playwright MCP server with `/mcp add`.
- asked Copilot to drive a browser and verify your filtering feature before shipping it.

Now that you've confirmed the feature works, you can continue to the next exercise, where you'll [open a pull request with the help of an agent skill][next-lesson].

## Resources

- [What the heck is MCP and why is everyone talking about it?][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [Adding MCP servers for Copilot CLI][cli-add-mcp]
- [GitHub MCP Server][github-mcp-server]

[previous-lesson]: /learning-hub/copilot-workshops/cli/3-generating-code/
[next-lesson]: /learning-hub/copilot-workshops/cli/5-agent-skills/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[github-mcp-server]: https://github.com/github/github-mcp-server
[cli-add-mcp]: https://docs.github.com/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
