# Issue Fields REST API Reference

Issue fields are org-level custom metadata for issues. All endpoints require the API version header:

```
-H "X-GitHub-Api-Version: 2026-03-10"
```

## List Org Issue Fields

```bash
gh api /orgs/{org}/issue-fields \
  -H "X-GitHub-Api-Version: 2026-03-10"
```

Returns an array of field objects:

```json
[
  {
    "id": "IF_abc123",
    "name": "Priority",
    "content_type": "single_select",
    "options": [
      { "id": "OPT_1", "name": "Critical" },
      { "id": "OPT_2", "name": "High" },
      { "id": "OPT_3", "name": "Medium" },
      { "id": "OPT_4", "name": "Low" }
    ]
  },
  {
    "id": "IF_def456",
    "name": "Due Date",
    "content_type": "date",
    "options": null
  }
]
```

**Field types**: `text`, `single_select`, `number`, `date`

**Useful jq filter**:

```bash
gh api /orgs/{org}/issue-fields \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  --jq '.[] | {id, name, content_type, options: [.options[]?.name]}'
```

## Read Issue Field Values

```bash
gh api /repos/{owner}/{repo}/issues/{number}/issue-field-values \
  -H "X-GitHub-Api-Version: 2026-03-10"
```

Returns the current field values for the issue. Use this to check whether a value already exists before writing.

## Write Issue Field Values (POST, additive)

Adds values to an issue without removing existing values for other fields.

**Important**: uses `repository_id` (integer), not `owner/repo`.

```bash
# First, get the repository ID:
REPO_ID=$(gh api /repos/{owner}/{repo} --jq .id)

# Then write the value:
echo '[
  {
    "field_id": "IF_abc123",
    "value": "High"
  }
]' | gh api /repositories/$REPO_ID/issues/{number}/issue-field-values \
  -X POST \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  --input -
```

### Value format by field type

| Field Type | value format | Example |
|-----------|-------------|---------|
| text | String | `"value": "Some text"` |
| single_select | Option name (string) | `"value": "High"` |
| number | Number | `"value": 42` |
| date | ISO 8601 date string | `"value": "2025-03-15"` |

**Key**: for `single_select`, the REST API accepts the option **name** as a string. You do not need to look up option IDs.

### Writing multiple fields at once

Pass multiple objects in the array to set several fields in a single call:

```bash
echo '[
  {"field_id": "IF_abc123", "value": "High"},
  {"field_id": "IF_def456", "value": "2025-06-01"}
]' | gh api /repositories/$REPO_ID/issues/{number}/issue-field-values \
  -X POST \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  --input -
```

## Write Issue Field Values (PUT, replace all)

Replaces all field values on the issue. Use with caution.

```bash
echo '[{"field_id": "IF_abc123", "value": "Low"}]' | \
  gh api /repositories/$REPO_ID/issues/{number}/issue-field-values \
    -X PUT \
    -H "X-GitHub-Api-Version: 2026-03-10" \
    --input -
```

**Warning**: PUT removes any field values not included in the request body. Always use POST for migrations to preserve other field values.

## Permissions

- **Repository**: "Issues" read/write
- **Organization**: "Issue Fields" read/write

## Rate Limiting

- Standard rate limits apply (5,000 requests/hour for authenticated users)
- Secondary rate limits may trigger for rapid sequential writes
- Recommended: 100ms delay between calls, exponential backoff on 429
