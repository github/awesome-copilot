---
name: url-to-markdown
description: Fetch a public webpage as clean Markdown for agent context when you need readable content from a URL.
---

# URL to Markdown

Use the ReplyNodes Markdown API when an agent needs the readable content of a public webpage as Markdown context.

## Usage

Request the public webpage host and path from the endpoint:

```bash
curl -sS https://md.replynodes.com/example.com
```

Replace `example.com` with the target host and path. See the [Markdown API documentation](https://replynodes.com/markdown-api/) for the request format and the [canonical skill source](https://github.com/replynodes/replynodes-agent-skills/tree/main/skills/url-to-markdown).

Use this only for public webpages. Do not provide credentials, cookies, or private data.
