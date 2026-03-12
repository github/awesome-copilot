# Projects V2

GitHub Projects V2 is managed via GraphQL. The MCP server provides three tools that wrap the GraphQL API, so you typically don't need raw GraphQL.

## Using MCP tools (preferred)

**List projects:**
Call `mcp__github__projects_list` with `method: "list_projects"`, `owner`, and `owner_type` ("user" or "organization").

**List project fields:**
Call `mcp__github__projects_list` with `method: "list_project_fields"` and `project_number`.

**List project items:**
Call `mcp__github__projects_list` with `method: "list_project_items"` and `project_number`.

**Add an issue/PR to a project:**
Call `mcp__github__projects_write` with `method: "add_project_item"`, `project_id` (node ID), and `content_id` (issue/PR node ID).

**Update a project item field value:**
Call `mcp__github__projects_write` with `method: "update_project_item"`, `project_id`, `item_id`, `field_id`, and `value` (object with one of: `text`, `number`, `date`, `singleSelectOptionId`, `iterationId`).

**Delete a project item:**
Call `mcp__github__projects_write` with `method: "delete_project_item"`, `project_id`, and `item_id`.

## Workflow for project operations

1. **Find the project** — see [Finding a project by name](#finding-a-project-by-name) below
2. **Discover fields** - use `projects_list` with `list_project_fields` to get field IDs and option IDs
3. **Find items** - use `projects_list` with `list_project_items` to get item IDs
4. **Mutate** - use `projects_write` to add, update, or delete items

## Finding a project by name

> **⚠️ Known issue:** `projectsV2(query: "…")` does keyword search, not exact name match, and returns results sorted by recency. Common words like "issue" or "bug" return hundreds of false positives. The actual project may be buried dozens of pages deep.

Use this priority order:

### 1. Direct lookup (if you know the number)
```bash
gh api graphql -f query='{
  organization(login: "ORG") {
    projectV2(number: 42) { id title }
  }
}' --jq '.data.organization.projectV2'
```

### 2. Reverse lookup from a known issue (most reliable)
If the user mentions an issue, epic, or milestone that's in the project, query that issue's `projectItems` to discover the project:

```bash
gh api graphql -f query='{
  repository(owner: "OWNER", name: "REPO") {
    issue(number: 123) {
      projectItems(first: 10) {
        nodes {
          id
          project { number title id }
        }
      }
    }
  }
}' --jq '.data.repository.issue.projectItems.nodes[] | {number: .project.number, title: .project.title, id: .project.id}'
```

This is the most reliable approach for large orgs where name search fails.

### 3. GraphQL name search with client-side filtering (fallback)
Query a large page and filter client-side for an exact title match:

```bash
gh api graphql -f query='{
  organization(login: "ORG") {
    projectsV2(first: 100, query: "search term") {
      nodes { number title id }
    }
  }
}' --jq '.data.organization.projectsV2.nodes[] | select(.title | test("(?i)^exact name$"))'
```

If this returns nothing, paginate with `after` cursor or broaden the regex. Results are sorted by recency so older projects require pagination.

### 4. MCP tool (small orgs only)
Call `mcp__github__projects_list` with `method: "list_projects"`. This works well for orgs with <50 projects but has no name filter, so you must scan all results.

## Project discovery for progress reports

When a user asks for a progress update on a project (e.g., "Give me a progress update for Project X"), follow this workflow:

1. **Find the project** — use the [finding a project](#finding-a-project-by-name) strategies above. Ask the user for a known issue number if name search fails.

2. **Discover fields** - call `projects_list` with `list_project_fields` to find the Status field (its options tell you the workflow stages) and any Iteration field (to scope to the current sprint).

3. **Get all items** - call `projects_list` with `list_project_items`. For large projects (100+ items), paginate through all pages. Each item includes its field values (status, iteration, assignees).

4. **Build the report** - group items by Status field value and count them. For iteration-based projects, filter to the current iteration first. Present a breakdown like:

   ```
   Project: Issue Fields (Iteration 42, Mar 2-8)
   15 actionable items:
     🎉 Done:        4 (27%)
     In Review:      3
     In Progress:    3
     Ready:          2
     Blocked:        2
   ```

5. **Add context** - if items have sub-issues, include `subIssuesSummary` counts. If items have dependencies, note blocked items and what blocks them.

## OAuth Scope Requirements

| Operation | Required scope |
|-----------|---------------|
| Read projects, fields, items | `read:project` |
| Add/update/delete items, change field values | `project` |

**Common pitfall:** The default `gh auth` token often only has `read:project`. Mutations will fail with `INSUFFICIENT_SCOPES`. To add the write scope:

```bash
gh auth refresh -h github.com -s project
```

This triggers a browser-based OAuth flow. You must complete it before mutations will work.

## Finding an Issue's Project Item ID

When you know the issue but need its project item ID (e.g., to update its Status), query from the issue side:

```bash
gh api graphql -f query='
{
  repository(owner: "OWNER", name: "REPO") {
    issue(number: 123) {
      projectItems(first: 5) {
        nodes {
          id
          project { title number }
          fieldValues(first: 10) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2SingleSelectField { name } }
              }
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.issue.projectItems.nodes'
```

This returns the item ID, project info, and current field values in one query.

## Using GraphQL via gh api (recommended)

Use `gh api graphql` to run GraphQL queries and mutations. This is more reliable than MCP tools for write operations.

**Find a project and its Status field options:**
```bash
gh api graphql -f query='
{
  organization(login: "ORG") {
    projectV2(number: 5) {
      id
      title
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
}' --jq '.data.organization.projectV2'
```

**List all fields (including iterations):**
```bash
gh api graphql -f query='
{
  node(id: "PROJECT_ID") {
    ... on ProjectV2 {
      fields(first: 20) {
        nodes {
          ... on ProjectV2Field { id name }
          ... on ProjectV2SingleSelectField { id name options { id name } }
          ... on ProjectV2IterationField { id name configuration { iterations { id startDate } } }
        }
      }
    }
  }
}' --jq '.data.node.fields.nodes'
```

**Update a field value (e.g., set Status to "In Progress"):**
```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PROJECT_ID"
    itemId: "ITEM_ID"
    fieldId: "FIELD_ID"
    value: { singleSelectOptionId: "OPTION_ID" }
  }) {
    projectV2Item { id }
  }
}'
```

Value accepts one of: `text`, `number`, `date`, `singleSelectOptionId`, `iterationId`.

**Add an item:**
```bash
gh api graphql -f query='
mutation {
  addProjectV2ItemById(input: {
    projectId: "PROJECT_ID"
    contentId: "ISSUE_OR_PR_NODE_ID"
  }) {
    item { id }
  }
}'
```

**Delete an item:**
```bash
gh api graphql -f query='
mutation {
  deleteProjectV2Item(input: {
    projectId: "PROJECT_ID"
    itemId: "ITEM_ID"
  }) {
    deletedItemId
  }
}'
```

## End-to-End Example: Set Issue Status to "In Progress"

```bash
# 1. Get the issue's project item ID, project ID, and current status
gh api graphql -f query='{
  repository(owner: "github", name: "planning-tracking") {
    issue(number: 2574) {
      projectItems(first: 1) {
        nodes { id project { id title } }
      }
    }
  }
}' --jq '.data.repository.issue.projectItems.nodes[0]'

# 2. Get the Status field ID and "In Progress" option ID
gh api graphql -f query='{
  node(id: "PROJECT_ID") {
    ... on ProjectV2 {
      field(name: "Status") {
        ... on ProjectV2SingleSelectField { id options { id name } }
      }
    }
  }
}' --jq '.data.node.field'

# 3. Update the status
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PROJECT_ID"
    itemId: "ITEM_ID"
    fieldId: "FIELD_ID"
    value: { singleSelectOptionId: "IN_PROGRESS_OPTION_ID" }
  }) { projectV2Item { id } }
}'
```
```
