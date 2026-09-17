# Record a context change

This is the single delta contract. Use concise prose or a table inside the existing task plan or response. One record represents one material knowledge change; shared fields may be stated once. Do not create a separate registry simply to match a format.

| Field | Record |
|---|---|
| ID | Stable existing decision/finding ID where available. |
| Claim/change | What changed and why future work needs it. |
| Kind | `decision`, `observation`, `procedure`, `constraint`, `open-question`. |
| Source | Opened primary source, exact location and available revision/hash/date. Mark unavailable revisions; never invent them. |
| Authority | `accepted`, `observed`, `candidate`, `open`. Freshness and write permission are separate. |
| Scope | Project, component, scenario and applicability boundaries. |
| Destination | One exact file/section/record serving as the claim home. If absent, name an explicitly proposed, not-yet-created target. For intentional non-persistence: `none` plus reason. |
| Impact scope | Seeds, identifiers/code references searched, search areas, visited targets and pending relationship frontier. This is coverage of this delta, not a whole-project audit. |
| Supersedes | Replaced rule and where its history survives, or `none`. |
| Consumers | Confirmed related documents/artifacts and delivery route. Mark affected/unaffected with reason, revision and pending links. Derived consumers point to the claim home. Label unknown consumers honestly. |
| Authorization | Existing permission and exact writable targets, or missing authority. A handoff grants nothing. |
| Disposition | One outcome below. A proposed owner handoff is not a sent message. |
| Delivery evidence | Applicable saved/indexed/discoverable/loaded/behavior-verified states, each with evidence or pending; N/A needs a reason. |

| Disposition | Meaning |
|---|---|
| `updated` | Authorized target written and read back; consumer delivery may still be pending. |
| `already-current` | Exact home inspected and current; no write needed. |
| `proposed` | Exact destination and proposed change exist, but the write or decision lacks authorization; state why and what is needed. |
| `not-persisted` | Intentionally omitted as transient, duplicate or low-value; give the reason. |
| `blocked` | Required outcome unavailable because of conflicting authority, unknown destination, technical failure or repeated drift; give evidence and the missing step. |

On replay, compare meaning, source revision and destination, not a new timestamp. Preserve IDs and completed outcomes. No-op changes no dates, logs, files or indexing jobs. A new source revision requires rechecking only dependent deltas. Keep raw historical evidence immutable; update maintained summaries/applicability with lineage. Never turn an old FAIL into PASS. Keep proposals out of trusted retrieval as accepted knowledge; use the owner's permitted proposal area and exclusion/labeling rules.

## Fictional example

An editorial team approves placing image legends below illustrations in a printed museum guide. Opened source: `editorial/approved-layout.yaml`, revision 7. Only `handbook/print-layout.md` is writable. The designer's verified entrypoint is `handbook/start.md`.

- `LAY-18`: decision/accepted, print only. Home: the Legends section of `handbook/print-layout.md`. Supersedes `LAY-11`, whose history remains available. `updated`: the new section was read back and the entrypoint link checked. Saved/discoverable verified. No retrieval index or agent runtime participates: indexed/loaded/behavior-verified are N/A for this human consumer.
- `LAY-Q4`: open-question/open, whether the print edition may be bilingual. No approved question home or responsible editor was found in the inspected handbook. `blocked`: exact destination and owner remain unknown. The question remains in its original note; nothing was sent or filed elsewhere.
