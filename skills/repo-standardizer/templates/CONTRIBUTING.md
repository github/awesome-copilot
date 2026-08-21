# Contributing

Thanks for your interest in contributing! Please take a moment to read this
guide so your contribution goes smoothly.

## Getting started

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Make your changes and commit them with a clear message.
4. Push and open a pull request against the default branch (`main` for
   most repos).

## Pull request checklist

- [ ] The PR description explains what and why.
- [ ] Tests pass locally (`npm test` / `pytest` / `go test` ...).
- [ ] New behavior is covered by tests.
- [ ] Documentation is updated if user-facing behavior changed.

## Issue conventions

- Use the issue forms: bug reports, feature requests, questions.
- Label your issue with the matching `bug` / `enhancement` / `P0`–`P3` label.

## Commit style

Use conventional commits **with a scope**: `type(scope): description`

```
feat(labels): add tier labels
fix(ci): correct release workflow
```

Common types: `feat` `fix` `docs` `chore` `refactor` `test` `ci` `perf`.
Scope = the area you touched (module, file, subsystem).

Examples:

```
feat(labels): add tier labels
fix(ci): correct release workflow
fix(docx): update README.md
docs(readme): explain installation
chore(ci): bump action version
```

## Code style

Match the existing style of the project (linter configs are included).
When in doubt, run the linter before pushing.

## Questions?

Open a discussion or ask in a `question` issue. We're friendly!
