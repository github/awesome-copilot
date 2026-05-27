# Elasticsearch ES|QL Plugin

Translate natural language into [ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) queries, execute them against Elasticsearch, and analyze the results — all from GitHub Copilot.

Powered by the official [Elastic ES|QL agent skill](https://github.com/elastic/agent-skills/tree/main/skills/elasticsearch/elasticsearch-esql).

## Installation

```bash
# Using Copilot CLI
copilot plugin install elasticsearch-esql@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `elasticsearch-esql` | Execute ES|QL queries against Elasticsearch. Translates natural language to ES|QL, discovers indices and field schemas, and returns results. Supports aggregations, time-series metrics, full-text search, log categorization, anomaly detection, and more. |

## Prerequisites

- Elasticsearch 8.11+ (ES|QL is GA in 8.14+)
- Node.js (for the bundled `esql.js` runner)
- An Elasticsearch connection — Cloud ID + API key, URL + API key, or basic auth

## Setup

Configure your Elasticsearch connection via environment variables before using the skill:

```bash
# Option 1 — Elastic Cloud (recommended)
export ELASTICSEARCH_CLOUD_ID="deployment-name:base64encodedcloudid"
export ELASTICSEARCH_API_KEY="base64encodedapikey"

# Option 2 — Direct URL
export ELASTICSEARCH_URL="https://your-cluster:9200"
export ELASTICSEARCH_API_KEY="base64encodedapikey"

# Option 3 — Basic auth
export ELASTICSEARCH_URL="https://your-cluster:9200"
export ELASTICSEARCH_USERNAME="elastic"
export ELASTICSEARCH_PASSWORD="changeme"
```

Then install dependencies once:

```bash
cd .github/copilot/skills/elasticsearch-esql
npm install
node scripts/esql.js test   # verify connection
```

## Example Prompts

- *"Show me the top 10 hosts by error count in the last 24 hours"*
- *"What are the average CPU and memory metrics per service over the last week?"*
- *"Find log messages that match 'connection refused' and group them by category"*
- *"Detect any spikes in HTTP 5xx errors in the past hour"*
- *"Convert this Query DSL filter to ES|QL"*

## What ES|QL Can Do

| Use Case | ES|QL Feature |
|----------|-------------|
| Filter & search logs | `FROM … \| WHERE …` + `MATCH()` |
| Aggregate metrics | `STATS … BY BUCKET(@timestamp, interval)` |
| Time-series counters/gauges | `TS` + `TBUCKET` + `RATE()` |
| Detect anomalies | `CHANGE_POINT` |
| Categorize log messages | `CATEGORIZE()` |
| Enrich with lookups | `LOOKUP JOIN` |
| Extract structured fields | `DISSECT` / `GROK` |
| Migrate from Query DSL | See `references/dsl-to-esql-migration.md` |

## References

The skill bundles comprehensive reference documentation:

- **ES|QL Complete Reference** — full syntax for all commands and functions
- **Generation Tips** — best practices, TS/TBUCKET/RATE patterns, LOOKUP JOIN
- **Query Patterns** — natural language → ES|QL translation examples
- **Time Series Queries** — inner/outer aggregation model, TBUCKET, RATE constraints
- **ES|QL Search Reference** — MATCH, QSTR, KQL, scoring, semantic search
- **ES|QL Search Strategy** — relevance search: retrieve → fuse → rerank
- **ES|QL Version History** — feature availability by Elasticsearch version
- **DSL to ES|QL Migration** — convert Query DSL to ES|QL
- **Environment Setup** — connection configuration options

## Credits

This plugin bundles the [elasticsearch-esql skill](https://github.com/elastic/agent-skills/tree/main/skills/elasticsearch/elasticsearch-esql) created and maintained by [Elastic](https://www.elastic.co). The skill is licensed under the [Elastic License 2.0](https://www.elastic.co/licensing/elastic-license).
