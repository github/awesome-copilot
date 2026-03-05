---
name: github-issues
description: 'Create, update, and manage GitHub issues using MCP tools. Use this skill when users want to create bug reports, feature requests, or task issues, update existing issues, add labels/assignees/milestones, set issue fields (dates, priority, custom fields), set issue types, or manage issue workflows. Triggers on requests like "create an issue", "file a bug", "request a feature", "update issue X", "set the priority", "set the start date", or any GitHub issue management task.'
---

# GitHub Issues

Manage GitHub issues using the `@modelcontextprotocol/server-github` MCP server.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp__github__create_issue` | Create new issues |
| `mcp__github__update_issue` | Update existing issues |
| `mcp__github__get_issue` | Fetch issue details |
| `mcp__github__search_issues` | Search issues |
| `mcp__github__add_issue_comment` | Add comments |
| `mcp__github__list_issues` | List repository issues |
| `mcp__github__list_issue_types` | List available issue types for an organization |
| `mcp__github__issue_read` | Read issue details, sub-issues, comments, labels |
| `mcp__github__projects_list` | List projects, project fields, project items, status updates |
| `mcp__github__projects_get` | Get details of a project, field, item, or status update |
| `mcp__github__projects_write` | Add/update/delete project items, create status updates |

## Workflow

1. **Determine action**: Create, update, or query?
2. **Gather context**: Get repo info, existing labels, milestones if needed
3. **Structure content**: Use appropriate template from [references/templates.md](references/templates.md)
4. **Execute**: Call the appropriate MCP tool
5. **Confirm**: Report the issue URL to user

## Creating Issues

### Required Parameters

```
owner: repository owner (org or user)
repo: repository name  
title: clear, actionable title
body: structured markdown content
```

### Optional Parameters

```
labels: ["bug", "enhancement", "documentation", ...]
assignees: ["username1", "username2"]
milestone: milestone number (integer)
type: issue type name (e.g., "Bug", "Feature", "Task", "Epic")
```

**Issue types** are organization-level metadata. Before using `type`, call `mcp__github__list_issue_types` with the org name to discover available types. If the org has no issue types configured, omit the parameter.

**Prefer issue types over labels for categorization.** When issue types are available (e.g., Bug, Feature, Task), use the `type` parameter instead of applying equivalent labels like `bug` or `enhancement`. Issue types are the canonical way to categorize issues on GitHub. Only fall back to labels when the org has no issue types configured.

### Title Guidelines

- Start with type prefix when useful: `[Bug]`, `[Feature]`, `[Docs]`
- Be specific and actionable
- Keep under 72 characters
- Examples:
  - `[Bug] Login fails with SSO enabled`
  - `[Feature] Add dark mode support`
  - `Add unit tests for auth module`

### Body Structure

Always use the templates in [references/templates.md](references/templates.md). Choose based on issue type:

| User Request | Template |
|--------------|----------|
| Bug, error, broken, not working | Bug Report |
| Feature, enhancement, add, new | Feature Request |
| Task, chore, refactor, update | Task |

## Updating Issues

Use `mcp__github__update_issue` with:

```
owner, repo, issue_number (required)
title, body, state, labels, assignees, milestone (optional - only changed fields)
```

State values: `open`, `closed`

## Examples

### Example 1: Bug Report

**User**: "Create a bug issue - the login page crashes when using SSO"

**Action**: Call `mcp__github__create_issue` with:
```json
{
  "owner": "github",
  "repo": "awesome-copilot",
  "title": "[Bug] Login page crashes when using SSO",
  "body": "## Description\nThe login page crashes when users attempt to authenticate using SSO.\n\n## Steps to Reproduce\n1. Navigate to login page\n2. Click 'Sign in with SSO'\n3. Page crashes\n\n## Expected Behavior\nSSO authentication should complete and redirect to dashboard.\n\n## Actual Behavior\nPage becomes unresponsive and displays error.\n\n## Environment\n- Browser: [To be filled]\n- OS: [To be filled]\n\n## Additional Context\nReported by user.",
  "type": "Bug"
}
```

### Example 2: Feature Request

**User**: "Create a feature request for dark mode with high priority"

**Action**: Call `mcp__github__create_issue` with:
```json
{
  "owner": "github",
  "repo": "awesome-copilot",
  "title": "[Feature] Add dark mode support",
  "body": "## Summary\nAdd dark mode theme option for improved user experience and accessibility.\n\n## Motivation\n- Reduces eye strain in low-light environments\n- Increasingly expected by users\n- Improves accessibility\n\n## Proposed Solution\nImplement theme toggle with system preference detection.\n\n## Acceptance Criteria\n- [ ] Toggle switch in settings\n- [ ] Persists user preference\n- [ ] Respects system preference by default\n- [ ] All UI components support both themes\n\n## Alternatives Considered\nNone specified.\n\n## Additional Context\nHigh priority request.",
  "type": "Feature",
  "labels": ["high-priority"]
}
```

## Common Labels

Use these standard labels when applicable:

| Label | Use For |
|-------|---------|
| `bug` | Something isn't working |
| `enhancement` | New feature or improvement |
| `documentation` | Documentation updates |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |
| `question` | Further information requested |
| `wontfix` | Will not be addressed |
| `duplicate` | Already exists |
| `high-priority` | Urgent issues |

## Tips

- Always confirm the repository context before creating issues
- Ask for missing critical information rather than guessing
- Link related issues when known: `Related to #123`
- For updates, fetch current issue first to preserve unchanged fields

## Sub-Issues and Parent Issues

Sub-issues let you break down work into hierarchical tasks. Each parent issue can have up to 100 sub-issues, nested up to 8 levels deep. Sub-issues can span repositories within the same owner.

### Using MCP tools

**List sub-issues:**
Call `mcp__github__issue_read` with `method: "get_sub_issues"`, `owner`, `repo`, and `issue_number`.

**Create an issue as a sub-issue:**
There is no MCP tool for creating sub-issues directly. Use REST or GraphQL (see below).

### Using REST API

**List sub-issues:**
```
GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues
```

**Get parent issue:**
```
GET /repos/{owner}/{repo}/issues/{issue_number}/parent
```

**Add an existing issue as a sub-issue:**
```
POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues
Body: { "sub_issue_id": 12345 }
```

The `sub_issue_id` is the numeric issue **ID** (not the issue number). Get it from the issue's `id` field in any API response.

To move a sub-issue that already has a parent, add `"replace_parent": true`.

**Remove a sub-issue:**
```
DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue
Body: { "sub_issue_id": 12345 }
```

**Reprioritize a sub-issue:**
```
PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority
Body: { "sub_issue_id": 6, "after_id": 5 }
```

Use `after_id` or `before_id` to position the sub-issue relative to another.

### Using GraphQL

**Read parent and sub-issues:**
```graphql
{
  repository(owner: "OWNER", name: "REPO") {
    issue(number: 123) {
      parent { number title }
      subIssues(first: 50) {
        nodes { number title state }
      }
      subIssuesSummary { total completed percentCompleted }
    }
  }
}
```

**Add a sub-issue:**
```graphql
mutation {
  addSubIssue(input: {
    issueId: "PARENT_NODE_ID"
    subIssueId: "CHILD_NODE_ID"
  }) {
    issue { id }
    subIssue { id number title }
  }
}
```

You can also use `subIssueUrl` instead of `subIssueId` (pass the issue's HTML URL). Add `replaceParent: true` to move a sub-issue from another parent.

**Create an issue directly as a sub-issue:**
```graphql
mutation {
  createIssue(input: {
    repositoryId: "REPO_NODE_ID"
    title: "Implement login validation"
    parentIssueId: "PARENT_NODE_ID"
  }) {
    issue { id number }
  }
}
```

**Remove a sub-issue:**
```graphql
mutation {
  removeSubIssue(input: {
    issueId: "PARENT_NODE_ID"
    subIssueId: "CHILD_NODE_ID"
  }) {
    issue { id }
  }
}
```

**Reprioritize a sub-issue:**
```graphql
mutation {
  reprioritizeSubIssue(input: {
    issueId: "PARENT_NODE_ID"
    subIssueId: "CHILD_NODE_ID"
    afterId: "OTHER_CHILD_NODE_ID"
  }) {
    issue { id }
  }
}
```

Use `afterId` or `beforeId` to position relative to another sub-issue.

## Issue Types

Issue types (Bug, Feature, Task, Epic, etc.) are defined at the **organization** level and inherited by repositories. They categorize issues beyond labels.

### Using MCP tools (preferred)

The MCP server handles issue types natively via REST. No GraphQL needed.

**Discover types:**
Call `mcp__github__list_issue_types` with the org name to get available types.

**Set type on create/update:**
Pass `type: "Bug"` (the type name as a string) to `mcp__github__create_issue` or `mcp__github__update_issue`.

### Using GraphQL (advanced)

GraphQL requires the `GraphQL-Features: issue_types` HTTP header.

**List types (org or repo level):**
```graphql
# Header: GraphQL-Features: issue_types
{
  organization(login: "OWNER") {
    issueTypes(first: 20) {
      nodes { id name color description isEnabled }
    }
  }
}
```

Types can also be listed per-repo via `repository.issueTypes` or looked up by name via `repository.issueType(name: "Bug")`.

**Read an issue's type:**
```graphql
# Header: GraphQL-Features: issue_types
{
  repository(owner: "OWNER", name: "REPO") {
    issue(number: 123) {
      issueType { id name color }
    }
  }
}
```

**Set type on an existing issue:**
```graphql
# Header: GraphQL-Features: issue_types
mutation {
  updateIssueIssueType(input: {
    issueId: "ISSUE_NODE_ID"
    issueTypeId: "IT_xxx"
  }) {
    issue { id issueType { name } }
  }
}
```

**Create issue with type:**
```graphql
# Header: GraphQL-Features: issue_types
mutation {
  createIssue(input: {
    repositoryId: "REPO_NODE_ID"
    title: "Fix login bug"
    issueTypeId: "IT_xxx"
  }) {
    issue { id number issueType { name } }
  }
}
```

To clear the type, set `issueTypeId` to `null`.

### Available colors

`GRAY`, `BLUE`, `GREEN`, `YELLOW`, `ORANGE`, `RED`, `PINK`, `PURPLE`

## Projects (GraphQL)

GitHub Projects V2 is managed via GraphQL. The MCP server provides three tools that wrap the GraphQL API, so you typically don't need raw GraphQL.

### Using MCP tools (preferred)

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

### Workflow for project operations

1. **Find the project** - use `projects_list` with `list_projects` to get the project number and node ID
2. **Discover fields** - use `projects_list` with `list_project_fields` to get field IDs and option IDs
3. **Find items** - use `projects_list` with `list_project_items` to get item IDs
4. **Mutate** - use `projects_write` to add, update, or delete items

### Using GraphQL directly (advanced)

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

## Issue Fields (GraphQL, Private Preview)

> **Private preview:** Issue fields are currently in private preview. Request access at https://github.com/orgs/community/discussions/175366

Issue fields are custom metadata (dates, text, numbers, single-select) defined at the organization level and set per-issue. They are separate from labels, milestones, and assignees. Common examples: Start Date, Target Date, Priority, Impact, Effort.

**Important:** All issue field queries and mutations require the `GraphQL-Features: issue_fields` HTTP header. Without it, the fields are not visible in the schema.

**Prefer issue fields over project fields.** When you need to set metadata like dates, priority, or status on an issue, use issue fields (which live on the issue itself) rather than project fields (which live on a project item). Issue fields travel with the issue across projects and views, while project fields are scoped to a single project. Only use project fields when issue fields are not available or when the field is project-specific (e.g., sprint iterations).

### Discovering available fields

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

### Reading field values on an issue

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

### Setting field values

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

### Workflow for setting fields

1. **Discover fields** - query the org's `issueFields` to get field IDs and option IDs
2. **Get the issue node ID** - from `repository.issue.id`
3. **Set values** - call `setIssueFieldValue` with the issue node ID and field entries
4. **Batch when possible** - multiple fields can be set in a single mutation call

### Example: Set dates and priority on an issue

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
