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

Before writing an interface, spend real effort on this list. It takes two minutes and it
determines the design.

1. **What are the parameters, and can any two be swapped without complaint?** Same type
   adjacent to same type is among the most common footguns in software.
2. **What must a caller remember to do?** Call something first. Call something after. Check a
   return value. Close a handle. Pass the right units. Every "must remember" is a defect
   scheduled for later.
3. **What states can this thing be in, and which combinations are nonsense?** If you can
   construct a value that means nothing, the type is wrong.
4. **What happens on the second call?** Retries, double-clicks, at-least-once queues. If the
   answer is "it charges twice," you need a motion-step device.
5. **What's the worst plausible input?** Empty set, enormous set, null, wrong tenant,
   yesterday's token, a string from an attacker.
6. **When someone adds a new case next year, what breaks?** The right answer is "the build."
   The wrong answer is "nothing, it silently falls through."

Write the answers down where the user can see them, briefly. Then design against them.

## The moves, in preference order

Reach for the highest one the language and situation allow. Each rung down is a real
concession, take it consciously and say why.

### 1. Make the illegal state unrepresentable (Control, contact lens)

The strongest move: change the type so the bad value has no spelling.

- **Distinct types for distinct concepts.** `UserId` and `OrderId` are not both `string`.
  Money is not a float. A timeout is not a bare number. Branded types / newtypes / value
  objects cost almost nothing and kill an entire class of swap-and-mix-up bugs.
- **Sum types over bags of optionals.** `{status, error?, data?, retryAt?}` permits states
  like "succeeded with an error and a retry time." A discriminated union permits exactly the
  states that exist. If your struct has N optional fields, it claims 2^N states are legal;
  ask how many actually are.
- **Non-empty and bounded collections** when zero or unbounded is nonsense.

### 2. Parse, don't validate (Control at the boundary)

Validation returns a boolean and throws the knowledge away; parsing returns a *new type* that
carries the proof. `validateEmail(s: string): boolean` leaves every downstream function still
holding an unvalidated string. `parseEmail(s: string): Email | Error` means downstream
functions that take `Email` cannot receive garbage: the type system carries the guarantee
for you, forever, for free.

Do this once, at the system's edge: HTTP handlers, queue consumers, config loading, file
parsing, and every third-party response. Inside the boundary, work only with parsed types.

### 3. Make order and lifecycle enforceable (Control, motion-step lens)

When steps must happen in sequence, encode the sequence in types rather than in prose:

- **Typestate**: each operation consumes one state and returns the next, so `.commit()` does
  not exist on an uncommitted-and-unvalidated value.
- **Builders that cannot `build()`** until required steps have run, enforced by the type,
  not by a runtime check, where the language allows it.
- **Constructors that return ready objects.** If `init()` must be called before use, the
  constructor is doing the wrong job. Give it a static factory that does both.
- **Scope-bound resources**: context managers, `defer`, RAII, `using`. Never "remember to close."
- **Idempotency keys as required parameters** for anything that moves money, sends a message,
  or mutates external state. Required, not optional: an optional idempotency key is a
  suggestion, and suggestions are rung zero.

### 4. Make completeness checkable (Control/Warning, fixed-value lens)

- **Exhaustive matching** with a compiler-enforced never/unreachable arm, so adding an enum
  variant breaks the build at every site that must change. This is one of the highest
  leverage devices in existence and it costs one line per switch.
- **Required arguments over defaulted ones** when there is no safe default. A default that is
  wrong half the time is worse than no default: it hides the decision.
- **Whole-config validation at startup**, so a missing variable fails the deploy rather than
  the 3am request.

### 5. Fail fast and loud (Warning)

When the type system genuinely cannot express the constraint, assert at the boundary and
throw. This is a real poka-yoke, one rung down. Make the message name the mistake and the fix.

Two rules that decide whether this rung works at all:

- **No silent fallbacks.** `catch {}`, `except: pass`, `|| defaultValue`, `unwrap_or_default()`
  on an error path. These are devices *removed*. They convert a loud mistake into a quiet
  one, which is exactly backwards. If a fallback is genuinely correct, the comment must say
  which failure it is absorbing and why that failure is expected.
- **Destructive operations default to safe.** Dry-run by default, require an explicit
  predicate, refuse to act on an empty or oversized set. `deleteUsers(filter)` with an empty
  filter should raise, not truncate the table.

### 6. Where the language can't help, move the device to the data layer

The database is a type system that all your services share. `NOT NULL`, `CHECK`, `UNIQUE`,
foreign keys, and partial unique indexes are Control-rung devices that hold even when someone
writes a script, connects with `psql`, or ships a service in another language. When
application-level enforcement is the only thing standing between you and corrupt data, push
it down.

## Deliver the design with its reasoning attached

You were asked for code, so write the code. But narrate the mistake-proofing in a few lines,
because the reasoning is what stops it being undone later:

- what misuses you enumerated,
- which ones the design now makes impossible, and at which rung,
- which ones you consciously left possible, and why.

That last bullet matters most. Every design leaves something possible; naming it is the
difference between a considered tradeoff and an oversight.

## Restraint

Mistake-proofing has a cost, and past a point it stops paying. Signs you have gone too far:
five wrapper types for one function, a builder for a two-field struct, a type parameter no
caller will ever understand. The test is whether the device prevents a mistake someone would
*plausibly make*, weighted by what happens when they do. An internal helper with two callers
and a trivial failure mode does not need a newtype; a public payments API does.

Sean Goedecke's [critique of the maximalist version](https://www.seangoedecke.com/invalid-states/)
is worth taking seriously: types that model every invariant can become harder to change than
the bugs they prevent. Aim the strongest devices at the highest blast radius, and leave
low-stakes code readable.

Read `references/hazard-catalog.md` for the misuse shapes worth
enumerating, and the matching `references/lang-*.md` for what your language can actually
express: the moves above are only as strong as the type system underneath them.
