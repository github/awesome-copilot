# UX Device Patterns

Concrete forms of the interface devices, with the rung each reaches. The lineage here is
Norman's *forcing functions* and Nielsen's error-prevention heuristic, both of which are the
design world's version of Shingo's argument.

## Destructive actions, by consequence

Match the device to what is actually lost. Over-gating cheap actions is how users learn to
ignore gates.

| Consequence | Device | Rung |
|---|---|---|
| Recoverable (draft, filter, sort) | Nothing. Just do it. |, |
| Recoverable with effort (archive, unpublish) | Immediate action + "Undo" toast, 5–10s | Control |
| Data loss, recoverable server-side | Soft delete + trash with retention; no dialog at all | Control |
| Irreversible, low value (single item) | Dialog naming the specific item | Warning |
| Irreversible, high value (bulk, account, repo) | Type the resource name to confirm | Warning |
| Irreversible + external (send, publish, charge) | Preview of exactly what will happen + delay window | Control |

**Norman's three forcing functions**, which is the vocabulary worth having:
*interlock* (order is enforced: the microwave stops when the door opens), *lock-in* (you
can't leave mid-way without acknowledging, "you have unsaved changes"), *lockout* (you can't
enter: the action is unavailable until preconditions are met).

## Confirmation dialogs that actually work

If you must use one, it needs all four:

1. **Name the object.** "Delete `production-api`?" not "Delete this item?"
2. **State the scale.** "3 projects and 1,204 files." A count is fixed-value inspection.
3. **State reversibility honestly.** If it's recoverable for 30 days, say so, overclaiming
   permanence trains people to disbelieve you.
4. **Label the button with the verb, not "OK".** "Delete forever" / "Cancel". A user scanning
   for the confirm button should read what they are confirming.

What makes a dialog useless: appearing on every action, appearing for reversible actions,
saying "Are you sure?", and defaulting focus to the destructive button.

## Forms

| Hazard | Device | Rung |
|---|---|---|
| Wrong value typed | Constrained control, picker, stepper, select, mask | Control |
| Wrong format | `type` + `inputmode` + `pattern`; parse on blur | Warning |
| Out of range | `min`/`max` enforced by the control, not just checked | Control |
| Required field missed | Submit disabled + the specific unmet reason shown | Control |
| Wrong option chosen inattentively | Safest option as the default | Control |
| Work lost | Draft autosave; never clear on failed submit | Control |
| Double submission | Disable on submit **and** an idempotency key on the request | Control |
| Error not understood | Message says how to fix, focus moves to the field | Warning |
| Wrong row acted on in a table | Show the identifying value in the action's confirmation | Warning |

**Validation timing** is where most forms go wrong. Validate on blur for the field just left;
never per-keystroke while someone is mid-entry (a half-typed email flagged as invalid teaches
users to ignore validation); re-validate on submit; move focus to the first error.

**Disabled submit needs a visible reason.** A greyed-out button with no explanation is its own
dead end, and it must stay reachable by keyboard and screen reader so the reason is announced
rather than silently unavailable.

## Irreversible-action patterns worth copying

- **Grace-period undo** (Gmail undo-send): perform immediately, hold the effect for N seconds,
  offer withdrawal. Zero friction on the happy path, full recovery on the mistake. The best
  general-purpose device in this list.
- **Type-to-confirm** (GitHub repo deletion): raises the cost of a reflexive action by making
  the user reproduce the object's name. Reserve for genuinely catastrophic actions, used
  broadly, it becomes copy-paste theater.
- **Two-key / second approver**: for actions that should never be one person's decision.
- **Scheduled with a cancel window**: "This will run in 15 minutes" for bulk operations.
- **Preview the diff**: show exactly what changes before applying, for settings and bulk edits.

## Bulk operations

The dangerous property is that scale is invisible, selecting "all" is one click and affects
everything. Devices: show the affected count before the action, prominently; cap selection
size or require an extra step above a threshold; run against a preview first; make the result
undoable in one action rather than N.

"Select all" that silently means "all 40,000 matching, not the 50 on screen" is a well-known
interface trap. Distinguish the two explicitly.

## Defaults and destructive adjacency

- The default is the decision most users get, because many never change it. Make it the option
  with the smallest consequence if chosen inattentively, private over public, narrowest
  scope, opt-in over opt-out.
- Never place a destructive action adjacent to a frequent benign one, never give both the same
  visual weight, and never make the destructive one the default focus or the primary button.
- Destructive actions belong out of the primary flow: a menu, a settings section, below a
  fold: not on the toolbar next to Save.

## Permissions

Hiding a button is presentation, not authorization. If a user should not perform an action,
the server must refuse it, otherwise the "device" is a suggestion the API ignores. Hide *and*
enforce; see `authz` for the server half.

## Error prevention that overlaps accessibility

These are error-prevention devices that happen to also be a11y requirements, which makes them
easy to justify: labels tied to inputs (so the field's purpose is never ambiguous), focus moved
to the error on failed submit, errors identified by more than color, target sizes large enough
to prevent mis-taps, and no time limits on entry that can expire mid-task.
