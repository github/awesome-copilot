# Advanced Issue Search

The `search_issues` MCP tool accepts GitHub's full search query syntax, enabling complex cross-repo searches with boolean logic, date ranges, and metadata filters.

## When to Use Search vs List

| Use `search_issues` when... | Use `list_issues` when... |
|-----------------------------|--------------------------|
| Searching across multiple repos or orgs | Listing issues in a single known repo |
| Need boolean logic (AND, OR, NOT) | Simple filter by state/label/assignee |
| Need negation (`-label:wontfix`) | Want all results (no 1,000 cap) |
| Need text search in title/body/comments | Don't need text matching |
| Filtering by missing metadata (`no:label`) | Filtering by `since` date |
| Finding linked/unlinked PRs | Just browsing recent issues |

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
-linked:pr            # Issue has NO linked PR (needs work!)
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
repo:owner/repo is:open comments:>20 sort:updated
```

**Issues by type and priority label:**
```
repo:owner/repo type:"Epic" label:P1 is:open
```

## Advanced Search Mode (Issue Fields)

The `search_issues` MCP tool uses standard search mode. To search by **issue field values** (Priority, Start Date, custom fields), you must use **advanced search mode** which is only available via direct API calls.

### REST API

Add `advanced_search=true` as a query parameter:

```bash
gh api "search/issues?q=repo:owner/repo+field:Priority:P1+is:open&advanced_search=true" --jq '.items[] | "#\(.number): \(.title)"'
```

### GraphQL

Use `type: ISSUE_ADVANCED` instead of `type: ISSUE`:

```graphql
{
  search(query: "repo:owner/repo is:issue field:Priority:P1", type: ISSUE_ADVANCED, first: 10) {
    issueCount
    nodes {
      ... on Issue { number title }
    }
  }
}
```

### Issue Field Qualifiers

```
field:FieldName:Value              # Field equals value (e.g., field:Priority:P1)
field:"Field Name":Value           # Quote field names with spaces
field:"Target Date":>=2026-04-01   # Date comparisons work
has:field:FieldName                # Has any value set for this field
type:"Epic"                        # Issue type filter (works in both modes)
```

**Important:** `no:field:FieldName` syntax is NOT yet supported (returns 422). Use the negation approach of querying with `has:field:` and filtering results instead.

**MCP limitation:** The `search_issues` MCP tool does not support `advanced_search=true`. You must use `gh api` directly for issue field searches.

### Common Field Search Patterns

**P1 epics:**
```
repo:owner/repo field:Priority:P1 type:"Epic" is:open
```

**Issues with a target date this quarter:**
```
repo:owner/repo field:"Target Date":>=2026-04-01 field:"Target Date":<=2026-06-30 is:open
```

**Issues missing priority:**
```
# has:field:Priority returns issues WITH priority; negate client-side
repo:owner/repo is:open type:"Bug"
# then filter out results from: has:field:Priority
```

## Limitations

- Query text: max **256 characters** (excluding operators/qualifiers)
- Boolean operators: max **5** AND/OR/NOT per query
- Results: max **1,000** total (use `list_issues` if you need all issues)
- Repo scan: searches up to **4,000** matching repositories
- Rate limit: **30 requests/minute** for authenticated search
- `no:field:FieldName` qualifier is not yet supported (tracked internally)
- Issue field search requires `advanced_search=true` (REST) or `ISSUE_ADVANCED` (GraphQL); not available through MCP `search_issues`
