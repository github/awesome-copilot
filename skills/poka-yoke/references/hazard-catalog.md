# Hazard Catalog

The recurring shapes that produce mistakes, organized by the lens that finds them. Each entry:
what to look for, why it bites, and the device that closes it with the rung it reaches.

Use this as working vocabulary, not a checklist to run top to bottom. The lens questions are
the real tool; this catalog is what the lenses usually turn up.

## Contents

- [Contact lens, can the wrong thing fit?](#contact-lens-can-the-wrong-thing-fit)
  - [C1. Adjacent same-type parameters](#c1-adjacent-same-type-parameters)
  - [C2. Boolean flag parameters](#c2-boolean-flag-parameters)
  - [C3. Primitive obsession at boundaries](#c3-primitive-obsession-at-boundaries)
  - [C4. Stringly-typed enums](#c4-stringly-typed-enums)
  - [C5. Implicit units and magnitudes](#c5-implicit-units-and-magnitudes)
  - [C6. Money as a float](#c6-money-as-a-float)
  - [C7. Unvalidated external input](#c7-unvalidated-external-input)
  - [C8. Bag-of-optionals structs](#c8-bag-of-optionals-structs)
  - [C9. Naive datetimes](#c9-naive-datetimes)
- [Fixed-value lens, can an incomplete or wrong-sized set pass?](#fixed-value-lens-can-an-incomplete-or-wrong-sized-set-pass)
  - [F1. Non-exhaustive branching](#f1-non-exhaustive-branching)
  - [F2. Unbounded destructive operations](#f2-unbounded-destructive-operations)
  - [F3. Defaults that hide a decision](#f3-defaults-that-hide-a-decision)
  - [F4. Config discovered missing at runtime](#f4-config-discovered-missing-at-runtime)
  - [F5. Partial writes without a transaction](#f5-partial-writes-without-a-transaction)
  - [F6. Invariants enforced only in the application](#f6-invariants-enforced-only-in-the-application)
  - [F7. Unbounded input](#f7-unbounded-input)
- [Motion-step lens, can the order be wrong?](#motion-step-lens-can-the-order-be-wrong)
  - [M1. Temporal coupling](#m1-temporal-coupling)
  - [M2. Non-idempotent retryable effects](#m2-non-idempotent-retryable-effects)
  - [M3. Illegal state transitions](#m3-illegal-state-transitions)
  - [M4. Resources that must be released](#m4-resources-that-must-be-released)
  - [M5. Check-then-act races](#m5-check-then-act-races)
  - [M6. Fire-and-forget async](#m6-fire-and-forget-async)
  - [M7. Order-dependent migrations and deploys](#m7-order-dependent-migrations-and-deploys)
- [Cross-cutting, devices that were removed](#cross-cutting-devices-that-were-removed)
  - [X1. Swallowed errors](#x1-swallowed-errors)
  - [X2. Silent coercion and fallback](#x2-silent-coercion-and-fallback)
  - [X3. Disabled tests](#x3-disabled-tests)
  - [X4. Escape hatches in the type system](#x4-escape-hatches-in-the-type-system)
  - [X5. Mutable shared defaults](#x5-mutable-shared-defaults)

---

## Contact lens, can the wrong thing fit?

The factory analogy: a part that only seats one way. In software, the type is the shape.

### C1. Adjacent same-type parameters

**Signal**: two or more consecutive parameters of the same primitive type, `transfer(from: string, to: string)`, `resize(w: number, h: number)`,
`slice(start: int, end: int)`.

**Why it bites**: swapping them compiles, passes review, and produces a plausible wrong
result. It is among the most common footguns in software, and one of the most cleanly
solved, once the two types differ, the wrong order will not compile.

**Device**: distinct types per concept, branded types, newtypes, value objects, so a
`SourceAccount` cannot be passed as a `DestinationAccount`. **Control.**
Fallback where types can't help: force keyword/named arguments so the caller must write the
name at the call site. **Warning**, but nearly free and it makes the swap visible in review.

### C2. Boolean flag parameters

**Signal**: `createUser(name, true, false)`, `save(data, force=True)`, any `bool` parameter
that selects behavior rather than carrying data.

**Why it bites**: the call site is unreadable, so misordered or misunderstood flags are
invisible. Adding a second boolean makes it exponentially worse.

**Device**: an enum or literal union per axis (`Visibility.Public`), an options object with
named fields, or two separate functions. **Control** for the enum, since the wrong value has
no spelling. Note the exception: a single boolean whose name reads correctly at the call site
in a keyword-argument language is fine.

### C3. Primitive obsession at boundaries

**Signal**: `string` for email, URL, path, token, tenant ID, phone; `int` for a percentage or
a duration, especially on public functions.

**Why it bites**: every downstream function must re-check or trust. Validation that returns a
boolean throws away the proof, so the check gets repeated, skipped, or done inconsistently.

**Device**: parse-don't-validate. `parseEmail(s): Email | Error` once at the boundary, then
downstream signatures demand `Email`. The type carries the guarantee permanently. **Control.**

### C4. Stringly-typed enums

**Signal**: `status: string` with a comment listing the values; string comparison against
literals; a value crossing a boundary as text with no schema.

**Why it bites**: typos compile. New variants added elsewhere never reach this code. Nothing
tells you which values are legal.

**Device**: a literal union, enum, or sealed class, with exhaustive matching (F1). **Control.**

### C5. Implicit units and magnitudes

**Signal**: `timeout: number`, `distance: float`, `retryAfter: int`: no unit anywhere except
possibly a name or a comment. Two systems in the same codebase disagreeing on seconds vs
milliseconds.

**Why it bites**: a 1000x error is silent and looks like a hang or a hot loop. This class of
mistake famously destroyed a Mars orbiter.

**Device**: unit-bearing types (`Duration`, `Milliseconds`), or at minimum encode the unit in
the parameter name (`timeoutMs`). **Control** for the type. The name is **rung 0**: it makes
a mismatch visible to a reader who is looking, and produces no diagnostic for one who is not.
Worth doing; not a device.

### C6. Money as a float

**Signal**: `price: float`, `amount: number`, arithmetic on currency in binary floating point,
`==` comparisons on money.

**Why it bites**: 0.1 + 0.2 ≠ 0.3. Errors accumulate over aggregation and reconciliation
fails in ways that take days to trace.

**Device**: integer minor units (cents) in a `Money` type carrying its currency, or a decimal
type. Mixed-currency arithmetic should not typecheck. **Control.**

### C7. Unvalidated external input

**Signal**: `JSON.parse(body)` into `any`, `request.json()` into a bare dict, a third-party
API response used field-by-field with no schema, `os.environ[...]` read deep inside logic.

**Why it bites**: the failure surfaces far from the boundary, as a confusing error about a
missing property, long after the malformed data has been partially processed or stored.

**Device**: a schema at every edge, zod/valibot, Pydantic, `encoding/json` into a typed
struct with validation, serde. Parse once, then work with parsed types. **Control.**
This applies to *your own* services' responses too; "internal" is not a guarantee.

### C8. Bag-of-optionals structs

**Signal**: a type with several optional fields where only certain combinations are
meaningful, `{ status, data?, error?, retryAt? }`, `{ isLoading, data, error }`.

**Why it bites**: N optional fields claim 2^N legal states. Every consumer must guess which
are real, and they guess differently. States like "loading and errored with data" become
reachable and get handled inconsistently.

**Device**: a discriminated union with exactly the legal variants, so impossible combinations
have no representation. **Control.** This is the canonical "make invalid states
unrepresentable" move.

### C9. Naive datetimes

**Signal**: timezone-less timestamps, `datetime.now()` / `new Date()` scattered through
business logic, dates stored as strings, DST-unaware arithmetic.

**Why it bites**: correct in the developer's timezone, wrong in production, and wrong twice a
year in the places that observe DST. Also hard to test, logic that reads the clock directly
cannot be exercised at a boundary condition without freezing or injecting time.

**Device**: timezone-aware types everywhere, UTC at rest, an injected clock so time is a
parameter rather than an ambient read. **Control** for the type, and the injected clock buys
testability, which is a Detection-rung device that finally becomes possible.

---

## Fixed-value lens, can an incomplete or wrong-sized set pass?

The factory analogy: a counter confirming all six screws were fitted.

### F1. Non-exhaustive branching

**Signal**: a `switch`/`match` over an enum with a `default` that does nothing meaningful, or
an if/else chain over a closed set of values.

**Why it bites**: adding a variant silently takes the default branch at every site that
should have been updated. The bug appears months later, in the one code path nobody tested.

**Device**: compiler-enforced exhaustiveness: an `assertNever(x: never)` arm in TypeScript,
`match` without a catch-all in Rust, `assert_never` with mypy, an exhaustive linter for Go.
**Control**, one line per switch, and among the highest-leverage devices available.

### F2. Unbounded destructive operations

**Signal**: `DELETE`/`UPDATE` built from a filter that can be empty; `rm -rf "$VAR"`;
`.deleteMany(where)`; bulk send/publish over a query result; a "cleanup" job with no cap.

**Why it bites**: irreversible, instant, and proportional to your data volume. An empty filter
frequently means "match everything."

**Device**: refuse an empty predicate; require an explicit `all=True` for the full-table case;
cap the affected row count and require confirmation above it; dry-run by default with the
count printed. Soft-delete where the domain allows. **Control.**

### F3. Defaults that hide a decision

**Signal**: a default value for something with no safe default, `retries=3`, `timeout=30`,
`currency="USD"`, `tenant=None`, `region=default`.

**Why it bites**: the caller never considers the parameter, and the default is wrong for their
case. Worse than an error, because it produces confident wrong behavior.

**Device**: make it required. Reserve defaults for parameters where one value is correct for
the overwhelming majority and wrong-but-harmless for the rest. **Control.**

### F4. Config discovered missing at runtime

**Signal**: `os.getenv("X")` inside a request handler; config read lazily on first use; a
missing key producing `None` that flows onward.

**Why it bites**: the service starts, passes health checks, and fails on the one code path
that needs the key, often the payment path, often at 3am.

**Device**: parse and validate the entire config into a typed object at startup, and exit
non-zero if anything is missing or malformed. Every consumer takes the typed object.
**Control**, and it converts a 3am page into a failed deploy.

### F5. Partial writes without a transaction

**Signal**: several writes in sequence with no transaction; a write followed by an external
call followed by another write; "create the record then send the email."

**Why it bites**: a failure in the middle leaves the system in a state your code does not
model and cannot repair.

**Device**: wrap in a transaction; move external effects outside it via an outbox; make the
sequence idempotent so replay converges. **Control** for the transaction.

### F6. Invariants enforced only in the application

**Signal**: uniqueness checked with a `SELECT` before an `INSERT`; nullability enforced in a
model class but not in the column; a foreign key relationship maintained by convention.

**Why it bites**: the check races under concurrency, and it is bypassed entirely by any other
service, migration, script, or human with `psql`.

**Device**: push it into the schema, `NOT NULL`, `UNIQUE`, `CHECK`, foreign keys, partial
unique indexes. The database is a type system shared by everything that touches the data.
**Control**, and uniquely durable.

### F7. Unbounded input

**Signal**: pagination with no maximum page size; a file upload with no size limit; a query
built from a user-supplied list with no cap; unbounded recursion or retries.

**Why it bites**: a resource exhaustion incident indistinguishable from an attack, triggered
by an ordinary user with a large account.

**Device**: explicit caps at the boundary, enforced by the parsing type where possible.
**Control.**

---

## Motion-step lens, can the order be wrong?

The factory analogy: a sensor confirming step 3 happened before step 4.

### M1. Temporal coupling

**Signal**: `init()`, `connect()`, `configure()`, `validate()` that must be called before
other methods; documentation containing the phrase "you must call X first."

**Why it bites**: nothing enforces it. The failure is a null dereference or, worse, a
silently-wrong result from a half-configured object.

**Device**: the constructor or a static factory returns a fully ready object; or typestate,
where `connect()` returns a `Connected` type and the other methods exist only on it.
**Control.**

### M2. Non-idempotent retryable effects

**Signal**: a charge, email, webhook, or external mutation reachable from a retry, a queue
consumer, or a UI button, with no idempotency key, or with an optional one.

**Why it bites**: at-least-once delivery is the norm, not the exception. Duplicate charges are
the canonical version and they are expensive and public.

**Device**: a **required** idempotency key parameter, backed by a unique constraint on
`(entity, key)`. **Control.** An optional idempotency key is rung zero wearing a costume.

The constraint is necessary and not sufficient. Rejecting the duplicate is not the same as
being idempotent: the key has to be *reserved in the same transaction as the effect*, bound
to the request payload so a different payload under a reused key is an error rather than a
silent no-op, and the stored result replayed to the second caller. A caller that retries and
gets a constraint violation has learned nothing about whether the first attempt worked.

### M3. Illegal state transitions

**Signal**: an entity with a `status` field mutated by assignment from several places; a
refund reachable before a charge; "cancelled" transitioning back to "pending".

**Why it bites**: every site that assigns the field must know the whole state machine, and one
of them doesn't.

**Device**: a single transition function that is the only path to a new state, rejecting
illegal transitions; or typestate so illegal transitions don't compile. **Control.**

A row-level `CHECK` is not defence in depth here: it constrains one row's values and cannot
see the state that row is coming from, so it can forbid `status = 'refunded' AND total < 0`
but not `shipped → pending`. Policing transitions in the database needs a trigger, or a
transition table the row must join against.

### M4. Resources that must be released

**Signal**: `open()`/`close()`, `acquire()`/`release()`, `begin()`/`commit()` as separate
statements, especially with a `return` or `throw` reachable between them.

**Why it bites**: the happy path is fine and the error path leaks. Leaks surface as connection
pool exhaustion under load, which is when you can least afford it.

**Device**: scope-bound acquisition, `with`, `defer`, RAII, `using`, try-with-resources.
**Control.**

### M5. Check-then-act races

**Signal**: `if (!exists(x)) create(x)`, read-modify-write on a shared counter, checking a
balance and then debiting it, `if (!file.exists()) write(file)`.

**Why it bites**: correct in every test and wrong under concurrency, intermittently, in
production only.

**Device**: make it atomic: a unique constraint plus `INSERT ... ON CONFLICT`, a conditional
update carrying the expected version, `SELECT FOR UPDATE`, a compare-and-swap. **Control.**

### M6. Fire-and-forget async

**Signal**: a promise not awaited, a goroutine with no error path, `asyncio.create_task` with
no reference kept, a background write nobody joins.

**Why it bites**: errors vanish. Worse, the process may exit before the work completes, so
writes are lost silently and non-deterministically.

**Device**: `no-floating-promises` as a lint error, an errgroup, structured concurrency,
holding and awaiting the task. **Warning** from the linter, which is the practical answer
in TypeScript, Python and Go. Rust is the closest thing to an exception: futures are lazy and `#[must_use]`, so a dropped
future produces a compiler warning without any linter. That is **Warning**, for free; add
`#![deny(unused_must_use)]` to make the build fail and it becomes **Control**.

### M7. Order-dependent migrations and deploys

**Signal**: a migration that drops or renames a column in the same deploy as the code change;
a migration and code that must land in a specific order with nothing enforcing it.

**Why it bites**: during the rollout window, old code runs against the new schema. This is an
outage, not a bug.

**Device**: expand/contract, add, backfill, dual-write, switch, then drop in a later deploy, with a CI gate that blocks destructive DDL from co-deploying with code changes. **Control**
via the gate; the pattern itself is the design.

---

## Cross-cutting, devices that were removed

Several of these are hazards of removal, someone installed a device and someone else took
it out. Others (X2, X5) are defaults nobody chose: the language ships them switched the wrong
way and they stay that way until someone notices.
Treat them with more suspicion than a missing device, since the code around them was written
by someone who knew the failure was possible.

### X1. Swallowed errors

**Signal**: `catch {}`, `except: pass`, `except Exception: pass`, `_ = err`, `catch (e) {
console.log(e) }` with execution continuing, `.catch(() => null)`.

**Why it bites**: converts a loud failure into a quiet wrong answer: the exact inversion of
mistake-proofing. The system continues on corrupted assumptions.

**Device**: handle it, or let it propagate. Where absorbing genuinely is correct, the comment
must name which specific failure is expected and why continuing is safe; catch that specific
type, not everything. Enforce with `no-empty` / bare-except lint rules as errors. **Warning.**

### X2. Silent coercion and fallback

**Signal**: `value || default` where `0`/`""`/`false` are legal values; `parseInt` without a
radix or a NaN check; `int(x)` in a try/except returning a default; `.unwrap_or_default()` on
a genuine error; `?.` chains ending in `undefined` that flow into logic.

**Why it bites**: produces a plausible value from bad input. The wrongness surfaces far away,
where the cause is invisible.

**Device**: `??` instead of `||` where zero is legal; explicit parse with an error branch;
fail at the boundary rather than substituting. **Control** at the parse site.

### X3. Disabled tests

**Signal**: `it.only`, `describe.skip`, `@pytest.mark.skip`, `t.Skip()`, `#[ignore]`: especially without a reason. Lint and type-checker suppressions (`eslint-disable`,
`# type: ignore`, `@ts-ignore`, `#nosec`) are X4, and the detector splits them the same way.

**Why it bites**: a Detection-rung device switched off, usually temporarily, permanently. The
suite stays green and stops meaning anything.

**Device**: fail CI on focused/skipped tests; require a justification comment and an issue
link on every suppression; count suppressions and ratchet the number downward. **Warning.**

### X4. Escape hatches in the type system

**Signal**: `any`, `as unknown as T`, `!` non-null assertion, `interface{}` with a type
switch, `# type: ignore`, `unsafe`, `cast()`, `Object` as a parameter type.

**Why it bites**: every one is a place where the type system's guarantee stops. Concentrated
in the boundary code that most needs the guarantee.

**Device**: ban them by lint at error level with a narrow, justified allowlist; replace with
parsing at the boundary. **Warning**: a required CI gate is still rung 2 by the ladder in
[method.md](../../../docs/method.md): it announces the mistake rather than removing the
ability to make it. Reach **Control** only when the unchecked value cannot be constructed.

### X5. Mutable shared defaults

**Signal**: Python's `def f(items=[])`, a module-level dict used as a cache and mutated, a
shared config object mutated after construction, class attributes used as instance state.

**Why it bites**: state leaks between calls, requests, or tests. The symptom is
order-dependent behavior that disappears when you try to reproduce it.

**Device**: `None` sentinel with in-function construction, frozen/immutable value types,
per-request construction. `B006` in ruff/flake8-bugbear enforces the argument-default case
only; the module-level cache, the shared config object and the mutable class attribute have
no lint rule and need review or a type that cannot be mutated.
**Warning**, or **Control** with frozen types.
