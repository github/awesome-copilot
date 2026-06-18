---
name: github-repo-publisher
description: 'Guide agents through GitHub repository publishing-surface preparation, audits, and safe publishing workflows. Use when preparing a repository for first public release, reviewing an already public GitHub repo, or updating README files, translated READMEs, About description, topics, homepage, social preview, badges, license and attribution notices, community health files, package metadata, changelog or release copy, issues, PR text, branch or security settings, and other public-facing GitHub copy; also use for git, gh, GitHub API, or connector operations that must preserve repo facts and user changes.'
---

# GitHub Repo Publisher

Use this skill to make GitHub-facing work factual, consistent, and safe. Treat README, About metadata, topics, releases, PRs, issues, and discussions as one publishing surface, not separate scraps of copy.

## Core Workflow

1. Resolve context.
   - Identify the local repository, target GitHub remote, default branch, current branch, and whether the task is read-only or write-capable.
   - Read local `AGENTS.md` or equivalent repo instructions before using network commands, `gh`, git writes, or packaging/release commands.
   - Review Git tracking state with `git status`, `git ls-files`, and ignored/untracked files before treating local-vs-remote differences as publishing problems.
   - Prefer GitHub connector tools for structured repo, issue, and PR data when available. Use `gh` or git when local branch state, Actions logs, commits, pushes, or fields unsupported by the connector matter.

2. Collect facts before writing.
   - Inspect source files, package manifests, docs, CI config, license, examples, screenshots, releases, and existing GitHub metadata.
   - For local repos, prefer `node scripts/collect-repo-facts.mjs --repo <path>` for a quick cross-platform fact map.
   - If Node.js is unavailable, use `pwsh -NoProfile -File scripts/collect-repo-facts.ps1 -RepoPath <path>` when PowerShell 7 is available, or collect the same facts manually.
   - Classify local files as tracked repository content, ignored local context, or untracked candidates. Do not call ignored/untracked local assistant instructions "missing from GitHub" unless the user explicitly intends to publish them.
   - Report likely tracking mistakes: local assistant instructions that are tracked and need public-intent review, and public-facing docs/assets/manifests that are untracked and may have been forgotten.
   - Before changing README, About, topics, or homepage, check package manifest metadata, README raw line structure, available screenshot/image assets, license files, and attribution clues.
   - If the project has i18n config, `_locales`, locale directories, translation resources, or existing translated READMEs, evaluate whether README languages match the user-facing project-supported locales.
   - Do not invent features, badges, benchmarks, compatibility claims, sponsorship claims, security posture, or installation commands.

3. Classify project scale before making recommendations.
   - Read `references/safety-quality.md` and classify the repository as `Tiny / Personal / Experiment`, `Small Public / Low-Risk`, `Usable / Public Utility`, or `Serious / Community / Product`.
   - Then classify the right-sizing dimensions: `Collaboration posture`, `Security exposure`, `Distribution surface`, `User impact`, `Documentation complexity`, and `README language coverage`.
   - Fit recommendations to the project scale, audience, and right-sizing dimensions. Do not prescribe community governance, security automation, release process, docs architecture, or multilingual documentation unless the context justifies it or the user asks.
   - Treat Dependabot, code scanning, dependency review, secret scanning, push protection, branch protection, and vulnerability reporting as audit recommendations by default. Do not create configs, workflows, or change GitHub settings for them unless the user explicitly asks for that specific action.

4. Choose the publishing track.
   - README/About/Topics/Homepage/Social preview/multilingual docs: read `references/readme-metadata.md`.
   - PR, issue, discussion, release, and changelog copy: read `references/publishing-copy.md`.
   - GitHub operations, commits, pushes, PR creation, or API writes: read `references/github-operations.md`.
   - Risk checks, write confirmations, and quality gates: read `references/safety-quality.md`.

5. Draft or edit with traceability.
   - Tie each public claim to observed repository facts.
   - Keep copy audience-aware: first-time evaluator, potential contributor, package user, maintainer, or reviewer.
   - If facts are missing, add a clear placeholder note, ask a focused question, or omit the claim.

6. Validate before delivery.
   - Re-read changed files for broken headings, links, image paths, tables, fenced code blocks, and stale badges.
   - For README audits, report whether raw Markdown line structure was checked. Prefer `lineCount` and `maxLineLength` from `scripts/collect-repo-facts.mjs` when available.
   - Run relevant tests or lint/docs checks when the repo provides them.
   - For GitHub writes, summarize target repo, branch, files/metadata, and exact action before applying unless the user already explicitly requested that write.

## Operating Rules

- Preserve user work. Do not reset, checkout away, delete, or overwrite unrelated changes.
- Keep local edits and remote writes separate. A polished README draft is not permission to push it.
- Use explicit paths when staging mixed worktrees. Avoid broad `git add -A` unless every change belongs to the task.
- Treat ignored or untracked local assistant instructions such as `AGENTS.md`, `CLAUDE.md`, or editor/agent rule folders as operational context, not GitHub publishing-surface gaps. If they are tracked, review whether they are intentional public repo content before recommending changes.
- For security automation, report `Required for this context` or `Optional for this context` recommendations first. Do not add `.github/dependabot.yml`, security workflows, branch rules, or repository security settings unless the user explicitly authorizes that exact change.
- Prefer draft PRs unless the user asks for ready review.
- For `gh` or HTTPS failures, check auth first, then repo instructions for proxy requirements. If a local instruction requires proxy environment variables, apply them to the command invocation.
- If a requested GitHub field is not available through the current tool, state the limitation and provide an exact fallback command or manual update text.

## Output Shape

For audits, include `Scale classification`, `Right-sizing dimensions`, concrete findings, and right-sized proposed edits. Mark every recommendation as `Required for this context` or `Optional for this context`, and name the dimension that triggers it. For creation/update tasks, provide the changed files plus concise notes on what GitHub metadata should be set to. For write operations, include what succeeded, what was verified, and anything still requiring the user's GitHub permissions.
