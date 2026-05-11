# X Twitter Scraper Plugin

Use this plugin to give GitHub Copilot the `x-twitter-scraper` skill for Xquik API integration work. The skill helps Copilot choose the right Xquik SDK, REST endpoint, MCP path, or webhook pattern before it writes code.

## Installation

```bash
copilot plugin install x-twitter-scraper@awesome-copilot
```

## What It Includes

| Item | Description |
| ---- | ----------- |
| `/x-twitter-scraper` | Guides Xquik SDK, REST API, MCP, webhook, tweet search, user lookup, follower export, media action, and automation integration tasks. |

## When To Use

Use the skill when you want Copilot to integrate Xquik into an application, script, data pipeline, or agent workflow.

Good fits include:

- Add tweet search, timeline, tweet detail, or media download workflows.
- Look up X users or sync profile tweets into an app.
- Export followers, following, replies, reposts, quotes, likes, lists, communities, articles, or search results.
- Create account monitors and process signed webhook events.
- Add TypeScript, Python, Go, Java, Kotlin, C#, Ruby, PHP, CLI, or Terraform clients.
- Connect an agent to Xquik through MCP.

The skill is useful when Copilot needs current Xquik docs instead of guessing endpoint names, request fields, package names, or webhook signature handling.

## Example Prompts

```text
/x-twitter-scraper Add a TypeScript job that searches recent tweets and stores tweet IDs.
```

```text
/x-twitter-scraper Build a server-side webhook handler that verifies Xquik signatures.
```

```text
/x-twitter-scraper Add profile tweet sync to this Python project using the official SDK.
```

```text
/x-twitter-scraper Show the safest MCP integration path for an agent that reads tweet data.
```

## Guardrails

- Use official Xquik docs, SDK READMEs, and the OpenAPI spec before writing integration code.
- Keep API keys and webhook secrets in environment variables or the project's secret manager.
- Verify webhook signatures server-side before processing events.
- Require explicit user confirmation before write actions or long-running monitoring.
- Treat Xquik as a third-party X data and automation API. Do not claim affiliation with X Corp.

## Source

- Skill source: [skills/x-twitter-scraper](../../skills/x-twitter-scraper/SKILL.md)
- Xquik docs: [docs.xquik.com](https://docs.xquik.com)
- Xquik skill repo: [Xquik-dev/x-twitter-scraper](https://github.com/Xquik-dev/x-twitter-scraper)

## License

MIT
