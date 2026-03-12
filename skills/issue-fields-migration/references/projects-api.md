# Projects V2 API Reference (for Migration)

This reference covers the subset of the Projects V2 API needed for field migration: discovering project fields and reading item values.

## List Project Fields

### Via MCP Tool

```
mcp__github__projects_list(
  owner: "{org}",
  project_number: {n},
  method: "list_project_fields"
)
```

### Via GraphQL

```bash
gh api graphql -f query='
  query {
    organization(login: "ORG") {
      projectV2(number: N) {
        fields(first: 30) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on ProjectV2Field {
              id
              name
              dataType
            }
            ... on ProjectV2SingleSelectField {
              id
              name
              dataType
              options { id name }
            }
            ... on ProjectV2IterationField {
              id
              name
              dataType
            }
          }
        }
      }
    }
  }'
```

### Field Data Types

| dataType | Description | Migrates to |
|----------|-------------|-------------|
| TEXT | Free-form text | `text` issue field |
| SINGLE_SELECT | Dropdown with options | `single_select` issue field |
| NUMBER | Numeric value | `number` issue field |
| DATE | Date value | `date` issue field |
| ITERATION | Sprint/iteration cycles | No equivalent (skip) |

## List Project Items (with field values)

### Via MCP Tool

```
mcp__github__projects_list(
  owner: "{org}",
  project_number: {n},
  method: "list_project_items"
)
```

Returns paginated results. Each item includes:
- Item type (ISSUE, DRAFT_ISSUE, PULL_REQUEST)
- Content reference (repo owner, repo name, issue number)
- Field values for all project fields

### Via GraphQL

```bash
gh api graphql -f query='
  query($cursor: String) {
    organization(login: "ORG") {
      projectV2(number: N) {
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            type
            content {
              ... on Issue {
                number
                repository { nameWithOwner }
              }
            }
            fieldValues(first: 20) {
              pageInfo { hasNextPage endCursor }
              nodes {
                ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2Field { name } } }
              }
            }
          }
        }
      }
    }
  }' -f cursor="$CURSOR"
```

### Important Notes for Migration

- **Pagination**: projects can have up to 10,000 items. Always paginate using `pageInfo.hasNextPage` and `pageInfo.endCursor`.
- **Draft items**: items with `type: DRAFT_ISSUE` have no real issue attached. Skip these during migration.
- **Pull requests**: items with `type: PULL_REQUEST` are PRs, not issues. Issue fields apply to issues only. Skip these.
- **Cross-repo**: a single project can contain issues from many repositories. Group items by repo to batch repo ID lookups.
- **Field value access**: each field value node type is different (`ProjectV2ItemFieldTextValue`, `ProjectV2ItemFieldSingleSelectValue`, etc.). Handle each type.
