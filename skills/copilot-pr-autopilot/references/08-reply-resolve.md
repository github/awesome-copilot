# Step 8: Reply (always) + resolve (conditional)

Sub-agent type: `general-purpose` **drafts** the reply bodies; the
**parent** posts them (mutations stay parent-owned). Budget for the
drafting sub-agent: 5 min.

Runs AFTER step 7 (commit + push) so every reply can cite the
**pushed commit SHA**.

## Inputs

- The full triage table from step 4 — `{ thread_id, action,
  rationale }` per open thread (including `escalate-to-user`).
- The pushed `HeadOid` from step 7.
- The per-thread fix `summary` and `files_touched` from step 5 (for
  `fix` rows).

## Return contract

One row per open thread:

```
{ thread_id, action, reply_body }
```

Where `action` ∈ `fix` | `decline` | `escalate-to-user`. The parent
consumes this to drive the resolve/no-resolve decision (see
Procedure).

## Procedure

1. **Drafting sub-agent** produces a `reply_body` per thread by
   selecting the appropriate template (see [#templates](#templates))
   based on the triage `action`. Cite the pushed SHA from step 7 in
   `fix` replies. For `escalate-to-user`, explain the disposition and
   the open question for the human merge owner; do not promise a
   resolve.
2. **Parent posts each reply**, choosing whether to resolve:

   ```pwsh
   pwsh ./scripts/08-reply-and-resolve.ps1 -ThreadId <id> -Body <text>
   ```

   - `action ∈ { fix, decline }` → run as above (resolve happens).
   - `action == escalate-to-user` → **add `-NoResolve`** so the thread
     stays open for the human:

     ```pwsh
     pwsh ./scripts/08-reply-and-resolve.ps1 -ThreadId <id> -Body <text> -NoResolve
     ```

## Gotchas

- **Reply to every open thread; resolve only when the loop owns the
  disposition** (`fix` or `decline`). Resolving without a reply
  leaves no record of why the issue was considered addressed.
- **Escalated threads stay open *with our reply* explaining the
  disposition.** They're explicit hand-offs to the human merge
  owner, not loop failures — that's why convergence in step 9 can
  succeed with `OpenThreadCount > 0`.
- **Mutations are parent-owned.** The sub-agent only drafts; it never
  posts. This keeps the audit trail of mutations on the parent and
  avoids double-post races between concurrent sub-agents.
- **Cite the pushed SHA, not a local commit.** Step 7's recorded
  `HeadOid` is the only SHA reviewers can browse to.
- **Reply hygiene matters for the next round.** Declines that don't
  cite reasoning get re-raised by the next Copilot review. See
  [04-triage.md](04-triage.md#reply-hygiene).

## Templates

Pick by triage action:

| Triage action | Template |
|---------------|----------|
| `fix` | [reply-fix.md](../templates/reply-fix.md) |
| `decline` | [reply-decline.md](../templates/reply-decline.md) |
| PR-description / comment drift acknowledgement | [reply-drift.md](../templates/reply-drift.md) |
| Partial fix with deferred follow-up | [reply-partial.md](../templates/reply-partial.md) |

For `escalate-to-user`, there is no template — write a bespoke reply
explaining the disposition and the open question, then post with
`-NoResolve` so the thread stays open.

## Reply guidance

The reply has to do real work — it documents the decision for future
maintainers and shapes what the next Copilot review will surface.

Be **concrete** (cite file paths, commit SHAs, function names),
**direct** (no hedging when you have a position), and **brief** (2–4
sentences is typical). Long replies usually mean the round should
have been broken up.

### Anti-patterns — DO NOT use

- ❌ `"Thanks!"` / `"Good point."` with no substance.
- ❌ `"Will fix later."` Either fix it now or decline with rationale;
  deferred fixes that aren't tracked anywhere get lost.
- ❌ Resolve-without-reply. The next reviewer cannot reconstruct why
  the thread was closed.
- ❌ `"I disagree."` with no reasoning. State the actual technical
  disagreement.