# Portable skill packaging

This directory is the distributable Agent Skill root. Publish or copy the **entire** `hands-on-learning-lab-builder/` directory, not only `SKILL.md`.

## Required package layout

```text
hands-on-learning-lab-builder/
  SKILL.md
  references/
    interview-protocol.md
    curriculum-standards.md
    instructor-behavior.md
    generation-rules.md
    acceptance-criteria.md
    template-map.md
    packaging.md
  assets/
    templates/
      README.md
      instructor-contract.md
      copilot-instructor.agent.md
      copilot-instructions.md
      codex-AGENTS.md
      claude-CLAUDE.md
      curriculum.md
      lesson.md
      progress.md
      learning-record.yaml
      decisions.md
```

## Path and reference rules

- Paths in `SKILL.md` are relative to the skill root; `references/*.md` links must resolve inside this directory.
- `references/template-map.md` maps bundled templates to paths **inside the newly generated learner repository**, not paths in the builder repository.
- Templates containing `course/...`, `.github/...`, `AGENTS.md`, or `CLAUDE.md` refer to the **generated repository root**, never to the skill installation location.
- Replace all `{{...}}` markers when generating the learner repository. Markers are intentional **inside the source templates**.
- Do not depend on the private builder repository's root `README.md`, `AGENTS.md`, `docs/`, `tests/`, or `examples/` when using the published skill.
- Keep reference answers separate from the learner workspace when meaningful; generated course materials are not included in the distributable skill package.

## Publication checks

1. Copy this skill directory alone to a temporary folder and verify all `SKILL.md` reference links resolve.
2. Confirm every template listed in `references/template-map.md` exists.
3. Confirm no secrets, private repository URLs, personal identifiers, or machine-specific absolute paths are bundled.
4. Run the applicable validation and build commands for the target publishing environment, if available; report the commands, results, and any skipped checks accurately.
5. Run a fresh generation exercise with the intended assistant before claiming runtime validation. Record the learner brief, environment, observed behavior, and any untested assistant handoffs. Inspecting files alone is not execution proof.

The package contains source instructions and templates, not a generated learner lab or a requirement for any particular cloud account.
