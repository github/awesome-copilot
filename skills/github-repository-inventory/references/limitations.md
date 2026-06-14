# Known limitations

Honesty about gaps is a core feature. These limitations are surfaced in `warnings.json`.

## Coverage gaps

- **Not "everything you ever touched."** The inventory only includes repositories for which
  GitHub currently exposes access or contribution evidence. Deleted repositories, repos made
  private, unmatched commit emails, and expired permissions all create silent gaps.
- **Commit contributions cover ~the last year only.** `commit-contributor` evidence comes
  from GitHub's `contributionsCollection`, which defaults to roughly a one-year window and
  caps at 100 repositories; older or overflow commit activity is not counted. Both limits are
  flagged in `warnings.json`.
- **Collaborator/organization and private repos are opt-in.** They are discovered only with
  `--include-accessible` / `--include-private` respectively; the default scan is owned +
  public contributions. Private repositories have their README content redacted and must be
  written to a gitignored directory (the tool warns otherwise).
- **Search API cap.** Contribution discovery uses `/search/issues`, which caps at 1000
  results and is rate-limited (~30 req/min). Truncation is recorded as `search-truncated`.

## Inspection depth

- README presence and top-level structure only. No full file tree, no commit history, no code
  download.
- Primary `language` comes from the repo metadata; per-language byte percentages are a later
  phase.

## API realities

- **Pagination.** `gh api --paginate --slurp` returns an array of pages, not a merged array;
  the code flattens it. `--slurp` cannot be combined with `--jq`.
- **Rate limits.** A truncated scan is recorded in `warnings.json` rather than silently
  returning partial data as if complete.
- **Empty repos / missing README.** A `404` from the README endpoint means "no README," not
  an error; it is recorded as `readme.present = false`.
