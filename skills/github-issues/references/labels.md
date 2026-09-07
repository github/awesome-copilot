# Labels

Labels are repository-scoped objects with a name, a color, and an optional
description. Applying a label to an issue and creating a label are separate
operations, so list a repository's labels before using them rather than assuming
a name exists.

The `gh label` and `gh issue` commands act on the current repository; add
`--repo {owner}/{repo}` to target another one. `gh api` has no `--repo` flag: it
fills the `{owner}` and `{repo}` placeholders from the current repository, so set
`GH_REPO={owner}/{repo}` or write the values into the path when working elsewhere.

The GitHub MCP server's label tools require the non-default `labels` toolset and
cannot add or remove an individual label on an issue, so this reference uses the
`gh` CLI throughout.

## List Labels

`gh label list` returns only the first 30 labels. Always pass `--limit` when the
result decides whether a label exists, or the answer will be wrong on any
repository with a larger label set.

```bash
gh label list --limit 1000
```

Search names and descriptions, and return structured output:

```bash
gh label list --limit 1000 --search "triage"
gh label list --limit 1000 --json name,color,description --jq '.[] | "\(.name) (#\(.color))"'
```

Sort by name instead of creation order:

```bash
gh label list --limit 1000 --sort name --order asc
```

## Create Label

Only the name is required. Color is six hex characters **without** a leading `#`;
a random color is assigned when it is omitted. Description must be 100
characters or fewer.

```bash
gh label create "needs-triage" \
  --color FBCA04 \
  --description "Awaiting maintainer review"
```

Creating a label that already exists fails. Use `--force` to create it or update
its color and description if it is already there, which makes seeding a label set
repeatable:

```bash
gh label create "needs-triage" --color FBCA04 --force
```

## Rename or Recolor Label

Send only what changes. `--name` sets the new name.

```bash
gh label edit "needs-triage" --name "triage"
gh label edit "triage" --color D93F0B --description "Awaiting maintainer review"
```

## Delete Label

Deleting a label removes it from every issue and pull request that carries it.
`--yes` is required when running without a prompt. Delete a label only when
explicitly requested.

```bash
gh label delete "triage" --yes
```

## Copy Labels Between Repositories

Clones the source repository's labels into the current one, skipping names that
already exist. `--force` overwrites them instead.

```bash
gh label clone {owner}/{source-repo}
```

## View an Issue's Labels

```bash
gh issue view {issue_number} --json labels --jq '.labels[].name'
```

## Add Labels to an Issue

Adds to the labels already on the issue. Repeat the flag for several labels.

```bash
gh issue edit {issue_number} --add-label "bug" --add-label "needs-triage"
```

## Remove Labels from an Issue

```bash
gh issue edit {issue_number} --remove-label "needs-triage"
```

## Replace All Labels on an Issue

`gh issue edit` adds and removes but cannot replace the whole set. Use the API
endpoint for that: `PUT` drops the existing labels and sets the ones supplied.

```bash
gh api repos/{owner}/{repo}/issues/{issue_number}/labels \
  -X PUT \
  -f 'labels[]=bug'
```

## Remove All Labels from an Issue

```bash
gh api repos/{owner}/{repo}/issues/{issue_number}/labels -X DELETE
```

## Default Labels

GitHub creates these labels in a new repository:
`accessibility`, `bug`, `documentation`, `duplicate`, `enhancement`,
`good first issue`, `help wanted`, `invalid`, `question`, `wontfix`.

Maintainers can rename or delete any of them, so check rather than assume. The
`isDefault` field separates them from labels the repository added:

```bash
gh label list --limit 1000 --json name,isDefault --jq '.[] | select(.isDefault | not) | .name'
```

## Usage Rules

- List the repository's labels before applying them, so the names used match the
  repository's existing taxonomy. Pass `--limit` when doing so; the default of 30
  silently hides the rest.
- Create a label explicitly, with a color and description, rather than relying on
  a name appearing as a side effect of labelling an issue.
- Color is six hexadecimal characters with no leading `#`.
- Description must be 100 characters or fewer.
- Use `--add-label` and `--remove-label` to change part of an issue's labels.
  They leave the other labels intact.
- Replace an issue's whole label set only when replacement is explicitly
  requested. Read the current labels first, and prefer add and remove otherwise:
  `PUT` discards every label not named in the call.
- Label names are matched case-insensitively and stored with the case given.
- Quote label names that contain spaces.
- Pass `--yes` to `gh label delete` when running without a prompt, and ask before
  deleting: the label disappears from every issue that carries it.
- Prefer issue types over labels for categorization when the organization has
  issue types configured.
