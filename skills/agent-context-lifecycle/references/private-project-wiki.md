# Initialize, resume and maintain private project context

Use only when the project has an authorized private context home or the user asks to initialize one. Do not create a wiki for every ordinary code edit.

## Choose a home and verify the Git boundary

Use repository-relative `.project-context/` as the default for new private working documents. Preserve any already agreed alternative. Inspect current instructions, Git index and ignore rules before writing. Resolve routing before migrating an existing home; see [migration-safety.md](migration-safety.md).

The private root and everything beneath it must be ignored and absent from the Git index. Ignoring does not untrack existing files. Never force-add private content. Keep delivery-required contracts, build/test/eval inputs and documentation tracked under their existing owners; reference them without private copies. Git ignore does not provide encryption, access control or protection from other local tools.

If authorized to edit the repository instruction file, add only a portable conditional entrypoint: when `.project-context/index.md` exists, read it for substantial project work. Preserve other instructions. Do not embed workstation paths or make CI/fresh clones depend on private content.

## Make useful knowledge navigable

Create a compact index and only populated sections the project needs: purpose and boundaries, current state, plans, architecture, decisions, task checkpoints, research, tests and evidence. Names are flexible. Do not scaffold empty directories to satisfy a checklist or map the entire codebase unless requested.

Markdown works for maintained summaries. JSON/CSV results, HTML reports, images and other useful artifacts may retain their original format with provenance and navigation. Raw historical evidence stays immutable. Summaries record revision, scenario, check date and applicability; an old PASS is not a fresh run. Do not copy source code, credentials, caches or raw conversations.

## Resume a session

1. Read active repository instructions, the private entrypoint, current state and task checkpoint. Search the ignored root explicitly: ordinary search may omit it.
2. Recover the objective, accepted constraints, decisions and their authority, completed/pending outcomes, source revisions and publication boundaries. Check the current checkout and changed sources. Handoff text alone proves neither freshness nor permission.
3. Continue pending work while preserving concurrent tasks. Do not overwrite shared state wholesale from a stale snapshot or repeat completed work.
4. A new session in the same checkout can access local private history. A fresh clone cannot. Report missing history explicitly; reconstruct only from authorized backup/handoff or current sources. Never invent prior decisions.

Checkpoint material decisions, observations, scope changes and verified results. A timestamp alone is not a delta. Use the shared delta/reconciliation workflow. At closeout verify entrypoint links and consistency with evidence. Fresh-session loading and behavior need real checks when promised or required; otherwise identify them as pending, not simulated successes.
