---
name: keenable-web-search
description: 'Search the web and read pages as clean markdown with Keenable, with no API key. Use when a task needs current information, documentation, release notes, changelogs, error reports, or the content of a known URL, and cite the sources used.'
---

# Keenable Web Search

Use [Keenable](https://keenable.ai) to find current, source-grounded information on the web and to read pages as clean markdown. Keenable works without an API key on a public tier, so this skill works on a fresh machine.

## When to Use This Skill

- The answer depends on something newer than your training data: a library release, a breaking change, a CVE, a deprecation notice.
- You need the exact content of a URL the user gave you (docs page, issue, changelog, blog post).
- You need sources to cite for a factual claim in code comments, a PR description, or an ADR.

## Option A: Keenable MCP server (preferred)

If the `keenable` MCP server is configured, use its two tools:

- `search_web_pages` — ranked results (title, URL, excerpt). Optional `site` (one domain) and `published_after` / `published_before` (YYYY-MM-DD).
- `fetch_page_content` — any URL as markdown. Optional `max_chars`.

To add it in VS Code, put this in `.vscode/mcp.json`:

```json
{
  "servers": {
    "keenable": {
      "type": "http",
      "url": "https://api.keenable.ai/mcp"
    }
  }
}
```

## Option B: HTTP API from the terminal (no MCP needed)

The keyless endpoints need only an `X-Keenable-Title` header that names your app.

Search:

```bash
curl -s -X POST "https://api.keenable.ai/v1/search/public" \
  -H "X-Keenable-Title: copilot-keenable-web-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "zod 4 release notes breaking changes", "max_results": 5}'
```

The response is JSON: `results[]` with `title`, `url` and `snippet`.

Read a page as markdown:

```bash
curl -s "https://api.keenable.ai/v1/fetch/public?url=https://zod.dev/v4/changelog&live=true" \
  -H "X-Keenable-Title: copilot-keenable-web-search"
```

The response is JSON with `url`, `title` and `content` (markdown). Use `live=true` for pages that change often or may not be indexed yet.

If the user has a Keenable API key in `KEENABLE_API_KEY`, call `/v1/search` and `/v1/fetch` instead and send `-H "X-API-Key: $KEENABLE_API_KEY"` to lift the hourly limit. Never ask the user to paste a key into chat.

## Workflow

1. Write the query as a description of the page you want ("release notes for zod 4 breaking changes"), not a bag of keywords.
2. Narrow with `site` or a date filter instead of extra query words. Turn relative dates ("last week") into exact dates first.
3. Read the most relevant one to three results in full before relying on them. Snippets are for triage, not evidence.
4. Prefer primary sources: official docs, release notes, the project's own repo.
5. Answer in your own words and list the URLs you used.

## Limits

Keyless use is limited to 1,000 requests per hour per IP (shared by everyone on that IP) and 10 per second. On a `429`, wait and retry, and mention that a Keenable API key lifts the hourly cap. See https://docs.keenable.ai/rate-limits.
