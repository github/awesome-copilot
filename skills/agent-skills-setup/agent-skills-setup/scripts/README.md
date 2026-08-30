# Scripts

`smart-ide-migration.sh` is the public wrapper. Its profile-aware commands are
`detect`, `inventory`, `plan`, `apply`, `verify`, and `rollback`. Always save a
plan with `plan --output plan.json`; `apply plan.json --yes` verifies the plan
checksum, Registry digest, adapter versions, resolved source/target state, and
Git HEAD before any write. Apply emits a checksummed manifest with exact
backups. `--json` reserves stdout for one JSON document and sends diagnostics
to stderr.

Legacy discovery and dry-run compatibility require the explicit `legacy`
subcommand. Calls beginning with implicit legacy flags are rejected. Every
`legacy --yes` write fails before the retained compatibility engine runs; use a
saved profile-aware plan. The legacy engine rejects ordinary direct execution.

The Skill declares local environment lookup, file-read, file-write, and bundled
shell/Python capabilities only; generic migration requests authorize planning,
while apply and rollback require separate explicit user approval.
MCP targets that are symbolic links fail before conversion. Redaction cleanup
can remove only the exact target artifacts; copied-skill cleanup must remain
inside its canonicalized target copy root.

`scan-skill-secrets.py` checks every regular source file before a Skill copy and
reports only relative paths and reason categories, never credential values.
`ide-paths.tsv` is generated from `references/ide-paths.json`; regenerate it
with `sync-ide-reference-summaries.py`, never edit it directly. `common.sh` is
an internal helper.

`check-doc-freshness.py` validates source/freshness metadata and provenance
offline without network access. It verifies schemas, official HTTPS source
declarations, and verified_at freshness boundaries locally.

`test-*.sh` files are maintainer regression suites run by `bash validate-all.sh`,
not local-IDE migration commands. Legacy converter suites opt into the private
guard explicitly; `test-legacy-registry-gate.sh` covers the public boundary.
