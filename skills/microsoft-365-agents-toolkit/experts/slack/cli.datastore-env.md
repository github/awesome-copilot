# cli.datastore-env

## purpose

Datastore CRUD operations (`slack datastore`), environment variable management (`slack env`), and external authentication provider configuration (`slack external-auth`) via the Slack CLI.

## rules

1. **Datastores are typed key-value stores on Slack's platform.** Defined in the app manifest with a schema (attributes + primary key). Data persists across deployments. No external database needed for simple use cases.
2. **`slack datastore put` writes a single record.** Accepts `--datastore <name>` and `--item` with a JSON object matching the datastore schema. Overwrites the record if the primary key already exists.
3. **`slack datastore get` reads a single record.** Requires `--datastore <name>` and `--item` with the primary key field. Returns the full record as JSON.
4. **`slack datastore delete` removes a single record.** Requires `--datastore <name>` and `--item` with the primary key. The record is permanently removed.
5. **`slack datastore query` retrieves multiple records.** Supports `--expression` for filter expressions, `--expression-values` for parameter binding, and `--limit` for result caps. Uses DynamoDB-style filter syntax.
6. **Bulk operations exist for batch work.** `slack datastore bulk-put`, `slack datastore bulk-get`, `slack datastore bulk-delete` accept arrays of items. More efficient than looping single operations.
7. **`slack datastore count` returns the record count.** Useful for monitoring data growth and verifying bulk operations completed.
8. **`slack datastore update` modifies specific fields.** Updates individual attributes without replacing the entire record. Requires the primary key and the fields to update.
9. **`slack env add` sets an environment variable.** Environment variables are encrypted secrets stored on Slack's platform. Access them in functions via `env.get("VAR_NAME")`. Use for API keys, tokens, and configuration.
10. **`slack env list` shows all environment variables.** Displays variable names (not values) for the app. Values are encrypted and not retrievable via the CLI.
11. **`slack env remove` deletes an environment variable.** The variable is permanently removed and no longer available to functions.
12. **`slack external-auth` configures OAuth2 providers.** Set up external auth providers (Google, GitHub, etc.) that your app's functions can use to make authenticated API calls on behalf of users.

## patterns

### Pattern 1: Datastore definition in manifest

```typescript
// datastores/users.ts — Deno datastore definition
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const UsersDatastore = DefineDatastore({
  name: "users",
  primary_key: "user_id",
  attributes: {
    user_id: { type: Schema.slack.types.user_id },
    display_name: { type: Schema.types.string },
    score: { type: Schema.types.number },
    joined_at: { type: Schema.types.string },  // ISO 8601 timestamp
    active: { type: Schema.types.boolean },
  },
});

// Register in manifest.ts:
// datastores: [UsersDatastore],
// botScopes: ["datastore:read", "datastore:write"],
```

### Pattern 2: Datastore CRUD via CLI

```bash
# Put (create/upsert) a single record
slack datastore put --datastore users \
  --item '{"user_id": "U0123", "display_name": "Alice", "score": 42, "active": true}'

# Get a single record by primary key
slack datastore get --datastore users \
  --item '{"user_id": "U0123"}'
# Output: { "user_id": "U0123", "display_name": "Alice", "score": 42, "active": true }

# Update specific fields
slack datastore update --datastore users \
  --item '{"user_id": "U0123", "score": 50}'

# Delete a record
slack datastore delete --datastore users \
  --item '{"user_id": "U0123"}'

# Query with filter expression
slack datastore query --datastore users \
  --expression "score > :min_score AND active = :is_active" \
  --expression-values '{ ":min_score": 10, ":is_active": true }' \
  --limit 20

# Count all records
slack datastore count --datastore users
# Output: 47

# Bulk put multiple records
slack datastore bulk-put --datastore users \
  --items '[
    {"user_id": "U001", "display_name": "Alice", "score": 42, "active": true},
    {"user_id": "U002", "display_name": "Bob", "score": 38, "active": true},
    {"user_id": "U003", "display_name": "Charlie", "score": 55, "active": false}
  ]'

# Bulk get multiple records
slack datastore bulk-get --datastore users \
  --items '[{"user_id": "U001"}, {"user_id": "U002"}]'

# Bulk delete
slack datastore bulk-delete --datastore users \
  --items '[{"user_id": "U001"}, {"user_id": "U002"}]'
```

### Pattern 3: Environment variables

```bash
# Add an environment variable (encrypted on Slack's platform)
slack env add MY_API_KEY
# CLI prompts for the value interactively (not shown in terminal)

# Or provide value inline (less secure — appears in shell history)
slack env add MY_API_KEY --value "sk-abc123..."

# List all env vars (names only — values are encrypted)
slack env list
# Output:
#   MY_API_KEY
#   DATABASE_URL
#   WEBHOOK_SECRET

# Remove an env var
slack env remove MY_API_KEY

# Access in function code (Deno example):
# const apiKey = env.get("MY_API_KEY");
```

### Pattern 4: External auth provider setup

```bash
# Add an external OAuth2 provider
slack external-auth add

# Interactive wizard prompts for:
#   Provider name: google
#   Client ID: your-client-id
#   Client Secret: your-client-secret
#   Authorization URL: https://accounts.google.com/o/oauth2/v2/auth
#   Token URL: https://oauth2.googleapis.com/token
#   Scopes: email profile

# List configured providers
slack external-auth list

# Remove a provider
slack external-auth remove --provider google

# Select a provider token for a user (used in trigger/workflow setup)
slack external-auth select-auth --provider google
```

## pitfalls

- **Missing `datastore:read` / `datastore:write` scopes** — Datastores won't work without these bot scopes in the manifest. Add them before deploying.
- **Query expression syntax errors** — Filter expressions use DynamoDB-style syntax. Attribute names are bare, values use `:placeholder` binding. Test queries in dev before deploying.
- **Expecting SQL-like queries** — Datastores support basic filter expressions, not JOINs, GROUP BY, or complex aggregations. For complex queries, fetch data and process in function code.
- **Bulk operations item limit** — Bulk commands have limits on items per request. For very large datasets, batch in chunks.
- **Env var values not retrievable** — `slack env list` only shows names. You cannot read back the stored value. Keep a local record of what you set.
- **Env vars scoped to deployment target** — Dev app (`slack run`) and deployed app (`slack deploy`) may use different env var stores. Set vars for both if needed.
- **Setting env vars via `--value` flag** — The value appears in shell history. Prefer the interactive prompt for secrets.
- **Confusing datastore put with update** — `put` replaces the entire record. `update` modifies specific fields. Use `update` to change one attribute without resending the full object.

## references

- [Datastores overview](https://tools.slack.dev/cli/guides/datastores/)
- [slack datastore reference](https://tools.slack.dev/cli/reference/slack_datastore/)
- [Environment variables](https://tools.slack.dev/cli/guides/environment-variables/)
- [slack env reference](https://tools.slack.dev/cli/reference/slack_env/)
- [External auth providers](https://tools.slack.dev/cli/guides/external-auth/)
- [Query expressions](https://api.slack.com/automation/datastores/query-expressions)

## instructions

Do a web search for:

- "Slack CLI datastore put get query bulk operations 2025"
- "Slack CLI env add environment variables encrypted"
- "Slack CLI external-auth OAuth2 provider configuration"

Pair with:
- `cli.manifest-triggers.md` — datastores are declared in the manifest
- `cli.local-dev-deploy.md` — env vars apply to deployed apps
- `cli.getting-started.md` — project must be set up before using datastores
- `runtime.bolt-foundations-ts.md` — accessing datastores and env vars in function code

## research

Deep Research prompt:

"Write a micro expert on Slack CLI datastore and environment management. Cover datastore CRUD (put, get, delete, update, query, count), bulk operations (bulk-put, bulk-get, bulk-delete), query expression syntax (DynamoDB-style filters), datastore definition in manifest.ts (DefineDatastore, Schema types, primary_key), environment variables (env add/list/remove, encrypted storage, accessing in functions), external auth provider configuration (OAuth2 setup, provider management). Include canonical patterns for: datastore definition, full CRUD operations, query with filter expressions, env var workflow, external auth setup."
