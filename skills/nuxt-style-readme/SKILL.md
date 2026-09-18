---
name: nuxt-style-readme
description: 'Writes and refines a repository''s README.md in a concise, Nuxt-inspired documentation style: sections chosen from what the repository actually contains, scannable feature bullets, emoji-anchored headings, and a banner, badges, and docs links only when the repository provides them. Use this skill when the user wants a README created, rewritten, restructured, tightened, polished, or brought up to date after the code changed, when they want a project''s front page documentation improved or made consistent with their other repositories, or when they point you at a repo and ask what its README should say, even if they never use the word "README". Applies to repositories in any language or framework. Do not use it for changelogs, release notes, API reference, contributing guides, standalone documentation pages, or marketing copy.'
---

# Nuxt-style README

Produce a README that carries a new reader from "what is this" to "it works on my machine" with nothing in the way.

The style is descended from the Nuxt ecosystem: short introduction, feature-oriented presentation, fast path to first success, clear next steps, minimal ceremony. Two things separate it from a generic README. Sections are chosen from evidence in the repository rather than from a fixed template, and every claim traces back to a file you actually read.

## Non-negotiables

These hold on every run, for every repository.

- **Evidence or omission.** Every command, package name, environment variable, option, path, version requirement, and capability claim must come from a file you read in this repository. If you cannot point at the source, leave it out.
- **Chrome is found, never fabricated.** A banner appears only when the repository carries the asset or the user provides one. A badge block appears only for a published package with a release path, or when the user supplies badges, and every badge states a fact the repository proves. A Documentation or Playground bullet appears only when the target exists. Never invent an asset path, a badge, or a link.
- **No invented imagery.** Never fabricate a screenshot, logo, or diagram. Imagery that genuinely explains something stays unless the user asks for its removal.
- **`## Features` takes no emoji.** Neither does `## Background` or `## Why?`. Every other user-facing H2 takes one.
- **Every feature bullet takes an emoji.** See the format below.
- **Sections are earned.** A section exists because the repository gives you something real to put in it. Never add one to look thorough.
- **No em dashes or en dashes as punctuation, and no semicolons in prose.** Rewrite the sentence. This does not apply to code, commands, paths, package names, URLs, versions, or quoted material, where the character is part of the content.

## Workflow

### 1. Read the repository

Do not work from the existing README alone. It is a claim about the project, not evidence. Read it first so you know what it asserts, then carry a line forward only after you have verified it against a file.

If it carries generator markers such as `<!-- commands -->`, `<!-- ALL-CONTRIBUTORS-LIST:START -->`, or `<!-- START doctoc -->`, a script owns that block. Leave the markers and everything between them untouched, even when the content breaks a rule here, and tell the user instead.

Read what materially describes how the project works, which usually includes package manifests and lockfiles, workspace configuration, entry points (CLI, application, or public API), source that implements the headline behavior, configuration files and schemas, environment variable definitions, scripts, tests, examples and playgrounds, CI workflows, release configuration, the license file, and any existing contributing or architecture documentation.

Read the scripts block before you document a single command. Inventing `npm test` for a repository that uses `bun test` is the most common way this task fails.

The lockfile picks the package manager for every command run inside the repository. `bun.lock` or `bun.lockb` means `bun`, `pnpm-lock.yaml` means `pnpm`, `yarn.lock` means `yarn`, `package-lock.json` means `npm`, and a `packageManager` field in the manifest overrides all of them. The same logic applies outside JavaScript, where `uv.lock` means uv, `poetry.lock` means Poetry, and `Gemfile.lock` means Bundler. The install line a consumer runs against a published package is not bound by this.

Use version control history only to settle a specific question, such as whether documented behavior is current. Stop once the question is answered.

You are answering: what does this do, who is it for, what is the shortest path to it working, how is it normally used, what can be configured, what are its real constraints, how do contributors work on it, and what is its license.

### 2. Decide the sections

Read `references/section-rules.md` now, before choosing an outline. It gives an inclusion test for every optional section and the default ordering.

Resolve ordinary choices yourself from repository evidence and the rules in this skill. Do not ask the user which sections they want.

### 3. Draft

Read `references/style-guide.md` before writing prose. It covers opening chrome formats, heading and emoji conventions, tables, code blocks, diagrams, linking, tone, and license wording.

Read `assets/readme-template.md` only when you are building a README from nothing or substantially restructuring one. It is a skeleton of optional parts, not a form to fill in. Skip it when you are making a targeted revision.

When refining an existing README, preserve what already works. A strong README should receive small, surgical edits, not a rewrite. Chrome follows the inclusion tests, not the incumbent README: strip badges stating unproven facts, banners with no committed asset, and Documentation or Playground bullets with dead targets, and say so in your summary. Keep the chrome the repository earns, normalized to the format in `references/style-guide.md`.

### 4. Verify

Before you finish, check each of these against the repository:

- Every command appears in the manifest scripts, a CI workflow, or documented tooling.
- Package names, import paths, and subpath exports match the manifest exactly.
- Version and runtime requirements match what the manifest or CI declares.
- Relative links resolve to files that exist. Prefer `./path` form.
- The banner asset exists at the referenced path, every badge states a proved fact, and the Documentation and Playground bullets resolve.
- The license statement matches the LICENSE file, or the manifest `license` field when there is no LICENSE file. Never infer a license, and never write MIT because it is common.
- No section is empty, and no section restates one above it.
- Markdown renders: fenced blocks closed, tables aligned, alert syntax exact.
- Reread once end to end for flow and concision, and cut anything a reader could infer.

If you used any GitHub alert, confirm the current syntax, the supported types, and the usage limits against `https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax`. `references/style-guide.md` records what that page said when this skill was written, which is a starting point and not a substitute for checking. If you cannot reach the page, use the recorded rules and say plainly that live verification was unavailable. Never claim you verified something you did not.

Review the final diff. The only file that should have changed is the README, plus anything the user explicitly asked for.

## The opening

The first elements, in this order, with nothing before them:

1. Banner image, only when the repository provides the asset, linked to the documentation site when one exists.
2. Badge block, only badges whose facts the repository proves, in the format from `references/style-guide.md`.
3. `# Title`. Use the exact package name for a publishable package, otherwise a readable product name.
4. One sentence saying what the project is. Concrete, no marketing.
5. Documentation and Playground bullets, only when the targets exist, in the format from `references/style-guide.md`.
6. At most one GitHub alert, and only when a legal, safety, or scope caveat changes how someone should use the project.
7. The first H2 the repository earns, in the order from `references/section-rules.md`. Usually that is `## Features`.

A leading alert can carry the one-sentence description itself when the caveat and the description are the same thought, which is common for private or license-constrained packages.

## Feature bullets

```markdown
- 🎯 **Feature name:** One sentence stating the concrete capability or benefit.
```

One emoji chosen for that specific feature, with no emoji appearing twice in the list, then a bold label of one to four words in sentence case, a colon inside the bold, then one full sentence. The label is a noun or adjective phrase naming the capability, and it may be a link when the feature has a canonical page, such as the technology it wraps or its own docs guide, written `**[Label](url):**` with the colon inside the bold and outside the link. Link a label only where the target genuinely helps, not on every bullet. The sentence is present tense, leads with an active verb, makes one primary claim, ends with a period, and stays as short as accuracy allows. Aim for the whole bullet to render on one line, which usually means a description of eight to fifteen words, and run longer only when precision demands it. No dangling fragments: "Uses chezmoi in symlink mode with Go templates for per-machine configuration", not "chezmoi in symlink mode, Go templates for per-machine configs".

Lead with the capability and order the list from defining to supporting. Name what the project does that a reader could not assume, with the specific verb rather than the generic one, and write "Supports" only when compatibility itself is the feature. State whether behavior is automatic or opt-in, and do not word configuration-dependent behavior as a guarantee. Round a count that grows with the project down to a stable floor, 100+ rather than 123, so the sentence stays true as the project moves. A count that is itself the fact, such as a default value, or one small enough that the list could name each member, stays exact. Skip "powerful", "modern", "blazing fast", and "easy to use" unless the repository proves the claim, in which case state the proof instead of the adjective.

Aim for about four to fifteen bullets, past fifteen only when the project genuinely has more important features than that, and below four when it genuinely has fewer, since two nameable capabilities still earn the section. `Features` is a summary, not an inventory, so implementation detail belongs in a later section or nowhere.

## Asking the user

Prefer a sensible default over a question. Resolve decisions in this order: repository evidence, then this skill's rules, then general technical writing judgment.

Ask only when a decision materially changes the README and evidence cannot settle it. That means ambiguous project positioning, two genuinely competing primary audiences, unclear or risky licensing claims, sensitive wording, or two materially different user journeys with no clear primary path.

When you do ask, ask one focused question, explain what actually differs between the options, recommend one, and say why in a sentence.

If you cannot ask, pick the safest option and state the assumption in your summary to the user, not in the README.

## Scope

Change the README. Change other documentation only when the user asked for it.

Do not touch application behavior, architecture, source, dependencies, generated files, snapshots, fixtures, test expectations, or third party content. Do not rewrite unrelated prose elsewhere in the repository because you noticed it could be better.

If writing the README exposes a bug or a contradiction between docs and code, report it to the user. Do not silently fix it in the implementation.

## Gotchas

- Treating the section list as a checklist instead of running the inclusion tests in `references/section-rules.md`.
- Adding an emoji to `## Features`. It never takes one. `## Background` and `## Why?` never take one either.
- Forgetting emojis on the individual feature bullets. The heading has none, so every bullet has one.
- Writing `## Why?` and `## Background` with overlapping content. Pick the one that does the job.
- Adding `Prerequisites` when the only prerequisite is the language runtime the install command already implies.
- Adding `Examples` when the repository has no examples, or pointing it at test fixtures that were never meant as examples.
- Writing `Next Steps` that only relink earlier sections. It must be a progression toward something new.
- Reaching for an alert to break up the page rather than because the content is crucial for the reader's success. GitHub recommends one or two per document, never consecutive, and more are justified only when every alert independently earns its place.
- Choosing alert severity by how important the sentence feels. `WARNING` and `CAUTION` mean something specific. Check the definitions.
- Inferring features from filenames. A directory named `cache/` is not evidence of a caching feature.
- Documenting `npm run build` without opening the manifest to see whether that script exists.
- Assuming MIT instead of reading the LICENSE file, or implying an unlicensed project is open source.
- Adding a banner the repository does not carry, a badge block to a repository that is not a published package, or a Documentation bullet pointing nowhere. Chrome is found, never fabricated. A LICENSE file alone earns no badge.
- Copying the current Nuxt README's structure. Take its principles, not its outline.
- Making the README longer to make it look complete. A shorter README that answers the same questions is the better one.
- Expanding into a repository-wide cleanup. The README is the deliverable.
