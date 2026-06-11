# Step 3: List + categorize open threads

Sub-agent type: `explore`; budget: 5 min.

## Inputs

- `PrNumber`.

## Return contract

Table of rows, one per open thread:

```
{ thread_id, file, line, author, author_class, severity, summary }
```

Where `author_class` ∈ `copilot` | `human-or-bot`, derived from the
raw `author.login` (see Gotchas).

## Procedure

Run the listing script:

```pwsh
pwsh ./scripts/03-list-open-threads.ps1 -PrNumber <n>
```

This returns every unresolved review thread from **all reviewers**
(Copilot, humans, `github-advanced-security`, other bots). The script
emits `Path` as `<file>:<line>` when the comment is anchored to a
specific line (e.g. `src/foo.js:42`); when the comment has no line
anchor (file-level / PR-level comments), `Path` is just `<file>` with
no `:<line>` suffix. Callers should split on the last `:` **only when
the suffix parses as an integer**, and treat `Path` as the file alone
otherwise. For each row, classify the `author`:

- `copilot-pull-request-reviewer` or
  `copilot-pull-request-reviewer[bot]` → `author_class: copilot`
- everything else → `author_class: human-or-bot`

Pass the classified table to step 4 — the triage rubric depends on it.

## Gotchas

- **The `[bot]` suffix appears on some surfaces.** Match BOTH
  `copilot-pull-request-reviewer` AND
  `copilot-pull-request-reviewer[bot]` — they're the same actor.
- **Default human / advanced-security threads to `escalate-to-user` in
  step 4.** Classification here just flags them; triage applies the
  policy. See [04-triage.md](04-triage.md).
- **Unresolved is the source of truth.** Outdated-but-unresolved
  threads still show up — that's correct. Don't filter them out;
  they're handled like any other open thread in step 8.
