---
description: 'Detection-and-prevention rules for the most common mistakes AI coding agents make when editing an existing codebase: silently deleting tests, leaking secrets, breaking async/ORM/SQL safety, and oversized diffs. Apply when generating or editing code in any language.'
applyTo: '**'
---

# Coding Agent Anti-Patterns

Each rule below pairs a concrete detection command with a prevention rule, so the check is mechanical rather than a matter of remembering the guidance. Run the detection command after generating a diff; if it matches, the prevention rule was violated.

## Test integrity

- Never delete or skip an existing test to make a suite pass. Fix the code under test, not the test, unless the test itself has a verified bug. State the bug before changing it.
- Detect: a diff that removes test files or lowers the test count (`git diff --stat` on `test*/`, `*_test.*`, `*.test.*` paths).

## Secrets

- Never commit `.env` files, API keys, tokens, or connection strings. If a secret is staged, unstage it immediately; if it was already committed, rotate the secret before cleaning history.
- Detect: `git diff --cached --name-only | grep -E '\.env|secret|credential'`.
- In Next.js/React builds specifically: never prefix a server-only secret with `NEXT_PUBLIC_` (or any framework's client-exposed prefix). That ships it to every browser. Proxy through a server route instead.
- Detect: `grep NEXT_PUBLIC_ .env*` and check whether any matched value looks like a key or token.

## Database and query safety

- All queries must use parameterized queries or the ORM's query builder. Never concatenate user input into a SQL string, including via f-strings or template interpolation.
- Detect: `grep -rnE '"\s*\+.*(SELECT|INSERT|UPDATE|DELETE)'` and `grep -rn 'f".*SELECT.*{'`.
- Never edit a migration that has already been applied (merged to main or run against any real database). Add a new migration to change course.
- Detect: `git diff --name-only main | grep -i migrat` combined with checking whether that migration file existed before the current branch.
- Every relation access in an ORM loop needs eager loading (`select_related`/`prefetch_related` in Django, `includes`/`eager_load` in Rails, `.with` in Ecto, etc.) or it becomes an N+1 query.
- Detect: query-count assertions in tests, or `EXPLAIN`/debug-toolbar output showing one query per row.

## Async and error handling

- Inside async functions, use only async I/O. Blocking calls (sync file reads, `thread::sleep`, blocking HTTP clients) stall the whole runtime, not just the caller.
- Detect: in Rust/Tokio, `grep -rn 'std::fs::\|thread::sleep\|reqwest::blocking' src/` inside `async fn` bodies. In Node, `grep -rn 'fs\.readFileSync\|execSync'` inside async handlers.
- Never use `.unwrap()` (Rust) or an equivalent force-unwrap in a path reachable from a network request. A `None`/`Err` there panics or crashes the handler. Use `?`, `.map_err()`, or an explicit fallback.
- Catch specific exception/error types, not a bare `Exception`/`Error`. Re-raise what you cannot handle (`KeyboardInterrupt`, `SystemExit`, OOM signals).
- Every external call (HTTP, database, filesystem, third-party API) needs a timeout, error handling that does not crash the caller, and a fallback or explicit error surfaced to the user.

## Diff hygiene

- Make the smallest change that solves the problem. To fix one function, edit that function. Do not rewrite or reformat the whole file.
- Detect: `git diff --stat` shows a full file rewritten for what the task described as a small fix.
- One logical change per commit. Do not combine a refactor with a feature or a style pass; commit the refactor first, verify, then commit the feature.
- After changing a dependency manifest, run the install command and commit the updated lockfile in the same commit. A manifest change without a matching lockfile change breaks CI (`npm ci`, `uv sync --locked`, etc.) for every other contributor.
- Remove debugging output (`console.log`, `print`, `println!`, `dbg!`) before the final commit; use the project's logging framework for anything that should stay.

## Why this file exists

Frontier models already write idiomatic code for a given framework; what they don't reliably do on their own is apply the project's actual safety and hygiene constraints while editing someone else's codebase under time pressure. Each rule above exists because it is a pattern observed in real agent-produced diffs, not a hypothetical. Pairing a prevention rule with a grep-able detection command turns "please be careful" into something a CI step or a pre-commit hook can actually verify.
