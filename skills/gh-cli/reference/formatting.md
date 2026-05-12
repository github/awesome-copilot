# Output formatting — `--json`, `--jq`, `--template`

Most `gh` list/view commands support structured output. Use these instead of scraping text.

## Global flags

| Flag | Purpose |
|------|---------|
| `--json FIELDS` | Output JSON with selected fields (comma-separated). Use `--json` with no value to see available fields. |
| `--jq EXPR` | Apply a jq expression to the JSON response |
| `--template STR` | Format the JSON with a Go text/template |
| `--paginate` | Follow pagination (REST & `gh api`) |

## Discover available fields

```bash
gh pr list --json                    # lists the field names you can request
gh issue view 123 --json             # same, for a single issue
gh run list --json
```

## JSON examples

```bash
gh repo view --json name,description,defaultBranchRef
gh pr list --json number,title,author,headRefName --limit 100
gh issue list --json number,title,labels --limit 200
```

## jq patterns

```bash
# Single field extraction
gh repo view --json name --jq '.name'
gh auth status --json hosts --jq '.hosts | keys'

# Array → TSV (good for xargs / column)
gh pr list --json number,title,author \
  --jq '.[] | [.number, .title, .author.login] | @tsv'

# Filter by label
gh issue list --json number,title,labels \
  --jq '.[] | select(.labels | map(.name) | index("bug")) | {number, title}'

# Status check rollup
gh pr view 123 --json statusCheckRollup \
  --jq '.statusCheckRollup[] | {name, status, conclusion}'

# Group/aggregate
gh pr list --state all --limit 500 --json state \
  --jq 'group_by(.state) | map({state: .[0].state, count: length})'

# Numeric comparison
gh repo list --json name,stargazerCount \
  --jq '.[] | select(.stargazerCount > 100) | .name'
```

## Go templates

Use when the shell doesn't have jq, or you want direct text output without quoting.

```bash
gh repo view --template '{{.name}}: {{.description}}{{"\n"}}'

gh pr view 123 --template '
Title:  {{.title}}
Author: {{.author.login}}
State:  {{.state}}
URL:    {{.url}}
'

# Loop over an array
gh pr list --template '{{range .}}#{{.number}} {{.title}} ({{.author.login}}){{"\n"}}{{end}}'

# Conditional
gh pr list --template '{{range .}}{{if .isDraft}}[DRAFT] {{end}}#{{.number}} {{.title}}{{"\n"}}{{end}}'
```

Template helpers built into `gh`: `autocolor`, `color`, `hyperlink`, `join`, `pluck`, `tablerow`, `tablerender`, `timeago`, `timefmt`, `truncate`.

```bash
gh pr list --template \
  '{{range .}}{{tablerow (printf "#%v" .number) .title .author.login}}{{end}}{{tablerender}}'
```

## When to use which

- `--jq` — filtering, shaping, aggregation; requires JSON output.
- `--template` — clean human-readable text without jq installed.
- Raw JSON (no jq/template) — piping into another tool like `python -m json.tool` or another `jq` invocation.
