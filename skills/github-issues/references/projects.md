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

1. **Find the project** - use `projects_list` with `list_projects` to get the project number and node ID
2. **Discover fields** - use `projects_list` with `list_project_fields` to get field IDs and option IDs
3. **Find items** - use `projects_list` with `list_project_items` to get item IDs
4. **Mutate** - use `projects_write` to add, update, or delete items

## Project discovery for progress reports

When a user asks for a progress update on a project (e.g., "Give me a progress update for Project X"), follow this workflow:

1. **Search by name** - call `projects_list` with `list_projects` and scan results for a title matching the user's query. Project names are often informal, so match flexibly (e.g., "issue fields" matches "Issue fields" or "Issue Fields and Types").

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

**Tip:** For org-level projects, use GraphQL with `organization.projectsV2(first: 20, query: "search term")` to search by name directly, which is faster than listing all projects.

## Using GraphQL directly (advanced)

Required scope: `read:project` for queries, `project` for mutations.

**Find a project:**
```graphql
{
  organization(login: "ORG") {
    projectV2(number: 5) { id title }
  }
}
```

**List fields (including single-select options):**
```graphql
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
}
```

**Add an item:**
```graphql
mutation {
  addProjectV2ItemById(input: {
    projectId: "PROJECT_ID"
    contentId: "ISSUE_OR_PR_NODE_ID"
  }) {
    item { id }
  }
}
```

**Update a field value:**
```graphql
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PROJECT_ID"
    itemId: "ITEM_ID"
    fieldId: "FIELD_ID"
    value: { singleSelectOptionId: "OPTION_ID" }
  }) {
    projectV2Item { id }
  }
}
```

Value accepts one of: `text`, `number`, `date`, `singleSelectOptionId`, `iterationId`.

**Delete an item:**
```graphql
mutation {
  deleteProjectV2Item(input: {
    projectId: "PROJECT_ID"
    itemId: "ITEM_ID"
  }) {
    deletedItemId
  }
}
```
