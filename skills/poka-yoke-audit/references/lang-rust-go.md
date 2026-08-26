# Rust and Go Devices

Two languages at opposite ends of the expressiveness spectrum. Rust can encode almost any
invariant in types; Go deliberately cannot, so its devices lean on convention plus tooling.
Know which one you're in before proposing a device.

---

# Rust

Rust's type system reaches Control for more hazard classes than any other mainstream language.
The affine type system in particular is the only mainstream answer to use-after-move, and it
turns use-after-close into a compile error rather than a convention, where Python has context
managers, TypeScript has scope-bound callbacks, and Go has `defer`, Rust has the compiler.

## Contact, newtypes and smart constructors

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct UserId(Uuid);

#[derive(Debug, Clone)]
pub struct Email(String);

impl Email {
    // The only way to build one. Private field means no bypass, even in-crate
    // if you put it behind a module boundary.
    pub fn parse(s: &str) -> Result<Self, InvalidEmail> {
        if !s.contains('@') { return Err(InvalidEmail); }
        Ok(Email(s.to_owned()))
    }
    pub fn as_str(&self) -> &str { &self.0 }
}
```

A private field plus a fallible constructor means possessing an `Email` *is* proof of
validation. This is the strongest form of parse-don't-validate available anywhere.

## Contact, enums make illegal states unrepresentable

```rust
// Each variant carries exactly the data that variant has. There is no
// "succeeded with an error", because it cannot be written.
pub enum JobState {
    Queued { enqueued_at: DateTime<Utc> },
    Running { started_at: DateTime<Utc>, worker: WorkerId },
    Succeeded { output: Output },
    Failed { error: JobError, retries: u32 },
}
```

`match` without a catch-all is exhaustive by default, adding a variant breaks the build
everywhere it must. Avoid `_ => {}` arms in domain logic for exactly this reason: the wildcard
is what turns a compile error into a silent fallthrough two releases later.

## Motion-step, typestate

Ownership makes typestate genuinely practical, since each transition consumes the old state:

```rust
pub struct Draft;
pub struct Validated;

pub struct Order<S> { items: Vec<Item>, _state: PhantomData<S> }

impl Order<Draft> {
    pub fn validate(self) -> Result<Order<Validated>, ValidationError> { /* … */ }
}

impl Order<Validated> {
    // submit() does not exist on Order<Draft>. Not "returns an error", does not exist.
    pub fn submit(self) -> Result<OrderId, SubmitError> { /* … */ }
}
```

The consumed `self` means the draft is gone after validation, so a stale unvalidated copy
cannot be submitted later.

## Fixed-value, make errors impossible to ignore

`#[must_use]` on `Result` is built in; add it to your own types where dropping the value is a
bug. Then set the lints:

```toml
[workspace.lints.clippy]
unwrap_used = "deny"
expect_used = "warn"          # allow in tests and startup with a reason
panic = "deny"
indexing_slicing = "deny"     # forces .get() and a real branch
float_cmp = "deny"
arithmetic_side_effects = "warn"  # forces checked_/saturating_ where overflow matters
todo = "deny"
dbg_macro = "deny"
```

`unwrap_used = "deny"` is the highest-value line in that block: it converts every "this can't
fail" assumption into an explicit decision at review time.

## Rust limits

- **`unsafe` and `unwrap` are the escape hatches.** Deny both by lint and require a
  `// SAFETY:` comment for each `unsafe` block.
- **Compile-time only.** Deserialized input still needs `serde` with `deny_unknown_fields`.
- **Panics bypass the type system.** A device that panics is Warning, not Control.
- **Typestate has real ergonomic cost.** Reserve it for genuinely dangerous sequences, payments, resource lifecycles, protocol state: not for every builder.

---

# Go

Go rejects most compile-time expressiveness by design. Its devices are therefore fewer, and
tooling plus data-layer constraints carry more of the load. Say so plainly when you propose a
device, Control is often not reachable here, and pretending otherwise is worse than
acknowledging the rung.

## Contact, defined types

```go
type UserID string
type OrderID string

func Transfer(from, to UserID) error { ... }
// Transfer(orderID, userID), compile error, because these are defined types, not aliases.
```

Use `type X string` (a defined type), never `type X = string` (an alias, which gives you
nothing). This is the one genuine Control-rung contact device Go offers, and it is
underused.

## Contact, functional options instead of boolean flags

```go
type Option func(*Config)

func WithTimeout(d time.Duration) Option { return func(c *Config) { c.Timeout = d } }
func WithRetries(n int) Option           { return func(c *Config) { c.Retries = n } }

func New(addr string, opts ...Option) (*Client, error) { ... }
```

Every option is named at the call site, `time.Duration` carries its unit in the type, and
adding an option later doesn't break callers. This replaces both the boolean-flag hazard and
the implicit-units hazard.

## Motion-step, constructors and defer

```go
func NewClient(addr string) (*Client, error) {
    // Fully ready on return. No Connect() to forget.
}

conn, err := pool.Acquire(ctx)
if err != nil { return err }
defer conn.Release()   // on the line after acquisition, always
```

Put `defer` immediately after the acquisition, before any other statement. Any code between
the two is a leak on the error path.

## Fixed-value, exhaustiveness

Go has no exhaustive switch. Use a linter:

```yaml
# .golangci.yml
version: "2"

linters:
  enable:
    - errcheck      # unchecked errors: the single most valuable Go linter
    - exhaustive    # non-exhaustive switch over typed constants
    - bodyclose     # unclosed HTTP response bodies
    - rowserrcheck  # unchecked sql.Rows.Err
    - sqlclosecheck
    - contextcheck  # context not propagated
    - nilerr        # returning nil after a non-nil error
    - noctx         # HTTP requests without a context
    - gosec
  settings:
    exhaustive:
      default-signifies-exhaustive: false
```

That is the v2 schema. golangci-lint v2 refuses to run against a v1 file rather than ignoring
the parts it no longer understands, so run `golangci-lint migrate` over an existing config
before upgrading.

`errcheck` is non-negotiable, Go's error convention is entirely opt-in without it, and
`_ = doSomething()` is how data loss enters a Go codebase.

## Go-specific traps

- **Nil maps** accept reads but panic on write. Construct with `make` in the constructor.
- **Loop variable capture** in goroutines, fixed in Go 1.22+, still present in older
  codebases and vendored code.
- **`time.Duration` vs bare int**: always take a `Duration`; never an `int` seconds.
- **Zero values are valid**, so a struct with a missing field looks initialized. Use a
  constructor that returns `(T, error)` and unexported fields to force it.
- **Slices share backing arrays**, `append` to a sub-slice can mutate the original. Use
  three-index slicing `s[a:b:b]` when handing a slice out.
- **`context.Context` dropped** across a call boundary silently disables cancellation and
  timeouts. `contextcheck` catches it.

## Go limits

Go cannot express: exhaustive matching, non-nullable references, immutability, typestate, or
generic constraints rich enough for units. Its Control-rung devices are essentially defined
types, unexported fields with constructors, and the database schema.

The practical consequence: in Go, **push more invariants into the database and into required
CI checks** than you would in Rust or TypeScript. `NOT NULL`, `CHECK`, and unique constraints
are doing work the language declines to do, and `golangci-lint` as a required check is what
makes the rest hold.
