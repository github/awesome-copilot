---
name: poka-yoke-design
description: >-
  Design APIs, schemas, types and state machines so misuse cannot be expressed. Use when writing a new interface and someone asks "what should the types look like", "make invalid states unrepresentable", "so callers cannot screw it up", or wants illegal state transitions rejected. Covers branded types, discriminated unions, typestate, parse-don't-validate. For code that already exists use audit.
license: MIT
---

# Poka-Yoke Design

Mistake-proofing is cheapest before the code exists. Once an interface has callers, every
device you add is a migration; before it has callers, a device is free. So the work here is
front-loaded: decide how this thing will be misused, *then* pick the shape that makes the
misuse unsayable.

This is Shingo's **source inspection**: checking the conditions that produce errors rather
than the errors themselves, and it is the strongest of his three inspection types, because
the error never gets the chance to happen.

## The ritual: enumerate misuse before you write the signature

Two minutes on this list determines the design.

1. **Can any two parameters be swapped without complaint?** Same type adjacent to same type is
   among the most common footguns in software.
2. **What must a caller remember to do?** Call something first, close a handle, pass the right
   units. Every "must remember" is a defect scheduled for later.
3. **Which combinations of state are nonsense?** If you can construct a value that means
   nothing, the type is wrong.
4. **What happens on the second call?** Retries, double-clicks, at-least-once queues. If the
   answer is "it charges twice", you need a motion-step device.
5. **What is the worst plausible input?** Empty set, enormous set, null, wrong tenant,
   yesterday's token, a string from an attacker.
6. **When someone adds a case next year, what breaks?** The right answer is "the build".

Write the answers where the user can see them, then design against them.

## The moves, in preference order

Reach for the highest one the language allows. Each rung down is a real concession — take it
consciously and say why.

### 1. Make the illegal state unrepresentable (Control, contact lens)

Change the type so the bad value has no spelling. Distinct types for distinct concepts:
`UserId` and `OrderId` are not both `string`, money is not a float. Sum types over bags of
optionals: `{status, error?, data?, retryAt?}` permits "succeeded with an error"; a
discriminated union permits exactly the states that exist. A struct with N optional fields
claims 2^N states are legal — ask how many actually are.

### 2. Parse, don't validate (Control at the boundary)

Validation returns a boolean and throws the knowledge away. Parsing returns a *type* that
carries the proof: `parseEmail(s): Email | Error` means every downstream function taking
`Email` cannot receive garbage. Do it once, at the edge — HTTP handlers, queue consumers,
config loading, third-party responses. Inside the boundary, work only with parsed types.

### 3. Make order and lifecycle enforceable (Control, motion-step lens)

Encode the sequence in types rather than prose. Typestate: each operation consumes one state
and returns the next, so `.commit()` does not exist on an unvalidated value. Builders that
cannot `build()` until required steps have run. Constructors that return ready objects — if
`init()` must be called before use, the constructor is doing the wrong job. Scope-bound
resources (context managers, `defer`, RAII) rather than "remember to close". Idempotency keys
as *required* parameters for anything moving money or mutating external state; an optional
idempotency key is a suggestion, and suggestions are rung zero.

### 4. Make completeness checkable (Control/Warning, fixed-value lens)

Exhaustive matching with a compiler-enforced unreachable arm, so adding an enum variant breaks
the build at every site that must change — one line per switch, and among the highest-leverage
devices there is. Required arguments where there is no safe default: a default that is wrong
half the time hides the decision. Whole-config validation at startup, so a missing variable
fails the deploy rather than the 3am request.

### 5. Fail fast and loud (Warning)

When the type system genuinely cannot express the constraint, assert at the boundary and throw,
with a message naming the mistake and the fix. Two rules decide whether this rung works at all:

- **No silent fallbacks.** `catch {}`, `except: pass`, `|| default`, `unwrap_or_default()` on an
  error path are devices *removed* — they convert a loud mistake into a quiet one. If a fallback
  is genuinely correct, say which failure it absorbs and why that failure is expected.
- **Destructive operations default to safe.** Dry-run by default; refuse an empty or oversized
  set. `deleteUsers(filter)` with an empty filter should raise, not truncate the table.

### 6. Where the language can't help, use the data layer

The database is a type system every service shares. `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys
and partial unique indexes hold even when someone connects with `psql` or ships a service in
another language. When application-level enforcement is the only thing between you and corrupt
data, push it down.

## Deliver the design with its reasoning attached

You were asked for code, so write the code. But narrate the mistake-proofing in a few lines,
because the reasoning is what stops it being undone later:

- what misuses you enumerated,
- which ones the design now makes impossible, and at which rung,
- which ones you consciously left possible, and why.

That last bullet matters most. Every design leaves something possible; naming it is the
difference between a considered tradeoff and an oversight.

