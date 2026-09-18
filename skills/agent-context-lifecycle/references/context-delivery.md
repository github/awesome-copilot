# Verify delivery to the consumer

Before editing, identify which levels matter for this consumer and what can verify them. These are not five mandatory gates for every document. N/A requires a reason; lack of access is pending, not N/A or PASS.

| Level | Sufficient evidence |
|---|---|
| **Saved** | Read back the exact written bytes/section and verify source/status; retain revision/hash where needed. |
| **Indexed** | Match the current source revision/hash to the active indexed version. A successful indexing command alone is insufficient. |
| **Discoverable** | An actual scoped lookup or entrypoint traversal finds the current material; open it and check the claim. |
| **Loaded** | A receipt, trace or verified new session confirms the target runtime read the required version. File presence or deployment success is insufficient. |
| **Behavior-verified** | The affected scenario demonstrates expected behavior after loading. A favorable review or paraphrase of the rule is insufficient. |

Check optimistic handoffs against actual evidence. Distinguish a supplied snapshot from live verification. Cached context may need reload or a new session; do not claim another active session has switched versions.

For a handoff to another agent, that receiving agent is the runtime consumer: loaded stays pending until its reading receipt exists, even with direct file navigation and no retrieval index. In a read-only proposal, saved remains pending too. Any proposed completion wording describes the state after application and readback, not the current state.

## Apply to the relevant surface

- **Private project wiki:** verify ignored and untracked boundaries, migration manifests/hashes where applicable, and entrypoint links. A new session in the same checkout can read pending work; a fresh clone does not carry private history. Loaded/behavior claims need actual session evidence. A Git diff is neither required nor sufficient for ignored content.
- **Repository document:** reread the changed section and test its entrypoint/link. Without a retrieval index, indexed is N/A. If the next agent session is promised, loaded stays pending until a receipt. Behavior checks apply when behavior changes or the task explicitly requires them.
- **Shared knowledge base:** follow its identity mapping, owner permissions, schema, links and validation. Reindex only changed indexed content or an independently demonstrated stale index. Then perform a lookup, open the result and compare its revision. Proposals, source code, caches and read-only mirrors do not become accepted knowledge by being nearby.
- **Skill package or agent configuration:** follow the environment owner's delivery process. Check canonical version, package hash, registration and relevant runtime locations. Distinguish OS/client coverage and on-disk discovery from actual loading. Do not repair unrelated configuration drift.
- **Runtime prompt or retrieval loader:** use the owning implementation workflow, identify the source-to-consumer route and version, and run a focused behavior check. Changes after a freeze need its scope-change process.
- **Publication, protected policy or persistent user memory:** follow exact current authorization and the surface owner's workflow. A preview is not publication; an external write needs readback.

Preserve completed dispositions and evidence on partial delivery. Retry only the undelivered segment. When the source changes, recheck dependent evidence and scope.
