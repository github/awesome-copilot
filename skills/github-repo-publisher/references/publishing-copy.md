# Publishing Copy

Use this reference for PR titles and bodies, release notes, changelogs, GitHub Discussions, and issue announcements.

## PR Titles

Prefer:

- `Add <capability>`
- `Fix <user-visible bug>`
- `Update <area> documentation`
- `Refactor <area> to <reason>` only when behavior is intentionally unchanged.

For agent-authored PRs, use the repository's preferred agent prefix, such as `[agent] <summary>`, only when the repo or user prefers that convention. Keep titles under about 72 characters when practical.

## PR Bodies

Include:

- Summary of what changed.
- Why it changed or root cause for fixes.
- Validation performed, including commands and important results.
- Screenshots or before/after notes for UI/docs where useful.
- Risks, migrations, or follow-ups.

Avoid:

- Long implementation diary.
- Test claims for commands that were not run.
- Hiding uncertainty. Say "Not run" with the reason.

Template:

```markdown
## Summary
- 

## Validation
- 

## Notes
- 
```

## Release Notes

Release notes are tied to GitHub releases and tags. Confirm the tag, target commit, version, assets, and changelog source before drafting or publishing.

Group by user impact:

- Added
- Changed
- Fixed
- Removed
- Security

Write for users, not only maintainers. Mention upgrade steps, breaking changes, deprecations, and migration commands when real. Do not include internal refactors unless they affect users or contributors.

GitHub automatically generated release notes can be used as a starting point, but edit them for user impact, breaking changes, upgrade notes, and missing context before publishing.

Prefer Semantic Versioning when the project already follows or can reasonably adopt `MAJOR.MINOR.PATCH`. Do not invent version numbers, dates, tags, or compatibility guarantees.

## Issues and Discussions

Use issues for actionable work with reproduction steps, expected behavior, actual behavior, environment, and proposed fix. Use discussions for announcements, design options, questions, or community feedback.

When drafting:

- State the context in the first paragraph.
- List exact acceptance criteria for implementation work.
- Include links or file references when available.
- Label uncertainty as open questions.

## Issue and PR Templates

- Audit for bug report, feature request, and pull request templates when assessing public repository readiness.
- Recommend issue forms or templates when issues need structured environment, reproduction, expected behavior, and actual behavior fields.
- Recommend a PR template when reviewers need consistent summary, validation, screenshots, risks, or migration notes.
- Do not create or rewrite templates unless the user explicitly asks for that artifact.

## Changelog Entries

Prefer concise entries that map to real commits or PRs. Do not fabricate version numbers, dates, contributors, or links.

Use Keep a Changelog-style categories when practical:

- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security

Do not use raw git logs as user-facing changelogs. Conventional Commits can inform grouping and automation, but do not force the convention onto a repository that does not use it.
