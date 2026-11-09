---
name: skill-distribution-audit
description: "Audit a skill collection before release or investigate installer omissions, archived/template leakage, duplicate identities, and manifest drift. Reconcile the intended public source set, distribution manifest, and actual discovery output for a specified consumer version. Includes a deterministic set-comparison helper."
---

# Skill Distribution Audit

Give a collection maintainer a release-correctness report: which intended skills are missing, which unintended entries are exposed, and which identities are ambiguous. Start from the source revision and target consumer, rather than assuming that a readable SKILL.md will be distributed correctly.

## Establish the distribution contract

Record the source revision, consumer/client and version, distribution layout, and requested scope. If a client-specific rule affects the result, consult that consumer's documentation or implementation; otherwise leave the conclusion unverified.

Build the intended public set from the repository's actual release policy and source files. Distinguish active skills from archives, templates, test fixtures, generated copies, and internal maintenance content. A source collection can contain SKILL.md files that it deliberately does not publish. An existing manifest may itself be stale, so do not use it as the only source of truth.

Keep a mapping from each identity to its source path. Prefer repository-relative paths when both sides expose them; use names only when unique and comparable. If discovery returns names that map to multiple source paths, report the ambiguity rather than silently choosing or deduplicating an entry.

## Collect comparable evidence

- Parse frontmatter with a standard YAML parser compatible with the target consumer, then validate its supported field types. Separate malformed YAML from valid YAML that fails the consumer's schema. A repository's custom parser passing is not proof of consumer compatibility.
- Inspect the actual release/manifest rules, including path bases, explicit entries, globs, and exclusion or internal flags. Apply only the target version's semantics: a repository's deprecated status field does not necessarily hide an entry from an installer.
- Obtain the consumer's discovery/list output for the same source revision when an appropriate command is available and authorized. Inspect its behavior first; a command named list is not automatically free of downloads or writes. Prefer an isolated checkout and retain stderr, exit status, version, source revision, and completeness/pagination limits.
- Use existing captured output when a fresh consumer run is unavailable. Mark it as historical. If no comparable consumer output is available, complete the static checks and state that discovery coverage remains unverified.

Do not execute skill bodies or their helpers while collecting distribution evidence. Installation and end-to-end task execution are separate validation scopes; do not repeat installations to manufacture usage counts.

## Reconcile identities, not just totals

Compare the intended public set against the manifest and against observed discovery separately, when those layers exist. Report missing identities, unexpected identities, duplicates, and parse failures independently. Also compare the manifest to discovery when it is the actual consumer input. Do not assume that a manifest for a different installer controls a direct repository scan.

Equal totals can conceal different identities. For example, an intended set of two active skills and an observed set containing one active skill plus one template both have length two, yet contain one omission and one leak.

For deterministic comparisons, use the bundled [compare-discovery.mjs](scripts/compare-discovery.mjs) with Node.js 20 or later; it needs no third-party packages. It accepts two JSON arrays of exact identity strings. Create those inputs from the evidence above; it does not discover skills or infer release policy.

```sh
node <skill-directory>/scripts/compare-discovery.mjs <expected.json> <observed.json>
```

The JSON report includes raw/unique counts, missing and unexpected identities, and duplicate counts on both sides. Exit codes: 0 for an exact unique match, 1 for mismatches or duplicates, 2 for invalid input or an I/O error. It reads the supplied files and writes only its report; it never invokes an installer.

See the [worked example](references/worked-example.md) for sample inputs and an auditable report. The helper's regression tests run with:

```sh
node --test <skill-directory>/scripts/compare-discovery.test.mjs
```

For a recorded Copilot run on real historical captures, including exact inputs, helper output, and a local replay command, see the [Copilot validation report](references/copilot-real-data-validation.md). Read it when validating or reproducing this skill; it is not required for an ordinary audit.

## Report and repair

For each finding, give the affected identities, source/configuration paths and line numbers, observed behavior, likely cause, and smallest repair. Distinguish direct observations from inferences. Avoid changing skill bodies when a metadata or manifest correction is sufficient; preserve unrelated metadata and licensing.

Include the source revision, consumer version, expected/manifest/discovered counts, exact differences, checks actually run, and verification limits. Allow zero findings. Do not turn unavailable or truncated discovery into a successful match by comparing only a convenient subset.

An exact discovery match establishes distribution coverage within the audited scope. It does not establish that skills are loaded by a live Copilot session, that packaged helpers work, or that credentials and external services are usable. After an authorized repair, repeat the relevant parsing and reconciliation checks on the repaired revision and report what changed.
