# Sub-Issues and Parent Issues

Sub-issues let you break down work into hierarchical tasks. Each parent issue can have up to 100 sub-issues, nested up to 8 levels deep. Sub-issues can span repositories within the same owner.

## Recommended Workflow

The simplest way to create a sub-issue is **two steps**: create the issue, then link it.

```bash
# Step 1: Create the issue and capture its numeric ID
ISSUE_ID=$(gh api repos/{owner}/{repo}/issues \
  -X POST \
  -f title="Sub-task title" \
  -f body="Description" \
  --jq '.id')

# Step 2: Link it as a sub-issue of the parent
# IMPORTANT: sub_issue_id must be an integer. Use --input (not -f) to send JSON.
echo "{\"sub_issue_id\": $ISSUE_ID}" | gh api repos/{owner}/{repo}/issues/{parent_number}/sub_issues -X POST --input -
```

**Why `--input` instead of `-f`?** The `gh api -f` flag sends all values as strings, but the API requires `sub_issue_id` as an integer. Using `-f sub_issue_id=12345` will return a 422 error.

Alternatively, use GraphQL `createIssue` with `parentIssueId` to do it in one step (see GraphQL section below).

## Using MCP tools

**List sub-issues:**
Call `mcp__github__issue_read` with `method: "get_sub_issues"`, `owner`, `repo`, and `issue_number`.

**Create an issue as a sub-issue:**
There is no MCP tool for creating sub-issues directly. Use the workflow above or GraphQL.

## Using REST API

**List sub-issues:**
```bash
gh api repos/{owner}/{repo}/issues/{issue_number}/sub_issues
```

**Get parent issue:**
```bash
gh api repos/{owner}/{repo}/issues/{issue_number}/parent
```

**Add an existing issue as a sub-issue:**
```bash
# sub_issue_id is the numeric issue ID (not the issue number)
# Get it from the .id field when creating or fetching an issue
echo '{"sub_issue_id": 12345}' | gh api repos/{owner}/{repo}/issues/{parent_number}/sub_issues -X POST --input -
```

To move a sub-issue that already has a parent, add `"replace_parent": true` to the JSON body.

**Remove a sub-issue:**
```bash
echo '{"sub_issue_id": 12345}' | gh api repos/{owner}/{repo}/issues/{parent_number}/sub_issue -X DELETE --input -
```

**Reprioritize a sub-issue:**
```bash
echo '{"sub_issue_id": 6, "after_id": 5}' | gh api repos/{owner}/{repo}/issues/{parent_number}/sub_issues/priority -X PATCH --input -
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
