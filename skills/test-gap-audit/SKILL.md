---
name: test-gap-audit
description: Run a read-only audit for missing, weak, stale, or mis-scoped test coverage. If the user does not name a scope, audit the full repository and identify important code paths, routes, features, services, workflows, and contracts that lack proper tests. If the user names a feature, PR, branch, route, workflow, service, bug fix, API, security-sensitive path, or risky code change, focus only on that specific scope. Use when the user asks what tests are missing, whether coverage is enough, what regression tests to add, or how to prove a change is safe. This is not a general bug audit and not a security review; it evaluates whether behavior is covered by tests.
license: MIT
---

# Test Gap Audit

Find the tests that should exist but do not, or tests that exist but do not prove the important behavior. Produce concrete, prioritized test recommendations grounded in code paths, risk, and existing test conventions.

## Core Rules

- Stay read-only unless the user explicitly asks to add tests.
- Default to a full-repository audit when the user does not provide a specific scope.
- Full-repo audits are breadth-first, then depth-limited. Inventory the repo, rank surfaces by risk, deep-inspect as many high-risk surfaces as the turn allows, and list the rest under **Surveyed But Not Deeply Inspected** with a pointer to run another pass on them. State the surface counts in the report header. Never present a shallow sweep as complete coverage.
- When the user names a route, feature, workflow, PR, branch, service, package, directory, or other portion of the repo, limit the audit to that scope and its directly connected code paths.
- Focus on coverage quality and regression protection, not general bug hunting.
- Ground every gap in a behavior, changed code path, risk, or existing weak test.
- Prefer exact test cases over generic coverage advice.
- Infer test style from the repository before recommending unit, integration, component, browser, contract, or end-to-end tests.
- Separate confirmed missing coverage from inferred gaps.
- Do not treat line/branch coverage percentage as sufficient proof. Behavior coverage matters more.
- Avoid recommending slow end-to-end tests when a lower-level test would prove the behavior reliably.

## Inputs

When no scope is given, audit the whole repository. Inventory the repo's major testable surfaces and report which important areas do not have tests, do not have enough assertions, or are only indirectly covered.

Accept any specific testing scope, including:

- Pull requests or branches: `audit test gaps in this PR`, `what tests should this branch add`.
- Features: `test gap audit uploads`, `what coverage is missing for billing`.
- Routes/APIs: `review tests for POST /orders`, `check auth tests around exports`.
- Workflows: `invite teammate -> accept invite -> set role -> revoke access`.
- Bug fixes: `what regression test should cover this fix`.
- Security or docs follow-up: `what tests prove the security audit fixes`, `do examples have tests`.

If scope is blurry, infer the smallest useful boundary and state it. If no scope is stated, do not ask for one; proceed with a full-repo audit. Ask only when different scopes would require materially different test plans.

## Discovery Workflow

1. Establish repo context.
   - Check `git status --short`.
   - Identify stack, test runners, package scripts, CI checks, test file naming, fixture style, mocks, factories, browser tools, API test conventions, and monorepo boundaries.
   - Read relevant manifests, CI workflows, test configs, and nearby tests.

2. Map the behavior under review.
   - For full-repo audits, inventory major app surfaces, packages, routes, APIs, services, jobs, CLIs, schemas, integrations, and shared libraries before choosing the highest-risk gaps to inspect deeply.
   - For PRs, inspect changed files, changed tests, and adjacent unchanged code.
   - For features, locate routes, components, services, models, schemas, jobs, permissions, integrations, and user-facing states.
   - Identify happy paths, failure paths, edge cases, data boundaries, auth/authorization boundaries, migration/config behavior, and external integration behavior.

3. Map existing coverage.
   - Run the bundled `scripts/coverage_map.py` first when it is available. It detects the test framework and naming convention, then matches every source file against the tests by name, mirrored path, and what the test files actually import, and returns the unmatched files ranked with risk keywords plus test files that have cases but almost no assertions. The path is relative to this skill's own directory, which varies by host. Use `python` if `python3` is not on PATH.
   - `python <skill-dir>/scripts/coverage_map.py --top 25`, or `--format json` to filter the results yourself.
   - The matcher is heuristic and cannot see coverage that arrives through fixtures, end-to-end tests, or indirection. Treat an unmatched file as a lead, and grep for the module name to confirm before reporting it as `P0` or `P1`. Report a gap as confirmed only after you have looked.
   - If the script is unavailable, compare production/source areas against test directories and test naming conventions manually to find untested or weakly tested portions of the repo.
   - Find direct tests for the changed or requested code.
   - Find indirect tests that cover the same behavior through a higher-level workflow.
   - Inspect assertions, fixtures, mocks, setup, and test names to see what is actually proven.
   - Note stale tests whose names or fixtures no longer match current behavior.

4. Identify gaps.
   - Entire routes, features, services, packages, commands, jobs, or integration boundaries with no tests.
   - Missing critical path tests.
   - Tests that only render or call code without meaningful assertions.
   - Tests that mock away the behavior they claim to cover.
   - Missing negative/error/permission tests.
   - Missing tenant/ownership/role boundary tests.
   - Missing validation, pagination, sorting, filtering, time zone, race/idempotency, retry, or empty-state tests.
   - Missing regression test for a fixed bug.
   - Missing contract tests for API/schema/client changes.
   - Missing docs/example tests when examples are part of the user contract.
   - Missing migration/backward-compatibility tests when data shape changes.

5. Verify safely.
   - Run focused test discovery or relevant existing tests when quick and repo-conventional.
   - Use test list commands, grep/search, typecheck, lint, or focused test files as appropriate.
   - Do not install dependencies, start long-running services, or run expensive full suites unless the user asks or the repo clearly expects it.
   - Never run a command that writes into the repository as a side effect. `python -m compileall` and `py_compile` emit `.pyc` files, formatters rewrite sources, and installers touch lockfiles. `.pyc` output is usually gitignored, so `git status` will look clean while the tree has in fact been modified. Prefer checks that write nothing, and if a language offers no read-only check, say so under checks skipped.
   - Record checks run and skipped.

## Severity Rubric

- `P0`: Missing tests for code that can cause data loss, security/privacy exposure, payment/billing errors, destructive actions, or production outage with no practical safety net.
- `P1`: High-impact missing coverage for common user paths, auth/authorization, critical API contracts, migrations, background jobs, or release-blocking behavior.
- `P2`: Meaningful regression risk around important edge cases, validation, error handling, state transitions, integrations, or stale/weak tests.
- `P3`: Lower-risk test cleanup, naming drift, fixture improvement, redundant tests, or useful coverage polish.

## Evidence Standards

- Verify every citation before you write it. Re-read the exact range and confirm it contains what you are describing. When citing a named symbol, function, CTE, or block, cite the line where the name is defined, not a line inside a neighbouring block. When quoting text, cite the file the quote is actually in. Prefer a single anchor line containing a distinctive token over a hand-counted range.
- When you attribute a finding to a tool's output, quote the path and line the tool itself reported. Never infer which lines a linter or type checker fired on by reading the code. If the tool's output does not name the line, report the pattern without claiming the tool flagged it.
- Never restate a count from a grep, a script, or a tool without the raw output in front of you. If you cannot re-derive the number, describe the pattern instead of counting it.
- Before reporting that something is absent -- undocumented config, an unused dependency, a missing control, a variable nothing reads -- check every plausible location, not the first one. For a config variable that means the README, env sample files, deploy manifests, comments, and the transitive callers of whatever helper reads it. For a dependency it means whether it is a documented transitive requirement of something you do use. A negative claim from a single grep is not evidence.
- Cite the behavior or changed code and the existing/missing test area.
- Include file and line references whenever possible.
- Explain what current tests prove and what they do not prove.
- For inferred gaps, include `Confidence: high/medium/low`.
- Recommend the smallest reliable test level that proves the behavior.
- Include suggested test names or scenarios precise enough for implementation.

## Report Format

Use this structure unless the user asks otherwise:

```markdown
**Test Gap Audit: <scope>**

No code changed. I reviewed <brief scope>, existing tests, and repo test conventions. <verification summary>. No P0s found / P0s found: <count>.

1. **P1: <gap title>.**
   Gap: <behavior or risk not covered>.
   Current coverage: <what existing tests cover or why none were found>.
   Evidence: code `<path>:<line>`; tests `<path>:<line>` or "no direct tests found in <area>".
   Suggested test: <specific test level, file/location, scenario, and key assertions>.

2. **P2: <gap title>.**
   Gap: <missing or weak coverage>.
   Current coverage: <what is currently proven>.
   Evidence: code `<path>:<line>`; tests `<path>:<line>`.
   Confidence: <high/medium/low if inferred>.
   Suggested test: <specific recommendation>.

**Suggested Test Plan**
- <ordered list of concrete tests to add first>

**Untested Or Weakly Tested Areas**
- <for full-repo audits, list important routes/features/services/packages/workflows that lack proper tests, with brief evidence>

**Existing Coverage Worth Keeping**
- <only include useful tests that already protect important behavior>

**Surveyed But Not Deeply Inspected**
- <For full-repo audits only: surfaces that were inventoried but not inspected deeply this pass, and which to run next. Omit this section entirely for scoped audits.>

**Checks Run**
- `<command>`: <result>

**Not Tested**
- <test suites, services, browsers, credentials, or dependency gaps and why>

**Assumptions**
- <only include if useful>
```

If no meaningful gaps are found, say that clearly, name the strongest coverage observed, and list any residual risk.

## Post-Audit Test Implementation

When the user asks to add tests:

- Implement the highest-priority gaps first.
- Follow existing test style, factories, mocks, helpers, naming, and file placement.
- Prefer focused tests that prove behavior with clear assertions.
- Avoid broad snapshot tests unless snapshots are already the right local convention.
- Update fixtures, test data, or contract examples only when needed for the selected tests.
- Run the new tests and the closest existing related tests.
- Final response should map gaps to added tests and list checks run.

## Related Skills

This skill is one of seven review skills that share a single report contract:
every finding carries a `P0`-`P3` severity and a `path:line` you can open. The
other five cover launch readiness, security, repo structure, improvement ideas,
and pull request communication. They are at https://github.com/specialone0007/review-skills.

## Agent Portability Notes

- Use available shell, search, git, browser, CI, coverage, or MCP tools as appropriate.
- If test execution is unavailable, continue with source and test inspection and state the limitation.
- If the host supports inline review comments, emit them only for confirmed actionable test gaps and keep ranges tight.
