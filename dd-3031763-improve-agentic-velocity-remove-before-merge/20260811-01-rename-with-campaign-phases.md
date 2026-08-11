# Rename shepherd-task skills with ordered campaign phases

Work autonomously in the current `awesome-copilot` repository. Implement the complete rename described below. Do not merely report what should change.

## Objective

Make the ordered shepherd-task campaign lifecycle discoverable from skill names by applying these exact renames:

| Current name | New name |
|---|---|
| `shepherd-task-create-ignorance-reduction-plan` | `shepherd-task-10-create-ignorance-reduction-plan` |
| `shepherd-task-create-issues-from-plan` | `shepherd-task-20-create-issues-from-plan` |
| `shepherd-task-from-assignment-to-ready` | `shepherd-task-30-from-assignment-to-ready` |
| `shepherd-task-from-ready-to-merged-to-base` | `shepherd-task-40-from-ready-to-merged-to-base` |
| `shepherd-task-create-post-mortem` | `shepherd-task-50-create-post-mortem` |

Do **not** rename `shepherd-task-approve-workflows-and-wait-for-completion`. It is a reusable helper rather than an ordered campaign stage.

## Required implementation

1. Read the complete shepherd-task system before editing:
   - `skills/shepherd-task*/**`
   - `plugins/shepherd-task/**`
   - repository documentation, manifests, generated indexes, and scripts that reference any old name

2. Rename each of the five skill directories under `skills/` with `git mv`. Preserve every bundled example and asset beneath the renamed directory.

3. In each renamed `SKILL.md`:
   - Set frontmatter `name` to the exact new directory name.
   - Preserve the skill's behavior, inputs, outputs, and safety rules.
   - Update self-references and cross-skill references to the new names.
   - Make the lifecycle position explicit in the description and introductory prose:
     - stage 10: campaign planning
     - stage 20: creation of ordered implementation issues
     - stage 30: each issue from assignment through the boundary immediately before Ready for review
     - stage 40: each issue from Ready for review through merge to the campaign base branch
     - stage 50: campaign post-mortem after success or failure
   - Do not imply that all users must execute stages 10 and 20 when suitable issues already exist.
   - Do not imply that stage 50 runs only after success.

4. Update all exact skill invocations and references in both Bash and PowerShell implementations, including:
   - phase 30 and phase 40 prompts in `shepherd-task.sh` and `shepherd-task.ps1`
   - stage 50 prompts in both `shepherd-task-given-list` scripts
   - stage 20 prompts, comments, display text, generated prompt filenames, generated invocation filenames, and cleanup patterns in both interview scripts and both uninstallers
   - skill lists in both installers and both uninstallers
   - references in helper skills and examples

5. Update `plugins/shepherd-task/.github/plugin/plugin.json` paths for every renamed skill already declared in the manifest. Preserve the manifest's existing scope: this rename must not independently add or remove plugin members.

6. Update all shepherd-task user-facing documentation and diagrams:
   - `plugins/shepherd-task/README.md`
   - `plugins/shepherd-task/figure-*.md`
   - installation examples, invocation diagrams, per-file manifests, validation examples, architecture descriptions, and lifecycle prose
   - Clearly define the ordered campaign stages 10, 20, 30, 40, and 50, and identify the unnumbered workflow-approval skill as a helper.

7. Update any other tracked references found by exhaustive search. This includes references outside `plugins/shepherd-task` and `skills/shepherd-task*`.

8. Regenerate repository-owned generated files with the existing build command rather than manually maintaining generated indexes. In particular, ensure `docs/README.skills.md` and marketplace output reflect the renamed paths and names.

## Compatibility and scope

- This is an intentional identifier rename. Do not create duplicate legacy skill directories, aliases, forwarding skills, symlinks, or compatibility wrappers.
- Do not rename the `shepherd-task` plugin, orchestration script filenames, log-directory conventions, phase artifact filenames, or the unnumbered helper skill.
- Generated interview artifact filenames that embed the stage-20 skill name must use the new name.
- Preserve Bash/PowerShell behavioral parity.
- Avoid unrelated wording or behavioral changes.
- Do not edit campaign artifacts under `dd-3031763-improve-agentic-velocity-remove-before-merge/`, including this prompt.

## Validation

Run all of the following and fix every failure caused by the rename:

```bash
npm run skill:validate
npm run plugin:validate
npm run build
bash eng/fix-line-endings.sh
```

Also:

1. Run `bash -n` on every `.sh` file changed by this work.
2. If `pwsh` is available, parse or syntax-check every changed `.ps1` file without installing or uninstalling anything.
3. Re-run `npm run skill:validate` and `npm run plugin:validate` after the build and line-ending normalization.
4. Use an exhaustive tracked-file search to verify that none of these old identifiers remain:

```text
shepherd-task-create-ignorance-reduction-plan
shepherd-task-create-issues-from-plan
shepherd-task-from-assignment-to-ready
shepherd-task-from-ready-to-merged-to-base
shepherd-task-create-post-mortem
```

5. Verify that each new skill directory exists, each old directory is absent, every `SKILL.md` frontmatter name exactly matches its directory, and all plugin manifest paths resolve.
6. Inspect `git status` and the final diff to ensure renames are represented cleanly and no unrelated files changed.

## Completion report

Report:

- the five completed renames;
- the invocation, installer, manifest, documentation, and generated-file surfaces updated;
- validation commands and outcomes;
- any remaining old-name match, only if it is unavoidable, with its exact path and justification.
