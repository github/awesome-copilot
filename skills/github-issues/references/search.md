# Advanced Issue Search

The `search_issues` MCP tool uses GitHub's issue search query format for cross-repo searches, supporting implicit-AND queries, date ranges, and metadata filters (but not explicit OR/NOT operators).

## When to Use Search vs List vs Advanced Search

There are three ways to find issues, each with different capabilities:

| Capability | `list_issues` (MCP) | `search_issues` (MCP) | Advanced search (`gh api`) |
|-----------|---------------------|----------------------|---------------------------|
| **Scope** | Single repo only | Cross-repo, cross-org | Cross-repo, cross-org |
| **Issue field filters** (`field.priority:P0`) | No | No | **Yes** (dot notation) |
| **Issue type filter** (`type:Bug`) | No | Yes | Yes |
| **Boolean logic** (AND/OR/NOT, nesting) | No | Yes (implicit AND only) | **Yes** (explicit AND/OR/NOT) |
| **Label/state/date filters** | Yes | Yes | Yes |
| **Assignee/author/mentions** | No | Yes | Yes |
| **Negation** (`-label:x`, `no:label`) | No | Yes | Yes |
| **Text search** (title/body/comments) | No | Yes | Yes |
| **`since` filter** | Yes | No | No |
| **Result limit** | No cap (paginate all) | 1,000 max | 1,000 max |
| **How to call** | MCP tool directly | MCP tool directly | `gh api` with `advanced_search=true` |

**Decision guide:**
- **Single repo, simple filters (state, labels, recent updates):** use `list_issues`
- **Cross-repo, text search, author/assignee, issue types:** use `search_issues`
- **Issue field values (Priority, dates, custom fields) or complex boolean logic:** use `gh api` with `advanced_search=true`

## Query Syntax

The `query` parameter is a string of search terms and qualifiers. A space between terms is implicit AND.

### Scoping

```
repo:owner/repo       # Single repo (auto-added if you pass owner+repo params)
org:github            # All repos in an org
user:octocat          # All repos owned by user
in:title              # Search only in title
in:body               # Search only in body
in:comments           # Search only in comments
```

### State & Close Reason

```
is:open               # Open issues (auto-added: is:issue)
is:closed             # Closed issues
reason:completed      # Closed as completed
reason:"not planned"  # Closed as not planned
```

### People

```
author:username       # Created by
assignee:username     # Assigned to
mentions:username     # Mentions user
commenter:username    # Has comment from
involves:username     # Author OR assignee OR mentioned OR commenter
author:@me            # Current authenticated user
team:org/team         # Team mentioned
```

### Labels, Milestones, Projects, Types

```
label:"bug"                 # Has label (quote multi-word labels)
label:bug label:priority    # Has BOTH labels (AND)
label:bug,enhancement       # Has EITHER label (OR)
-label:wontfix              # Does NOT have label
milestone:"v2.0"            # In milestone
project:github/57           # In project board
type:"Bug"                  # Issue type
```

### Missing Metadata

```
no:label              # No labels assigned
no:milestone          # No milestone
no:assignee           # Unassigned
no:project            # Not in any project
```

### Dates

All date qualifiers support `>`, `<`, `>=`, `<=`, and range (`..`) operators with ISO 8601 format:

```
created:>2026-01-01              # Created after Jan 1
updated:>=2026-03-01             # Updated since Mar 1
closed:2026-01-01..2026-02-01   # Closed in January
created:<2026-01-01              # Created before Jan 1
```

### Linked Content

```
linked:pr             # Issue has a linked PR
-linked:pr            # Issues not yet linked to any PR
linked:issue          # PR is linked to an issue
```

### Numeric Filters

```
comments:>10          # More than 10 comments
comments:0            # No comments
interactions:>100     # Reactions + comments > 100
reactions:>50         # More than 50 reactions
```

### Boolean Logic & Nesting

Use `AND`, `OR`, and parentheses (up to 5 levels deep, max 5 operators):

```
label:bug AND assignee:octocat
assignee:octocat OR assignee:hubot
(type:"Bug" AND label:P1) OR (type:"Feature" AND label:P1)
-author:app/dependabot          # Exclude bot issues
```

A space between terms without an explicit operator is treated as AND.

## Common Query Patterns

**Unassigned bugs:**
```
repo:owner/repo type:"Bug" no:assignee is:open
```

**Issues closed this week:**
```
repo:owner/repo is:closed closed:>=2026-03-01
```

**Stale open issues (no updates in 90 days):**
```
repo:owner/repo is:open updated:<2026-01-01
```

**Open issues without a linked PR (needs work):**
```
repo:owner/repo is:open -linked:pr
```

**Issues I'm involved in across an org:**
```
org:github involves:@me is:open
```

**High-activity issues:**
```
repo:owner/repo is:open comments:>20
```

**Issues by type and priority label:**
```
repo:owner/repo type:"Epic" label:P1 is:open
```

## Issue Field Search

> **Reliability warning:** The `field.name:value` search qualifier syntax is experimental and may return 0 results even when matching issues exist. For reliable filtering by field values, use the GraphQL bulk query approach documented in [issue-fields.md](issue-fields.md#searching-by-field-values).

Issue fields can theoretically be searched via the `field.name:value` qualifier using **advanced search mode**. This works in the web UI but results from the API are inconsistent.

### REST API

Add `advanced_search=true` as a query parameter:

```bash
gh api "search/issues?q=org:github+field.priority:P0+type:Epic+is:open&advanced_search=true" \
  --jq '.items[] | "#\(.number): \(.title)"'
```

### GraphQL

Use `type: ISSUE_ADVANCED` instead of `type: ISSUE`:

```graphql
{
  search(query: "org:github field.priority:P0 type:Epic is:open", type: ISSUE_ADVANCED, first: 10) {
    issueCount
    nodes {
      ... on Issue { number title }
    }
  }
}
```

### Issue Field Qualifiers

The syntax uses **dot notation** with the field's slug name (lowercase, hyphens for spaces):

```
field.priority:P0                  # Single-select field equals value
field.priority:P1                  # Different option value
field.target-date:>=2026-04-01     # Date comparison
has:field.priority                 # Has any value set
no:field.priority                  # Has no value set
```

**MCP limitation:** The `search_issues` MCP tool does not pass `advanced_search=true`. You must use `gh api` directly for issue field searches.

### Common Field Search Patterns

**P0 epics across an org:**
```
org:github field.priority:P0 type:Epic is:open
```

**Issues with a target date this quarter:**
```
org:github field.target-date:>=2026-04-01 field.target-date:<=2026-06-30 is:open
```

**Open bugs missing priority:**
```
org:github no:field.priority type:Bug is:open
```

## Limitations

- Query text: max **256 characters** (excluding operators/qualifiers)
- Boolean operators: max **5** AND/OR/NOT per query
- Results: max **1,000** total (use `list_issues` if you need all issues)
- Repo scan: searches up to **4,000** matching repositories
- Rate limit: **30 requests/minute** for authenticated search
- Issue field search requires `advanced_search=true` (REST) or `ISSUE_ADVANCED` (GraphQL); not available through MCP `search_issues`
