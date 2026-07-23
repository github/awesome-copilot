# Local index and project Skill Stack Profiles

## Why both are needed

Progressive loading and project profiles solve different layers:

- **Progressive loading** controls how much of one available Skill enters context: metadata first, full instructions only after a match.
- **Project profile** controls which Skills should be considered first for one project and how they hand off.

They are complementary. A profile narrows the candidate set and routing before a match; progressive loading keeps the chosen Skill lightweight afterward.

When the client supports project-local Skill directories, installing to the project is the strongest scope control. A profile file alone expresses routing preferences but cannot force the underlying client to unload globally installed metadata.

## Standard local index

The index prevents installed Skills from becoming invisible inventory. Build it from all relevant roots and refresh it after installs, removals, or updates.

Each record contains:

- stable Skill name and source root;
- plain-language summary;
- aliases and capability terms for retrieval;
- global or project scope;
- last local modification time;
- internal Skill-file fingerprint;
- duplicate or metadata issues.

The index does not execute Skills and stores no prompts, hit rates, or usage history.

Build:

```bash
python3 scripts/skill_index.py build \
  --root ~/.codex/skills \
  --root ~/.codex/plugins/cache \
  --root .codex/skills \
  --root ~/.agents/skills \
  --root ~/.hermes/skills \
  --output ~/.codex/skill-index.json
```

Search:

```bash
python3 scripts/skill_index.py search \
  --index ~/.codex/skill-index.json \
  --query "natural Chinese writing" \
  --limit 8
```

Use the JSON result internally. Present only names, plain summaries, current scope, and recommendation status to a novice.

## Project profile

Store the selected stack at `<project>/.codex/skill-stack.json`.

The profile records:

- a plain project/profile name;
- active Skill names;
- simple intent-to-primary/supporting routes;
- profile-first behavior;
- whether searching outside the profile is allowed for uncovered needs.

Create a preview:

```bash
python3 scripts/project_profile.py \
  --project /path/to/project \
  --name my-project-stack \
  --skill primary-skill \
  --skill helper-skill \
  --route "main task=primary-skill" \
  --route "writing quality=helper-skill"
```

Repeat with `--apply` only after confirmation. Creating a profile does not install a Skill and does not grant new permissions.

## Profile routing

When a profile exists:

1. Match the request against profile routes and active Skills.
2. Use the profile primary Skill for the main task.
3. Add a helper only at its defined handoff.
4. Search outside the profile only when a required capability is missing or the user requests alternatives.
5. Keep unrelated global Skills out of the proposed stack even if their descriptions are broad.

Rebuild the local index and rerun the recall check after changing a profile.
