# gh api — REST, GraphQL, and jq patterns

`gh api` handles auth, pagination, and hostname routing automatically — prefer it over raw `curl` for GitHub calls.

## REST basics

```bash
gh api /user                                           # GET, authenticated user
gh api repos/owner/repo                                # leading slash optional
gh api repos/owner/repo/issues --paginate              # follow all pages
gh api /rate_limit

gh api --method POST /repos/owner/repo/issues \
  --field title="Issue title" \
  --field body="Body"

gh api --method PATCH /repos/owner/repo/issues/123 \
  --field state=closed \
  --field state_reason=completed

gh api --method DELETE /repos/owner/repo/labels/stale
```

## Field types

```bash
--field key=value         # string (also coerces true/false/null/numbers)
-f key=value              # short form, same as --field
--raw-field key=value     # force string (never coerce)
-F key=value              # short form of --raw-field

# Nested / array fields
gh api --method POST /repos/owner/repo/issues \
  -f title="Issue" \
  -f 'labels[]=bug' -f 'labels[]=high-priority' \
  -f 'assignees[]=monalisa'
```

## Headers / body / input

```bash
gh api /user --header "Accept: application/vnd.github+json"
gh api /user --header "X-GitHub-Api-Version: 2022-11-28"
gh api --method POST /repos/owner/repo/issues --input issue.json   # full body from file
gh api --method POST /repos/owner/repo/issues --input -            # stdin
```

## Pagination

```bash
gh api /repos/owner/repo/issues --paginate               # concatenate arrays
gh api /repos/owner/repo/issues --paginate --slurp       # wrap pages in an array
gh api /repos/owner/repo/issues -F per_page=100 --paginate
```

## Output control

```bash
gh api /user --jq '.login'                               # filter with jq
gh api /user --jq '{login, id, name}'
gh api /repos/owner/repo --jq '.stargazers_count'
gh api /user --template '{{.login}} ({{.id}})'           # Go template

gh api /user --include                                   # show response headers
gh api /user --silent                                    # suppress body
gh api /user --verbose                                   # full request/response
gh api /user --cache 1h                                  # client-side cache
```

## Hostname / Enterprise

```bash
gh api /user --hostname enterprise.internal
GH_HOST=enterprise.internal gh api /user
```

## GraphQL

```bash
gh api graphql -f query='
  { viewer { login repositories(first: 5) { nodes { name } } } }
'

# With variables
gh api graphql \
  -F owner=monalisa -F repo=hello-world \
  -f query='
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        issues(first: 5, states: OPEN) { nodes { number title } }
      }
    }'

# GraphQL pagination
gh api graphql --paginate \
  -F owner=monalisa -F repo=hello-world \
  -f query='
    query ($owner: String!, $repo: String!, $endCursor: String) {
      repository(owner: $owner, name: $repo) {
        issues(first: 100, after: $endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes { number title }
        }
      }
    }'
```

## Common jq patterns

```bash
# Array → TSV
gh pr list --json number,title,author \
  --jq '.[] | [.number, .title, .author.login] | @tsv'

# Filter
gh issue list --json number,title,labels \
  --jq '.[] | select(.labels | map(.name) | index("bug"))'

# Count by field
gh pr list --state all --limit 500 --json state \
  --jq 'group_by(.state) | map({state: .[0].state, count: length})'

# Extract nested IDs
gh run list --json databaseId,conclusion \
  --jq '.[] | select(.conclusion=="failure") | .databaseId'

# Combine fields
gh repo view --json owner,name --jq '"\(.owner.login)/\(.name)"'
```

## Headers from response (rate limit, etc.)

```bash
gh api /rate_limit --jq '.rate'
gh api /user --include 2>&1 | grep -i x-ratelimit        # inspect headers
```
