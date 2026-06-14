# Relationship model

Access to a repository is **not** the same as having contributed to it. This skill records
the user's relationship to each repo as a list of `{ type, evidence, confidence }` entries.
A repo can carry several relationships.

## Vocabulary

| Type | Meaning | Typical evidence |
|---|---|---|
| `owner` | The authenticated user owns the repo. | `owner.login == user` |
| `collaborator` | Explicit collaborator permission. | repo permissions |
| `organization-member` | Access via org membership. | org membership |
| `fork-owner` | User owns a fork of another repo. | `fork == true` and owner match |
| `commit-contributor` | Authored commits. | contributor list / commit author |
| `pull-request-author` | Opened pull requests. | PR search `author:` |
| `pull-request-reviewer` | Reviewed pull requests. | PR review search |
| `issue-author` | Opened issues. | issue search `author:` |
| `unknown-access` | Repo is accessible but the basis is unclear. | fallback |

## Confidence

- `high` — direct, unambiguous evidence (ownership, a manifest dependency, an authored PR).
- `medium` — strong but indirect evidence.
- `low` — weak signal (e.g. a README mention).

## Current scope

The scan discovers **owned** repositories plus external repositories with **public
contribution evidence**: `pull-request-author`, `pull-request-reviewer`, and `issue-author`
(Search API), and `commit-contributor` (GraphQL `contributionsCollection`, ~last year). All
are high confidence with a count in the evidence string. With `--include-accessible`,
`collaborator` and `organization-member` (access) are added. A repo can carry several
relationships — e.g. a repo you `collaborator` on *and* committed to is both `collaborator`
and `commit-contributor`; these are merged.

Contribution is never inferred from mere access. Known limits (recorded in `warnings.json`):
commit contributions only cover ~the last year, and the GraphQL repo list is capped at 100.
