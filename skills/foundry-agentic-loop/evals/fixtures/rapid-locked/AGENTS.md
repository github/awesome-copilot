# HR policy assistant

Team conventions: Python formatted with ruff, TypeScript with prettier.

<!-- foundry-agentic-loop:begin mode=rapid -->
## Agentic Loop: rapid prototyping

This workspace is a rapid prototype in an existing Foundry project. For build requests, load the `foundry-agentic-loop` skill and follow its `references/rapid.md`. Short commands:

| Command | Step |
| --- | --- |
| `run` | Start the backend and frontend dev servers and report their URLs |
| `test` | Run the local acceptance, contract and E2E tests |
| `add agent`, `add tool`, `add skill` | Extend against the contract, then rerun the checkpoint probes |
| `deploy` | Redeploy changed agents and MCP servers and rerun their probes, then ask before deploying the app to the target in `.azure/deployment-plan.md` |
| `improve` | Improve mode |
| `convert to SDD` | Confirm, derive the spec with Specify `reverse`, switch this section to SDD and start the workflow |

- The contract lives in the root `README.md`, lessons in `docs/LOOP.md` and Azure settings only in `.azure/deployment-plan.md`, never here.
- This section locks the build mode. Change it only when the user explicitly confirms a switch.
<!-- foundry-agentic-loop:end -->
