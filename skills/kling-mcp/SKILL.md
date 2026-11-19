---
name: kling-mcp
description: Use when a user wants GitHub Copilot to create or manage Kling AI images and videos through the official MCP service, or needs to connect the correct regional endpoint. Covers OAuth setup, live capability discovery, paid-generation approval, assets, and task status.
---

# Kling AI with GitHub Copilot

Use this Skill when a user asks to use Kling from GitHub Copilot. Kling is a hosted service; generation uses credits from the account for the selected region.

## Connect the right region

Ask which Kling account the user signs into if the region is not clear. Do not infer it from language or location. Global and China accounts, credits, and task IDs are separate.

| Account site | Official remote MCP endpoint |
| --- | --- |
| `kling.ai` (Global) | `https://kling.ai/mcp/plugin` |
| `klingai.com` (China) | `https://klingai.com/mcp/plugin` |

For Copilot CLI, add the chosen endpoint over HTTP and complete the OAuth flow:

```sh
copilot mcp add --transport http kling-ai https://kling.ai/mcp/plugin
```

For a China account, replace the URL with `https://klingai.com/mcp/plugin`. In VS Code, add the same endpoint as an HTTP MCP server in Copilot's MCP settings, then authenticate. Do not ask the user to paste tokens, keys, or cookies into chat or configuration.

If the server is not connected, give the user the relevant endpoint and setup instructions. Do not claim the connection works until Copilot can discover its tools.

## Choose an installation path

The hosted MCP endpoint does not require an npm package. If the user prefers a packaged client, distinguish these official npm options:

- Full agent plugin: [`@klingai/plugin-global`](https://www.npmjs.com/package/@klingai/plugin-global) or [`@klingai/plugin-cn`](https://www.npmjs.com/package/@klingai/plugin-cn).
- CLI only: [`@klingai/cli-global`](https://www.npmjs.com/package/@klingai/cli-global) or [`@klingai/cli-cn`](https://www.npmjs.com/package/@klingai/cli-cn).

Choose by the user's account region; never install both regional variants as a workaround. These packages are clients, not a local copy of Kling's hosted generation service. Follow the official package instructions for installation and OAuth.

## Prepare a request

Before image or video generation, call `who_am_i` to discover the connected account, current models, required inputs, and live parameter constraints. Select only a model the service declares for the requested tool. Ask for missing creative details rather than inventing required values.

For image or video generation, present the planned prompt, model, duration or image settings, output count, and reference assets before submission. Generation consumes credits: submit only after the user explicitly approves the final settings. If the service does not provide an exact price, say so instead of estimating. Do not silently retry, alter settings, or resubmit a failed or timed-out job; explain the outcome and ask what the user wants next.

Local reference files may be uploaded to Kling. Tell the user when a requested workflow will send their file to the hosted service, and upload only the assets needed for that request.

## Existing work and reusable assets

- Use the task-query tool for an existing generation ID; querying a task does not authorize a new generation.
- Use `element_list` and `element_get` to inspect reusable Elements before referring to them. Do not create, edit, or delete an Element unless the user requests that asset operation.
- Use the live tool descriptions and schemas from the connected server. Do not assume a model or parameter remains available based on an old example.

## References

- [Kling MCP and CLI guide](https://kling.ai/app/mcp/guide)
- [GitHub Copilot CLI: add MCP servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)
- [VS Code: add and use MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
