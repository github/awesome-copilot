# Plans

One file per issue: `issue-<N>.md`, written by the **Fork Issue Planner** workflow (`.github/workflows/fork-issue-planner.md`) when the repository owner opens an issue.

Each plan is an **advisory seed** — a first-round grilling, implementation plan, acceptance criteria, open questions, and verification steps produced without human input. It is not a contract. Check out the matching `plan/issue-<N>` branch, answer the open questions on the issue, then run the Development Orchestrator agent (`/agent` → `.github/agents/dev-orchestrator.agent.md`). It revises the plan using your answers before dispatching `.github/agents/plan-reviewer.agent.md` for a concrete review verdict, then asks for approval. If the reviewer cannot run or return a valid verdict, you must choose whether to retry or proceed without review. Older plans may contain a skeptic's report; that is historical context, not a required gate.

Plans are fork-only and are never promoted upstream. Nothing reads them automatically; they exist for you and for the orchestrator.

The planner may only ever write `issue-*.md` in this directory — the workflow's `allowed-files` policy enforces it, so this README is out of its reach.
