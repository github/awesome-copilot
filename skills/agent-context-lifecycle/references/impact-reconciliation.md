# Reconcile semantic impact

Scope is the documents and artifacts materially related to this task delta, not a fixed list of filenames and not a whole-repository audit. Use the record in [context-delta.md](context-delta.md).

## Discover the affected set

Start from the objective and actual change: decision IDs, source revisions, changed symbols/contracts, issue IDs, paths, links, experiments and datasets. Compare the diff, accepted task state and opened primary sources. Use an existing code graph when available for symbols/callers; exact search remains necessary for literals, configuration and dynamic registration. Do not build a new index just for this checkpoint.

Known homes and entrypoints are seeds. Search identifiers, claim-specific synonyms and code references in tracked documents and separately in the authorized private root. For an ignored folder, a narrowly scoped `rg --hidden --no-ignore` can be necessary. Do not search unrelated home directories, caches or secrets. Read relevant JSON, CSV, HTML, PDF and images as well as Markdown when their claims are affected.

Follow outgoing links, backlinks, citations, supersession, consumer/procedure dependencies and references to affected code. Inspect each target's claims before expanding its relevant relationships. Track visited normalized target plus revision to avoid cycles. Stop when the frontier is exhausted or remaining links cannot affect these claims; do not use an arbitrary file count or depth as proof of coverage. Resolve missing links by exact ID/path/title within the authorized search scope. An unavailable required source leaves coverage pending.

## Decide what changes

For each affected claim, record its home, consumers, affected/unaffected reasons and what to update, retain or block. A current task artifact can be `already-current`. If no home exists, name an exact proposed target or mark `blocked`; “send to owner” alone is insufficient.

Update maintained product, architecture, status, roadmap, research and test summaries by meaning. Replace superseded current rules while retaining provenance. Keep one current claim home; derived documents link to it and explain only their specific applicability. Do not copy the same status everywhere.

Historical minutes, raw test/eval reports and snapshots stay unchanged. Update a maintained applicability record with a link to original evidence. A new result is new evidence; a prior failure remains a prior failure.

## Apply without loss

Immediately before writing, reread the target and compare its revision/hash with the inspected version. Apply the smallest authorized diff. Preserve unrelated concurrent claims and other tasks' pending outcomes. Local edit permission does not authorize external publication, protected policy, relocation or user-memory writes.

One drift allows a narrow reconciliation; a second conflict blocks only that record. Read back the actual write and check entrypoint links. Replay processes only pending records. A source change reopens affected verification with provenance under the existing ID; it does not erase completed independent work.
