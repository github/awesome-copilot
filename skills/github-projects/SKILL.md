---
name: github-projects
description: 'Create and administer GitHub Projects (v2) boards via gh CLI and GraphQL — project creation, single-select fields and options, views, workflows, and idempotent issue seeding. Covers the evergreen-board pattern (releases as a field, not per-release projects) and the API walls that trip agents up: input-key casing, required option color+description, full-replace option semantics, view/grouping read-only limits, and workflow automation being UI-only. Triggers on "set up a project board", "create a release view", "add issues to a project", "seed a project", "rename a board field", or any board-admin task beyond adding/updating items.'
---

# GitHub Projects (v2) board administration

For adding/updating **items** on an existing board, the `github-issues`
skill's Projects V2 reference is often enough. This skill covers
**administering the board itself**.

## Model: evergreen board, releases as fields

- ONE long-lived org project per product. A release is a `Release`
  single-select OPTION + a filtered view — NOT a per-release project.
- Suggested fields: `Status` (Todo / In Progress / In Review / Done),
  `Release` (one option per cycle), plus one grouping field with
  human-readable options (workstream, area, epic — readable names, not
  plan-document codes).
- Mutations need the `project` scope: `gh auth refresh -s project`
  (default token usually has only `read:project` → `INSUFFICIENT_SCOPES`).

## Verified API walls (live-tested, 2026-08)

1. **Input keys are camelCase and inconsistent per mutation:**
   - `updateProjectV2Field(input: { fieldId, name?, singleSelectOptions? })`
     — `fieldId`; no projectId.
   - `createProjectV2View(input: { projectId, name, layout })` — `projectId`.
   - CLI `gh project item-edit` requires BOTH `--project-id` and `--id`.
2. **Every singleSelectOption requires name, color, AND description.**
   Valid colors (introspected enum): GRAY, BLUE, GREEN, YELLOW, ORANGE,
   RED, PINK, PURPLE. No TEAL/MAGENTA.
3. **`singleSelectOptions` REPLACES the full option list** (empty input is
   ignored, not cleared). To merge: read current options first, send the
   merged set. Renaming an option while keeping item stamps stable: send
   the same names (option IDs are preserved for unchanged names).
4. **View grouping/filter/sort are read-only via API** (community
   discussion 153532). Create views with layout only
   (`BOARD_LAYOUT` / `TABLE_LAYOUT` / `ROADMAP_LAYOUT`) and set group-by /
   filter in the web UI — a one-time manual step.
5. **Workflows (board automation) are read + delete via API only** —
   `updateProjectV2Workflow` does not exist (schema-introspected).
   Auto-add issues, "item added → set Status", and close-archiving are
   configured in the project's Workflows settings (web UI, one-time).

## CLI fast paths

```bash
# create org-owned project
gh project create --owner ORG --title NAME --format json

# inspect fields + option IDs
gh project field-list N --owner ORG --format json \
  --jq '.fields[] | {name, id, options}'

# create a single-select field
gh project field-create N --owner ORG --name Release \
  --data-type SINGLE_SELECT --single-select-options "v1.0.0,v1.1.0"

# rename field / replace options (GraphQL; full-replace semantics!)
gh api graphql -f query='mutation { updateProjectV2Field(input: {
  fieldId: "PVTSSF_…"
  name: "Workstream"
  singleSelectOptions: [
    {name: "Frontend", color: BLUE, description: "UI work"},
    {name: "Security", color: RED, description: "Hardening"}
  ]
}) { projectV2Field { ... on ProjectV2SingleSelectField { options { id name } } } } }'

# create views (layout only — group-by/filter are UI-only)
gh api graphql -f query='mutation { createProjectV2View(input: {
  projectId: "PVT_…", name: "vX Board", layout: BOARD_LAYOUT
}) { projectV2View { id name } } }'

# add + stamp items (idempotent add; item-edit prints nothing on success)
gh project item-add N --owner ORG \
  --url https://github.com/ORG/REPO/issues/42 --format json
gh project item-edit --project-id PVT_… --id PVTI_… \
  --field-id PVTSSF_… --single-select-option-id OPTION_ID

# read board workflows (enabled state)
gh api graphql -f query='{ organization(login: "ORG") { projectV2(number: N) {
  workflows(first: 10) { nodes { id name enabled } } } } }' \
  --jq '.data.organization.projectV2.workflows.nodes[]'
```

## Idempotent seeding pattern

`addProjectV2ItemById` returns the existing item on re-add, so seed
scripts are safe to re-run per release cycle. The bundled reference
script resolves field/option IDs dynamically each run (never hardcode
option IDs across cycles) and stamps `Release` + `Status` + grouping
field per issue: see [scripts/seed-project.mjs](scripts/seed-project.mjs).

## One-time manual UI steps (API cannot do these)

- Project → Workflows: enable **Auto-add issues** (filter: your repo),
  **Item added → Status = Todo**, optionally close-archiving.
- Per view: group by `Status` / grouping field, filter `Release = vX`.

## Common failure modes

| Symptom | Cause |
|---|---|
| `missing required scopes [project]` | Token lacks write scope → `gh auth refresh -s project` |
| `Argument 'fieldId' … required` on field update | Used `projectID` key — the field mutations take `fieldId` |
| `invalid value (TEAL)` | Color enum has only GRAY/BLUE/GREEN/YELLOW/ORANGE/RED/PINK/PURPLE |
| Options vanished after edit | `singleSelectOptions` replaces the whole list — merge, don't send partial |
| `project-id must be provided` | `gh project item-edit` needs `--project-id` alongside `--id` |
| Empty JSON error when scripting `item-edit` | Success prints nothing — don't parse its stdout |
