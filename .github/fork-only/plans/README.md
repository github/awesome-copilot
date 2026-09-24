# Plans

One file per issue: `issue-<N>.md`, written by the **Fork Issue Planner** workflow (`.github/workflows/fork-issue-planner.md`) when the repository owner opens an issue.

Each plan is an **advisory seed** — a first-round grilling, implementation plan, acceptance criteria, `Q<n>`-numbered open questions, and verification steps produced without human input. It is not a contract, and it is always written with `status: draft`.

Answer the open questions **on the issue** — that is the canonical channel for requirements, and the plan PR is for reviewing the plan and the implementation diff. Then check out the matching `plan/issue-<N>` branch and run the Development Orchestrator agent (`/agent` → `.github/agents/dev-orchestrator.agent.md`). It refuses to continue while any question is unanswered, records the answers in a `## Decision record` section with links to the issue comments, revises the plan, and dispatches `.github/agents/plan-reviewer.agent.md` for a concrete review verdict before asking for approval. If the reviewer cannot run or return a valid verdict, you must choose whether to retry or proceed without review. Older plans may contain a skeptic's report; that is historical context, not a required gate.

`status` goes to `approved` only after all three gates pass: every question answered, the review completed or explicitly waived, and your approval given. Answering the questions is not approval, and neither is a clean reviewer verdict.

The draft plan PR starts with `Refs #<N>`, so merging or abandoning an advisory plan cannot close the issue accidentally. After approval, implementation, validation, and self-review, the Development Orchestrator changes only that marked line to `Fixes #<N>` and verifies GitHub's `closingIssuesReferences`. GitHub then closes the issue as completed only if that implementation PR merges into `main`; closing the PR without merging leaves the issue open.

Plans are fork-only and are never promoted upstream. Nothing reads them automatically; they exist for you and for the orchestrator.

The planner may only ever write `issue-*.md` in this directory — the workflow's `allowed-files` policy enforces it, so this README is out of its reach.
