# README and GitHub Metadata

Use this reference for README files, repository About descriptions, topics, homepage URLs, social preview guidance, and profile README work.

## Fact-First Inputs

Inspect these before drafting:

- Existing `README*`, docs, examples, screenshots, `CHANGELOG*`, `LICENSE*`, `CONTRIBUTING*`, `SECURITY*`, and `CODE_OF_CONDUCT*`.
- Manifests such as `package.json`, `pyproject.toml`, `Cargo.toml`, `.csproj`, `go.mod`, `composer.json`, `Gemfile`, Docker files, extension manifests, app manifests, and CI files.
- Public GitHub metadata when accessible: description, homepage, topics, license, latest release, default branch, open issues/PRs, and Actions status.
- Real usage paths from tests, examples, CLI entry points, exported APIs, routes, screenshots, or demo links.

## README Structure

Prefer this order unless the repo already has a strong convention:

1. Title and one-sentence positioning.
2. Fast proof: screenshot, demo GIF, CLI output, or minimal example if the project benefits from visual or behavioral proof.
3. What it does and who it is for.
4. Feature bullets grounded in repo facts.
5. Installation or setup.
6. Quick start with the shortest working path.
7. Configuration, usage, API, or workflows as needed.
8. Development, testing, and contribution notes.
9. License, security, support, or roadmap when present.

Keep the first screen useful: a visitor should understand the project, value, and first action without scrolling far. Do not bury install or usage behind marketing copy.

GitHub README display details:

- README should answer what the project does, why it is useful, how to get started, where to get help, and who maintains it.
- When multiple README files exist, GitHub shows the first matching file it finds in `.github`, then the repository root, then `docs`.
- GitHub may truncate README rendering after about `500 KiB`; move long manuals, API references, and tutorials into `docs/`, a wiki, or a documentation site.
- Prefer relative links and relative image paths for files inside the same repository so links continue to work across branches, forks, and GitHub rendering contexts.

## README Quality Rules

- Prefer concrete verbs and nouns over vague claims such as "powerful", "modern", "seamless", "blazing fast", or "production ready" unless the repository proves them.
- Keep badges factual and maintainable. Only add badges backed by existing CI, package registries, license files, or public services.
- Include commands only after verifying package manager, scripts, paths, and prerequisites.
- Make code examples copy-pasteable, fenced with language tags, and aligned with exported names or CLI flags.
- If the project is visual, include actual screenshots or asset paths when available. Do not invent images.
- If the project is a library, show the smallest real import/use example. If it is an app, show run/deploy steps. If it is a plugin/extension, show install/build/package steps.
- Avoid overpromising support matrix, security guarantees, or roadmap unless documented.

## Markdown Source Maintainability

- README must work as rendered GitHub content and as raw Markdown that is readable in source, diffs, reviews, and translation workflows.
- Do not compress whole sections, multiple headings, lists, tables, Mermaid diagrams, or HTML blocks into a few extremely long physical lines.
- Keep normal prose in natural Markdown paragraphs, with lists, tables, fenced code blocks, HTML, and Mermaid diagrams structured across multiple lines.
- Long URLs, badge links, image links, and unavoidable table cells may stay on one line, but they should not make the whole document a long-line blob.
- When auditing a README, treat unusually low line counts plus very long lines as a `Recommended improvements` item. Escalate it as a maintainability issue when it makes translation, review, or GitHub diffs hard to trust.

## Repository Lifecycle

- Identify lifecycle status from repository facts: recent commits, releases, open maintenance notes, archived state, deprecation notices, issue activity, and README wording.
- Reflect status honestly in README, About, topics, and release notes when relevant: `experimental`, `WIP`, `maintained`, `deprecated`, `archived`, or `looking for maintainers`.
- Put deprecation, archival, or replacement-project notices near the top of the README before installation instructions.
- Do not present dormant, archived, experimental, or deprecated projects as actively maintained or production ready.
- Do not archive repositories, close issues, change topics, or alter settings solely because lifecycle language suggests it.

## Badge Policy

- Prefer 3-6 useful badges, ordered roughly as CI/build, package or version, license, coverage, and security.
- Each badge must reflect a real service, workflow, package registry, license file, or security signal and link to the relevant page.
- Avoid vanity, decorative, stale, unverifiable, or duplicated badges.
- Do not add badges for CI, coverage, downloads, package versions, funding, security, or license unless the underlying source exists.
- Keep badges below the title and language switcher, before the short description.

## Docs Architecture

- Keep README focused on orientation, quick start, core usage, screenshots or proof, and links to deeper documentation.
- Move long tutorials, API references, FAQ, troubleshooting, architecture notes, and advanced configuration into `docs/`, a wiki, or a documentation site.
- Link from README to deeper docs with relative links when the docs live in the repository.
- Do not duplicate large docs sections across README and `docs/`; pick one canonical location and link to it.

## About Description

Write the repository About description as a compact phrase, usually 50-160 characters.

Good pattern:

`Action-oriented project type for audience/context, with key differentiator.`

Examples:

- `Agent skill for auditing GitHub repos and producing factual README, About, PR, and release copy.`
- `Chrome extension that captures page notes and syncs them to local Markdown files.`

Avoid:

- Keyword stuffing.
- Ending with a period when the text reads like a label.
- Claims not visible in the README or code.

## Topics

Recommend 5-12 lowercase GitHub topics:

- Include ecosystem, language/framework, project type, and domain.
- Prefer common searchable terms over clever branding.
- Do not include private company names, unsupported platforms, or aspirational tech.
- For agent skills, include `agents`, the target agent runtime when accurate, and the task domain when appropriate.

## Homepage and Social Preview

- Homepage should be a working demo, docs site, package page, or product page. Leave blank if no stable URL exists.
- Social preview should show the actual product, CLI result, UI, or concise branded title. Avoid generic gradients.
- If no image exists, suggest dimensions and content instead of pretending one exists.

## Accessibility

- Give every meaningful image, screenshot, and badge useful alt text. Use empty alt text only for purely decorative images.
- Keep heading levels in order; do not jump from `##` to `####` for visual sizing.
- Use descriptive link text. Avoid `click here`, `more`, or bare URLs when a human-readable label is possible.
- Keep tables readable in raw Markdown and on narrow screens. Prefer lists when table cells become long paragraphs.
- Do not rely on color alone in screenshots, diagrams, badges, or status explanations.

## Package Metadata Alignment

- Compare README, About description, topics, and homepage against package manifests before changing public copy.
- Align with manifest fields when present: `description`, `keywords`, `homepage`, `repository`, `license`, package name, binary names, exported entry points, and supported runtime versions.
- If manifests disagree with the README or GitHub metadata, report the conflict before rewriting both surfaces.
- Do not add package keywords, compatibility claims, or install commands that are absent from manifests or examples.
- When improving metadata, prefer one consistent positioning sentence reused across README, package description, and GitHub About with only length-specific edits.

## README Language Coverage

- Default README language follows the repository's existing primary language.
- Prefer `README.md` for the primary/default language.
- GitHub does not automatically choose a README by browser language; the repository page displays `README.md`, so multilingual projects need explicit language links.
- Treat README language coverage as a right-sizing dimension. It controls whether multilingual README work is required, optional, partial, or unnecessary for the current repository context.
- Respect the user-specified language scope. If the user does not specify one, align README translations with project-supported locales that are visible to users.
- Determine project-supported locales from explicit i18n configuration, locale directories, translation resource files, manifest or package configuration, existing README locale files, and project documentation, in that order.
- Do not count programming languages, dependency languages, generated locale test fixtures, or incidental foreign-language text as user-facing supported locales.
- If no user-facing locale support is observed and the user did not request multilingual docs, report `No project-supported locales observed` and do not recommend new translations by default.
- If many project-supported locales exist, do not generate every README translation by default. Recommend a locale matrix and prioritize the primary language, English when useful for discoverability, and the project's main user locales; mark the rest as shipped, partial, planned, or deferred.
- If a locale exists only in code but no maintainer can review it, do not advertise that README locale as fully supported.
- Use `README.<locale>.md` for translations, with BCP-47/IETF-style locale codes such as `README.zh-CN.md`, `README.zh-TW.md`, `README.ja.md`, and `README.pt-BR.md`.
- Add a language switcher near the top of every shipped README translation, between the title and badges. If the title area is strongly branded, put the switcher on the line immediately below the title.
- Prefer a compact switcher such as `**Languages:** English | [简体中文](README.zh-CN.md)` and localize its label in translated files when helpful.
- Keep language links symmetric across shipped translations and do not link missing translation files.
- Optionally add hidden tracking comments at the top of translated files, such as `<!-- translated-from: README.md@<commit-sha> -->` and `<!-- translation-status: synced | outdated | partial -->`.
- Translate prose, headings, descriptions, alt text, and link text.
- Do not translate code snippets, shell commands, flags, package names, file paths, URLs, GitHub usernames, repository names, API names, config keys, or brand names.
- Keep translations in the same diff-friendly Markdown style as the primary README so translation updates do not create huge, hard-to-review diffs.
- When changing user-facing docs, update corresponding translations in the same PR/commit, or clearly mark translations as pending, outdated, or partial to prevent translation drift.
- Maintain a locale matrix when supporting more than two languages: shipped, partial, planned, and deferred.
- Only advertise a locale as supported if someone can maintain or review it.
- For many locales or frequently changing README content, suggest a single-source README generator or CI drift check instead of manual translation maintenance.
- Prefer English for GitHub About descriptions and topics for discoverability unless the project is intentionally local-language focused.

## Profile README Notes

For profile README work, optimize for identity, current work, credible proof, and contact paths. Do not add fake contribution stats, fake trophies, or unrelated badges.
