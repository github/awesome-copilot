# Issue Fields

Issue fields are custom metadata (dates, text, numbers, single-select) defined at the organization level and set per-issue. They are separate from labels, milestones, and assignees. Common examples: Start Date, Target Date, Priority, Impact, Effort.

**Prefer issue fields over project fields.** When you need to set metadata like dates, priority, or status on an issue, use issue fields (which live on the issue itself) rather than project fields (which live on a project item). Issue fields travel with the issue across projects and views, while project fields are scoped to a single project. Only use project fields when issue fields are not available or when the field is project-specific (e.g., sprint iterations).

## MCP Tools (preferred)

When the GitHub MCP server is available, use MCP tools for all issue field operations. They handle ID resolution internally, so you work with human-readable names.

### Discovering available fields

Use `list_issue_fields` to get field definitions and valid options:

```
Tool: mcp__github__list_issue_fields
Parameters:
  owner: "ORG"
  repo: "REPO"  # optional; omit for org-level fields
```

Returns field names, types (text, number, date, single_select), and for single-select fields, the list of valid option names.

### Reading field values on an issue

Use `issue_read` with method `get`. Field values are included in the response.

```
Tool: mcp__github__issue_read
Parameters:
  method: "get"
  owner: "OWNER"
  repo: "REPO"
  issue_number: 123
```

### Setting fields via issue_write (simplest)

When creating or updating an issue, pass `issue_fields` inline. Uses field names and option names directly (no ID lookups needed):

```
Tool: mcp__github__issue_write
Parameters:
  method: "update"
  owner: "OWNER"
  repo: "REPO"
  issue_number: 123
  show_ui: false
  issue_fields:
    - field_name: "Priority"
      field_option_name: "P1"
    - field_name: "Target Date"
      value: "2026-07-01"
    - field_name: "Effort"
      value: 5
```

Each entry takes `field_name` (case-insensitive) plus one of:
- `field_option_name` - for single-select fields (validated against options)
- `value` - for text, number, or date fields (date as YYYY-MM-DD)
- `delete: true` - to clear the field value

### Setting fields via set_issue_fields (advanced)

Use the dedicated `set_issue_fields` tool when you need confidence scoring, rationale, or suggestion mode. Requires GraphQL node IDs (get them from `list_issue_fields` response):

```
Tool: mcp__github__set_issue_fields
Parameters:
  owner: "OWNER"
  repo: "REPO"
  issue_number: 123
  fields:
    - field_id: "IFD_abc123"
      date_value: "2026-07-01"
      confidence: "HIGH"
      rationale: "Deadline stated in issue description"
    - field_id: "IFSS_def456"
      single_select_option_id: "OPT_xyz789"
      confidence: "MEDIUM"
      rationale: "Reports a crash when saving, likely high priority"
      is_suggestion: true
```

Each entry takes `field_id` plus one value parameter:

| Field type | Value parameter | Format |
|-----------|----------------|--------|
| Date | `date_value` | ISO 8601 date string |
| Text | `text_value` | String |
| Number | `number_value` | Number |
| Single select | `single_select_option_id` | GraphQL node ID of the option |

Additional parameters per field:
- `confidence` (LOW/MEDIUM/HIGH) - how certain you are of this value
- `rationale` (max 280 chars) - one sentence explaining what led to this choice
- `is_suggestion` (boolean) - if true, sent as a suggestion rather than applied value
- `delete` (boolean) - set true to clear the field value

### Filtering issues by field values

Use `list_issues` with `field_filters` to find issues matching specific field values:

```
Tool: mcp__github__list_issues
Parameters:
  owner: "OWNER"
  repo: "REPO"
  state: "OPEN"
  field_filters:
    - field_name: "Priority"
      value: "P1"
```

### Workflow (MCP)

1. **Discover fields** - `list_issue_fields` to see available fields and options
2. **Set values** - use `issue_write` with `issue_fields` for simple cases, or `set_issue_fields` for confidence/rationale
3. **Query by fields** - use `list_issues` with `field_filters`

## REST API (fallback)

Use the REST API when MCP tools are not available.

### Discovering available fields

```bash
gh api orgs/{org}/issue-fields --jq '.[] | {id, name, options: [.options[]? | {id, name}]}'
```

### Reading field values on an issue

```bash
gh api repos/{owner}/{repo}/issues/{number}/issue-field-values
```

### Setting field values

```bash
gh api repos/{owner}/{repo}/issues/{number}/issue-field-values \
  -X POST \
  --input - <<'EOF'
{"issue_field_values": [{"field_id": 1, "value": "P1"}]}
EOF
```

**Important:** The payload must be a JSON object with an `issue_field_values` array. Each entry has:
- `field_id` (integer): the field's numeric ID from the org fields list
- `value` (string): the **option name** for single-select fields (e.g., `"P1"`, `"High"`), or the literal value for text/number/date fields

Common mistakes to avoid:
- Passing the option ID instead of the option name as `value` (the API expects the display name)
- Sending `field_id` and `value` as top-level keys without wrapping in `issue_field_values` array
- Using `-f` flags instead of `--input` with JSON body

### Example: Set priority to P1

```bash
# 1. Find the Priority field ID and option names
gh api orgs/{org}/issue-fields --jq '.[] | select(.name == "Priority")'

# 2. Set it (use the option NAME, not ID)
gh api repos/{owner}/{repo}/issues/{number}/issue-field-values \
  -X POST \
  --input - <<'EOF'
{"issue_field_values": [{"field_id": 1, "value": "P1"}]}
EOF
```

### Example: Set multiple fields at once

```bash
gh api repos/{owner}/{repo}/issues/{number}/issue-field-values \
  -X POST \
  --input - <<'EOF'
{"issue_field_values": [
  {"field_id": 1, "value": "P1"},
  {"field_id": 5, "value": "2026-06-01"},
  {"field_id": 7, "value": "High"}
]}
EOF
```

### Workflow for setting fields (REST)

1. **Discover fields** - `gh api orgs/{org}/issue-fields` to get field IDs and option names
2. **Set values** - POST to `repos/{owner}/{repo}/issues/{number}/issue-field-values` with JSON body
3. **Batch when possible** - multiple fields can be set in a single request

## GraphQL API (alternative)

The GraphQL API requires the `GraphQL-Features: issue_fields` HTTP header. Without it, the fields are not visible in the schema.

### Discovering available fields (GraphQL)

```graphql
# Header: GraphQL-Features: issue_fields
{
  organization(login: "OWNER") {
    issueFields(first: 30) {
      nodes {
        __typename
        ... on IssueFieldDate { id name }
        ... on IssueFieldText { id name }
        ... on IssueFieldNumber { id name }
        ... on IssueFieldSingleSelect { id name options { id name color } }
      }
    }
  }
}
```

Field types: `IssueFieldDate`, `IssueFieldText`, `IssueFieldNumber`, `IssueFieldSingleSelect`.

### Reading field values (GraphQL)

```graphql
# Header: GraphQL-Features: issue_fields
{
  repository(owner: "OWNER", name: "REPO") {
    issue(number: 123) {
      issueFieldValues(first: 20) {
        nodes {
          __typename
          ... on IssueFieldDateValue {
            value
            field { ... on IssueFieldDate { id name } }
          }
          ... on IssueFieldTextValue {
            value
            field { ... on IssueFieldText { id name } }
          }
          ... on IssueFieldNumberValue {
            value
            field { ... on IssueFieldNumber { id name } }
          }
          ... on IssueFieldSingleSelectValue {
            name
            color
            field { ... on IssueFieldSingleSelect { id name } }
          }
        }
      }
    }
  }
}
```

### Setting field values (GraphQL)

Use `setIssueFieldValue` to set one or more fields at once. You need the issue's node ID and the field IDs from the discovery query above.

```graphql
# Header: GraphQL-Features: issue_fields
mutation {
  setIssueFieldValue(input: {
    issueId: "ISSUE_NODE_ID"
    issueFields: [
      { fieldId: "IFD_xxx", dateValue: "2026-04-15" }
      { fieldId: "IFT_xxx", textValue: "some text" }
      { fieldId: "IFN_xxx", numberValue: 3.0 }
      { fieldId: "IFSS_xxx", singleSelectOptionId: "OPTION_ID" }
    ]
  }) {
    issue { id title }
  }
}
```

Each entry in `issueFields` takes a `fieldId` plus exactly one value parameter:

| Field type | Value parameter | Format |
|-----------|----------------|--------|
| Date | `dateValue` | ISO 8601 date string, e.g. `"2026-04-15"` |
| Text | `textValue` | String |
| Number | `numberValue` | Float |
| Single select | `singleSelectOptionId` | Node ID from the field's `options` list |

To clear a field value, set `delete: true` instead of a value parameter.

## Searching by field values

### GraphQL bulk query (recommended)

The most reliable way to find issues by field value is to fetch issues via GraphQL and filter by `issueFieldValues`. The search qualifier syntax (`field.name:value`) is not yet reliable across all environments.

```bash
# Find all open P1 issues in a repo
gh api graphql -H "GraphQL-Features: issue_fields" -f query='
{
  repository(owner: "OWNER", name: "REPO") {
    issues(first: 100, states: OPEN) {
      nodes {
        number
        title
        updatedAt
        assignees(first: 3) { nodes { login } }
        issueFieldValues(first: 10) {
          nodes {
            __typename
            ... on IssueFieldSingleSelectValue {
              name
              field { ... on IssueFieldSingleSelect { name } }
            }
          }
        }
      }
    }
  }
}' --jq '
  [.data.repository.issues.nodes[] |
    select(.issueFieldValues.nodes[] |
      select(.field.name == "Priority" and .name == "P1")
    ) |
    {number, title, updatedAt, assignees: [.assignees.nodes[].login]}
  ]'
```

**Schema notes for `IssueFieldSingleSelectValue`:**
- The selected option's display text is in `.name` (not `.value`)
- Also available: `.color`, `.description`, `.id`
- The parent field reference is in `.field` (use inline fragment to get the field name)

### Search qualifier syntax (experimental)

Issue fields may also be searchable using dot notation in search queries. This requires `advanced_search=true` on REST or `ISSUE_ADVANCED` search type on GraphQL, but results are inconsistent and may return 0 results even when matching issues exist.

```
field.priority:P0                  # Single-select equals value
field.target-date:>=2026-04-01     # Date comparison
has:field.priority                 # Has any value set
no:field.priority                  # Has no value set
```

Field names use the **slug** (lowercase, hyphens for spaces). For example, "Target Date" becomes `target-date`.

```bash
# REST API (may not return results in all environments)
gh api "search/issues?q=repo:owner/repo+field.priority:P0+is:open&advanced_search=true" \
  --jq '.items[] | "#\(.number): \(.title)"'
```

> **Warning:** The colon notation (`field:Priority:P1`) is silently ignored. If using search qualifiers, always use dot notation (`field.priority:P1`). However, the GraphQL bulk query approach above is more reliable. See [search.md](search.md) for the full search guide.
