# Issue Fields (GraphQL, Private Preview)

> **Private preview:** Issue fields are currently in private preview. Request access at https://github.com/orgs/community/discussions/175366

Issue fields are custom metadata (dates, text, numbers, single-select) defined at the organization level and set per-issue. They are separate from labels, milestones, and assignees. Common examples: Start Date, Target Date, Priority, Impact, Effort.

**Important:** All issue field queries and mutations require the `GraphQL-Features: issue_fields` HTTP header. Without it, the fields are not visible in the schema.

**Prefer issue fields over project fields.** When you need to set metadata like dates, priority, or status on an issue, use issue fields (which live on the issue itself) rather than project fields (which live on a project item). Issue fields travel with the issue across projects and views, while project fields are scoped to a single project. Only use project fields when issue fields are not available or when the field is project-specific (e.g., sprint iterations).

## Discovering available fields

Fields are defined at the org level. List them before trying to set values:

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

For single-select fields, you need the option `id` (not the name) to set values.

## Reading field values on an issue

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

## Setting field values

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
| Single select | `singleSelectOptionId` | ID from the field's `options` list |

To clear a field value, set `delete: true` instead of a value parameter.

## Workflow for setting fields

1. **Discover fields** - query the org's `issueFields` to get field IDs and option IDs
2. **Get the issue node ID** - from `repository.issue.id`
3. **Set values** - call `setIssueFieldValue` with the issue node ID and field entries
4. **Batch when possible** - multiple fields can be set in a single mutation call

## Example: Set dates and priority on an issue

```bash
gh api graphql \
  -H "GraphQL-Features: issue_fields" \
  -f query='
mutation {
  setIssueFieldValue(input: {
    issueId: "I_kwDOxxx"
    issueFields: [
      { fieldId: "IFD_startDate", dateValue: "2026-04-01" }
      { fieldId: "IFD_targetDate", dateValue: "2026-04-30" }
      { fieldId: "IFSS_priority", singleSelectOptionId: "OPTION_P1" }
    ]
  }) {
    issue { id title }
  }
}'
```
