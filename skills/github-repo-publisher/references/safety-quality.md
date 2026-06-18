# Safety and Quality Gates

Use this reference before delivering drafts or performing GitHub write operations.

## Claim Safety

Reject or rewrite claims that are:

- Not supported by code, docs, tests, releases, or GitHub metadata.
- Based only on package names or folder names.
- Aspirational, such as future platform support or planned integrations.
- Security-sensitive, such as "secure", "encrypted", "private", or "compliant", without direct evidence.
- Performance-sensitive, such as "fastest" or "blazing fast", without benchmarks.

Use factual alternatives:

- `Includes a GitHub Actions workflow for tests` instead of `battle-tested CI`.
- `Provides read-only fact collection scripts` instead of `fully automated`.
- `Designed for agent skill workflows` instead of `works with every agent`.

## Attribution and License

- Use `fork` only when the repository was actually forked from another repository or intentionally preserves upstream history.
- Use `derived from` when code, templates, scripts, assets, or substantial text were copied and adapted from an upstream project.
- Use `inspired by`, `references`, or `acknowledgements` when only ideas, structure, or general patterns informed a new implementation.
- Preserve upstream copyright notices, license files, and required notices when copying licensed material.
- Do not copy large prose blocks, images, logos, or generated assets from another repository unless the license permits it and attribution is added.
- For MIT, Apache, BSD, and similar licenses, keep the required license notice with copied material. For GPL/AGPL or unclear licensing, flag compatibility risk before reuse.

## Secrets and Privacy

- Before publishing, scan drafts and changed docs for API keys, tokens, private URLs, internal hostnames, private repository names, emails, phone numbers, addresses, stack traces, log dumps, and local absolute paths.
- Treat `.env`, credentials, screenshots, terminal captures, CI logs, and issue templates as high-risk sources.
- Replace sensitive examples with placeholders such as `<YOUR_API_KEY>` or `<internal-url>` only when the placeholder is useful to readers.
- Do not send private or sensitive content to GitHub metadata, issues, discussions, PRs, releases, or README files without explicit user authorization.
- If sensitive content appears necessary for reproduction, summarize it minimally and ask before publishing exact values.

## Community Health

- Audit common community files when reviewing repository readiness: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE`, and `.github/PULL_REQUEST_TEMPLATE.md`.
- Before recommending `CONTRIBUTING.md`, issue templates, PR templates, or `CODE_OF_CONDUCT.md`, classify the repository's `Collaboration posture`.
- For solo-maintained, personal, tiny, or low-risk public projects with no active external issues or PRs, do not push full community governance files by default. Prefer a short README contribution note only when useful.
- Report missing files as recommendations unless the user explicitly asks to create them.
- Do not claim contribution, security, support, or code of conduct policies exist unless the corresponding file or documented process exists.
- Keep security reporting guidance factual. Do not invent contact emails, vulnerability programs, or SLA promises.

## Security Automation

- Audit whether the repository should enable Dependabot alerts, Dependabot version updates, secret scanning, push protection, code scanning, dependency review, `SECURITY.md`, and private vulnerability reporting.
- Before recommending `SECURITY.md`, private vulnerability reporting, or security automation, classify the repository's `Security exposure`.
- For low-exposure projects that do not network, process credentials or personal data, ship binaries, or alter user systems, avoid presenting `SECURITY.md` as required. Prefer factual README safety boundaries when useful.
- Treat security automation and repository settings as recommendations unless the user explicitly asks to change the specific file, workflow, ruleset, or setting.
- Do not create or modify `.github/dependabot.yml` by default. Recommend Dependabot as `Optional for this context` for tiny, personal, experimental, small public, or low-risk projects unless the user asks for Dependabot or concrete repository risk makes it required.
- Do not add code scanning, dependency review, secret scanning, or other security workflows by default. Explain the risk and recommendation first, then wait for explicit authorization before creating workflow files.
- Do not modify GitHub security settings such as Dependabot alerts, secret scanning, push protection, branch protection, rulesets, or private vulnerability reporting unless the user explicitly authorizes that exact remote setting change.
- Even for `Moderate`, `High`, or `Critical` security exposure, separate the recommendation from execution: state the evidence, mark the item as `Required for this context` or `Optional for this context`, and ask or wait before applying configuration.
- Do not imply security features are active unless GitHub metadata, workflow files, or repository settings prove they are active.
- For public-facing security claims, prefer factual wording such as `Uses GitHub code scanning workflow` over broad claims like `secure by default`.

## Repository Scale and Fit-to-Scope

Classify repository scale before recommending GitHub governance, docs, security, release, or multilingual work. If the user explicitly states the project goal, audience, or desired maturity, prefer that over inferred scale.

- `Tiny / Personal / Experiment`: personal scripts, demos, learning projects, prototypes, one-off tools, or private experiments. Recommend only the essentials by default: clear README purpose, quick run command, limitations, About description, 3-5 topics, and license only if public reuse is intended. Do not push `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue forms, PR templates, release process, Dependabot, code scanning, or multilingual README unless requested or risk requires it. If Dependabot is mentioned for this scale, mark it as optional unless the user explicitly asked for it.
- `Small Public / Low-Risk`: low-risk public projects that others can view or download but have an expected small audience, do not network, do not process credentials or personal data, do not publish packages or installers, and are not multi-maintainer community projects. Recommend clear README, run instructions, limitations, About description, topics, and license. Treat 1-3 real badges, a simple screenshot or social preview, a simple changelog, and Dependabot suggestions as optional. Do not push `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue forms, PR templates, branch protection, Dependabot, code scanning, multilingual README, or formal release process by default.
- `Usable / Public Utility`: public tools, plugins, libraries, templates, or apps that others may install, depend on, use regularly, or report issues against, or that already have a clear user group. Recommend practical docs and light operations: install, quick start, configuration, troubleshooting, license, basic badges, issue guidance, simple release/changelog convention, and security/contact notes if the project touches data, network, credentials, or binaries.
- `Serious / Community / Product`: team, company, community, production, high-usage, security-sensitive, or multi-contributor projects. Recommend fuller governance: docs architecture, `CONTRIBUTING.md`, `SECURITY.md`, code of conduct when community-facing, issue/PR templates, release/versioning policy, branch protection, security automation, social preview, and multilingual strategy when the project supports locales.

Escalate from `Small Public / Low-Risk` to `Usable / Public Utility` or higher when risk or audience grows: networking, credentials, personal data, browser extensions, installers, package publishing, automation that changes user systems, production deployment, visible user adoption, or multiple maintainers. Project scale changes recommendation strength, not truthfulness, privacy, security, or license requirements.

## Right-Sizing Dimensions

After classifying scale, classify these dimensions before recommending governance, security, release, docs, or multilingual work. Use direct evidence when available, and write `not observed` or `not assessed` when evidence is missing.

- `Collaboration posture`: external collaboration expectation. Use `Solo / No External Collaboration` for personal or solo projects with no active external issues or PRs; `Casual Contributions Welcome` when simple issue/PR help is acceptable; `Active External Contributions` when external issues or PRs already exist or are explicitly desired; `Community / Multi-Maintainer` for multi-maintainer, team, or community projects. This controls `CONTRIBUTING.md`, issue/PR templates, and `CODE_OF_CONDUCT.md`.
- `Security exposure`: safety risk surface. Use `Low` when the project does not network, process credentials or personal data, ship binaries, or alter user systems; `Moderate` for scripts, CLIs, browser extensions, GitHub API workflows, local file processing, or release assets; `High` for tokens, cookies, accounts, personal data, installers, package distribution, or automation that changes user systems; `Critical` for production, enterprise, supply-chain, or sensitive-data projects. This controls `SECURITY.md`, vulnerability reporting, Dependabot, secret scanning, push protection, and code scanning.
- `Distribution surface`: how users receive or run the project. Use `Source-only`, `Release assets`, `Package registry`, `App/extension store`, `Installer/binary`, or `Hosted service`. This controls release notes, changelog, SemVer, package metadata alignment, install instructions, binary asset handling, and Git LFS guidance.
- `User impact`: expected audience and consequence of mistakes. Use `Private/author only`, `Expected small audience`, `Installable by others`, `Dependency or workflow component`, or `Production/user-facing`. This controls README depth, support wording, troubleshooting, compatibility notes, screenshots, and social preview priority.
- `Documentation complexity`: documentation shape needed. Use `Single README enough`, `README plus docs folder`, `API/reference docs needed`, or `Docs site/wiki needed`. This controls whether to recommend `docs/`, FAQ, troubleshooting, API reference, advanced guides, or docs-site work.
- `README language coverage`: README translation need. Use `No project-supported locales observed`, `User-specified language scope`, `Matches project-supported locales`, `Partial/outdated coverage`, or `Many locales need matrix`. This controls multilingual README recommendations and should be based on user-facing locale evidence, not programming languages.

## Write Confirmation Rules

Proceed without extra confirmation only when the user's instruction already authorizes the exact write, such as "commit and push these changes" or "update the repo About to this text".

Confirm first when:

- Publishing to GitHub, creating a release, or editing repo metadata.
- Sending private or sensitive content to a remote service.
- Creating or modifying security automation configuration, including `.github/dependabot.yml`, security workflows, branch protection, rulesets, Dependabot settings, secret scanning, push protection, code scanning, dependency review, or private vulnerability reporting.
- Deleting branches, closing issues, resolving review threads, or changing labels at scale.
- The worktree contains unrelated changes and staging scope is ambiguous.

## Verification Commands

- README install, run, test, build, package, and release commands must come from manifests, scripts, docs, examples, or commands actually run during the task.
- Prefer running cheap verification commands when the repo provides them and the user asked for publish-ready docs.
- If a command was not run, say it is unverified instead of implying it works.
- Do not invent successful output, screenshots, passing tests, package names, CLI flags, or environment requirements.
- When commands are platform-specific, label the platform or shell explicitly.

## Audit Output Format

For repository audits, use these headings unless the user requests another format:

- `Scale classification`: tiny/personal/experiment, small public/low-risk, usable/public utility, or serious/community/product, with the evidence and any risk-based escalation. Explicitly say when the low-risk public category applies.
- `Right-sizing dimensions`: collaboration posture, security exposure, distribution surface, user impact, documentation complexity, and README language coverage, with brief evidence for each.
- `Critical blockers`: broken links, false claims, missing license for copied material, secrets, unsafe publish actions, or commands likely to fail.
- `Recommended improvements`: useful but non-blocking README, metadata, docs, security, or community health changes, with each item marked `Required for this context` or `Optional for this context` and tied to the dimension that triggers it.
- `Suggested metadata`: exact About description, topics, homepage, social preview, badges, or lifecycle wording.
- `Safe-to-apply edits`: local file edits that can be made without remote writes or policy changes.
- `Validation status`: commands run, commands not run, whether raw Markdown line structure was checked, license/attribution risk as `not observed` or `not assessed` when no issue is reported, and remaining unknowns.

## README Review Checklist

- Title, description, and About text agree.
- Installation commands match actual manifests and scripts.
- Quick start can plausibly run from a fresh clone.
- Links are relative when linking inside the repo and absolute when linking outside it.
- Images and badges resolve or are clearly marked as suggestions.
- Screenshot and social preview recommendations are based on real checked image assets, explicitly unverified assets, or clearly labeled generated/new image suggestions.
- License section matches the actual license file.
- Contribution and security sections reflect files that exist.
- Attribution and acknowledgements match the actual reuse relationship.
- Raw README source is diff-friendly: not compressed into a few very long physical lines, dense paragraphs, or hard-to-review Markdown blobs.
- Content contains no secrets, private URLs, internal-only identifiers, or unnecessary personal data.
- Security automation, Dependabot, secret scanning, push protection, and code scanning claims are backed by repo settings or files.
- No generated boilerplate remains.

## GitHub Metadata Checklist

- Description is concise and searchable.
- Topics are lowercase and relevant.
- Homepage is stable and working when supplied.
- Social preview recommendation is specific and not generic decoration.
- README first screen communicates purpose, proof, and first action.

## Delivery Checklist

Report:

- Files changed or exact metadata values drafted.
- Validation performed and commands run.
- GitHub writes performed, if any.
- Open questions, missing facts, or manual steps that remain.
