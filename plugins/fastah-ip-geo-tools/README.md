# IP Geolocation Tools by Fastah Inc.

This plugin is for network operations engineers who wish to tune and publish IP geolocation feeds in RFC 8805 format. It consists of an AI Skill and an associated MCP server that geocodes geolocation place names to real cities for accuracy.

## Installation

```sh
# Using Copilot CLI
copilot plugin install fastah-ip-geo-tools@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `geofeed-tuner` | Validates, tunes, and improves IP geolocation feeds in CSV format following RFC 8805 with opinionated best practices from real-world deployments. Uses Fastah MCP for tuning data lookup. |

## Prerequisites

- **Python 3** is required for running generated validation and tuning scripts.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

Originally developed at [fastah/ip-geofeed-skills](https://github.com/fastah/ip-geofeed-skills).

## License

Apache-2.0
