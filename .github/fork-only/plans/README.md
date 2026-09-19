# Plans

One file per issue: `issue-<N>.md`, written by the **Fork Issue Planner** workflow (`.github/workflows/fork-issue-planner.md`) when the repository owner opens an issue.

Each plan is an **advisory seed** — a first-round grilling, implementation plan, and skeptic's critique produced without human input. It is not a contract. Check out the matching `plan/issue-<N>` branch, run the Development Orchestrator agent (`/agent` → `.github/agents/dev-orchestrator.agent.md`) against the issue, and rewrite the plan freely as the real answers come in.

Plans are fork-only and are never promoted upstream. Nothing reads them automatically; they exist for you and for the orchestrator.

The planner may only ever write `issue-*.md` in this directory — the workflow's `allowed-files` policy enforces it, so this README is out of its reach.
