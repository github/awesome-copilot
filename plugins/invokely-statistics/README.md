# Invokely Statistics Plugin

Use Invokely's hosted MCP server to retrieve official statistics, time series, comparisons, and rankings from GitHub Copilot CLI.

## Installation

```bash
copilot plugin install invokely-statistics@awesome-copilot
```

The plugin connects to `https://invokely.ai/mcp/trial`. It needs no Invokely account or API key and allows 25 calls per day per IP address. The registered Free plan has a separate limit of 500 MCP calls per month. See the [Invokely documentation](https://invokely.ai/docs) and [pricing](https://invokely.ai/pricing) for current details.

## What's included

The `invokely` MCP server provides six statistics tools: `search_indicators`, `resolve_place`, `get_value`, `get_series`, `compare`, and `rank_places`. It also lists `workspace_list`, `workspace_get`, `workspace_save`, `workspace_update`, and `workspace_delete`. The no-account trial is for the statistics tools; workspace calls require a separately configured account-authenticated MCP endpoint, and saving and updating also require Pro. The included skill instructs Copilot to confirm with the user before calling the irreversible `workspace_delete` operation.

The `invokely-statistics` skill guides the agent to resolve indicators and places before querying, preserve period and source context, and explain when comparison results are not comparable. It also distinguishes measured values from projections and user-supplied workspace datasets.

This plugin uses the public trial endpoint, which does not configure an Invokely API key or account-specific MCP endpoint. The plugin is a community contribution and is not endorsed by Invokely or GitHub.

Disclosure: I am affiliated with Invokely.
