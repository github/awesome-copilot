# Copilot resource QA checklist

Use this as a field-level companion to `SKILL.md`. Mark each item `pass`, `fail`, or `n/a`.

## Agents (`*.agent.md`)

- [ ] Markdown frontmatter parses as YAML
- [ ] `description` present and non-empty
- [ ] Human-readable `name` present (recommended)
- [ ] `model` present (strongly recommended)
- [ ] `tools` considered / present when the persona needs tools
- [ ] Filename is lowercase with hyphens + `.agent.md`
- [ ] Body defines role, expertise, approach, constraints
- [ ] No secrets in examples

## Instructions (`*.instructions.md`)

- [ ] Frontmatter parses as YAML
- [ ] `description` present and non-empty
- [ ] `applyTo` present with concrete globs
- [ ] Globs match the intended file types (spot-check paths)
- [ ] Filename is lowercase with hyphens + `.instructions.md`
- [ ] Guidance is specific (not generic “write clean code”)
- [ ] No contradictory rules inside the same file

## Skills (`skills/<name>/SKILL.md`)

- [ ] Folder contains `SKILL.md`
- [ ] `name` matches folder name
- [ ] `name` is lowercase hyphenated, length ≤ 64
- [ ] `description` length roughly 10–1024 characters
- [ ] Description includes what + when / trigger phrases
- [ ] Bundled assets referenced from instructions
- [ ] Each bundled asset ≤ 5MB
- [ ] No placeholder sections left unfilled

## Hooks (`hooks/<name>/`)

- [ ] `README.md` with `name` and `description`
- [ ] `hooks.json` present with valid events
- [ ] Scripts referenced and appear executable where required
- [ ] Folder name lowercase with hyphens
- [ ] Privacy-sensitive logging called out if present

## Agentic workflows (`workflows/*.md`)

- [ ] `name` and `description` present
- [ ] `on` and `permissions` present
- [ ] Permissions look least-privilege
- [ ] Safe outputs preferred over broad write access
- [ ] Filename lowercase with hyphens
- [ ] No compiled `.yml` / `.lock.yml` submitted as the source of truth

## Plugins (`plugins/<name>/`)

- [ ] `plugin.json` present
- [ ] `$schema` set to Agent Plugins schema
- [ ] `name` matches folder name
- [ ] `description` and semver `version` present
- [ ] Composition paths resolve to existing sources
- [ ] MCP config (if any) lives in `mcp.json`
- [ ] `README.md` present for human discovery (recommended)

## Cross-cutting

- [ ] Clear uplift over base-model defaults
- [ ] No duplicate `name` collisions in scope
- [ ] No conflicting instruction overlaps without justification
- [ ] Responsible AI / security policy fit
- [ ] Smoke prompts proposed for each reviewed resource
