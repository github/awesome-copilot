---
name: poka-yoke-ux
description: >-
  Forms, destructive actions and flows users get wrong. Use when "users keep deleting the wrong thing", "add a confirmation dialog", "this flow is error-prone", or building a delete, bulk action, checkout or settings page. Covers undo over confirmation, type-to-confirm, safe defaults, input constraints, double-submit. For the server-side rules behind the screen use authz.
license: MIT
---

# Poka-Yoke for Interfaces

Shingo built jigs so an assembly worker could not seat a part backwards. A form is a jig. The
same ladder applies, and the design literature arrived at the same place independently, Don
Norman's *forcing functions* and Nielsen's *error prevention* heuristic describe the same move
from a different tradition.

The single reframing that does most of the work here: **an error message is a failure of the
design, not a feature of it.** If your interface can tell the user they did something wrong,
it usually could have stopped them doing it. Validation that fires after submission is rung 3.
An input that cannot hold the wrong value is rung 1.

## Building, not reviewing

Most of the time this mode is reached *while someone is building the thing*, not afterwards.
That changes the deliverable. They asked for the interface, so produce the interface, working, complete,
in their stack. Do not hand back a severity table when the person is mid-feature; a list of
findings about code they have not written yet is not useful to them.

Then add a short closing note, three or four lines, covering:

- which misuses the shape you chose makes impossible, and at which rung,
- what you left possible on purpose, and why that tradeoff is the right one here.

That closing note is what stops the device being undone in six months by someone who cannot
see why it is there. It is also the difference between mistake-proofing and a code generator:
the reasoning travels with the code.

When the code already exists and they are asking what is wrong with it, switch to the audit
voice, ranked findings with the mistake, the consequence, and the device. Match the mode to
where they are in the work, not to this file's default.

## The ladder, applied to interfaces

| Rung | In a UI | Example |
|---|---|---|
| **1 Control** | The wrong action cannot be taken | Date picker that excludes unavailable dates · quantity capped at stock · Submit that does not exist until the form is valid · destructive action absent for users without permission |
| **2 Warning** | Possible, but flagged at the moment it happens | Inline field validation on blur · a live character counter turning red · a banner warning that this will affect 4,312 users |
| **3 Detection** | Caught after submission | Error summary at the top of the page · server rejects it · support ticket |
| **0** | Relies on reading | Helper text · tooltips · a warning in a modal that everyone dismisses |

## The rule that separates good UX poka-yoke from bad: undo beats confirm

A confirmation dialog a user sees fifty times a day stops being a decision point. They develop
click-through blindness and press "Confirm" with the same reflex they press "OK", which means
the dialog protects nobody while adding friction to every legitimate action. It is the
interface equivalent of a comment saying "be careful": present, visible, and inert.

The preference order for destructive actions, strongest first:

1. **Make it reversible.** Soft-delete, trash with a retention period, version history. Now the
   mistake has no permanent consequence and needs no gate at all. This is the real answer and
   it is under-used because it is a backend change, not a UI change.
2. **Grace-period undo.** Perform it immediately, show "Deleted. Undo" for several seconds.
   No friction on the happy path, full recovery on the mistaken one. Its close cousin is
   delayed commit, hold the action for N seconds and drop it if undone, which is what Gmail's
   undo-send does, and that is the easier build when the operation cannot be reversed once
   performed.
3. **Require an action proportional to the consequence.** Typing the resource's name to
   confirm, GitHub's repository deletion, works because it cannot be done reflexively. Use
   it only for genuinely irreversible, high-blast-radius actions; used everywhere it becomes
   theater and people copy-paste through it.
4. **A confirmation dialog that states the specific consequence.** "Delete 3 projects and 1,204
   files permanently?" is a real check. "Are you sure?" is not. It asks about resolve, not
   about facts, and the user's resolve is not the thing in question.

A dialog that names the exact object and the exact count is doing fixed-value inspection. A
dialog that says "This action cannot be undone" is doing nothing.

## Designing an interface: enumerate the mistakes first

Same ritual as API design, different failure modes. Before laying out a screen, ask:

1. **What can the user enter that is wrong?** Can they even enter it? Free text where a
   constrained choice exists is a hazard: every free-text field is a place to be wrong.
2. **What is irreversible here?** Delete, send, publish, pay, cancel a subscription, rotate a
   key. Each needs a device from the list above, sized to its blast radius.
3. **What is adjacent to something dangerous?** "Save" beside "Delete" produces mis-clicks
   forever. Separate destructive actions spatially, style them differently, and never make
   them the default focus or the primary button.
4. **What does the user have to remember or carry between steps?** Anything they must hold in
   their head across a page transition will be dropped.
5. **What happens if they double-click, refresh mid-submit, or hit back?** Double submission
   is the UI's version of a non-idempotent retry, and it double-charges people.
6. **What is the state of this control when the data is missing, huge, or slow?** Empty,
   loading, error, and overflow states are where interfaces improvise.

## The devices

**Constrain the input rather than validate it.** A picker instead of a text field, a stepper
instead of a number input, a mask that only accepts a valid shape, `inputmode` and `type` so
mobile keyboards offer the right keys, `max`/`min` that the control actually enforces. Every
value the field cannot hold is a validation rule you never have to write and a user who never
sees an error.

**Disable the action until it can succeed**, but always show *why*. A greyed-out Submit with
no explanation is its own dead end; pair it with the specific unmet requirement. Pick between
the two shapes deliberately: native `disabled`, which takes the button out of the tab order,
so the reason has to live in adjacent text a screen reader will reach anyway; or
`aria-disabled` with the handler refusing the submit, which keeps the button focusable so the
reason is announced on the control itself.

**Validate at the right moment.** On blur for the field just left, never on every keystroke
while someone is still typing, validating a half-typed email as invalid trains people to
ignore your validation. Re-validate on submit, and put focus on the first offending field.

**Preserve the user's work.** Losing entered data to a validation error, a session timeout, or
a back button is one of the most common and most infuriating mistakes an interface permits.
Draft autosave, restore-on-return, and never clear a form on a failed submit.

**Make defaults safe rather than convenient.** The pre-selected option should be the one whose
consequences are smallest if chosen inattentively, least-privilege, narrowest scope, private
rather than public, opt-in rather than opt-out. Many users never change a default, so a
default is a decision you are making for most of your users.

**Prevent double submission structurally.** Disable the control on submit *and* carry an
idempotency key on the request, because the button is not the only path, refresh, back, and
a flaky network all retry. The UI device and the API device are the same hazard (M2 in the
hazard catalog) seen from two sides.

**Show scale before a bulk action.** "This will email 12,400 people" is fixed-value inspection
and it stops the mistake that a confirmation dialog does not.

## Auditing an existing interface

Read the actual component code, forms, buttons, modals, mutation handlers: not just
screenshots. What to look for, in priority order:

1. **Every irreversible action.** Find the delete, send, publish, pay, and cancel handlers.
   For each: what device guards it, at what rung, and is the action recoverable at all? An
   irreversible action with only a generic confirm is the highest-value finding you will make.
2. **Every free-text input.** Could it be a constrained control instead? What happens with
   empty, whitespace-only, very long, pasted-with-formatting, or unicode input?
3. **Adjacency and defaults.** Is a destructive button next to a benign one, styled the same,
   or the default focus? Is any default the risky option?
4. **Submission paths.** Double-click, refresh mid-flight, back button, slow network. Is the
   mutation idempotent?
5. **Error handling.** When validation fails, is the user's input preserved, is focus moved to
   the problem, and does the message say how to fix it rather than what is wrong?
6. **Permissions.** Is a dangerous action merely hidden, or actually unavailable? Hiding a
   button is not a device: the endpoint is still there. Check that the server enforces it.

Report using the same structure as `audit`: mistake, consequence, current rung,
proposed device and rung. Propose before editing.

## Restraint

Friction is a cost paid by every user on every legitimate use, and the mistake is made rarely.
Confirmations on reversible actions, validation on optional fields, and are-you-sure dialogs
on ordinary saves make an interface exhausting without preventing anything, and they train
users to dismiss the dialogs that matter. Aim devices at what is irreversible and
consequential; let everything else be fast, and make it undoable instead.

The pattern reference at `references/ux-patterns.md` has the concrete
forms of each device and the standard destructive-action patterns. The hazard catalog at
`references/hazard-catalog.md` still applies to the code behind the
screen: a mistake-proof form in front of a non-idempotent endpoint is only half a device.
