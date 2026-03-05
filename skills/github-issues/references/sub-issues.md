# Sub-Issues and Parent Issues

Sub-issues let you break down work into hierarchical tasks. Each parent issue can have up to 100 sub-issues, nested up to 8 levels deep. Sub-issues can span repositories within the same owner.

## Using MCP tools

**List sub-issues:**
Call `mcp__github__issue_read` with `method: "get_sub_issues"`, `owner`, `repo`, and `issue_number`.

**Create an issue as a sub-issue:**
There is no MCP tool for creating sub-issues directly. Use REST or GraphQL (see below).

## Using REST API

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

## Using GraphQL

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
