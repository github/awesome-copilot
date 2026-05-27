# Environment Configuration

Elasticsearch connection is configured via environment variables. Run `node scripts/esql.js test` to verify the
connection. If the test fails, suggest these setup options to the user, then stop. Do not try to explore further until a
successful connection test.

> **Elastic Cloud Serverless:** After connecting, inspect `GET /`. If `build_flavor` is `"serverless"`, do **not** use
> `version.number` to decide which ES|QL features are allowed — Serverless tracks current GA and preview ES|QL, and the
> reported version follows the main-line / next-minor line (semver-only clients may see it as “latest”). Prefer
> `build_flavor` for detection and gating. For the full rules (including self-managed and snapshot builds), read
> **Cluster Detection** in [SKILL.md](../SKILL.md) and the **Serverless** callout in
> [ES|QL Version History](esql-version-history.md).

## Option 1: Elastic Cloud (recommended for production)

```bash
export ELASTICSEARCH_CLOUD_ID="deployment-name:base64encodedcloudid"
export ELASTICSEARCH_API_KEY="base64encodedapikey"
```

## Option 2: Direct URL with API Key

```bash
export ELASTICSEARCH_URL="https://elasticsearch:9200"
export ELASTICSEARCH_API_KEY="base64encodedapikey"
```

## Option 3: Basic Authentication

```bash
export ELASTICSEARCH_URL="https://elasticsearch:9200"
export ELASTICSEARCH_USERNAME="elastic"
export ELASTICSEARCH_PASSWORD="changeme"
```

## Option 4: Local Development with start-local

For local development and testing, use [start-local](https://github.com/elastic/start-local) to quickly spin up
Elasticsearch and Kibana using Docker or Podman:

```bash
curl -fsSL https://elastic.co/start-local | sh
```

After installation completes, Elasticsearch runs at `http://localhost:9200` and Kibana at `http://localhost:5601`. The
script generates a random password for the `elastic` user and an API key, both stored in the `.env` file inside the
created `elastic-start-local` folder.

To configure the environment variables for this skill, source the `.env` file and export the connection settings:

```bash
source elastic-start-local/.env
export ELASTICSEARCH_URL="$ES_LOCAL_URL"
export ELASTICSEARCH_API_KEY="$ES_LOCAL_API_KEY"
```

Then run `node scripts/esql.js test` to verify the connection.

## Optional: Skip TLS verification (development only)

```bash
export ELASTICSEARCH_INSECURE="true"
```
