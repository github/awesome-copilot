The following instructions are only to be applied when performing a code review.

Use `.github/skills/code-review/SKILL.md` for repository-fit, differentiation,
provenance, validation, and editorial-quality review criteria. Apply the
deterministic file-format checks below as well.

Frontmatter must be valid YAML and satisfy the required fields, types, lengths,
and naming rules. Accept any valid YAML scalar style (plain, single-quoted,
double-quoted, literal, or folded); do not flag a value solely because it is not
single-quoted.

## README updates

- [ ] The new file should be added to the `docs/README.<type>.md`.

## Prompt file guide

**Only apply to files that end in `.prompt.md`**

- [ ] The prompt has markdown front matter.
- [ ] The prompt has a `agent` field specified of either `agent`, `ask`, or `Plan`.
- [ ] The prompt has a `description` field.
- [ ] The `description` field is not empty.
- [ ] The file name is lower case, with words separated by hyphens.
- [ ] Encourage the use of `tools`, but it's not required.
- [ ] Strongly encourage the use of `model` to specify the model that the prompt is optimised for.
- [ ] Strongly encourage the use of `name` to set the name for the prompt.

## Instruction file guide

**Only apply to files that end in `.instructions.md`**

- [ ] The instruction has markdown front matter.
- [ ] The instruction has a `description` field.
- [ ] The `description` field is not empty.
- [ ] The file name is lower case, with words separated by hyphens.
- [ ] The instruction has an `applyTo` field that specifies the file or files to which the instructions apply. If they wish to specify multiple file paths they should formatted like `'**.js, **.ts'`.

## Agent file guide

**Only apply to files that end in `.agent.md`**

- [ ] The agent has markdown front matter.
- [ ] The agent has a `description` field.
- [ ] The `description` field is not empty.
- [ ] The file name is lower case, with words separated by hyphens.
- [ ] Encourage the use of `tools`, but it's not required.
- [ ] Strongly encourage the use of `model` to specify the model that the agent is optimised for.
- [ ] Strongly encourage the use of `name` to set the name for the agent.

## Agent Skills guide

**Only apply to folders in the `skills/` directory**

Review `SKILL.md` against the [Agent Skills specification](https://agentskills.io/specification),
not just general YAML syntax. Valid YAML alone is insufficient: parsed values must
meet the specification's field types, structure, and constraints. Scalar style is
not itself a defect. The repository's 10-character description minimum is an
additional requirement beyond the specification's 1-character minimum.

- [ ] The skill folder contains a `SKILL.md` file.
- [ ] The SKILL.md has markdown front matter.
- [ ] The SKILL.md has a `name` field.
- [ ] The `name` field is a string of 1-64 characters using lowercase letters, numbers, and hyphens, with no leading, trailing, or consecutive hyphens.
- [ ] The `name` field matches the folder name.
- [ ] The SKILL.md has a `description` field.
- [ ] The `description` field is a string, at least 10 characters and maximum 1024 characters, describing what the skill does and when to use it.
- [ ] If present, `license` is a string identifying a license or referencing a bundled license file.
- [ ] If present, `compatibility` is a string of 1-500 characters describing environment requirements.
- [ ] If present, `metadata` is a mapping from string keys to string values (for example, quote a version if needed to keep it a string).
- [ ] If present, `allowed-tools` is a space-separated string, not a YAML sequence (experimental).
- [ ] The folder name is lower case, with words separated by hyphens.
- [ ] Any bundled assets (scripts, templates, data files) are referenced in the SKILL.md instructions.
- [ ] Bundled assets are reasonably sized (under 5MB per file).

## Plugin guide

**Only apply to directories in the `plugins/` directory**

- [ ] The plugin directory contains a root `plugin.json` file.
- [ ] The plugin directory contains a `README.md` file.
- [ ] The plugin.json has a `name` field matching the directory name.
- [ ] The plugin.json has a `description` field.
- [ ] The `description` field is not empty.
- [ ] The directory name is lower case, with words separated by hyphens.
- [ ] If `tags` is present, it is an array of lowercase hyphenated strings.
- [ ] If `items` is present, each item has `path` and `kind` fields.
- [ ] The `kind` field value is one of: `prompt`, `agent`, `instruction`, `skill`, or `hook`.
- [ ] The plugin does not reference non-existent files.
