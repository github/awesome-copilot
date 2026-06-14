# Privacy rules

These rules are enforced in code, not left to judgement.

## Defaults

- **Public repositories only.** Private repositories are excluded unless the user passes
  `--include-private`. (Private support is not in Phase 1.)
- **Read-only.** The tool only issues `GET` requests via `gh api`. It never calls a mutating
  endpoint and never modifies a repository.
- **No token handling.** Tokens are never read into config and never written anywhere.
  Authentication is delegated to `gh`. Tokens must never appear in logs or output.

## When private repos are included (later phase)

- Write output only to a local cache directory, and ensure that directory is gitignored
  (`github-inventory/`, `.inventory-cache/`).
- Mark every private record `"private": true` and `"visibility": "private"`.
- Do **not** copy full private README content into shareable reports. Store a redacted
  summary or omit it; set `readme.redacted = true`.
- Warn (in `warnings.json` and to the user) before writing any private information outside
  the cache directory.

## Shareable output

`PROJECTS.md` and `examples/` artifacts are intended to be shareable. They must never contain
private repository content.
