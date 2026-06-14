# Repository record schema (human summary)

The authoritative schema is
[`schemas/repository-inventory.schema.json`](../../../schemas/repository-inventory.schema.json).
This file summarizes it.

## Catalog wrapper (`catalog.json`)

| Field | Notes |
|---|---|
| `schema_version` | e.g. `"0.1.0"`. |
| `generated_at` | UTC ISO-8601 timestamp. |
| `account` | `{ login }` of the authenticated user. |
| `scan` | The flags used: `include_private`, `affiliation`, `visibility`, `sources[]`. |
| `repositories[]` | Sorted by `full_name` for deterministic output. |

## Repository record

Phase 1 always populates: `name`, `owner`, `full_name`, `url`, `description`, `homepage`,
`visibility`, `private`, `archived`, `fork`, `is_template`, `default_branch`, `created_at`,
`updated_at`, `pushed_at`, `language`, `topics` (sorted), `license`, `stargazers_count`,
`forks_count`, `readme` (`present`/`path`/`size`/`content`), `top_level[]` (sorted by name),
`relationships[]`, `discovered_via[]`, `last_scanned_at`.

Phase 2 also populates: `manifests` (root-level manifest filenames, sorted),
`technologies[]` (`{name, evidence, confidence}`, sorted by name; manifest-backed = high,
primary language = medium), and `project_type` (classified enum).

Reserved for later phases (optional): `language_percentages`.

## Determinism

Identical input must produce byte-identical output. `repositories` is sorted by `full_name`;
`topics`, `top_level`, and `discovered_via` are sorted; JSON is written with sorted keys and
a trailing newline. The rendering tests depend on this.
