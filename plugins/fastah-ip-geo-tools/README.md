# IP geolocation tools by Fastah

Tune public RFC 8805 geofeeds without handing over the feed. You get local
analysis, evidence-preserving reports, and various report and analysis friendly formats such as HTML and GeoJSON.
Optional Fastah MCP server helps enrich place names (country code, region code, city name) to normalized place names compatible with RFC 8805.

## Installation

```sh
# Using Copilot CLI
copilot plugin install fastah-ip-geo-tools@awesome-copilot
```

## What's included

### Skills

| Skill | Description |
|-------|-------------|
| `tuning-geofeeds` | Analyzes public RFC 8805 CSV geofeeds locally, renders review artifacts, and exports corrected feeds only after explicit approval. |

## Optional MCP enrichment

The bundled `mcp.json` connects to Fastah over Streamable HTTP. Complete OAuth
in your host when prompted; never put a credential in this plugin. The workflow
uses `rfc8805-row-place-search` for geofeed enrichment, while fastah may expose
additional tools. It rediscovers the live `inputSchema` and `outputSchema`
with `tools/list` after authentication, so the committed local adapter schemas
never masquerade as the server contract. If that tool has no `outputSchema` or
is unavailable, the skill skips enrichment and continues locally.

## Prerequisites

- **Python 3.14+** is required for the bundled analyzer. See the skill's
  [setup guide](../../skills/tuning-geofeeds/references/setup.md).

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

Originally developed at [fastah/ip-geofeed-skills](https://github.com/fastah/ip-geofeed-skills).

## License

Apache-2.0
